import "server-only";

// ─── Admin Dashboard Service ────────────────────────────────────────────────
//
// Provides KPIs, revenue data, and user metrics for the admin dashboard.

import { db } from "@/server/db";

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

export interface RevenueDataPoint {
  date: string;
  revenueCents: number;
  purchaseCount: number;
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
    // Each AI spend of X PA ~ X/80 * $0.02 estimated cost
    const totalAiPaSpent = aiTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    // Rough estimate: 1 PA of AI cost ~ R$ 0.01
    const estimatedAiCostCents = totalAiPaSpent;

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
