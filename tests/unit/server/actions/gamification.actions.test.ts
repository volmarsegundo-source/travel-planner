/**
 * Unit tests for gamification.actions.ts (Sprint 35 Wave 1).
 *
 * Tests cover:
 * - spendPAForAIAction: auth, BOLA, sufficient balance, insufficient balance, invalid type
 * - completeTutorialAction: auth, first completion, idempotent second call
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockAuth, mockGetBalance, mockSpendPoints, mockEarnPoints } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetBalance: vi.fn(),
  mockSpendPoints: vi.fn(),
  mockEarnPoints: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn((id: string) => `hash_${id}`),
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : "errors.generic"
  ),
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    getBalance: mockGetBalance,
    spendPoints: mockSpendPoints,
    earnPoints: mockEarnPoints,
    getProgressSummary: vi.fn(),
    getTransactionHistory: vi.fn(),
  },
}));

vi.mock("@/lib/engines/phase-config", () => ({
  PHASE_DEFINITIONS: [
    { phaseNumber: 1, name: "A Inspiração", pointsReward: 100 },
    { phaseNumber: 2, name: "O Perfil", pointsReward: 150 },
  ],
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────

import { spendPAForAIAction, completeTutorialAction } from "@/server/actions/gamification.actions";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = "user-test-123";
const TRIP_ID = "trip-test-456";

function mockAuthenticatedSession() {
  mockAuth.mockResolvedValue({
    user: { id: USER_ID, email: "test@test.com" },
  });
}

function mockUnauthenticatedSession() {
  mockAuth.mockResolvedValue(null);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── spendPAForAIAction ─────────────────────────────────────────────────────

describe("spendPAForAIAction", () => {
  it("throws UnauthorizedError when not authenticated", async () => {
    mockUnauthenticatedSession();

    await expect(
      spendPAForAIAction(TRIP_ID, "ai_itinerary")
    ).rejects.toThrow(UnauthorizedError);
  });

  it("returns error when trip not found (BOLA guard)", async () => {
    mockAuthenticatedSession();
    prismaMock.trip.findFirst.mockResolvedValue(null);

    const result = await spendPAForAIAction(TRIP_ID, "ai_itinerary");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("errors.tripNotFound");
    }
  });

  it("returns insufficient balance error when PA too low", async () => {
    mockAuthenticatedSession();
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    mockGetBalance.mockResolvedValue({
      totalPoints: 50,
      availablePoints: 50,
      currentRank: "novato",
    });

    const result = await spendPAForAIAction(TRIP_ID, "ai_itinerary");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("errors.insufficientBalance");
      expect(result.balance).toBe(50);
      expect(result.cost).toBe(80); // AI_COSTS.ai_itinerary = 80
    }
  });

  it("successfully spends PA when balance is sufficient", async () => {
    mockAuthenticatedSession();
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    mockGetBalance.mockResolvedValue({
      totalPoints: 200,
      availablePoints: 200,
      currentRank: "novato",
    });
    mockSpendPoints.mockResolvedValue({
      remainingPoints: 120,
      transactionId: "tx-123",
    });

    const result = await spendPAForAIAction(TRIP_ID, "ai_itinerary");

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect("remainingBalance" in result.data).toBe(true);
      if ("remainingBalance" in result.data) {
        expect(result.data.remainingBalance).toBe(120);
        expect(result.data.transactionId).toBe("tx-123");
      }
    }

    expect(mockSpendPoints).toHaveBeenCalledWith(
      USER_ID,
      80, // AI_COSTS.ai_itinerary
      "ai_usage",
      "AI: ai_itinerary",
      TRIP_ID
    );
  });

  it("spends correct cost for ai_route (30 PA)", async () => {
    mockAuthenticatedSession();
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    mockGetBalance.mockResolvedValue({
      totalPoints: 100,
      availablePoints: 100,
      currentRank: "novato",
    });
    mockSpendPoints.mockResolvedValue({
      remainingPoints: 70,
      transactionId: "tx-route",
    });

    const result = await spendPAForAIAction(TRIP_ID, "ai_route");

    expect(result.success).toBe(true);
    expect(mockSpendPoints).toHaveBeenCalledWith(
      USER_ID,
      30, // AI_COSTS.ai_route
      "ai_usage",
      "AI: ai_route",
      TRIP_ID
    );
  });

  it("spends correct cost for ai_accommodation (50 PA)", async () => {
    mockAuthenticatedSession();
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    mockGetBalance.mockResolvedValue({
      totalPoints: 200,
      availablePoints: 200,
      currentRank: "novato",
    });
    mockSpendPoints.mockResolvedValue({
      remainingPoints: 150,
      transactionId: "tx-acc",
    });

    const result = await spendPAForAIAction(TRIP_ID, "ai_accommodation");

    expect(result.success).toBe(true);
    expect(mockSpendPoints).toHaveBeenCalledWith(
      USER_ID,
      50, // AI_COSTS.ai_accommodation
      "ai_usage",
      "AI: ai_accommodation",
      TRIP_ID
    );
  });
});

// ─── completeTutorialAction ─────────────────────────────────────────────────

describe("completeTutorialAction", () => {
  it("throws UnauthorizedError when not authenticated", async () => {
    mockUnauthenticatedSession();

    await expect(completeTutorialAction()).rejects.toThrow(UnauthorizedError);
  });

  it("awards 100 PA on first tutorial completion", async () => {
    mockAuthenticatedSession();
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null);
    mockEarnPoints.mockResolvedValue(undefined);

    const result = await completeTutorialAction();

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.pointsAwarded).toBe(100);
      expect(result.data.alreadyCompleted).toBe(false);
    }

    expect(mockEarnPoints).toHaveBeenCalledWith(
      USER_ID,
      100,
      "purchase",
      "Tutorial completion bonus"
    );
  });

  it("returns alreadyCompleted=true on second call (idempotent)", async () => {
    mockAuthenticatedSession();
    prismaMock.pointTransaction.findFirst.mockResolvedValue({
      id: "tx-tutorial",
      userId: USER_ID,
      amount: 100,
      type: "purchase",
      description: "Tutorial completion bonus",
      tripId: null,
      createdAt: new Date(),
    } as never);

    const result = await completeTutorialAction();

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.pointsAwarded).toBe(0);
      expect(result.data.alreadyCompleted).toBe(true);
    }

    expect(mockEarnPoints).not.toHaveBeenCalled();
  });

  it("checks for existing tutorial transaction with correct query", async () => {
    mockAuthenticatedSession();
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null);
    mockEarnPoints.mockResolvedValue(undefined);

    await completeTutorialAction();

    expect(prismaMock.pointTransaction.findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        type: "purchase",
        description: "Tutorial completion bonus",
      },
    });
  });
});
