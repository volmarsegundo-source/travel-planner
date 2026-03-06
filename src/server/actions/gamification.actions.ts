"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { PointsEngine } from "@/lib/engines/points-engine";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import type { ActionResult } from "@/types/trip.types";

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
