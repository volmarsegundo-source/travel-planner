"use client";

import { useTranslations } from "next-intl";
import type { Rank } from "@/types/gamification.types";

const RANK_COLORS: Record<Rank, string> = {
  traveler: "bg-muted text-muted-foreground",
  explorer: "bg-accent text-accent-foreground",
  navigator: "bg-atlas-teal/15 text-atlas-teal-light",
  cartographer: "bg-atlas-gold/10 text-atlas-gold",
  pathfinder: "bg-atlas-gold/15 text-atlas-gold-light",
  ambassador: "bg-atlas-gold/20 text-atlas-gold-light border border-atlas-gold/40",
};

const RANK_EMOJIS: Record<Rank, string> = {
  traveler: "🧳",
  explorer: "🧭",
  navigator: "🗺️",
  cartographer: "📍",
  pathfinder: "⛰️",
  ambassador: "🌟",
};

interface RankBadgeProps {
  rank: Rank;
  size?: "sm" | "md" | "lg";
}

export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const t = useTranslations("gamification.ranks");

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${RANK_COLORS[rank]} ${sizeClasses[size]}`}
    >
      <span aria-hidden="true">{RANK_EMOJIS[rank]}</span>
      <span>{t(rank)}</span>
    </span>
  );
}
