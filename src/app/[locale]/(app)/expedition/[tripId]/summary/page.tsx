import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ExpeditionSummaryService } from "@/server/services/expedition-summary.service";
import { TripReadinessService } from "@/server/services/trip-readiness.service";
import { ExpeditionSummaryV2 } from "@/components/features/expedition/ExpeditionSummaryV2";
import { PointsEngine } from "@/lib/engines/points-engine";
import { getNextRankProgress } from "@/lib/gamification/rank-calculator";

/** Ensure summary always reads fresh data (no static cache). */
export const dynamic = "force-dynamic";

interface SummaryPageProps {
  params: Promise<{ locale: string; tripId: string }>;
}

/** Minimum phase required to access the summary report. */
const MIN_PHASE_FOR_SUMMARY = 2;

export default async function SummaryPage({ params }: SummaryPageProps) {
  const { locale, tripId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  // Phase access check: allow from Phase 2 onward
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: { currentPhase: true },
  });

  if (!trip || trip.currentPhase < MIN_PHASE_FOR_SUMMARY) {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  let summary;
  let readiness;
  try {
    [summary, readiness] = await Promise.all([
      ExpeditionSummaryService.getExpeditionSummary(tripId, session.user.id),
      TripReadinessService.calculateTripReadiness(tripId, session.user.id),
    ]);
  } catch {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  // Extract trip dates for countdown
  const startDate = summary.phase1?.startDate ?? null;
  const endDate = summary.phase1?.endDate ?? null;

  // Fetch gamification data
  const tGamification = await getTranslations("gamification.ranks");
  let gamification: {
    totalPA: number;
    rank: string;
    rankLabel: string;
    badgesEarned: number;
    phasesCompleted: number;
    pointsToNextRank: number;
    nextRankLabel: string;
    progressPercent: number;
  } | null = null;

  try {
    const [progress, badges] = await Promise.all([
      PointsEngine.getBalance(session.user.id),
      db.userBadge.count({ where: { userId: session.user.id } }),
    ]);
    const rankInfo = getNextRankProgress(progress.totalPoints);
    const completedPhases = readiness.phases.filter((p) => p.status === "complete").length;

    // Calculate progress percent to next rank
    const currentThreshold = rankInfo.pointsToNext !== null
      ? progress.totalPoints
      : progress.totalPoints;
    const nextThreshold = rankInfo.pointsToNext !== null
      ? progress.totalPoints + rankInfo.pointsToNext
      : progress.totalPoints;
    const progressPercent = nextThreshold > 0
      ? Math.min(100, Math.round((currentThreshold / nextThreshold) * 100))
      : 100;

    gamification = {
      totalPA: progress.totalPoints,
      rank: rankInfo.currentRank,
      rankLabel: tGamification(rankInfo.currentRank),
      badgesEarned: badges,
      phasesCompleted: completedPhases,
      pointsToNextRank: rankInfo.pointsToNext ?? 0,
      nextRankLabel: rankInfo.nextRank ? tGamification(rankInfo.nextRank) : "",
      progressPercent,
    };
  } catch {
    // Gamification data is non-critical
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/expeditions" },
            { label: tNav("breadcrumb.expedition") },
          ]}
        />
      </div>
      <ExpeditionSummaryV2
        tripId={tripId}
        summary={summary}
        readiness={readiness}
        startDate={startDate}
        endDate={endDate}
        gamification={gamification}
      />
    </>
  );
}
