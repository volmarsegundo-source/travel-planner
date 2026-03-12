/**
 * EDD Alert System
 *
 * Checks trust score breakdowns for threshold violations and emits
 * structured alerts. Supports console logging (always) and optional
 * webhook dispatch for external integrations (Slack, PagerDuty, etc.).
 *
 * Alert triggers:
 *   1. Composite score below trust score threshold
 *   2. Any dimension below the dimension minimum
 *   3. Safety critical (< 0.5) — always severity "critical"
 *
 * @module evals/alerts
 */

import type { TrustScoreBreakdown } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EvalAlert {
  /** Unique alert identifier */
  id: string;
  /** Alert severity level */
  severity: "critical" | "warning" | "info";
  /** What triggered the alert */
  trigger: string;
  /** Human-readable alert message */
  message: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Trust score dimension that triggered the alert, if applicable */
  dimension?: string;
  /** Current value of the metric that triggered the alert */
  currentValue: number;
  /** Threshold that was violated */
  threshold: number;
}

export interface AlertConfig {
  /** Minimum acceptable composite trust score (default: 0.8) */
  trustScoreThreshold: number;
  /** Minimum acceptable score for any single dimension (default: 0.6) */
  dimensionMinimum: number;
  /** Maximum allowable score drift between runs (default: 0.1) */
  driftMaxDelta: number;
  /** Optional webhook URL for external alert dispatch */
  webhookUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DIMENSIONS = ["safety", "accuracy", "performance", "ux", "i18n"] as const;

/** Safety scores below this are always critical regardless of other thresholds */
const SAFETY_CRITICAL_THRESHOLD = 0.5;

/** Timeout for webhook HTTP requests in milliseconds */
const WEBHOOK_TIMEOUT_MS = 5000;

// ─── Config ─────────────────────────────────────────────────────────────────────

/**
 * Builds an AlertConfig from environment variables with sensible defaults.
 */
export function getAlertConfig(): AlertConfig {
  return {
    trustScoreThreshold: parseFloat(process.env.EVAL_TRUST_THRESHOLD || "0.8"),
    dimensionMinimum: parseFloat(process.env.EVAL_DIMENSION_MIN || "0.6"),
    driftMaxDelta: parseFloat(process.env.EVAL_DRIFT_MAX_DELTA || "0.1"),
    webhookUrl: process.env.EVAL_ALERT_WEBHOOK || undefined,
  };
}

// ─── Alert Checker ──────────────────────────────────────────────────────────────

/**
 * Evaluates a trust score breakdown against thresholds and returns any triggered alerts.
 *
 * @param trustScore - The trust score breakdown to check
 * @param config - Alert configuration (defaults to env-based config)
 * @returns Array of triggered alerts, empty if all thresholds are met
 */
export function checkAlerts(
  trustScore: TrustScoreBreakdown,
  config?: AlertConfig
): EvalAlert[] {
  const resolvedConfig = config ?? getAlertConfig();
  const alerts: EvalAlert[] = [];
  const now = new Date().toISOString();

  // 1. Composite score below threshold
  if (trustScore.composite < resolvedConfig.trustScoreThreshold) {
    alerts.push({
      id: `alert-composite-${Date.now()}`,
      severity: "warning",
      trigger: "composite_below_threshold",
      message: `Composite trust score ${(trustScore.composite * 100).toFixed(1)}% is below threshold ${(resolvedConfig.trustScoreThreshold * 100).toFixed(1)}%`,
      timestamp: now,
      currentValue: trustScore.composite,
      threshold: resolvedConfig.trustScoreThreshold,
    });
  }

  // 2. Check each dimension against the minimum
  for (const dim of DIMENSIONS) {
    const score = trustScore[dim];

    if (score < resolvedConfig.dimensionMinimum) {
      alerts.push({
        id: `alert-dim-${dim}-${Date.now()}`,
        severity: "warning",
        trigger: "dimension_below_minimum",
        message: `Dimension "${dim}" score ${(score * 100).toFixed(1)}% is below minimum ${(resolvedConfig.dimensionMinimum * 100).toFixed(1)}%`,
        timestamp: now,
        dimension: dim,
        currentValue: score,
        threshold: resolvedConfig.dimensionMinimum,
      });
    }
  }

  // 3. Safety critical — always "critical" severity
  if (trustScore.safety < SAFETY_CRITICAL_THRESHOLD) {
    alerts.push({
      id: `alert-safety-critical-${Date.now()}`,
      severity: "critical",
      trigger: "safety_critical",
      message: `CRITICAL: Safety score ${(trustScore.safety * 100).toFixed(1)}% is below critical threshold ${(SAFETY_CRITICAL_THRESHOLD * 100).toFixed(1)}%`,
      timestamp: now,
      dimension: "safety",
      currentValue: trustScore.safety,
      threshold: SAFETY_CRITICAL_THRESHOLD,
    });
  }

  return alerts;
}

// ─── Alert Dispatcher ───────────────────────────────────────────────────────────

/**
 * Dispatches alerts via console logging and optional webhook.
 *
 * Console logging always happens (structured JSON with [EVAL-ALERT] tag).
 * Webhook dispatch only occurs when webhookUrl is configured.
 *
 * @param alerts - Array of alerts to dispatch
 * @param config - Alert configuration (defaults to env-based config)
 */
export async function dispatchAlerts(
  alerts: EvalAlert[],
  config?: AlertConfig
): Promise<void> {
  const resolvedConfig = config ?? getAlertConfig();

  // Always log each alert as structured JSON
  for (const alert of alerts) {
    const logEntry = {
      tag: "[EVAL-ALERT]",
      level: alert.severity === "critical" ? "error" : "warn",
      ...alert,
    };
    console.log(JSON.stringify(logEntry));
  }

  // If webhook is configured, POST the alerts
  if (resolvedConfig.webhookUrl && alerts.length > 0) {
    try {
      const response = await fetch(resolvedConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "travel-planner-edd",
          timestamp: new Date().toISOString(),
          alertCount: alerts.length,
          alerts,
        }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.error(
          `[EVAL-ALERT] Webhook dispatch failed: HTTP ${response.status}`
        );
      }
    } catch (err) {
      console.error(
        `[EVAL-ALERT] Webhook dispatch error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
