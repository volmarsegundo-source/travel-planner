// ─── Next Steps Suggestion Engine ────────────────────────────────────────────

import type { PhaseReadiness } from "@/server/services/trip-readiness.service";

export interface NextStep {
  labelKey: string;
  labelValues?: Record<string, string | number>;
  targetUrl: string;
  priority: number;
}

/**
 * Generate 1-3 actionable next step suggestions based on trip readiness.
 */
export function getNextStepsSuggestions(
  tripId: string,
  phases: PhaseReadiness[],
  readinessPercent: number
): NextStep[] {
  const suggestions: NextStep[] = [];

  // If trip is fully ready, congratulate
  if (readinessPercent === 100) {
    suggestions.push({
      labelKey: "expedition.nextSteps.allDone",
      targetUrl: `/expedition/${tripId}/summary`,
      priority: 1,
    });
    return suggestions;
  }

  // Find first incomplete phase and suggest it
  for (const phase of phases) {
    if (suggestions.length >= 3) break;

    if (phase.status === "not_started") {
      suggestions.push({
        labelKey: "expedition.nextSteps.startPhase",
        labelValues: { phase: phase.name },
        targetUrl: phaseUrl(tripId, phase.phase),
        priority: phase.phase,
      });
    } else if (phase.status === "partial") {
      // Special case for checklist (phase 3)
      if (phase.phase === 3 && phase.dataSnapshot.total) {
        suggestions.push({
          labelKey: "expedition.nextSteps.completeChecklist",
          labelValues: {
            done: phase.dataSnapshot.done as number,
            total: phase.dataSnapshot.total as number,
          },
          targetUrl: phaseUrl(tripId, 3),
          priority: 3,
        });
      } else {
        suggestions.push({
          labelKey: "expedition.nextSteps.continuePhase",
          labelValues: { phase: phase.name },
          targetUrl: phaseUrl(tripId, phase.phase),
          priority: phase.phase,
        });
      }
    }
  }

  // If no suggestions yet, suggest starting
  if (suggestions.length === 0) {
    suggestions.push({
      labelKey: "expedition.nextSteps.startPlanning",
      targetUrl: `/expedition/${tripId}`,
      priority: 1,
    });
  }

  return suggestions.slice(0, 3).sort((a, b) => a.priority - b.priority);
}

function phaseUrl(tripId: string, phase: number): string {
  if (phase === 1) return `/expedition/${tripId}`;
  return `/expedition/${tripId}/phase-${phase}`;
}
