import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { Phase3Wizard } from "@/components/features/expedition/Phase3Wizard";
import type { TripType } from "@/lib/travel/trip-classifier";

interface Phase3PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase3Page({ params }: Phase3PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard — also provides userId (no need for a second auth() call)
  const { trip, userId, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 3, locale,
    { tripType: true, startDate: true, destination: true }
  );

  // Initialize phase 3 checklist (idempotent)
  await ChecklistEngine.initializePhase3Checklist(
    tripId,
    userId,
    trip.tripType as TripType,
    trip.startDate as Date | null
  );

  // Fetch checklist items
  const items = await ChecklistEngine.getPhaseChecklist(tripId, 3);

  const serializedItems = items.map((item: (typeof items)[number]) => ({
    id: item.id,
    itemKey: item.itemKey,
    required: item.required,
    completed: item.completed,
    deadline: item.deadline?.toISOString() ?? null,
    pointsValue: item.pointsValue,
  }));

  return (
    <Phase3Wizard
      tripId={tripId}
      items={serializedItems}
      tripType={trip.tripType as string}
      destination={trip.destination as string}
      currentPhase={trip.currentPhase}
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
