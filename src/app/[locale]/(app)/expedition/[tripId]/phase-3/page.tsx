import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { Phase3Wizard } from "@/components/features/expedition/Phase3Wizard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import type { TripType } from "@/lib/travel/trip-classifier";

interface Phase3PageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

export default async function Phase3Page({ params }: Phase3PageProps) {
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

  if (!trip || trip.currentPhase !== 3) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  // Initialize phase 3 checklist (idempotent)
  await ChecklistEngine.initializePhase3Checklist(
    tripId,
    session.user.id,
    trip.tripType as TripType,
    trip.startDate
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
    <>
      <div className="mx-auto max-w-md px-4 pt-6 sm:px-6">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <Phase3Wizard
        tripId={tripId}
        items={serializedItems}
        tripType={trip.tripType}
        destination={trip.destination}
      />
    </>
  );
}
