/**
 * Shared types for the Atlas EDD eval system.
 *
 * All graders return GraderResult. The eval runner produces EvalResult
 * for each individual eval, and TrustScoreBreakdown for composite scoring.
 *
 * @module evals/types
 */

// ─── Grader Result ────────────────────────────────────────────────────────────

/** Standardized return type for all grader functions */
export interface GraderResult {
  /** Whether the output passes the grading threshold */
  pass: boolean;
  /** Normalized score from 0.0 (complete failure) to 1.0 (perfect) */
  score: number;
  /** Human-readable error descriptions */
  errors: string[];
  /** Structured metadata for logging and dashboards */
  details: Record<string, unknown>;
}

// ─── Eval Result ──────────────────────────────────────────────────────────────

/** Result of a single eval execution within a suite */
export interface EvalResult {
  /** Unique identifier for this eval (e.g., "schema-itinerary-001") */
  evalId: string;
  /** Reference to the spec this eval validates (e.g., "SPEC-AI-001") */
  specRef: string;
  /** Type of grader used */
  graderType: "code" | "llm-judge" | "human";
  /** ISO 8601 timestamp of when the eval was executed */
  timestamp: string;
  /** Normalized score from 0.0 to 1.0 */
  score: number;
  /** Whether this eval passed its threshold */
  pass: boolean;
  /** Named numeric metrics captured during the eval */
  metrics: Record<string, number>;
  /** Error messages if the eval failed */
  errors: string[];
  /** Wall-clock duration in milliseconds */
  durationMs: number;
}

// ─── Trust Score ──────────────────────────────────────────────────────────────

/** Breakdown of the composite trust score across five categories */
export interface TrustScoreBreakdown {
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
  /** Weighted composite score (0-1) */
  composite: number;
  /** Whether the composite score meets the threshold */
  pass: boolean;
  /** The threshold used for pass/fail determination */
  threshold: number;
}
