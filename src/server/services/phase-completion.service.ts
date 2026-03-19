import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AppError } from "@/lib/errors";
import {
  evaluatePhaseCompletion,
  getExpeditionCompletionSummary,
  isExpeditionComplete,
  type PhaseDataSnapshot,
  type PhaseCompletionResult,
  type ExpeditionCompletionSummary,
} from "@/lib/engines/phase-completion.engine";

export class PhaseCompletionService {
  /**
   * Build a PhaseDataSnapshot from the database for a given trip.
   * BOLA: verifies trip belongs to user.
   */
  static async buildSnapshot(
    tripId: string,
    userId: string
  ): Promise<PhaseDataSnapshot> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: {
        id: true,
        destination: true,
        startDate: true,
        endDate: true,
        userId: true,
      },
    });

    if (!trip) {
      throw new AppError("FORBIDDEN", "errors.tripNotFound", 403);
    }

    // Parallel queries for all phase data
    const [user, profile, phases, checklistItems, transportSegments, accommodations, guide, itineraryDays] =
      await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: { name: true },
        }),
        db.userProfile.findUnique({
          where: { userId },
          select: { birthDate: true },
        }),
        db.expeditionPhase.findMany({
          where: { tripId },
          select: { phaseNumber: true, status: true, metadata: true },
        }),
        db.phaseChecklistItem.findMany({
          where: { tripId, phaseNumber: 3 },
          select: { required: true, completed: true },
        }),
        db.transportSegment.count({ where: { tripId } }),
        db.accommodation.count({ where: { tripId } }),
        db.destinationGuide.findUnique({
          where: { tripId },
          select: { id: true },
        }),
        db.itineraryDay.count({ where: { tripId } }),
      ]);

    const phase2 = phases.find((p) => p.phaseNumber === 2);
    const phase2Meta = phase2?.metadata as Record<string, unknown> | null;

    const requiredItems = checklistItems.filter((i) => i.required);
    const completedRequired = requiredItems.filter((i) => i.completed).length;

    return {
      phase1: {
        hasDestination: !!trip.destination && trip.destination.trim().length > 0,
        hasStartDate: trip.startDate !== null,
        hasEndDate: trip.endDate !== null,
        hasUserName: !!user?.name && user.name.trim().length > 0,
        hasUserBirthDate: profile?.birthDate !== null && profile?.birthDate !== undefined,
      },
      phase2: {
        hasTravelerType: !!phase2Meta?.travelerType,
      },
      phase3: {
        totalRequired: requiredItems.length,
        completedRequired,
        hasAnyItems: checklistItems.length > 0,
      },
      phase4: {
        transportSegmentCount: transportSegments,
        accommodationCount: accommodations,
      },
      phase5: {
        hasGuide: guide !== null,
      },
      phase6: {
        itineraryDayCount: itineraryDays,
      },
    };
  }

  /**
   * Get completion status for a single phase.
   */
  static async getPhaseCompletionStatus(
    tripId: string,
    userId: string,
    phaseNumber: number
  ): Promise<PhaseCompletionResult> {
    const snapshot = await this.buildSnapshot(tripId, userId);
    return evaluatePhaseCompletion(phaseNumber, snapshot);
  }

  /**
   * Get completion summary for all 6 phases.
   */
  static async getExpeditionCompletion(
    tripId: string,
    userId: string
  ): Promise<ExpeditionCompletionSummary> {
    const snapshot = await this.buildSnapshot(tripId, userId);
    return getExpeditionCompletionSummary(snapshot);
  }

  /**
   * Sync the ExpeditionPhase.status for a single phase based on actual data.
   * Evaluates phase completion from the snapshot and updates DB if status differs.
   *
   * Returns true if the status was changed, false otherwise.
   */
  static async syncPhaseStatus(
    tripId: string,
    userId: string,
    phaseNumber: number
  ): Promise<boolean> {
    const snapshot = await this.buildSnapshot(tripId, userId);
    const result = evaluatePhaseCompletion(phaseNumber, snapshot);

    // Map evaluation status to ExpeditionPhase status
    const targetStatus = result.status === "completed" ? "completed" : "active";

    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber } },
    });

    if (!phase) return false;

    // Only sync if status differs and phase is not locked
    if (phase.status === "locked" || phase.status === targetStatus) {
      return false;
    }

    await db.expeditionPhase.update({
      where: { id: phase.id },
      data: {
        status: targetStatus,
        ...(targetStatus === "completed" && !phase.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
    });

    logger.info("phase.status.synced", {
      tripId,
      userIdHash: hashUserId(userId),
      phaseNumber,
      previousStatus: phase.status,
      newStatus: targetStatus,
    });

    return true;
  }

  /**
   * Check if all 6 phases are complete. If so, set trip.status = "COMPLETED".
   * Called after each phase wizard submission.
   *
   * Returns true if the trip was just completed (state transition happened).
   * Returns false if already completed or not yet complete.
   */
  static async checkAndCompleteTrip(
    tripId: string,
    userId: string
  ): Promise<boolean> {
    const snapshot = await this.buildSnapshot(tripId, userId);

    if (!isExpeditionComplete(snapshot)) {
      return false;
    }

    // Check current status to avoid redundant updates
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { status: true },
    });

    if (!trip || trip.status === "COMPLETED") {
      return false;
    }

    // Transition to COMPLETED
    await db.trip.update({
      where: { id: tripId },
      data: { status: "COMPLETED" },
    });

    logger.info("trip.auto-completed", {
      userId: hashUserId(userId),
      tripId,
    });

    return true;
  }
}
