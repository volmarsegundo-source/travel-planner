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

// ─── Types ──────────────────────────────────────────────────────────────────────

interface GraderResult {
  pass: boolean;
  score: number;
  errors: string[];
  details: Record<string, unknown>;
}

/** Token usage snapshot from an AI provider response */
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/** Performance metrics for the AI call */
interface PerformanceMetrics {
  /** Wall-clock time in milliseconds from request start to last byte */
  responseTimeMs: number;
  /** Whether the response was truncated by hitting max_tokens */
  wasTruncated: boolean;
}

type FeatureType = "itinerary_generation" | "guide_generation" | "checklist_generation" | "chat_response";

// ─── Budget Definitions ─────────────────────────────────────────────────────────
// Aligned with production values from ai.service.ts and cost-management.docx

interface TokenBudget {
  /** Maximum allowed input tokens (prompt + system prompt) */
  maxInputTokens: number;
  /** Maximum allowed output tokens (model response) */
  maxOutputTokens: number;
  /** Maximum allowed cost in USD per single invocation */
  maxCostUSD: number;
  /** Maximum allowed response time in milliseconds */
  maxResponseTimeMs: number;
  /** Human-readable description of why these limits exist */
  rationale: string;
}

const TOKEN_BUDGETS: Record<FeatureType, TokenBudget> = {
  itinerary_generation: {
    maxInputTokens: 3000,
    maxOutputTokens: 16000, // MAX_PLAN_TOKENS from ai.service.ts
    maxCostUSD: 0.15,
    maxResponseTimeMs: 60_000, // streaming, so up to 60s is acceptable
    rationale:
      "Itineraries are the most token-heavy operation. Budget scales with trip days " +
      "(600 tokens/day + 500 overhead). Max 30 days = ~18,500 but capped at 16,000.",
  },
  guide_generation: {
    maxInputTokens: 2000,
    maxOutputTokens: 4096, // Guide token budget from Sprint 19 expansion
    maxCostUSD: 0.08,
    maxResponseTimeMs: 30_000,
    rationale:
      "10 guide sections with type/details fields. Expanded from 6 sections in Sprint 19.",
  },
  checklist_generation: {
    maxInputTokens: 1500,
    maxOutputTokens: 3000,
    maxCostUSD: 0.05,
    maxResponseTimeMs: 20_000,
    rationale:
      "Checklists are structured lists; output should be compact. Uses Haiku model.",
  },
  chat_response: {
    maxInputTokens: 800,
    maxOutputTokens: 2000,
    maxCostUSD: 0.03,
    maxResponseTimeMs: 10_000,
    rationale:
      "Chat responses must be fast. Low token budget enforces concise answers.",
  },
};

// ─── Pricing ────────────────────────────────────────────────────────────────────
// Anthropic pricing as of 2025 (update when pricing changes)

