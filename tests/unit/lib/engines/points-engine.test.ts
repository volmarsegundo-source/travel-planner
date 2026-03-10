/**
 * Unit tests for PointsEngine (Atlas gamification).
 *
 * Tests cover:
 * - initializeProgress: welcome bonus creation, idempotency, tx passthrough
 * - getBalance: existing / missing progress
 * - getProgressSummary: full summary with badges, defaults, mapping
 * - earnPoints: increment, transaction creation, tx passthrough, logging
 * - spendPoints: deduction, insufficient balance, missing progress, negative tx
 * - recordDailyLogin: first login, streak reset, streak increment, same-day idempotency
 * - updateRank: rank update, tx passthrough, logging
 * - awardBadge: new badge, duplicate idempotency, tx passthrough
 * - canAfford: sufficient / insufficient / missing balance
 * - getTransactionHistory: pagination, metadata, skip/take
 *
 * Mocking pattern: vi.mock() with mockDeep<PrismaClient> for Prisma,
 * vi.fn() for logger. SUT imported after mocks are registered.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Import SUT after mocks are registered ──────────────────────────────────

import { PointsEngine } from "@/lib/engines/points-engine";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { WELCOME_BONUS, EARNING_AMOUNTS } from "@/types/gamification.types";
import { hashUserId } from "@/lib/hash";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = "user-test-123";

/**
 * Sets up the $transaction mock to execute the callback with a mock tx client.
 */
function setupTransactionMock() {
  const mockTx = {
    userProgress: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pointTransaction: {
      create: vi.fn(),
    },
  };

  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === "function") return fn(mockTx as never);
    return undefined as never;
  });

  return mockTx;
}

function makeProgress(overrides: Record<string, unknown> = {}) {
  return {
    id: "progress-1",
    userId: USER_ID,
    totalPoints: 500,
    availablePoints: 500,
    currentRank: "traveler",
    streakDays: 0,
    lastLoginDate: null as Date | null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    userId: USER_ID,
    amount: 500,
    type: "purchase",
    description: "Welcome bonus",
    tripId: null as string | null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeBadge(overrides: Record<string, unknown> = {}) {
  return {
    id: "badge-1",
    userId: USER_ID,
    badgeKey: "first_step",
    earnedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── initializeProgress ─────────────────────────────────────────────────────

describe("PointsEngine.initializeProgress", () => {
  it("creates UserProgress with 500 welcome bonus when no existing progress", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);
    prismaMock.userProgress.create.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.initializeProgress(USER_ID);

    expect(prismaMock.userProgress.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        totalPoints: WELCOME_BONUS,
        availablePoints: WELCOME_BONUS,
        currentRank: "traveler",
      },
    });
  });

  it("creates PointTransaction for welcome bonus", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);
    prismaMock.userProgress.create.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.initializeProgress(USER_ID);

    expect(prismaMock.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        amount: WELCOME_BONUS,
        type: "purchase",
        description: "Welcome bonus",
      },
    });
  });

  it("skips creation if progress already exists (idempotent)", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(makeProgress() as never);

    await PointsEngine.initializeProgress(USER_ID);

    expect(prismaMock.userProgress.create).not.toHaveBeenCalled();
    expect(prismaMock.pointTransaction.create).not.toHaveBeenCalled();
  });

  it("uses provided transaction client when tx is passed", async () => {
    const txClient = mockDeep<PrismaClient>();
    txClient.userProgress.findUnique.mockResolvedValue(null);
    txClient.userProgress.create.mockResolvedValue(makeProgress() as never);
    txClient.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.initializeProgress(USER_ID, txClient as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);

    expect(txClient.userProgress.findUnique).toHaveBeenCalled();
    expect(txClient.userProgress.create).toHaveBeenCalled();
    expect(txClient.pointTransaction.create).toHaveBeenCalled();
    // The main db should NOT have been used
    expect(prismaMock.userProgress.findUnique).not.toHaveBeenCalled();
  });

  it("logs gamification.progressInitialized on success", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);
    prismaMock.userProgress.create.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.initializeProgress(USER_ID);

    expect(logger.info).toHaveBeenCalledWith("gamification.progressInitialized", { userIdHash: hashUserId(USER_ID) });
  });
});

// ─── getBalance ─────────────────────────────────────────────────────────────

