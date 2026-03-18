"use client";

import { useTranslations } from "next-intl";

export type AtlasFilter = "ALL" | "PLANNING" | "IN_PROGRESS" | "COMPLETED";

interface AtlasFilterChipsProps {
  activeFilter: AtlasFilter;
  onFilterChange: (filter: AtlasFilter) => void;
  counts: {
    all: number;
    planning: number;
    inProgress: number;
    completed: number;
  };
}

const FILTERS: Array<{ key: AtlasFilter; i18nKey: string; countKey: keyof AtlasFilterChipsProps["counts"] }> = [
  { key: "ALL", i18nKey: "filterAll", countKey: "all" },
  { key: "PLANNING", i18nKey: "filterPlanned", countKey: "planning" },
  { key: "IN_PROGRESS", i18nKey: "filterActive", countKey: "inProgress" },
  { key: "COMPLETED", i18nKey: "filterCompleted", countKey: "completed" },
];

export function AtlasFilterChips({
  activeFilter,
  onFilterChange,
  counts,
}: AtlasFilterChipsProps) {
  const t = useTranslations("atlas");

  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={t("filterAll")}
    >
      {FILTERS.map(({ key, i18nKey, countKey }) => {
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onFilterChange(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px] md:min-h-[44px] ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
            data-testid={`atlas-filter-${key.toLowerCase()}`}
          >
            {t(i18nKey)}
            <span className="text-xs opacity-70">({counts[countKey]})</span>
          </button>
        );
      })}
    </div>
  );
}
