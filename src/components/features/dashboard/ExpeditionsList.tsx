"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ExpeditionCard } from "./ExpeditionCard";

interface ExpeditionTrip {
  id: string;
  destination: string;
  currentPhase: number;
  completedPhases: number[];
  totalPhases: number;
  coverEmoji: string;
  checklistRequired: number;
  checklistRequiredDone: number;
  checklistRecommendedPending: number;
  hasItineraryPlan?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  destinationLat?: number | null;
  destinationLon?: number | null;
}

interface ExpeditionsListProps {
  expeditions: ExpeditionTrip[];
}

export function ExpeditionsList({ expeditions }: ExpeditionsListProps) {
  const t = useTranslations("dashboard");

  if (expeditions.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-16 text-center"
        data-testid="expeditions-empty"
      >
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
    );
  }

  return (
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
          startDate={exp.startDate}
          endDate={exp.endDate}
          destinationLat={exp.destinationLat}
          destinationLon={exp.destinationLon}
        />
      ))}
    </div>
  );
}
