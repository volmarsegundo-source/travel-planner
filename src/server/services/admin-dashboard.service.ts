import "server-only";

// ─── Admin Dashboard Service ────────────────────────────────────────────────
//
// Provides KPIs, revenue data, and user metrics for the admin dashboard.

import { db } from "@/server/db";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Rough estimate: 1 PA of AI cost ~ R$ 0.01 (1 cent) */
export const AI_COST_PER_PA_CENTS = 1;

/** Maximum rows for CSV export */
const CSV_MAX_ROWS = 10_000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalRevenueCents: number;
  estimatedAiCostCents: number;
  marginCents: number;
  activeUsers: number;
  totalUsers: number;
  paInCirculation: number;
  totalPurchases: number;
}

export interface EnhancedKPIs extends DashboardKPIs {
  payingUsers: number;
  freeUsers: number;
  arpu: number;
  conversionRate: number;
  paEmitted: number;
  paConsumed: number;
  grossMarginPercent: number;
}

export interface RevenueDataPoint {
  date: string;
  revenueCents: number;
  purchaseCount: number;
}

export interface AiCallDataPoint {
  date: string;
  checklist: number;
  guide: number;
  itinerary: number;
  total: number;
}

export interface LevelDistributionRow {
  rank: string;
  count: number;
}

export interface TopDestinationRow {
  destination: string;
  count: number;
}

export interface PerUserProfitRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  totalPoints: number;
  availablePoints: number;
  currentRank: string;
  badgeCount: number;
  tripCount: number;
  expeditionCount: number;
  totalPurchasedCents: number;
  aiSpendPA: number;
  estimatedAiCostCents: number;
  profitCents: number;
}

