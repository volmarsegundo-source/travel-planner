/**
 * Unit tests for subscription.actions (Sprint 43 Wave 2).
 *
 * Covers:
 * - startTrialAction: creates Subscription + TRIAL_STARTED event
 * - startTrialAction: rejects if user has historical TRIAL_STARTED event
 * - createCheckoutMockAction: returns a mock redirect URL
 * - confirmCheckoutMockAction: activates subscription
 * - cancelSubscriptionAction: sets cancelAtPeriodEnd flag
 * - getSubscriptionStatusAction: returns FREE default when no row exists
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
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

vi.mock("@/lib/hash", () => ({
  hashUserId: (u: string) => `hash(${u})`,
}));

// ─── SUT ────────────────────────────────────────────────────────────────────

import {
  startTrialAction,
  createCheckoutMockAction,
  confirmCheckoutMockAction,
  cancelSubscriptionAction,
  getSubscriptionStatusAction,
} from "@/server/actions/subscription.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
const USER_ID = "user-sub-test";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
});

// ─── startTrialAction ──────────────────────────────────────────────────────

describe("startTrialAction", () => {
  it("creates Subscription row and emits TRIAL_STARTED event when no prior trial", async () => {
    prismaMock.subscriptionEvent.count.mockResolvedValue(0);

    const upsertedSub = {
      id: "sub-1",
      userId: USER_ID,
      plan: "PREMIUM_ANNUAL",
      status: "TRIALING",
      trialEndsAt: new Date("2026-04-17T00:00:00Z"),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date("2026-04-17T00:00:00Z"),
      cancelAtPeriodEnd: false,
    };

    const mockTx = {
      subscription: {
        upsert: vi.fn().mockResolvedValue(upsertedSub),
      },
      subscriptionEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt-1" }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx as unknown as typeof mockTx)
    );

    const result = await startTrialAction("PREMIUM_ANNUAL");

    expect(result.success).toBe(true);
    expect(mockTx.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: "sub-1",
          type: "TRIAL_STARTED",
        }),
      })
    );
  });

  it("rejects when user already has a TRIAL_STARTED event in history", async () => {
    prismaMock.subscriptionEvent.count.mockResolvedValue(1);

    const result = await startTrialAction("PREMIUM_MONTHLY");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("subscription.trialAlreadyUsed");
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(startTrialAction("PREMIUM_MONTHLY")).rejects.toThrow(
      "Authentication required"
    );
  });
});

// ─── createCheckoutMockAction ──────────────────────────────────────────────

describe("createCheckoutMockAction", () => {
  it("returns a mock redirect URL with plan and session id", async () => {
    prismaMock.subscriptionEvent.count.mockResolvedValue(0);

    const createdSub = {
      id: "sub-42",
      userId: USER_ID,
      plan: "PREMIUM_MONTHLY",
      status: "TRIALING",
    };

    const mockTx = {
      subscription: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdSub),
        update: vi.fn(),
      },
      subscriptionEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt-2" }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx as unknown as typeof mockTx)
    );

    const result = await createCheckoutMockAction("PREMIUM_MONTHLY");

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.sessionId).toBe("sub-42");
      expect(result.data.redirectUrl).toContain("/loja/checkout-mock");
      expect(result.data.redirectUrl).toContain("plan=PREMIUM_MONTHLY");
      expect(result.data.redirectUrl).toContain("session=sub-42");
    }
  });
});

// ─── confirmCheckoutMockAction ─────────────────────────────────────────────

describe("confirmCheckoutMockAction", () => {
  it("activates the subscription and emits activation event", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-99",
      userId: USER_ID,
      plan: "PREMIUM_ANNUAL",
      status: "TRIALING",
    } as unknown as Awaited<ReturnType<typeof prismaMock.subscription.findUnique>>);

    const mockTx = {
      subscription: {
        update: vi.fn().mockResolvedValue({ id: "sub-99" }),
      },
      subscriptionEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt-3" }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx as unknown as typeof mockTx)
    );

    const result = await confirmCheckoutMockAction("sub-99");

    expect(result.success).toBe(true);
    expect(mockTx.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-99" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(mockTx.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: "sub-99",
          type: "RENEWED",
        }),
      })
    );
  });

  it("rejects a session owned by another user", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-hacked",
      userId: "other-user",
      plan: "PREMIUM_MONTHLY",
      status: "TRIALING",
    } as unknown as Awaited<ReturnType<typeof prismaMock.subscription.findUnique>>);

    const result = await confirmCheckoutMockAction("sub-hacked");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("subscription.sessionNotFound");
    }
  });
});

// ─── cancelSubscriptionAction ──────────────────────────────────────────────

describe("cancelSubscriptionAction", () => {
  it("sets cancelAtPeriodEnd on the active subscription", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-10",
      userId: USER_ID,
      plan: "PREMIUM_MONTHLY",
      status: "ACTIVE",
    } as unknown as Awaited<ReturnType<typeof prismaMock.subscription.findUnique>>);

    const mockTx = {
      subscription: {
        update: vi.fn().mockResolvedValue({ id: "sub-10" }),
      },
      subscriptionEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt-4" }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx as unknown as typeof mockTx)
    );

    const result = await cancelSubscriptionAction();

    expect(result.success).toBe(true);
    expect(mockTx.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        data: expect.objectContaining({ cancelAtPeriodEnd: true }),
      })
    );
  });

  it("returns error when no subscription exists", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    const result = await cancelSubscriptionAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("subscription.notFound");
    }
  });
});

// ─── getSubscriptionStatusAction ───────────────────────────────────────────

describe("getSubscriptionStatusAction", () => {
  it("returns a FREE default when the user has no subscription row", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    const result = await getSubscriptionStatusAction();

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.plan).toBe("FREE");
      expect(result.data.isPremium).toBe(false);
      expect(result.data.status).toBe("ACTIVE");
    }
  });

  it("returns isPremium=true for an ACTIVE PREMIUM_ANNUAL subscription", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-77",
      userId: USER_ID,
      plan: "PREMIUM_ANNUAL",
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodStart: new Date("2026-01-01"),
      currentPeriodEnd: new Date("2027-01-01"),
      cancelAtPeriodEnd: false,
    } as unknown as Awaited<ReturnType<typeof prismaMock.subscription.findUnique>>);

    const result = await getSubscriptionStatusAction();

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.plan).toBe("PREMIUM_ANNUAL");
      expect(result.data.isPremium).toBe(true);
    }
  });
});
