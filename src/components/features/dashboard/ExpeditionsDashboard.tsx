"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExpeditionCardRedesigned } from "./ExpeditionCardRedesigned";
import { ExpeditionCardSkeleton } from "./ExpeditionCardSkeleton";
import { filterAndSortExpeditions } from "@/lib/expedition-filters";
import type {
  ExpeditionDTO,
  ExpeditionStatusFilter,
  ExpeditionSortField,
} from "@/types/expedition.types";
import { deriveExpeditionStatus } from "@/types/expedition.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ACTIVE_EXPEDITIONS = 20;

const FILTER_OPTIONS: ExpeditionStatusFilter[] = ["all", "active", "completed"];
const SORT_OPTIONS: ExpeditionSortField[] = ["newest", "departure", "destination"];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpeditionsDashboardProps {
  expeditions: ExpeditionDTO[];
  isLoading?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpeditionsDashboard({
  expeditions,
  isLoading = false,
}: ExpeditionsDashboardProps) {
  const t = useTranslations("dashboard.expeditions");

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
    [expeditions, activeFilter, activeSort]
  );

  const activeExpeditionCount = filterCounts.active;
  const isAtLimit = activeExpeditionCount >= MAX_ACTIVE_EXPEDITIONS;

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="expeditions-loading">
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4"
          role="list"
          aria-label={t("gridLabel")}
        >
          {[1, 2, 3].map((i) => (
            <ExpeditionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty State (no expeditions at all) ───────────────────────────────────

  if (expeditions.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-16 text-center"
        data-testid="expeditions-empty"
      >
        <span className="text-5xl" aria-hidden="true">
          🧭
        </span>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("emptyTitle")}
        </h2>
        <p className="max-w-sm text-muted-foreground">{t("emptySubtitle")}</p>
        <Link href="/expedition/new">
          <Button size="lg">{t("newExpedition")}</Button>
        </Link>
      </div>
    );
  }

  // ─── Filter chip label helper ──────────────────────────────────────────────

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

  // ─── Main Dashboard ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header: Title + New Expedition button */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {t("pageTitle")}
        </h2>
        <div className="hidden md:block">
          <Link href="/expedition/new">
            <Button
              disabled={isAtLimit}
              title={isAtLimit ? t("limitReached") : undefined}
              data-testid="new-expedition-btn"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("newExpedition")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter chips + Sort dropdown */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter chips */}
        <div
          role="radiogroup"
          aria-label={t("filterLabel")}
          className="flex gap-2 overflow-x-auto"
          data-testid="filter-chips"
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter;
            const count = filterCounts[filter];
            return (
              <button
                key={filter}
                role="radio"
                aria-checked={isActive}
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors
                  h-9 min-h-[44px] md:min-h-[36px]
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                data-testid={`filter-chip-${filter}`}
              >
                {getFilterLabel(filter)} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <div className="ml-auto flex items-center gap-1.5">
          <label
            htmlFor="expedition-sort"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {t("sortLabel")}:
          </label>
          <select
            id="expedition-sort"
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as ExpeditionSortField)}
            className="h-9 min-h-[44px] md:min-h-[36px] rounded-md border border-border bg-card px-2 text-sm text-foreground"
            data-testid="sort-dropdown"
          >
            {SORT_OPTIONS.map((sort) => (
              <option key={sort} value={sort}>
                {getSortLabel(sort)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live region for filter/sort announcements */}
      <div aria-live="polite" className="sr-only" data-testid="live-region">
        {t("tripCount", { count: filteredExpeditions.length })}
      </div>

      {/* Filtered empty state */}
      {filteredExpeditions.length === 0 && (
        <div
          className="py-12 text-center text-muted-foreground"
          data-testid="filtered-empty"
        >
          <p>{t("filteredEmpty", { filter: getFilterLabel(activeFilter).toLowerCase() })}</p>
          <button
            onClick={() => setActiveFilter("all")}
            className="mt-2 text-sm font-medium text-primary underline"
            data-testid="clear-filter-btn"
          >
            {t("clearFilter")}
          </button>
        </div>
      )}

      {/* Expedition grid */}
      {filteredExpeditions.length > 0 && (
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4"
          role="list"
          aria-label={t("gridLabel")}
          data-testid="expeditions-grid"
        >
          {filteredExpeditions.map((exp) => (
            <div key={exp.id} role="listitem">
              <ExpeditionCardRedesigned expedition={exp} />
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-4 right-4 md:hidden z-50">
        <Link href="/expedition/new">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            disabled={isAtLimit}
            aria-label={t("newExpedition")}
            title={isAtLimit ? t("limitReached") : t("newExpedition")}
            data-testid="fab-new-expedition"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
