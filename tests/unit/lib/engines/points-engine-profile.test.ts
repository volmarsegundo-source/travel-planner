/**
 * Unit tests for PointsEngine.awardProfileCompletion and PROFILE_FIELD_POINTS.
 *
 * Tests cover:
 * - awardProfileCompletion: new field award, idempotency, tx passthrough,
 *   description format, logging
 * - PROFILE_FIELD_POINTS: key count, values, total, specific keys
 * - PointTransactionType: includes "profile_completion" (type-level check)
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
import {
  PROFILE_FIELD_POINTS,
  type PointTransactionType,
} from "@/types/gamification.types";
import { hashUserId } from "@/lib/hash";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = "user-profile-123";

function makeProgress(overrides: Record<string, unknown> = {}) {
  return {
    id: "progress-1",
    userId: USER_ID,
    totalPoints: 500,
    availablePoints: 500,
    currentRank: "novato",
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
    amount: 25,
    type: "profile_completion",
    description: "Profile field: birthDate",
    tripId: null as string | null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── awardProfileCompletion ─────────────────────────────────────────────────

describe("PointsEngine.awardProfileCompletion", () => {
  it("awards points for a new profile field", async () => {
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null);
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(
      makeTransaction() as never
    );

    await PointsEngine.awardProfileCompletion(USER_ID, "birthDate", 25);

    expect(prismaMock.userProgress.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: {
        totalPoints: { increment: 25 },
        availablePoints: { increment: 25 },
      },
    });

    expect(prismaMock.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        amount: 25,
        type: "profile_completion",
        description: "Profile field: birthDate",
        tripId: undefined,
      },
    });
  });

  it("is idempotent — does NOT award again when field was already awarded", async () => {
    prismaMock.pointTransaction.findFirst.mockResolvedValue(
      makeTransaction() as never
    );

    await PointsEngine.awardProfileCompletion(USER_ID, "birthDate", 25);

    expect(prismaMock.userProgress.update).not.toHaveBeenCalled();
    expect(prismaMock.pointTransaction.create).not.toHaveBeenCalled();
  });

  it("uses provided transaction client when tx is passed", async () => {
    const txClient = mockDeep<PrismaClient>();
    txClient.pointTransaction.findFirst.mockResolvedValue(null);
    txClient.userProgress.update.mockResolvedValue(makeProgress() as never);
    txClient.pointTransaction.create.mockResolvedValue(
      makeTransaction() as never
    );

    await PointsEngine.awardProfileCompletion(
      USER_ID,
      "phone",
      25,
      txClient as unknown as Parameters<
        Parameters<typeof db.$transaction>[0]
      >[0]
    );

    // The tx client should be used for findFirst (idempotency check)
    expect(txClient.pointTransaction.findFirst).toHaveBeenCalled();
    // earnPoints should also use the tx client
    expect(txClient.userProgress.update).toHaveBeenCalled();
    expect(txClient.pointTransaction.create).toHaveBeenCalled();
    // The main db should NOT have been used
    expect(prismaMock.pointTransaction.findFirst).not.toHaveBeenCalled();
  });

  it('uses correct description format "Profile field: {fieldKey}"', async () => {
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null);
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(
      makeTransaction({ description: "Profile field: country" }) as never
    );

    await PointsEngine.awardProfileCompletion(USER_ID, "country", 25);

    // Verify the findFirst query used the correct description
    expect(prismaMock.pointTransaction.findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        type: "profile_completion",
        description: "Profile field: country",
      },
    });

    // Verify the transaction was created with the correct description
    expect(prismaMock.pointTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: "Profile field: country",
      }),
    });
  });

  it("logs gamification.profileFieldAwarded with fieldKey and points", async () => {
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null);
    prismaMock.userProgress.update.mockResolvedValue(makeProgress() as never);
    prismaMock.pointTransaction.create.mockResolvedValue(
      makeTransaction() as never
    );

    await PointsEngine.awardProfileCompletion(USER_ID, "bio", 25);

    expect(logger.info).toHaveBeenCalledWith(
      "gamification.profileFieldAwarded",
      {
        userIdHash: hashUserId(USER_ID),
        fieldKey: "bio",
        points: 25,
      }
    );
  });

  it("does NOT log when field was already awarded (idempotent)", async () => {
    prismaMock.pointTransaction.findFirst.mockResolvedValue(
      makeTransaction() as never
    );

    await PointsEngine.awardProfileCompletion(USER_ID, "birthDate", 25);

    expect(logger.info).not.toHaveBeenCalledWith(
      "gamification.profileFieldAwarded",
      expect.anything()
    );
  });
});

// ─── PROFILE_FIELD_POINTS ───────────────────────────────────────────────────

describe("PROFILE_FIELD_POINTS", () => {
  it("has exactly 11 keys", () => {
    expect(Object.keys(PROFILE_FIELD_POINTS)).toHaveLength(11);
  });

  it("all values are 25", () => {
    for (const [key, value] of Object.entries(PROFILE_FIELD_POINTS)) {
      expect(value, `${key} should be 25`).toBe(25);
    }
  });

  it("total points across all fields is 275", () => {
    const total = Object.values(PROFILE_FIELD_POINTS).reduce(
      (sum, v) => sum + v,
      0
    );
    expect(total).toBe(275);
  });

  it("includes birthDate", () => {
    expect(PROFILE_FIELD_POINTS).toHaveProperty("birthDate", 25);
  });

  it("includes dietaryRestrictions", () => {
    expect(PROFILE_FIELD_POINTS).toHaveProperty("dietaryRestrictions", 25);
  });

  it("includes accessibility", () => {
    expect(PROFILE_FIELD_POINTS).toHaveProperty("accessibility", 25);
  });
});

// ─── PointTransactionType ───────────────────────────────────────────────────

describe("PointTransactionType", () => {
  it('includes "profile_completion" as a valid type', () => {
    // Type-level check: this assignment must compile without errors.
    // If "profile_completion" were removed from the union, TypeScript would
    // produce a compilation error and this test would fail to build.
    const typeCheck: PointTransactionType = "profile_completion";
    expect(typeCheck).toBe("profile_completion");
  });
});
