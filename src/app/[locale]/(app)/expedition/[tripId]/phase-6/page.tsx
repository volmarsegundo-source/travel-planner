// Allow AI generation requests up to 120s (Anthropic SDK timeout is 90s)
export const maxDuration = 120;

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { PointsEngine } from "@/lib/engines/points-engine";
import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { Phase6ItineraryV2 } from "@/components/features/expedition/Phase6ItineraryV2";
import { deriveAgeRange } from "@/server/services/expedition-summary.service";
import type { TravelStyle, ExpeditionContext } from "@/types/ai.types";
import type { DestinationGuideContent } from "@/types/ai.types";

interface Phase6PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

/**
 * Collects all user data from phases 1-5 to build enriched expedition context
 * for itinerary generation per SPEC-AI-004.
 */
async function collectExpeditionContext(
  tripId: string,
  userId: string,
  trip: Record<string, unknown>,
  phase2Meta: Record<string, unknown> | null,
): Promise<ExpeditionContext> {
  // Fetch user profile for personal context
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

  // Build passengers description
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

  // Build preferences description from user profile
  const prefs = (userProfile?.preferences ?? {}) as Record<string, unknown>;
  const foodPrefs = Array.isArray(prefs.foodPreferences) ? prefs.foodPreferences.join(", ") : "";
  const interests = Array.isArray(prefs.interests) ? prefs.interests.join(", ") : "";
  const accommodationPref = Array.isArray(prefs.accommodationStyle) ? prefs.accommodationStyle.join(", ") : "";

  // Build guide highlights for context
  let guideContext = "";
  if (guide) {
    const content = guide.content as unknown as DestinationGuideContent;
    const summaries: string[] = [];
    const keys = ["cultural_tips", "safety", "transport_overview"] as const;
    for (const key of keys) {
      const section = content[key];
      if (section?.summary) {
        summaries.push(`${section.title}: ${section.summary}`);
      }
    }
    guideContext = summaries.join("; ");
  }

  // Build transport descriptions
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

  // Build accommodation descriptions
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
    // Legacy fields (backward compatible)
    tripType: (trip.tripType as string) ?? undefined,
    travelerType: (phase2Meta?.travelerType as string) ?? undefined,
    accommodationStyle: (phase2Meta?.accommodationStyle as string) ?? undefined,
    travelPace: phase2Meta?.travelPace != null ? Number(phase2Meta.travelPace) : undefined,
    budget: phase2Meta?.budget != null ? Number(phase2Meta.budget) : undefined,
    currency: (phase2Meta?.currency as string) ?? undefined,
    destinationGuideContext: guideContext || undefined,
    // Enriched context (SPEC-AI-004)
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

export default async function Phase6Page({ params }: Phase6PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 6 check)
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 6, locale,
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

  const session = await auth();
  const userId = session!.user!.id!;

  // Ensure ItineraryPlan exists
  await ItineraryPlanService.getOrCreateItineraryPlan(tripId, userId, locale);

  // Fetch Phase 2 metadata for default budget/style
  const phase2 = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
    select: { metadata: true, status: true },
  });

  const phase2Meta =
    phase2?.status === "completed"
      ? (phase2.metadata as Record<string, unknown> | null)
      : null;

  // Collect enriched expedition context from phases 1-5 (TASK-S33-011)
  const expeditionContext = await collectExpeditionContext(
    tripId,
    userId,
    trip as unknown as Record<string, unknown>,
    phase2Meta,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itineraryDays = (trip.itineraryDays ?? []) as any;

  // Calculate total travelers for the prompt
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

  // Fetch PA balance for cost gate
  let availablePoints = 0;
  try {
    const balance = await PointsEngine.getBalance(userId);
    availablePoints = balance.availablePoints;
  } catch {
    // Non-critical — defaults to 0
  }

  return (
    <Phase6ItineraryV2
      key={`phase6-v2-${itineraryDays.length}`}
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
    />
  );
}
