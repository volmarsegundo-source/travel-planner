import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import type { AiPolicy, PolicyContext, PolicyResult } from "../policy-engine";

// ─── Constants ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 1 minute
const BLOCK_THRESHOLD = 0.95; // 95% — kill switch
const WARN_THRESHOLD = 0.80; // 80% — alert only
const DEFAULT_MONTHLY_BUDGET_USD = 100;
const DEFAULT_PROVIDER_BUDGET_USD = 40; // Sprint 42 FinOps: $40 per provider

type ProviderName = "anthropic" | "gemini";

interface SpendSnapshot {
  total: number;
  byProvider: Record<ProviderName, number>;
}

// ─── In-memory cache ────────────────────────────────────────────────────────

let cached: { value: SpendSnapshot; fetchedAt: number } | null = null;

async function getMonthlySpend(): Promise<SpendSnapshot> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const empty: SpendSnapshot = { total: 0, byProvider: { anthropic: 0, gemini: 0 } };

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await db.aiInteractionLog.groupBy({
      by: ["provider"],
      _sum: { estimatedCostUsd: true },
      where: { createdAt: { gte: startOfMonth } },
    });

    const snapshot: SpendSnapshot = { total: 0, byProvider: { anthropic: 0, gemini: 0 } };
    for (const row of rows) {
      const amount = row._sum.estimatedCostUsd ?? 0;
      snapshot.total += amount;
      if (row.provider === "anthropic" || row.provider === "gemini") {
        snapshot.byProvider[row.provider] = amount;
      }
    }

    cached = { value: snapshot, fetchedAt: Date.now() };
    return snapshot;
  } catch (error) {
    logger.warn("cost-budget.db.error", { error: String(error) });
    // On DB failure, allow the request (fail-open)
    return empty;
  }
}

// ─── Budget readers ─────────────────────────────────────────────────────────

function parsePositive(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getGlobalBudget(): number {
  return parsePositive(process.env.AI_MONTHLY_BUDGET_USD, DEFAULT_MONTHLY_BUDGET_USD);
}

function getProviderBudget(provider: ProviderName): number {
  const envKey =
    provider === "gemini" ? "AI_MONTHLY_BUDGET_GEMINI_USD" : "AI_MONTHLY_BUDGET_ANTHROPIC_USD";
  return parsePositive(process.env[envKey], DEFAULT_PROVIDER_BUDGET_USD);
}

// ─── Alert emission ─────────────────────────────────────────────────────────

function emitWarn(scope: string, spend: number, budget: number, ratio: number): void {
  logger.warn("cost-budget.threshold.warning", {
    scope,
    spend: spend.toFixed(2),
    budget: budget.toFixed(2),
    ratio: ratio.toFixed(2),
  });
}

function emitBlock(scope: string, spend: number, budget: number, ratio: number): void {
  logger.error("cost-budget.threshold.block", undefined, {
    scope,
    spend: spend.toFixed(2),
    budget: budget.toFixed(2),
    ratio: ratio.toFixed(2),
  });
}

// ─── Policy ─────────────────────────────────────────────────────────────────

export const costBudgetPolicy: AiPolicy = {
  name: "cost_budget",

  async evaluate(ctx: PolicyContext): Promise<PolicyResult> {
    const globalBudget = getGlobalBudget();
    const spend = await getMonthlySpend();

    // 1. Global ceiling (applies regardless of provider)
    const globalRatio = spend.total / globalBudget;
    if (globalRatio >= BLOCK_THRESHOLD) {
      emitBlock("global", spend.total, globalBudget, globalRatio);
      return {
        allowed: false,
        blockedBy: "cost_budget",
        reason: `Monthly AI budget exhausted (${Math.round(globalRatio * 100)}% of $${globalBudget})`,
      };
    }
    if (globalRatio >= WARN_THRESHOLD) {
      emitWarn("global", spend.total, globalBudget, globalRatio);
    }

    // 2. Per-provider ceiling (only when caller resolved the provider)
    if (ctx.provider) {
      const providerBudget = getProviderBudget(ctx.provider);
      const providerSpend = spend.byProvider[ctx.provider];
      const providerRatio = providerSpend / providerBudget;

      if (providerRatio >= BLOCK_THRESHOLD) {
        emitBlock(ctx.provider, providerSpend, providerBudget, providerRatio);
        return {
          allowed: false,
          blockedBy: "cost_budget",
          reason: `Monthly ${ctx.provider} budget exhausted (${Math.round(providerRatio * 100)}% of $${providerBudget})`,
        };
      }
      if (providerRatio >= WARN_THRESHOLD) {
        emitWarn(ctx.provider, providerSpend, providerBudget, providerRatio);
      }
    }

    return { allowed: true };
  },
};

// ─── Public status API ──────────────────────────────────────────────────────

export interface AiServiceStatus {
  /** Whether any new AI generation is allowed right now. */
  available: boolean;
  /** True when any ceiling has reached the warn threshold (≥80%). */
  warning: boolean;
  /** True when any ceiling has reached the block threshold (≥95%). */
  paused: boolean;
  /** Highest ratio (global or per-provider) — useful for admin dashboards. */
  highestRatio: number;
  /** Which scope is closest to saturation — "global", "gemini", or "anthropic". */
  highestScope: "global" | "anthropic" | "gemini";
}

/**
 * Computes current AI service availability for UX and admin surfaces.
 * Returns a summary of the worst-offending scope so the UI can surface a
 * single pause banner without revealing per-provider spend details.
 */
export async function getAiServiceStatus(): Promise<AiServiceStatus> {
  const globalBudget = getGlobalBudget();
  const spend = await getMonthlySpend();

  const ratios: Array<{ scope: AiServiceStatus["highestScope"]; ratio: number }> = [
    { scope: "global", ratio: spend.total / globalBudget },
    { scope: "gemini", ratio: spend.byProvider.gemini / getProviderBudget("gemini") },
    { scope: "anthropic", ratio: spend.byProvider.anthropic / getProviderBudget("anthropic") },
  ];
  // Clamp NaN (0/0) to 0
  for (const r of ratios) {
    if (!Number.isFinite(r.ratio)) r.ratio = 0;
  }

  const worst = ratios.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  const paused = worst.ratio >= BLOCK_THRESHOLD;
  const warning = worst.ratio >= WARN_THRESHOLD;

  return {
    available: !paused,
    warning,
    paused,
    highestRatio: worst.ratio,
    highestScope: worst.scope,
  };
}

/** Clear in-memory cache — used only in tests. */
export function _clearCostBudgetCache(): void {
  cached = null;
}
