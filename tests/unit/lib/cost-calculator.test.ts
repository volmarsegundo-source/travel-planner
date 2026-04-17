import { describe, it, expect } from "vitest";
import { calculateEstimatedCost } from "@/lib/cost-calculator";

describe("calculateEstimatedCost", () => {
  describe("claude-sonnet-4-6 pricing ($3/1M input, $15/1M output)", () => {
    const model = "claude-sonnet-4-6";

    it("calculates cost for a typical plan generation", () => {
      // 1000 input tokens, 2000 output tokens, no cache
      const cost = calculateEstimatedCost(model, 1000, 2000);

      // Input: 1000 * 3 / 1_000_000 = 0.003
      expect(cost.inputCost).toBe(0.003);
      // Output: 2000 * 15 / 1_000_000 = 0.03
      expect(cost.outputCost).toBe(0.03);
      expect(cost.cacheSavings).toBe(0);
      expect(cost.totalCost).toBe(0.033);
    });

    it("calculates cost with cache read (90% discount)", () => {
      // 1000 total input, 800 from cache read, 200 regular
      const cost = calculateEstimatedCost(model, 1000, 500, 800);

      // Regular input: 200 * 3 / 1M = 0.0006
      // Cache read: 800 * 3 / 1M * 0.1 = 0.00024
      // Total input: 0.00084
      expect(cost.inputCost).toBe(0.00084);
      // Output: 500 * 15 / 1M = 0.0075
      expect(cost.outputCost).toBe(0.0075);
      // Savings: full input cost (0.003) - actual input cost (0.00084) = 0.00216
      expect(cost.cacheSavings).toBe(0.00216);
      expect(cost.totalCost).toBe(0.00834);
    });

    it("calculates cost with cache write (25% premium)", () => {
      // 1000 total input, 500 cache write, 500 regular
      const cost = calculateEstimatedCost(model, 1000, 500, 0, 500);

      // Regular input: 500 * 3 / 1M = 0.0015
      // Cache write: 500 * 3 / 1M * 1.25 = 0.001875
      // Total input: 0.003375
      expect(cost.inputCost).toBe(0.003375);
      // Output: 500 * 15 / 1M = 0.0075
      expect(cost.outputCost).toBe(0.0075);
      // Cache write is more expensive, so no savings
      expect(cost.cacheSavings).toBe(0);
      expect(cost.totalCost).toBe(0.010875);
    });

    it("calculates cost with both cache read and write", () => {
      // 2000 total input, 1000 cache read, 500 cache write, 500 regular
      const cost = calculateEstimatedCost(model, 2000, 1000, 1000, 500);

      // Regular input: 500 * 3 / 1M = 0.0015
      // Cache read: 1000 * 3 / 1M * 0.1 = 0.0003
      // Cache write: 500 * 3 / 1M * 1.25 = 0.001875
      // Total input: 0.003675
      expect(cost.inputCost).toBe(0.003675);
      // Output: 1000 * 15 / 1M = 0.015
      expect(cost.outputCost).toBe(0.015);
      // Full cost without cache: 2000 * 3 / 1M = 0.006
      // Savings: 0.006 - 0.003675 = 0.002325
      expect(cost.cacheSavings).toBe(0.002325);
      expect(cost.totalCost).toBe(0.018675);
    });
  });

  describe("claude-haiku-4-5-20251001 pricing ($1/1M input, $5/1M output)", () => {
    const model = "claude-haiku-4-5-20251001";

    it("calculates cost for a typical checklist generation", () => {
      const cost = calculateEstimatedCost(model, 500, 1000);

      // Input: 500 * 1 / 1M = 0.0005
      expect(cost.inputCost).toBe(0.0005);
      // Output: 1000 * 5 / 1M = 0.005
      expect(cost.outputCost).toBe(0.005);
      expect(cost.totalCost).toBe(0.0055);
    });

    it("calculates cost with cache read", () => {
      const cost = calculateEstimatedCost(model, 1000, 500, 600);

      // Regular input: 400 * 1 / 1M = 0.0004
      // Cache read: 600 * 1 / 1M * 0.1 = 0.00006
      // Total input: 0.00046
      expect(cost.inputCost).toBe(0.00046);
      // Output: 500 * 5 / 1M = 0.0025
      expect(cost.outputCost).toBe(0.0025);
      expect(cost.totalCost).toBe(0.00296);
    });
  });

  describe("edge cases", () => {
    it("returns zero costs for unknown model", () => {
      const cost = calculateEstimatedCost("unknown-model", 1000, 1000);
      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.cacheSavings).toBe(0);
      expect(cost.totalCost).toBe(0);
    });

    it("handles zero tokens", () => {
      const cost = calculateEstimatedCost("claude-sonnet-4-6", 0, 0);
      expect(cost.totalCost).toBe(0);
    });

    it("handles optional cache parameters as undefined", () => {
      const cost = calculateEstimatedCost("claude-sonnet-4-6", 100, 100, undefined, undefined);
      // Input: 100 * 3 / 1M = 0.0003
      // Output: 100 * 15 / 1M = 0.0015
      expect(cost.inputCost).toBe(0.0003);
      expect(cost.outputCost).toBe(0.0015);
      expect(cost.totalCost).toBe(0.0018);
    });

    it("returns costs with 6 decimal places", () => {
      const cost = calculateEstimatedCost("claude-sonnet-4-6", 1, 1);
      // Input: 1 * 3 / 1M = 0.000003
      expect(cost.inputCost).toBe(0.000003);
      // Output: 1 * 15 / 1M = 0.000015
      expect(cost.outputCost).toBe(0.000015);
      expect(cost.totalCost).toBe(0.000018);
    });
  });
});
