import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PointsEngine } from "@/lib/engines/points-engine";
import { ExplorerProfile } from "@/components/features/profile/ExplorerProfile";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { db } from "@/server/db";
import { decrypt } from "@/lib/crypto";
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

  let progress: Awaited<ReturnType<typeof PointsEngine.getProgressSummary>> = {
    totalPoints: 0,
    availablePoints: 0,
    currentRank: "traveler" as Rank,
    streakDays: 0,
    lastLoginDate: null,
    badges: [],
  };
  let history: Awaited<ReturnType<typeof PointsEngine.getTransactionHistory>> = {
    transactions: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  };
  let userProfile: Awaited<ReturnType<typeof db.userProfile.findUnique>> = null;

  try {
    [progress, history, userProfile] = await Promise.all([
      PointsEngine.getProgressSummary(session.user.id),
      PointsEngine.getTransactionHistory(session.user.id, 1, 10),
      db.userProfile.findUnique({
        where: { userId: session.user.id },
      }),
    ]);
  } catch {
    // Gracefully degrade — render page with defaults
  }

  // Decrypt sensitive fields safely
  let passportNumber: string | null = null;
  let nationalId: string | null = null;
  try {
    if (userProfile?.passportNumberEnc) passportNumber = decrypt(userProfile.passportNumberEnc);
    if (userProfile?.nationalIdEnc) nationalId = decrypt(userProfile.nationalIdEnc);
  } catch {
    if (userProfile?.passportNumberEnc) passportNumber = "••••••••";
    if (userProfile?.nationalIdEnc) nationalId = "••••••••";
  }

  const profileData = {
    birthDate: userProfile?.birthDate?.toISOString().split("T")[0] ?? null,
    phone: userProfile?.phone ?? null,
    country: userProfile?.country ?? null,
    city: userProfile?.city ?? null,
    address: userProfile?.address ?? null,
    passportNumber,
    passportExpiry: userProfile?.passportExpiry?.toISOString().split("T")[0] ?? null,
    nationalId,
    bio: userProfile?.bio ?? null,
    dietaryRestrictions: userProfile?.dietaryRestrictions ?? null,
    accessibility: userProfile?.accessibility ?? null,
    completionScore: userProfile?.completionScore ?? 0,
  };

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
        earnedBadges={progress.badges.map((b: (typeof progress.badges)[number]) => b.badgeKey as BadgeKey)}
        transactions={history.transactions}
        profile={profileData}
      />
    </>
  );
}
