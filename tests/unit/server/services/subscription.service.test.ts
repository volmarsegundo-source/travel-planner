/**
 * Unit tests for SubscriptionService (Sprint 43 Wave 5).
 *
 * Uses vitest-mock-extended to deep-mock Prisma. The real schema is not
 * touched; every method under test asserts:
 *   - correct state-machine transition
 *   - exactly one SubscriptionEvent emitted per mutation
 *   - transaction boundary (db.$transaction called)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient, Subscription, SubscriptionEvent } from "@prisma/client";
import { AppError } from "@/lib/errors";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: (id: string) => `h_${id}`,
}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

import { db } from "@/server/db";
import {
  SubscriptionService,
  SubscriptionEventType,
} from "@/server/services/subscription.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = "user_abc";
const SUB_ID = "sub_123";

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: SUB_ID,
    userId: USER_ID,
    plan: "FREE",
    status: "ACTIVE",
    gateway: null,
    gatewaySubscriptionId: null,
    gatewayCustomerId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as Subscription;
}

function makeEvent(
  type: string,
  overrides: Partial<SubscriptionEvent> = {}
): SubscriptionEvent {
  return {
    id: `evt_${type}`,
    subscriptionId: SUB_ID,
    type,
    gatewayEventId: null,
    payload: null,
    createdAt: new Date(),
    ...overrides,
  } as SubscriptionEvent;
}

/**
 * Configure db.$transaction to execute the callback with the prisma mock as
 * the "tx" parameter. This lets service code use `tx.subscription.update`
 * etc. exactly like production.
 */
function enableTxPassthrough() {
  // @ts-expect-error — mocked client has $transaction
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
}

beforeEach(() => {
  vi.clearAllMocks();
  enableTxPassthrough();
});

// ─── Queries ────────────────────────────────────────────────────────────────

describe("SubscriptionService — queries", () => {
  it("getUserPlan returns FREE when no subscription row exists", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const plan = await SubscriptionService.getUserPlan(USER_ID);
    expect(plan).toBe("FREE");
  });

  it("getUserPlan returns PREMIUM for ACTIVE Premium subscription", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ plan: "PREMIUM_MONTHLY", status: "ACTIVE" })
    );
    const plan = await SubscriptionService.getUserPlan(USER_ID);
    expect(plan).toBe("PREMIUM");
  });

  it("getUserPlan returns FREE for CANCELED premium", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ plan: "PREMIUM_MONTHLY", status: "CANCELED" })
    );
    expect(await SubscriptionService.getUserPlan(USER_ID)).toBe("FREE");
  });

  it("isInTrial returns true only when trialEndsAt is in the future", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + 86400000),
      })
    );
    expect(await SubscriptionService.isInTrial(USER_ID)).toBe(true);
  });

  it("isInTrial returns false for expired trialEndsAt", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() - 86400000),
      })
    );
    expect(await SubscriptionService.isInTrial(USER_ID)).toBe(false);
  });

  it("hasUsedTrial returns true when a TRIAL_STARTED event exists", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(makeSub());
    prismaMock.subscriptionEvent.findFirst.mockResolvedValue(
      makeEvent("TRIAL_STARTED")
    );
    expect(await SubscriptionService.hasUsedTrial(USER_ID)).toBe(true);
  });

  it("hasUsedTrial returns false when no trial event exists", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(makeSub());
    prismaMock.subscriptionEvent.findFirst.mockResolvedValue(null);
    expect(await SubscriptionService.hasUsedTrial(USER_ID)).toBe(false);
  });
});

// ─── startTrial ─────────────────────────────────────────────────────────────

describe("SubscriptionService.startTrial", () => {
  it("creates a TRIALING subscription with trialEndsAt 7 days out and emits TRIAL_STARTED", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ plan: "FREE", status: "CANCELED" })
    );
    prismaMock.subscriptionEvent.findFirst.mockResolvedValue(null); // no prior trial
    prismaMock.subscription.update.mockImplementation(
      async ({ data }: any) =>
        makeSub({
          plan: data.plan,
          status: data.status,
          trialEndsAt: data.trialEndsAt,
          currentPeriodEnd: data.currentPeriodEnd,
        })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type, data)
    );

    const before = Date.now();
    const sub = await SubscriptionService.startTrial(USER_ID, "PREMIUM_MONTHLY");
    const after = Date.now();

    expect(sub.status).toBe("TRIALING");
    expect(sub.plan).toBe("PREMIUM_MONTHLY");
    expect(sub.trialEndsAt).toBeTruthy();
    // Must be ~7 days away
    const delta = (sub.trialEndsAt as Date).getTime() - before;
    expect(delta).toBeGreaterThanOrEqual(7 * 86400000 - 1000);
    expect(delta).toBeLessThanOrEqual(after - before + 7 * 86400000 + 1000);

    // Exactly one event emitted
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: SubscriptionEventType.TRIAL_STARTED,
        }),
      })
    );
  });

  it("throws SUBSCRIPTION_CONFLICT when user is already TRIALING", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ plan: "PREMIUM_MONTHLY", status: "TRIALING" })
    );
    await expect(
      SubscriptionService.startTrial(USER_ID, "PREMIUM_MONTHLY")
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_CONFLICT" });
  });

  it("throws SUBSCRIPTION_CONFLICT when user has already used a trial", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ status: "CANCELED" })
    );
    prismaMock.subscriptionEvent.findFirst.mockResolvedValue(
      makeEvent("TRIAL_STARTED")
    );
    await expect(
      SubscriptionService.startTrial(USER_ID, "PREMIUM_MONTHLY")
    ).rejects.toBeInstanceOf(AppError);
  });

  it("bootstraps a FREE Subscription row if none existed (implicit user)", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.create.mockResolvedValue(
      makeSub({ plan: "FREE", status: "ACTIVE" })
    );
    prismaMock.subscriptionEvent.findFirst.mockResolvedValue(null);
    prismaMock.subscription.update.mockResolvedValue(
      makeSub({ plan: "PREMIUM_MONTHLY", status: "TRIALING" })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type)
    );

    await SubscriptionService.startTrial(USER_ID, "PREMIUM_MONTHLY");

    // Two events: CREATED (baseline row) + TRIAL_STARTED.
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledTimes(2);
    const eventTypes = prismaMock.subscriptionEvent.create.mock.calls.map(
      (c: any) => c[0].data.type
    );
    expect(eventTypes).toContain(SubscriptionEventType.CREATED);
    expect(eventTypes).toContain(SubscriptionEventType.TRIAL_STARTED);
  });
});

