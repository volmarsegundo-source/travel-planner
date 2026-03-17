import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { Phase4Wizard } from "@/components/features/expedition/Phase4Wizard";

interface Phase4PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase4Page({ params }: Phase4PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 4 check)
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 4, locale,
    { tripType: true, startDate: true, destination: true, origin: true }
  );

  return (
    <Phase4Wizard
      tripId={tripId}
      tripType={trip.tripType as string}
      origin={(trip.origin as string | null) ?? null}
      destination={trip.destination as string}
      startDate={trip.startDate ? (trip.startDate as Date).toISOString() : null}
      currentPhase={trip.currentPhase}
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
