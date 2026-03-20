import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";
import { parsePreferences } from "@/lib/validations/preferences.schema";

interface Phase2PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase2Page({ params }: Phase2PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (replaces inline currentPhase < 2 check)
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 2, locale,
    { destination: true, origin: true, startDate: true, endDate: true, passengers: true }
  );

  // Fetch saved Phase 2 expedition data (travelerType, accommodation, etc.)
  const phase2 = await db.expeditionPhase.findUnique({
    where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
    select: { metadata: true, status: true },
  });

  const savedPhase2Data = phase2?.status === "completed" && phase2?.metadata
    ? phase2.metadata as Record<string, unknown>
    : null;

  // Load saved user preferences for Phase 2 revisit
  const session = await auth();
  let savedPreferences: ReturnType<typeof parsePreferences> | undefined;
  if (session?.user?.id) {
    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { preferences: true },
    });
    if (profile?.preferences) {
      savedPreferences = parsePreferences(profile.preferences);
    }
  }

  const savedPassengers = (trip.passengers != null && typeof trip.passengers === "object")
    ? trip.passengers as Record<string, unknown>
    : null;

  // Safely extract trip context fields (guard returns [key: string]: unknown)
  const destination = typeof trip.destination === "string" ? trip.destination : "";
  const origin = typeof trip.origin === "string" ? trip.origin : undefined;

  // Dates: Prisma returns Date objects, but handle string fallback for safety
  let startDate: string | undefined;
  let endDate: string | undefined;
  try {
    if (trip.startDate instanceof Date) {
      startDate = trip.startDate.toISOString().split("T")[0];
    } else if (typeof trip.startDate === "string") {
      startDate = trip.startDate.split("T")[0];
    }
    if (trip.endDate instanceof Date) {
      endDate = trip.endDate.toISOString().split("T")[0];
    } else if (typeof trip.endDate === "string") {
      endDate = trip.endDate.split("T")[0];
    }
  } catch {
    // Graceful degradation — dates remain undefined
  }

  return (
    <Phase2Wizard
      tripId={tripId}
      tripContext={{
        destination,
        origin,
        startDate,
        endDate,
      }}
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
      savedPreferences={savedPreferences}
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
