"use client";

import { useTranslations } from "next-intl";
import type { BadgeCategory } from "@/lib/gamification/badge-registry";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BadgeDisplayItem {
  key: string;
  nameKey: string;
  descriptionKey: string;
  category: string;
  icon: string;
  unlocked: boolean;
  earnedAt: string | null;
  progress: { current: number; target: number; percentage: number };
}

interface BadgeShowcaseProps {
  badges: BadgeDisplayItem[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: { key: BadgeCategory; labelKey: string }[] = [
  { key: "explorador", labelKey: "gamification.badgeShowcase.categoryExplorador" },
  { key: "perfeccionista", labelKey: "gamification.badgeShowcase.categoryPerfeccionista" },
  { key: "aventureiro", labelKey: "gamification.badgeShowcase.categoryAventureiro" },
  { key: "veterano", labelKey: "gamification.badgeShowcase.categoryVeterano" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function BadgeShowcase({ badges }: BadgeShowcaseProps) {
  const t = useTranslations();

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">
        {t("gamification.badgeShowcase.title")}
      </h2>
      {CATEGORIES.map((category) => {
        const categoryBadges = badges.filter(
          (b) => b.category === category.key
        );
        if (categoryBadges.length === 0) return null;

        return (
          <section key={category.key} aria-labelledby={`category-${category.key}`}>
            <h3
              id={`category-${category.key}`}
              className="mb-4 text-lg font-semibold text-foreground/80"
            >
              {t(category.labelKey)}
            </h3>
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              role="list"
            >
              {categoryBadges.map((badge) => (
                <BadgeCard key={badge.key} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Badge Card ─────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: BadgeDisplayItem }) {
  const t = useTranslations();

  const badgeName = t(badge.nameKey);
  const badgeDescription = t(badge.descriptionKey);

  return (
    <div
      role="listitem"
      className={`relative flex flex-col items-center rounded-xl border p-4 text-center transition-all ${
        badge.unlocked
          ? "border-atlas-gold/30 bg-atlas-gold/5"
          : "border-border bg-muted/30 grayscale"
      }`}
      aria-label={
        badge.unlocked
          ? `${badgeName} - ${t("gamification.badgeShowcase.unlocked")}`
          : `${badgeName} - ${t("gamification.badgeShowcase.locked")}`
      }
    >
      {/* Icon */}
      <span className="mb-2 text-3xl" aria-hidden="true">
        {badge.unlocked ? badge.icon : "\u{1F512}"}
      </span>

      {/* Name */}
      <span className="text-sm font-medium leading-tight">
        {badgeName}
      </span>

      {/* Description */}
      <span className="mt-1 text-xs text-muted-foreground leading-tight">
        {badgeDescription}
      </span>

      {/* Progress or Date */}
      {badge.unlocked ? (
        <span className="mt-2 text-xs text-atlas-gold">
          {badge.earnedAt
            ? t("gamification.badgeShowcase.earnedOn", {
                date: new Date(badge.earnedAt).toLocaleDateString(),
              })
            : t("gamification.badgeShowcase.unlocked")}
        </span>
      ) : (
        <div className="mt-2 w-full">
          {/* Progress bar */}
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={badge.progress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("gamification.badgeShowcase.progress", {
              current: badge.progress.current,
              target: badge.progress.target,
            })}
          >
            <div
              className="h-full rounded-full bg-atlas-gold/50 transition-all"
              style={{ width: `${badge.progress.percentage}%` }}
            />
          </div>
          <span className="mt-1 text-xs text-muted-foreground">
            {badge.progress.current}/{badge.progress.target}
          </span>
        </div>
      )}
    </div>
  );
}