interface ModelPricing {
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

/**
 * Calculates the estimated cost of an AI call based on token usage.
 * Accounts for prompt caching when cache tokens are reported.
 */
function calculateCost(
  usage: TokenUsage,
  modelTier: string
): number {
  const pricing = PRICING[modelTier];
  if (!pricing) {
    throw new Error(`Unknown model tier for pricing: ${modelTier}`);
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMillion;
  const cacheReadCost =
    ((usage.cacheReadInputTokens ?? 0) / 1_000_000) * pricing.cacheReadPerMillion;
  const cacheWriteCost =
    ((usage.cacheCreationInputTokens ?? 0) / 1_000_000) * pricing.cacheWritePerMillion;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

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
 * - Truncation is always a failure regardless of other scores
 *
 * @param featureType - Which feature budget to check against
 * @param usage - Token counts from the AI provider response
 * @param performance - Timing and truncation data
 * @param modelTier - Optional override for pricing model (defaults to feature mapping)
 */
export function gradeTokenBudget(
  featureType: FeatureType,
  usage: TokenUsage,
  performance: PerformanceMetrics,
  modelTier?: string
): GraderResult {
  const budget = TOKEN_BUDGETS[featureType];
  if (!budget) {
    return {
      pass: false,
      score: 0,
      errors: [`Unknown feature type: ${featureType}`],
      details: { featureType },
    };
  }

  const tier = modelTier ?? FEATURE_MODEL[featureType];
  const errors: string[] = [];
  let score = 0;

  // --- Check 1: Input tokens ---
  const inputRatio = usage.inputTokens / budget.maxInputTokens;
  if (usage.inputTokens <= budget.maxInputTokens) {
    score += 0.25;
  } else {
    errors.push(
      `Input tokens ${usage.inputTokens} exceed budget ${budget.maxInputTokens} (${(inputRatio * 100).toFixed(0)}%)`
    );
  }

  // --- Check 2: Output tokens ---
  const outputRatio = usage.outputTokens / budget.maxOutputTokens;
  if (usage.outputTokens <= budget.maxOutputTokens) {
    score += 0.25;
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
    score += 0.25;
  } else {
    errors.push(
      `Estimated cost $${estimatedCost.toFixed(4)} exceeds budget $${budget.maxCostUSD.toFixed(4)}`
    );
  }

  // --- Check 4: Response time ---
  if (performance.responseTimeMs <= budget.maxResponseTimeMs) {
    score += 0.25;
  } else {
    errors.push(
      `Response time ${performance.responseTimeMs}ms exceeds SLA ${budget.maxResponseTimeMs}ms`
    );
  }

  // --- Truncation is always a critical failure ---
  if (performance.wasTruncated) {
    errors.push(
      "Response was truncated (hit max_tokens). Output is incomplete — this is a critical failure."
    );
    score = Math.min(score, 0.5); // Cap at 0.5 even if other checks pass
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
        responseTimeMs: performance.responseTimeMs,
        wasTruncated: performance.wasTruncated,
      },
      utilization: {
        inputPercent: parseFloat((inputRatio * 100).toFixed(1)),
        outputPercent: parseFloat((outputRatio * 100).toFixed(1)),
        costPercent: parseFloat(((estimatedCost / budget.maxCostUSD) * 100).toFixed(1)),
        timePercent: parseFloat(
          ((performance.responseTimeMs / budget.maxResponseTimeMs) * 100).toFixed(1)
        ),
      },
    },
  };
}

// ─── Batch Budget Grader ────────────────────────────────────────────────────────

interface BatchResult {
  totalRuns: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  totalCostUSD: number;
  worstOffenders: Array<{ index: number; errors: string[] }>;
}

/**
 * Grades a batch of AI operations and returns aggregate statistics.
 * Useful for nightly eval runs across a dataset.
 *
 * @param results - Array of individual grading inputs
 */
export function gradeBatchTokenBudget(
  results: Array<{
    featureType: FeatureType;
    usage: TokenUsage;
    performance: PerformanceMetrics;
  }>
): BatchResult {
  const graded = results.map((r, i) => ({
    index: i,
    result: gradeTokenBudget(r.featureType, r.usage, r.performance),
  }));

  const passCount = graded.filter((g) => g.result.pass).length;
  const totalScore = graded.reduce((sum, g) => sum + g.result.score, 0);
  const totalCost = graded.reduce(
    (sum, g) => sum + ((g.result.details.actual as Record<string, number>).estimatedCostUSD ?? 0),
    0
  );

  const MAX_WORST_OFFENDERS = 5;
  const worstOffenders = graded
    .filter((g) => !g.result.pass)
    .sort((a, b) => a.result.score - b.result.score)
    .slice(0, MAX_WORST_OFFENDERS)
    .map((g) => ({ index: g.index, errors: g.result.errors }));

  return {
    totalRuns: results.length,
    passCount,
    failCount: results.length - passCount,
    averageScore: results.length > 0 ? parseFloat((totalScore / results.length).toFixed(3)) : 0,
    totalCostUSD: parseFloat(totalCost.toFixed(6)),
    worstOffenders,
  };
}

// ─── Dynamic Budget Calculator ──────────────────────────────────────────────────

/**
 * Calculates the expected token budget for an itinerary based on trip days.
 * Mirrors the logic in ai.service.ts calculatePlanTokenBudget().
 *
 * Use this when the eval dataset includes trips of varying lengths
 * and you need per-case budgets instead of the fixed max.
 */
export function calculateExpectedItineraryBudget(tripDays: number): {
  expectedOutputTokens: number;
  maxOutputTokens: number;
} {
  const TOKENS_PER_DAY = 600;
  const TOKENS_OVERHEAD = 500;
  const MIN_PLAN_TOKENS = 2048;
  const MAX_PLAN_TOKENS = 16000;

  const estimated = tripDays * TOKENS_PER_DAY + TOKENS_OVERHEAD;
  const clamped = Math.min(MAX_PLAN_TOKENS, Math.max(MIN_PLAN_TOKENS, estimated));

  return {
    expectedOutputTokens: clamped,
    maxOutputTokens: MAX_PLAN_TOKENS,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export {
  TOKEN_BUDGETS,
  PRICING,
  FEATURE_MODEL,
  calculateCost,
};

export type {
  GraderResult,
  TokenUsage,
  PerformanceMetrics,
  FeatureType,
  TokenBudget,
  ModelPricing,
  BatchResult,
};
