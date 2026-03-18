"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check, Lock } from "lucide-react";
import {
  getPhaseState,
  getPhaseUrl,
  canNavigateToPhase,
  TOTAL_ACTIVE_PHASES,
  type PhaseState,
} from "@/lib/engines/phase-navigation.engine";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";

interface UnifiedProgressBarProps {
  tripId: string;
  viewingPhase: number;
  tripCurrentPhase: number;
  completedPhases: number[];
}

/**
 * Unified expedition progress bar showing all 6 active phases.
 * Replaces ExpeditionProgressBar and is the single cross-phase navigation component.
 *
 * Visual states (SPEC-UX-026 4-state color system):
 * - Completed: green (#10B981) + checkmark
 * - Current: blue (#3B82F6) + pulse + phase number
 * - Available/Pending: gray outlined (#6B7280) + phase number
 * - Locked: gray 30% + lock icon + dashed border
 *
 * Touch targets: 44x44px minimum.
 * Keyboard: role="navigation", Arrow Left/Right, Enter/Space.
 * aria-label per segment: "{Phase name}, fase {N} de 6, {state}"
 */
export function UnifiedProgressBar({
  tripId,
  viewingPhase,
  tripCurrentPhase,
  completedPhases,
}: UnifiedProgressBarProps) {
  const t = useTranslations("gamification");
  const tExpedition = useTranslations("expedition");
  const router = useRouter();

  const phases = Array.from({ length: TOTAL_ACTIVE_PHASES }, (_, i) => i + 1);

  function getStateLabel(state: PhaseState): string {
    switch (state) {
      case "completed": return t("phases.stateCompleted");
      case "current": return t("phases.stateCurrent");
      case "available": return t("phases.stateUpcoming");
      case "locked": return t("phases.stateLocked", { fallback: t("phases.stateUpcoming") });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const segments = e.currentTarget.parentElement?.querySelectorAll("[data-phase-segment]");
    if (!segments) return;

    let targetIndex = index;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetIndex = (index + 1) % TOTAL_ACTIVE_PHASES;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetIndex = (index - 1 + TOTAL_ACTIVE_PHASES) % TOTAL_ACTIVE_PHASES;
    }

    if (targetIndex !== index) {
      (segments[targetIndex] as HTMLElement)?.focus();
    }
  }

  /**
   * Determine the connector line color between two adjacent segments.
   * SPEC-UX-026 Section 4.5.
   */
  function getConnectorClass(currentState: PhaseState, nextPhaseNum: number): string {
    const nextState = getPhaseState(nextPhaseNum, tripCurrentPhase, completedPhases);
    if (currentState === "completed" && nextState === "completed") {
      return "bg-green-500";
    }
    return "bg-muted";
  }

  return (
    <nav
      className="flex items-center justify-center gap-2 px-4 py-3"
      aria-label={tExpedition("progressBarLabel", { fallback: "Expedition progress" })}
      data-testid="unified-progress-bar"
    >
      {phases.map((phaseNum, index) => {
        const state = getPhaseState(phaseNum, tripCurrentPhase, completedPhases);
        const definition = PHASE_DEFINITIONS[phaseNum - 1];
        const phaseName = definition ? t(definition.nameKey) : `Phase ${phaseNum}`;
        const stateLabel = getStateLabel(state);
        const isNavigable = canNavigateToPhase(tripCurrentPhase, phaseNum, completedPhases);
        const isViewing = phaseNum === viewingPhase;

        const ariaLabel = `${phaseName}, fase ${phaseNum} de ${TOTAL_ACTIVE_PHASES}, ${stateLabel}`;

        // Connecting line between segments (decorative)
        const showConnector = phaseNum < TOTAL_ACTIVE_PHASES;

        return (
          <div key={phaseNum} className="flex items-center">
            {/* Segment */}
            {isNavigable && state !== "current" ? (
              <button
                type="button"
                data-phase-segment
                tabIndex={isViewing ? 0 : -1}
                onClick={() => router.push(getPhaseUrl(tripId, phaseNum))}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={getSegmentClasses(state, isViewing)}
                aria-label={ariaLabel}
                title={`${phaseName} \u2014 ${stateLabel}`}
                data-testid={`progress-phase-${phaseNum}`}
              >
                {getSegmentContent(state, phaseNum)}
              </button>
            ) : state === "current" ? (
              <button
                type="button"
                data-phase-segment
                tabIndex={isViewing ? 0 : -1}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={getSegmentClasses(state, isViewing)}
                aria-label={ariaLabel}
                aria-current="step"
                title={`${phaseName} \u2014 ${stateLabel}`}
                data-testid={`progress-phase-${phaseNum}`}
              >
                {getSegmentContent(state, phaseNum)}
              </button>
            ) : (
              <span
                data-phase-segment
                tabIndex={isViewing ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={getSegmentClasses(state, isViewing)}
                aria-label={ariaLabel}
                role="img"
                title={`${phaseName} \u2014 ${stateLabel}`}
                data-testid={`progress-phase-${phaseNum}`}
              >
                {getSegmentContent(state, phaseNum)}
              </span>
            )}

            {/* Connector line */}
            {showConnector && (
              <div
                className={`mx-1 h-0.5 w-4 sm:w-6 ${getConnectorClass(state, phaseNum + 1)}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function getSegmentClasses(state: PhaseState, isViewing: boolean): string {
  const base = "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";
  const viewingRing = isViewing ? " ring-2 ring-offset-2 ring-primary" : "";

  switch (state) {
    case "completed":
      return `${base} bg-green-500 text-white cursor-pointer motion-safe:hover:-translate-y-0.5${viewingRing}`;
    case "current":
      return `${base} bg-blue-500 text-white motion-safe:animate-pulse cursor-default${viewingRing}`;
    case "available":
      return `${base} bg-transparent border-2 border-gray-500 text-gray-500 cursor-pointer motion-safe:hover:-translate-y-0.5${viewingRing}`;
    case "locked":
      return `${base} bg-gray-700/30 border-2 border-dashed border-[#9BA8B5] text-[#9BA8B5] cursor-not-allowed${viewingRing}`;
  }
}

function getSegmentContent(state: PhaseState, phaseNum: number): React.ReactNode {
  switch (state) {
    case "completed":
      return <Check className="h-5 w-5" aria-hidden="true" />;
    case "current":
      return <span>{phaseNum}</span>;
    case "available":
      return <span>{phaseNum}</span>;
    case "locked":
      return <Lock className="h-4 w-4" aria-hidden="true" />;
  }
}
