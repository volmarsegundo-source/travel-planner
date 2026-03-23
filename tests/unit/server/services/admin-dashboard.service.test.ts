/**
 * Unit tests for AdminDashboardService.
 *
 * Tests cover:
 * - getKPIs: revenue aggregation, user counts, PA circulation
 * - getEnhancedKPIs: paying/free users, ARPU, conversion, margin
 * - getAiCallsPerPeriod: grouping by date, description parsing
 * - getUserLevelDistribution: rank grouping
 * - getTopDestinations: destination grouping and limit
 * - getPerUserProfit: pagination, search, sort, computed fields
 * - getMarginAlerts: none, yellow, red levels
 * - exportUsersCsv: CSV format, BOM, column headers
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

import { AdminDashboardService, AI_COST_PER_PA_CENTS } from "@/server/services/admin-dashboard.service";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest-mock-extended doesn't expose mockResolvedValue on groupBy
const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockBaseKPIs(overrides?: {
  revenue?: number | null;
  activeUsers?: number;
  totalUsers?: number;
  paAvailable?: number | null;
  purchases?: number;
  aiTransactions?: Array<{ amount: number; description: string }>;
}) {
  const opts = {
    revenue: 50000,
    activeUsers: 10,
    totalUsers: 25,
    paAvailable: 15000,
    purchases: 8,
    aiTransactions: [
      { id: "t1", userId: "u1", amount: -80, type: "ai_usage", description: "AI checklist", createdAt: new Date(), tripId: null },
    ],
    ...overrides,
  };

  prismaMock.purchase.aggregate.mockResolvedValue({
    _sum: { amountCents: opts.revenue },
    _count: {},
    _avg: {},
    _min: {},
    _max: {},
  } as ReturnType<typeof prismaMock.purchase.aggregate> extends Promise<infer T> ? T : never);
  prismaMock.user.count.mockResolvedValueOnce(opts.activeUsers);
  prismaMock.user.count.mockResolvedValueOnce(opts.totalUsers);
  prismaMock.userProgress.aggregate.mockResolvedValue({
    _sum: { availablePoints: opts.paAvailable },
    _count: {},
    _avg: {},
    _min: {},
    _max: {},
  } as ReturnType<typeof prismaMock.userProgress.aggregate> extends Promise<infer T> ? T : never);
  prismaMock.purchase.count.mockResolvedValue(opts.purchases);
  prismaMock.pointTransaction.findMany.mockResolvedValue(
    opts.aiTransactions.map((t) => ({ ...t, id: "tx", userId: "u1", type: "ai_usage", createdAt: new Date(), tripId: null }))
  );
}

// ─── getKPIs ────────────────────────────────────────────────────────────────

describe("AdminDashboardService.getKPIs", () => {
  it("returns correct KPI structure", async () => {
    mockBaseKPIs();

    const kpis = await AdminDashboardService.getKPIs();

    expect(kpis.totalRevenueCents).toBe(50000);
    expect(kpis.activeUsers).toBe(10);
    expect(kpis.totalUsers).toBe(25);
    expect(kpis.paInCirculation).toBe(15000);
    expect(kpis.totalPurchases).toBe(8);
    expect(kpis.estimatedAiCostCents).toBe(80 * AI_COST_PER_PA_CENTS);
    expect(kpis.marginCents).toBe(50000 - 80 * AI_COST_PER_PA_CENTS);
  });

  it("handles zero revenue gracefully", async () => {
    mockBaseKPIs({ revenue: null, activeUsers: 0, totalUsers: 0, paAvailable: null, purchases: 0, aiTransactions: [] });

    const kpis = await AdminDashboardService.getKPIs();

    expect(kpis.totalRevenueCents).toBe(0);
    expect(kpis.paInCirculation).toBe(0);
    expect(kpis.marginCents).toBe(0);
  });
});

// ─── getEnhancedKPIs ────────────────────────────────────────────────────────

describe("AdminDashboardService.getEnhancedKPIs", () => {
  function mockEnhancedDeps(payingUserIds: string[], paEmitted: number, paConsumed: number) {
    // Base KPIs mocks
    mockBaseKPIs();

    // Paying users (distinct)
    prismaMock.purchase.findMany.mockResolvedValue(
      payingUserIds.map((uid) => ({ userId: uid })) as never
    );

    // PA emitted/consumed aggregates
    prismaMock.pointTransaction.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: paEmitted },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      } as never)
      .mockResolvedValueOnce({
        _sum: { amount: -paConsumed },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      } as never);
  }

  it("calculates paying and free users correctly", async () => {
    mockEnhancedDeps(["u1", "u2", "u3"], 5000, 2000);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    expect(kpis.payingUsers).toBe(3);
    expect(kpis.freeUsers).toBe(22); // 25 total - 3 paying
  });

  it("calculates ARPU correctly", async () => {
    mockEnhancedDeps(["u1", "u2"], 5000, 2000);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    // ARPU = totalRevenueCents / payingUsers = 50000 / 2 = 25000
    expect(kpis.arpu).toBe(25000);
  });

  it("returns zero ARPU when no paying users", async () => {
    mockBaseKPIs({ revenue: null, totalUsers: 5, activeUsers: 2, paAvailable: null, purchases: 0, aiTransactions: [] });
    prismaMock.purchase.findMany.mockResolvedValue([]);
    prismaMock.pointTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never)
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    expect(kpis.arpu).toBe(0);
    expect(kpis.payingUsers).toBe(0);
    expect(kpis.freeUsers).toBe(5);
  });

  it("calculates conversion rate as percentage", async () => {
    mockEnhancedDeps(["u1", "u2"], 5000, 2000);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    // conversionRate = 2/25 * 100 = 8%
    expect(kpis.conversionRate).toBe(8);
  });

  it("calculates PA emitted and consumed", async () => {
    mockEnhancedDeps(["u1"], 12000, 3000);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    expect(kpis.paEmitted).toBe(12000);
    expect(kpis.paConsumed).toBe(3000);
  });

  it("calculates gross margin percent", async () => {
    mockEnhancedDeps(["u1"], 5000, 2000);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    // margin = (50000 - 80) / 50000 * 100 = 99.84%
    const expected = Math.round(((50000 - 80 * AI_COST_PER_PA_CENTS) / 50000) * 10000) / 100;
    expect(kpis.grossMarginPercent).toBe(expected);
  });

  it("returns zero gross margin when no revenue", async () => {
    mockBaseKPIs({ revenue: null, totalUsers: 5, activeUsers: 2, paAvailable: null, purchases: 0, aiTransactions: [] });
    prismaMock.purchase.findMany.mockResolvedValue([]);
    prismaMock.pointTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never)
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never);

    const kpis = await AdminDashboardService.getEnhancedKPIs();

    expect(kpis.grossMarginPercent).toBe(0);
  });

  it("accepts periodDays filter", async () => {
    mockEnhancedDeps(["u1"], 5000, 2000);

    const kpis = await AdminDashboardService.getEnhancedKPIs(7);

    expect(kpis).toBeDefined();
    expect(kpis.payingUsers).toBe(1);
  });
});

// ─── getAiCallsPerPeriod ────────────────────────────────────────────────────

describe("AdminDashboardService.getAiCallsPerPeriod", () => {
  it("categorizes AI calls by description", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([
      { id: "1", userId: "u1", amount: -10, type: "ai_usage", description: "AI checklist generation", createdAt: new Date("2026-03-20"), tripId: null },
      { id: "2", userId: "u1", amount: -15, type: "ai_usage", description: "AI guide generation", createdAt: new Date("2026-03-20"), tripId: null },
      { id: "3", userId: "u1", amount: -20, type: "ai_usage", description: "AI itinerary generation", createdAt: new Date("2026-03-20"), tripId: null },
      { id: "4", userId: "u2", amount: -10, type: "ai_usage", description: "AI checklist regen", createdAt: new Date("2026-03-20"), tripId: null },
    ]);

    const data = await AdminDashboardService.getAiCallsPerPeriod(30, "day");

    expect(data).toHaveLength(1);
    expect(data[0].checklist).toBe(2);
    expect(data[0].guide).toBe(1);
    expect(data[0].itinerary).toBe(1);
    expect(data[0].total).toBe(4);
  });

  it("groups by date correctly", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([
      { id: "1", userId: "u1", amount: -10, type: "ai_usage", description: "AI checklist", createdAt: new Date("2026-03-19"), tripId: null },
      { id: "2", userId: "u1", amount: -10, type: "ai_usage", description: "AI checklist", createdAt: new Date("2026-03-20"), tripId: null },
    ]);

    const data = await AdminDashboardService.getAiCallsPerPeriod(30, "day");

    expect(data).toHaveLength(2);
  });

  it("returns empty array when no AI calls", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([]);

    const data = await AdminDashboardService.getAiCallsPerPeriod(30, "day");

    expect(data).toHaveLength(0);
  });

  it("handles guia description for Portuguese", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([
      { id: "1", userId: "u1", amount: -10, type: "ai_usage", description: "Geracao de guia", createdAt: new Date("2026-03-20"), tripId: null },
    ]);

    const data = await AdminDashboardService.getAiCallsPerPeriod(30, "day");

    expect(data[0].guide).toBe(1);
  });

  it("handles roteiro description for Portuguese itinerary", async () => {
    prismaMock.pointTransaction.findMany.mockResolvedValue([
      { id: "1", userId: "u1", amount: -10, type: "ai_usage", description: "Geracao de roteiro", createdAt: new Date("2026-03-20"), tripId: null },
    ]);

    const data = await AdminDashboardService.getAiCallsPerPeriod(30, "day");

    expect(data[0].itinerary).toBe(1);
  });
});

// ─── getUserLevelDistribution ───────────────────────────────────────────────

describe("AdminDashboardService.getUserLevelDistribution", () => {
  it("returns rank distribution", async () => {
    asMock(prismaMock.userProgress.groupBy).mockResolvedValue([
      { currentRank: "novato", _count: { currentRank: 15 } },
      { currentRank: "desbravador", _count: { currentRank: 8 } },
      { currentRank: "explorador", _count: { currentRank: 3 } },
    ]);

    const dist = await AdminDashboardService.getUserLevelDistribution();

    expect(dist).toHaveLength(3);
    expect(dist[0]).toEqual({ rank: "novato", count: 15 });
    expect(dist[1]).toEqual({ rank: "desbravador", count: 8 });
    expect(dist[2]).toEqual({ rank: "explorador", count: 3 });
  });

  it("returns empty array when no users have progress", async () => {
    asMock(prismaMock.userProgress.groupBy).mockResolvedValue([]);

    const dist = await AdminDashboardService.getUserLevelDistribution();

    expect(dist).toHaveLength(0);
  });
});

// ─── getTopDestinations ─────────────────────────────────────────────────────

describe("AdminDashboardService.getTopDestinations", () => {
  it("returns destinations sorted by count", async () => {
    asMock(prismaMock.trip.groupBy).mockResolvedValue([
      { destination: "Paris, France", _count: { destination: 12 } },
      { destination: "Tokyo, Japan", _count: { destination: 8 } },
      { destination: "New York, USA", _count: { destination: 5 } },
    ] as never);

    const dests = await AdminDashboardService.getTopDestinations(10);

    expect(dests).toHaveLength(3);
    expect(dests[0]).toEqual({ destination: "Paris, France", count: 12 });
    expect(dests[2]).toEqual({ destination: "New York, USA", count: 5 });
  });

  it("returns empty array when no trips", async () => {
    asMock(prismaMock.trip.groupBy).mockResolvedValue([] as never);

    const dests = await AdminDashboardService.getTopDestinations(5);

    expect(dests).toHaveLength(0);
  });

  it("respects limit parameter", async () => {
    asMock(prismaMock.trip.groupBy).mockResolvedValue([
      { destination: "Paris", _count: { destination: 10 } },
    ] as never);

    await AdminDashboardService.getTopDestinations(3);

    expect(prismaMock.trip.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });
});

// ─── getPerUserProfit ───────────────────────────────────────────────────────

describe("AdminDashboardService.getPerUserProfit", () => {
  function mockUserProfitData() {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Alice",
        email: "alice@test.com",
        role: "user",
        progress: { totalPoints: 500, availablePoints: 300, currentRank: "desbravador" },
        purchases: [{ amountCents: 2990 }, { amountCents: 1490 }],
        pointTransactions: [{ amount: -50 }, { amount: -30 }],
        _count: { trips: 3, badges: 2 },
      },
      {
        id: "u2",
        name: null,
        email: "bob@test.com",
        role: "user",
        progress: null,
        purchases: [],
        pointTransactions: [{ amount: -100 }],
        _count: { trips: 0, badges: 0 },
      },
    ] as never);
    prismaMock.user.count.mockResolvedValue(2);
  }

  it("maps user profit data correctly", async () => {
    mockUserProfitData();

    const result = await AdminDashboardService.getPerUserProfit(1, 25);

    expect(result.users).toHaveLength(2);
    const alice = result.users.find((u) => u.id === "u1")!;
    expect(alice.totalPurchasedCents).toBe(4480);
    expect(alice.aiSpendPA).toBe(80);
    expect(alice.estimatedAiCostCents).toBe(80 * AI_COST_PER_PA_CENTS);
    expect(alice.profitCents).toBe(4480 - 80 * AI_COST_PER_PA_CENTS);
    expect(alice.badgeCount).toBe(2);
    expect(alice.tripCount).toBe(3);
    expect(alice.expeditionCount).toBe(3);
    expect(alice.currentRank).toBe("desbravador");
  });

  it("handles user with no progress", async () => {
    mockUserProfitData();

    const result = await AdminDashboardService.getPerUserProfit(1, 25);

    const bob = result.users.find((u) => u.id === "u2")!;
    expect(bob.currentRank).toBe("novato");
    expect(bob.totalPoints).toBe(0);
    expect(bob.availablePoints).toBe(0);
    expect(bob.totalPurchasedCents).toBe(0);
    expect(bob.aiSpendPA).toBe(100);
    expect(bob.profitCents).toBe(0 - 100 * AI_COST_PER_PA_CENTS);
  });

  it("returns correct pagination info", async () => {
    mockUserProfitData();

    const result = await AdminDashboardService.getPerUserProfit(1, 25);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  it("sorts by revenue (descending)", async () => {
    mockUserProfitData();

    const result = await AdminDashboardService.getPerUserProfit(1, 25, undefined, "revenue");

    // Alice has 4480, Bob has 0 — Alice should be first
    expect(result.users[0].id).toBe("u1");
    expect(result.users[1].id).toBe("u2");
  });

  it("sorts by profit (descending)", async () => {
    mockUserProfitData();

    const result = await AdminDashboardService.getPerUserProfit(1, 25, undefined, "profit");

    // Alice profit = 4480 - 80, Bob profit = 0 - 100 — Alice first
    expect(result.users[0].id).toBe("u1");
  });

  it("sorts by aiCost (descending)", async () => {
    mockUserProfitData();

    const result = await AdminDashboardService.getPerUserProfit(1, 25, undefined, "aiCost");

    // Bob has 100 AI PA, Alice has 80 — Bob should be first
    expect(result.users[0].id).toBe("u2");
  });

  it("passes search parameter to where clause", async () => {
    mockUserProfitData();

    await AdminDashboardService.getPerUserProfit(1, 25, "alice");

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ contains: "alice" }) }),
          ]),
        }),
      })
    );
  });

  it("clamps pageSize between 1 and 100", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    const result = await AdminDashboardService.getPerUserProfit(1, 200);

    expect(result.pageSize).toBe(100);
  });
});

// ─── getMarginAlerts ────────────────────────────────────────────────────────

describe("AdminDashboardService.getMarginAlerts", () => {
  function mockForMargin(revenueCents: number, aiPaSpent: number) {
    mockBaseKPIs({
      revenue: revenueCents,
      aiTransactions: aiPaSpent > 0
        ? [{ amount: -aiPaSpent, description: "AI" }]
        : [],
    });
    prismaMock.purchase.findMany.mockResolvedValue([{ userId: "u1" }] as never);
    prismaMock.pointTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 100 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never)
      .mockResolvedValueOnce({ _sum: { amount: -50 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never);
  }

  it("returns none when margin is healthy (>= 80%)", async () => {
    mockForMargin(10000, 100); // cost = 100 cents, margin = 99%

    const alert = await AdminDashboardService.getMarginAlerts();

    expect(alert.level).toBe("none");
    expect(alert.message).toBe("");
  });

  it("returns yellow when margin is between 50% and 80%", async () => {
    mockForMargin(10000, 3000); // cost = 3000 cents, margin = 70%

    const alert = await AdminDashboardService.getMarginAlerts();

    expect(alert.level).toBe("yellow");
    expect(alert.message).toContain("Atencao");
  });

  it("returns red when margin is below 50%", async () => {
    mockForMargin(10000, 6000); // cost = 6000, margin = 40%

    const alert = await AdminDashboardService.getMarginAlerts();

    expect(alert.level).toBe("red");
    expect(alert.message).toContain("ALERTA");
  });

  it("returns none when there is no revenue", async () => {
    mockBaseKPIs({ revenue: null, totalUsers: 5, activeUsers: 2, paAvailable: null, purchases: 0, aiTransactions: [] });
    prismaMock.purchase.findMany.mockResolvedValue([]);
    prismaMock.pointTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never)
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: {}, _avg: {}, _min: {}, _max: {} } as never);

    const alert = await AdminDashboardService.getMarginAlerts();

    expect(alert.level).toBe("none");
  });
});

// ─── exportUsersCsv ─────────────────────────────────────────────────────────

describe("AdminDashboardService.exportUsersCsv", () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Alice Test",
        email: "alice@test.com",
        role: "user",
        progress: { totalPoints: 500, availablePoints: 300, currentRank: "desbravador" },
        purchases: [{ amountCents: 2990 }],
        pointTransactions: [{ amount: -50 }],
        _count: { trips: 2, badges: 1 },
      },
    ] as never);
    prismaMock.user.count.mockResolvedValue(1);
  });

  it("starts with UTF-8 BOM", async () => {
    const csv = await AdminDashboardService.exportUsersCsv();

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it("contains correct CSV headers", async () => {
    const csv = await AdminDashboardService.exportUsersCsv();
    const lines = csv.split("\n");

    // Skip BOM character
    const headerLine = lines[0].replace("\uFEFF", "");
    expect(headerLine).toBe(
      "Name,Email,Role,Lifetime PA,Balance,Rank,Badges,Trips,Revenue (BRL),AI Cost (BRL),Profit (BRL),Margin %"
    );
  });

  it("contains user data rows", async () => {
    const csv = await AdminDashboardService.exportUsersCsv();
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2); // header + 1 user
    expect(lines[1]).toContain("Alice Test");
    expect(lines[1]).toContain("alice@test.com");
    expect(lines[1]).toContain("desbravador");
  });

  it("formats monetary values as BRL with two decimals", async () => {
    const csv = await AdminDashboardService.exportUsersCsv();
    const lines = csv.split("\n");
    const cols = lines[1].split(",");

    // Revenue = 2990 cents = 29.90
    expect(cols[8]).toBe("29.90");
  });

  it("escapes fields with commas", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Last, First",
        email: "test@test.com",
        role: "user",
        progress: { totalPoints: 0, availablePoints: 0, currentRank: "novato" },
        purchases: [],
        pointTransactions: [],
        _count: { trips: 0, badges: 0 },
      },
    ] as never);
    prismaMock.user.count.mockResolvedValue(1);

    const csv = await AdminDashboardService.exportUsersCsv();
    const lines = csv.split("\n");

    expect(lines[1]).toContain('"Last, First"');
  });
});

// ─── getRevenueTimeSeries ───────────────────────────────────────────────────

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
    expect(data[0].revenueCents).toBe(5980);
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

// ─── getUserMetrics ─────────────────────────────────────────────────────────

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
    ] as never);
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
    ] as never);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await AdminDashboardService.getUserMetrics(1);

    expect(result.users[0].totalPoints).toBe(0);
    expect(result.users[0].rank).toBe("novato");
    expect(result.users[0].purchaseTotal).toBe(0);
  });
});