describe("PointsEngine.getBalance", () => {
  it("returns correct balance when progress exists", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ totalPoints: 1200, availablePoints: 800, currentRank: "explorer" }) as never
    );

    const result = await PointsEngine.getBalance(USER_ID);

    expect(result).toEqual({
      totalPoints: 1200,
      availablePoints: 800,
      currentRank: "explorer",
    });
  });

  it("returns zeros and 'traveler' when no progress exists", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);

    const result = await PointsEngine.getBalance(USER_ID);

    expect(result).toEqual({
      totalPoints: 0,
      availablePoints: 0,
      currentRank: "traveler",
    });
  });

  it("returns currentRank from database", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ currentRank: "cartographer" }) as never
    );

    const result = await PointsEngine.getBalance(USER_ID);

    expect(result.currentRank).toBe("cartographer");
  });
});

// ─── getProgressSummary ─────────────────────────────────────────────────────

describe("PointsEngine.getProgressSummary", () => {
  it("returns full summary with badges when progress exists", async () => {
    const earnedAt = new Date("2026-02-10");
    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({
        totalPoints: 900,
        availablePoints: 650,
        currentRank: "navigator",
        streakDays: 5,
        lastLoginDate: new Date("2026-03-05"),
      }) as never
    );
    prismaMock.userBadge.findMany.mockResolvedValue([
      makeBadge({ badgeKey: "first_step", earnedAt }),
    ] as never);

    const result = await PointsEngine.getProgressSummary(USER_ID);

    expect(result).toEqual({
      totalPoints: 900,
      availablePoints: 650,
      currentRank: "navigator",
      streakDays: 5,
      lastLoginDate: new Date("2026-03-05"),
      badges: [{ badgeKey: "first_step", earnedAt }],
    });
  });

  it("returns defaults when no progress exists", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);
    prismaMock.userBadge.findMany.mockResolvedValue([]);

    const result = await PointsEngine.getProgressSummary(USER_ID);

    expect(result).toEqual({
      totalPoints: 0,
      availablePoints: 0,
      currentRank: "traveler",
      streakDays: 0,
      lastLoginDate: null,
      badges: [],
    });
  });

  it("returns empty badges array when user has no badges", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(makeProgress() as never);
    prismaMock.userBadge.findMany.mockResolvedValue([]);

    const result = await PointsEngine.getProgressSummary(USER_ID);

    expect(result.badges).toEqual([]);
  });

  it("maps badge objects correctly", async () => {
    const earnedAt1 = new Date("2026-01-10");
    const earnedAt2 = new Date("2026-02-20");
    prismaMock.userProgress.findUnique.mockResolvedValue(makeProgress() as never);
    prismaMock.userBadge.findMany.mockResolvedValue([
      makeBadge({ badgeKey: "navigator", earnedAt: earnedAt2 }),
      makeBadge({ id: "badge-2", badgeKey: "first_step", earnedAt: earnedAt1 }),
    ] as never);

    const result = await PointsEngine.getProgressSummary(USER_ID);

    expect(result.badges).toEqual([
      { badgeKey: "navigator", earnedAt: earnedAt2 },
      { badgeKey: "first_step", earnedAt: earnedAt1 },
    ]);
  });
});

// ─── earnPoints ─────────────────────────────────────────────────────────────

describe("PointsEngine.earnPoints", () => {
  it("increments totalPoints and availablePoints", async () => {
    prismaMock.userProgress.update.mockResolvedValue(makeProgress({ totalPoints: 700, availablePoints: 700 }) as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction({ amount: 200 }) as never);

    await PointsEngine.earnPoints(USER_ID, 200, "phase_complete", "Phase 1 completed");

    expect(prismaMock.userProgress.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: {
        totalPoints: { increment: 200 },
        availablePoints: { increment: 200 },
      },
    });
  });

  it("creates PointTransaction with correct data", async () => {
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.earnPoints(USER_ID, 100, "checklist", "Checklist item done");

    expect(prismaMock.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        amount: 100,
        type: "checklist",
        description: "Checklist item done",
        tripId: undefined,
      },
    });
  });

  it("includes tripId when provided", async () => {
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.earnPoints(USER_ID, 50, "phase_complete", "Phase done", "trip-abc");

    expect(prismaMock.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        amount: 50,
        type: "phase_complete",
        description: "Phase done",
        tripId: "trip-abc",
      },
    });
  });

  it("uses tx client when provided", async () => {
    const txClient = mockDeep<PrismaClient>();
    txClient.userProgress.update.mockResolvedValue(makeProgress() as never);
    txClient.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.earnPoints(
      USER_ID, 100, "phase_complete", "Phase done", undefined,
      txClient as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]
    );

    expect(txClient.userProgress.update).toHaveBeenCalled();
    expect(txClient.pointTransaction.create).toHaveBeenCalled();
    expect(prismaMock.userProgress.update).not.toHaveBeenCalled();
  });

  it("logs gamification.pointsEarned", async () => {
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.earnPoints(USER_ID, 200, "phase_complete", "Phase done", "trip-1");

    expect(logger.info).toHaveBeenCalledWith("gamification.pointsEarned", {
      userIdHash: hashUserId(USER_ID),
      amount: 200,
      type: "phase_complete",
      tripId: "trip-1",
    });
  });
});