export interface PaginatedPerUserProfit {
  users: PerUserProfitRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MarginAlert {
  level: "yellow" | "red" | "none";
  message: string;
  marginPercent: number;
}

export interface UserMetricRow {
  id: string;
  name: string | null;
  email: string;
  totalPoints: number;
  availablePoints: number;
  rank: string;
  purchaseTotal: number;
  tripCount: number;
  createdAt: Date;
}

export interface PaginatedUserMetrics {
  users: UserMetricRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class AdminDashboardService {
  /**
   * Get high-level KPIs for the admin dashboard.
   */
  static async getKPIs(): Promise<DashboardKPIs> {
    const [
      revenueResult,
      activeUsersCount,
      totalUsersCount,
      paResult,
      totalPurchases,
      aiTransactions,
    ] = await Promise.all([
      db.purchase.aggregate({
        where: { status: "confirmed" },
        _sum: { amountCents: true },
      }),
      db.user.count({
        where: {
          deletedAt: null,
          deactivatedAt: null,
          updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.user.count({ where: { deletedAt: null } }),
      db.userProgress.aggregate({
        _sum: { availablePoints: true },
      }),
      db.purchase.count({ where: { status: "confirmed" } }),
      db.pointTransaction.findMany({
        where: {
          type: { in: ["ai_usage"] },
          amount: { lt: 0 },
        },
        select: { description: true, amount: true },
      }),
    ]);

    // Estimate AI cost based on token usage
    const totalAiPaSpent = aiTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const estimatedAiCostCents = totalAiPaSpent * AI_COST_PER_PA_CENTS;

    const totalRevenueCents = revenueResult._sum.amountCents ?? 0;
    const marginCents = totalRevenueCents - estimatedAiCostCents;

    return {
      totalRevenueCents,
      estimatedAiCostCents,
      marginCents,
      activeUsers: activeUsersCount,
      totalUsers: totalUsersCount,
      paInCirculation: paResult._sum.availablePoints ?? 0,
      totalPurchases,
    };
  }

  /**
   * Get enhanced KPIs including paying/free users, ARPU, conversion, PA flows, and margin.
   */
  static async getEnhancedKPIs(periodDays?: number): Promise<EnhancedKPIs> {
    const dateFilter = periodDays
      ? { createdAt: { gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) } }
      : {};

    const [
      baseKPIs,
      payingUsersResult,
      paEmittedResult,
      paConsumedResult,
    ] = await Promise.all([
      AdminDashboardService.getKPIs(),
      db.purchase.findMany({
        where: { status: "confirmed", ...dateFilter },
        select: { userId: true },
        distinct: ["userId"],
      }),
      db.pointTransaction.aggregate({
        where: { amount: { gt: 0 }, ...dateFilter },
        _sum: { amount: true },
      }),
      db.pointTransaction.aggregate({
        where: { amount: { lt: 0 }, ...dateFilter },
        _sum: { amount: true },
      }),
    ]);

    const payingUsers = payingUsersResult.length;
    const freeUsers = baseKPIs.totalUsers - payingUsers;
    const arpu = payingUsers > 0
      ? Math.round(baseKPIs.totalRevenueCents / payingUsers)
      : 0;
    const conversionRate = baseKPIs.totalUsers > 0
      ? Math.round((payingUsers / baseKPIs.totalUsers) * 10000) / 100
      : 0;
    const paEmitted = paEmittedResult._sum.amount ?? 0;
    const paConsumed = Math.abs(paConsumedResult._sum.amount ?? 0);
    const grossMarginPercent = baseKPIs.totalRevenueCents > 0
      ? Math.round(
          ((baseKPIs.totalRevenueCents - baseKPIs.estimatedAiCostCents) /
            baseKPIs.totalRevenueCents) *
            10000
        ) / 100
      : 0;

    return {
      ...baseKPIs,
      payingUsers,
      freeUsers,
      arpu,
      conversionRate,
      paEmitted,
      paConsumed,
      grossMarginPercent,
    };
  }

  /**
   * Get AI calls time series grouped by period.
   * Parses PointTransaction description to categorize by AI feature.
   */
  static async getAiCallsPerPeriod(
    periodDays: number,
    groupBy: "day" | "week" | "month"
  ): Promise<AiCallDataPoint[]> {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const transactions = await db.pointTransaction.findMany({
      where: {
        type: "ai_usage",
        createdAt: { gte: since },
      },
      select: { description: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const periodMap: "daily" | "weekly" | "monthly" =
      groupBy === "day" ? "daily" : groupBy === "week" ? "weekly" : "monthly";

    const grouped = new Map<string, { checklist: number; guide: number; itinerary: number }>();

    for (const t of transactions) {
      const dateKey = getDateKey(t.createdAt, periodMap);
      const existing = grouped.get(dateKey) ?? { checklist: 0, guide: 0, itinerary: 0 };

      const desc = t.description.toLowerCase();
      if (desc.includes("checklist")) {
        existing.checklist += 1;
      } else if (desc.includes("guide") || desc.includes("guia")) {
        existing.guide += 1;
      } else if (desc.includes("itinerary") || desc.includes("itinerario") || desc.includes("roteiro")) {
        existing.itinerary += 1;
      } else {
        // Default to checklist for uncategorized
        existing.checklist += 1;
      }

      grouped.set(dateKey, existing);
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      checklist: data.checklist,
      guide: data.guide,
      itinerary: data.itinerary,
      total: data.checklist + data.guide + data.itinerary,
    }));
  }

  /**
   * Get distribution of users across gamification ranks.
   */
  static async getUserLevelDistribution(): Promise<LevelDistributionRow[]> {
    const results = await db.userProgress.groupBy({
      by: ["currentRank"],
      _count: { currentRank: true },
      orderBy: { _count: { currentRank: "desc" } },
    });

    return results.map((r) => ({
      rank: r.currentRank,
      count: r._count.currentRank,
    }));
  }

  /**
   * Get top destinations by trip count.
   */
  static async getTopDestinations(limit = 10): Promise<TopDestinationRow[]> {
    const results = await db.trip.groupBy({
      by: ["destination"],
      where: { deletedAt: null },
      _count: { destination: true },
      orderBy: { _count: { destination: "desc" } },
      take: limit,
    });

    return results.map((r) => ({
      destination: r.destination,
      count: r._count.destination,
    }));
  }

  /**
   * Get per-user profit data with pagination, search, and sorting.
   */
  static async getPerUserProfit(
    page = 1,
    pageSize = 25,
    search?: string,
    sort: "revenue" | "aiCost" | "profit" | "rank" = "revenue"
  ): Promise<PaginatedPerUserProfit> {
    pageSize = Math.min(Math.max(1, pageSize), 100);

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const orderBy =
      sort === "rank"
        ? { progress: { currentRank: "asc" as const } }
        : { createdAt: "desc" as const };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          progress: {
            select: {
              totalPoints: true,
              availablePoints: true,
              currentRank: true,
            },
          },
          purchases: {
            where: { status: "confirmed" },
            select: { amountCents: true },
          },
          pointTransactions: {
            where: { type: "ai_usage", amount: { lt: 0 } },
            select: { amount: true },
          },
          _count: {
            select: { trips: true, badges: true },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    const mapped: PerUserProfitRow[] = users.map((u) => {
      const totalPurchasedCents = u.purchases.reduce(
        (sum, p) => sum + p.amountCents,
        0
      );
      const aiSpendPA = u.pointTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      );
      const estimatedAiCostCents = aiSpendPA * AI_COST_PER_PA_CENTS;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        totalPoints: u.progress?.totalPoints ?? 0,
        availablePoints: u.progress?.availablePoints ?? 0,
        currentRank: u.progress?.currentRank ?? "novato",
        badgeCount: u._count.badges,
        tripCount: u._count.trips,
        expeditionCount: u._count.trips,
        totalPurchasedCents,
        aiSpendPA,
        estimatedAiCostCents,
        profitCents: totalPurchasedCents - estimatedAiCostCents,
      };
    });

    // Client-side sort for computed fields (revenue, aiCost, profit)
    if (sort === "revenue") {
      mapped.sort((a, b) => b.totalPurchasedCents - a.totalPurchasedCents);
    } else if (sort === "aiCost") {
      mapped.sort((a, b) => b.estimatedAiCostCents - a.estimatedAiCostCents);
    } else if (sort === "profit") {
      mapped.sort((a, b) => b.profitCents - a.profitCents);
    }

    return {
      users: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get margin alert level based on gross margin percentage.
   */
  static async getMarginAlerts(): Promise<MarginAlert> {
    const kpis = await AdminDashboardService.getEnhancedKPIs();
    const marginPercent = kpis.grossMarginPercent;

    if (marginPercent < 50 && kpis.totalRevenueCents > 0) {
      return {
        level: "red",
        message: `ALERTA: Margem bruta critica em ${marginPercent}%`,
        marginPercent,
      };
    }
    if (marginPercent < 80 && kpis.totalRevenueCents > 0) {
      return {
        level: "yellow",
        message: `Atenção: Margem bruta em ${marginPercent}% — abaixo do target de 80%`,
        marginPercent,
      };
    }

    return {
      level: "none",
      message: "",
      marginPercent,
    };
  }

  /**
   * Export user metrics as CSV string with UTF-8 BOM for Excel compatibility.
   */
  static async exportUsersCsv(
    search?: string,
    sort: "revenue" | "aiCost" | "profit" | "rank" = "revenue"
  ): Promise<string> {
    // Fetch all users (up to CSV_MAX_ROWS) using getPerUserProfit with max pageSize
    const batchSize = 100;
    const allUsers: PerUserProfitRow[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && allUsers.length < CSV_MAX_ROWS) {
      const batch = await AdminDashboardService.getPerUserProfit(
        page,
        batchSize,
        search,
        sort
      );
      allUsers.push(...batch.users);
      hasMore = page < batch.totalPages;
      page++;
    }

    const rows = allUsers.slice(0, CSV_MAX_ROWS);

    const headers = [
      "Name",
      "Email",
      "Role",
      "Lifetime PA",
      "Balance",
      "Rank",
      "Badges",
      "Trips",
      "Revenue (BRL)",
      "AI Cost (BRL)",
      "Profit (BRL)",
      "Margin %",
    ];

    const csvLines = [headers.join(",")];

    for (const u of rows) {
      const marginPct =
        u.totalPurchasedCents > 0
          ? Math.round(
              ((u.totalPurchasedCents - u.estimatedAiCostCents) /
                u.totalPurchasedCents) *
                10000
            ) / 100
          : 0;

      const line = [
        escapeCsvField(u.name ?? ""),
        escapeCsvField(u.email),
        u.role,
        u.totalPoints,
        u.availablePoints,
        u.currentRank,
        u.badgeCount,
        u.tripCount,
        (u.totalPurchasedCents / 100).toFixed(2),
        (u.estimatedAiCostCents / 100).toFixed(2),
        (u.profitCents / 100).toFixed(2),
        marginPct.toFixed(2),
      ].join(",");

      csvLines.push(line);
    }

    // UTF-8 BOM for Excel
    const BOM = "\uFEFF";
    return BOM + csvLines.join("\n");
  }

  /**
   * Get revenue time series data for charting.
   */
  static async getRevenueTimeSeries(
    period: "daily" | "weekly" | "monthly" = "daily",
    days = 30
  ): Promise<RevenueDataPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const purchases = await db.purchase.findMany({
      where: { status: "confirmed", createdAt: { gte: since } },
      select: { amountCents: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const grouped = new Map<string, { revenueCents: number; purchaseCount: number }>();

    for (const p of purchases) {
      const dateKey = getDateKey(p.createdAt, period);
      const existing = grouped.get(dateKey) ?? { revenueCents: 0, purchaseCount: 0 };
      existing.revenueCents += p.amountCents;
      existing.purchaseCount += 1;
      grouped.set(dateKey, existing);
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  /**
   * Get per-user metrics with pagination and search.
   */
  static async getUserMetrics(
    page = 1,
    search?: string,
    sort: "points" | "revenue" | "recent" = "recent",
    pageSize = 20
  ): Promise<PaginatedUserMetrics> {
    pageSize = Math.min(Math.max(1, pageSize), 100);

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          progress: {
            select: {
              totalPoints: true,
              availablePoints: true,
              currentRank: true,
            },
          },
          purchases: {
            where: { status: "confirmed" },
            select: { amountCents: true },
          },
          _count: { select: { trips: true } },
        },
        orderBy:
          sort === "recent"
            ? { createdAt: "desc" }
            : sort === "points"
              ? { progress: { totalPoints: "desc" } }
              : { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    const mapped: UserMetricRow[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      totalPoints: u.progress?.totalPoints ?? 0,
      availablePoints: u.progress?.availablePoints ?? 0,
      rank: u.progress?.currentRank ?? "novato",
      purchaseTotal: u.purchases.reduce((sum, p) => sum + p.amountCents, 0),
      tripCount: u._count.trips,
      createdAt: u.createdAt,
    }));

    return {
      users: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─── Sprint 43 Wave 5: Subscription/MRR read-only surfaces ──────────────
  //
  // These read-only methods back a future admin UI (not in this wave). They
  // are kept here so the dashboard service stays the single entry point for
  // KPI data.

  /**
   * Counts of currently-paying subscribers plus rough MRR in cents. MRR is
   * computed from the Premium plan prices defined in SPEC-PROD-PREMIUM:
   * PREMIUM_MONTHLY = R$ 29,90; PREMIUM_ANNUAL = R$ 299,00 → R$ 24,92/mo.
   */
  static async getActiveSubscribers(): Promise<{
    count: number;
    mrrCents: number;
    byPlan: Record<string, number>;
  }> {
    const rows = await db.subscription.groupBy({
      by: ["plan"],
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
      _count: { _all: true },
    });

    const byPlan: Record<string, number> = {};
    let count = 0;
    let mrrCents = 0;

    for (const row of rows) {
      const n = row._count._all;
      byPlan[row.plan] = n;
      count += n;
      if (row.plan === "PREMIUM_MONTHLY") {
        mrrCents += n * 2990;
      } else if (row.plan === "PREMIUM_ANNUAL") {
        // Amortised monthly: 29900 / 12 = 2491.67 → round to nearest cent.
        mrrCents += Math.round(n * (29900 / 12));
      }
    }

    return { count, mrrCents, byPlan };
  }

  /** Recent subscription events for audit drill-down. */
  static async getRecentSubscriptionEvents(limit = 50) {
    return db.subscriptionEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Rough 30-day churn snapshot. Numerator: CANCELED_IMMEDIATELY + expired
   * period-end cancellations in the last 30d. Denominator: total subscriptions
   * that have ever been ACTIVE. Returns a ratio (0..1).
   */
  static async getChurnMock(): Promise<{ last30d: number }> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [canceled, everActive] = await Promise.all([
      db.subscriptionEvent.count({
        where: {
          type: {
            in: ["CANCELED_IMMEDIATELY", "CANCELED_AT_PERIOD_END"],
          },
          createdAt: { gte: since },
        },
      }),
      db.subscription.count({
        where: { plan: { not: "FREE" } },
      }),
    ]);
    const ratio = everActive === 0 ? 0 : canceled / everActive;
    return { last30d: Math.round(ratio * 10000) / 10000 };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDateKey(
  date: Date,
  period: "daily" | "weekly" | "monthly"
): string {
  const d = new Date(date);
  if (period === "monthly") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "weekly") {
    // ISO week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
  }
  return d.toISOString().slice(0, 10);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
