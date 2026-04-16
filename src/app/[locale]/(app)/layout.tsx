import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PointsEngine } from "@/lib/engines/points-engine";
import { getPhaseDefinitions } from "@/lib/engines/phase-config";
import { db } from "@/server/db";
import { AuthenticatedNavbarV2 } from "@/components/layout/AuthenticatedNavbarV2";
import { FooterV2 } from "@/components/features/landing/FooterV2";
import { FeedbackWidgetLoader } from "@/components/features/feedback/FeedbackWidgetLoader";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface AppShellLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppShellLayout({ children, params }: AppShellLayoutProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
    return null; // TypeScript: unreachable but satisfies narrowing
  }

  const user = session.user;
  const t = await getTranslations("common");

  // Derive display name: name > email local part > translated fallback
  const displayName = user.name
    ?? user.email?.split("@")[0]
    ?? t("traveler");

  // Fetch gamification data for header badge
  let gamification: {
    totalPoints: number;
    availablePoints: number;
    currentLevel: number;
    phaseName: string;
    rank: "novato" | "desbravador" | "navegador" | "capitao" | "aventureiro" | "lendario";
  } | undefined;
  try {
    const progress = await PointsEngine.getBalance(user.id!);
    const currentLevel = Math.min(
      Math.floor(progress.totalPoints / 100) + 1,
      getPhaseDefinitions().length
    );
    const phaseDef = getPhaseDefinitions()[currentLevel - 1];
    gamification = {
      totalPoints: progress.totalPoints,
      availablePoints: progress.availablePoints,
      currentLevel,
      phaseName: phaseDef?.name ?? `Phase ${currentLevel}`,
      rank: progress.currentRank,
    };
  } catch {
    // Gamification data is non-critical — badge simply won't render
  }

  // Premium flag for StoreIcon — failure is non-critical, defaults to false.
  let isPremium = false;
  try {
    const sub = await db.subscription.findUnique({
      where: { userId: user.id! },
      select: { plan: true, status: true },
    });
    isPremium =
      !!sub &&
      sub.plan !== "FREE" &&
      (sub.status === "ACTIVE" || sub.status === "TRIALING");
  } catch {
    // Non-critical — defaults to false
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <AuthenticatedNavbarV2
        userName={displayName}
        userImage={user.image ?? null}
        userEmail={user.email ?? ""}
        gamification={gamification}
        isPremium={isPremium}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <FooterV2 />
      <FeedbackWidgetLoader />
    </div>
  );
}
