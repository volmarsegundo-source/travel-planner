import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { Phase4WizardV2 } from "@/components/features/expedition/Phase4WizardV2";

interface Phase4PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase4Page({ params }: Phase4PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 4 check)
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
