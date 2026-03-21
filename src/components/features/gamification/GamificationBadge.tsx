"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Rank } from "@/types/gamification.types";

const RANK_ICONS: Record<Rank, string> = {
  novato: "\uD83E\uDDF3",
  desbravador: "\uD83E\uDDED",
  navegador: "\uD83D\uDDFA\uFE0F",
  capitao: "\uD83D\uDCCD",
  aventureiro: "\u26F0\uFE0F",
  lendario: "\uD83C\uDF1F",
};

interface GamificationBadgeProps {
  totalPoints: number;
  availablePoints: number;
  currentLevel: number;
  phaseName: string;
  rank: Rank;
}

export function GamificationBadge({
  availablePoints,
  phaseName,
  rank,
}: GamificationBadgeProps) {
  const t = useTranslations("gamification.badge");
  const tRanks = useTranslations("gamification.ranks");

  const [displayPoints, setDisplayPoints] = useState(availablePoints);
  const prevPointsRef = useRef(availablePoints);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevPointsRef.current !== availablePoints) {
      setAnimating(true);
      // Animate to new value
      const timer = setTimeout(() => {
        setDisplayPoints(availablePoints);
        prevPointsRef.current = availablePoints;
      }, 50);
      const resetTimer = setTimeout(() => {
        setAnimating(false);
      }, 600);
      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
  }, [availablePoints]);

  const rankIcon = RANK_ICONS[rank] ?? RANK_ICONS.novato;
  const rankName = tRanks(rank);

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-atlas-gold/10 px-3 py-1.5 text-sm font-medium text-atlas-gold cursor-default"
      role="status"
      aria-label={t("ariaLabel", { points: availablePoints, rankName: phaseName })}
      data-testid="gamification-badge"
    >
      <span aria-hidden="true">{rankIcon}</span>
      <span
        className={`font-bold transition-all duration-500 ${animating ? "scale-110 text-atlas-gold-light" : ""}`}
        data-testid="badge-points"
      >
        {displayPoints}
      </span>
      <span className="text-xs text-atlas-gold/60" aria-hidden="true">
        PA
      </span>
      <span
        className="hidden text-xs text-atlas-gold/80 sm:inline"
        data-testid="badge-rank"
        title={t("levelLabel", { rank: rankName })}
      >
        {rankName}
      </span>
      <span className="sr-only" data-testid="badge-phase">
        {phaseName}
      </span>
    </div>
  );
}
