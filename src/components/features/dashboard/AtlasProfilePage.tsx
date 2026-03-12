"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Rank, BadgeKey } from "@/types/gamification.types";

interface Badge {
  badgeKey: BadgeKey;
  earnedAt: Date;
}

interface AtlasProfilePageProps {
  totalPoints: number;
  currentRank: Rank;
  streakDays: number;
  badges: Badge[];
  expeditionCount: number;
}

export function AtlasProfilePage({
  totalPoints,
  currentRank,
  streakDays,
  badges,
  expeditionCount,
}: AtlasProfilePageProps) {
  const t = useTranslations("atlas");
  const tGamification = useTranslations("gamification");

  if (expeditionCount === 0 && totalPoints === 0) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-16 text-center"
        data-testid="atlas-empty"
      >
        <span className="text-5xl" aria-hidden="true">🗺️</span>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("emptyTitle")}
        </h2>
        <p className="max-w-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <Link href="/expedition/new">
          <Button size="lg">{t("startExpedition")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="atlas-profile">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-atlas-gold" data-testid="atlas-points">
            {totalPoints}
          </p>
          <p className="text-sm text-muted-foreground">{t("totalPoints")}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground" data-testid="atlas-rank">
            {tGamification(`ranks.${currentRank}`)}
          </p>
          <p className="text-sm text-muted-foreground">{t("currentRank")}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {badges.length}
          </p>
          <p className="text-sm text-muted-foreground">{t("badges")}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {streakDays}
          </p>
          <p className="text-sm text-muted-foreground">{t("streakDays")}</p>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            {t("badgesEarned")}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {badges.map((badge) => (
              <div
                key={badge.badgeKey}
                className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3"
              >
                <span className="text-2xl" aria-hidden="true">🏅</span>
                <span className="text-xs text-muted-foreground">
                  {tGamification(`badges.${badge.badgeKey}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
