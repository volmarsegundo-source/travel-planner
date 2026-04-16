import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AppError } from "@/lib/errors";
import { getPhaseDefinitions } from "@/lib/engines/phase-config";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEIGHT_PHASES = 0.4;
const WEIGHT_CHECKLIST = 0.3;
const WEIGHT_TRANSPORT = 0.15;
const WEIGHT_ACCOMMODATION = 0.15;

/** Phases 1-6 are the user-facing expedition phases. */
const EXPEDITION_PHASE_COUNT = 6;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhaseStatus = "complete" | "partial" | "not_started";

export interface PhaseReadiness {
  phase: number;
  name: string;
  status: PhaseStatus;
  dataSnapshot: Record<string, unknown>;
}

export interface TripReadinessResult {
  readinessPercent: number;
  phases: PhaseReadiness[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TripReadinessService {
  /**
   * Calculate a weighted readiness score for a trip.
   *
   * Weights:
   *  - Completed phases (1-6): 40%
   *  - Checklist completion:   30%  (skipped if no checklist)
   *  - Transport booked:       15%  (skipped if none)
   *  - Accommodation booked:   15%  (skipped if none)
   *
   * When a category is skipped, its weight is redistributed proportionally
   * among the remaining categories.
   */
  static async calculateTripReadiness(
    tripId: string,
    userId: string
  ): Promise<TripReadinessResult> {
    // BOLA check
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: {
        id: true,
        destination: true,
        origin: true,
        startDate: true,
        endDate: true,
        tripType: true,
        passengers: true,
        localMobility: true,
        currentPhase: true,
      },
    });

    if (!trip) {
      throw new AppError("FORBIDDEN", "errors.tripNotFound", 403);
    }

    // Fetch all related data in parallel
    const [expeditionPhases, checklistItems, transportSegments, accommodations] =
      await Promise.all([
        db.expeditionPhase.findMany({
          where: { tripId },
          select: {
            phaseNumber: true,
            status: true,
            metadata: true,
            completedAt: true,
          },
        }),
        db.phaseChecklistItem.findMany({
          where: { tripId, phaseNumber: 3 },
          select: { completed: true },
        }),
        db.transportSegment.findMany({
          where: { tripId },
          select: { id: true },
        }),
        db.accommodation.findMany({
          where: { tripId },
          select: { id: true },
        }),
      ]);

    const phaseMap = new Map(
      expeditionPhases.map((p) => [p.phaseNumber, p])
    );

    // ── Build phase readiness array ──────────────────────────────────────────

    const phases: PhaseReadiness[] = [];

    for (let i = 1; i <= EXPEDITION_PHASE_COUNT; i++) {
      const phaseDef = getPhaseDefinitions().find((d) => d.phaseNumber === i);
      const phaseRecord = phaseMap.get(i);

      let status: PhaseStatus = "not_started";
      if (phaseRecord?.status === "completed") {
        status = "complete";
      } else if (phaseRecord?.status === "active") {
        status = "partial";
      }

      const dataSnapshot: Record<string, unknown> = {};

      // Phase 1 always has at least destination from the trip
      if (i === 1) {
        dataSnapshot.destination = trip.destination;
        dataSnapshot.origin = trip.origin;
        dataSnapshot.startDate = trip.startDate?.toISOString().split("T")[0] ?? null;
        dataSnapshot.endDate = trip.endDate?.toISOString().split("T")[0] ?? null;
        // Phase 1 is always at least "partial" because trip was created
        if (status === "not_started") {
          status = "partial";
        }
      }

      if (i === 2 && phaseRecord?.metadata) {
        const meta = phaseRecord.metadata as Record<string, unknown>;
        dataSnapshot.travelerType = meta.travelerType ?? null;
        dataSnapshot.accommodationStyle = meta.accommodationStyle ?? null;
      }

      if (i === 3 && checklistItems.length > 0) {
        const done = checklistItems.filter((c) => c.completed).length;
        dataSnapshot.done = done;
        dataSnapshot.total = checklistItems.length;
      }

      if (i === 4) {
        dataSnapshot.transportCount = transportSegments.length;
        dataSnapshot.accommodationCount = accommodations.length;
        dataSnapshot.mobilityCount = trip.localMobility.length;
      }

      phases.push({
        phase: i,
        name: phaseDef?.name ?? `Phase ${i}`,
        status,
        dataSnapshot,
      });
    }

    // ── Calculate weighted readiness ────────────────────────────────────────

    const completedPhases = phases.filter((p) => p.status === "complete").length;
    const phaseScore = completedPhases / EXPEDITION_PHASE_COUNT;

    const hasChecklist = checklistItems.length > 0;
    const checklistDone = checklistItems.filter((c) => c.completed).length;
    const checklistScore = hasChecklist
      ? checklistDone / checklistItems.length
      : 0;

    const hasTransport = transportSegments.length > 0;
    const transportScore = hasTransport ? 1 : 0;

    const hasAccommodation = accommodations.length > 0;
    const accommodationScore = hasAccommodation ? 1 : 0;

    // Determine active weights (redistribute skipped weights)
    let totalWeight = WEIGHT_PHASES; // phases always count
    const weights: Array<{ weight: number; score: number }> = [
      { weight: WEIGHT_PHASES, score: phaseScore },
    ];

    if (hasChecklist) {
      weights.push({ weight: WEIGHT_CHECKLIST, score: checklistScore });
      totalWeight += WEIGHT_CHECKLIST;
    }
    if (hasTransport) {
      weights.push({ weight: WEIGHT_TRANSPORT, score: transportScore });
      totalWeight += WEIGHT_TRANSPORT;
    }
    if (hasAccommodation) {
      weights.push({ weight: WEIGHT_ACCOMMODATION, score: accommodationScore });
      totalWeight += WEIGHT_ACCOMMODATION;
    }

    // Normalize and compute final percentage
    const readinessPercent =
      totalWeight > 0
        ? Math.round(
            weights.reduce(
              (sum, w) => sum + (w.weight / totalWeight) * w.score,
              0
            ) * 100
          )
        : 0;

    logger.info("trip.readiness.calculated", {
      userId: hashUserId(userId),
      tripId,
      readinessPercent,
    });

    return { readinessPercent, phases };
  }
}
