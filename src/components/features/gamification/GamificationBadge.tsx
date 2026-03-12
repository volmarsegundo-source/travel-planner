"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface GamificationBadgeProps {
  totalPoints: number;
  currentLevel: number;
  phaseName: string;
}

export function GamificationBadge({
  totalPoints,
  phaseName,
}: GamificationBadgeProps) {
  const t = useTranslations("gamification.badge");

  return (
    <Link
      href="/atlas"
      className="flex items-center gap-2 rounded-lg bg-atlas-gold/10 px-3 py-1.5 text-sm font-medium text-atlas-gold transition-colors hover:bg-atlas-gold/20"
      title={t("viewProfile")}
      data-testid="gamification-badge"
    >
      <span aria-hidden="true">⭐</span>
      <span className="font-bold" data-testid="badge-points">
        {totalPoints}
      </span>
      <span className="hidden text-xs text-atlas-gold/80 sm:inline" data-testid="badge-phase">
        {phaseName}
      </span>
    </Link>
  );
}
