"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { BadgeKey, Rank } from "@/types/gamification.types";

interface PointsAnimationProps {
  points: number;
  badge?: BadgeKey | null;
  rank?: Rank | null;
  onDismiss: () => void;
}

export function PointsAnimation({ points, badge, rank, onDismiss }: PointsAnimationProps) {
  const t = useTranslations("expedition.animation");
  const tBadges = useTranslations("profile.badges");
  const tRanks = useTranslations("gamification.ranks");
  const [visible, setVisible] = useState(true);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismissRef.current(), 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const badgeNameMap: Record<BadgeKey, string> = {
    first_step: "firstStep",
    navigator: "navigator",
    host: "host",
    logistics_master: "logisticsMaster",
    identity_explorer: "identityExplorer",
    cartographer: "cartographer",
    treasurer: "treasurer",
    pathfinder: "pathfinder",
    ambassador: "ambassador",
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-2xl">
        <p className="text-3xl font-bold text-primary">
          {t("pointsEarned", { points })}
        </p>
        {badge && (
          <p className="text-lg text-atlas-gold-light">
            {t("badgeEarned", { badge: tBadges(badgeNameMap[badge]) })}
          </p>
        )}
        {rank && (
          <p className="text-lg text-accent-foreground">
            {t("rankUp", { rank: tRanks(rank) })}
          </p>
        )}
      </div>
    </div>
  );
}
