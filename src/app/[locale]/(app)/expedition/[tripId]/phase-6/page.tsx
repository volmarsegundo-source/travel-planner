// Allow AI generation requests up to 120s (Anthropic SDK timeout is 90s)
export const maxDuration = 120;

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { Phase6Wizard } from "@/components/features/expedition/Phase6Wizard";
import type { TravelStyle } from "@/types/ai.types";

interface Phase6PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase6Page({ params }: Phase6PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 6 check)
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 6, locale,
    {
      destination: true,
      startDate: true,
      endDate: true,
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

  // Ensure ItineraryPlan exists
  await ItineraryPlanService.getOrCreateItineraryPlan(
    tripId,
    session!.user!.id!,
    locale
  );

  // Fetch Phase 2 metadata for default budget/style
  const phase2 = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
    select: { metadata: true, status: true },
  });

  const phase2Meta =
    phase2?.status === "completed"
      ? (phase2.metadata as Record<string, unknown> | null)
      : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itineraryDays = (trip.itineraryDays ?? []) as any;

  return (
    <Phase6Wizard
      key={`phase6-${itineraryDays.length}`}
      tripId={tripId}
      destination={typeof trip.destination === "string" ? trip.destination : ""}
      locale={locale}
      startDate={
        trip.startDate instanceof Date ? trip.startDate.toISOString().split("T")[0] : typeof trip.startDate === "string" ? trip.startDate.split("T")[0] : null
      }
      endDate={
        trip.endDate instanceof Date ? trip.endDate.toISOString().split("T")[0] : typeof trip.endDate === "string" ? trip.endDate.split("T")[0] : null
      }
      initialDays={itineraryDays}
      travelStyle={
        (phase2Meta?.travelStyle as TravelStyle | undefined) ?? undefined
      }
      budgetTotal={
        (phase2Meta?.budget as number | undefined) ?? undefined
      }
      budgetCurrency={
        (phase2Meta?.currency as string | undefined) ?? undefined
      }
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
