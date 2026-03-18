"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardPhaseProgressBar } from "./DashboardPhaseProgressBar";
import { TripCountdownInline } from "./TripCountdownInline";
import type { ExpeditionDTO, ExpeditionStatus } from "@/types/expedition.types";
import { deriveExpeditionStatus } from "@/types/expedition.types";
import { TOTAL_ACTIVE_PHASES } from "@/lib/engines/phase-navigation.engine";

// ─── Status accent config (SPEC-UX-026 4-state colors) ─────────────────────

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
    border: "border-l-green-500",
    badgeBg: "bg-green-500/10",
    badgeText: "text-green-600 dark:text-green-400",
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

  // Quick-access links: conditionally visible
  const quickAccessLinks = buildQuickAccessLinks(exp, t);
  const hasQuickAccess = quickAccessLinks.length > 0;

  return (
    <div
      className={`group relative flex h-full min-h-[180px] flex-col rounded-xl border border-border border-l-4
        ${styles.border} bg-card shadow-sm transition-shadow
        hover:shadow-md`}
      data-testid="expedition-card"
    >
      {/* Card link overlay — covers entire card */}
      <Link
        href={ctaHref}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`${exp.destination} \u2014 ${t(styles.labelKey)}`}
        tabIndex={0}
      >
        <span className="sr-only">{ctaLabel}</span>
      </Link>

      {/* Card content — sits above overlay */}
      <div className="relative z-10 flex flex-1 flex-col p-4 pointer-events-none">
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
      </div>

      {/* Quick-access links row (SPEC-UX-025) — above overlay z-index */}
      {hasQuickAccess && (
        <nav
          className="relative z-20 border-t border-border/40 px-4 py-2"
          aria-label={t("quickAccessLabel", { destination: exp.destination })}
          data-testid="quick-access-row"
        >
          <div className="flex flex-wrap gap-3">
            {quickAccessLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="pointer-events-auto inline-flex min-h-[32px] items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 md:min-h-[32px] min-h-[44px]"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                data-testid={`quick-access-${link.key}`}
              >
                <span aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
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

interface QuickAccessLink {
  key: string;
  label: string;
  href: string;
  icon: string;
}

function buildQuickAccessLinks(
  exp: ExpeditionDTO,
  t: (key: string) => string
): QuickAccessLink[] {
  const links: QuickAccessLink[] = [];

  if (exp.hasChecklist) {
    links.push({
      key: "checklist",
      label: t("quickAccessChecklist"),
      href: `/expedition/${exp.id}/phase-3`,
      icon: "\u2611\uFE0F",
    });
  }

  if (exp.hasGuide) {
    links.push({
      key: "guide",
      label: t("quickAccessGuide"),
      href: `/expedition/${exp.id}/phase-5`,
      icon: "\uD83E\uDDED",
    });
  }

  if (exp.hasItineraryPlan) {
    links.push({
      key: "itinerary",
      label: t("quickAccessItinerary"),
      href: `/expedition/${exp.id}/phase-6`,
      icon: "\uD83D\uDDFA\uFE0F",
    });
  }

  // Report link: only when phases 3+5+6 all have content
  if (exp.hasChecklist && exp.hasGuide && exp.hasItineraryPlan) {
    links.push({
      key: "report",
      label: t("quickAccessReport"),
      href: `/expedition/${exp.id}/report`,
      icon: "\uD83D\uDCCB",
    });
  }

  return links;
}
