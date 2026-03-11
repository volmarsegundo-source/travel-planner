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

  // Fetch trip context for confirmation step
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

  if (!trip || trip.currentPhase < 2) {
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
      <Phase2Wizard
        tripId={tripId}
        tripContext={trip ? {
          destination: trip.destination,
          origin: trip.origin ?? undefined,
          startDate: trip.startDate?.toISOString().split("T")[0] ?? undefined,
          endDate: trip.endDate?.toISOString().split("T")[0] ?? undefined,
        } : undefined}
      />
    </>
  );
}
