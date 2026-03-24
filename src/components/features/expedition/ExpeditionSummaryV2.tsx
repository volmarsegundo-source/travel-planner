"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { AtlasBadge } from "@/components/ui/AtlasBadge";
import { PointsAnimation } from "./PointsAnimation";
import { TripCountdown } from "./TripCountdown";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";
import type { TripReadinessResult } from "@/server/services/trip-readiness.service";
import type { NextStep } from "@/lib/engines/next-steps-engine";
import type { BadgeKey } from "@/types/gamification.types";
import { Link } from "@/i18n/navigation";

// ─── Phase Icons ─────────────────────────────────────────────────────────────

const PHASE_ICONS = ["\uD83E\uDDED", "\uD83D\uDD0D", "\uD83D\uDCCB", "\uD83D\uDE97", "\uD83D\uDDFA\uFE0F", "\uD83D\uDC8E"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpeditionSummaryV2Props {
  tripId: string;
  summary: ExpeditionSummaryData;
  readiness?: TripReadinessResult;
  nextSteps?: NextStep[];
  startDate?: string | null;
  endDate?: string | null;
  celebration?: {
    pointsEarned: number;
    badgeAwarded: string | null;
  } | null;
}

type PhaseStatus = "complete" | "partial" | "not_started";

// ─── Inline Icons ────────────────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpeditionSummaryV2({
  tripId,
  summary,
  readiness,
  nextSteps,
  startDate,
  endDate,
  celebration,
}: ExpeditionSummaryV2Props) {
  const t = useTranslations("expedition.summary");
  const tPhases = useTranslations("gamification.phases");
  const tNextSteps = useTranslations("expedition.nextSteps");
  const router = useRouter();
  const locale = useLocale();

  const [showCelebration, setShowCelebration] = useState(!!celebration);

  useEffect(() => {
    if (!celebration) setShowCelebration(false);
  }, [celebration]);

  if (showCelebration && celebration) {
    return (
      <PointsAnimation
        points={celebration.pointsEarned}
        badge={celebration.badgeAwarded as BadgeKey | null}
        onDismiss={() => setShowCelebration(false)}
      />
    );
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return dateStr; }
  }

  function getPhaseStatus(phaseNum: number): PhaseStatus {
    if (!readiness) {
      const phaseKey = `phase${phaseNum}` as keyof typeof summary;
      return summary[phaseKey] ? "complete" : "not_started";
    }
    const phase = readiness.phases.find((p) => p.phase === phaseNum);
    return phase?.status ?? "not_started";
  }

  function getPhaseUrl(phaseNum: number): string {
    return `/expedition/${tripId}/phase-${phaseNum}`;
  }

  const phaseNames = [
    tPhases("theCalling"), tPhases("theExplorer"), tPhases("thePreparation"),
    tPhases("theLogistics"), tPhases("theDestinationGuide"), tPhases("theItinerary"),
  ];

  const readinessPercent = readiness?.readinessPercent ?? 0;
  const completionPercentage = summary.completionPercentage;
  const pendingItems = summary.pendingItems;
  const pendingRequired = pendingItems.filter((p) => p.severity === "required");
  const pendingRecommended = pendingItems.filter((p) => p.severity === "recommended");

  // Status badge color
  function statusBadgeColor(status: PhaseStatus): "success" | "warning" | "info" {
    if (status === "complete") return "success";
    if (status === "partial") return "warning";
    return "info";
  }

  function statusLabel(status: PhaseStatus): string {
    if (status === "complete") return tPhases("stateCompleted");
    if (status === "partial") return tPhases("stateCurrent");
    return tPhases("stateUpcoming");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="summary-v2">
      {/* Hero */}
      <div className="text-center" data-testid="summary-hero-v2">
        <h1 className="font-atlas-headline text-2xl font-bold text-atlas-on-surface">
          {t("title")}
        </h1>
        {summary.phase1?.destination && (
          <p className="mt-1 text-lg font-atlas-body text-atlas-on-surface-variant">
            {summary.phase1.destination}
          </p>
        )}

        {/* Trip Countdown */}
        <div className="mt-4">
          <TripCountdown
            startDate={startDate ? new Date(startDate) : null}
            endDate={endDate ? new Date(endDate) : null}
          />
        </div>

        {/* Completion */}
        <div className="mt-4" data-testid="completion-indicator-v2">
          <div className="mx-auto max-w-xs">
            <div className="flex items-center justify-between text-sm font-atlas-body text-atlas-on-surface-variant mb-1">
              <span>{t("completion")}</span>
              <span className="font-bold text-atlas-on-surface" data-testid="completion-percentage-v2">
                {completionPercentage}%
              </span>
            </div>
            <div
              className="h-3 w-full rounded-full bg-atlas-surface-container-high overflow-hidden"
              role="progressbar"
              aria-valuenow={completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("completionLabel", { percent: completionPercentage })}
            >
              <div
                className="h-full rounded-full bg-atlas-secondary-container transition-all duration-500 motion-reduce:transition-none"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Readiness */}
        <div className="mt-4" data-testid="readiness-indicator-v2">
          <div className="mx-auto max-w-xs">
            <div className="flex items-center justify-between text-sm font-atlas-body text-atlas-on-surface-variant mb-1">
              <span>{t("readiness")}</span>
              <span className="font-bold text-atlas-on-surface">{readinessPercent}%</span>
            </div>
            <div
              className="h-3 w-full rounded-full bg-atlas-surface-container-high overflow-hidden"
              role="progressbar"
              aria-valuenow={readinessPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("readinessLabel", { percent: readinessPercent })}
            >
              <div
                className="h-full rounded-full bg-atlas-tertiary-fixed-dim transition-all duration-500 motion-reduce:transition-none"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <section className="mt-8" data-testid="pending-items-section-v2">
          <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-3">
            {t("pendingItemsTitle")}
          </h2>

          {pendingRequired.length > 0 && (
            <AtlasCard variant="base" className="mb-3 !border-atlas-warning/30 !bg-atlas-warning-container/10" data-testid="pending-required-v2">
              <p className="text-sm font-bold font-atlas-body text-atlas-warning mb-2">
                {t("pendingRequired")}
              </p>
              <ul className="space-y-1" role="list">
                {pendingRequired.map((item) => (
                  <li key={`${item.phase}-${item.key}`} className="flex items-center gap-2 text-sm font-atlas-body text-atlas-warning">
                    <span aria-hidden="true">!</span>
                    <span>{t("pendingPhaseItem", { phase: item.phase, item: item.key })}</span>
                  </li>
                ))}
              </ul>
            </AtlasCard>
          )}

          {pendingRecommended.length > 0 && (
            <AtlasCard variant="base" className="!border-atlas-info/30 !bg-atlas-info-container/10" data-testid="pending-recommended-v2">
              <p className="text-sm font-bold font-atlas-body text-atlas-info mb-2">
                {t("pendingRecommended")}
              </p>
              <ul className="space-y-1" role="list">
                {pendingRecommended.map((item) => (
                  <li key={`${item.phase}-${item.key}`} className="flex items-center gap-2 text-sm font-atlas-body text-atlas-info">
                    <span aria-hidden="true">~</span>
                    <span>{t("pendingPhaseItem", { phase: item.phase, item: item.key })}</span>
                  </li>
                ))}
              </ul>
            </AtlasCard>
          )}
        </section>
      )}

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && readinessPercent < 100 && (
        <section className="mt-8" data-testid="next-steps-section-v2">
          <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-3">
            {tNextSteps("title")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nextSteps.map((step, i) => (
              <Link key={i} href={step.targetUrl} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring rounded-atlas-lg">
                <AtlasCard variant="interactive" className="flex-row items-center gap-3" data-testid={`next-step-v2-${i}`}>
                  <ArrowRightIcon />
                  <span className="text-sm font-atlas-body font-medium">
                    {tNextSteps(step.labelKey.replace("expedition.nextSteps.", ""), step.labelValues)}
                  </span>
                </AtlasCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Phase Cards */}
      <section className="mt-8">
        <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-4">
          {t("phasesOverview")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2" data-testid="phase-cards-v2">
          {[1, 2, 3, 4, 5, 6].map((phaseNum) => {
            const status = getPhaseStatus(phaseNum);
            const icon = PHASE_ICONS[phaseNum - 1];
            const name = phaseNames[phaseNum - 1];

            return (
              <AtlasCard
                key={phaseNum}
                variant={status === "complete" ? "elevated" : "base"}
                className={status === "not_started" ? "opacity-60" : ""}
                data-testid={`phase-card-v2-${phaseNum}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{icon}</span>
                    <div>
                      <p className="text-sm font-atlas-headline font-bold text-atlas-on-surface">{name}</p>
                      <AtlasBadge variant="status" color={statusBadgeColor(status)} size="sm">
                        {statusLabel(status)}
                      </AtlasBadge>
                    </div>
                  </div>
                  <Link href={getPhaseUrl(phaseNum)}>
                    <AtlasButton variant="ghost" size="sm" data-testid={`edit-phase-v2-${phaseNum}`}>
                      {status === "complete" ? t("editPhase") : status === "partial" ? t("continuePhase") : t("startPhase")}
                    </AtlasButton>
                  </Link>
                </div>

                {status === "not_started" ? (
                  <div className="mt-2 rounded-atlas-lg bg-atlas-surface-container-low px-3 py-2" data-testid={`phase-placeholder-v2-${phaseNum}`}>
                    <p className="text-xs italic font-atlas-body text-atlas-on-surface-variant">
                      {t("phaseNotStarted")}
                    </p>
                  </div>
                ) : (
                  <PhaseDataSummaryV2
                    phaseNum={phaseNum}
                    summary={summary}
                    formatDate={formatDate}
                    t={t}
                  />
                )}
              </AtlasCard>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 flex justify-center">
        <AtlasButton size="lg" onClick={() => router.push("/expeditions")}>
          {t("viewDashboard")}
        </AtlasButton>
      </div>
    </div>
  );
}

// ─── Phase data sub-component ────────────────────────────────────────────────

function PhaseDataSummaryV2({
  phaseNum,
  summary,
  formatDate,
  t,
}: {
  phaseNum: number;
  summary: ExpeditionSummaryData;
  formatDate: (d: string | null) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const baseClasses = "mt-2 text-xs font-atlas-body text-atlas-on-surface-variant";

  switch (phaseNum) {
    case 1:
      return summary.phase1 ? (
        <div className={`${baseClasses} space-y-0.5`}>
          <p>{summary.phase1.destination}</p>
          <p>{formatDate(summary.phase1.startDate)} - {formatDate(summary.phase1.endDate)}</p>
        </div>
      ) : null;
    case 2:
      return summary.phase2 ? (
        <div className={baseClasses}>
          <p>{summary.phase2.travelerType} · {summary.phase2.accommodationStyle}</p>
        </div>
      ) : null;
    case 3:
      return summary.phase3 ? (
        <div className={baseClasses}>
          <p>{t("checklistProgress", { done: summary.phase3.done, total: summary.phase3.total })}</p>
        </div>
      ) : null;
    case 4:
      return summary.phase4 ? (
        <div className={baseClasses}>
          <p>
            {t("transportSegments", { count: summary.phase4.transportSegments.length })}
            {" \u00B7 "}
            {t("accommodations", { count: summary.phase4.accommodations.length })}
          </p>
        </div>
      ) : null;
    case 5:
      return summary.phase5 ? (
        <div className={baseClasses}>
          <p>{t("guideGenerated", { date: formatDate(summary.phase5.generatedAt) })}</p>
        </div>
      ) : null;
    case 6:
      return summary.phase6 ? (
        <div className={baseClasses}>
          <p>{t("itineraryDays", { count: summary.phase6.dayCount })}</p>
        </div>
      ) : null;
    default:
      return null;
  }
}
