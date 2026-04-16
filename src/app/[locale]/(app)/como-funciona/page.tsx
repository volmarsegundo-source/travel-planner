import { getTranslations } from "next-intl/server";
import { getPhaseDefinitions } from "@/lib/engines/phase-config";
import {
  AI_COSTS,
  WELCOME_BONUS,
  EARNING_AMOUNTS,
  PROFILE_FIELD_POINTS,
} from "@/types/gamification.types";
import type { Rank } from "@/types/gamification.types";

const RANK_THRESHOLDS: Array<{ rank: Rank; points: number }> = [
  { rank: "novato", points: 0 },
  { rank: "desbravador", points: 250 },
  { rank: "navegador", points: 500 },
  { rank: "capitao", points: 1000 },
  { rank: "aventureiro", points: 2000 },
  { rank: "lendario", points: 5000 },
];

const RANK_EMOJIS: Record<Rank, string> = {
  novato: "\uD83E\uDDF3",
  desbravador: "\uD83E\uDDED",
  navegador: "\uD83D\uDDFA\uFE0F",
  capitao: "\uD83D\uDCCD",
  aventureiro: "\u26F0\uFE0F",
  lendario: "\uD83C\uDF1F",
};

export default async function ComoFuncionaPage() {
  const t = await getTranslations("gamification.howItWorks");
  const tRanks = await getTranslations("gamification.ranks");

  const firstProfileFieldPoints = Object.values(PROFILE_FIELD_POINTS)[0] ?? 25;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground" data-testid="how-it-works-title">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("pageDescription")}
      </p>

      {/* Section 1: What are Atlas Points? */}
      <section className="mt-8" data-testid="section-what-are-pa">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("section1Title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {t("section1Description")}
          </p>
        </div>
      </section>

      {/* Section 2: How to Earn PA */}
      <section className="mt-6" data-testid="section-earn">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("section2Title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("section2Description")}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium text-foreground">
                    {t("earnTable.activity")}
                  </th>
                  <th className="py-2 text-right font-medium text-foreground">
                    {t("earnTable.points")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("earnTable.welcomeBonus")}</td>
                  <td className="py-2 text-right font-medium text-atlas-gold">+{WELCOME_BONUS}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("earnTable.tutorial")}</td>
                  <td className="py-2 text-right font-medium text-atlas-gold">+100</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("earnTable.dailyLogin")}</td>
                  <td className="py-2 text-right font-medium text-atlas-gold">+{EARNING_AMOUNTS.daily_login}</td>
                </tr>
                {getPhaseDefinitions().filter((p) => p.pointsReward > 0).map((phase) => (
                  <tr key={phase.phaseNumber} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground">
                      {t(`earnTable.phase${phase.phaseNumber}`)}
                    </td>
                    <td className="py-2 text-right font-medium text-atlas-gold">
                      +{phase.pointsReward}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("earnTable.profileField")}</td>
                  <td className="py-2 text-right font-medium text-atlas-gold">+{firstProfileFieldPoints}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("earnTable.checklistItem")}</td>
                  <td className="py-2 text-right font-medium text-atlas-gold">+{EARNING_AMOUNTS.checklist}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: How to Spend PA */}
      <section className="mt-6" data-testid="section-spend">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("section3Title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("section3Description")}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium text-foreground">
                    {t("spendTable.feature")}
                  </th>
                  <th className="py-2 text-right font-medium text-foreground">
                    {t("spendTable.cost")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("spendTable.checklist")}</td>
                  <td className="py-2 text-right font-medium text-destructive">-{AI_COSTS.ai_route}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("spendTable.guide")}</td>
                  <td className="py-2 text-right font-medium text-destructive">-{AI_COSTS.ai_accommodation}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{t("spendTable.itinerary")}</td>
                  <td className="py-2 text-right font-medium text-destructive">-{AI_COSTS.ai_itinerary}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: Levels */}
      <section className="mt-6" data-testid="section-levels">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("section4Title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("section4Description")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {RANK_THRESHOLDS.map(({ rank, points }) => (
              <div
                key={rank}
                className="flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-center"
              >
                <span className="text-2xl" aria-hidden="true">
                  {RANK_EMOJIS[rank]}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {tRanks(rank)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {points > 0 ? `${points}+ PA` : "0 PA"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: FAQ */}
      <section className="mt-6 mb-8" data-testid="section-faq">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("section5Title")}
          </h2>
          <div className="mt-4 space-y-4">
            {(["q1", "q2", "q3", "q4"] as const).map((qKey) => (
              <details key={qKey} className="group">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground hover:text-atlas-gold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <span className="text-atlas-gold transition-transform group-open:rotate-90" aria-hidden="true">
                      {"\u25B6"}
                    </span>
                    {t(`faq.${qKey}`)}
                  </span>
                </summary>
                <p className="mt-2 pl-6 text-sm text-muted-foreground">
                  {t(`faq.a${qKey.slice(1)}`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
