"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChecklistProgressMini } from "./ChecklistProgressMini";
import { DashboardPhaseProgressBar } from "./DashboardPhaseProgressBar";
import { PhaseToolsBar } from "./PhaseToolsBar";
import { getPhaseTools } from "@/lib/engines/phase-config";

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
  // hasItineraryPlan removed — PhaseToolsBar handles itinerary shortcut (DEBT-S18-001)
}: ExpeditionCardProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:shadow-atlas-gold/5">
      <Link
        href={`/expedition/${tripId}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`${destination} — ${t("viewExpedition")}`}
      />
      <div className="relative z-10 pointer-events-none flex items-start gap-4">
        <span className="text-3xl" aria-hidden="true">
          {coverEmoji}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {destination}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("currentPhase", { number: currentPhase })} &middot;{" "}
            {t("phaseProgress", { completed: completedPhases, total: totalPhases })}
          </p>
          {/* Phase progress bar with indicators */}
          <DashboardPhaseProgressBar
            currentPhase={currentPhase}
            completedPhases={completedPhases}
          />
          {/* Checklist badge — visible from phase 3 onward */}
          {currentPhase >= 3 && checklistRequired > 0 && (
            <div className="pointer-events-auto">
              <ChecklistProgressMini
                tripId={tripId}
                requiredTotal={checklistRequired}
                requiredDone={checklistRequiredDone}
                recommendedPending={checklistRecommendedPending}
              />
            </div>
          )}
          {/* Phase tools bar — provides checklist, itinerary, and other phase shortcuts */}
          <PhaseToolsBar tools={getPhaseTools(currentPhase)} tripId={tripId} />
        </div>
        <span className="text-sm font-medium text-primary">
          {t("viewExpedition")}
        </span>
      </div>
    </div>
  );
}
