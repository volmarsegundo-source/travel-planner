import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PointsEngine } from "@/lib/engines/points-engine";
import { ExplorerProfile } from "@/components/features/profile/ExplorerProfile";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import type { Rank, BadgeKey } from "@/types/gamification.types";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");

  const [progress, history] = await Promise.all([
    PointsEngine.getProgressSummary(session.user.id),
    PointsEngine.getTransactionHistory(session.user.id, 1, 10),
  ]);

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.home"), href: "/dashboard" },
            { label: tNav("breadcrumb.profile") },
          ]}
        />
      </div>
      <ExplorerProfile
        rank={progress.currentRank as Rank}
        totalPoints={progress.totalPoints}
        availablePoints={progress.availablePoints}
        streakDays={progress.streakDays}
        earnedBadges={progress.badges.map((b) => b.badgeKey as BadgeKey)}
        transactions={history.transactions}
      />
    </>
  );
}
