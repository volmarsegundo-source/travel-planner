"use server";
import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { PointsEngine } from "@/lib/engines/points-engine";
import { getPhaseDefinitions } from "@/lib/engines/phase-config";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { hashUserId } from "@/lib/hash";
import { AI_COSTS } from "@/types/gamification.types";
import type { AiSpendType } from "@/types/gamification.types";
import type { ActionResult } from "@/types/trip.types";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const TripIdSchema = z.string().cuid();
const PaginationSchema = z.object({
  page: z.number().int().positive().max(1000).default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

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
      getPhaseDefinitions().length
    );
    const phaseDef = getPhaseDefinitions()[currentLevel - 1];
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

  const parsed = PaginationSchema.safeParse({ page, pageSize });
  if (!parsed.success) {
    return { success: false, error: "errors.validation" };
  }

  try {
    const history = await PointsEngine.getTransactionHistory(
      session.user.id,
      parsed.data.page,
      parsed.data.pageSize
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

  const tripIdParsed = TripIdSchema.safeParse(tripId);
  if (!tripIdParsed.success) {
    return { success: false, error: "errors.validation" };
  }

  const cost = AI_COSTS[aiType];
  if (cost === undefined) {
    return { success: false, error: "errors.invalidAiType" };
  }

  try {
    // Verify trip ownership (BOLA guard)
    const trip = await db.trip.findFirst({
      where: { id: tripIdParsed.data, userId: session.user.id, deletedAt: null },
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
      tripIdParsed.data
    );

    logger.info("gamification.paSpentForAI", {
      userIdHash: hashUserId(session.user.id),
      aiType,
      cost,
      remaining: result.remainingPoints,
      tripId: tripIdParsed.data,
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

// ─── refundPAForAIAction ─────────────────────────────────────────────────────

export type RefundReason =
  | "generation_failed"
  | "stream_failed"
  | "persist_failed"
  | "timeout";

export interface RefundPAResult {
  refunded: number;
  newBalance: number;
}

/**
 * Refunds PA previously debited by spendPAForAIAction when an AI generation
 * ultimately failed. Called by phase clients from their error branches so
 * the user is never charged for a generation that didn't produce output.
 *
 * The refund is recorded as a positive PointTransaction with type "ai_refund"
 * and is idempotent per (userId, tripId, aiType, reason) within a short
 * window — repeated client calls for the same failure won't double-refund.
 *
 * Trust boundary: the client is the source of the failure signal. The refund
 * amount is server-bounded to AI_COSTS[aiType] so a hostile client can
 * recover at most the amount they just spent. A short-window idempotency
 * check further limits abuse.
 */
export async function refundPAForAIAction(
  tripId: string,
  aiType: AiSpendType,
  reason: RefundReason,
): Promise<ActionResult<RefundPAResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const tripIdParsed = TripIdSchema.safeParse(tripId);
  if (!tripIdParsed.success) {
    return { success: false, error: "errors.validation" };
  }

  const cost = AI_COSTS[aiType];
  if (cost === undefined) {
    return { success: false, error: "errors.invalidAiType" };
  }

  try {
    // BOLA guard
    const trip = await db.trip.findFirst({
      where: { id: tripIdParsed.data, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!trip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Idempotency: refuse to double-refund the same failure. We look for
    // a recent spend of the same aiType on this trip that has not already
    // been refunded, and only refund in that case.
    const sinceMs = 10 * 60 * 1000; // 10 min
    const since = new Date(Date.now() - sinceMs);
    const [recentSpend, recentRefund] = await Promise.all([
      db.pointTransaction.findFirst({
        where: {
          userId: session.user.id,
          tripId: tripIdParsed.data,
          type: "ai_usage",
          amount: { lt: 0 },
          description: { contains: aiType },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      }),
      db.pointTransaction.findFirst({
        where: {
          userId: session.user.id,
          tripId: tripIdParsed.data,
          type: "ai_refund",
          description: { contains: aiType },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      }),
    ]);

    if (!recentSpend) {
      // Nothing to refund — client over-reported a failure.
      return { success: false, error: "errors.noRecentSpend" };
    }
    if (recentRefund && recentRefund.createdAt > recentSpend.createdAt) {
      // Already refunded this spend.
      const balance = await PointsEngine.getBalance(session.user.id);
      return {
        success: true,
        data: { refunded: 0, newBalance: balance.availablePoints },
      };
    }

    await PointsEngine.earnPoints(
      session.user.id,
      cost,
      "ai_refund",
      `Refund ${aiType}: ${reason}`,
      tripIdParsed.data,
    );

    const balance = await PointsEngine.getBalance(session.user.id);

    logger.info("pa.refund", {
      userIdHash: hashUserId(session.user.id),
      tripId: tripIdParsed.data,
      aiType,
      reason,
      refunded: cost,
      newBalance: balance.availablePoints,
    });

    return {
      success: true,
      data: { refunded: cost, newBalance: balance.availablePoints },
    };
  } catch (error) {
    logger.error("gamification.refundPAForAI.error", error, {
      userIdHash: hashUserId(session.user.id),
      aiType,
      tripId,
      reason,
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
