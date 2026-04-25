/**
 * GET /api/health/ai-config — public health check for the AI config layer.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.6 + §6.2 (graceful degradation).
 * B-W1-007 — Sprint 46 Day 3.
 *
 * Returns 200 in two states:
 *   - { status: "ok",       source: "database", phases: [...] }
 *   - { status: "degraded", source: "fallback", phases: [...] }
 *
 * Returns 503 if BOTH the DB read and the hardcoded fallback fail (theoretical
 * — fallback is in-memory).
 *
 * No auth (per SPEC §5.6: public). Used by uptime monitors + ops to detect
 * when the AI config layer is operating in degraded mode.
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PhaseHealth {
  phase: string;
  hasAssignment: boolean;
  provider: string;
  modelId: string;
}

interface AiConfigHealthResponse {
  status: "ok" | "degraded";
  source: "database" | "fallback";
  checkedAt: string;
  phases: PhaseHealth[];
}

// Hardcoded fallback — mirrors B-W1-003 seed defaults verbatim.
// Used when the DB is unreachable so the health check still reports
// the platform's commitment, not silence.
const HARDCODED_FALLBACK: PhaseHealth[] = [
  { phase: "plan", hasAssignment: true, provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
  { phase: "checklist", hasAssignment: true, provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
  { phase: "guide", hasAssignment: true, provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
];

export async function GET(): Promise<NextResponse<AiConfigHealthResponse | { error: string }>> {
  const checkedAt = new Date().toISOString();

  try {
    const assignments = await db.modelAssignment.findMany({
      select: { phase: true, primaryProvider: true, primaryModelId: true },
    });

    if (assignments.length === 0) {
      // Migration applied but seed not yet run — degraded but recoverable.
      logger.warn("ai.config.health.empty", { checkedAt });
      return NextResponse.json(
        {
          status: "degraded",
          source: "fallback",
          checkedAt,
          phases: HARDCODED_FALLBACK,
        },
        { status: 200 },
      );
    }

    const phases: PhaseHealth[] = assignments.map((a) => ({
      phase: a.phase,
      hasAssignment: true,
      provider: a.primaryProvider,
      modelId: a.primaryModelId,
    }));

    return NextResponse.json(
      {
        status: "ok",
        source: "database",
        checkedAt,
        phases,
      },
      { status: 200 },
    );
  } catch (error) {
    // DB unreachable. Surface fallback so callers can still operate.
    logger.error("ai.config.health.dbError", error, { checkedAt });
    try {
      return NextResponse.json(
        {
          status: "degraded",
          source: "fallback",
          checkedAt,
          phases: HARDCODED_FALLBACK,
        },
        { status: 200 },
      );
    } catch (fallbackError) {
      logger.error("ai.config.health.fallbackFailed", fallbackError, { checkedAt });
      return NextResponse.json(
        { error: "ai-config-unavailable" },
        { status: 503 },
      );
    }
  }
}
