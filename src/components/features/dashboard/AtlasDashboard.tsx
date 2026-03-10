"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "./DashboardHeader";
import { ExpeditionCard } from "./ExpeditionCard";
import { AtlasHeroMap } from "./AtlasHeroMap";
import type { Rank } from "@/types/gamification.types";

interface ExpeditionTrip {
  id: string;
  destination: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  coverEmoji: string;
  checklistRequired: number;
  checklistRequiredDone: number;
  checklistRecommendedPending: number;
  hasItineraryPlan?: boolean;
}

interface AtlasDashboardProps {
  userName: string;
  rank: Rank;
  totalPoints: number;
  expeditions: ExpeditionTrip[];
}

export function AtlasDashboard({
  userName,
  rank,
  totalPoints,
  expeditions,
}: AtlasDashboardProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="relative mx-auto min-h-[400px] max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <AtlasHeroMap destinations={expeditions.map((e) => e.destination)} />

      <div className="relative z-10">
        <DashboardHeader
          userName={userName}
          rank={rank}
          totalPoints={totalPoints}
          isFirstVisit={expeditions.length === 0}
        />

        <div className="mt-8">
          {expeditions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-16 text-center">
              <span className="text-5xl" aria-hidden="true">🧭</span>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {t("emptyState.title")}
              </h2>
              <p className="max-w-sm text-muted-foreground">
                {t("emptyState.subtitle")}
              </p>
              <Link href="/expedition/new">
                <Button size="lg">{t("emptyState.cta")}</Button>
              </Link>
            </div>
          ) : (
            /* Expedition list */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {t("title")}
                </h2>
                <Link href="/expedition/new">
                  <Button variant="outline" size="sm">
                    {t("newExpedition")}
                  </Button>
                </Link>
              </div>
              {expeditions.map((exp) => (
                <ExpeditionCard
                  key={exp.id}
                  tripId={exp.id}
                  destination={exp.destination}
                  currentPhase={exp.currentPhase}
                  completedPhases={exp.completedPhases}
                  totalPhases={exp.totalPhases}
                  coverEmoji={exp.coverEmoji}
                  checklistRequired={exp.checklistRequired}
                  checklistRequiredDone={exp.checklistRequiredDone}
                  checklistRecommendedPending={exp.checklistRecommendedPending}
                  hasItineraryPlan={exp.hasItineraryPlan}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
