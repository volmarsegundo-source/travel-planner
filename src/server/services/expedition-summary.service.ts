import "server-only";
import { db } from "@/server/db";
import { decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";
import { isGuideV2 } from "@/types/ai.types";
import type { UserPreferences } from "@/lib/validations/preferences.schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpeditionSummaryPhase1 {
  destination: string;
  origin: string | null;
  startDate: string | null;
  endDate: string | null;
  tripType: string;
  destinationLat: number | null;
  destinationLon: number | null;
  flexibleDates: boolean;
  name: string | null;
  ageRange: string | null;
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
  budgetRange: string | null;
  preferences: UserPreferences | null;
}

export interface ChecklistItemSummary {
  itemKey: string;
  completed: boolean;
  required: boolean;
}

export interface ExpeditionSummaryPhase3 {
  done: number;
  total: number;
  items: ChecklistItemSummary[];
}

export interface TransportSummary {
  type: string;
  departurePlace: string | null;
  arrivalPlace: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  provider: string | null;
  maskedBookingCode: string | null;
}

export interface AccommodationSummary {
  type: string;
  name: string | null;
  checkIn: string | null;
  checkOut: string | null;
  maskedBookingCode: string | null;
}

export interface ExpeditionSummaryPhase4 {
  transportSegments: TransportSummary[];
  accommodations: AccommodationSummary[];
  mobility: string[];
  transportUndecided?: boolean;
  accommodationUndecided?: boolean;
  mobilityUndecided?: boolean;
}

export interface GuideKeyFact {
  label: string;
  value: string;
}

export interface GuideAttraction {
  name: string;
  description: string;
}

export interface ExpeditionSummaryPhase5 {
  generatedAt: string;
  highlights: string[];
  safetyLevel: string | null;
  keyFacts: GuideKeyFact[];
  topAttractions: GuideAttraction[];
}

export interface Phase6DaySummary {
  dayNumber: number;
  title: string | null;
  activitiesCount: number;
  activityNames: string[];
}

export interface ExpeditionSummaryPhase6 {
  dayCount: number;
  totalActivities: number;
  days: Phase6DaySummary[];
}

export interface PendingItem {
  phase: number;
  key: string;
  severity: "required" | "recommended" | "info";
}

