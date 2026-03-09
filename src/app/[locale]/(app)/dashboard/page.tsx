import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PointsEngine } from "@/lib/engines/points-engine";
import { TripService } from "@/server/services/trip.service";
import { AtlasDashboard } from "@/components/features/dashboard/AtlasDashboard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import type { Rank } from "@/types/gamification.types";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  const [progress, tripsWithPhases] = await Promise.all([
    PointsEngine.getProgressSummary(session.user.id),
    TripService.getUserTripsWithExpeditionData(session.user.id),
  ]);

  const userName =
    session.user.name ??
    session.user.email?.split("@")[0] ??
    "Traveler";

  const expeditions = tripsWithPhases
    .filter((t) => t.expeditionMode)
    .map((t) => ({
      id: t.id,
      destination: t.destination,
      currentPhase: t.currentPhase,
      completedPhases: t.completedPhases,
      totalPhases: t.totalPhases,
      coverEmoji: t.coverEmoji,
      checklistRequired: t.checklistRequired,
      checklistRequiredDone: t.checklistRequiredDone,
      checklistRecommendedPending: t.checklistRecommendedPending,
      hasItineraryPlan: t.hasItineraryPlan,
    }));

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.atlas") },
          ]}
        />
      </div>
      <AtlasDashboard
        userName={userName}
        rank={progress.currentRank as Rank}
        totalPoints={progress.totalPoints}
        expeditions={expeditions}
      />
    </>
  );
}