// ─── spendPoints ────────────────────────────────────────────────────────────

describe("PointsEngine.spendPoints", () => {
  it("deducts points and returns remaining + transactionId", async () => {
    const mockTx = setupTransactionMock();
    mockTx.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 400 }) as never
    );
    mockTx.userProgress.update.mockResolvedValue(
      makeProgress({ availablePoints: 300 }) as never
    );
    mockTx.pointTransaction.create.mockResolvedValue(
      makeTransaction({ id: "tx-spend-1", amount: -100 }) as never
    );

    const result = await PointsEngine.spendPoints(USER_ID, 100, "ai_usage", "AI itinerary");

    expect(result).toEqual({
      remainingPoints: 300,
      transactionId: "tx-spend-1",
    });
  });

  it("throws INSUFFICIENT_POINTS when balance too low", async () => {
    const mockTx = setupTransactionMock();
    mockTx.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 50 }) as never
    );

    await expect(
      PointsEngine.spendPoints(USER_ID, 200, "ai_usage", "AI route")
    ).rejects.toThrow(AppError);

    mockTx.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 50 }) as never
    );

    await expect(
      PointsEngine.spendPoints(USER_ID, 200, "ai_usage", "AI route")
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_POINTS",
      statusCode: 400,
    });
  });

  it("throws INSUFFICIENT_POINTS when no progress exists", async () => {
    const mockTx = setupTransactionMock();
    mockTx.userProgress.findUnique.mockResolvedValue(null);

    await expect(
      PointsEngine.spendPoints(USER_ID, 100, "ai_usage", "AI route")
    ).rejects.toThrow(AppError);

    mockTx.userProgress.findUnique.mockResolvedValue(null);

    await expect(
      PointsEngine.spendPoints(USER_ID, 100, "ai_usage", "AI route")
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_POINTS",
    });
  });

  it("creates negative amount PointTransaction", async () => {
    const mockTx = setupTransactionMock();
    mockTx.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 500 }) as never
    );
    mockTx.userProgress.update.mockResolvedValue(
      makeProgress({ availablePoints: 350 }) as never
    );
    mockTx.pointTransaction.create.mockResolvedValue(
      makeTransaction({ id: "tx-neg", amount: -150 }) as never
    );

    await PointsEngine.spendPoints(USER_ID, 150, "ai_usage", "AI accommodation");

    expect(mockTx.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        amount: -150,
        type: "ai_usage",
        description: "AI accommodation",
        tripId: undefined,
      },
    });
  });

  it("logs gamification.pointsSpent", async () => {
    const mockTx = setupTransactionMock();
    mockTx.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 500 }) as never
    );
    mockTx.userProgress.update.mockResolvedValue(
      makeProgress({ availablePoints: 400 }) as never
    );
    mockTx.pointTransaction.create.mockResolvedValue(
      makeTransaction({ id: "tx-log", amount: -100 }) as never
    );

    await PointsEngine.spendPoints(USER_ID, 100, "ai_usage", "AI itinerary");

    expect(logger.info).toHaveBeenCalledWith("gamification.pointsSpent", {
      userIdHash: hashUserId(USER_ID),
      amount: 100,
      type: "ai_usage",
      remaining: 400,
    });
  });

  it("wraps operations in a $transaction", async () => {
    const mockTx = setupTransactionMock();
    mockTx.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 500 }) as never
    );
    mockTx.userProgress.update.mockResolvedValue(
      makeProgress({ availablePoints: 400 }) as never
    );
    mockTx.pointTransaction.create.mockResolvedValue(
      makeTransaction({ id: "tx-atomic", amount: -100 }) as never
    );

    await PointsEngine.spendPoints(USER_ID, 100, "ai_usage", "AI itinerary");

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(mockTx.userProgress.findUnique).toHaveBeenCalled();
    expect(mockTx.userProgress.update).toHaveBeenCalled();
    expect(mockTx.pointTransaction.create).toHaveBeenCalled();
  });
});