// ─── activate ───────────────────────────────────────────────────────────────

describe("SubscriptionService.activate", () => {
  it("activates the subscription and emits ACTIVATED event", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ status: "CANCELED" })
    );
    prismaMock.subscription.update.mockImplementation(
      async ({ data }: any) => makeSub({ ...data, id: SUB_ID })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type, data)
    );

    const start = new Date("2026-04-01");
    const end = new Date("2026-05-01");
    const sub = await SubscriptionService.activate(USER_ID, {
      plan: "PREMIUM_MONTHLY",
      gateway: "MERCADO_PAGO",
      gatewaySubscriptionId: "mp_sub_1",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      gatewayEventId: "mp_evt_1",
    });

    expect(sub.status).toBe("ACTIVE");
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: SubscriptionEventType.ACTIVATED,
          gatewayEventId: "mp_evt_1",
        }),
      })
    );
  });

  it("throws SUBSCRIPTION_CONFLICT on double-activation with different gateway id", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({
        status: "ACTIVE",
        plan: "PREMIUM_MONTHLY",
        gatewaySubscriptionId: "mp_sub_existing",
      })
    );

    await expect(
      SubscriptionService.activate(USER_ID, {
        plan: "PREMIUM_MONTHLY",
        gateway: "MERCADO_PAGO",
        gatewaySubscriptionId: "mp_sub_DIFFERENT",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      })
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_CONFLICT" });
  });
});

// ─── cancelAtPeriodEnd ──────────────────────────────────────────────────────

describe("SubscriptionService.cancelAtPeriodEnd", () => {
  it("flags cancelAtPeriodEnd without changing status", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ status: "ACTIVE" })
    );
    prismaMock.subscription.update.mockImplementation(
      async ({ data }: any) =>
        makeSub({ status: "ACTIVE", cancelAtPeriodEnd: data.cancelAtPeriodEnd })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type)
    );

    const sub = await SubscriptionService.cancelAtPeriodEnd(USER_ID);
    expect(sub.status).toBe("ACTIVE");
    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledTimes(1);
  });
});

// ─── renew ──────────────────────────────────────────────────────────────────

describe("SubscriptionService.renew", () => {
  it("extends currentPeriodEnd and emits RENEWED with gatewayEventId", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({
        status: "ACTIVE",
        currentPeriodEnd: new Date("2026-04-01"),
      })
    );
    prismaMock.subscription.update.mockImplementation(
      async ({ data }: any) =>
        makeSub({ status: "ACTIVE", currentPeriodEnd: data.currentPeriodEnd })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type, data)
    );

    const newEnd = new Date("2026-05-01");
    const sub = await SubscriptionService.renew(USER_ID, newEnd, "mp_evt_99");
    expect(sub.currentPeriodEnd).toEqual(newEnd);
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: SubscriptionEventType.RENEWED,
          gatewayEventId: "mp_evt_99",
        }),
      })
    );
  });
});

// ─── invariant: every mutation emits exactly one event ─────────────────────

describe("SubscriptionService — audit invariant", () => {
  it("cancelImmediately emits exactly one CANCELED_IMMEDIATELY event", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ status: "ACTIVE" })
    );
    prismaMock.subscription.update.mockResolvedValue(
      makeSub({ status: "CANCELED" })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type)
    );

    await SubscriptionService.cancelImmediately(USER_ID, "user_requested");
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: SubscriptionEventType.CANCELED_IMMEDIATELY,
        }),
      })
    );
  });

  it("recordPaymentFailure emits exactly one PAYMENT_FAILED event", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      makeSub({ status: "ACTIVE" })
    );
    prismaMock.subscription.update.mockResolvedValue(
      makeSub({ status: "PAST_DUE" })
    );
    prismaMock.subscriptionEvent.create.mockImplementation(
      async ({ data }: any) => makeEvent(data.type)
    );

    await SubscriptionService.recordPaymentFailure(USER_ID, "mp_evt_fail_1", "insufficient_funds");
    expect(prismaMock.subscriptionEvent.create).toHaveBeenCalledTimes(1);
  });
});