export interface ExpeditionSummary {
  tripId: string;
  tripTitle: string;
  currentPhase: number;
  phase1: ExpeditionSummaryPhase1 | null;
  phase2: ExpeditionSummaryPhase2 | null;
  phase3: ExpeditionSummaryPhase3 | null;
  phase4: ExpeditionSummaryPhase4 | null;
  phase5: ExpeditionSummaryPhase5 | null;
  phase6: ExpeditionSummaryPhase6 | null;
  pendingItems: PendingItem[];
  completionPercentage: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKING_CODE_MASK_PATTERN = /^(.{4}).*(.{3})$/;
const HIGHLIGHT_SECTION_KEYS: GuideSectionKey[] = [
  "timezone",
  "currency",
  "language",
];

const TOTAL_PHASES = 6;

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

/**
 * Derive age range from birth date (never expose exact date).
 */
export function deriveAgeRange(birthDate: Date | null): string | null {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 18) return "0-17";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

/**
 * Calculate completion percentage across all 6 phases.
 * Each phase is worth 1/6 of 100%. Partial phases get partial credit.
 */
export function calculateCompletionPercentage(
  phase1: ExpeditionSummaryPhase1 | null,
  phase2: ExpeditionSummaryPhase2 | null,
  phase3: ExpeditionSummaryPhase3 | null,
  phase4: ExpeditionSummaryPhase4 | null,
  phase5: ExpeditionSummaryPhase5 | null,
  phase6: ExpeditionSummaryPhase6 | null,
): number {
  const perPhase = 100 / TOTAL_PHASES;
  let total = 0;

  // Phase 1: always present if trip exists
  if (phase1) {
    let filledFields = 0;
    const totalFields = 4; // destination, origin, startDate, endDate
    if (phase1.destination) filledFields++;
    if (phase1.origin) filledFields++;
    if (phase1.startDate) filledFields++;
    if (phase1.endDate) filledFields++;
    total += perPhase * (filledFields / totalFields);
  }

  // Phase 2
  if (phase2) {
    total += perPhase;
  }

  // Phase 3
  if (phase3) {
    const ratio = phase3.total > 0 ? phase3.done / phase3.total : 0;
    total += perPhase * ratio;
  }

  // Phase 4
  if (phase4) {
    const hasTransport = phase4.transportSegments.length > 0;
    const hasAccommodation = phase4.accommodations.length > 0;
    const hasMobility = phase4.mobility.length > 0;
    const filledParts = [hasTransport, hasAccommodation, hasMobility].filter(Boolean).length;
    total += perPhase * (filledParts / 3);
  }

  // Phase 5
  if (phase5) {
    total += perPhase;
  }

  // Phase 6
  if (phase6) {
    total += perPhase;
  }

  return Math.round(total);
}

/**
 * Collect pending/incomplete items across all phases.
 */
export function collectPendingItems(
  phase1: ExpeditionSummaryPhase1 | null,
  phase2: ExpeditionSummaryPhase2 | null,
  phase3: ExpeditionSummaryPhase3 | null,
  phase4: ExpeditionSummaryPhase4 | null,
  phase5: ExpeditionSummaryPhase5 | null,
  phase6: ExpeditionSummaryPhase6 | null,
): PendingItem[] {
  const pending: PendingItem[] = [];

  // Phase 1 pending items
  if (phase1) {
    if (!phase1.origin) pending.push({ phase: 1, key: "origin", severity: "recommended" });
    if (!phase1.startDate) pending.push({ phase: 1, key: "startDate", severity: "required" });
    if (!phase1.endDate) pending.push({ phase: 1, key: "endDate", severity: "required" });
  }

  // Phase 2
  if (!phase2) {
    pending.push({ phase: 2, key: "travelStyle", severity: "required" });
  }

  // Phase 3
  if (phase3) {
    const incomplete = phase3.items.filter((i) => i.required && !i.completed);
    for (const item of incomplete) {
      pending.push({ phase: 3, key: item.itemKey, severity: "required" });
    }
  } else {
    pending.push({ phase: 3, key: "checklist", severity: "required" });
  }

  // Phase 4 — respect undecided flags (SPEC-FASE4-AND-001 RN-10)
  if (phase4) {
    if (phase4.transportUndecided) {
      pending.push({ phase: 4, key: "transport_undecided", severity: "info" });
    } else if (phase4.transportSegments.length === 0) {
      pending.push({ phase: 4, key: "transport", severity: "recommended" });
    }
    if (phase4.accommodationUndecided) {
      pending.push({ phase: 4, key: "accommodation_undecided", severity: "info" });
    } else if (phase4.accommodations.length === 0) {
      pending.push({ phase: 4, key: "accommodation", severity: "recommended" });
    }
    if (phase4.mobilityUndecided) {
      pending.push({ phase: 4, key: "mobility_undecided", severity: "info" });
    }
  } else {
    pending.push({ phase: 4, key: "transport", severity: "recommended" });
    pending.push({ phase: 4, key: "accommodation", severity: "recommended" });
  }

  // Phase 5
  if (!phase5) {
    pending.push({ phase: 5, key: "guide", severity: "recommended" });
  }

  // Phase 6
  if (!phase6) {
    pending.push({ phase: 6, key: "itinerary", severity: "recommended" });
  }

  return pending;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ExpeditionSummaryService {
  /**
   * Aggregate data from all 6 phases of an expedition.
   * BOLA check: verifies trip belongs to user.
   * Returns null for phases that are not yet completed or have no data.
   * Includes pendingItems and completionPercentage for progress tracking.
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
        title: true,
        destination: true,
        origin: true,
        destinationLat: true,
        destinationLon: true,
        startDate: true,
        endDate: true,
        tripType: true,
        passengers: true,
        localMobility: true,
        currentPhase: true,
      },
    });

    if (!trip) {
      throw new Error("errors.tripNotFound");
    }

    // Fetch user profile for name and birthDate
    const userProfile = await db.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true, preferences: true },
    });

    // Fetch user name from User model
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Fetch all related data in parallel
    const [phases, checklist, transport, accommodations, guide, itineraryDays] =
      await Promise.all([
        db.expeditionPhase.findMany({
          where: { tripId },
          select: { phaseNumber: true, status: true, metadata: true },
        }),
        db.phaseChecklistItem.findMany({
          where: { tripId, phaseNumber: 3 },
          select: { itemKey: true, completed: true, required: true },
        }),
        db.transportSegment.findMany({
          where: { tripId },
          orderBy: { segmentOrder: "asc" },
          select: {
            transportType: true,
            departurePlace: true,
            arrivalPlace: true,
            departureAt: true,
            arrivalAt: true,
            provider: true,
            bookingCodeEnc: true,
          },
        }),
        db.accommodation.findMany({
          where: { tripId },
          orderBy: { orderIndex: "asc" },
          select: {
            accommodationType: true,
            name: true,
            checkIn: true,
            checkOut: true,
            bookingCodeEnc: true,
          },
        }),
        db.destinationGuide.findUnique({
          where: { tripId },
          select: { content: true, generatedAt: true },
        }),
        db.itineraryDay.findMany({
          where: { tripId },
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            dayNumber: true,
            notes: true,
            _count: { select: { activities: true } },
            activities: {
              orderBy: { startTime: "asc" },
              select: { title: true },
            },
          },
        }),
      ]);

    const phaseMap = new Map(
      phases.map((p) => [p.phaseNumber, p])
    );

    // Phase 1 metadata (flexibleDates is stored in expedition phase metadata)
    const phase1Meta = phaseMap.get(1)?.metadata as Record<string, unknown> | null;

    // Phase 1 — always present if trip exists
    const phase1: ExpeditionSummaryPhase1 = {
      destination: trip.destination,
      origin: trip.origin,
      destinationLat: trip.destinationLat,
      destinationLon: trip.destinationLon,
      startDate: trip.startDate
        ? trip.startDate.toISOString().split("T")[0]!
        : null,
      endDate: trip.endDate ? trip.endDate.toISOString().split("T")[0]! : null,
      tripType: trip.tripType,
      flexibleDates: Boolean(phase1Meta?.flexibleDates),
      name: user?.name ?? null,
      ageRange: deriveAgeRange(userProfile?.birthDate ?? null),
    };

    // Phase 2
    const phase2Data = phaseMap.get(2);
    let phase2: ExpeditionSummaryPhase2 | null = null;
    if (phase2Data?.status === "completed" && phase2Data.metadata) {
      const meta = phase2Data.metadata as Record<string, unknown>;
      const passengers = trip.passengers as Record<string, unknown> | null;
      const rawPrefs = userProfile?.preferences as Record<string, unknown> | null;

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
        budgetRange: (meta.budgetRange as string) ?? null,
        preferences: rawPrefs as UserPreferences | null,
      };
    }

    // Phase 3
    let phase3: ExpeditionSummaryPhase3 | null = null;
    if (checklist.length > 0) {
      const done = checklist.filter((c) => c.completed).length;
      phase3 = {
        done,
        total: checklist.length,
        items: checklist.map((c) => ({
          itemKey: c.itemKey,
          completed: c.completed,
          required: c.required,
        })),
      };
    }

    // Phase 4
    const phase4Meta = phaseMap.get(4)?.metadata as Record<string, unknown> | null;
    const phase4HasData =
      transport.length > 0 ||
      accommodations.length > 0 ||
      trip.localMobility.length > 0 ||
      phaseMap.has(4); // Phase 4 exists (user advanced through it)

    let phase4: ExpeditionSummaryPhase4 | null = null;
    if (phase4HasData) {
      phase4 = {
        transportSegments: transport.map((t) => ({
          type: t.transportType,
          departurePlace: t.departurePlace,
          arrivalPlace: t.arrivalPlace,
          departureAt: t.departureAt
            ? t.departureAt.toISOString()
            : null,
          arrivalAt: t.arrivalAt
            ? t.arrivalAt.toISOString()
            : null,
          provider: t.provider,
          maskedBookingCode: t.bookingCodeEnc
            ? maskBookingCode(t.bookingCodeEnc)
            : null,
        })),
        accommodations: accommodations.map((a) => ({
          type: a.accommodationType,
          name: a.name,
          checkIn: a.checkIn
            ? a.checkIn.toISOString().split("T")[0]!
            : null,
          checkOut: a.checkOut
            ? a.checkOut.toISOString().split("T")[0]!
            : null,
          maskedBookingCode: a.bookingCodeEnc
            ? maskBookingCode(a.bookingCodeEnc)
            : null,
        })),
        mobility: trip.localMobility,
        transportUndecided: Boolean(phase4Meta?.transportUndecided),
        accommodationUndecided: Boolean(phase4Meta?.accommodationUndecided),
        mobilityUndecided: Boolean(phase4Meta?.mobilityUndecided),
      };
    }

    // Phase 5
    let phase5: ExpeditionSummaryPhase5 | null = null;
    if (guide) {
      const content = guide.content as unknown as DestinationGuideContent;
      const highlights: string[] = [];
      let safetyLevel: string | null = null;
      const keyFacts: GuideKeyFact[] = [];
      const topAttractions: GuideAttraction[] = [];

      if (isGuideV2(content)) {
        // v2 format: extract highlights from destination info + safety level
        if (content.destination?.name) highlights.push(content.destination.name);
        if (content.safety?.level) {
          highlights.push(content.safety.level);
          safetyLevel = content.safety.level;
        }
        if (content.quickFacts?.currency?.value) highlights.push(content.quickFacts.currency.value);

        // Key facts from quickFacts
        const factKeys = ["climate", "currency", "language", "timezone"] as const;
        for (const fk of factKeys) {
          const fact = content.quickFacts?.[fk];
          if (fact?.label && fact?.value) {
            keyFacts.push({ label: fact.label, value: fact.value });
          }
        }

        // Top attractions from mustSee
        const MAX_ATTRACTIONS = 3;
        if (content.mustSee) {
          for (const item of content.mustSee.slice(0, MAX_ATTRACTIONS)) {
            topAttractions.push({ name: item.name, description: item.description });
          }
        }
      } else {
        // v1 format: use section icons + titles
        for (const key of HIGHLIGHT_SECTION_KEYS) {
          const section = content[key];
          if (section) {
            highlights.push(`${section.icon} ${section.title}`);
          }
          if (highlights.length >= 3) break;
        }
      }

      phase5 = {
        generatedAt: guide.generatedAt.toISOString().split("T")[0]!,
        highlights,
        safetyLevel,
        keyFacts,
        topAttractions,
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
        days: itineraryDays.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.notes?.split("\n")[0]?.slice(0, 60) ?? null,
          activitiesCount: day._count.activities,
          activityNames: day.activities.map((a) => a.title),
        })),
      };
    }

    // Calculate pending items and completion percentage
    const pendingItems = collectPendingItems(phase1, phase2, phase3, phase4, phase5, phase6);
    const completionPercentage = calculateCompletionPercentage(phase1, phase2, phase3, phase4, phase5, phase6);

    logger.info("expedition.summary.fetched", {
      userId: hashUserId(userId),
      tripId,
      completionPercentage,
    });

    return {
      tripId,
      tripTitle: trip.title,
      currentPhase: trip.currentPhase,
      phase1,
      phase2,
      phase3,
      phase4,
      phase5,
      phase6,
      pendingItems,
      completionPercentage,
    };
  }
}
