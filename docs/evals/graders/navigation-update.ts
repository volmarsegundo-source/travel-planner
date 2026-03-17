/**
 * Grader: Navigation (EVAL-UX-003 update for Sprint 30)
 *
 * Updates the existing navigation grader to cover Sprint 30 dashboard and map rewrites.
 * Adds new grading dimensions for:
 *   - Dashboard routing: correct URL after filter/sort changes
 *   - Map navigation: pin click navigates to correct trip detail page
 *   - Phase guard: locked phases remain blocked after dashboard/map rewrites
 *   - Progress bar: correct states shown in dashboard cards and map popups
 *
 * Schedule: per-commit (code grader, zero AI cost)
 * Dataset:  Extends existing navigation eval datasets
 * Spec ref: SPEC-QA-002, SPEC-QA-003
 *
 * --- IMPLEMENTATION STUB ---
 * Devs should integrate these checks into the existing navigation grader.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavigationGraderInput {
  testCaseId: string;
  action: "filter_click" | "sort_change" | "pin_click" | "card_click" | "phase_nav";
  currentUrl: string;
  expectedUrl: string;
  actualUrl: string;
  tripId?: string;
  phaseIndex?: number;
  phaseLocked?: boolean;
  progressBarStates?: {
    phaseIndex: number;
    expectedState: "completed" | "active" | "locked";
    actualState: string;
  }[];
}

export interface NavigationGraderResult {
  testCaseId: string;
  passed: boolean;
  score: number;
  dimensions: {
    routing: number;
    guards: number;
    progress_bar: number;
  };
  failures: string[];
}

// ---------------------------------------------------------------------------
// Grader Logic
// ---------------------------------------------------------------------------

export function gradeNavigation(input: NavigationGraderInput): NavigationGraderResult {
  const failures: string[] = [];

  // --- Routing ---
  let routingScore = 1.0;
  if (input.actualUrl !== input.expectedUrl) {
    routingScore = 0.0;
    failures.push(
      `Expected URL "${input.expectedUrl}", got "${input.actualUrl}"`
    );
  }

  // --- Guards ---
  let guardsScore = 1.0;
  if (input.action === "phase_nav" && input.phaseLocked) {
    // If phase is locked, navigation should NOT have succeeded
    if (input.actualUrl.includes(`/phase/${input.phaseIndex}`)) {
      guardsScore = 0.0;
      failures.push(
        `Locked phase ${input.phaseIndex} was navigable — guard bypassed`
      );
    }
  }

  // --- Progress Bar ---
  let progressBarScore = 1.0;
  if (input.progressBarStates && input.progressBarStates.length > 0) {
    let correct = 0;
    for (const state of input.progressBarStates) {
      if (state.actualState === state.expectedState) {
        correct++;
      } else {
        failures.push(
          `Phase ${state.phaseIndex}: expected "${state.expectedState}", got "${state.actualState}"`
        );
      }
    }
    progressBarScore = correct / input.progressBarStates.length;
  }

  const compositeScore =
    routingScore * 0.40 + guardsScore * 0.35 + progressBarScore * 0.25;

  return {
    testCaseId: input.testCaseId,
    passed: compositeScore >= 0.85 && failures.length === 0,
    score: Math.round(compositeScore * 1000) / 1000,
    dimensions: {
      routing: routingScore,
      guards: guardsScore,
      progress_bar: progressBarScore,
    },
    failures,
  };
}
