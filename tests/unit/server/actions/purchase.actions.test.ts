/**
 * Unit tests for purchase.actions.
 *
 * Tests cover:
 * - purchasePAAction: valid purchase, invalid package, unauthenticated
 * - CRITICAL: PA credit increments availablePoints but NOT totalPoints
 * - getPurchaseHistoryAction: returns user purchases
 * - Atomic transaction (db.$transaction)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn());

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
          totalPoints: 500,
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

    // CRITICAL: verify that only availablePoints is incremented, NOT totalPoints
    expect(mockTx.userProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          availablePoints: { increment: 1200 },
        },
      })
    );

    // Ensure totalPoints is NOT in the update call
    const updateCall = mockTx.userProgress.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("totalPoints");
  });

  it("records a point transaction with type purchase", async () => {
    const mockTx = {
      purchase: {
        create: vi.fn().mockResolvedValue({ id: "p-1" }),
      },
      userProgress: {
        update: vi.fn().mockResolvedValue({ availablePoints: 1700 }),
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

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getPurchaseHistoryAction()).rejects.toThrow("Authentication required");
  });
});
