// Vercel Hobby hard limit: serverless functions cap at 60s.
// See: docs/architecture.md ADR-028.
export const maxDuration = 60;

import { db } from "@/server/db";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { PointsEngine } from "@/lib/engines/points-engine";
import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { Phase4WizardV2 } from "@/components/features/expedition/Phase4WizardV2";
import { Phase6ItineraryV2 } from "@/components/features/expedition/Phase6ItineraryV2";
import { deriveAgeRange } from "@/server/services/expedition-summary.service";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";
import { logger } from "@/lib/logger";
import type { TravelStyle, ExpeditionContext } from "@/types/ai.types";
import type { DestinationGuideContent } from "@/types/ai.types";
import { isGuideV2 } from "@/types/ai.types";

interface Phase4PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

/**
 * Collects all user data from phases 1-5 to build enriched expedition context
 * for itinerary generation per SPEC-AI-004.
 * (Duplicated from phase-6/page.tsx — extracted inline to avoid circular imports.)
 */
async function collectExpeditionContext(
  tripId: string,
  userId: string,
  trip: Record<string, unknown>,
  phase2Meta: Record<string, unknown> | null,
): Promise<ExpeditionContext> {
  const [userProfile, user, guide, transport, accommodations] = await Promise.all([
    db.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true, preferences: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    db.destinationGuide.findUnique({
      where: { tripId },
      select: { content: true },
    }),
    db.transportSegment.findMany({
      where: { tripId },
      orderBy: { segmentOrder: "asc" },
      select: {
        transportType: true,
        departurePlace: true,
        arrivalPlace: true,
        departureAt: true,
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
      },
    }),
  ]);

  const passengers = trip.passengers as Record<string, unknown> | null;
  let travelersDesc = "";
  if (passengers) {
    const parts: string[] = [];
    const adults = Number(passengers.adults ?? 0);
    const childrenObj = passengers.children as Record<string, unknown> | null;
    const children = Number(childrenObj?.count ?? 0);
    const infants = Number(passengers.infants ?? 0);
    const seniors = Number(passengers.seniors ?? 0);
    if (adults > 0) parts.push(`${adults} adults`);
    if (children > 0) parts.push(`${children} children`);
    if (infants > 0) parts.push(`${infants} infants`);
    if (seniors > 0) parts.push(`${seniors} seniors`);
    travelersDesc = parts.join(", ");
  }

  const prefs = (userProfile?.preferences ?? {}) as Record<string, unknown>;
  const foodPrefs = Array.isArray(prefs.foodPreferences) ? prefs.foodPreferences.join(", ") : "";
  const interests = Array.isArray(prefs.interests) ? prefs.interests.join(", ") : "";
  const accommodationPref = Array.isArray(prefs.accommodationStyle) ? prefs.accommodationStyle.join(", ") : "";

  let guideContext = "";
  if (guide) {
    const content = guide.content as unknown as DestinationGuideContent;
    const summaries: string[] = [];

    if (isGuideV2(content)) {
      if (content.destination?.subtitle) {
        summaries.push(`Destination: ${content.destination.subtitle}`);
      }
      if (content.safety?.level) {
        summaries.push(`Safety: ${content.safety.level}`);
      }
      if (content.culturalTips?.length > 0) {
        summaries.push(`Tips: ${content.culturalTips.slice(0, 2).join("; ")}`);
      }
    } else {
      const keys = ["cultural_tips", "safety", "transport_overview"] as const;
      for (const key of keys) {
        const section = content[key];
        if (section?.summary) {
          summaries.push(`${section.title}: ${section.summary}`);
        }
      }
    }
    guideContext = summaries.join("; ");
  }

  const transportDescs = transport.map((t) => {
    const parts = [`${t.transportType}`];
    if (t.departurePlace && t.arrivalPlace) {
      parts.push(`${t.departurePlace} -> ${t.arrivalPlace}`);
    }
    if (t.departureAt) {
      parts.push(t.departureAt.toISOString().split("T")[0]!);
    }
    return parts.join(", ");
  });

  const accommodationDescs = accommodations.map((a) => {
    const parts = [a.accommodationType];
    if (a.name) parts.push(a.name);
    if (a.checkIn) parts.push(`check-in ${a.checkIn.toISOString().split("T")[0]!}`);
    if (a.checkOut) parts.push(`check-out ${a.checkOut.toISOString().split("T")[0]!}`);
    return parts.join(", ");
  });

  const localMobility = (trip.localMobility ?? []) as string[];
  const startDate = trip.startDate instanceof Date ? trip.startDate.toISOString().split("T")[0] : null;
  const endDate = trip.endDate instanceof Date ? trip.endDate.toISOString().split("T")[0] : null;

  return {
    tripType: (trip.tripType as string) ?? undefined,
    travelerType: (phase2Meta?.travelerType as string) ?? undefined,
    accommodationStyle: (phase2Meta?.accommodationStyle as string) ?? undefined,
    travelPace: phase2Meta?.travelPace != null ? Number(phase2Meta.travelPace) : undefined,
    budget: phase2Meta?.budget != null ? Number(phase2Meta.budget) : undefined,
    currency: (phase2Meta?.currency as string) ?? undefined,
    destinationGuideContext: guideContext || undefined,
    personal: {
      name: user?.name ?? undefined,
      ageRange: deriveAgeRange(userProfile?.birthDate ?? null) ?? undefined,
      origin: (trip.origin as string) ?? undefined,
    },
    trip: {
      destination: (trip.destination as string) ?? undefined,
      dates: startDate && endDate ? `${startDate} to ${endDate}` : undefined,
      type: (trip.tripType as string) ?? undefined,
      travelers: travelersDesc || undefined,
    },
    preferences: {
      pace: (prefs.travelPace as string) ?? undefined,
      budget: (prefs.budgetStyle as string) ?? undefined,
      food: foodPrefs || undefined,
      interests: interests || undefined,
      accommodation: accommodationPref || undefined,
    },
    logistics: {
      transport: transportDescs.length > 0 ? transportDescs : undefined,
      accommodation: accommodationDescs.length > 0 ? accommodationDescs : undefined,
      mobility: localMobility.length > 0 ? localMobility : undefined,
    },
  };
}

