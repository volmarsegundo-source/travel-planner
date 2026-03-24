"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { AtlasBadge } from "@/components/ui/AtlasBadge";
import { AtlasChip } from "@/components/ui/AtlasChip";
import { AtlasPhaseProgress } from "@/components/ui/AtlasPhaseProgress";
import { filterAndSortExpeditions } from "@/lib/expedition-filters";
import type {
  ExpeditionDTO,
  ExpeditionStatusFilter,
  ExpeditionSortField,
  ExpeditionStatus,
} from "@/types/expedition.types";
import { deriveExpeditionStatus } from "@/types/expedition.types";
import type { PhaseSegment } from "@/components/ui/AtlasPhaseProgress";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ACTIVE_EXPEDITIONS = 20;
const TOTAL_PHASES = 6;

const FILTER_OPTIONS: ExpeditionStatusFilter[] = ["all", "active", "completed"];
const SORT_OPTIONS: ExpeditionSortField[] = ["newest", "departure", "destination"];

// ─── Inline Icons ────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      className="size-12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

// ─── Status badge color mapping ──────────────────────────────────────────────

const STATUS_BADGE_MAP: Record<
  ExpeditionStatus,
  { color: "success" | "warning" | "error" | "info"; labelKey: string }
> = {
  active: { color: "info", labelKey: "statusActive" },
  completed: { color: "success", labelKey: "statusCompleted" },
  overdue: { color: "warning", labelKey: "statusOverdue" },
  planned: { color: "info", labelKey: "statusPlanned" },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardV2Props {
  expeditions: ExpeditionDTO[];
  isLoading?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardV2({
  expeditions,
  isLoading = false,
}: DashboardV2Props) {
  const t = useTranslations("dashboard.expeditions");
  const tPhases = useTranslations("gamification.phases");

  const [activeFilter, setActiveFilter] = useState<ExpeditionStatusFilter>("all");
  const [activeSort, setActiveSort] = useState<ExpeditionSortField>("newest");

  // Count expeditions by filter category
  const filterCounts = useMemo(() => {
    const counts = { all: expeditions.length, active: 0, completed: 0 };
    for (const exp of expeditions) {
      const status = deriveExpeditionStatus(exp);
      if (status === "completed") {
        counts.completed++;
      } else {
        counts.active++;
      }
    }
    return counts;
  }, [expeditions]);

  const filteredExpeditions = useMemo(
    () => filterAndSortExpeditions(expeditions, activeFilter, activeSort),
    [expeditions, activeFilter, activeSort],
  );

  const activeExpeditionCount = filterCounts.active;
  const isAtLimit = activeExpeditionCount >= MAX_ACTIVE_EXPEDITIONS;

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-v2-loading">
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label={t("gridLabel")}
        >
          {[1, 2, 3].map((i) => (
            <AtlasCard key={i} loading />
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────────────

  if (expeditions.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-6 py-16 text-center"
        data-testid="dashboard-v2-empty"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-atlas-secondary-container/20">
          <CompassIcon />
        </div>
        <div className="space-y-2">
          <h2 className="font-atlas-headline text-xl font-bold text-atlas-on-surface">
            {t("emptyTitle")}
          </h2>
          <p className="max-w-sm font-atlas-body text-atlas-on-surface-variant">
            {t("emptySubtitle")}
          </p>
        </div>
        <Link href="/expedition/new">
          <AtlasButton size="lg" leftIcon={<PlusIcon />}>
            {t("newExpedition")}
          </AtlasButton>
        </Link>
      </div>
    );
  }

  // ─── Filter/Sort helpers ───────────────────────────────────────────────────

  function getFilterLabel(filter: ExpeditionStatusFilter): string {
    const labels: Record<ExpeditionStatusFilter, string> = {
      all: t("filterAll"),
      active: t("filterActive"),
      completed: t("filterCompleted"),
    };
    return labels[filter];
  }

  function getSortLabel(sort: ExpeditionSortField): string {
    const labels: Record<ExpeditionSortField, string> = {
      newest: t("sortNewest"),
      departure: t("sortDeparture"),
      destination: t("sortDestination"),
    };
    return labels[sort];
  }

  // ─── Main Dashboard ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="dashboard-v2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-atlas-headline text-xl font-bold text-atlas-on-surface">
          {t("pageTitle")}
        </h2>
        <div className="hidden md:block">
          <Link href="/expedition/new">
            <AtlasButton
              disabled={isAtLimit}
              leftIcon={<PlusIcon />}
              data-testid="new-expedition-btn-v2"
            >
              {t("newExpedition")}
            </AtlasButton>
          </Link>
        </div>
      </div>

      {/* Filter chips + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label={t("filterLabel")}
          className="flex gap-2"
          data-testid="filter-chips-v2"
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter;
            const count = filterCounts[filter];
            return (
              <AtlasChip
                key={filter}
                mode="selectable"
                selected={isActive}
                onSelectionChange={() => setActiveFilter(filter)}
                size="sm"
                data-testid={`filter-chip-v2-${filter}`}
              >
                {getFilterLabel(filter)} ({count})
              </AtlasChip>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label
            htmlFor="expedition-sort-v2"
            className="text-sm font-atlas-body text-atlas-on-surface-variant whitespace-nowrap"
          >
            {t("sortLabel")}:
          </label>
          <select
            id="expedition-sort-v2"
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as ExpeditionSortField)}
            className="min-h-[44px] rounded-lg border border-atlas-outline-variant bg-atlas-surface-container-lowest px-3 text-sm font-atlas-body text-atlas-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="sort-dropdown-v2"
          >
            {SORT_OPTIONS.map((sort) => (
              <option key={sort} value={sort}>
                {getSortLabel(sort)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live region */}
      <div aria-live="polite" className="sr-only" data-testid="live-region-v2">
        {t("tripCount", { count: filteredExpeditions.length })}
      </div>

      {/* Filtered empty */}
      {filteredExpeditions.length === 0 && (
        <div
          className="py-12 text-center font-atlas-body text-atlas-on-surface-variant"
          data-testid="filtered-empty-v2"
        >
          <p>{t("filteredEmpty", { filter: getFilterLabel(activeFilter).toLowerCase() })}</p>
          <button
            onClick={() => setActiveFilter("all")}
            className="mt-2 text-sm font-medium text-atlas-secondary underline min-h-[44px]"
            data-testid="clear-filter-btn-v2"
          >
            {t("clearFilter")}
          </button>
        </div>
      )}

      {/* Expedition grid */}
      {filteredExpeditions.length > 0 && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label={t("gridLabel")}
          data-testid="expeditions-grid-v2"
        >
          {filteredExpeditions.map((exp) => (
            <div key={exp.id} role="listitem">
              <ExpeditionCardV2 expedition={exp} tPhases={tPhases} />
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Link href="/expedition/new">
          <AtlasButton
            variant="primary"
            size="lg"
            disabled={isAtLimit}
            aria-label={t("newExpedition")}
            className="h-14 w-14 rounded-full !p-0"
            data-testid="fab-new-expedition-v2"
          >
            <PlusIcon />
          </AtlasButton>
        </Link>
      </div>
    </div>
  );
}

// ─── Expedition Card V2 (sub-component) ──────────────────────────────────────

const PHASE_NAMES_KEYS = [
  "theCalling",
  "theExplorer",
  "thePreparation",
  "theLogistics",
  "theDestinationGuide",
  "theItinerary",
] as const;

function ExpeditionCardV2({
  expedition,
  tPhases,
}: {
  expedition: ExpeditionDTO;
  tPhases: (key: string) => string;
}) {
  const t = useTranslations("dashboard.expeditions");
  const exp = expedition;
  const status = deriveExpeditionStatus(exp);
  const badgeConfig = STATUS_BADGE_MAP[status];

  const ctaLabel = status === "completed"
    ? t("ctaViewSummary")
    : status === "planned"
      ? t("ctaStart")
      : t("ctaContinue");

  const ctaHref = status === "completed"
    ? `/expedition/${exp.id}/summary`
    : `/expedition/${exp.id}`;

  const formattedDates = exp.startDate && exp.endDate
    ? `${exp.startDate} \u2013 ${exp.endDate}`
    : null;

  // Build phase progress segments
  const segments: PhaseSegment[] = Array.from({ length: TOTAL_PHASES }, (_, i) => {
    const phase = i + 1;
    const isCompleted = exp.completedPhases.includes(phase);
    const isActive = phase === exp.currentPhase && !isCompleted;
    const isPending = phase > exp.currentPhase && !isCompleted;

    return {
      phase,
      label: tPhases(PHASE_NAMES_KEYS[i]!),
      state: isCompleted ? "completed" : isActive ? "active" : isPending ? "pending" : "locked",
    };
  });

  return (
    <Link href={ctaHref} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 rounded-atlas-xl">
      <AtlasCard
        variant="interactive"
        className="h-full"
        data-testid="expedition-card-v2"
        header={
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-2xl" aria-hidden="true">
              {exp.coverEmoji}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-atlas-headline font-bold text-atlas-on-surface">
                {exp.destination}
              </h3>
              {formattedDates ? (
                <p className="mt-0.5 text-xs font-atlas-body text-atlas-on-surface-variant">
                  {formattedDates}
                </p>
              ) : (
                <p className="mt-0.5 text-xs font-atlas-body italic text-atlas-on-surface-variant">
                  {t("noDates")}
                </p>
              )}
            </div>
            <AtlasBadge variant="status" color={badgeConfig.color} size="sm">
              {t(badgeConfig.labelKey)}
            </AtlasBadge>
          </div>
        }
        footer={
          <div className="flex items-center justify-between">
            <p className="text-xs font-atlas-body text-atlas-on-surface-variant">
              {t("phaseLabel", { current: exp.currentPhase, total: TOTAL_PHASES })}
            </p>
            <span className="text-sm font-bold font-atlas-body text-atlas-secondary">
              {ctaLabel}
            </span>
          </div>
        }
      >
        <AtlasPhaseProgress
          segments={segments}
          layout="dashboard"
          className="mt-1"
        />
      </AtlasCard>
    </Link>
  );
}
