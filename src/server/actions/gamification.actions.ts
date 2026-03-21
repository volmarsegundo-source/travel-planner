"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { hashUserId } from "@/lib/hash";
import { AI_COSTS } from "@/types/gamification.types";
import type { AiSpendType } from "@/types/gamification.types";
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

// ─── spendPAForAIAction ──────────────────────────────────────────────────────

export interface SpendPAForAIResult {
  remainingBalance: number;
  transactionId: string;
}

/**
 * Result type for spendPAForAIAction that extends ActionResult
 * to include balance info on insufficient balance errors.
 */
export type SpendPAForAIActionResult =
  | { success: true; data: SpendPAForAIResult }
  | { success: false; error: string; balance?: number; cost?: number };

export async function spendPAForAIAction(
  tripId: string,
  aiType: AiSpendType
): Promise<SpendPAForAIActionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const cost = AI_COSTS[aiType];
  if (cost === undefined) {
    return { success: false, error: "errors.invalidAiType" };
  }

  try {
    // Verify trip ownership (BOLA guard)
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    const balance = await PointsEngine.getBalance(session.user.id);

    if (balance.availablePoints < cost) {
      return {
        success: false,
        error: "errors.insufficientBalance",
        balance: balance.availablePoints,
        cost,
      };
    }

    const result = await PointsEngine.spendPoints(
      session.user.id,
      cost,
      "ai_usage",
      `AI: ${aiType}`,
      tripId
    );

    logger.info("gamification.paSpentForAI", {
      userIdHash: hashUserId(session.user.id),
      aiType,
      cost,
      remaining: result.remainingPoints,
      tripId,
    });

    return {
      success: true,
      data: {
        remainingBalance: result.remainingPoints,
        transactionId: result.transactionId,
      },
    };
  } catch (error) {
    logger.error("gamification.spendPAForAI.error", error, {
      userIdHash: hashUserId(session.user.id),
      aiType,
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completeTutorialAction ──────────────────────────────────────────────────

const TUTORIAL_BONUS_POINTS = 100;
const TUTORIAL_TX_DESCRIPTION = "Tutorial completion bonus";

/**
 * Awards PA for tutorial completion. Idempotent — only awards once per user.
 * Uses PointTransaction lookup to prevent double-awarding.
 */
export async function completeTutorialAction(): Promise<
  ActionResult<{ pointsAwarded: number; alreadyCompleted: boolean }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // Check if tutorial bonus was already awarded (idempotent)
    const existingTx = await db.pointTransaction.findFirst({
      where: {
        userId: session.user.id,
        type: "purchase",
        description: TUTORIAL_TX_DESCRIPTION,
      },
    });

    if (existingTx) {
      return {
        success: true,
        data: { pointsAwarded: 0, alreadyCompleted: true },
      };
    }

    // Award tutorial bonus
    await PointsEngine.earnPoints(
      session.user.id,
      TUTORIAL_BONUS_POINTS,
      "purchase",
      TUTORIAL_TX_DESCRIPTION
    );

    logger.info("gamification.tutorialCompleted", {
      userIdHash: hashUserId(session.user.id),
      points: TUTORIAL_BONUS_POINTS,
    });

    return {
      success: true,
      data: { pointsAwarded: TUTORIAL_BONUS_POINTS, alreadyCompleted: false },
    };
  } catch (error) {
    logger.error("gamification.completeTutorial.error", error, {
      userIdHash: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
