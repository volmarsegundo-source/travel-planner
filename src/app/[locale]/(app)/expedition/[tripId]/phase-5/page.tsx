import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Phase5Wizard } from "@/components/features/expedition/Phase5Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import {
  CONNECTIVITY_DATA,
  type ConnectivityRegion,
} from "@/lib/travel/connectivity-data";
import { detectRegion } from "@/lib/travel/connectivity-data";

interface Phase5PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase5Page({ params }: Phase5PageProps) {
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
      destination: true,
      currentPhase: true,
    },
  });

  if (!trip || trip.currentPhase !== 5) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  const region = detectRegion(trip.destination, trip.tripType);
  const plans = CONNECTIVITY_DATA[region];

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
      <Phase5Wizard
        tripId={tripId}
        region={region}
        destination={trip.destination}
        plans={plans}
      />
    </>
  );
}
