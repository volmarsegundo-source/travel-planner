"use client";

import { useTranslations } from "next-intl";
import { RankBadge } from "@/components/features/gamification/RankBadge";
import { PointsDisplay } from "@/components/features/gamification/PointsDisplay";
import type { Rank } from "@/types/gamification.types";

interface DashboardHeaderProps {
  userName: string;
  rank: Rank;
  totalPoints: number;
  isFirstVisit?: boolean;
}

export function DashboardHeader({ userName, rank, totalPoints, isFirstVisit }: DashboardHeaderProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {isFirstVisit
            ? t("greetingFirst", { name: userName })
            : t("greeting", { name: userName })}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <RankBadge rank={rank} />
          <PointsDisplay points={totalPoints} />
        </div>
      </div>
    </div>
  );
}
