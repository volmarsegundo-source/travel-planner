/**
 * EVAL-AI-002: LLM-as-Judge grader tests.
 *
 * Tests the LLM judge grading pipeline with mocked judge calls.
 * No real Anthropic API calls are made -- all judge responses are synthetic.
 *
 * The actual grader signature:
 *   gradeWithLlmJudge(itineraryJson: string, evalContext: EvalContext, callJudge: CallJudgeFn, passThreshold?)
 *   CallJudgeFn = (systemPrompt: string, userPrompt: string) => Promise<string>
 *   estimateJudgeCost() => { inputTokens, outputTokens, estimatedUSD }
 *
 * @module tests/evals/llm-judge
 */

import { describe, it, expect, vi } from "vitest";
import {
  gradeWithLlmJudge,
  estimateJudgeCost,
  type EvalContext,
  type CallJudgeFn,
} from "@/lib/evals/llm-judge.grader";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMockJudgeResponse(
  overrides: Record<string, unknown> = {}
): string {
  const base = {
    dimensions: [
      { dimension: "structure", score: 5, rationale: "Perfect structure" },
      { dimension: "relevance", score: 4, rationale: "Mostly relevant" },
      { dimension: "coherence", score: 5, rationale: "Very coherent" },
      {
        dimension: "cultural_sensitivity",
        score: 4,
        rationale: "Good cultural awareness",
      },
      {
        dimension: "budget_awareness",
        score: 3,
        rationale: "Budget loosely respected",
      },
      { dimension: "safety", score: 5, rationale: "No safety issues" },
    ],
    overall_impression: "Good itinerary with minor budget concerns",
    ...overrides,
  };
  return JSON.stringify(base);
}

function makeItineraryJson(): string {
  return JSON.stringify({
    destination: "Paris, France",
    totalDays: 3,
    estimatedBudgetUsed: 1000,
    currency: "USD",
    days: [
      {
        dayNumber: 1,
        date: "2026-07-15",
        theme: "Arrival",
        activities: [
          {
            title: "Check in",
            description: "Hotel check-in",
            startTime: "14:00",
            endTime: "15:00",
            estimatedCost: 0,
            activityType: "LOGISTICS",
          },
        ],
      },
    ],
    tips: ["Tip 1"],
  });
}

function makeContext(overrides: Partial<EvalContext> = {}): EvalContext {
  return {
    destination: "Paris",
    tripDays: 3,
    travelers: "2 adults",
    budget: "moderate",
    language: "en",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EVAL-AI-002: LLM-as-Judge", () => {
  it("scores itinerary using judge rubric", async () => {
    const mockCallJudge: CallJudgeFn = vi.fn().mockResolvedValue(makeMockJudgeResponse());

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.errors).toHaveLength(0);
    expect(mockCallJudge).toHaveBeenCalledOnce();
  });

  it("handles malformed judge output gracefully", async () => {
    const mockCallJudge: CallJudgeFn = vi
      .fn()
      .mockResolvedValue("this is not valid JSON at all");

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e: string) =>
        e.toLowerCase().includes("parse") ||
        e.toLowerCase().includes("json") ||
        e.toLowerCase().includes("failed")
      )
    ).toBe(true);
  });

  it("fails when safety score is critically low (score 1)", async () => {
    const lowSafety = makeMockJudgeResponse({
      dimensions: [
        { dimension: "structure", score: 5, rationale: "OK" },
        { dimension: "relevance", score: 5, rationale: "OK" },
        { dimension: "coherence", score: 5, rationale: "OK" },
        { dimension: "cultural_sensitivity", score: 5, rationale: "OK" },
        { dimension: "budget_awareness", score: 5, rationale: "OK" },
        { dimension: "safety", score: 1, rationale: "Dangerous recommendations" },
      ],
    });
    const mockCallJudge: CallJudgeFn = vi.fn().mockResolvedValue(lowSafety);

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.pass).toBe(false);
    expect(result.errors.some((e: string) => e.toLowerCase().includes("safety"))).toBe(true);
  });

  it("estimates cost correctly", () => {
    const cost = estimateJudgeCost();
    expect(cost).toHaveProperty("inputTokens");
    expect(cost).toHaveProperty("outputTokens");
    expect(cost).toHaveProperty("estimatedUSD");
    expect(cost.inputTokens + cost.outputTokens).toBeLessThan(5000);
    expect(cost.estimatedUSD).toBeLessThan(0.01);
  });

  it("handles judge returning missing dimensions", async () => {
    const missingDims = JSON.stringify({
      dimensions: [
        { dimension: "structure", score: 5, rationale: "OK" },
        // Missing 5 other required dimensions
      ],
      overall_impression: "Incomplete",
    });
    const mockCallJudge: CallJudgeFn = vi.fn().mockResolvedValue(missingDims);

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("handles judge call rejection", async () => {
    const mockCallJudge: CallJudgeFn = vi
      .fn()
      .mockRejectedValue(new Error("API rate limit"));

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("rate limit");
  });

  it("passes system and user prompts to the judge call", async () => {
    const mockCallJudge: CallJudgeFn = vi.fn().mockResolvedValue(makeMockJudgeResponse());
    const context = makeContext({ destination: "Tokyo", tripDays: 7 });

    await gradeWithLlmJudge(makeItineraryJson(), context, mockCallJudge);

    expect(mockCallJudge).toHaveBeenCalledOnce();
    const [systemPrompt, userPrompt] = (mockCallJudge as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(typeof systemPrompt).toBe("string");
    expect(typeof userPrompt).toBe("string");
    // System prompt should contain rubric info
    expect(systemPrompt).toContain("structure");
    expect(systemPrompt).toContain("safety");
    // User prompt should contain destination context
    expect(userPrompt).toContain("Tokyo");
    expect(userPrompt).toContain("7");
  });

  it("normalizes scores to 0-1 range", async () => {
    const allFives = makeMockJudgeResponse({
      dimensions: [
        { dimension: "structure", score: 5, rationale: "OK" },
        { dimension: "relevance", score: 5, rationale: "OK" },
        { dimension: "coherence", score: 5, rationale: "OK" },
        { dimension: "cultural_sensitivity", score: 5, rationale: "OK" },
        { dimension: "budget_awareness", score: 5, rationale: "OK" },
        { dimension: "safety", score: 5, rationale: "OK" },
      ],
    });
    const mockCallJudge: CallJudgeFn = vi.fn().mockResolvedValue(allFives);

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.score).toBeLessThanOrEqual(1.0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.pass).toBe(true);
  });

  it("handles markdown code-fenced judge output", async () => {
    const fenced = "```json\n" + makeMockJudgeResponse() + "\n```";
    const mockCallJudge: CallJudgeFn = vi.fn().mockResolvedValue(fenced);

    const result = await gradeWithLlmJudge(
      makeItineraryJson(),
      makeContext(),
      mockCallJudge
    );

    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });
});
