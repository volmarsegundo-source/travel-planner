import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PointsEngine } from "@/lib/engines/points-engine";
import { TripService } from "@/server/services/trip.service";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { AtlasProfilePage } from "@/components/features/dashboard/AtlasProfilePage";
import type { Rank } from "@/types/gamification.types";

interface AtlasPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AtlasPage({ params }: AtlasPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");
  const t = await getTranslations("atlas");

  const [progress, tripsWithPhases] = await Promise.all([
    PointsEngine.getProgressSummary(session.user.id),
    TripService.getUserTripsWithExpeditionData(session.user.id),
  ]);

  const expeditionCount = tripsWithPhases.filter(
    (t: (typeof tripsWithPhases)[number]) => t.expeditionMode
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: tNav("breadcrumb.home"), href: "/expeditions" },
          { label: tNav("breadcrumb.atlas") },
        ]}
      />
      <h1 className="mt-6 text-2xl font-bold text-foreground">{t("title")}</h1>
      <div className="mt-4">
        <AtlasProfilePage
          totalPoints={progress.totalPoints}
          currentRank={progress.currentRank as Rank}
          streakDays={progress.streakDays}
          badges={progress.badges}
          expeditionCount={expeditionCount}
        />
      </div>
    </div>
  );
}
