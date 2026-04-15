import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { PointsEngine } from "./points-engine";
import { PHASE3_CHECKLIST } from "@/lib/travel/checklist-rules";
import type { TripType } from "@/lib/travel/trip-classifier";
import { AppError, ForbiddenError } from "@/lib/errors";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

// ─── Points per item type ─────────────────────────────────────────────────

const POINTS_REQUIRED = 15;
const POINTS_RECOMMENDED = 8;

/**
 * Returns the active phase number for checklist items, flag-aware.
 *
 * - Flag OFF (original order): Checklist = Phase 3
 * - Flag ON  (new order):      Checklist = Phase 6
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3.1 (phase mapping)
 */
function getChecklistPhaseNumber(): number {
  return isPhaseReorderEnabled() ? 6 : 3;
}

// ─── Checklist Engine ─────────────────────────────────────────────────────

export class ChecklistEngine {
  /**
   * Initialize checklist items for a trip based on tripType.
   * Calculates deadlines from startDate. Idempotent.
   *
   * Flag-aware: uses phaseNumber=6 when PHASE_REORDER_ENABLED, else 3.
   *
   * @deprecated Prefer `initializeChecklistItems` for new code.
   *   This alias is kept to avoid breaking callers during Wave 3.
   */
  static async initializePhase3Checklist(
    tripId: string,
    userId: string,
    tripType: TripType,
    startDate: Date | null
  ): Promise<void> {
    return ChecklistEngine.initializeChecklistItems(tripId, userId, tripType, startDate);
  }

  /**
   * Initialize checklist items for a trip based on tripType.
   * Calculates deadlines from startDate. Idempotent.
   *
   * Flag-aware: uses phaseNumber 6 when PHASE_REORDER_ENABLED, else 3.
   * Spec ref: SPEC-ARCH-REORDER-PHASES §3.1
   */
  static async initializeChecklistItems(
    tripId: string,
    userId: string,
    tripType: TripType,
    startDate: Date | null
  ): Promise<void> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });
    if (!trip) throw new ForbiddenError();

    const phaseNumber = getChecklistPhaseNumber();

    const existing = await db.phaseChecklistItem.count({
      where: { tripId, phaseNumber },
    });
    if (existing > 0) return;

    const items = PHASE3_CHECKLIST
      .filter(
        (rule) =>
          rule.requiredFor.includes(tripType) ||
          rule.recommendedFor.includes(tripType)
      )
      .map((rule) => {
        const isRequired = rule.requiredFor.includes(tripType);
        return {
          tripId,
          phaseNumber,
          itemKey: rule.key,
          required: isRequired,
          pointsValue: isRequired ? POINTS_REQUIRED : POINTS_RECOMMENDED,
          deadline: startDate
            ? new Date(
                startDate.getTime() - rule.deadlineDaysBefore * 86400000
              )
            : null,
        };
      });

    if (items.length > 0) {
      await db.phaseChecklistItem.createMany({ data: items });
    }

    logger.info("checklist.initialized", {
      tripId,
      tripType,
      phaseNumber,
      itemCount: items.length,
    });
  }

  /**
   * Toggle a checklist item. Awards points on first completion (idempotent).
   */
  static async toggleItem(
    tripId: string,
    userId: string,
    phaseNumber: number,
    itemKey: string
  ): Promise<{ completed: boolean; pointsAwarded: number }> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });
    if (!trip) throw new ForbiddenError();

    const item = await db.phaseChecklistItem.findUnique({
      where: {
        tripId_phaseNumber_itemKey: { tripId, phaseNumber, itemKey },
      },
    });
    if (!item) {
      throw new AppError(
        "ITEM_NOT_FOUND",
        `Checklist item ${itemKey} not found`,
        404
      );
    }

    const newCompleted = !item.completed;
    let pointsAwarded = 0;

    await db.phaseChecklistItem.update({
      where: { id: item.id },
      data: {
        completed: newCompleted,
        completedAt: newCompleted ? new Date() : null,
      },
    });

    // Award points only on first completion (idempotent)
    if (newCompleted && item.pointsValue > 0) {
      const description = `Checklist item: ${itemKey} (phase ${phaseNumber})`;
      const existingTx = await db.pointTransaction.findFirst({
        where: { userId, type: "phase_checklist", description, tripId },
      });
      if (!existingTx) {
        pointsAwarded = item.pointsValue;
        await PointsEngine.earnPoints(
          userId,
          pointsAwarded,
          "phase_checklist",
          description,
          tripId
        );
      }
    }

    logger.info("checklist.itemToggled", {
      tripId,
      phaseNumber,
      itemKey,
      completed: newCompleted,
      pointsAwarded,
    });

    return { completed: newCompleted, pointsAwarded };
  }

  /**
   * Get all checklist items for a phase, ordered required-first then by key.
   */
  static async getPhaseChecklist(tripId: string, phaseNumber: number) {
    return db.phaseChecklistItem.findMany({
      where: { tripId, phaseNumber },
      orderBy: [{ required: "desc" }, { itemKey: "asc" }],
    });
  }

  /**
   * Get all checklist items for the active checklist phase (flag-aware).
   * Prefer this over `getPhaseChecklist(tripId, 3)` in new code.
   */
  static async getChecklistItems(tripId: string) {
    return ChecklistEngine.getPhaseChecklist(tripId, getChecklistPhaseNumber());
  }

  /**
   * Check if all required items in a phase are completed.
   */
  static async isPhaseChecklistComplete(
    tripId: string,
    phaseNumber: number
  ): Promise<boolean> {
    const requiredIncomplete = await db.phaseChecklistItem.count({
      where: {
        tripId,
        phaseNumber,
        required: true,
        completed: false,
      },
    });
    return requiredIncomplete === 0;
  }

  /**
   * Check if all required checklist items are completed (flag-aware).
   * Prefer this over `isPhaseChecklistComplete(tripId, 3)` in new code.
   */
  static async isChecklistComplete(tripId: string): Promise<boolean> {
    return ChecklistEngine.isPhaseChecklistComplete(tripId, getChecklistPhaseNumber());
  }
}
