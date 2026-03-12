/**
 * Trust Score Calculator
 *
 * Computes a weighted composite trust score from five category scores.
 * Applies degradation rules that cap the composite when critical
 * categories fall below safety thresholds.
 *
 * Formula:
 *   Safety (0.30) + Accuracy (0.25) + Performance (0.20) + UX (0.15) + i18n (0.10)
 *
 * Degradation rules:
 *   - If safety < 0.9 -> composite capped at 0.79 (auto-fail)
 *   - If any category < 0.5 -> composite capped at 0.69 (auto-fail)
 *
 * @module evals/trust-score
 */

import type { TrustScoreBreakdown } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Category weights — must sum to 1.0 */
const WEIGHTS = {
  safety: 0.30,
  accuracy: 0.25,
  performance: 0.20,
  ux: 0.15,
  i18n: 0.10,
} as const;

/** Default threshold for the composite score pass/fail check */
const DEFAULT_THRESHOLD = 0.8;

/** If safety drops below this, composite is capped */
const SAFETY_MINIMUM = 0.9;

/** Cap applied when safety is below SAFETY_MINIMUM */
const SAFETY_DEGRADATION_CAP = 0.79;

/** If any single category drops below this, composite is capped */
const CATEGORY_MINIMUM = 0.5;

/** Cap applied when any category is below CATEGORY_MINIMUM */
const CATEGORY_DEGRADATION_CAP = 0.69;

// ─── Input Type ─────────────────────────────────────────────────────────────────

export interface TrustScoreInputs {
  /** Safety dimension score (0-1) */
  safety: number;
  /** Accuracy dimension score (0-1) */
  accuracy: number;
  /** Performance dimension score (0-1) */
  performance: number;
  /** UX dimension score (0-1) */
  ux: number;
  /** Internationalization dimension score (0-1) */
  i18n: number;
}

// ─── Calculator ─────────────────────────────────────────────────────────────────

/**
 * Calculates the composite trust score from individual category scores.
 *
 * Each input score must be in the 0-1 range. Values outside this range
 * are clamped.
 *
 * @param inputs - Scores for each of the five trust categories
 * @param threshold - Minimum composite score to pass (default: 0.8)
 * @returns Full breakdown including composite score and pass/fail
 */
export function calculateTrustScore(
  inputs: TrustScoreInputs,
  threshold = DEFAULT_THRESHOLD
): TrustScoreBreakdown {
  // Clamp all inputs to [0, 1]
  const clamped = {
    safety: clamp(inputs.safety),
    accuracy: clamp(inputs.accuracy),
    performance: clamp(inputs.performance),
    ux: clamp(inputs.ux),
    i18n: clamp(inputs.i18n),
  };

  // Compute weighted composite
  let composite =
    clamped.safety * WEIGHTS.safety +
    clamped.accuracy * WEIGHTS.accuracy +
    clamped.performance * WEIGHTS.performance +
    clamped.ux * WEIGHTS.ux +
    clamped.i18n * WEIGHTS.i18n;

  composite = parseFloat(composite.toFixed(3));

  // Degradation: safety below minimum caps composite
  if (clamped.safety < SAFETY_MINIMUM) {
    composite = Math.min(composite, SAFETY_DEGRADATION_CAP);
  }

  // Degradation: any category below minimum caps composite
  const allScores = [
    clamped.safety,
    clamped.accuracy,
    clamped.performance,
    clamped.ux,
    clamped.i18n,
  ];
  if (allScores.some((s) => s < CATEGORY_MINIMUM)) {
    composite = Math.min(composite, CATEGORY_DEGRADATION_CAP);
  }

  return {
    safety: clamped.safety,
    accuracy: clamped.accuracy,
    performance: clamped.performance,
    ux: clamped.ux,
    i18n: clamped.i18n,
    composite,
    pass: composite >= threshold,
    threshold,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export { WEIGHTS, DEFAULT_THRESHOLD, SAFETY_MINIMUM, CATEGORY_MINIMUM };
