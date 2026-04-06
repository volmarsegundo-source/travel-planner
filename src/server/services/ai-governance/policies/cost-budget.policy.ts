import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import type { AiPolicy, PolicyContext, PolicyResult } from "../policy-engine";

// ─── Constants ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 1 minute
const BLOCK_THRESHOLD = 0.95; // 95%
const WARN_THRESHOLD = 0.80; // 80%
const DEFAULT_MONTHLY_BUDGET_USD = 100;

// ─── In-memory cache ────────────────────────────────────────────────────────

let cachedTotal: { value: number; fetchedAt: number } | null = null;

async function getMonthlySpend(): Promise<number> {
  if (cachedTotal && Date.now() - cachedTotal.fetchedAt < CACHE_TTL_MS) {
    return cachedTotal.value;
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await db.aiInteractionLog.aggregate({
      _sum: { estimatedCostUsd: true },
      where: { createdAt: { gte: startOfMonth } },
    });

    const total = result._sum.estimatedCostUsd ?? 0;
    cachedTotal = { value: total, fetchedAt: Date.now() };
    return total;
  } catch (error) {
    logger.warn("cost-budget.db.error", { error: String(error) });
    // On DB failure, allow the request (fail-open)
    return 0;
  }
}

function getBudget(): number {
  const raw = process.env.AI_MONTHLY_BUDGET_USD;
  if (!raw) return DEFAULT_MONTHLY_BUDGET_USD;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MONTHLY_BUDGET_USD;
}

// ─── Policy ─────────────────────────────────────────────────────────────────

export const costBudgetPolicy: AiPolicy = {
  name: "cost_budget",

  async evaluate(_ctx: PolicyContext): Promise<PolicyResult> {
    const budget = getBudget();
    const spend = await getMonthlySpend();
    const ratio = spend / budget;

    if (ratio >= BLOCK_THRESHOLD) {
      return {
        allowed: false,
        blockedBy: "cost_budget",
        reason: `Monthly AI budget exhausted (${Math.round(ratio * 100)}% of $${budget})`,
      };
    }

    if (ratio >= WARN_THRESHOLD) {
      logger.warn("cost-budget.threshold.warning", {
        spend: spend.toFixed(2),
        budget: budget.toFixed(2),
        ratio: ratio.toFixed(2),
      });
    }

    return { allowed: true };
  },
};

/** Clear in-memory cache — used only in tests. */
export function _clearCostBudgetCache(): void {
  cachedTotal = null;
}