// ─── recordDailyLogin ───────────────────────────────────────────────────────

describe("PointsEngine.recordDailyLogin", () => {
  it("awards 10 points on first login (no lastLoginDate)", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ streakDays: 0, lastLoginDate: null }) as never
    );
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.recordDailyLogin(USER_ID);

    expect(prismaMock.userProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        data: expect.objectContaining({
          streakDays: 1,
          totalPoints: { increment: EARNING_AMOUNTS.daily_login },
          availablePoints: { increment: EARNING_AMOUNTS.daily_login },
        }),
      })
    );
  });

  it("resets streak to 1 when login is not consecutive", async () => {
    // Last login was 3 days ago — not consecutive
    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    threeDaysAgo.setUTCHours(12, 0, 0, 0);

    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ streakDays: 5, lastLoginDate: threeDaysAgo }) as never
    );
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.recordDailyLogin(USER_ID);

    expect(prismaMock.userProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          streakDays: 1,
        }),
      })
    );
  });

  it("increments streak when login is consecutive (yesterday)", async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(15, 30, 0, 0);

    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ streakDays: 3, lastLoginDate: yesterday }) as never
    );
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.recordDailyLogin(USER_ID);

    expect(prismaMock.userProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          streakDays: 4,
        }),
      })
    );
  });

  it("does nothing if already logged in same UTC day (idempotent)", async () => {
    const today = new Date();
    today.setUTCHours(3, 0, 0, 0); // earlier today

    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ streakDays: 2, lastLoginDate: today }) as never
    );

    await PointsEngine.recordDailyLogin(USER_ID);

    expect(prismaMock.userProgress.update).not.toHaveBeenCalled();
    expect(prismaMock.pointTransaction.create).not.toHaveBeenCalled();
  });

  it("does nothing if no progress exists", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);

    await PointsEngine.recordDailyLogin(USER_ID);

    expect(prismaMock.userProgress.update).not.toHaveBeenCalled();
    expect(prismaMock.pointTransaction.create).not.toHaveBeenCalled();
  });

  it("creates PointTransaction for daily login", async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ streakDays: 2, lastLoginDate: yesterday }) as never
    );
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(makeTransaction() as never);

    await PointsEngine.recordDailyLogin(USER_ID);

    expect(prismaMock.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        amount: EARNING_AMOUNTS.daily_login,
        type: "daily_login",
        description: expect.stringContaining("Daily login bonus (streak:"),
      },
    });
  });
});

// ─── updateRank ─────────────────────────────────────────────────────────────

describe("PointsEngine.updateRank", () => {
  it("updates currentRank in database", async () => {
    prismaMock.userProgress.update.mockResolvedValue(
      makeProgress({ currentRank: "explorer" }) as never
    );

    await PointsEngine.updateRank(USER_ID, "explorer");

    expect(prismaMock.userProgress.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { currentRank: "explorer" },
    });
  });

  it("uses tx client when provided", async () => {
    const txClient = mockDeep<PrismaClient>();
    txClient.userProgress.update.mockResolvedValue(makeProgress() as never);

    await PointsEngine.updateRank(
      USER_ID, "navigator",
      txClient as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]
    );

    expect(txClient.userProgress.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { currentRank: "navigator" },
    });
    expect(prismaMock.userProgress.update).not.toHaveBeenCalled();
  });

  it("logs gamification.rankUpdated", async () => {
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);

    await PointsEngine.updateRank(USER_ID, "pathfinder");

    expect(logger.info).toHaveBeenCalledWith("gamification.rankUpdated", {
      userIdHash: hashUserId(USER_ID),
      newRank: "pathfinder",
    });
  });
});

// ─── awardBadge ─────────────────────────────────────────────────────────────

