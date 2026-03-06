"use client";

import { useTranslations } from "next-intl";
import type { Rank } from "@/types/gamification.types";

const RANK_COLORS: Record<Rank, string> = {
  traveler: "bg-gray-100 text-gray-700",
  explorer: "bg-blue-100 text-blue-700",
  navigator: "bg-cyan-100 text-cyan-700",
  cartographer: "bg-purple-100 text-purple-700",
  pathfinder: "bg-amber-100 text-amber-700",
  ambassador: "bg-emerald-100 text-emerald-700",
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
