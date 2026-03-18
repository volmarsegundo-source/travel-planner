import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { TripService } from "@/server/services/trip.service";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ExpeditionsDashboard } from "@/components/features/dashboard/ExpeditionsDashboard";
import type { ExpeditionDTO } from "@/types/expedition.types";

interface ExpeditionsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ExpeditionsPage({ params }: ExpeditionsPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  const tripsWithPhases = await TripService.getUserTripsWithExpeditionData(
    session.user.id
  );

  const expeditions: ExpeditionDTO[] = tripsWithPhases
    .filter((t: (typeof tripsWithPhases)[number]) => t.expeditionMode)
    .map((t: (typeof tripsWithPhases)[number]) => ({
      id: t.id,
      destination: t.destination,
      currentPhase: t.currentPhase,
      completedPhases: t.completedPhases,
      totalPhases: t.totalPhases,
      coverEmoji: t.coverEmoji,
      startDate: t.startDate ? t.startDate.toISOString().split("T")[0]! : null,
      endDate: t.endDate ? t.endDate.toISOString().split("T")[0]! : null,
      status: t.status,
      tripType: (t as Record<string, unknown>).tripType as string ?? "international",
      destinationLat: t.destinationLat ?? null,
      destinationLon: t.destinationLon ?? null,
      checklistRequired: t.checklistRequired,
      checklistRequiredDone: t.checklistRequiredDone,
      checklistRecommendedPending: t.checklistRecommendedPending,
      hasItineraryPlan: t.hasItineraryPlan,
      createdAt: t.createdAt.toISOString(),
      hasChecklist: t.hasChecklist,
      hasGuide: t.hasGuide,
      hasLogistics: t.hasLogistics,
    }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: tNav("breadcrumb.home"), href: "/expeditions" },
          { label: tNav("expeditions") },
        ]}
      />
      <div className="mt-6">
        <ExpeditionsDashboard expeditions={expeditions} />
      </div>
    </div>
  );
}
