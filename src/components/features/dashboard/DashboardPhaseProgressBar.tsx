"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";

// Import canonical route map from navigation engine (single source of truth)
import { PHASE_ROUTE_MAP } from "@/lib/engines/phase-navigation.engine";

// Use engine's PHASE_ROUTE_MAP — fixes Phase 1 route from "" to "/phase-1"
const PHASE_ROUTES = PHASE_ROUTE_MAP;

interface DashboardPhaseProgressBarProps {
  currentPhase: number;
  completedPhases: number[];
  tripId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPhaseProgressBar({
  currentPhase,
  completedPhases,
  tripId,
}: DashboardPhaseProgressBarProps) {
  const t = useTranslations("gamification");
  const router = useRouter();

  return (
    <div
      className="group/bar relative mt-3 flex gap-0.5"
      role="group"
      aria-label={t("phases.progressLabel", {
        completed: completedPhases.length,
        total: PHASE_DEFINITIONS.length,
      })}
      data-testid="dashboard-phase-progress-bar"
    >
      {PHASE_DEFINITIONS.map((phase) => {
        const phaseNum = phase.phaseNumber;
        const isCompleted = completedPhases.includes(phaseNum);
        const isCurrent = phaseNum === currentPhase;
        const isComingSoon = phaseNum >= 7;

        // Determine segment style — 4-state color system (SPEC-UX-026)
        let segmentClasses = "relative h-2 flex-1 rounded-sm transition-all";
        let indicator: React.ReactNode = null;

        if (isCompleted) {
          // Green for completed phases
          segmentClasses += " bg-green-500";
          indicator = (
            <Check
              className="absolute -top-3 left-1/2 h-2.5 w-2.5 -translate-x-1/2 text-green-500"
              aria-hidden="true"
            />
          );
        } else if (isCurrent) {
          // Blue for current phase with pulse
          segmentClasses += " bg-blue-500 motion-safe:animate-pulse";
        } else if (isComingSoon) {
          segmentClasses += " border border-dashed border-muted-foreground/30 bg-transparent opacity-50";
        } else {
          // Gray for pending (upcoming)
          segmentClasses += " border border-gray-500/20 bg-transparent";
        }

        const phaseName = t(phase.nameKey);
        const stateLabel = isCompleted
          ? t("phases.stateCompleted")
          : isCurrent
            ? t("phases.stateCurrent")
            : isComingSoon
              ? t("phases.stateComingSoon")
              : t("phases.stateUpcoming");

        const isNavigable = (isCompleted || isCurrent) && tripId && PHASE_ROUTES[phaseNum] !== undefined;

        const phaseLabel = (
          <span
            className="mt-1 hidden text-[9px] leading-tight text-muted-foreground sm:block truncate text-center"
            aria-hidden="true"
            data-testid={`phase-name-${phaseNum}`}
          >
            {phaseName}
          </span>
        );

        if (isNavigable) {
          return (
            <div key={phaseNum} className="flex flex-1 flex-col items-stretch">
              <button
                type="button"
                onClick={() =>
                  router.push(`/expedition/${tripId}${PHASE_ROUTES[phaseNum]}`)
                }
                className={`group/segment ${segmentClasses} cursor-pointer hover:-translate-y-0.5`}
                aria-label={`${phaseName} \u2014 ${stateLabel}`}
                title={phaseName}
                data-testid={`phase-segment-${phaseNum}`}
              >
                {indicator}
              </button>
              {phaseLabel}
            </div>
          );
        }

        return (
          <div key={phaseNum} className="flex flex-1 flex-col items-stretch">
            <div
              className={`group/segment ${segmentClasses}`}
              aria-label={`${phaseName} \u2014 ${stateLabel}`}
              title={phaseName}
              data-testid={`phase-segment-${phaseNum}`}
            >
              {indicator}
            </div>
            {phaseLabel}
          </div>
        );
      })}
    </div>
  );
}
