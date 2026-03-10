import "server-only";
import { type Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PhaseEngine } from "@/lib/engines/phase-engine";
import { AppError } from "@/lib/errors";
import { MAX_TRIPS_PER_USER } from "@/lib/constants";
import { TOTAL_PHASES } from "@/lib/engines/phase-config";
import type { Phase1Input, Phase2Input } from "@/lib/validations/expedition.schema";
import type { PhaseCompletionResult } from "@/types/gamification.types";

// ─── Expedition Service ──────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export class ExpeditionService {
  /**
   * Creates a new expedition in a single transaction:
   * 1. Create Trip (expeditionMode: true, currentPhase: 1)
   * 2. Initialize user progress (idempotent)
   * 3. Create 8 ExpeditionPhases (phase 1 active, 2-8 locked)
   * 4. Complete phase 1 → award 100pts + badge first_step + unlock phase 2
   * 5. Update trip currentPhase to 2
   */
  static async createExpedition(
    userId: string,
    data: Phase1Input
  ): Promise<{ tripId: string; phaseResult: PhaseCompletionResult }> {
    // Check trip limit
    const tripCount = await db.trip.count({
      where: { userId, deletedAt: null },
    });
    if (tripCount >= MAX_TRIPS_PER_USER) {
      throw new AppError(
        "MAX_TRIPS_REACHED",
        "trips.errors.maxTripsReached",
        422
      );
    }

    const result = await db.$transaction(async (tx: Tx) => {
      // 1. Create trip
      const trip = await tx.trip.create({
        data: {
          title: data.destination,
          destination: data.destination,
          origin: data.origin ?? null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          expeditionMode: true,
          currentPhase: 1,
          userId,
        },
      });

      // 2. Initialize progress (idempotent)
      await PointsEngine.initializeProgress(userId, tx);

      // 3. Create 8 expedition phases
      const phases = Array.from({ length: TOTAL_PHASES }, (_, i) => ({
        tripId: trip.id,
        phaseNumber: i + 1,
        status: i === 0 ? "active" : ("locked" as string),
      }));
      await tx.expeditionPhase.createMany({ data: phases });

      // 4. Mark phase 1 completed + award points/badge
      await tx.expeditionPhase.update({
        where: {
          tripId_phaseNumber: { tripId: trip.id, phaseNumber: 1 },
        },
        data: {
          status: "completed",
          completedAt: new Date(),
          pointsEarned: 100,
          metadata: {
            destination: data.destination,
            flexibleDates: data.flexibleDates,
          },
        },
      });

      await PointsEngine.earnPoints(
        userId,
        100,
        "phase_complete",
        "Completed phase 1: O Chamado",
        trip.id,
        tx
      );

      await PointsEngine.awardBadge(userId, "first_step", tx);

      // Unlock phase 2
      await tx.expeditionPhase.update({
        where: {
          tripId_phaseNumber: { tripId: trip.id, phaseNumber: 2 },
        },
        data: { status: "active" },
      });

      // 5. Update trip currentPhase to 2
      await tx.trip.update({
        where: { id: trip.id },
        data: { currentPhase: 2 },
      });

      return {
        tripId: trip.id,
        phaseResult: {
          phaseNumber: 1 as const,
          pointsEarned: 100,
          badgeAwarded: "first_step" as const,
          newRank: null,
          nextPhaseUnlocked: 2 as const,
        },
      };
    });

    logger.info("expedition.created", {
      userId,
      tripId: result.tripId,
      destination: data.destination,
    });

    return result;
  }

  /**
   * Completes phase 2 of an expedition.
   * Delegates to PhaseEngine.completePhase which handles:
   * - BOLA guard, phase order validation
   * - Points award (150), rank promotion (explorer), unlock phase 3
   */
  static async completePhase2(
    tripId: string,
    userId: string,
    data: Phase2Input
  ): Promise<PhaseCompletionResult> {
    // Save passengers breakdown to Trip if provided
    if (data.passengers) {
      await db.trip.update({
        where: { id: tripId },
        data: { passengers: data.passengers as unknown as Prisma.InputJsonValue },
      });
    }

    return PhaseEngine.completePhase(tripId, userId, 2, {
      travelerType: data.travelerType,
      accommodationStyle: data.accommodationStyle,
      travelPace: data.travelPace,
      budget: data.budget,
      currency: data.currency,
    });
  }
}
