/**
 * Unit tests for purchase.actions.
 *
 * Tests cover:
 * - purchasePAAction: valid purchase, invalid package, unauthenticated
 * - PA credit increments BOTH availablePoints AND totalPoints per PO decision
 * - Rate limiting: 5 purchases per user per hour
 * - getPurchaseHistoryAction: returns user purchases
 * - Atomic transaction (db.$transaction)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/server/services/payment", () => ({
  getPaymentProvider: () => ({
    createIntent: vi.fn().mockResolvedValue({
      intentId: "mock-intent-id",
      clientToken: "mock_token_abc",
      status: "pending",
    }),
    confirmIntent: vi.fn().mockResolvedValue({
      success: true,
      referenceId: "mock_ref_12345",
      status: "confirmed",
    }),
  }),
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────

import {
  purchasePAAction,
  getPurchaseHistoryAction,
} from "@/server/actions/purchase.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

const USER_ID = "user-purchase-test";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  // Default: rate limit allows requests
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 4,
    resetAt: Date.now() + 3600000,
  });
});

// ─── purchasePAAction ───────────────────────────────────────────────────────

describe("purchasePAAction", () => {
  it("returns error for invalid package ID", async () => {
    const result = await purchasePAAction("invalid_pkg");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("gamification.purchase.invalidPackage");
    }
  });

  it("throws UnauthorizedError when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(purchasePAAction("navegador")).rejects.toThrow("Authentication required");
  });

  it("creates purchase and credits PA via $transaction", async () => {
    const mockTx = {
      purchase: {
        create: vi.fn().mockResolvedValue({
          id: "purchase-1",
          userId: USER_ID,
          packageId: "navegador",
          paAmount: 1200,
          amountCents: 2990,
          status: "confirmed",
        }),
      },
      userProgress: {
        update: vi.fn().mockResolvedValue({
          userId: USER_ID,
          totalPoints: 1700,
          availablePoints: 1700,
          currentRank: "novato",
        }),
      },
      pointTransaction: {
        create: vi.fn().mockResolvedValue({ id: "tx-1" }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx as unknown as typeof mockTx);
    });

    const result = await purchasePAAction("navegador");

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.paAmount).toBe(1200);
      expect(result.data.newBalance).toBe(1700);
    }

    // Verify that BOTH availablePoints AND totalPoints are incremented per PO decision
    expect(mockTx.userProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          availablePoints: { increment: 1200 },
          totalPoints: { increment: 1200 },
        },
      })
    );
  });

  it("purchased PA increments totalPoints (levels up)", async () => {
    const mockTx = {
      purchase: {
        create: vi.fn().mockResolvedValue({
          id: "purchase-2",
          userId: USER_ID,
          packageId: "explorador",
          paAmount: 500,
          amountCents: 1490,
          status: "confirmed",
        }),
      },
      userProgress: {
        update: vi.fn().mockResolvedValue({
          userId: USER_ID,
          totalPoints: 800,
          availablePoints: 800,
          currentRank: "novato",
        }),
      },
      pointTransaction: {
        create: vi.fn().mockResolvedValue({ id: "tx-2" }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx as unknown as typeof mockTx);
    });

    await purchasePAAction("explorador");

    const updateCall = mockTx.userProgress.update.mock.calls[0][0];
    // totalPoints MUST be incremented (levels up per PO decision)
    expect(updateCall.data).toHaveProperty("totalPoints", { increment: 500 });
    // availablePoints also incremented (spendable)
    expect(updateCall.data).toHaveProperty("availablePoints", { increment: 500 });
  });

  it("increments totalPoints by the same amount as availablePoints", async () => {
    const mockTx = {
      purchase: {
        create: vi.fn().mockResolvedValue({ id: "p-3" }),
      },
      userProgress: {
        update: vi.fn().mockResolvedValue({
          totalPoints: 6300,
          availablePoints: 6300,
        }),
      },
      pointTransaction: {
        create: vi.fn().mockResolvedValue({ id: "tx-3" }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx as unknown as typeof mockTx);
    });

    await purchasePAAction("embaixador"); // 6000 PA

    const updateCall = mockTx.userProgress.update.mock.calls[0][0];
    const availInc = updateCall.data.availablePoints.increment;
    const totalInc = updateCall.data.totalPoints.increment;
    expect(availInc).toBe(totalInc);
    expect(totalInc).toBe(6000);
  });

  it("records a point transaction with type purchase", async () => {
    const mockTx = {
      purchase: {
        create: vi.fn().mockResolvedValue({ id: "p-1" }),
      },
      userProgress: {
        update: vi.fn().mockResolvedValue({ availablePoints: 1700, totalPoints: 1700 }),
      },
      pointTransaction: {
        create: vi.fn().mockResolvedValue({ id: "tx-1" }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx as unknown as typeof mockTx);
    });

    await purchasePAAction("explorador");

    expect(mockTx.pointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          amount: 500,
          type: "purchase",
        }),
      })
    );
  });

  // ─── Rate limiting tests ────────────────────────────────────────────────

  it("calls checkRateLimit with correct key and limits", async () => {
    // Need to set up tx mock so it doesn't fail if rate limit passes
    const mockTx = {
      purchase: { create: vi.fn().mockResolvedValue({ id: "p-1" }) },
      userProgress: { update: vi.fn().mockResolvedValue({ availablePoints: 500, totalPoints: 500 }) },
      pointTransaction: { create: vi.fn().mockResolvedValue({ id: "tx-1" }) },
    };
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx as unknown as typeof mockTx);
    });

    await purchasePAAction("explorador");

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      `purchase:${USER_ID}`,
      5,
      3600,
      { failClosed: true }
    );
  });

  it("returns rate limit error when limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1800000,
    });

    const result = await purchasePAAction("navegador");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("gamification.purchase.rateLimited");
    }
    // Ensure no DB transaction was attempted
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("does not create purchase when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1800000,
    });

    await purchasePAAction("explorador");

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("proceeds normally when rate limit has remaining requests", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetAt: Date.now() + 600000,
    });

    const mockTx = {
      purchase: { create: vi.fn().mockResolvedValue({ id: "p-rl" }) },
      userProgress: { update: vi.fn().mockResolvedValue({ availablePoints: 500, totalPoints: 500 }) },
      pointTransaction: { create: vi.fn().mockResolvedValue({ id: "tx-rl" }) },
    };
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx as unknown as typeof mockTx);
    });

    const result = await purchasePAAction("explorador");

    expect(result.success).toBe(true);
  });
});

// ─── getPurchaseHistoryAction ───────────────────────────────────────────────

describe("getPurchaseHistoryAction", () => {
  it("returns purchase history for authenticated user", async () => {
    const purchases = [
      {
        id: "p-1",
        packageId: "navegador",
        paAmount: 1200,
        amountCents: 2990,
        currency: "BRL",
        status: "confirmed",
        createdAt: new Date("2026-03-20"),
      },
    ];
    prismaMock.purchase.findMany.mockResolvedValue(purchases);

    const result = await getPurchaseHistoryAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].packageId).toBe("navegador");
    }
  });

  it("returns empty array when no purchases exist", async () => {
    prismaMock.purchase.findMany.mockResolvedValue([]);

    const result = await getPurchaseHistoryAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getPurchaseHistoryAction()).rejects.toThrow("Authentication required");
  });

  it("returns purchases sorted by most recent first", async () => {
    const purchases = [
      {
        id: "p-2",
        packageId: "cartografo",
        paAmount: 2800,
        amountCents: 5990,
        currency: "BRL",
        status: "confirmed",
        createdAt: new Date("2026-03-22"),
      },
      {
        id: "p-1",
        packageId: "explorador",
        paAmount: 500,
        amountCents: 1490,
        currency: "BRL",
        status: "confirmed",
        createdAt: new Date("2026-03-20"),
      },
    ];
    prismaMock.purchase.findMany.mockResolvedValue(purchases);

    const result = await getPurchaseHistoryAction();

    expect(result.success).toBe(true);
    expect(prismaMock.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
