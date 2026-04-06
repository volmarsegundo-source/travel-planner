/**
 * Unit tests for CostBudgetPolicy.
 *
 * Tests cover:
 * - Under budget -> allowed
 * - At 95% threshold -> blocked
 * - At 80% threshold -> allowed with warning log
 * - Default budget when env var not set
 * - Custom budget from env var
 * - DB failure -> fail-open (allowed)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

const { mockLoggerWarn } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: mockLoggerWarn, info: vi.fn() },
}));

import { db } from "@/server/db";
import {
  costBudgetPolicy,
  _clearCostBudgetCache,
} from "@/server/services/ai-governance/policies/cost-budget.policy";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
const originalBudget = process.env.AI_MONTHLY_BUDGET_USD;

beforeEach(() => {
  vi.clearAllMocks();
  _clearCostBudgetCache();
  delete process.env.AI_MONTHLY_BUDGET_USD;
});

afterEach(() => {
  if (originalBudget !== undefined) {
    process.env.AI_MONTHLY_BUDGET_USD = originalBudget;
  } else {
    delete process.env.AI_MONTHLY_BUDGET_USD;
  }
});

function mockSpend(amount: number): void {
  prismaMock.aiInteractionLog.aggregate.mockResolvedValue({
    _sum: { estimatedCostUsd: amount },
    _count: 0,
    _avg: { estimatedCostUsd: null },
    _min: { estimatedCostUsd: null },
    _max: { estimatedCostUsd: null },
  } as Awaited<ReturnType<typeof prismaMock.aiInteractionLog.aggregate>>);
}

describe("CostBudgetPolicy", () => {
  it("allows when under budget", async () => {
    mockSpend(50); // 50% of default $100

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks at 95% of budget", async () => {
    mockSpend(96); // 96% of default $100

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("cost_budget");
    expect(result.reason).toContain("96%");
    expect(result.reason).toContain("$100");
  });

  it("allows at 80% but logs a warning", async () => {
    mockSpend(85); // 85% of default $100

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "cost-budget.threshold.warning",
      expect.objectContaining({
        spend: "85.00",
        budget: "100.00",
      }),
    );
  });

  it("uses default budget of $100 when env var is not set", async () => {
    mockSpend(96); // 96% -> blocked at $100 default

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("$100");
  });

  it("uses custom budget from env var", async () => {
    process.env.AI_MONTHLY_BUDGET_USD = "200";
    _clearCostBudgetCache();
    mockSpend(96); // 48% of $200 -> allowed

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
  });

  it("allows (fail-open) when DB query throws", async () => {
    prismaMock.aiInteractionLog.aggregate.mockRejectedValue(
      new Error("Connection refused"),
    );

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
  });

  it("handles null sum gracefully", async () => {
    prismaMock.aiInteractionLog.aggregate.mockResolvedValue({
      _sum: { estimatedCostUsd: null },
      _count: 0,
      _avg: { estimatedCostUsd: null },
      _min: { estimatedCostUsd: null },
      _max: { estimatedCostUsd: null },
    } as Awaited<ReturnType<typeof prismaMock.aiInteractionLog.aggregate>>);

    const result = await costBudgetPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
  });
});
