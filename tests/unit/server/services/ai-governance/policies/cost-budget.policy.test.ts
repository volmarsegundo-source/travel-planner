/**
 * Unit tests for CostBudgetPolicy.
 *
 * Covers global ceiling + per-provider segmented ceilings (Sprint 42 FinOps).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

const { mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.unmock("@/server/services/ai-governance/policy-engine");
vi.unmock("@/server/services/ai-governance/policies");

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: mockLoggerWarn, error: mockLoggerError, info: vi.fn() },
}));

import { db } from "@/server/db";
import {
  costBudgetPolicy,
  _clearCostBudgetCache,
} from "@/server/services/ai-governance/policies/cost-budget.policy";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

const BUDGET_ENV_VARS = [
  "AI_MONTHLY_BUDGET_USD",
  "AI_MONTHLY_BUDGET_GEMINI_USD",
  "AI_MONTHLY_BUDGET_ANTHROPIC_USD",
] as const;

const snapshotEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  _clearCostBudgetCache();
  for (const key of BUDGET_ENV_VARS) {
    snapshotEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of BUDGET_ENV_VARS) {
    const v = snapshotEnv[key];
    if (v !== undefined) {
      process.env[key] = v;
    } else {
      delete process.env[key];
    }
  }
});

/**
 * Mock groupBy to return per-provider spend.
 * Each row represents the total for that provider.
 */
function mockSpendByProvider(anthropic: number, gemini: number): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prismaMock.aiInteractionLog.groupBy as any).mockResolvedValue([
    { provider: "anthropic", _sum: { estimatedCostUsd: anthropic } },
    { provider: "gemini", _sum: { estimatedCostUsd: gemini } },
  ]);
}

function mockTotalSpend(total: number): void {
  // Place the whole amount on a single provider for convenience
  mockSpendByProvider(total, 0);
}

describe("CostBudgetPolicy — global ceiling", () => {
  it("allows when under budget", async () => {
    mockTotalSpend(50); // 50% of default $100

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(true);
  });

  it("blocks at 95% of global budget", async () => {
    mockTotalSpend(96);

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("cost_budget");
    expect(result.reason).toContain("96%");
    expect(result.reason).toContain("$100");
  });

  it("allows at 80% but logs a warning", async () => {
    mockTotalSpend(85);

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(true);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "cost-budget.threshold.warning",
      expect.objectContaining({
        scope: "global",
        spend: "85.00",
        budget: "100.00",
      }),
    );
  });

  it("uses default budget of $100 when env var is not set", async () => {
    mockTotalSpend(96);

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("$100");
  });

  it("uses custom budget from env var", async () => {
    process.env.AI_MONTHLY_BUDGET_USD = "200";
    _clearCostBudgetCache();
    mockTotalSpend(96); // 48% of $200 -> allowed

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(true);
  });

  it("allows (fail-open) when DB query throws", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock.aiInteractionLog.groupBy as any).mockRejectedValue(
      new Error("Connection refused"),
    );

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(true);
  });

  it("handles null sums gracefully", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock.aiInteractionLog.groupBy as any).mockResolvedValue([
      { provider: "anthropic", _sum: { estimatedCostUsd: null } },
      { provider: "gemini", _sum: { estimatedCostUsd: null } },
    ]);

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    expect(result.allowed).toBe(true);
  });
});

describe("CostBudgetPolicy — per-provider ceiling (Sprint 42)", () => {
  it("blocks when gemini spend exceeds gemini ceiling", async () => {
    mockSpendByProvider(0, 39); // 97.5% of default $40 gemini

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
      provider: "gemini",
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("cost_budget");
    expect(result.reason).toContain("gemini");
  });

  it("blocks when anthropic spend exceeds anthropic ceiling", async () => {
    mockSpendByProvider(39, 0); // 97.5% of default $40 anthropic

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
      provider: "anthropic",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("anthropic");
  });

  it("allows when one provider is saturated but the other is requested", async () => {
    // Gemini saturated, request is for Anthropic — must still be allowed
    mockSpendByProvider(10, 39);

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
      provider: "anthropic",
    });

    expect(result.allowed).toBe(true);
  });

  it("uses custom per-provider ceilings when env vars are set", async () => {
    process.env.AI_MONTHLY_BUDGET_GEMINI_USD = "20";
    _clearCostBudgetCache();
    mockSpendByProvider(0, 19.5); // 97.5% of $20

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
      provider: "gemini",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("$20");
  });

  it("emits warn when provider spend reaches 80% threshold", async () => {
    mockSpendByProvider(0, 33); // 82.5% of default $40 gemini

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
      provider: "gemini",
    });

    expect(result.allowed).toBe(true);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "cost-budget.threshold.warning",
      expect.objectContaining({ scope: "gemini" }),
    );
  });

  it("skips per-provider check when ctx.provider is omitted", async () => {
    // Gemini saturated at provider level but no provider in context
    mockSpendByProvider(0, 39);

    const result = await costBudgetPolicy.evaluate({ phase: "plan", userId: "u1" });

    // Total spend $39 is well under global $100 -> allowed
    expect(result.allowed).toBe(true);
  });

  it("global block takes precedence over provider check", async () => {
    // Global at 96%, gemini at 50% of its budget
    mockSpendByProvider(76, 20);

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
      provider: "gemini",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("$100");
  });
});
