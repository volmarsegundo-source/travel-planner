import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface Phase2PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase2Page({ params }: Phase2PageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  // Fetch trip context for confirmation step + saved passengers
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: {
      destination: true,
      origin: true,
      startDate: true,
      endDate: true,
      currentPhase: true,
      passengers: true,
    },
  });

  if (!trip) {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  // Fetch saved Phase 2 expedition data (travelerType, accommodation, etc.)
  const phase2 = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
    select: { metadata: true, status: true },
  });

  const savedPhase2Data = phase2?.status === "completed" && phase2?.metadata
    ? phase2.metadata as Record<string, unknown>
    : null;

  const savedPassengers = trip.passengers as Record<string, unknown> | null;

  // Phase access guard: block forward skip, allow backward access
  if (trip.currentPhase < 2) {
    const currentPhaseRoute = trip.currentPhase === 1
      ? `/expedition/${tripId}/phase-1`
      : `/expedition/${tripId}/phase-${trip.currentPhase}`;
    redirect({ href: currentPhaseRoute, locale });
    return null;
  }

  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <Phase2Wizard
        tripId={tripId}
        tripContext={trip ? {
          destination: trip.destination,
          origin: trip.origin ?? undefined,
          startDate: trip.startDate?.toISOString().split("T")[0] ?? undefined,
          endDate: trip.endDate?.toISOString().split("T")[0] ?? undefined,
        } : undefined}
        savedData={savedPhase2Data ? {
          travelerType: savedPhase2Data.travelerType as string | undefined,
          accommodationStyle: savedPhase2Data.accommodationStyle as string | undefined,
          travelPace: savedPhase2Data.travelPace as number | undefined,
          budget: savedPhase2Data.budget as number | undefined,
          currency: savedPhase2Data.currency as string | undefined,
        } : undefined}
        savedPassengers={savedPassengers ? {
          adults: (savedPassengers.adults as number) ?? 1,
          children: savedPassengers.children as { count: number; ages: number[] } | undefined,
          seniors: (savedPassengers.seniors as number) ?? 0,
          infants: (savedPassengers.infants as number) ?? 0,
        } : undefined}
      />
    </>
  );
}
