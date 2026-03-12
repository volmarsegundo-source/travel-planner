/**
 * Unit tests for the EDD Alert System.
 *
 * Tests alert generation based on trust score thresholds,
 * dimension minimums, safety critical checks, and dispatch.
 *
 * @module tests/evals/alerts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkAlerts,
  dispatchAlerts,
  getAlertConfig,
  type AlertConfig,
  type EvalAlert,
} from "@/lib/evals/alerts";
import type { TrustScoreBreakdown } from "@/lib/evals/types";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeTrustScore(
  overrides: Partial<TrustScoreBreakdown> = {}
): TrustScoreBreakdown {
  return {
    safety: 0.95,
    accuracy: 0.90,
    performance: 0.85,
    ux: 0.80,
    i18n: 0.90,
    composite: 0.89,
    pass: true,
    threshold: 0.8,
    ...overrides,
  };
}

const DEFAULT_CONFIG: AlertConfig = {
  trustScoreThreshold: 0.8,
  dimensionMinimum: 0.6,
  driftMaxDelta: 0.1,
};

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("alerts", () => {
  describe("checkAlerts", () => {
    it("returns empty array when all scores are above thresholds", () => {
      const trustScore = makeTrustScore();
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);
      expect(alerts).toHaveLength(0);
    });

    it("returns warning when composite is below threshold", () => {
      const trustScore = makeTrustScore({ composite: 0.75, pass: false });
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);

      const compositeAlert = alerts.find(
        (a) => a.trigger === "composite_below_threshold"
      );
      expect(compositeAlert).toBeDefined();
      expect(compositeAlert!.severity).toBe("warning");
      expect(compositeAlert!.currentValue).toBe(0.75);
      expect(compositeAlert!.threshold).toBe(0.8);
    });

    it("returns warning when a dimension is below minimum", () => {
      const trustScore = makeTrustScore({ performance: 0.5 });
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);

      const dimAlert = alerts.find(
        (a) =>
          a.trigger === "dimension_below_minimum" &&
          a.dimension === "performance"
      );
      expect(dimAlert).toBeDefined();
      expect(dimAlert!.severity).toBe("warning");
      expect(dimAlert!.currentValue).toBe(0.5);
    });

    it("returns critical when safety is below 0.5", () => {
      const trustScore = makeTrustScore({ safety: 0.3 });
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);

      const criticalAlert = alerts.find(
        (a) => a.trigger === "safety_critical"
      );
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert!.severity).toBe("critical");
      expect(criticalAlert!.dimension).toBe("safety");
      expect(criticalAlert!.currentValue).toBe(0.3);
      expect(criticalAlert!.threshold).toBe(0.5);
    });

    it("returns multiple alerts when multiple thresholds are violated", () => {
      const trustScore = makeTrustScore({
        composite: 0.5,
        pass: false,
        safety: 0.4,
        accuracy: 0.5,
        i18n: 0.3,
      });
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);

      // Should have: composite_below_threshold, safety dim_below, accuracy dim_below,
      // i18n dim_below, safety_critical
      expect(alerts.length).toBeGreaterThanOrEqual(4);
      expect(alerts.some((a) => a.trigger === "composite_below_threshold")).toBe(
        true
      );
      expect(alerts.some((a) => a.trigger === "safety_critical")).toBe(true);
    });

    it("uses custom config thresholds", () => {
      const strictConfig: AlertConfig = {
        trustScoreThreshold: 0.95,
        dimensionMinimum: 0.9,
        driftMaxDelta: 0.05,
      };
      const trustScore = makeTrustScore({ composite: 0.89 });
      const alerts = checkAlerts(trustScore, strictConfig);

      // composite 0.89 < 0.95 => alert
      expect(
        alerts.some((a) => a.trigger === "composite_below_threshold")
      ).toBe(true);
    });

    it("does not trigger safety critical when safety is exactly 0.5", () => {
      const trustScore = makeTrustScore({ safety: 0.5 });
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);

      const criticalAlert = alerts.find(
        (a) => a.trigger === "safety_critical"
      );
      expect(criticalAlert).toBeUndefined();
    });

    it("includes correct alert structure with all required fields", () => {
      const trustScore = makeTrustScore({ composite: 0.7, pass: false });
      const alerts = checkAlerts(trustScore, DEFAULT_CONFIG);

      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert).toHaveProperty("id");
      expect(alert).toHaveProperty("severity");
      expect(alert).toHaveProperty("trigger");
      expect(alert).toHaveProperty("message");
      expect(alert).toHaveProperty("timestamp");
      expect(alert).toHaveProperty("currentValue");
      expect(alert).toHaveProperty("threshold");
      expect(typeof alert.id).toBe("string");
      expect(typeof alert.message).toBe("string");
      expect(typeof alert.timestamp).toBe("string");
    });
  });

  describe("getAlertConfig", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns defaults when no env vars are set", () => {
      delete process.env.EVAL_TRUST_THRESHOLD;
      delete process.env.EVAL_DIMENSION_MIN;
      delete process.env.EVAL_DRIFT_MAX_DELTA;
      delete process.env.EVAL_ALERT_WEBHOOK;

      const config = getAlertConfig();
      expect(config.trustScoreThreshold).toBe(0.8);
      expect(config.dimensionMinimum).toBe(0.6);
      expect(config.driftMaxDelta).toBe(0.1);
      expect(config.webhookUrl).toBeUndefined();
    });

    it("reads custom values from env vars", () => {
      process.env.EVAL_TRUST_THRESHOLD = "0.9";
      process.env.EVAL_DIMENSION_MIN = "0.7";
      process.env.EVAL_DRIFT_MAX_DELTA = "0.05";
      process.env.EVAL_ALERT_WEBHOOK = "https://hooks.example.com/eval";

      const config = getAlertConfig();
      expect(config.trustScoreThreshold).toBe(0.9);
      expect(config.dimensionMinimum).toBe(0.7);
      expect(config.driftMaxDelta).toBe(0.05);
      expect(config.webhookUrl).toBe("https://hooks.example.com/eval");
    });
  });

  describe("dispatchAlerts", () => {
    it("logs each alert as structured JSON to console", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const alerts: EvalAlert[] = [
        {
          id: "test-alert-1",
          severity: "warning",
          trigger: "composite_below_threshold",
          message: "Test alert",
          timestamp: "2026-03-12T00:00:00.000Z",
          currentValue: 0.7,
          threshold: 0.8,
        },
      ];

      await dispatchAlerts(alerts, { ...DEFAULT_CONFIG, webhookUrl: undefined });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedJson.tag).toBe("[EVAL-ALERT]");
      expect(loggedJson.severity).toBe("warning");
      expect(loggedJson.id).toBe("test-alert-1");

      consoleSpy.mockRestore();
    });

    it("logs critical alerts with error level", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const alerts: EvalAlert[] = [
        {
          id: "test-critical-1",
          severity: "critical",
          trigger: "safety_critical",
          message: "Critical safety failure",
          timestamp: "2026-03-12T00:00:00.000Z",
          dimension: "safety",
          currentValue: 0.3,
          threshold: 0.5,
        },
      ];

      await dispatchAlerts(alerts, { ...DEFAULT_CONFIG, webhookUrl: undefined });

      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedJson.level).toBe("error");

      consoleSpy.mockRestore();
    });

    it("does not call webhook when webhookUrl is not configured", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await dispatchAlerts(
        [
          {
            id: "test-1",
            severity: "info",
            trigger: "test",
            message: "Test",
            timestamp: "2026-03-12T00:00:00.000Z",
            currentValue: 0.5,
            threshold: 0.6,
          },
        ],
        { ...DEFAULT_CONFIG, webhookUrl: undefined }
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
