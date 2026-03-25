import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { TripService } from "@/server/services/trip.service";
import { PointsEngine } from "@/lib/engines/points-engine";
import { BADGE_REGISTRY } from "@/lib/gamification/badge-registry";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { DashboardV2 } from "@/components/features/dashboard/DashboardV2";
import type { ExpeditionDTO } from "@/types/expedition.types";
import type { BadgeDTO, GamificationData } from "@/components/features/dashboard/DashboardV2";
import type { Rank } from "@/types/gamification.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_RECENT_BADGES = 3;

// ─── Page ────────────────────────────────────────────────────────────────────

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

  // Fetch trips, gamification data, and badges in parallel
  const [tripsWithPhases, progressSummary] = await Promise.all([
    TripService.getUserTripsWithExpeditionData(session.user.id),
    PointsEngine.getProgressSummary(session.user.id),
  ]);

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

  // Build gamification data
  const gamification: GamificationData = {
    totalPoints: progressSummary.totalPoints,
    availablePoints: progressSummary.availablePoints,
    currentRank: progressSummary.currentRank as Rank,
  };

  // Build recent badges DTO (last N earned, with icon from registry)
  const badgeRegistryMap = new Map(
    BADGE_REGISTRY.map((b) => [b.key, b]),
  );

  const recentBadges: BadgeDTO[] = progressSummary.badges
    .slice(0, MAX_RECENT_BADGES)
    .map((b) => {
      const def = badgeRegistryMap.get(b.badgeKey);
      return {
        badgeKey: b.badgeKey,
        earnedAt: b.earnedAt ? b.earnedAt.toISOString() : new Date().toISOString(),
        icon: def?.icon ?? "",
        nameKey: def?.nameKey ?? `gamification.badges.${b.badgeKey}.name`,
      };
    });

  const userName = session.user.name ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: tNav("breadcrumb.home"), href: "/expeditions" },
          { label: tNav("expeditions") },
        ]}
      />
      <div className="mt-6">
        <DashboardV2
          userName={userName}
          gamification={gamification}
          expeditions={expeditions}
          recentBadges={recentBadges}
        />
      </div>
    </div>
  );
}
