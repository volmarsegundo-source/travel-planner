/**
 * Eval Suite Runner
 *
 * Orchestrates execution of multiple evals, captures timing,
 * and produces structured JSON results. Optionally computes
 * a composite trust score.
 *
 * @module evals/eval-runner
 */

import type { EvalResult, GraderResult, TrustScoreBreakdown } from "./types";
import {
  calculateTrustScore,
  type TrustScoreInputs,
} from "./trust-score";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EvalDefinition {
  /** Unique identifier for this eval (e.g., "schema-itinerary-001") */
  id: string;
  /** Reference to the spec this eval validates (e.g., "SPEC-AI-001") */
  specRef: string;
  /** The grader function to execute */
  run: () => Promise<GraderResult>;
}

export interface EvalSuiteConfig {
  /** Human-readable name for this eval suite */
  name: string;
  /** Array of eval definitions to run */
  evals: EvalDefinition[];
  /** Optional trust score inputs — if provided, composite is calculated */
  trustScoreInputs?: TrustScoreInputs;
  /** Optional threshold for trust score (default: 0.8) */
  trustScoreThreshold?: number;
}

export interface EvalSuiteResult {
  /** Name of the suite that was executed */
  suite: string;
  /** ISO 8601 timestamp of when the suite started */
  timestamp: string;
  /** Individual eval results */
  results: EvalResult[];
  /** Trust score breakdown, if inputs were provided */
  trustScore: TrustScoreBreakdown | null;
  /** Total wall-clock duration in milliseconds */
  durationMs: number;
}

// ─── Runner ─────────────────────────────────────────────────────────────────────

/**
 * Runs all evals in a suite sequentially, capturing timing and results.
 *
 * Evals are run sequentially (not in parallel) to avoid resource
 * contention when evals hit external services (LLM APIs, databases).
 *
 * Each eval is wrapped in error handling so a failing eval does not
 * abort the entire suite.
 *
 * @param config - Suite configuration with eval definitions
 * @returns Structured results including timing and optional trust score
 */
export async function runEvalSuite(
  config: EvalSuiteConfig
): Promise<EvalSuiteResult> {
  const suiteStart = Date.now();
  const timestamp = new Date().toISOString();
  const results: EvalResult[] = [];

  for (const evalDef of config.evals) {
    const evalStart = Date.now();
    let graderResult: GraderResult;

    try {
      graderResult = await evalDef.run();
    } catch (err) {
      graderResult = {
        pass: false,
        score: 0,
        errors: [
          `Eval threw an unhandled error: ${err instanceof Error ? err.message : String(err)}`,
        ],
        details: { unhandledError: true },
      };
    }

    const durationMs = Date.now() - evalStart;

    // Extract numeric metrics from details
    const metrics: Record<string, number> = {};
    if (
      graderResult.details &&
      typeof graderResult.details === "object"
    ) {
      for (const [key, value] of Object.entries(graderResult.details)) {
        if (typeof value === "number") {
          metrics[key] = value;
        }
      }
    }

    results.push({
      evalId: evalDef.id,
      specRef: evalDef.specRef,
      graderType: inferGraderType(evalDef.id),
      timestamp,
      score: graderResult.score,
      pass: graderResult.pass,
      metrics,
      errors: graderResult.errors,
      durationMs,
    });
  }

  // Calculate trust score if inputs are provided
  let trustScore: TrustScoreBreakdown | null = null;
  if (config.trustScoreInputs) {
    trustScore = calculateTrustScore(
      config.trustScoreInputs,
      config.trustScoreThreshold
    );
  }

  const suiteDurationMs = Date.now() - suiteStart;

  return {
    suite: config.name,
    timestamp,
    results,
    trustScore,
    durationMs: suiteDurationMs,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Infers the grader type from the eval ID naming convention.
 * - IDs containing "llm" or "judge" -> "llm-judge"
 * - IDs containing "human" -> "human"
 * - Everything else -> "code"
 */
function inferGraderType(evalId: string): "code" | "llm-judge" | "human" {
  const lower = evalId.toLowerCase();
  if (lower.includes("llm") || lower.includes("judge")) return "llm-judge";
  if (lower.includes("human")) return "human";
  return "code";
}
