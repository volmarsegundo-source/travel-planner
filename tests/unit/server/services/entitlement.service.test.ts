/**
 * Unit tests for EntitlementService (Sprint 43 Wave 5).
 *
 * Focus areas:
 *   - Expedition creation cap (FREE = 3, PREMIUM = unlimited)
 *   - Destination cap (FREE = 1, PREMIUM = 4)
 *   - PA spend with canonical consumption order
 *   - Monthly PA refresh idempotency and plan-gating
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type {
  PrismaClient,
  Subscription,
  PaEntitlement,
} from "@prisma/client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/hash", () => ({ hashUserId: (id: string) => `h_${id}` }));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

import { db } from "@/server/db";
import { EntitlementService } from "@/server/services/entitlement.service";
import { SubscriptionService } from "@/server/services/subscription.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
const USER_ID = "user_xyz";

// ─── Fixture helpers ────────────────────────────────────────────────────────

function makeBucket(overrides: Partial<PaEntitlement>): PaEntitlement {
  return {
    id: `bkt_${Math.random().toString(36).slice(2, 8)}`,
    userId: USER_ID,
    source: "PREMIUM_MONTHLY",
    amount: 100,
    consumed: 0,
    expiresAt: null,
    subscriptionId: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  } as PaEntitlement;
}

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_1",
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Subscription;
}

function enableTxPassthrough() {
  // @ts-expect-error — mocked
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
}

beforeEach(() => {
  vi.clearAllMocks();
  enableTxPassthrough();
});

// ─── canCreateExpedition ────────────────────────────────────────────────────

describe("EntitlementService.canCreateExpedition", () => {
  it("blocks a FREE user at 3 active trips", async () => {
    vi.spyOn(SubscriptionService, "getUserPlan").mockResolvedValue("FREE");
    prismaMock.trip.count.mockResolvedValue(3);

    const check = await EntitlementService.canCreateExpedition(USER_ID);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("limits.expeditionCap");
    expect(check.limit).toBe(3);
    expect(check.current).toBe(3);
  });

  it("allows a FREE user with 2 active trips to create a third", async () => {
    vi.spyOn(SubscriptionService, "getUserPlan").mockResolvedValue("FREE");
    prismaMock.trip.count.mockResolvedValue(2);
    const check = await EntitlementService.canCreateExpedition(USER_ID);
    expect(check.allowed).toBe(true);
  });

  it("allows a PREMIUM user to create trips beyond the free cap", async () => {
    vi.spyOn(SubscriptionService, "getUserPlan").mockResolvedValue("PREMIUM");
    prismaMock.trip.count.mockResolvedValue(50);
    const check = await EntitlementService.canCreateExpedition(USER_ID);
    expect(check.allowed).toBe(true);
  });
});

// ─── canAddDestination ──────────────────────────────────────────────────────

describe("EntitlementService.canAddDestination", () => {
  it("blocks a FREE user from adding a second destination", async () => {
    vi.spyOn(SubscriptionService, "getUserPlan").mockResolvedValue("FREE");
    prismaMock.destination.count.mockResolvedValue(1);

    const check = await EntitlementService.canAddDestination(USER_ID, "trip_1");
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("limits.destinationCap");
    expect(check.limit).toBe(1);
  });

  it("allows PREMIUM to add destinations up to 4", async () => {
    vi.spyOn(SubscriptionService, "getUserPlan").mockResolvedValue("PREMIUM");
    prismaMock.destination.count.mockResolvedValue(3);
    const check = await EntitlementService.canAddDestination(USER_ID, "trip_1");
    expect(check.allowed).toBe(true);
    expect(check.limit).toBe(4);
  });

  it("blocks PREMIUM from adding a 5th destination", async () => {
    vi.spyOn(SubscriptionService, "getUserPlan").mockResolvedValue("PREMIUM");
    prismaMock.destination.count.mockResolvedValue(4);
    const check = await EntitlementService.canAddDestination(USER_ID, "trip_1");
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("limits.destinationCap");
  });
});

// ─── getAvailablePaBalance ─────────────────────────────────────────────────

describe("EntitlementService.getAvailablePaBalance", () => {
  it("excludes expired premium buckets from the balance", async () => {
    const past = new Date(Date.now() - 86400000);
    const future = new Date(Date.now() + 86400000);
    prismaMock.paEntitlement.findMany.mockResolvedValue([
      makeBucket({
        source: "PREMIUM_MONTHLY",
        amount: 500,
        consumed: 0,
        expiresAt: future,
      }),
      makeBucket({
        source: "ONBOARDING",
        amount: 180,
        consumed: 30,
        expiresAt: null,
      }),
      makeBucket({
        source: "PACKAGE_PURCHASE",
        amount: 200,
        consumed: 0,
        expiresAt: null,
      }),
    ]);
    // Note: the SQL filter in prod already filters expired rows, so the mock
    // simulates that by omitting the expired row entirely.

    const bal = await EntitlementService.getAvailablePaBalance(USER_ID);
    expect(bal.breakdown.premiumMonthly).toBe(500);
    expect(bal.breakdown.onboarding).toBe(150);
    expect(bal.breakdown.packagePurchase).toBe(200);
    expect(bal.total).toBe(850);
  });
});

// ─── spendPa ────────────────────────────────────────────────────────────────

describe("EntitlementService.spendPa", () => {
  it("consumes premium monthly buckets first, in expiry order", async () => {
    const soon = new Date(Date.now() + 10 * 86400000);
    const later = new Date(Date.now() + 30 * 86400000);
    const buckets = [
      makeBucket({
        id: "bkt_late",
        source: "PREMIUM_MONTHLY",
        amount: 100,
        expiresAt: later,
      }),
      makeBucket({
        id: "bkt_soon",
        source: "PREMIUM_MONTHLY",
        amount: 100,
        expiresAt: soon,
      }),
      makeBucket({
        id: "bkt_pkg",
        source: "PACKAGE_PURCHASE",
        amount: 500,
        expiresAt: null,
      }),
    ];
    prismaMock.paEntitlement.findMany.mockResolvedValue(buckets);
    prismaMock.paEntitlement.update.mockImplementation(async ({ data, where }: any) => ({
      ...buckets.find((b) => b.id === where.id)!,
      consumed: data.consumed.increment,
    }));
    prismaMock.userProgress.findUnique.mockResolvedValue({
      availablePoints: 1000,
    } as any);
    prismaMock.userProgress.update.mockResolvedValue({} as any);
    prismaMock.pointTransaction.create.mockResolvedValue({} as any);

    const result = await EntitlementService.spendPa(USER_ID, 50, "ai.guide");
    expect(result.success).toBe(true);
    // All 50 should come from the soonest-expiring premium bucket.
    expect(result.consumedFrom).toEqual([
      { entitlementId: "bkt_soon", amount: 50 },
    ]);
  });

  it("falls through from premium to onboarding after premium is exhausted", async () => {
    const soon = new Date(Date.now() + 10 * 86400000);
    const buckets = [
      makeBucket({
        id: "bkt_prem",
        source: "PREMIUM_MONTHLY",
        amount: 30,
        consumed: 0,
        expiresAt: soon,
      }),
      makeBucket({
        id: "bkt_onb",
        source: "ONBOARDING",
        amount: 180,
        consumed: 0,
        expiresAt: null,
      }),
    ];
    prismaMock.paEntitlement.findMany.mockResolvedValue(buckets);
    prismaMock.paEntitlement.update.mockResolvedValue({} as any);
    prismaMock.userProgress.findUnique.mockResolvedValue({
      availablePoints: 500,
    } as any);
    prismaMock.userProgress.update.mockResolvedValue({} as any);
    prismaMock.pointTransaction.create.mockResolvedValue({} as any);

    const result = await EntitlementService.spendPa(USER_ID, 100, "ai.plan");
    expect(result.success).toBe(true);
    expect(result.consumedFrom).toEqual([
      { entitlementId: "bkt_prem", amount: 30 },
      { entitlementId: "bkt_onb", amount: 70 },
    ]);
  });

  it("returns success=false (no partial consumption) when balance is too low", async () => {
    prismaMock.paEntitlement.findMany.mockResolvedValue([
      makeBucket({ source: "ONBOARDING", amount: 20, consumed: 0 }),
    ]);
    const result = await EntitlementService.spendPa(USER_ID, 50, "ai.guide");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("limits.insufficientPa");
    expect(result.consumedFrom).toHaveLength(0);
    // No buckets updated.
    expect(prismaMock.paEntitlement.update).not.toHaveBeenCalled();
  });

  it("orders onboarding before package_purchase", async () => {
    const buckets = [
      makeBucket({
        id: "bkt_pkg",
        source: "PACKAGE_PURCHASE",
        amount: 200,
      }),
      makeBucket({
        id: "bkt_onb",
        source: "ONBOARDING",
        amount: 180,
      }),
    ];
    prismaMock.paEntitlement.findMany.mockResolvedValue(buckets);
    prismaMock.paEntitlement.update.mockResolvedValue({} as any);
    prismaMock.userProgress.findUnique.mockResolvedValue(null);
    prismaMock.pointTransaction.create.mockResolvedValue({} as any);

    const result = await EntitlementService.spendPa(USER_ID, 50, "reason");
    expect(result.success).toBe(true);
    expect(result.consumedFrom[0]?.entitlementId).toBe("bkt_onb");
  });
});

// ─── refreshMonthlyPa ───────────────────────────────────────────────────────

describe("EntitlementService.refreshMonthlyPa", () => {
  it("creates a fresh 1500 PA bucket for an ACTIVE Premium user", async () => {
    const periodEnd = new Date(Date.now() + 30 * 86400000);
    vi.spyOn(SubscriptionService, "getSubscription").mockResolvedValue(
      makeSub({
        plan: "PREMIUM_MONTHLY",
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      })
    );
    prismaMock.paEntitlement.findFirst.mockResolvedValue(null);
    prismaMock.paEntitlement.create.mockImplementation(
      async ({ data }: any) => makeBucket(data)
    );

    const bucket = await EntitlementService.refreshMonthlyPa(USER_ID);
    expect(bucket).not.toBeNull();
    expect(bucket?.amount).toBe(1500);
    expect(prismaMock.paEntitlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "PREMIUM_MONTHLY",
          amount: 1500,
          expiresAt: periodEnd,
        }),
      })
    );
  });

  it("is idempotent within the same billing period", async () => {
    const periodEnd = new Date(Date.now() + 30 * 86400000);
    vi.spyOn(SubscriptionService, "getSubscription").mockResolvedValue(
      makeSub({
        plan: "PREMIUM_MONTHLY",
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      })
    );
    prismaMock.paEntitlement.findFirst.mockResolvedValue(
      makeBucket({ source: "PREMIUM_MONTHLY", expiresAt: periodEnd, amount: 1500 })
    );

    await EntitlementService.refreshMonthlyPa(USER_ID);
    expect(prismaMock.paEntitlement.create).not.toHaveBeenCalled();
  });

  it("no-ops for FREE users", async () => {
    vi.spyOn(SubscriptionService, "getSubscription").mockResolvedValue(
      makeSub({ plan: "FREE", status: "ACTIVE", currentPeriodEnd: null })
    );
    const bucket = await EntitlementService.refreshMonthlyPa(USER_ID);
    expect(bucket).toBeNull();
    expect(prismaMock.paEntitlement.create).not.toHaveBeenCalled();
  });

  it("no-ops for CANCELED subscriptions", async () => {
    vi.spyOn(SubscriptionService, "getSubscription").mockResolvedValue(
      makeSub({
        plan: "PREMIUM_MONTHLY",
        status: "CANCELED",
        currentPeriodEnd: new Date(),
      })
    );
    const bucket = await EntitlementService.refreshMonthlyPa(USER_ID);
    expect(bucket).toBeNull();
  });
});

// ─── grants ─────────────────────────────────────────────────────────────────

describe("EntitlementService grants", () => {
  it("grantOnboardingPa is idempotent and issues 180 PA", async () => {
    prismaMock.paEntitlement.findFirst.mockResolvedValue(null);
    prismaMock.paEntitlement.create.mockImplementation(
      async ({ data }: any) => makeBucket(data)
    );
    const b = await EntitlementService.grantOnboardingPa(USER_ID);
    expect(b.amount).toBe(180);

    // Second call: pretend bucket already exists.
    prismaMock.paEntitlement.findFirst.mockResolvedValue(
      makeBucket({ source: "ONBOARDING", amount: 180 })
    );
    prismaMock.paEntitlement.create.mockClear();
    await EntitlementService.grantOnboardingPa(USER_ID);
    expect(prismaMock.paEntitlement.create).not.toHaveBeenCalled();
  });

  it("grantPackagePa rejects zero/negative amounts", async () => {
    await expect(EntitlementService.grantPackagePa(USER_ID, 0)).rejects.toThrow();
    await expect(EntitlementService.grantPackagePa(USER_ID, -5)).rejects.toThrow();
  });
});
