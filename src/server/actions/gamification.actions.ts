"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import type { ActionResult } from "@/types/trip.types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GamificationSummary {
  totalPoints: number;
  currentLevel: number;
  phaseName: string;
  rankName: string;
  badgeCount: number;
}

// ─── getGamificationSummaryAction (Sprint 28 — header badge) ────────────────

export async function getGamificationSummaryAction(): Promise<
  ActionResult<GamificationSummary>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const progress = await PointsEngine.getProgressSummary(session.user.id);
    const currentLevel = Math.min(
      Math.floor(progress.totalPoints / 100) + 1,
      PHASE_DEFINITIONS.length
    );
    const phaseDef = PHASE_DEFINITIONS[currentLevel - 1];
    const phaseName = phaseDef?.name ?? `Phase ${currentLevel}`;

    return {
      success: true,
      data: {
        totalPoints: progress.totalPoints,
        currentLevel,
        phaseName,
        rankName: progress.currentRank,
        badgeCount: progress.badges.length,
      },
    };
  } catch (error) {
    logger.error("gamification.getSummary.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getProgressSummaryAction ─────────────────────────────────────────────────

export async function getProgressSummaryAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof PointsEngine.getProgressSummary>>>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const summary = await PointsEngine.getProgressSummary(session.user.id);
    return { success: true, data: summary };
  } catch (error) {
    logger.error("gamification.getProgressSummary.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getBalanceAction ─────────────────────────────────────────────────────────

export async function getBalanceAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof PointsEngine.getBalance>>>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const balance = await PointsEngine.getBalance(session.user.id);
    return { success: true, data: balance };
  } catch (error) {
    logger.error("gamification.getBalance.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getTransactionHistoryAction ──────────────────────────────────────────────

export async function getTransactionHistoryAction(
  page = 1,
  pageSize = 20
): Promise<
  ActionResult<Awaited<ReturnType<typeof PointsEngine.getTransactionHistory>>>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const history = await PointsEngine.getTransactionHistory(
      session.user.id,
      page,
      pageSize
    );
    return { success: true, data: history };
  } catch (error) {
    logger.error("gamification.getTransactionHistory.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
