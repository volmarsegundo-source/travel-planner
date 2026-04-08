/**
 * Unit tests for AiGovernanceDashboardService.getCostAnalytics
 *
 * Tests cover:
 * - Per-phase cost aggregation from mocked Prisma data
 * - Gemini cost recalculation accuracy
 * - Projection calculations at different user counts
 * - Empty data (no interactions yet)
 * - Current month total isolation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { db } from "@/server/db";
import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCostLog(overrides: Partial<{
  phase: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}> = {}) {
  return {
    phase: overrides.phase ?? "plan",
    inputTokens: overrides.inputTokens ?? 1000,
    outputTokens: overrides.outputTokens ?? 500,
    estimatedCostUsd: overrides.estimatedCostUsd ?? 0.01,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AiGovernanceDashboardService.getCostAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct per-phase aggregations", async () => {
    const periodLogs = [
      makeCostLog({ phase: "plan", estimatedCostUsd: 0.10, inputTokens: 2000, outputTokens: 1000 }),
      makeCostLog({ phase: "plan", estimatedCostUsd: 0.20, inputTokens: 3000, outputTokens: 1500 }),
      makeCostLog({ phase: "checklist", estimatedCostUsd: 0.05, inputTokens: 500, outputTokens: 200 }),
      makeCostLog({ phase: "guide", estimatedCostUsd: 0.03, inputTokens: 800, outputTokens: 400 }),
    ];

    // First call = period logs, second = month logs
    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce(periodLogs as never)
      .mockResolvedValueOnce(periodLogs as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    expect(result.phases).toHaveLength(3);

    const planPhase = result.phases.find((p) => p.phase === "plan");
    expect(planPhase).toBeDefined();
    expect(planPhase!.calls).toBe(2);
    expect(planPhase!.totalCostUsd).toBe(0.30);
    expect(planPhase!.avgCostUsd).toBe(0.15);
    expect(planPhase!.totalInputTokens).toBe(5000);
    expect(planPhase!.totalOutputTokens).toBe(2500);

    const checklistPhase = result.phases.find((p) => p.phase === "checklist");
    expect(checklistPhase!.calls).toBe(1);
    expect(checklistPhase!.totalCostUsd).toBe(0.05);
  });

  it("calculates Gemini equivalent cost correctly", async () => {
    // Use known token counts to verify Gemini pricing:
    // Gemini 2.0 Flash: $0.10/M input, $0.40/M output
    const periodLogs = [
      makeCostLog({
        phase: "plan",
        estimatedCostUsd: 0.05,
        inputTokens: 1_000_000, // $0.10 with Gemini
        outputTokens: 1_000_000, // $0.40 with Gemini
      }),
    ];

    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce(periodLogs as never)
      .mockResolvedValueOnce([] as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    // Gemini cost: $0.10 (input) + $0.40 (output) = $0.50
    expect(result.geminiEquivalentCostUsd).toBe(0.50);
  });

  it("calculates savings percentage correctly", async () => {
    // Total actual cost = $1.00, Gemini equivalent should be much less
    const periodLogs = [
      makeCostLog({
        phase: "plan",
        estimatedCostUsd: 1.00,
        inputTokens: 100_000, // Gemini: $0.01
        outputTokens: 50_000,  // Gemini: $0.02
      }),
    ];

    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce(periodLogs as never)
      .mockResolvedValueOnce([] as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    // savingsWithGemini = (1.00 - 0.03) / 1.00 * 100 = 97%
    expect(result.savingsWithGemini).toBe(97);
    expect(result.geminiEquivalentCostUsd).toBe(0.03);
  });

  it("returns three projection scenarios", async () => {
    const periodLogs = [
      makeCostLog({ phase: "plan", estimatedCostUsd: 0.10 }),
      makeCostLog({ phase: "checklist", estimatedCostUsd: 0.05 }),
      makeCostLog({ phase: "guide", estimatedCostUsd: 0.03 }),
    ];

    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce(periodLogs as never)
      .mockResolvedValueOnce([] as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    expect(result.projections).toHaveLength(3);
    expect(result.projections[0].users).toBe(100);
    expect(result.projections[1].users).toBe(500);
    expect(result.projections[2].users).toBe(1000);

    // Each phase has 1 call, so avg per expedition = sum of avg costs
    // plan: 0.10, checklist: 0.05, guide: 0.03 => 0.18 per expedition
    const avgCost = result.avgCostPerExpedition;
    expect(avgCost).toBe(0.18);

    // 100 users * 2 expeditions = 200 expeditions/mo
    expect(result.projections[0].expeditionsPerMonth).toBe(200);
    expect(result.projections[0].monthlyCostUsd).toBe(
      Math.round(avgCost * 200 * 100) / 100,
    );

    // BRL = USD * 5.0
    expect(result.projections[0].monthlyCostBrl).toBe(
      Math.round(result.projections[0].monthlyCostUsd * 5.0 * 100) / 100,
    );
  });

  it("returns zero metrics when no interactions exist", async () => {
    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    expect(result.phases).toHaveLength(0);
    expect(result.avgCostPerExpedition).toBe(0);
    expect(result.currentMonthTotalCostUsd).toBe(0);
    expect(result.geminiEquivalentCostUsd).toBe(0);
    expect(result.savingsWithGemini).toBe(0);

    // Projections should still exist but with zero costs
    expect(result.projections).toHaveLength(3);
    result.projections.forEach((p) => {
      expect(p.monthlyCostUsd).toBe(0);
      expect(p.monthlyCostBrl).toBe(0);
    });
  });

  it("calculates current month total from month logs only", async () => {
    const periodLogs = [
      makeCostLog({ estimatedCostUsd: 0.50 }),
      makeCostLog({ estimatedCostUsd: 0.30 }),
    ];
    const monthLogs = [
      makeCostLog({ estimatedCostUsd: 0.20 }),
    ];

    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce(periodLogs as never)
      .mockResolvedValueOnce(monthLogs as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    // Current month total should be from month logs only
    expect(result.currentMonthTotalCostUsd).toBe(0.20);
  });

  it("handles single-phase data correctly", async () => {
    const periodLogs = [
      makeCostLog({ phase: "plan", estimatedCostUsd: 0.25, inputTokens: 5000, outputTokens: 2000 }),
    ];

    prismaMock.aiInteractionLog.findMany
      .mockResolvedValueOnce(periodLogs as never)
      .mockResolvedValueOnce(periodLogs as never);

    const result = await AiGovernanceDashboardService.getCostAnalytics(30);

    expect(result.phases).toHaveLength(1);
    expect(result.avgCostPerExpedition).toBe(0.25);

    // 1000 users * 2 expeditions * $0.25 = $500
    const p1000 = result.projections.find((p) => p.users === 1000);
    expect(p1000!.monthlyCostUsd).toBe(500);
    expect(p1000!.monthlyCostBrl).toBe(2500);
  });
});
