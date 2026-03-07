"use client";

import { useTranslations } from "next-intl";
import type { BadgeKey } from "@/types/gamification.types";

const ALL_BADGES: { key: BadgeKey; emoji: string; nameKey: string }[] = [
  { key: "first_step", emoji: "👣", nameKey: "firstStep" },
  { key: "navigator", emoji: "🗺️", nameKey: "navigator" },
  { key: "host", emoji: "🏠", nameKey: "host" },
  { key: "cartographer", emoji: "📍", nameKey: "cartographer" },
  { key: "treasurer", emoji: "💎", nameKey: "treasurer" },
  { key: "pathfinder", emoji: "⛰️", nameKey: "pathfinder" },
  { key: "ambassador", emoji: "🌟", nameKey: "ambassador" },
];

interface PassportStampsProps {
  earnedBadges: BadgeKey[];
}

export function PassportStamps({ earnedBadges }: PassportStampsProps) {
  const t = useTranslations("profile.badges");
  const earnedSet = new Set(earnedBadges);

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {ALL_BADGES.map((badge) => {
        const earned = earnedSet.has(badge.key);
        return (
          <div
            key={badge.key}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
              earned
                ? "border-atlas-gold/40 bg-atlas-gold/10"
                : "border-border/50 bg-muted/50 opacity-40"
            }`}
          >
            <span className="text-2xl" aria-hidden="true">
              {badge.emoji}
            </span>
            <span className="text-xs font-medium">
              {earned ? t(badge.nameKey) : t("locked")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
