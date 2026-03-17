"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardPhaseProgressBar } from "./DashboardPhaseProgressBar";
import { TripCountdownInline } from "./TripCountdownInline";
import type { ExpeditionDTO, ExpeditionStatus } from "@/types/expedition.types";
import { deriveExpeditionStatus } from "@/types/expedition.types";
import { TOTAL_ACTIVE_PHASES } from "@/lib/engines/phase-navigation.engine";

// ─── Status accent config ────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  ExpeditionStatus,
  { border: string; badgeBg: string; badgeText: string; labelKey: string }
> = {
  active: {
    border: "border-l-blue-500",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600 dark:text-blue-400",
    labelKey: "statusActive",
  },
  completed: {
    border: "border-l-amber-500",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400",
    labelKey: "statusCompleted",
  },
  overdue: {
    border: "border-l-orange-600",
    badgeBg: "bg-orange-600/10",
    badgeText: "text-orange-700 dark:text-orange-400",
    labelKey: "statusOverdue",
  },
  planned: {
    border: "border-l-gray-400",
    badgeBg: "bg-gray-400/10",
    badgeText: "text-gray-500 dark:text-gray-400",
    labelKey: "statusPlanned",
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpeditionCardRedesignedProps {
  expedition: ExpeditionDTO;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpeditionCardRedesigned({ expedition }: ExpeditionCardRedesignedProps) {
  const t = useTranslations("dashboard.expeditions");
  const exp = expedition;

  const status = deriveExpeditionStatus(exp);
  const styles = STATUS_STYLES[status];

  // Determine CTA text and destination
  const ctaLabel = getCTALabel(status, t);
  const ctaHref = getCTAHref(exp, status);

  // Format dates
  const formattedDates = exp.startDate && exp.endDate
    ? `${exp.startDate} \u2013 ${exp.endDate}`
    : null;

  return (
    <Link
      href={ctaHref}
      className={`group flex h-full min-h-[180px] flex-col rounded-xl border border-border border-l-4
        ${styles.border} bg-card p-4 shadow-sm transition-shadow
        hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        motion-safe:active:scale-[0.98] motion-safe:active:transition-transform motion-safe:active:duration-100`}
      aria-label={`${exp.destination} — ${t(styles.labelKey)}`}
      data-testid="expedition-card"
    >
      {/* Header: Emoji + Destination + Status badge */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-2xl" aria-hidden="true">
          {exp.coverEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="line-clamp-2 font-semibold text-foreground"
            data-testid="card-destination"
          >
            {exp.destination}
          </h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles.badgeBg} ${styles.badgeText}`}
          data-testid="status-badge"
        >
          {t(styles.labelKey)}
        </span>
      </div>

      {/* Dates */}
      <div className="mt-2">
        {formattedDates ? (
          <p className="text-xs text-muted-foreground" data-testid="card-dates">
            {formattedDates}
          </p>
        ) : (
          <p
            className="text-xs italic text-muted-foreground"
            data-testid="card-no-dates"
          >
            {t("noDates")}
          </p>
        )}
      </div>

      {/* Countdown (if departure date set) */}
      {exp.startDate && (
        <TripCountdownInline startDate={exp.startDate} endDate={exp.endDate ?? undefined} />
      )}

      {/* Phase progress bar */}
      <div className="mt-auto pt-3">
        <DashboardPhaseProgressBar
          currentPhase={exp.currentPhase}
          completedPhases={exp.completedPhases}
        />
        <p
          className="mt-1 text-xs text-muted-foreground"
          data-testid="card-phase-label"
        >
          {t("phaseLabel", { current: exp.currentPhase, total: TOTAL_ACTIVE_PHASES })}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-3 flex justify-end">
        <span
          className="inline-flex items-center text-sm font-medium text-primary group-hover:underline"
          data-testid="card-cta"
        >
          {ctaLabel}
        </span>
      </div>
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCTALabel(
  status: ExpeditionStatus,
  t: (key: string) => string
): string {
  switch (status) {
    case "completed":
      return t("ctaViewSummary");
    case "planned":
      return t("ctaStart");
    default:
      return t("ctaContinue");
  }
}

function getCTAHref(exp: ExpeditionDTO, status: ExpeditionStatus): string {
  if (status === "completed") {
    return `/expedition/${exp.id}/summary`;
  }
  return `/expedition/${exp.id}`;
}