export default async function Phase4Page({ params }: Phase4PageProps) {
  const { locale, tripId } = await params;
  const reordered = isPhaseReorderEnabled();

  if (reordered) {
    // ── Flag ON: phase-4 = O Roteiro (Phase6ItineraryV2) ─────────────────
    const { trip, userId, accessMode, completedPhases } = await guardPhaseAccess(
      tripId, 4, locale,
      {
        destination: true,
        origin: true,
        startDate: true,
        endDate: true,
        tripType: true,
        passengers: true,
        localMobility: true,
        itineraryDays: {
          orderBy: { dayNumber: "asc" },
          include: {
            activities: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      }
    );

    let itineraryPlan: Awaited<
      ReturnType<typeof ItineraryPlanService.getOrCreateItineraryPlan>
    > | null = null;
    try {
      itineraryPlan = await ItineraryPlanService.getOrCreateItineraryPlan(tripId, userId, locale);
    } catch (err) {
      logger.error(
        "expedition.phase4.itineraryPlan.error",
        err instanceof Error ? err : new Error(String(err)),
        { tripId },
      );
      throw err;
    }

    const JUST_GENERATED_WINDOW_MS = 90_000;
    const isJustGenerated =
      !!itineraryPlan?.generatedAt &&
      Date.now() - itineraryPlan.generatedAt.getTime() < JUST_GENERATED_WINDOW_MS;

    const phase2 = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
      select: { metadata: true, status: true },
    });

    const phase2Meta =
      phase2?.status === "completed"
        ? (phase2.metadata as Record<string, unknown> | null)
        : null;

    let expeditionContext: ExpeditionContext;
    try {
      expeditionContext = await collectExpeditionContext(
        tripId,
        userId,
        trip as unknown as Record<string, unknown>,
        phase2Meta,
      );
    } catch (err) {
      logger.error(
        "expedition.phase4.context.error",
        err instanceof Error ? err : new Error(String(err)),
        { tripId },
      );
      expeditionContext = {
        tripType: (trip.tripType as string) ?? undefined,
        personal: {},
        trip: { destination: typeof trip.destination === "string" ? trip.destination : undefined },
        preferences: {},
        logistics: {},
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itineraryDays = (trip.itineraryDays ?? []) as any;

    const passengers = trip.passengers as Record<string, unknown> | null;
    let totalTravelers = 1;
    if (passengers) {
      const childrenObj = passengers.children as Record<string, unknown> | null;
      totalTravelers = Number(passengers.adults ?? 0) +
        Number(childrenObj?.count ?? 0) +
        Number(passengers.infants ?? 0) +
        Number(passengers.seniors ?? 0);
      if (totalTravelers === 0) totalTravelers = 1;
    }

    let availablePoints = 0;
    try {
      const balance = await PointsEngine.getBalance(userId);
      availablePoints = balance.availablePoints;
    } catch {
      // Non-critical — defaults to 0
    }

    return (
      <Phase6ItineraryV2
        key={`phase4-itinerary-${itineraryDays.length}`}
        tripId={tripId}
        destination={typeof trip.destination === "string" ? trip.destination : ""}
        locale={locale}
        startDate={trip.startDate instanceof Date ? trip.startDate.toISOString().split("T")[0]! : typeof trip.startDate === "string" ? trip.startDate.split("T")[0]! : null}
        endDate={trip.endDate instanceof Date ? trip.endDate.toISOString().split("T")[0]! : typeof trip.endDate === "string" ? trip.endDate.split("T")[0]! : null}
        initialDays={itineraryDays}
        travelStyle={(phase2Meta?.travelStyle as TravelStyle | undefined) ?? undefined}
        budgetTotal={(phase2Meta?.budget as number | undefined) ?? undefined}
        budgetCurrency={(phase2Meta?.currency as string | undefined) ?? undefined}
        travelers={totalTravelers}
        expeditionContext={expeditionContext}
        accessMode={accessMode}
        tripCurrentPhase={trip.currentPhase}
        completedPhases={completedPhases}
        availablePoints={availablePoints}
        isJustGenerated={isJustGenerated}
      />
    );
  }

  // ── Flag OFF (original): phase-4 = A Logistica (Phase4WizardV2) ─────────
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 4, locale,
    { tripType: true, startDate: true, endDate: true, destination: true, origin: true }
  );

  const sharedProps = {
    tripId,
    tripType: typeof trip.tripType === "string" ? trip.tripType : "international",
    origin: typeof trip.origin === "string" ? trip.origin : null,
    destination: typeof trip.destination === "string" ? trip.destination : "",
    startDate: trip.startDate instanceof Date ? trip.startDate.toISOString() : typeof trip.startDate === "string" ? trip.startDate : null,
    endDate: trip.endDate instanceof Date ? trip.endDate.toISOString() : typeof trip.endDate === "string" ? trip.endDate : null,
    currentPhase: trip.currentPhase,
    accessMode,
    tripCurrentPhase: trip.currentPhase,
    completedPhases,
  };

  return <Phase4WizardV2 {...sharedProps} />;
}
