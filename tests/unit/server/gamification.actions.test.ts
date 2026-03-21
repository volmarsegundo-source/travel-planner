/**
 * Unit tests for gamification Server Actions.
 *
 * Tests: getProgressSummaryAction, getBalanceAction, getTransactionHistoryAction
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mock functions ─────────────────────────────────────────────────────

const { mockAuth, mockGetProgressSummary, mockGetBalance, mockGetTransactionHistory } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockGetProgressSummary: vi.fn(),
    mockGetBalance: vi.fn(),
    mockGetTransactionHistory: vi.fn(),
  }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    getProgressSummary: mockGetProgressSummary,
    getBalance: mockGetBalance,
    getTransactionHistory: mockGetTransactionHistory,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn().mockReturnValue("errors.generic"),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import {
  getProgressSummaryAction,
  getBalanceAction,
  getTransactionHistoryAction,
} from "@/server/actions/gamification.actions";
import { UnauthorizedError } from "@/lib/errors";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("gamification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  // ─── getProgressSummaryAction ───────────────────────────────────────────────

  describe("getProgressSummaryAction", () => {
    it("returns progress summary on success", async () => {
      const summary = {
        totalPoints: 600,
        availablePoints: 500,
        currentRank: "desbravador",
        streakDays: 3,
        lastLoginDate: null,
        badges: [{ badgeKey: "primeira_viagem", earnedAt: new Date() }],
      };
      mockGetProgressSummary.mockResolvedValue(summary);

      const result = await getProgressSummaryAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.totalPoints).toBe(600);
        expect(result.data?.currentRank).toBe("desbravador");
      }
    });

    it("throws UnauthorizedError when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getProgressSummaryAction()).rejects.toThrow(UnauthorizedError);
    });

    it("returns error on engine failure", async () => {
      mockGetProgressSummary.mockRejectedValue(new Error("DB error"));

      const result = await getProgressSummaryAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("errors.generic");
      }
    });
  });

  // ─── getBalanceAction ───────────────────────────────────────────────────────

  describe("getBalanceAction", () => {
    it("returns balance on success", async () => {
      const balance = {
        totalPoints: 700,
        availablePoints: 550,
        currentRank: "navigator",
      };
      mockGetBalance.mockResolvedValue(balance);

      const result = await getBalanceAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.availablePoints).toBe(550);
      }
    });

    it("throws UnauthorizedError when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getBalanceAction()).rejects.toThrow(UnauthorizedError);
    });

    it("returns error on engine failure", async () => {
      mockGetBalance.mockRejectedValue(new Error("DB error"));

      const result = await getBalanceAction();

      expect(result.success).toBe(false);
    });
  });

  // ─── getTransactionHistoryAction ────────────────────────────────────────────

  describe("getTransactionHistoryAction", () => {
    it("returns transaction history on success", async () => {
      const history = {
        transactions: [
          { id: "tx-1", amount: 100, type: "phase_complete", description: "Phase 1", createdAt: new Date() },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      mockGetTransactionHistory.mockResolvedValue(history);

      const result = await getTransactionHistoryAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.transactions).toHaveLength(1);
      }
    });

    it("passes page and pageSize parameters", async () => {
      mockGetTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
        page: 2,
        pageSize: 5,
        totalPages: 0,
      });

      await getTransactionHistoryAction(2, 5);

      expect(mockGetTransactionHistory).toHaveBeenCalledWith("user-1", 2, 5);
    });

    it("throws UnauthorizedError when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getTransactionHistoryAction()).rejects.toThrow(UnauthorizedError);
    });

    it("returns error on engine failure", async () => {
      mockGetTransactionHistory.mockRejectedValue(new Error("DB error"));

      const result = await getTransactionHistoryAction();

      expect(result.success).toBe(false);
    });
  });
});
