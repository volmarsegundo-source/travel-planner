"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { PointsAnimation } from "./PointsAnimation";
import { TripCountdown } from "./TripCountdown";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";
import type { TripReadinessResult } from "@/server/services/trip-readiness.service";
import type { NextStep } from "@/lib/engines/next-steps-engine";
import type { BadgeKey } from "@/types/gamification.types";
import { Link } from "@/i18n/navigation";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

// ─── Phase Icons ─────────────────────────────────────────────────────────────

// Original order: compass, magnifier, clipboard, car, map, gem
// (Inspiration, Profile, Checklist, Logistics, Guide, Itinerary)
const PHASE_ICONS_ORIGINAL = ["\uD83E\uDDED", "\uD83D\uDD0D", "\uD83D\uDCCB", "\uD83D\uDE97", "\uD83D\uDDFA\uFE0F", "\uD83D\uDC8E"];

// New order (Sprint 44): compass, magnifier, book, map, car, clipboard
// (Inspiration, Profile, Guide, Itinerary, Logistics, Checklist) — SPEC-UX §7.1
const PHASE_ICONS_REORDERED = ["\uD83E\uDDED", "\uD83D\uDD0D", "\uD83D\uDCDA", "\uD83D\uDDFA\uFE0F", "\uD83D\uDE97", "\uD83D\uDCCB"];

// Flag-aware accessor — resolves at render time so flag changes take effect
// without a module reload.
function getPhaseIcons(): readonly string[] {
  return isPhaseReorderEnabled() ? PHASE_ICONS_REORDERED : PHASE_ICONS_ORIGINAL;
}


// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpeditionSummaryProps {
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpeditionSummary({
  tripId,
  summary,
  readiness,
  nextSteps,
  startDate,
  endDate,
  celebration,
}: ExpeditionSummaryProps) {
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
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function getPhaseStatus(phaseNum: number): PhaseStatus {
    if (!readiness) {
      // Fallback: derive from summary data
      const phaseKey = `phase${phaseNum}` as keyof typeof summary;
      return summary[phaseKey] ? "complete" : "not_started";
    }
    const phase = readiness.phases.find((p) => p.phase === phaseNum);
    return phase?.status ?? "not_started";
  }

  function getPhaseUrlLocal(phaseNum: number): string {
    return `/expedition/${tripId}/phase-${phaseNum}`;
  }

  // Phase names in positional order (index 0 = phase 1).
  // Flag OFF: Inspiration, Profile, Checklist, Logistics, Guide, Itinerary
  // Flag ON:  Inspiration, Profile, Guide, Itinerary, Logistics, Checklist
  // SPEC-UX-REORDER-PHASES §7
  const phaseNames = isPhaseReorderEnabled()
    ? [
        tPhases("theCalling"),
        tPhases("theExplorer"),
        tPhases("theDestinationGuide"),
        tPhases("theItinerary"),
        tPhases("theLogistics"),
        tPhases("thePreparation"),
      ]
    : [
        tPhases("theCalling"),
        tPhases("theExplorer"),
        tPhases("thePreparation"),
        tPhases("theLogistics"),
        tPhases("theDestinationGuide"),
        tPhases("theItinerary"),
      ];

  const readinessPercent = readiness?.readinessPercent ?? 0;
  const completionPercentage = summary.completionPercentage;
  const pendingItems = summary.pendingItems;
  const pendingRequired = pendingItems.filter((p) => p.severity === "required");
  const pendingRecommended = pendingItems.filter((p) => p.severity === "recommended");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero: Title + Countdown + Completion */}
      <div className="text-center" data-testid="summary-hero">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {summary.phase1?.destination && (
          <p className="mt-1 text-lg text-muted-foreground">
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

        {/* Completion Percentage (TASK-S33-010) */}
        <div className="mt-4" data-testid="completion-indicator">
          <div className="mx-auto max-w-xs">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>{t("completion")}</span>
              <span className="font-bold text-foreground" data-testid="completion-percentage">{completionPercentage}%</span>
            </div>
            <div
              className="h-3 w-full rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("completionLabel", { percent: completionPercentage })}
            >
              <div
                className="h-full rounded-full bg-atlas-teal transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Readiness Bar */}
        <div className="mt-4" data-testid="readiness-indicator">
          <div className="mx-auto max-w-xs">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>{t("readiness")}</span>
              <span className="font-bold text-foreground">{readinessPercent}%</span>
            </div>
            <div
              className="h-3 w-full rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={readinessPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("readinessLabel", { percent: readinessPercent })}
            >
              <div
                className="h-full rounded-full bg-atlas-teal transition-all duration-500"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Items (TASK-S33-010) */}
      {pendingItems.length > 0 && (
        <section className="mt-8" data-testid="pending-items-section">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {t("pendingItemsTitle")}
          </h2>

          {pendingRequired.length > 0 && (
            <div
              className="mb-3 rounded-lg border border-atlas-warning bg-atlas-warning-container p-4 dark:border-atlas-warning/40 dark:bg-atlas-warning-container/10"
              data-testid="pending-required"
            >
              <p className="text-sm font-medium text-atlas-warning dark:text-atlas-warning mb-2">
                {t("pendingRequired")}
              </p>
              <ul className="space-y-1" role="list">
                {pendingRequired.map((item) => (
                  <li
                    key={`${item.phase}-${item.key}`}
                    className="flex items-center gap-2 text-sm text-atlas-warning dark:text-atlas-warning"
                  >
                    <span aria-hidden="true">!</span>
                    <span>{t("pendingPhaseItem", { phase: item.phase, item: item.key })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingRecommended.length > 0 && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20"
              data-testid="pending-recommended"
            >
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                {t("pendingRecommended")}
              </p>
              <ul className="space-y-1" role="list">
                {pendingRecommended.map((item) => (
                  <li
                    key={`${item.phase}-${item.key}`}
                    className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"
                  >
                    <span aria-hidden="true">~</span>
                    <span>{t("pendingPhaseItem", { phase: item.phase, item: item.key })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && readinessPercent < 100 && (
        <section className="mt-8" data-testid="next-steps-section">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {tNextSteps("title")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nextSteps.map((step, i) => (
              <Link
                key={i}
                href={step.targetUrl}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-atlas-teal/50 hover:bg-accent"
                data-testid={`next-step-${i}`}
              >
                <span className="text-xl" aria-hidden="true">{"\u2192"}</span>
                <span className="text-sm font-medium">
                  {tNextSteps(step.labelKey.replace("expedition.nextSteps.", ""), step.labelValues)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Phase Cards */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("phasesOverview")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2" data-testid="phase-cards">
          {[1, 2, 3, 4, 5, 6].map((phaseNum) => {
            const status = getPhaseStatus(phaseNum);
            const icon = getPhaseIcons()[phaseNum - 1];
            const name = phaseNames[phaseNum - 1];

            return (
              <div
                key={phaseNum}
                className={`rounded-lg border bg-card p-4 ${
                  status === "complete"
                    ? "border-atlas-teal/40"
                    : status === "not_started"
                      ? "border-border/50 bg-muted/30"
                      : ""
                }`}
                data-testid={`phase-card-${phaseNum}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <StatusBadge status={status} />
                    </div>
                  </div>
                  <Link href={getPhaseUrlLocal(phaseNum)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`edit-phase-${phaseNum}`}
                    >
                      {status === "complete"
                        ? t("editPhase")
                        : status === "partial"
                          ? t("continuePhase")
                          : t("startPhase")}
                    </Button>
                  </Link>
                </div>

                {/* Phase data summary or placeholder */}
                {status === "not_started" ? (
                  <div
                    className="mt-2 rounded bg-muted/50 px-3 py-2"
                    data-testid={`phase-placeholder-${phaseNum}`}
                  >
                    <p className="text-xs italic text-muted-foreground">
                      {t("phaseNotStarted")}
                    </p>
                  </div>
                ) : (
                  <PhaseDataSummary
                    phaseNum={phaseNum}
                    summary={summary}
                    formatDate={formatDate}
                    t={t}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 flex justify-center">
        <Button
          size="lg"
          onClick={() => router.push("/expeditions")}
        >
          {t("viewDashboard")}
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PhaseStatus }) {
  const t = useTranslations("gamification.phases");
  const classes = {
    complete: "bg-atlas-teal/10 text-atlas-teal",
    partial: "bg-atlas-gold/10 text-atlas-gold",
    not_started: "bg-muted text-muted-foreground",
  };

  const labels = {
    complete: t("stateCompleted"),
    partial: t("stateCurrent"),
    not_started: t("stateUpcoming"),
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}
      data-testid="status-badge"
    >
      {labels[status]}
    </span>
  );
}

function PhaseDataSummary({
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
  switch (phaseNum) {
    case 1:
      return summary.phase1 ? (
        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
          <p>{summary.phase1.destination}</p>
          <p>
            {formatDate(summary.phase1.startDate)} - {formatDate(summary.phase1.endDate)}
          </p>
        </div>
      ) : null;
    case 2:
      return summary.phase2 ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>{summary.phase2.travelerType} · {summary.phase2.accommodationStyle}</p>
        </div>
      ) : null;
    case 3:
      return summary.phase3 ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>{t("checklistProgress", { done: summary.phase3.done, total: summary.phase3.total })}</p>
        </div>
      ) : null;
    case 4:
      return summary.phase4 ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>
            {t("transportSegments", { count: summary.phase4.transportSegments.length })}
            {" \u00B7 "}
            {t("accommodations", { count: summary.phase4.accommodations.length })}
          </p>
        </div>
      ) : null;
    case 5:
      return summary.phase5 ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>{t("guideGenerated", { date: formatDate(summary.phase5.generatedAt) })}</p>
        </div>
      ) : null;
    case 6:
      return summary.phase6 ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>{t("itineraryDays", { count: summary.phase6.dayCount })}</p>
        </div>
      ) : null;
    default:
      return null;
  }
}
