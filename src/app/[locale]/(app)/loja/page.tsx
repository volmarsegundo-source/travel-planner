import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { PointsEngine } from "@/lib/engines/points-engine";
import { LojaClient, type LojaTab } from "./LojaClient";

export const dynamic = "force-dynamic";

interface LojaPageProps {
  searchParams: Promise<{ tab?: string; status?: string }>;
}

function resolveTab(raw: string | undefined, isPremium: boolean): LojaTab {
  if (raw === "packages" || raw === "premium" || raw === "meu-plano") {
    return raw;
  }
  return isPremium ? "meu-plano" : "packages";
}

export default async function LojaPage({ searchParams }: LojaPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const sp = await searchParams;
  const t = await getTranslations("loja");

  const userId = session.user.id;

  // Fetch subscription + PA balance in parallel.
  const [sub, balance] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    PointsEngine.getBalance(userId).catch(() => ({
      totalPoints: 0,
      availablePoints: 0,
      currentRank: "novato" as const,
    })),
  ]);

  const isPremium =
    !!sub && sub.plan !== "FREE" && (sub.status === "ACTIVE" || sub.status === "TRIALING");

  const initialTab = resolveTab(sp.tab, isPremium);
  const initialStatus = sp.status ?? null;

  const subscriptionView = sub
    ? {
        plan: sub.plan as "FREE" | "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL",
        status: sub.status as "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED",
        trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
        currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
        currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        isPremium,
      }
    : {
        plan: "FREE" as const,
        status: "ACTIVE" as const,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isPremium: false,
      };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-atlas-headline text-3xl font-bold text-atlas-primary">
          {t("title")}
        </h1>
        <p className="mt-2 font-atlas-body text-base text-atlas-on-surface-variant">
          {t("subtitle")}
        </p>
      </header>

      <LojaClient
        initialTab={initialTab}
        initialStatus={initialStatus}
        paBalance={balance.availablePoints}
        subscription={subscriptionView}
      />
    </main>
  );
}
