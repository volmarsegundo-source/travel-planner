/**
 * Expedition AI Context Service — Sprint 44 Wave 1 Scaffold
 *
 * Canonical assembler for AI prompts: the ONLY authorised entry point
 * for any AI prompt caller that needs phase data.
 *
 * Responsibilities:
 * - Fetches Trip + related phase data from the DB (single Prisma call).
 * - Applies BOLA guard: if userId is provided, verifies trip ownership.
 * - Invokes pure digest helpers from `@/lib/prompts/digest` to produce
 *   sanitized, bounded context slices.
 * - Returns a fully typed `AssembledAiContext` scoped to the target phase.
 *
 * Callers receive only what they need:
 *   targetPhase="guide"      → trip + profile + preferences (no digests)
 *   targetPhase="itinerary"  → + guideDigest
 *   targetPhase="checklist"  → + guideDigest + itineraryDigest + logisticsDigest
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.3 (assembler contract)
 * Spec ref: SPEC-ARCH-REORDER-PHASES §10.2
 * @version 1.0.0
 */
import "server-only";

import { db } from "@/server/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  buildGuideDigest,
  buildItineraryDigest,
  buildLogisticsDigest,
  type GuideDigest,
  type ItineraryDigest,
  type LogisticsDigest,
  type RawGuideContent,
  type RawItineraryDay,
  type RawActivity,
  type RawTransportSegment,
  type RawAccommodation,
} from "@/lib/prompts/digest";

// ─── Public types ─────────────────────────────────────────────────────────────

export type AiTargetPhase = "guide" | "itinerary" | "checklist";

/** Core trip data included in every assembled context. */
export interface TripCore {
  id: string;
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  tripType: string;
  /** Parsed passengers JSON — passed as-is to prompts. */
  passengers: unknown;
  origin: string | null;
  localMobility: string[];
  destinationLat: number | null;
  destinationLon: number | null;
}

/** Core profile data included in every assembled context. */
export interface UserProfileCore {
  userId: string;
  birthDate: Date | null;
  country: string | null;
  city: string | null;
  dietaryRestrictions: string | null;
  accessibility: string | null;
  completionScore: number;
}

/** Core preferences data extracted from the UserProfile.preferences JSON. */
export interface PreferencesCore {
  /** Raw preferences JSON (parsed from UserProfile.preferences). */
  raw: Record<string, unknown>;
}

/**
 * Fully assembled AI context for a given target phase.
 *
 * Digest fields are only populated for phases that depend on upstream data:
 *   guideDigest      → present for "itinerary" and "checklist"
 *   itineraryDigest  → present for "checklist" only
 *   logisticsDigest  → present for "checklist" only
 *
 * All digests are sanitized (no raw user text — see `@/lib/prompts/digest`).
 */
export interface AssembledAiContext {
  targetPhase: AiTargetPhase;
  trip: TripCore;
  profile: UserProfileCore;
  preferences: PreferencesCore;
  guideDigest?: GuideDigest;
  itineraryDigest?: ItineraryDigest;
  logisticsDigest?: LogisticsDigest;
}

// ─── ExpeditionAiContextService ───────────────────────────────────────────────

