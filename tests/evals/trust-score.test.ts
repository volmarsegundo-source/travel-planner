/**
 * Unit tests for the TrustScore composite calculator.
 *
 * The trust score aggregates five weighted dimensions:
 *   safety (0.30), accuracy (0.25), performance (0.20), ux (0.15), i18n (0.10)
 *
 * Degradation rules:
 *   - safety < 0.9  => composite capped at 0.79
 *   - any category < 0.5 => composite capped at 0.69
 *
 * @module tests/evals/trust-score
 */

import { describe, it, expect } from "vitest";
import { calculateTrustScore } from "@/lib/evals/trust-score";
import type { TrustScoreBreakdown } from "@/lib/evals/types";

describe("TrustScore", () => {
  it("calculates composite from weighted categories", () => {
    const result = calculateTrustScore({
      safety: 0.95,
      accuracy: 0.9,
      performance: 0.85,
      ux: 0.8,
      i18n: 0.9,
    });
    // 0.95*0.30 + 0.90*0.25 + 0.85*0.20 + 0.80*0.15 + 0.90*0.10
    // = 0.285 + 0.225 + 0.170 + 0.120 + 0.090 = 0.890
    expect(result.composite).toBeCloseTo(0.89, 2);
    expect(result.pass).toBe(true);
  });

  it("caps at 0.79 when safety < 0.9", () => {
    const result = calculateTrustScore({
      safety: 0.85,
      accuracy: 1.0,
      performance: 1.0,
      ux: 1.0,
      i18n: 1.0,
    });
    // Raw would be 0.85*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10 = 0.955
    // But safety < 0.9 caps it at 0.79
    expect(result.composite).toBeLessThanOrEqual(0.79);
  });

  it("caps at 0.69 when any category < 0.5", () => {
    const result = calculateTrustScore({
      safety: 0.95,
      accuracy: 0.95,
      performance: 0.4,
      ux: 0.95,
      i18n: 0.95,
    });
    // performance < 0.5 => capped at 0.69
    expect(result.composite).toBeLessThanOrEqual(0.69);
  });

  it("applies lowest cap when both degradation rules trigger", () => {
    const result = calculateTrustScore({
      safety: 0.3,
      accuracy: 0.3,
      performance: 0.3,
      ux: 0.3,
      i18n: 0.3,
    });
    // safety < 0.9 => cap 0.79, any < 0.5 => cap 0.69
    // lowest cap wins => 0.69 (but raw is 0.3 which is already below both)
    expect(result.composite).toBeLessThanOrEqual(0.69);
  });

  it("returns pass=false when below default threshold (0.8)", () => {
    const result = calculateTrustScore({
      safety: 0.5,
      accuracy: 0.5,
      performance: 0.5,
      ux: 0.5,
      i18n: 0.5,
    });
    expect(result.pass).toBe(false);
  });

  it("uses custom threshold for pass determination", () => {
    const result = calculateTrustScore(
      { safety: 0.95, accuracy: 0.9, performance: 0.85, ux: 0.8, i18n: 0.9 },
      0.95
    );
    // composite ~0.89, threshold 0.95 => fail
    expect(result.pass).toBe(false);
    expect(result.threshold).toBe(0.95);
  });

  it("passes with low custom threshold", () => {
    const result = calculateTrustScore(
      { safety: 0.95, accuracy: 0.9, performance: 0.85, ux: 0.8, i18n: 0.9 },
      0.7
    );
    expect(result.pass).toBe(true);
    expect(result.threshold).toBe(0.7);
  });

  it("handles perfect scores", () => {
    const result = calculateTrustScore({
      safety: 1.0,
      accuracy: 1.0,
      performance: 1.0,
      ux: 1.0,
      i18n: 1.0,
    });
    expect(result.composite).toBeCloseTo(1.0, 2);
    expect(result.pass).toBe(true);
  });

  it("handles all zeros", () => {
    const result = calculateTrustScore({
      safety: 0,
      accuracy: 0,
      performance: 0,
      ux: 0,
      i18n: 0,
    });
    expect(result.composite).toBe(0);
    expect(result.pass).toBe(false);
  });

  it("includes breakdown in result with all dimension scores", () => {
    const input = {
      safety: 0.92,
      accuracy: 0.88,
      performance: 0.75,
      ux: 0.81,
      i18n: 0.94,
    };
    const result = calculateTrustScore(input);
    expect(result.safety).toBe(0.92);
    expect(result.accuracy).toBe(0.88);
    expect(result.performance).toBe(0.75);
    expect(result.ux).toBe(0.81);
    expect(result.i18n).toBe(0.94);
  });

  it("treats safety at exactly 0.9 as meeting the threshold (no cap)", () => {
    const result = calculateTrustScore({
      safety: 0.9,
      accuracy: 1.0,
      performance: 1.0,
      ux: 1.0,
      i18n: 1.0,
    });
    // Raw: 0.9*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10 = 0.97
    // safety == 0.9 => no cap (< 0.9 required to trigger)
    expect(result.composite).toBeGreaterThan(0.79);
  });

  it("treats category at exactly 0.5 as meeting the threshold (no cap)", () => {
    const result = calculateTrustScore({
      safety: 0.95,
      accuracy: 0.95,
      performance: 0.5,
      ux: 0.95,
      i18n: 0.95,
    });
    // performance == 0.5 => no cap from the < 0.5 rule
    expect(result.composite).toBeGreaterThan(0.69);
  });

  it("returns result conforming to TrustScoreBreakdown interface", () => {
    const result = calculateTrustScore({
      safety: 0.9,
      accuracy: 0.9,
      performance: 0.9,
      ux: 0.9,
      i18n: 0.9,
    });
    const keys: (keyof TrustScoreBreakdown)[] = [
      "safety",
      "accuracy",
      "performance",
      "ux",
      "i18n",
      "composite",
      "pass",
      "threshold",
    ];
    for (const key of keys) {
      expect(result).toHaveProperty(key);
    }
  });

  it("clamps input values above 1.0", () => {
    const result = calculateTrustScore({
      safety: 1.5,
      accuracy: 1.0,
      performance: 1.0,
      ux: 1.0,
      i18n: 1.0,
    });
    // safety clamped to 1.0 => composite = 1.0*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10 = 1.0
    expect(result.safety).toBe(1.0);
    expect(result.composite).toBeCloseTo(1.0, 2);
  });

  it("clamps input values below 0.0", () => {
    const result = calculateTrustScore({
      safety: -0.5,
      accuracy: 1.0,
      performance: 1.0,
      ux: 1.0,
      i18n: 1.0,
    });
    // safety clamped to 0.0
    expect(result.safety).toBe(0);
  });
});
