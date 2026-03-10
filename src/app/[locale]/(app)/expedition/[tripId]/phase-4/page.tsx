import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Phase4Wizard } from "@/components/features/expedition/Phase4Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

interface Phase4PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase4Page({ params }: Phase4PageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      tripType: true,
      startDate: true,
      destination: true,
      currentPhase: true,
    },
  });

  if (!trip || trip.currentPhase < 4) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <Phase4Wizard
        tripId={tripId}
        tripType={trip.tripType}
        destination={trip.destination}
        startDate={trip.startDate?.toISOString() ?? null}
      />
    </>
  );
}
