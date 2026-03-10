/**
 * Utilities for parsing streaming AI JSON to extract progress information.
 * Used by Phase6Wizard to show a progress UI instead of raw JSON.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const PHASE_ANALYZING_MS = 5_000;
const PHASE_PLANNING_MS = 15_000;
const PHASE_OPTIMIZING_MS = 30_000;

export type ProgressPhase = "analyzing" | "planning" | "optimizing" | "almostDone";

// ─── Progress phase based on elapsed time ────────────────────────────────────

/**
 * Returns the progress phase based on how long the stream has been running.
 */
export function getProgressPhase(elapsedMs: number): ProgressPhase {
  if (elapsedMs < PHASE_ANALYZING_MS) return "analyzing";
  if (elapsedMs < PHASE_PLANNING_MS) return "planning";
  if (elapsedMs < PHASE_OPTIMIZING_MS) return "optimizing";
  return "almostDone";
}

/**
 * Maps a progress phase to its i18n key.
 */
export function getProgressMessageKey(phase: ProgressPhase): string {
  const keyMap: Record<ProgressPhase, string> = {
    analyzing: "progressAnalyzing",
    planning: "progressPlanning",
    optimizing: "progressOptimizing",
    almostDone: "progressAlmostDone",
  };
  return keyMap[phase];
}

// ─── Day count extraction from partial JSON ─────────────────────────────────

/**
 * Counts the number of "dayNumber" occurrences in a partial JSON stream.
 * This is a heuristic: it looks for `"dayNumber":` patterns to infer
 * how many days have been generated so far, without needing full JSON parsing.
 */
export function countDaysInStream(accumulated: string): number {
  const matches = accumulated.match(/"dayNumber"\s*:\s*\d+/g);
  return matches ? matches.length : 0;
}

/**
 * Calculates the total expected days from start and end dates.
 */
export function calculateTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Calculates progress percentage based on days generated vs total expected.
 * Capped at 95% to leave room for the finalization step.
 */
export function calculateProgressPercent(daysGenerated: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  const raw = (daysGenerated / totalDays) * 100;
  return Math.min(95, Math.round(raw));
}
