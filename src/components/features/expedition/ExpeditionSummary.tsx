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

// ─── Phase Icons ─────────────────────────────────────────────────────────────

const PHASE_ICONS = ["🧭", "🔍", "📋", "🚗", "🗺️", "💎"];

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

  function getPhaseUrl(phaseNum: number): string {
    if (phaseNum === 1) return `/expedition/${tripId}`;
    return `/expedition/${tripId}/phase-${phaseNum}`;
  }

  const phaseNames = [
    tPhases("theCalling"),
    tPhases("theExplorer"),
    tPhases("thePreparation"),
    tPhases("theLogistics"),
    tPhases("theDayMap"),
    tPhases("theTreasure"),
  ];

  const readinessPercent = readiness?.readinessPercent ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero: Title + Countdown + Readiness */}
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
                <span className="text-xl" aria-hidden="true">→</span>
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
            const icon = PHASE_ICONS[phaseNum - 1];
            const name = phaseNames[phaseNum - 1];

            return (
              <div
                key={phaseNum}
                className={`rounded-lg border bg-card p-4 ${
                  status === "complete" ? "border-atlas-teal/40" : ""
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
                  <Link href={getPhaseUrl(phaseNum)}>
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

                {/* Phase data summary */}
                <PhaseDataSummary
                  phaseNum={phaseNum}
                  summary={summary}
                  formatDate={formatDate}
                  t={t}
                />
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
            {" · "}
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