export class ExpeditionAiContextService {
  /**
   * Assembles the canonical AI context for the given target phase.
   *
   * @param tripId       - ID of the trip to assemble context for.
   * @param targetPhase  - Which phase's prompt needs context.
   * @param userId       - Optional. When provided, enforces trip ownership (BOLA guard).
   *                       Omit only in internal server-to-server calls where auth
   *                       has already been verified upstream.
   *
   * @throws NotFoundError  if the trip does not exist.
   * @throws ForbiddenError if userId is provided and does not match trip.userId.
   */
  static async assembleFor(
    tripId: string,
    targetPhase: AiTargetPhase,
    userId?: string
  ): Promise<AssembledAiContext> {
    // ── 1. Fetch trip with all potentially-needed relations in ONE query ────────
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        destinationGuide: true,
        itineraryDays: {
          include: {
            activities: true,
          },
          orderBy: { dayNumber: "asc" },
        },
        transportSegments: {
          orderBy: { segmentOrder: "asc" },
        },
        accommodations: true,
      },
    });

    if (!trip) {
      throw new NotFoundError("Trip", tripId);
    }

    // ── 2. BOLA guard ──────────────────────────────────────────────────────────
    if (userId && trip.userId !== userId) {
      throw new ForbiddenError();
    }

    // ── 3. Build core objects ─────────────────────────────────────────────────
    const tripCore: TripCore = {
      id: trip.id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      tripType: trip.tripType,
      passengers: trip.passengers,
      origin: trip.origin,
      localMobility: trip.localMobility,
      destinationLat: trip.destinationLat,
      destinationLon: trip.destinationLon,
    };

    const profileData = trip.user.profile;
    const profileCore: UserProfileCore = {
      userId: trip.userId,
      birthDate: profileData?.birthDate ?? null,
      country: profileData?.country ?? null,
      city: profileData?.city ?? null,
      dietaryRestrictions: profileData?.dietaryRestrictions ?? null,
      accessibility: profileData?.accessibility ?? null,
      completionScore: profileData?.completionScore ?? 0,
    };

    const rawPreferences = profileData?.preferences;
    const preferencesCore: PreferencesCore = {
      raw: (rawPreferences !== null && typeof rawPreferences === "object" && !Array.isArray(rawPreferences))
        ? (rawPreferences as Record<string, unknown>)
        : {},
    };

    // ── 4. Build digests based on target phase ────────────────────────────────

    // Guide digest: needed for itinerary and checklist
    let guideDigest: GuideDigest | undefined;
    if (targetPhase === "itinerary" || targetPhase === "checklist") {
      if (trip.destinationGuide?.content) {
        guideDigest = buildGuideDigest(trip.destinationGuide.content as RawGuideContent);
      }
      // Graceful degradation: if guide is absent, guideDigest stays undefined.
      // Prompt system must handle missing digest (fallback instruction).
    }

    // Itinerary digest: needed for checklist only
    let itineraryDigest: ItineraryDigest | undefined;
    if (targetPhase === "checklist") {
      const rawDays: RawItineraryDay[] = (trip.itineraryDays ?? []).map((day) => ({
        isTransit: day.isTransit,
        activities: (day.activities ?? []).map(
          (act): RawActivity => ({
            activityType: act.activityType,
            title: act.title,
            notes: act.notes,
          })
        ),
      }));

      if (rawDays.length > 0) {
        itineraryDigest = buildItineraryDigest(rawDays);
      }
    }

    // Logistics digest: needed for checklist only
    let logisticsDigest: LogisticsDigest | undefined;
    if (targetPhase === "checklist") {
      const rawTransport: RawTransportSegment[] = (trip.transportSegments ?? []).map((seg) => ({
        transportType: seg.transportType,
        isReturn: seg.isReturn,
        departurePlace: seg.departurePlace,
        arrivalPlace: seg.arrivalPlace,
      }));

      const rawAccommodations: RawAccommodation[] = (trip.accommodations ?? []).map((acc) => ({
        accommodationType: acc.accommodationType,
      }));

      const localMobility = trip.localMobility ?? [];

      if (rawTransport.length > 0 || rawAccommodations.length > 0 || localMobility.length > 0) {
        logisticsDigest = buildLogisticsDigest(rawTransport, rawAccommodations, localMobility);
      }
    }

    // ── 5. Return assembled context ───────────────────────────────────────────
    return {
      targetPhase,
      trip: tripCore,
      profile: profileCore,
      preferences: preferencesCore,
      ...(guideDigest !== undefined && { guideDigest }),
      ...(itineraryDigest !== undefined && { itineraryDigest }),
      ...(logisticsDigest !== undefined && { logisticsDigest }),
    };
  }
}
