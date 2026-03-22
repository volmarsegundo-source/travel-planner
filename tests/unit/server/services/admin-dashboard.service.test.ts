/**
 * Unit tests for AdminDashboardService.
 *
 * Tests cover:
 * - getKPIs: revenue aggregation, user counts, PA circulation
 * - getRevenueTimeSeries: grouping by date, empty data
 * - getUserMetrics: pagination, search, mapping
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

import { AdminDashboardService } from "@/server/services/admin-dashboard.service";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminDashboardService.getKPIs", () => {
  it("returns correct KPI structure", async () => {
    prismaMock.purchase.aggregate.mockResolvedValue({
      _sum: { amountCents: 50000 },
      _count: {},
      _avg: {},
      _min: {},
      _max: {},
    } as ReturnType<typeof prismaMock.purchase.aggregate> extends Promise<infer T> ? T : never);
    prismaMock.user.count.mockResolvedValueOnce(10); // active users
    prismaMock.user.count.mockResolvedValueOnce(25); // total users
    prismaMock.userProgress.aggregate.mockResolvedValue({
      _sum: { availablePoints: 15000 },
      _count: {},
      _avg: {},
      _min: {},
      _max: {},
    } as ReturnType<typeof prismaMock.userProgress.aggregate> extends Promise<infer T> ? T : never);
    prismaMock.purchase.count.mockResolvedValue(8);
    prismaMock.pointTransaction.findMany.mockResolvedValue([
      { id: "t1", userId: "u1", amount: -80, type: "ai_usage", description: "AI checklist", createdAt: new Date(), tripId: null },
    ]);

    const kpis = await AdminDashboardService.getKPIs();

    expect(kpis.totalRevenueCents).toBe(50000);
    expect(kpis.activeUsers).toBe(10);
    expect(kpis.totalUsers).toBe(25);
    expect(kpis.paInCirculation).toBe(15000);
    expect(kpis.totalPurchases).toBe(8);
    expect(kpis.estimatedAiCostCents).toBe(80);
    expect(kpis.marginCents).toBe(50000 - 80);
  });

  it("handles zero revenue gracefully", async () => {
    prismaMock.purchase.aggregate.mockResolvedValue({
      _sum: { amountCents: null },
      _count: {},
      _avg: {},
      _min: {},
      _max: {},
    } as ReturnType<typeof prismaMock.purchase.aggregate> extends Promise<infer T> ? T : never);
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.userProgress.aggregate.mockResolvedValue({
      _sum: { availablePoints: null },
      _count: {},
      _avg: {},
      _min: {},
      _max: {},
    } as ReturnType<typeof prismaMock.userProgress.aggregate> extends Promise<infer T> ? T : never);
    prismaMock.purchase.count.mockResolvedValue(0);
    prismaMock.pointTransaction.findMany.mockResolvedValue([]);

    const kpis = await AdminDashboardService.getKPIs();

    expect(kpis.totalRevenueCents).toBe(0);
    expect(kpis.paInCirculation).toBe(0);
    expect(kpis.marginCents).toBe(0);
  });
});

describe("AdminDashboardService.getRevenueTimeSeries", () => {
  it("groups purchases by date", async () => {
    prismaMock.purchase.findMany.mockResolvedValue([
      { id: "p1", userId: "u1", packageId: "nav", paAmount: 1200, amountCents: 2990, currency: "BRL", status: "confirmed", paymentRef: "ref1", refundedAt: null, createdAt: new Date("2026-03-15T10:00:00Z"), updatedAt: new Date() },
      { id: "p2", userId: "u2", packageId: "nav", paAmount: 1200, amountCents: 2990, currency: "BRL", status: "confirmed", paymentRef: "ref2", refundedAt: null, createdAt: new Date("2026-03-15T14:00:00Z"), updatedAt: new Date() },
      { id: "p3", userId: "u1", packageId: "exp", paAmount: 500, amountCents: 1490, currency: "BRL", status: "confirmed", paymentRef: "ref3", refundedAt: null, createdAt: new Date("2026-03-16T10:00:00Z"), updatedAt: new Date() },
    ]);

    const data = await AdminDashboardService.getRevenueTimeSeries("daily", 30);

    expect(data).toHaveLength(2);
    expect(data[0].date).toBe("2026-03-15");
    expect(data[0].revenueCents).toBe(5980); // 2990 + 2990
    expect(data[0].purchaseCount).toBe(2);
    expect(data[1].date).toBe("2026-03-16");
    expect(data[1].revenueCents).toBe(1490);
  });

  it("returns empty array when no purchases", async () => {
    prismaMock.purchase.findMany.mockResolvedValue([]);

    const data = await AdminDashboardService.getRevenueTimeSeries("daily", 30);

    expect(data).toHaveLength(0);
  });
});

describe("AdminDashboardService.getUserMetrics", () => {
  it("maps user data correctly", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Test User",
        email: "test@test.com",
        createdAt: new Date("2026-01-01"),
        progress: { totalPoints: 500, availablePoints: 300, currentRank: "desbravador" },
        purchases: [{ amountCents: 2990 }, { amountCents: 1490 }],
        _count: { trips: 3 },
      },
    ] as unknown[]);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await AdminDashboardService.getUserMetrics(1, undefined, "recent");

    expect(result.users).toHaveLength(1);
    expect(result.users[0].totalPoints).toBe(500);
    expect(result.users[0].purchaseTotal).toBe(4480);
    expect(result.users[0].tripCount).toBe(3);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("handles user with no progress", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u2",
        name: null,
        email: "new@test.com",
        createdAt: new Date(),
        progress: null,
        purchases: [],
        _count: { trips: 0 },
      },
    ] as unknown[]);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await AdminDashboardService.getUserMetrics(1);

    expect(result.users[0].totalPoints).toBe(0);
    expect(result.users[0].rank).toBe("novato");
    expect(result.users[0].purchaseTotal).toBe(0);
  });
});
