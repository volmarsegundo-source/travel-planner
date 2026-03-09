"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChecklistProgressMini } from "./ChecklistProgressMini";

interface ExpeditionCardProps {
  tripId: string;
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

export function ExpeditionCard({
  tripId,
  destination,
  currentPhase,
  completedPhases,
  totalPhases,
  coverEmoji,
  checklistRequired,
  checklistRequiredDone,
  checklistRecommendedPending,
  hasItineraryPlan = false,
}: ExpeditionCardProps) {
  const t = useTranslations("dashboard");

  const progressPercent = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  return (
    <Link
      href={`/expedition/${tripId}`}
      className="group block rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:shadow-atlas-gold/5"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl" aria-hidden="true">
          {coverEmoji}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-atlas-gold">
            {destination}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("currentPhase", { number: currentPhase })} &middot;{" "}
            {t("phaseProgress", { completed: completedPhases, total: totalPhases })}
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-atlas-gold transition-all"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={completedPhases}
              aria-valuemin={0}
              aria-valuemax={totalPhases}
            />
          </div>
          {/* Checklist badge — visible from phase 3 onward */}
          {currentPhase >= 3 && checklistRequired > 0 && (
            <ChecklistProgressMini
              tripId={tripId}
              requiredTotal={checklistRequired}
              requiredDone={checklistRequiredDone}
              recommendedPending={checklistRecommendedPending}
            />
          )}
          {/* Itinerary badge — visible when plan has been generated */}
          {hasItineraryPlan && (
            <p className="mt-2 text-xs text-atlas-teal">
              {t("itineraryGenerated")}
            </p>
          )}
        </div>
        <span className="text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {t("viewExpedition")}
        </span>
      </div>
    </Link>
  );
}