describe("PointsEngine.awardBadge", () => {
  it("creates badge when not already owned, returns true", async () => {
    prismaMock.userBadge.findUnique.mockResolvedValue(null);
    prismaMock.userBadge.create.mockResolvedValue(makeBadge() as never);

    const result = await PointsEngine.awardBadge(USER_ID, "first_step");

    expect(result).toBe(true);
    expect(prismaMock.userBadge.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, badgeKey: "first_step" },
    });
  });

  it("returns false when badge already exists (idempotent)", async () => {
    prismaMock.userBadge.findUnique.mockResolvedValue(makeBadge() as never);

    const result = await PointsEngine.awardBadge(USER_ID, "first_step");

    expect(result).toBe(false);
    expect(prismaMock.userBadge.create).not.toHaveBeenCalled();
  });

  it("uses tx client when provided", async () => {
    const txClient = mockDeep<PrismaClient>();
    txClient.userBadge.findUnique.mockResolvedValue(null);
    txClient.userBadge.create.mockResolvedValue(makeBadge() as never);

    const result = await PointsEngine.awardBadge(
      USER_ID, "navigator",
      txClient as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]
    );

    expect(result).toBe(true);
    expect(txClient.userBadge.findUnique).toHaveBeenCalled();
    expect(txClient.userBadge.create).toHaveBeenCalled();
    expect(prismaMock.userBadge.findUnique).not.toHaveBeenCalled();
  });

  it("logs gamification.badgeAwarded on new badge", async () => {
    prismaMock.userBadge.findUnique.mockResolvedValue(null);
    prismaMock.userBadge.create.mockResolvedValue(makeBadge({ badgeKey: "treasurer" }) as never);

    await PointsEngine.awardBadge(USER_ID, "treasurer");

    expect(logger.info).toHaveBeenCalledWith("gamification.badgeAwarded", {
      userIdHash: hashUserId(USER_ID),
      badgeKey: "treasurer",
    });
  });
});

// ─── canAfford ──────────────────────────────────────────────────────────────

describe("PointsEngine.canAfford", () => {
  it("returns true when balance >= amount", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 300 }) as never
    );

    const result = await PointsEngine.canAfford(USER_ID, 300);

    expect(result).toBe(true);
  });

  it("returns false when balance < amount", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(
      makeProgress({ availablePoints: 50 }) as never
    );

    const result = await PointsEngine.canAfford(USER_ID, 100);

    expect(result).toBe(false);
  });

  it("returns false when no progress exists", async () => {
    prismaMock.userProgress.findUnique.mockResolvedValue(null);

    const result = await PointsEngine.canAfford(USER_ID, 1);

    expect(result).toBe(false);
  });
});

// ─── getTransactionHistory ──────────────────────────────────────────────────

describe("PointsEngine.getTransactionHistory", () => {
  it("returns paginated transactions with correct metadata", async () => {
    const txList = [
      makeTransaction({ id: "tx-a", amount: 200, type: "phase_complete" }),
      makeTransaction({ id: "tx-b", amount: -100, type: "ai_usage" }),
    ];
    prismaMock.pointTransaction.findMany.mockResolvedValue(txList as never);
    prismaMock.pointTransaction.count.mockResolvedValue(2 as never);

    const result = await PointsEngine.getTransactionHistory(USER_ID);

    expect(result).toEqual({
      transactions: txList,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it("calculates totalPages correctly", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([] as never);
    prismaMock.pointTransaction.count.mockResolvedValue(45 as never);

    const result = await PointsEngine.getTransactionHistory(USER_ID, 1, 20);

    expect(result.totalPages).toBe(3); // ceil(45 / 20) = 3
    expect(result.total).toBe(45);
  });

  it("applies correct skip/take for page 2", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([] as never);
    prismaMock.pointTransaction.count.mockResolvedValue(30 as never);

    await PointsEngine.getTransactionHistory(USER_ID, 2, 10);

    expect(prismaMock.pointTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      skip: 10, // (2 - 1) * 10
      take: 10,
    });
  });

  it("defaults to page 1 and pageSize 20", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([] as never);
    prismaMock.pointTransaction.count.mockResolvedValue(0 as never);

    await PointsEngine.getTransactionHistory(USER_ID);

    expect(prismaMock.pointTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("caps pageSize at 100", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([] as never);
    prismaMock.pointTransaction.count.mockResolvedValue(0 as never);

    const result = await PointsEngine.getTransactionHistory(USER_ID, 1, 500);

    expect(prismaMock.pointTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 100,
    });
    expect(result.pageSize).toBe(100);
  });

  it("normalizes pageSize to 1 when 0", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([] as never);
    prismaMock.pointTransaction.count.mockResolvedValue(0 as never);

    const result = await PointsEngine.getTransactionHistory(USER_ID, 1, 0);

    expect(prismaMock.pointTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 1,
    });
    expect(result.pageSize).toBe(1);
  });
});
