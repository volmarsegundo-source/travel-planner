/**
 * EVAL-PERF-001: Token Budget grader tests.
 *
 * Validates that AI feature calls stay within their allocated token
 * and cost budgets. The grader checks four constraints:
 *   1. Input tokens within budget
 *   2. Output tokens within budget
 *   3. Estimated cost within budget
 *   4. Response time within SLA
 *
 * Each constraint contributes 0.25 to the score. Truncation caps at 0.5.
 *
 * @module tests/evals/token-budget
 */

import { describe, it, expect } from "vitest";
import {
  gradeTokenBudget,
  TOKEN_BUDGETS,
  type TokenUsage,
  type PerformanceMetrics,
  type FeatureType,
} from "@/lib/evals/token-budget.grader";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUsage(overrides: Partial<TokenUsage> = {}): TokenUsage {
  return {
    inputTokens: 500,
    outputTokens: 1000,
    ...overrides,
  };
}

function makePerf(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
  return {
    responseTimeMs: 2000,
    wasTruncated: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EVAL-PERF-001: Token Budget", () => {
  it("passes when all constraints are within budget", () => {
    const result = gradeTokenBudget(
      makeUsage(),
      "itinerary_generation",
      makePerf()
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when input tokens exceed budget", () => {
    const budget = TOKEN_BUDGETS.itinerary_generation;
    const result = gradeTokenBudget(
      makeUsage({ inputTokens: budget.maxInputTokens + 1000 }),
      "itinerary_generation",
      makePerf()
    );
    expect(result.pass).toBe(false);
    expect(result.errors.some((e: string) => e.toLowerCase().includes("input"))).toBe(true);
  });

  it("fails when output tokens exceed budget", () => {
    const budget = TOKEN_BUDGETS.itinerary_generation;
    const result = gradeTokenBudget(
      makeUsage({ outputTokens: budget.maxOutputTokens + 5000 }),
      "itinerary_generation",
      makePerf()
    );
    expect(result.pass).toBe(false);
    expect(result.errors.some((e: string) => e.toLowerCase().includes("output"))).toBe(true);
  });

  it("fails when estimated cost exceeds budget", () => {
    // Use extremely high token counts to push cost over budget
    const budget = TOKEN_BUDGETS.chat_response;
    const result = gradeTokenBudget(
      makeUsage({
        inputTokens: budget.maxInputTokens,
        outputTokens: budget.maxOutputTokens * 100, // way over
      }),
      "chat_response",
      makePerf()
    );
    expect(result.pass).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("caps score at 0.5 for truncated response", () => {
    const result = gradeTokenBudget(
      makeUsage(),
      "itinerary_generation",
      makePerf({ wasTruncated: true })
    );
    expect(result.score).toBeLessThanOrEqual(0.5);
    expect(result.pass).toBe(false);
  });

  it("fails when response time exceeds SLA", () => {
    const budget = TOKEN_BUDGETS.chat_response;
    const result = gradeTokenBudget(
      makeUsage(),
      "chat_response",
      makePerf({ responseTimeMs: budget.maxResponseTimeMs + 5000 })
    );
    expect(result.pass).toBe(false);
    expect(result.errors.some((e: string) => e.toLowerCase().includes("response time"))).toBe(true);
  });

  it("passes with exact budget limits", () => {
    const budget = TOKEN_BUDGETS.itinerary_generation;
    const result = gradeTokenBudget(
      makeUsage({
        inputTokens: budget.maxInputTokens,
        outputTokens: budget.maxOutputTokens,
      }),
      "itinerary_generation",
      makePerf({ responseTimeMs: budget.maxResponseTimeMs })
    );
    // At-limit values should pass (not exceed)
    expect(result.score).toBeGreaterThan(0);
  });

  it.each([
    "itinerary_generation",
    "guide_generation",
    "checklist_generation",
    "chat_response",
  ] as const)("validates budget for %s with valid usage", (featureType: FeatureType) => {
    const result = gradeTokenBudget(
      makeUsage({ inputTokens: 100, outputTokens: 200 }),
      featureType,
      makePerf({ responseTimeMs: 1000 })
    );
    expect(result).toHaveProperty("pass");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("details");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("includes feature type and budget details in result", () => {
    const result = gradeTokenBudget(
      makeUsage(),
      "guide_generation",
      makePerf()
    );
    expect(result.details).toHaveProperty("featureType", "guide_generation");
    expect(result.details).toHaveProperty("budget");
    expect(result.details).toHaveProperty("actual");
  });

  it("reports multiple exceeded limits in errors", () => {
    const budget = TOKEN_BUDGETS.chat_response;
    const result = gradeTokenBudget(
      makeUsage({
        inputTokens: budget.maxInputTokens + 10000,
        outputTokens: budget.maxOutputTokens + 10000,
      }),
      "chat_response",
      makePerf({
        responseTimeMs: budget.maxResponseTimeMs + 50000,
        wasTruncated: true,
      })
    );
    expect(result.pass).toBe(false);
    // Should report at least input, output, and response time errors + truncation
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("defaults to no truncation and 0ms response when performance is omitted", () => {
    const result = gradeTokenBudget(
      makeUsage({ inputTokens: 100, outputTokens: 200 }),
      "itinerary_generation"
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });
});
