/**
 * Token cost calculator for AI provider usage tracking.
 *
 * Pricing is based on Anthropic and Google AI current rates (2026).
 * All costs are returned in USD with 6 decimal places.
 */

// ─── Pricing per 1M tokens (USD) ────────────────────────────────────────────

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic models
  "claude-sonnet-4-6": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  "claude-haiku-4-5-20251001": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
  },
  // Google AI models (no cache pricing equivalent)
  "gemini-2.0-flash": {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
  },
};

// Cache read: 90% discount on input price
const CACHE_READ_DISCOUNT = 0.9;
// Cache write: 25% premium on input price
const CACHE_WRITE_PREMIUM = 0.25;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  cacheSavings: number;
  totalCost: number;
}

// ─── Calculator ──────────────────────────────────────────────────────────────

/**
 * Calculates estimated cost in USD for an AI API call.
 *
 * @param model - Anthropic model ID (e.g., "claude-sonnet-4-6")
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param cacheReadTokens - Tokens served from cache (90% discount)
 * @param cacheWriteTokens - Tokens written to cache (25% premium)
 * @returns Cost breakdown with 6 decimal places
 */
export function calculateEstimatedCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
  cacheWriteTokens?: number,
): CostEstimate {
  const pricing = MODEL_PRICING[model];

  // If model is unknown, return zero costs (safe fallback)
  if (!pricing) {
    return { inputCost: 0, outputCost: 0, cacheSavings: 0, totalCost: 0 };
  }

  const inputPricePerToken = pricing.inputPerMillion / 1_000_000;
  const outputPricePerToken = pricing.outputPerMillion / 1_000_000;

  // Regular input cost (non-cached tokens)
  const regularInputTokens = inputTokens - (cacheReadTokens ?? 0) - (cacheWriteTokens ?? 0);
  const regularInputCost = Math.max(0, regularInputTokens) * inputPricePerToken;

  // Cache read cost (90% discount on input price)
  const cacheReadCost = (cacheReadTokens ?? 0) * inputPricePerToken * (1 - CACHE_READ_DISCOUNT);

  // Cache write cost (25% premium on input price)
  const cacheWriteCost = (cacheWriteTokens ?? 0) * inputPricePerToken * (1 + CACHE_WRITE_PREMIUM);

  const totalInputCost = regularInputCost + cacheReadCost + cacheWriteCost;

  // Output cost
  const outputCost = outputTokens * outputPricePerToken;

  // Cache savings = what it would have cost without cache - what it actually cost
  const fullInputCostWithoutCache = inputTokens * inputPricePerToken;
  const cacheSavings = Math.max(0, fullInputCostWithoutCache - totalInputCost);

  const totalCost = totalInputCost + outputCost;

  return {
    inputCost: Number(totalInputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    cacheSavings: Number(cacheSavings.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
  };
}
