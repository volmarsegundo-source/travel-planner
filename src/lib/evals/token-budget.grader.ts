/**
 * Token Budget Grader
 *
 * Verifies that AI operations stay within predefined token and cost budgets.
 * Budgets are derived from the production constants in ai.service.ts and
 * the Anthropic pricing model.
 *
 * This grader is deterministic (no LLM call) and should run on every
 * eval iteration to catch prompt bloat or model regression early.
 *
 * @eval-type code
 * @metrics latency, cost, token_usage
 */

import type { GraderResult } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Token usage snapshot from an AI provider response */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/** Performance metrics for the AI call */
export interface PerformanceMetrics {
  /** Wall-clock time in milliseconds from request start to last byte */
  responseTimeMs: number;
  /** Whether the response was truncated by hitting max_tokens */
  wasTruncated: boolean;
}

export type FeatureType =
  | "itinerary_generation"
  | "guide_generation"
  | "checklist_generation"
  | "chat_response";

// ─── Budget Definitions ─────────────────────────────────────────────────────────

export interface TokenBudget {
  /** Maximum allowed input tokens (prompt + system prompt) */
  maxInputTokens: number;
  /** Maximum allowed output tokens (model response) */
  maxOutputTokens: number;
  /** Maximum allowed cost in USD per single invocation */
  maxCostUSD: number;
  /** Maximum allowed response time in milliseconds */
  maxResponseTimeMs: number;
}

const TOKEN_BUDGETS: Record<FeatureType, TokenBudget> = {
  itinerary_generation: {
    maxInputTokens: 2000,
    maxOutputTokens: 16000,
    maxCostUSD: 0.15,
    maxResponseTimeMs: 30000,
  },
  guide_generation: {
    maxInputTokens: 1500,
    maxOutputTokens: 4096,
    maxCostUSD: 0.10,
    maxResponseTimeMs: 20000,
  },
  checklist_generation: {
    maxInputTokens: 1000,
    maxOutputTokens: 3000,
    maxCostUSD: 0.05,
    maxResponseTimeMs: 15000,
  },
  chat_response: {
    maxInputTokens: 500,
    maxOutputTokens: 2000,
    maxCostUSD: 0.03,
    maxResponseTimeMs: 10000,
  },
};

// ─── Pricing ────────────────────────────────────────────────────────────────────

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheWritePerMillion: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
  },
  "claude-haiku": {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    cacheReadPerMillion: 0.03,
    cacheWritePerMillion: 0.3,
  },
};

/** Default model tier per feature (matches ai.service.ts getProvider logic) */
const FEATURE_MODEL: Record<FeatureType, string> = {
  itinerary_generation: "claude-sonnet",
  guide_generation: "claude-haiku",
  checklist_generation: "claude-haiku",
  chat_response: "claude-haiku",
};

// ─── Cost Calculator ────────────────────────────────────────────────────────────

const TOKENS_PER_MILLION = 1_000_000;

/**
 * Calculates the estimated cost of an AI call based on token usage.
 * Accounts for prompt caching when cache tokens are reported.
 */
