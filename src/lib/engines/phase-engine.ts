import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { PointsEngine } from "./points-engine";
import { getPhaseDefinition, TOTAL_PHASES } from "./phase-config";
import type {
  PhaseCompletionResult,
  PhaseNumber,
  PhaseStatus,
} from "@/types/gamification.types";
import type { AiSpendType } from "@/types/gamification.types";
import type { Prisma } from "@prisma/client";
import { AppError, ForbiddenError } from "@/lib/errors";
import { canUseAI } from "@/lib/guards/age-guard";

// ─── Phase Engine ───────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export class PhaseEngine {
  /**
   * Initialize an expedition with 8 phases: phase 1 = active, 2-8 = locked.
   * Idempotent — skips if phases already exist. BOLA guard.
   */
  static async initializeExpedition(
    tripId: string,
    userId: string
  ): Promise<void> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    // Check if already initialized
    const existingCount = await db.expeditionPhase.count({
      where: { tripId },
    });
    if (existingCount > 0) return;

    const phases = Array.from({ length: TOTAL_PHASES }, (_, i) => ({
      tripId,
      phaseNumber: i + 1,
      status: i === 0 ? "active" : "locked",
    }));

    await db.expeditionPhase.createMany({ data: phases });

    logger.info("gamification.expeditionInitialized", { tripId, userId });
  }

  /**
   * Get all 8 phases with definitions and current status. BOLA guard.
   */
  static async getPhases(tripId: string, userId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    const phases = await db.expeditionPhase.findMany({
      where: { tripId },
      orderBy: { phaseNumber: "asc" },
    });

    return phases.map((phase) => ({
      ...phase,
      status: phase.status as PhaseStatus,
      definition: getPhaseDefinition(phase.phaseNumber as PhaseNumber),
    }));
  }

  /**
   * Get the currently active phase. BOLA guard.
   */
  static async getCurrentPhase(tripId: string, userId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    const phase = await db.expeditionPhase.findFirst({
      where: { tripId, status: "active" },
    });

    if (!phase) return null;

    return {
      ...phase,
      status: phase.status as PhaseStatus,
      definition: getPhaseDefinition(phase.phaseNumber as PhaseNumber),
    };
  }

  /**
   * Complete a phase. Core method that orchestrates:
   * 1. Validates BOLA + phase order + status
   * 2. In a transaction: marks completed, awards points/badge/rank, unlocks next
   */
  static async completePhase(
    tripId: string,
    userId: string,
    phaseNumber: PhaseNumber,
    metadata?: Record<string, unknown>
  ): Promise<PhaseCompletionResult> {
    // 1. Validate trip + BOLA + expeditionMode
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    if (!trip.expeditionMode) {
      throw new AppError(
        "NOT_EXPEDITION",
        "Trip is not in expedition mode",
        400
      );
    }

    // 2. Validate phase order
    if (phaseNumber !== trip.currentPhase) {
      throw new AppError(
        "PHASE_ORDER_VIOLATION",
        `Expected phase ${trip.currentPhase}, got ${phaseNumber}`,
        400
      );
    }

    // 3. Validate phase status
    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber } },
    });

    if (!phase || phase.status !== "active") {
      throw new AppError(
        "PHASE_NOT_ACTIVE",
        `Phase ${phaseNumber} is not active`,
        400
      );
    }

    const definition = getPhaseDefinition(phaseNumber);
    if (!definition) {
      throw new AppError("INVALID_PHASE", `Phase ${phaseNumber} not found`, 400);
    }

    // 4. Execute in transaction
    const result = await db.$transaction(async (tx: Tx) => {
      // a. Mark phase completed
      await tx.expeditionPhase.update({
        where: { id: phase.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          pointsEarned: definition.pointsReward,
          metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });

      // b. Award points
      await PointsEngine.earnPoints(
        userId,
        definition.pointsReward,
        "phase_complete",
        `Completed phase ${phaseNumber}: ${definition.name}`,
        tripId,
        tx
      );

      // c. Award badge if defined
      let badgeAwarded = null;
      if (definition.badgeKey) {
        const awarded = await PointsEngine.awardBadge(
          userId,
          definition.badgeKey,
          tx
        );
        if (awarded) {
          badgeAwarded = definition.badgeKey;
        }
      }

      // d. Update rank if defined
      let newRank = null;
      if (definition.rankPromotion) {
        await PointsEngine.updateRank(userId, definition.rankPromotion, tx);
        newRank = definition.rankPromotion;
      }

      // e. Unlock next phase
      let nextPhaseUnlocked: PhaseNumber | null = null;
      if (phaseNumber < TOTAL_PHASES) {
        const nextPhase = (phaseNumber + 1) as PhaseNumber;
        await tx.expeditionPhase.update({
          where: { tripId_phaseNumber: { tripId, phaseNumber: nextPhase } },
          data: { status: "active" },
        });
        nextPhaseUnlocked = nextPhase;
      }

      // f. Update trip currentPhase
      await tx.trip.update({
        where: { id: tripId },
        data: { currentPhase: Math.min(phaseNumber + 1, TOTAL_PHASES) },
      });

      return {
        phaseNumber,
        pointsEarned: definition.pointsReward,
        badgeAwarded,
        newRank,
        nextPhaseUnlocked,
      } as PhaseCompletionResult;
    });

    logger.info("gamification.phaseCompleted", {
      tripId,
      userId,
      phaseNumber,
      pointsEarned: result.pointsEarned,
      badgeAwarded: result.badgeAwarded ?? undefined,
      newRank: result.newRank ?? undefined,
    });

    return result;
  }

  /**
   * Check if a user can access a specific phase (active or completed).
   */
  static async canAccessPhase(
    tripId: string,
    userId: string,
    phaseNumber: PhaseNumber
  ): Promise<boolean> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) return false;

    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber } },
    });

    if (!phase) return false;

    return phase.status === "active" || phase.status === "completed";
  }

  /**
   * Get status of a specific phase (internal use).
   */
  static async getPhaseStatus(
    tripId: string,
    userId: string,
    phaseNumber: PhaseNumber
  ): Promise<PhaseStatus | null> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber } },
    });

    return phase ? (phase.status as PhaseStatus) : null;
  }

  /**
   * Reset expedition: phase 1 = active, rest = locked. Does NOT revert points. BOLA guard.
   */
  static async resetExpedition(
    tripId: string,
    userId: string
  ): Promise<void> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    await db.$transaction(async (tx: Tx) => {
      // Reset all phases to locked
      await tx.expeditionPhase.updateMany({
        where: { tripId },
        data: { status: "locked", completedAt: null, pointsEarned: 0 },
      });

      // Set phase 1 to active
      await tx.expeditionPhase.update({
        where: { tripId_phaseNumber: { tripId, phaseNumber: 1 } },
        data: { status: "active" },
      });

      // Reset trip currentPhase
      await tx.trip.update({
        where: { id: tripId },
        data: { currentPhase: 1 },
      });
    });

    logger.info("gamification.expeditionReset", { tripId, userId });
  }

  /**
   * Use AI in a phase. Validates phase supports AI, checks balance, spends points.
   */
  static async useAiInPhase(
    tripId: string,
    userId: string,
    phaseNumber: PhaseNumber
  ): Promise<{ remainingPoints: number; transactionId: string }> {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });

    if (!trip) {
      throw new ForbiddenError();
    }

    const definition = getPhaseDefinition(phaseNumber);
    if (!definition || definition.aiCost === 0) {
      throw new AppError(
        "AI_NOT_AVAILABLE",
        `Phase ${phaseNumber} does not support AI usage`,
        400
      );
    }

    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber } },
    });

    if (!phase || phase.status !== "active") {
      throw new AppError(
        "PHASE_NOT_ACTIVE",
        `Phase ${phaseNumber} is not active`,
        400
      );
    }

    // Age guard: check if user is 18+
    const userProfile = await db.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true },
    });
    if (!canUseAI(userProfile?.birthDate)) {
      throw new AppError(
        "AI_AGE_RESTRICTED",
        "User must be 18 or older to use AI features",
        403
      );
    }

    // Map phase to AI spend type
    const aiTypeMap: Record<number, AiSpendType> = {
      3: "ai_route",
      4: "ai_accommodation",
      5: "ai_itinerary",
    };
    const aiType = aiTypeMap[phaseNumber] ?? "ai_itinerary";

    return PointsEngine.spendPoints(
      userId,
      definition.aiCost,
      "ai_usage",
      `AI usage in phase ${phaseNumber}: ${definition.name} (${aiType})`,
      tripId
    );
  }
}
