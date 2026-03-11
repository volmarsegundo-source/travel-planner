import "server-only";
import { db } from "@/server/db";
import { decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpeditionSummaryPhase1 {
  destination: string;
  origin: string | null;
  startDate: string | null;
  endDate: string | null;
  tripType: string;
}

export interface ExpeditionSummaryPhase2 {
  travelerType: string;
  accommodationStyle: string;
  travelPace: number | null;
  budget: number | null;
  currency: string | null;
  passengers: {
    adults: number;
    children: number;
    infants: number;
    seniors: number;
  } | null;
}

export interface ExpeditionSummaryPhase3 {
  done: number;
  total: number;
}

export interface TransportSummary {
  type: string;
  departurePlace: string | null;
  arrivalPlace: string | null;
  maskedBookingCode: string | null;
}

export interface AccommodationSummary {
  type: string;
  name: string | null;
  maskedBookingCode: string | null;
}

export interface ExpeditionSummaryPhase4 {
  transportSegments: TransportSummary[];
  accommodations: AccommodationSummary[];
  mobility: string[];
}

export interface ExpeditionSummaryPhase5 {
  generatedAt: string;
  highlights: string[];
}

export interface ExpeditionSummaryPhase6 {
  dayCount: number;
  totalActivities: number;
}

export interface ExpeditionSummary {
  tripId: string;
  phase1: ExpeditionSummaryPhase1 | null;
  phase2: ExpeditionSummaryPhase2 | null;
  phase3: ExpeditionSummaryPhase3 | null;
  phase4: ExpeditionSummaryPhase4 | null;
  phase5: ExpeditionSummaryPhase5 | null;
  phase6: ExpeditionSummaryPhase6 | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKING_CODE_MASK_PATTERN = /^(.{4}).*(.{3})$/;
const HIGHLIGHT_SECTION_KEYS: GuideSectionKey[] = [
  "timezone",
  "currency",
  "language",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mask a booking code as "BOOK-****-XY7".
 * Shows last 3 characters for identification, masks the rest.
 */
export function maskBookingCode(encrypted: string): string {
  try {
    const plaintext = decrypt(encrypted);
    if (plaintext.length <= 3) {
      return `BOOK-****-${plaintext}`;
    }
    const match = plaintext.match(BOOKING_CODE_MASK_PATTERN);
    if (match) {
      return `BOOK-****-${match[2]}`;
    }
    return `BOOK-****-${plaintext.slice(-3)}`;
  } catch {
    return "BOOK-****-???";
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ExpeditionSummaryService {
  /**
   * Aggregate data from all 6 phases of an expedition.
   * BOLA check: verifies trip belongs to user.
   * Returns null for phases that are not yet completed or have no data.
   */
  static async getExpeditionSummary(
    tripId: string,
    userId: string
  ): Promise<ExpeditionSummary> {
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
      },
    });

    if (!trip) {
      throw new Error("errors.tripNotFound");
    }

    // Fetch all related data in parallel
    const [phases, checklist, transport, accommodations, guide, itineraryDays] =
      await Promise.all([
        db.expeditionPhase.findMany({
          where: { tripId },
          select: { phaseNumber: true, status: true, metadata: true },
        }),
        db.phaseChecklistItem.findMany({
          where: { tripId, phaseNumber: 3 },
          select: { completed: true },
        }),
        db.transportSegment.findMany({
          where: { tripId },
          orderBy: { segmentOrder: "asc" },
          select: {
            transportType: true,
            departurePlace: true,
            arrivalPlace: true,
            bookingCodeEnc: true,
          },
        }),
        db.accommodation.findMany({
          where: { tripId },
          orderBy: { orderIndex: "asc" },
          select: {
            accommodationType: true,
            name: true,
            bookingCodeEnc: true,
          },
        }),
        db.destinationGuide.findUnique({
          where: { tripId },
          select: { content: true, generatedAt: true },
        }),
        db.itineraryDay.findMany({
          where: { tripId },
          select: {
            id: true,
            _count: { select: { activities: true } },
          },
        }),
      ]);

    const phaseMap = new Map(
      phases.map((p) => [p.phaseNumber, p])
    );

    // Phase 1 — always present if trip exists
    const phase1: ExpeditionSummaryPhase1 = {
      destination: trip.destination,
      origin: trip.origin,
      startDate: trip.startDate
        ? trip.startDate.toISOString().split("T")[0]!
        : null,
      endDate: trip.endDate ? trip.endDate.toISOString().split("T")[0]! : null,
      tripType: trip.tripType,
    };

    // Phase 2
    const phase2Data = phaseMap.get(2);
    let phase2: ExpeditionSummaryPhase2 | null = null;
    if (phase2Data?.status === "completed" && phase2Data.metadata) {
      const meta = phase2Data.metadata as Record<string, unknown>;
      const passengers = trip.passengers as Record<string, unknown> | null;
      phase2 = {
        travelerType: (meta.travelerType as string) ?? "",
        accommodationStyle: (meta.accommodationStyle as string) ?? "",
        travelPace:
          meta.travelPace != null ? Number(meta.travelPace) : null,
        budget: meta.budget != null ? Number(meta.budget) : null,
        currency: (meta.currency as string) ?? null,
        passengers: passengers
          ? {
              adults: Number(passengers.adults ?? 0),
              children: Number(
                (passengers.children as Record<string, unknown>)?.count ?? 0
              ),
              infants: Number(passengers.infants ?? 0),
              seniors: Number(passengers.seniors ?? 0),
            }
          : null,
      };
    }

    // Phase 3
    let phase3: ExpeditionSummaryPhase3 | null = null;
    if (checklist.length > 0) {
      const done = checklist.filter((c) => c.completed).length;
      phase3 = { done, total: checklist.length };
    }

    // Phase 4
    let phase4: ExpeditionSummaryPhase4 | null = null;
    if (transport.length > 0 || accommodations.length > 0 || trip.localMobility.length > 0) {
      phase4 = {
        transportSegments: transport.map((t) => ({
          type: t.transportType,
          departurePlace: t.departurePlace,
          arrivalPlace: t.arrivalPlace,
          maskedBookingCode: t.bookingCodeEnc
            ? maskBookingCode(t.bookingCodeEnc)
            : null,
        })),
        accommodations: accommodations.map((a) => ({
          type: a.accommodationType,
          name: a.name,
          maskedBookingCode: a.bookingCodeEnc
            ? maskBookingCode(a.bookingCodeEnc)
            : null,
        })),
        mobility: trip.localMobility,
      };
    }

    // Phase 5
    let phase5: ExpeditionSummaryPhase5 | null = null;
    if (guide) {
      const content = guide.content as unknown as DestinationGuideContent;
      const highlights: string[] = [];
      for (const key of HIGHLIGHT_SECTION_KEYS) {
        const section = content[key];
        if (section) {
          highlights.push(`${section.icon} ${section.title}`);
        }
        if (highlights.length >= 3) break;
      }
      phase5 = {
        generatedAt: guide.generatedAt.toISOString().split("T")[0]!,
        highlights,
      };
    }

    // Phase 6
    let phase6: ExpeditionSummaryPhase6 | null = null;
    if (itineraryDays.length > 0) {
      const totalActivities = itineraryDays.reduce(
        (sum, day) => sum + day._count.activities,
        0
      );
      phase6 = {
        dayCount: itineraryDays.length,
        totalActivities,
      };
    }

    logger.info("expedition.summary.fetched", {
      userId: hashUserId(userId),
      tripId,
    });

    return {
      tripId,
      phase1,
      phase2,
      phase3,
      phase4,
      phase5,
      phase6,
    };
  }
}