function calculateCost(usage: TokenUsage, modelTier: string): number {
  const pricing = PRICING[modelTier];
  if (!pricing) {
    throw new Error(`Unknown model tier for pricing: ${modelTier}`);
  }

  const inputCost =
    (usage.inputTokens / TOKENS_PER_MILLION) * pricing.inputPerMillion;
  const outputCost =
    (usage.outputTokens / TOKENS_PER_MILLION) * pricing.outputPerMillion;
  const cacheReadCost =
    ((usage.cacheReadInputTokens ?? 0) / TOKENS_PER_MILLION) *
    pricing.cacheReadPerMillion;
  const cacheWriteCost =
    ((usage.cacheCreationInputTokens ?? 0) / TOKENS_PER_MILLION) *
    pricing.cacheWritePerMillion;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

// ─── Scoring Constants ──────────────────────────────────────────────────────────

/** Each of the 4 constraints contributes equally to the score */
const CONSTRAINT_WEIGHT = 0.25;

/** Score cap when truncation is detected */
const TRUNCATION_SCORE_CAP = 0.5;

// ─── Grader ─────────────────────────────────────────────────────────────────────

/**
 * Grades an AI operation against its token and cost budget.
 *
 * Checks four independent constraints:
 * 1. Input tokens within budget
 * 2. Output tokens within budget
 * 3. Total cost within budget
 * 4. Response time within SLA
 *
 * Scoring:
 * - Each constraint contributes 0.25 to the total score
 * - A constraint passes fully (0.25) or fails (0.0)
 * - Truncation is always a failure (score capped at 0.5)
 *
 * @param usage - Token counts from the AI provider response
 * @param featureType - Which feature budget to check against
 * @param performance - Timing and truncation data (optional, defaults to no truncation / 0ms)
 * @param modelTier - Optional override for pricing model (defaults to feature mapping)
 */
export function gradeTokenBudget(
  usage: TokenUsage,
  featureType: FeatureType,
  performance?: PerformanceMetrics,
  modelTier?: string
): GraderResult {
  const budget = TOKEN_BUDGETS[featureType];
  if (!budget) {
    return {
      pass: false,
      score: 0,
      errors: [`Unknown feature type: ${String(featureType)}`],
      details: { featureType },
    };
  }

  const perf: PerformanceMetrics = performance ?? {
    responseTimeMs: 0,
    wasTruncated: false,
  };

  const tier = modelTier ?? FEATURE_MODEL[featureType];
  const errors: string[] = [];
  let score = 0;

  // --- Check 1: Input tokens ---
  const inputRatio = usage.inputTokens / budget.maxInputTokens;
  if (usage.inputTokens <= budget.maxInputTokens) {
    score += CONSTRAINT_WEIGHT;
  } else {
    errors.push(
      `Input tokens ${usage.inputTokens} exceed budget ${budget.maxInputTokens} (${(inputRatio * 100).toFixed(0)}%)`
    );
  }

  // --- Check 2: Output tokens ---
  const outputRatio = usage.outputTokens / budget.maxOutputTokens;
  if (usage.outputTokens <= budget.maxOutputTokens) {
    score += CONSTRAINT_WEIGHT;
  } else {
    errors.push(
      `Output tokens ${usage.outputTokens} exceed budget ${budget.maxOutputTokens} (${(outputRatio * 100).toFixed(0)}%)`
    );
  }

  // --- Check 3: Cost ---
  let estimatedCost: number;
  try {
    estimatedCost = calculateCost(usage, tier);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    estimatedCost = 0;
  }

  if (estimatedCost <= budget.maxCostUSD) {
    score += CONSTRAINT_WEIGHT;
  } else {
    errors.push(
      `Estimated cost $${estimatedCost.toFixed(4)} exceeds budget $${budget.maxCostUSD.toFixed(4)}`
    );
  }

  // --- Check 4: Response time ---
  if (perf.responseTimeMs <= budget.maxResponseTimeMs) {
    score += CONSTRAINT_WEIGHT;
  } else {
    errors.push(
      `Response time ${perf.responseTimeMs}ms exceeds SLA ${budget.maxResponseTimeMs}ms`
    );
  }

  // --- Truncation is always a critical failure ---
  if (perf.wasTruncated) {
    errors.push(
      "Response was truncated (hit max_tokens). Output is incomplete — this is a critical failure."
    );
    score = Math.min(score, TRUNCATION_SCORE_CAP);
  }

  return {
    pass: errors.length === 0,
    score: parseFloat(score.toFixed(3)),
    errors,
    details: {
      featureType,
      modelTier: tier,
      budget: {
        maxInputTokens: budget.maxInputTokens,
        maxOutputTokens: budget.maxOutputTokens,
        maxCostUSD: budget.maxCostUSD,
        maxResponseTimeMs: budget.maxResponseTimeMs,
      },
      actual: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens ?? 0,
        cacheCreationInputTokens: usage.cacheCreationInputTokens ?? 0,
        estimatedCostUSD: parseFloat(estimatedCost.toFixed(6)),
        responseTimeMs: perf.responseTimeMs,
        wasTruncated: perf.wasTruncated,
      },
      utilization: {
        inputPercent: parseFloat((inputRatio * 100).toFixed(1)),
        outputPercent: parseFloat((outputRatio * 100).toFixed(1)),
        costPercent: parseFloat(
          ((estimatedCost / budget.maxCostUSD) * 100).toFixed(1)
        ),
        timePercent:
          budget.maxResponseTimeMs > 0
            ? parseFloat(
                (
                  (perf.responseTimeMs / budget.maxResponseTimeMs) *
                  100
                ).toFixed(1)
              )
            : 0,
      },
    },
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export { TOKEN_BUDGETS, PRICING, FEATURE_MODEL, calculateCost };
