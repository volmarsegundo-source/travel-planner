import { getTranslations } from "next-intl/server";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { db } from "@/server/db";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsSnapshot {
  totalUsers: number;
  totalExpeditions: number;
  totalFeedback: number;
  aiTotalCalls: number;
  aiTotalCostUsd: number;
  aiByPhase: Record<string, number>;
}

// ─── Data loader (server-side) ──────────────────────────────────────────────

async function loadSnapshot(): Promise<AnalyticsSnapshot> {
  const [
    totalUsers,
    totalExpeditions,
    totalFeedback,
    aiTotalCalls,
    aiCostAgg,
    aiByPhaseRaw,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.trip.count({ where: { deletedAt: null } }),
    db.betaFeedback.count(),
    db.aiInteractionLog.count(),
    db.aiInteractionLog.aggregate({ _sum: { estimatedCostUsd: true } }),
    db.aiInteractionLog.groupBy({
      by: ["phase"],
      _count: { phase: true },
    }),
  ]);

  const aiByPhase: Record<string, number> = {};
  for (const row of aiByPhaseRaw) {
    aiByPhase[row.phase] = row._count.phase;
  }

  return {
    totalUsers,
    totalExpeditions,
    totalFeedback,
    aiTotalCalls,
    aiTotalCostUsd: Number(aiCostAgg._sum.estimatedCostUsd ?? 0),
    aiByPhase,
  };
}

// ─── Components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <AtlasCard>
      <div className="p-6">
        <p className="text-sm font-atlas-body text-atlas-on-surface-variant mb-2">
          {label}
        </p>
        <p className="text-3xl font-bold font-atlas-headline text-atlas-on-surface">
          {value}
        </p>
      </div>
    </AtlasCard>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  const t = await getTranslations("admin.adminAnalytics");

  let snapshot: AnalyticsSnapshot | null = null;
  try {
    snapshot = await loadSnapshot();
  } catch {
    snapshot = null;
  }

  const fmt = new Intl.NumberFormat("en-US");
  const fmtUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-atlas-on-surface-variant">{t("subtitle")}</p>
      </div>

      {snapshot && (
        <>
          <section>
            <h3 className="text-lg font-bold mb-3">{t("metricsTitle")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label={t("totalUsers")}
                value={fmt.format(snapshot.totalUsers)}
              />
              <StatCard
                label={t("totalExpeditions")}
                value={fmt.format(snapshot.totalExpeditions)}
              />
              <StatCard
                label={t("totalFeedback")}
                value={fmt.format(snapshot.totalFeedback)}
              />
              <StatCard
                label={t("aiTotalCalls")}
                value={fmt.format(snapshot.aiTotalCalls)}
              />
              <StatCard
                label={t("aiTotalCost")}
                value={fmtUsd.format(snapshot.aiTotalCostUsd)}
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3">{t("aiByPhase")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label={t("phasePlan")}
                value={fmt.format(snapshot.aiByPhase.plan ?? 0)}
              />
              <StatCard
                label={t("phaseGuide")}
                value={fmt.format(snapshot.aiByPhase.guide ?? 0)}
              />
              <StatCard
                label={t("phaseChecklist")}
                value={fmt.format(snapshot.aiByPhase.checklist ?? 0)}
              />
            </div>
          </section>
        </>
      )}

      <AtlasCard>
        <div className="p-6 text-center">
          <h3 className="text-lg font-bold mb-2">{t("vercelLink")}</h3>
          <p className="text-atlas-on-surface-variant mb-4">
            {t("vercelDescription")}
          </p>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-atlas-primary text-atlas-on-primary font-bold text-sm hover:opacity-90 transition-opacity motion-reduce:transition-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
          >
            {t("vercelLink")} →
          </a>
        </div>
      </AtlasCard>
    </div>
  );
}
