import "server-only";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AiGovernanceOverview {
  totalCalls: number;
  totalCostUsd: number;
  errorRate: number;
  cacheHitRate: number;
  blockedCalls: number;
  avgLatencyMs: number;
  callsByPhase: { phase: string; count: number; costUsd: number }[];
  killSwitchStatus: {
    phase: string;
    isEnabled: boolean;
    reason: string | null;
  }[];
}

export interface AiPhaseDetail {
  phase: string;
  totalCalls: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  errorRate: number;
  cacheHitRate: number;
  topErrors: { errorCode: string; count: number }[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOP_ERRORS_LIMIT = 5;
const COST_PRECISION = 100; // 2 decimal places
const PERCENTAGE_MULTIPLIER = 100;

// ─── Service ────────────────────────────────────────────────────────────────

export class AiGovernanceDashboardService {
  /**
   * Aggregated overview of all AI interactions for the given period.
   */
  static async getOverview(
    periodDays = 30,
  ): Promise<AiGovernanceOverview> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const [logs, killSwitches] = await Promise.all([
      db.aiInteractionLog.findMany({
        where: { createdAt: { gte: since } },
      }),
      db.aiKillSwitch.findMany(),
    ]);

    const totalCalls = logs.length;
    const totalCostUsd = logs.reduce(
      (sum, l) => sum + l.estimatedCostUsd,
      0,
    );
    const errors = logs.filter((l) => l.status === "error").length;
    const cacheHits = logs.filter((l) => l.cacheHit).length;
    const blocked = logs.filter((l) => l.status === "blocked").length;
    const avgLatencyMs =
      totalCalls > 0
        ? Math.round(
            logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalCalls,
          )
        : 0;

    // Group by phase
    const phaseMap = new Map<
      string,
      { count: number; costUsd: number }
    >();
    for (const log of logs) {
      const existing = phaseMap.get(log.phase) ?? {
        count: 0,
        costUsd: 0,
      };
      existing.count++;
      existing.costUsd += log.estimatedCostUsd;
      phaseMap.set(log.phase, existing);
    }

    return {
      totalCalls,
      totalCostUsd:
        Math.round(totalCostUsd * COST_PRECISION) / COST_PRECISION,
      errorRate:
        totalCalls > 0
          ? Math.round(
              (errors / totalCalls) * PERCENTAGE_MULTIPLIER,
            )
          : 0,
      cacheHitRate:
        totalCalls > 0
          ? Math.round(
              (cacheHits / totalCalls) * PERCENTAGE_MULTIPLIER,
            )
          : 0,
      blockedCalls: blocked,
      avgLatencyMs,
      callsByPhase: Array.from(phaseMap.entries()).map(
        ([phase, data]) => ({
          phase,
          count: data.count,
          costUsd:
            Math.round(data.costUsd * COST_PRECISION) / COST_PRECISION,
        }),
      ),
      killSwitchStatus: killSwitches.map((ks) => ({
        phase: ks.phase,
        isEnabled: ks.isEnabled,
        reason: ks.reason,
      })),
    };
  }

  /**
   * Detail metrics for a specific AI phase.
   */
  static async getPhaseDetail(
    phase: string,
    periodDays = 30,
  ): Promise<AiPhaseDetail> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const logs = await db.aiInteractionLog.findMany({
      where: { phase, createdAt: { gte: since } },
    });

    const totalCalls = logs.length;
    const totalCostUsd = logs.reduce(
      (sum, l) => sum + l.estimatedCostUsd,
      0,
    );
    const errors = logs.filter((l) => l.status === "error");
    const cacheHits = logs.filter((l) => l.cacheHit).length;
    const avgLatencyMs =
      totalCalls > 0
        ? Math.round(
            logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalCalls,
          )
        : 0;

    // Top errors by frequency
    const errorMap = new Map<string, number>();
    for (const e of errors) {
      const code = e.errorCode ?? "unknown";
      errorMap.set(code, (errorMap.get(code) ?? 0) + 1);
    }

    return {
      phase,
      totalCalls,
      totalCostUsd:
        Math.round(totalCostUsd * COST_PRECISION) / COST_PRECISION,
      avgLatencyMs,
      errorRate:
        totalCalls > 0
          ? Math.round(
              (errors.length / totalCalls) * PERCENTAGE_MULTIPLIER,
            )
          : 0,
      cacheHitRate:
        totalCalls > 0
          ? Math.round(
              (cacheHits / totalCalls) * PERCENTAGE_MULTIPLIER,
            )
          : 0,
      topErrors: Array.from(errorMap.entries())
        .map(([errorCode, count]) => ({ errorCode, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_ERRORS_LIMIT),
    };
  }

  /**
   * Returns the most recent AI interaction logs for the overview table.
   */
  static async getRecentInteractions(
    limit = 20,
  ): Promise<
    {
      id: string;
      createdAt: Date;
      phase: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      estimatedCostUsd: number;
      latencyMs: number;
      status: string;
    }[]
  > {
    const logs = await db.aiInteractionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        phase: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        latencyMs: true,
        status: true,
      },
    });
    return logs;
  }

  /**
   * Toggle a kill switch for a specific AI phase.
   */
  static async toggleKillSwitch(
    phase: string,
    enabled: boolean,
    reason: string,
    adminId: string,
  ): Promise<void> {
    await db.aiKillSwitch.upsert({
      where: { phase },
      create: {
        phase,
        isEnabled: enabled,
        reason,
        updatedBy: adminId,
      },
      update: {
        isEnabled: enabled,
        reason,
        updatedBy: adminId,
      },
    });

    logger.info("ai-governance.kill-switch.toggled", {
      phase,
      enabled,
      reason,
      adminId,
    });
  }
}
