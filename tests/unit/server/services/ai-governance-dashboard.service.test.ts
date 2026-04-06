/**
 * Unit tests for AiGovernanceDashboardService.
 *
 * Tests cover:
 * - getOverview computes correct aggregate metrics
 * - getOverview handles empty log set
 * - getPhaseDetail returns phase-specific data with top errors
 * - getPhaseDetail handles empty log set
 * - toggleKillSwitch upserts correctly and logs
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
import { logger } from "@/lib/logger";
import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockLog(overrides: Partial<{
  phase: string;
  estimatedCostUsd: number;
  latencyMs: number;
  status: string;
  errorCode: string | null;
  cacheHit: boolean;
  createdAt: Date;
}> = {}) {
  return {
    id: "log-1",
    userId: "user-1",
    phase: overrides.phase ?? "plan",
    provider: "claude",
    model: "claude-sonnet-4-6",
    promptSlug: "travel-plan",
    inputTokens: 100,
    outputTokens: 200,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUsd: overrides.estimatedCostUsd ?? 0.05,
    latencyMs: overrides.latencyMs ?? 1000,
    status: overrides.status ?? "success",
    errorCode: overrides.errorCode ?? null,
    cacheHit: overrides.cacheHit ?? false,
    metadata: null,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

function makeMockKillSwitch(phase: string, isEnabled: boolean, reason: string | null = null) {
  return {
    id: `ks-${phase}`,
    phase,
    isEnabled,
    reason,
    updatedBy: "admin-1",
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AiGovernanceDashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOverview", () => {
    it("computes correct aggregate metrics from logs", async () => {
      const logs = [
        makeMockLog({ phase: "plan", estimatedCostUsd: 0.10, latencyMs: 500, status: "success" }),
        makeMockLog({ phase: "plan", estimatedCostUsd: 0.20, latencyMs: 1500, status: "error", errorCode: "timeout" }),
        makeMockLog({ phase: "checklist", estimatedCostUsd: 0.05, latencyMs: 300, status: "success", cacheHit: true }),
        makeMockLog({ phase: "guide", estimatedCostUsd: 0.03, latencyMs: 200, status: "blocked" }),
      ];
      const killSwitches = [
        makeMockKillSwitch("plan", false),
        makeMockKillSwitch("global", true, "maintenance"),
      ];

      prismaMock.aiInteractionLog.findMany.mockResolvedValue(logs);
      prismaMock.aiKillSwitch.findMany.mockResolvedValue(killSwitches);

      const result = await AiGovernanceDashboardService.getOverview(30);

      expect(result.totalCalls).toBe(4);
      expect(result.totalCostUsd).toBe(0.38);
      expect(result.errorRate).toBe(25); // 1/4
      expect(result.cacheHitRate).toBe(25); // 1/4
      expect(result.blockedCalls).toBe(1);
      expect(result.avgLatencyMs).toBe(625); // (500+1500+300+200)/4

      // Calls by phase
      expect(result.callsByPhase).toHaveLength(3);
      const planPhase = result.callsByPhase.find((p) => p.phase === "plan");
      expect(planPhase).toEqual({ phase: "plan", count: 2, costUsd: 0.3 });

      // Kill switches
      expect(result.killSwitchStatus).toHaveLength(2);
      expect(result.killSwitchStatus).toContainEqual({
        phase: "global",
        isEnabled: true,
        reason: "maintenance",
      });
    });

    it("returns zero metrics when no logs exist", async () => {
      prismaMock.aiInteractionLog.findMany.mockResolvedValue([]);
      prismaMock.aiKillSwitch.findMany.mockResolvedValue([]);

      const result = await AiGovernanceDashboardService.getOverview(30);

      expect(result.totalCalls).toBe(0);
      expect(result.totalCostUsd).toBe(0);
      expect(result.errorRate).toBe(0);
      expect(result.cacheHitRate).toBe(0);
      expect(result.blockedCalls).toBe(0);
      expect(result.avgLatencyMs).toBe(0);
      expect(result.callsByPhase).toHaveLength(0);
      expect(result.killSwitchStatus).toHaveLength(0);
    });

    it("passes date filter to findMany", async () => {
      prismaMock.aiInteractionLog.findMany.mockResolvedValue([]);
      prismaMock.aiKillSwitch.findMany.mockResolvedValue([]);

      await AiGovernanceDashboardService.getOverview(7);

      const call = prismaMock.aiInteractionLog.findMany.mock.calls[0][0];
      expect(call?.where?.createdAt?.gte).toBeInstanceOf(Date);
    });
  });

  describe("getPhaseDetail", () => {
    it("returns phase-specific metrics with top errors", async () => {
      const logs = [
        makeMockLog({ phase: "plan", status: "success", latencyMs: 400 }),
        makeMockLog({ phase: "plan", status: "error", errorCode: "timeout", latencyMs: 5000 }),
        makeMockLog({ phase: "plan", status: "error", errorCode: "timeout", latencyMs: 4000 }),
        makeMockLog({ phase: "plan", status: "error", errorCode: "rate_limit", latencyMs: 100 }),
        makeMockLog({ phase: "plan", status: "success", cacheHit: true, latencyMs: 50 }),
      ];

      prismaMock.aiInteractionLog.findMany.mockResolvedValue(logs);

      const result = await AiGovernanceDashboardService.getPhaseDetail("plan", 30);

      expect(result.phase).toBe("plan");
      expect(result.totalCalls).toBe(5);
      expect(result.errorRate).toBe(60); // 3/5
      expect(result.cacheHitRate).toBe(20); // 1/5
      expect(result.avgLatencyMs).toBe(1910); // (400+5000+4000+100+50)/5

      // Top errors sorted by count descending
      expect(result.topErrors).toHaveLength(2);
      expect(result.topErrors[0]).toEqual({ errorCode: "timeout", count: 2 });
      expect(result.topErrors[1]).toEqual({ errorCode: "rate_limit", count: 1 });
    });

    it("returns zero metrics for empty phase", async () => {
      prismaMock.aiInteractionLog.findMany.mockResolvedValue([]);

      const result = await AiGovernanceDashboardService.getPhaseDetail("checklist", 30);

      expect(result.phase).toBe("checklist");
      expect(result.totalCalls).toBe(0);
      expect(result.errorRate).toBe(0);
      expect(result.topErrors).toHaveLength(0);
    });

    it("uses 'unknown' for errors without errorCode", async () => {
      const logs = [
        makeMockLog({ phase: "guide", status: "error", errorCode: null }),
      ];

      prismaMock.aiInteractionLog.findMany.mockResolvedValue(logs);

      const result = await AiGovernanceDashboardService.getPhaseDetail("guide", 30);

      expect(result.topErrors).toEqual([{ errorCode: "unknown", count: 1 }]);
    });

    it("limits top errors to 5", async () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        makeMockLog({
          phase: "plan",
          status: "error",
          errorCode: `error_${i}`,
        }),
      );

      prismaMock.aiInteractionLog.findMany.mockResolvedValue(logs);

      const result = await AiGovernanceDashboardService.getPhaseDetail("plan", 30);

      expect(result.topErrors).toHaveLength(5);
    });
  });

  describe("toggleKillSwitch", () => {
    it("upserts the kill switch record", async () => {
      prismaMock.aiKillSwitch.upsert.mockResolvedValue(
        makeMockKillSwitch("plan", true, "test reason"),
      );

      await AiGovernanceDashboardService.toggleKillSwitch(
        "plan",
        true,
        "test reason",
        "admin-123",
      );

      expect(prismaMock.aiKillSwitch.upsert).toHaveBeenCalledWith({
        where: { phase: "plan" },
        create: {
          phase: "plan",
          isEnabled: true,
          reason: "test reason",
          updatedBy: "admin-123",
        },
        update: {
          isEnabled: true,
          reason: "test reason",
          updatedBy: "admin-123",
        },
      });
    });

    it("logs the toggle event", async () => {
      prismaMock.aiKillSwitch.upsert.mockResolvedValue(
        makeMockKillSwitch("global", false, "re-enable"),
      );

      await AiGovernanceDashboardService.toggleKillSwitch(
        "global",
        false,
        "re-enable",
        "admin-456",
      );

      expect(logger.info).toHaveBeenCalledWith(
        "ai-governance.kill-switch.toggled",
        {
          phase: "global",
          enabled: false,
          reason: "re-enable",
          adminId: "admin-456",
        },
      );
    });
  });
});
