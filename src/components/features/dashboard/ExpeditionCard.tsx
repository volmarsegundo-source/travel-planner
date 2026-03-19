"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChecklistProgressMini } from "./ChecklistProgressMini";
import { DashboardPhaseProgressBar } from "./DashboardPhaseProgressBar";
import { TripCountdownInline } from "./TripCountdownInline";

interface ExpeditionCardProps {
  tripId: string;
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
  startDate,
  endDate,
  destinationLat,
  destinationLon,
  // hasItineraryPlan removed — PhaseToolsBar handles itinerary shortcut (DEBT-S18-001)
}: ExpeditionCardProps) {
  const t = useTranslations("dashboard");

  const isExpeditionCompleted = completedPhases.length >= totalPhases;

  // Format dates using locale-aware formatting
  const formattedDates = startDate && endDate
    ? t("travelDates", { start: startDate, end: endDate })
    : null;

  return (
    <div
      className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:shadow-atlas-gold/5"
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const link = e.currentTarget.querySelector<HTMLAnchorElement>("a");
          link?.click();
        }
      }}
    >
      <Link
        href={`/expedition/${tripId}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`${destination} — ${t("viewExpedition")}`}
        tabIndex={-1}
      />
      <div className="relative z-10 pointer-events-none flex items-start gap-4">
        <span className="text-3xl" aria-hidden="true">
          {coverEmoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {destination}
            </h3>
            {destinationLat != null && destinationLon != null && (
              <span
                className="shrink-0 text-atlas-teal"
                title={`${destinationLat.toFixed(2)}, ${destinationLon.toFixed(2)}`}
                data-testid="map-pin"
                aria-hidden="true"
              >
                📍
              </span>
            )}
            {isExpeditionCompleted && (
              <span
                className="inline-flex shrink-0 items-center rounded-full bg-atlas-gold/10 px-2 py-0.5 text-xs font-medium text-atlas-gold"
                data-testid="completed-badge"
              >
                {t("completed")}
              </span>
            )}
          </div>
          {formattedDates && (
            <p className="mt-0.5 text-xs text-muted-foreground" data-testid="travel-dates">
              {formattedDates}
            </p>
          )}
          {startDate && (
            <TripCountdownInline startDate={startDate} endDate={endDate ?? undefined} />
          )}
          <p className="mt-1 text-sm text-muted-foreground" data-testid="phase-count-text">
            {t("phasesCompleted", {
              current: currentPhase,
              total: totalPhases,
              completed: completedPhases.length,
            })}
          </p>
          {/* Phase progress bar with indicators — interactive (pointer-events-auto) */}
          <div className="pointer-events-auto">
            <DashboardPhaseProgressBar
              currentPhase={currentPhase}
              completedPhases={completedPhases}
              tripId={tripId}
            />
          </div>
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
        </div>
        <span className="text-sm font-medium text-primary shrink-0">
          {t("viewExpedition")}
        </span>
      </div>
    </div>
  );
}
