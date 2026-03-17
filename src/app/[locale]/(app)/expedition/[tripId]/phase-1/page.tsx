import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { guardPhaseAccess } from "@/lib/guards/phase-access.guard";
import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";

interface Phase1PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase1Page({ params }: Phase1PageProps) {
  const { locale, tripId } = await params;

  // Phase access guard (fixes NAV-001: Phase 1 was previously unguarded)
  const { trip, accessMode, completedPhases } = await guardPhaseAccess(
    tripId, 1, locale,
    { destination: true, origin: true, startDate: true, endDate: true }
  );

  const session = await auth();

  // Fetch user profile for pre-population
  const profile = await db.userProfile.findUnique({
    where: { userId: session!.user!.id! },
    select: {
      birthDate: true,
      phone: true,
      country: true,
      city: true,
      bio: true,
    },
  });

  const user = await db.user.findUnique({
    where: { id: session!.user!.id! },
    select: { name: true },
  });

  const userProfile = profile
    ? {
        birthDate: profile.birthDate?.toISOString().split("T")[0],
        phone: profile.phone ?? undefined,
        country: profile.country ?? undefined,
        city: profile.city ?? undefined,
        bio: profile.bio ?? undefined,
      }
    : undefined;

  return (
    <Phase1Wizard
      userProfile={userProfile}
      userName={user?.name ?? undefined}
      savedDestination={trip.destination as string | undefined}
      savedOrigin={trip.origin as string | undefined}
      savedStartDate={trip.startDate ? (trip.startDate as Date).toISOString().split("T")[0] : undefined}
      savedEndDate={trip.endDate ? (trip.endDate as Date).toISOString().split("T")[0] : undefined}
      tripId={tripId}
      accessMode={accessMode}
      tripCurrentPhase={trip.currentPhase}
      completedPhases={completedPhases}
    />
  );
}
