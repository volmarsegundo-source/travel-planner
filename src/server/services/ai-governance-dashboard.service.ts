import "server-only";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import {
  calculateEstimatedCost,
  MODEL_PRICING,
} from "@/lib/cost-calculator";

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

export interface CostAnalyticsPhase {
  phase: string;
  calls: number;
  totalCostUsd: number;
  avgCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface CostAnalyticsProjection {
  users: number;
  expeditionsPerMonth: number;
  monthlyCostUsd: number;
  monthlyCostBrl: number;
}

export interface CostAnalytics {
  phases: CostAnalyticsPhase[];
  avgCostPerExpedition: number;
  currentMonthTotalCostUsd: number;
  geminiEquivalentCostUsd: number;
  savingsWithGemini: number;
  projections: CostAnalyticsProjection[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOP_ERRORS_LIMIT = 5;
const COST_PRECISION = 100; // 2 decimal places
const PERCENTAGE_MULTIPLIER = 100;

/** USD to BRL conversion rate — TODO: replace with live rate API */
const USD_TO_BRL = 5.0;

/** Gemini model used for cost comparison */
const GEMINI_COMPARISON_MODEL = "gemini-2.0-flash";

/** Assumed expeditions per user per month for projections */
const EXPEDITIONS_PER_USER = 2;

/** User count scenarios for projections */
const PROJECTION_USER_COUNTS = [100, 500, 1000];

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
      provider: string;
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
        provider: true,
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
   * Returns all prompt templates for the registry overview.
   */
  static async getPromptTemplates() {
    return db.promptTemplate.findMany({
      select: {
        slug: true,
        version: true,
        modelType: true,
        maxTokens: true,
        isActive: true,
        updatedAt: true,
      },
      orderBy: { slug: "asc" },
    });
  }

  /**
   * Cost analytics: per-phase actuals, Gemini comparison, and user-count projections.
   */
  static async getCostAnalytics(
    periodDays = 30,
  ): Promise<CostAnalytics> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [periodLogs, monthLogs] = await Promise.all([
      db.aiInteractionLog.findMany({
        where: { createdAt: { gte: since } },
        select: {
          phase: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCostUsd: true,
        },
      }),
      db.aiInteractionLog.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { estimatedCostUsd: true },
      }),
    ]);

    // 1. Group by phase
    const phaseMap = new Map<
      string,
      {
        calls: number;
        totalCostUsd: number;
        totalInputTokens: number;
        totalOutputTokens: number;
      }
    >();

    for (const log of periodLogs) {
      const existing = phaseMap.get(log.phase) ?? {
        calls: 0,
        totalCostUsd: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
      };
      existing.calls++;
      existing.totalCostUsd += log.estimatedCostUsd;
      existing.totalInputTokens += log.inputTokens;
      existing.totalOutputTokens += log.outputTokens;
      phaseMap.set(log.phase, existing);
    }

    const phases: CostAnalyticsPhase[] = Array.from(
      phaseMap.entries(),
    ).map(([phase, data]) => ({
      phase,
      calls: data.calls,
      totalCostUsd:
        Math.round(data.totalCostUsd * COST_PRECISION) / COST_PRECISION,
      avgCostUsd:
        data.calls > 0
          ? Math.round((data.totalCostUsd / data.calls) * 10000) / 10000
          : 0,
      totalInputTokens: data.totalInputTokens,
      totalOutputTokens: data.totalOutputTokens,
    }));

    // 2. Average cost per expedition (sum of avg costs across all phases)
    const avgCostPerExpedition =
      phases.length > 0
        ? Math.round(
            phases.reduce((sum, p) => sum + p.avgCostUsd, 0) * 10000,
          ) / 10000
        : 0;

    // 3. Current month total
    const currentMonthTotalCostUsd =
      Math.round(
        monthLogs.reduce((sum, l) => sum + l.estimatedCostUsd, 0) *
          COST_PRECISION,
      ) / COST_PRECISION;

    // 4. Gemini comparison — recalculate total cost with Gemini pricing
    let geminiEquivalentCostUsd = 0;
    if (MODEL_PRICING[GEMINI_COMPARISON_MODEL]) {
      for (const phaseData of phaseMap.values()) {
        const estimate = calculateEstimatedCost(
          GEMINI_COMPARISON_MODEL,
          phaseData.totalInputTokens,
          phaseData.totalOutputTokens,
        );
        geminiEquivalentCostUsd += estimate.totalCost;
      }
    }
    geminiEquivalentCostUsd =
      Math.round(geminiEquivalentCostUsd * COST_PRECISION) /
      COST_PRECISION;

    const totalActualCost = periodLogs.reduce(
      (sum, l) => sum + l.estimatedCostUsd,
      0,
    );
    const savingsWithGemini =
      totalActualCost > 0
        ? Math.round(
            ((totalActualCost - geminiEquivalentCostUsd) /
              totalActualCost) *
              PERCENTAGE_MULTIPLIER,
          )
        : 0;

    // 5. Projections
    const projections: CostAnalyticsProjection[] =
      PROJECTION_USER_COUNTS.map((users) => {
        const expeditionsPerMonth = users * EXPEDITIONS_PER_USER;
        const monthlyCostUsd =
          Math.round(
            avgCostPerExpedition * expeditionsPerMonth * COST_PRECISION,
          ) / COST_PRECISION;
        const monthlyCostBrl =
          Math.round(monthlyCostUsd * USD_TO_BRL * COST_PRECISION) /
          COST_PRECISION;
        return {
          users,
          expeditionsPerMonth,
          monthlyCostUsd,
          monthlyCostBrl,
        };
      });

    return {
      phases,
      avgCostPerExpedition,
      currentMonthTotalCostUsd,
      geminiEquivalentCostUsd,
      savingsWithGemini,
      projections,
    };
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
