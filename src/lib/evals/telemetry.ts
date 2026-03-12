/**
 * EDD Telemetry -- structured JSON logs for eval results.
 *
 * Emits structured log lines that are parsed by Vercel, Datadog, and other
 * log aggregation platforms. Never logs PII or secrets.
 *
 * Usage:
 *   import { emitEvalTelemetry, createEvalTelemetryEvent } from "@/lib/evals/telemetry";
 *
 *   const event = createEvalTelemetryEvent("EVAL-AI-001", "SPEC-AI-001", {
 *     score: 0.92,
 *     pass: true,
 *     errors: [],
 *     durationMs: 1200,
 *   });
 *   emitEvalTelemetry(event);
 */

export interface EvalTelemetryEvent {
  timestamp: string;
  event: "eval.run" | "eval.pass" | "eval.fail" | "trust_score.computed";
  evalId: string;
  specRef: string;
  score: number;
  pass: boolean;
  metrics: Record<string, number>;
  model?: string;
  tokensUsed?: number;
  durationMs: number;
  version: string;
}

/**
 * Emit a single eval telemetry event as a structured JSON log line.
 * Vercel and similar platforms parse JSON from stdout automatically.
 */
export function emitEvalTelemetry(event: EvalTelemetryEvent): void {
  const logEntry = {
    level: event.pass ? "info" : "warn",
    service: "travel-planner",
    ...event,
  };
  // Single-line JSON -- structured log, never plaintext
  console.log(JSON.stringify(logEntry));
}

/**
 * Factory to build an EvalTelemetryEvent from eval result data.
 *
 * Reads the app version from the constant below rather than requiring
 * a runtime fs read of package.json (keeps this module edge-safe).
 */
const APP_VERSION = "0.22.0";

export function createEvalTelemetryEvent(
  evalId: string,
  specRef: string,
  result: {
    score: number;
    pass: boolean;
    errors: string[];
    durationMs: number;
  },
  meta?: { model?: string; tokensUsed?: number }
): EvalTelemetryEvent {
  return {
    timestamp: new Date().toISOString(),
    event: result.pass ? "eval.pass" : "eval.fail",
    evalId,
    specRef,
    score: result.score,
    pass: result.pass,
    metrics: {
      errorCount: result.errors.length,
    },
    model: meta?.model,
    tokensUsed: meta?.tokensUsed,
    durationMs: result.durationMs,
    version: APP_VERSION,
  };
}

/**
 * Build and emit a composite trust score event from multiple eval results.
 */
export function emitTrustScoreEvent(
  scores: Array<{ evalId: string; score: number; pass: boolean }>,
  durationMs: number
): void {
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const composite = scores.length > 0 ? totalScore / scores.length : 0;
  const allPassed = scores.every((s) => s.pass);

  const event: EvalTelemetryEvent = {
    timestamp: new Date().toISOString(),
    event: "trust_score.computed",
    evalId: "TRUST-COMPOSITE",
    specRef: "EDD-FRAMEWORK",
    score: composite,
    pass: allPassed,
    metrics: {
      evalCount: scores.length,
      passedCount: scores.filter((s) => s.pass).length,
      failedCount: scores.filter((s) => !s.pass).length,
    },
    durationMs,
    version: APP_VERSION,
  };

  emitEvalTelemetry(event);
}
