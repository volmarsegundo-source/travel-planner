import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface Phase1PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase1Page({ params }: Phase1PageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  // Fetch trip data including saved Phase 1 fields
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: {
      destination: true,
      origin: true,
      startDate: true,
      endDate: true,
      currentPhase: true,
    },
  });

  if (!trip) {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  // Fetch user profile for pre-population
  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      birthDate: true,
      phone: true,
      country: true,
      city: true,
      bio: true,
    },
  });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
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
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <Phase1Wizard
        userProfile={userProfile}
        userName={user?.name ?? undefined}
        savedDestination={trip.destination}
        savedOrigin={trip.origin ?? undefined}
        savedStartDate={trip.startDate?.toISOString().split("T")[0]}
        savedEndDate={trip.endDate?.toISOString().split("T")[0]}
        tripId={tripId}
      />
    </>
  );
}
