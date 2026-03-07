import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import type {
  PointBalanceResult,
  PointTransactionType,
  Rank,
  BadgeKey,
} from "@/types/gamification.types";
import { WELCOME_BONUS, EARNING_AMOUNTS } from "@/types/gamification.types";
import { AppError } from "@/lib/errors";

// ─── Points Engine ──────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export class PointsEngine {
  /**
   * Initialize user progress with welcome bonus. Idempotent.
   */
  static async initializeProgress(userId: string, tx?: Tx): Promise<void> {
    const client = tx ?? db;

    const existing = await client.userProgress.findUnique({
      where: { userId },
    });
    if (existing) return;

    await client.userProgress.create({
      data: {
        userId,
        totalPoints: WELCOME_BONUS,
        availablePoints: WELCOME_BONUS,
        currentRank: "traveler",
      },
    });

    await client.pointTransaction.create({
      data: {
        userId,
        amount: WELCOME_BONUS,
        type: "purchase",
        description: "Welcome bonus",
      },
    });

    logger.info("gamification.progressInitialized", { userId });
  }

  /**
   * Get current point balance and rank.
   */
  static async getBalance(userId: string): Promise<PointBalanceResult> {
    const progress = await db.userProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return {
        totalPoints: 0,
        availablePoints: 0,
        currentRank: "traveler" as Rank,
      };
    }

    return {
      totalPoints: progress.totalPoints,
      availablePoints: progress.availablePoints,
      currentRank: progress.currentRank as Rank,
    };
  }

  /**
   * Get full progress summary including badges and streak.
   */
  static async getProgressSummary(userId: string) {
    const [progress, badges] = await Promise.all([
      db.userProgress.findUnique({ where: { userId } }),
      db.userBadge.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
      }),
    ]);

    return {
      totalPoints: progress?.totalPoints ?? 0,
      availablePoints: progress?.availablePoints ?? 0,
      currentRank: (progress?.currentRank ?? "traveler") as Rank,
      streakDays: progress?.streakDays ?? 0,
      lastLoginDate: progress?.lastLoginDate ?? null,
      badges: badges.map((b) => ({
        badgeKey: b.badgeKey as BadgeKey,
        earnedAt: b.earnedAt,
      })),
    };
  }

  /**
   * Award points to a user. Creates a PointTransaction as audit trail.
   */
  static async earnPoints(
    userId: string,
    amount: number,
    type: PointTransactionType,
    description: string,
    tripId?: string,
    tx?: Tx
  ): Promise<void> {
    const client = tx ?? db;

    await client.userProgress.update({
      where: { userId },
      data: {
        totalPoints: { increment: amount },
        availablePoints: { increment: amount },
      },
    });

    await client.pointTransaction.create({
      data: { userId, amount, type, description, tripId },
    });

    logger.info("gamification.pointsEarned", {
      userId,
      amount,
      type,
      tripId: tripId ?? undefined,
    });
  }

  /**
   * Spend points. Throws INSUFFICIENT_POINTS if balance is too low.
   */
  static async spendPoints(
    userId: string,
    amount: number,
    type: PointTransactionType,
    description: string,
    tripId?: string
  ): Promise<{ remainingPoints: number; transactionId: string }> {
    return db.$transaction(async (tx) => {
      const progress = await tx.userProgress.findUnique({
        where: { userId },
      });

      if (!progress || progress.availablePoints < amount) {
        throw new AppError(
          "INSUFFICIENT_POINTS",
          `Not enough points. Required: ${amount}, available: ${progress?.availablePoints ?? 0}`,
          400
        );
      }

      const updated = await tx.userProgress.update({
        where: { userId },
        data: { availablePoints: { decrement: amount } },
      });

      const transaction = await tx.pointTransaction.create({
        data: { userId, amount: -amount, type, description, tripId },
      });

      logger.info("gamification.pointsSpent", {
        userId,
        amount,
        type,
        remaining: updated.availablePoints,
      });

      return {
        remainingPoints: updated.availablePoints,
        transactionId: transaction.id,
      };
    });
  }

  /**
   * Record daily login. Awards points if different UTC day. Updates streak.
   * Idempotent on the same UTC day.
   */
  static async recordDailyLogin(userId: string): Promise<void> {
    const progress = await db.userProgress.findUnique({
      where: { userId },
    });
    if (!progress) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const lastLogin = progress.lastLoginDate
      ? new Date(progress.lastLoginDate)
      : null;
    if (lastLogin) {
      lastLogin.setUTCHours(0, 0, 0, 0);
    }

    // Same UTC day — no-op
    if (lastLogin && lastLogin.getTime() === today.getTime()) return;

    // Calculate streak
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const isConsecutive =
      lastLogin && lastLogin.getTime() === yesterday.getTime();
    const newStreak = isConsecutive ? progress.streakDays + 1 : 1;

    await db.userProgress.update({
      where: { userId },
      data: {
        lastLoginDate: new Date(),
        streakDays: newStreak,
        totalPoints: { increment: EARNING_AMOUNTS.daily_login },
        availablePoints: { increment: EARNING_AMOUNTS.daily_login },
      },
    });

    await db.pointTransaction.create({
      data: {
        userId,
        amount: EARNING_AMOUNTS.daily_login,
        type: "daily_login",
        description: `Daily login bonus (streak: ${newStreak})`,
      },
    });

    logger.info("gamification.dailyLogin", { userId, streak: newStreak });
  }

  /**
   * Award points for completing a profile field. Idempotent per field.
   */
  static async awardProfileCompletion(
    userId: string,
    fieldKey: string,
    points: number,
    tx?: Tx
  ): Promise<void> {
    const client = tx ?? db;
    const description = `Profile field: ${fieldKey}`;

    // Idempotent: check if already awarded for this field
    const existing = await client.pointTransaction.findFirst({
      where: {
        userId,
        type: "profile_completion",
        description,
      },
    });
    if (existing) return;

    await PointsEngine.earnPoints(
      userId,
      points,
      "profile_completion",
      description,
      undefined,
      tx
    );
    logger.info("gamification.profileFieldAwarded", {
      userId,
      fieldKey,
      points,
    });
  }

  /**
   * Update user rank. Called by PhaseEngine during phase completion.
   */
  static async updateRank(
    userId: string,
    newRank: Rank,
    tx?: Tx
  ): Promise<void> {
    const client = tx ?? db;

    await client.userProgress.update({
      where: { userId },
      data: { currentRank: newRank },
    });

    logger.info("gamification.rankUpdated", { userId, newRank });
  }

  /**
   * Award a badge to a user. Idempotent via unique constraint.
   * Returns true if badge was newly awarded, false if already owned.
   */
  static async awardBadge(
    userId: string,
    badgeKey: BadgeKey,
    tx?: Tx
  ): Promise<boolean> {
    const client = tx ?? db;

    const existing = await client.userBadge.findUnique({
      where: { userId_badgeKey: { userId, badgeKey } },
    });

    if (existing) return false;

    await client.userBadge.create({
      data: { userId, badgeKey },
    });

    logger.info("gamification.badgeAwarded", { userId, badgeKey });
    return true;
  }

  /**
   * Quick check if user can afford a cost. No side effects.
   */
  static async canAfford(userId: string, amount: number): Promise<boolean> {
    const progress = await db.userProgress.findUnique({
      where: { userId },
    });

    return (progress?.availablePoints ?? 0) >= amount;
  }

  /**
   * Get paginated transaction history for a user.
   */
  static async getTransactionHistory(
    userId: string,
    page = 1,
    pageSize = 20
  ) {
    pageSize = Math.min(Math.max(1, pageSize), 100);

    const [transactions, total] = await Promise.all([
      db.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.pointTransaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
