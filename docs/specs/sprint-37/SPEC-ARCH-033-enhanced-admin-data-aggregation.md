# Technical Specification: Enhanced Admin Data Aggregation

**Spec ID**: SPEC-ARCH-033
**Related Story**: Sprint 37 — Gamification Wave 3 (Admin Analytics)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-23
**Sprint**: 37
**References**: SPEC-ARCH-031 (Admin Dashboard, Sprint 36), SPEC-PROD-042, SPEC-SEC-006

---

## 1. Overview

Upgrade `AdminDashboardService` from basic counts and sums to production-grade analytics: free vs paying user segmentation, ARPU, conversion rate, AI usage over time, rank distribution, top destinations, per-user profit/loss, margin alerts, and CSV export. All aggregation queries use Redis caching with 15-minute TTL, invalidated on purchase or point-spend events.

---

## 2. Architecture Diagram

```
[Admin Dashboard Page]
        |
        | Server Component fetches via AdminDashboardService
        v
[AdminDashboardService]
        |
        ├── getEnhancedKPIs() ──────────── Redis cache (15min) ──── DB aggregation
        ├── getUserSegmentation() ──────── Redis cache (15min) ──── DB subquery
        ├── getAIUsageTimeSeries() ──────── Redis cache (15min) ──── DB group by
        ├── getRankDistribution() ──────── Redis cache (15min) ──── DB group by
        ├── getTopDestinations() ────────── Redis cache (15min) ──── DB group by
        ├── getPerUserProfitability() ──── Redis cache (15min) ──── DB LEFT JOIN
        ├── getMarginAlerts() ──────────── Redis cache (15min) ──── Computed from KPIs
        └── exportCSV(type) ────────────── No cache ──── Streams directly

[Cache Invalidation]
        |
        ├── On purchase.confirmed ──── del admin:kpis:*, admin:segmentation:*
        ├── On points.spent ────────── del admin:kpis:*, admin:ai-usage:*
        └── On trip.created ────────── del admin:destinations:*
```

---

## 3. Data Model

No schema migration required. All queries operate on existing models:

| Model | Fields Used | Query Purpose |
|---|---|---|
| `Purchase` | amountCents, status, userId, createdAt | Revenue, ARPU, conversion |
| `PointTransaction` | type, amount, userId, createdAt | AI cost estimation, usage trends |
| `UserProgress` | currentRank, totalPoints, availablePoints | Rank distribution, PA economy |
| `User` | id, createdAt, deletedAt | User segmentation, totals |
| `Trip` | destination, userId | Top destinations |

---

## 4. API Contract

### 4.1 Enhanced KPIs

**Server Action**: `getEnhancedKPIsAction()`
**Auth**: Admin only (3-layer guard per SPEC-ARCH-031)
**Response**:

```typescript
export interface EnhancedKPIs extends DashboardKPIs {
  // Existing from DashboardKPIs:
  totalRevenueCents: number;
  estimatedAiCostCents: number;
  marginCents: number;
  activeUsers: number;
  totalUsers: number;
  paInCirculation: number;
  totalPurchases: number;

  // New enhanced metrics:
  freeUsers: number;           // Users with 0 confirmed purchases
  payingUsers: number;         // Users with >= 1 confirmed purchase
  conversionRate: number;      // payingUsers / totalUsers (0.0 - 1.0)
  arpuCents: number;           // totalRevenueCents / payingUsers (0 if no paying users)
  marginPercent: number;       // marginCents / totalRevenueCents * 100 (0 if no revenue)
  avgPaPerUser: number;        // SUM(availablePoints) / totalUsers
  aiCallsLast30d: number;     // COUNT(PointTransaction WHERE type=ai_usage, last 30d)
}
```

### 4.2 User Segmentation

**Server Action**: `getUserSegmentationAction()`
**Auth**: Admin only
**Response**:

```typescript
export interface UserSegmentation {
  totalUsers: number;
  freeUsers: number;
  payingUsers: number;
  conversionRate: number;        // 0.0 - 1.0
  payingUsersLast30d: number;    // New paying users in last 30 days
  churnedFreeUsers: number;      // Free users inactive > 30d
}
```

### 4.3 AI Usage Time Series

**Server Action**: `getAIUsageTimeSeriesAction(period, days)`
**Auth**: Admin only
**Params**: `period: "daily" | "weekly" | "monthly"`, `days: number` (default 30, max 365)
**Response**:

```typescript
export interface AIUsageDataPoint {
  date: string;                  // ISO date key
  callCount: number;             // Number of AI calls
  totalPaSpent: number;          // Total PA consumed
  estimatedCostCents: number;    // Estimated cost in BRL cents
}
```

### 4.4 Rank Distribution

**Server Action**: `getRankDistributionAction()`
**Auth**: Admin only
**Response**:

```typescript
export interface RankDistribution {
  rank: string;                  // "traveler" | "explorer" | "navigator" | ...
  count: number;
  percentage: number;            // 0.0 - 100.0
}
```

### 4.5 Top Destinations

**Server Action**: `getTopDestinationsAction(limit)`
**Auth**: Admin only
**Params**: `limit: number` (default 10, max 50)
**Response**:

```typescript
export interface TopDestination {
  destination: string;           // Trip.destination value
  tripCount: number;
  percentage: number;            // of total trips
}
```

### 4.6 Per-User Profitability

**Server Action**: `getUserProfitabilityAction(page, pageSize, sort)`
**Auth**: Admin only
**Params**: `page: number`, `pageSize: number` (max 100), `sort: "profit" | "revenue" | "cost" | "recent"`
**Response**:

```typescript
export interface UserProfitRow {
  userId: string;
  name: string | null;
  email: string;
  totalRevenueCents: number;     // SUM(Purchase.amountCents) WHERE confirmed
  estimatedAiCostCents: number;  // SUM(abs(PointTransaction.amount)) WHERE ai_usage * cost factor
  profitCents: number;           // revenue - cost
  purchaseCount: number;
  aiCallCount: number;
  createdAt: Date;
}

export interface PaginatedUserProfit {
  users: UserProfitRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 4.7 Margin Alerts

**Server Action**: `getMarginAlertsAction()`
**Auth**: Admin only
**Response**:

```typescript
export interface MarginAlert {
  level: "info" | "warning" | "critical";
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
}
```

Alert thresholds:
| Metric | Warning | Critical |
|---|---|---|
| Overall margin % | < 50% | < 20% |
| AI cost / revenue ratio | > 40% | > 70% |
| PA in circulation vs revenue | > 200% | > 400% |

### 4.8 CSV Export

**Server Action**: `exportAdminCSVAction(type)`
**Auth**: Admin only
**Params**: `type: "users" | "purchases" | "ai-usage" | "profitability"`
**Response**: `ActionResult<{ csv: string; filename: string }>`

CSV is generated server-side and returned as a string. The client triggers a download via `Blob` + `URL.createObjectURL`. No streaming for MVP (datasets are small enough).

**Headers**: `Content-Type: text/csv; charset=utf-8` with BOM (`\uFEFF`) for Excel compatibility.

---

## 5. Business Logic

### 5.1 Enhanced KPI Queries

```typescript
static async getEnhancedKPIs(): Promise<EnhancedKPIs> {
  const cacheKey = "admin:kpis:enhanced";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const [
    baseKPIs,                    // Existing getKPIs()
    payingUsersCount,            // Distinct users with confirmed purchases
    aiCallsLast30d,              // AI usage count
  ] = await Promise.all([
    AdminDashboardService.getKPIs(),
    db.purchase.groupBy({
      by: ["userId"],
      where: { status: "confirmed" },
      _count: true,
    }).then(r => r.length),
    db.pointTransaction.count({
      where: {
        type: "ai_usage",
        createdAt: { gte: thirtyDaysAgo() },
      },
    }),
  ]);

  const freeUsers = baseKPIs.totalUsers - payingUsersCount;
  const conversionRate = baseKPIs.totalUsers > 0
    ? payingUsersCount / baseKPIs.totalUsers
    : 0;
  const arpuCents = payingUsersCount > 0
    ? Math.round(baseKPIs.totalRevenueCents / payingUsersCount)
    : 0;
  const marginPercent = baseKPIs.totalRevenueCents > 0
    ? (baseKPIs.marginCents / baseKPIs.totalRevenueCents) * 100
    : 0;

  const result: EnhancedKPIs = {
    ...baseKPIs,
    freeUsers,
    payingUsers: payingUsersCount,
    conversionRate,
    arpuCents,
    marginPercent,
    avgPaPerUser: baseKPIs.totalUsers > 0
      ? Math.round(baseKPIs.paInCirculation / baseKPIs.totalUsers)
      : 0,
    aiCallsLast30d,
  };

  await redis.set(cacheKey, JSON.stringify(result), "EX", 900); // 15 min
  return result;
}
```

### 5.2 User Segmentation Query

```typescript
// Paying users = users with at least 1 confirmed purchase
const payingUserIds = await db.purchase.groupBy({
  by: ["userId"],
  where: { status: "confirmed" },
});

// New paying users in last 30d = users whose FIRST confirmed purchase is within 30d
const newPaying = await db.purchase.groupBy({
  by: ["userId"],
  where: { status: "confirmed" },
  _min: { createdAt: true },
  having: {
    createdAt: { _min: { gte: thirtyDaysAgo() } },
  },
});
```

### 5.3 AI Usage Time Series

```typescript
// GROUP BY date bucket, SUM absolute amounts
const transactions = await db.pointTransaction.findMany({
  where: {
    type: "ai_usage",
    amount: { lt: 0 },
    createdAt: { gte: sinceDate },
  },
  select: { amount: true, createdAt: true },
  orderBy: { createdAt: "asc" },
});

// Group into date buckets using existing getDateKey() helper
// Cost estimation: 1 PA of AI spend ~ R$ 0.01 (1 cent)
```

### 5.4 Rank Distribution

```typescript
const distribution = await db.userProgress.groupBy({
  by: ["currentRank"],
  _count: { _all: true },
});

const total = distribution.reduce((sum, r) => sum + r._count._all, 0);
return distribution.map(r => ({
  rank: r.currentRank,
  count: r._count._all,
  percentage: total > 0 ? (r._count._all / total) * 100 : 0,
}));
```

### 5.5 Top Destinations

```typescript
const destinations = await db.trip.groupBy({
  by: ["destination"],
  where: { deletedAt: null },
  _count: { _all: true },
  orderBy: { _count: { destination: "desc" } },
  take: limit,
});
```

### 5.6 Per-User Profitability

This is the most complex query. It requires joining User + Purchase (SUM) + PointTransaction (SUM WHERE ai_usage):

```typescript
// Strategy: 2 queries + JS join (Prisma does not support arbitrary LEFT JOIN aggregations)

// Query 1: User revenue
const userRevenue = await db.purchase.groupBy({
  by: ["userId"],
  where: { status: "confirmed" },
  _sum: { amountCents: true },
  _count: { _all: true },
});

// Query 2: User AI cost
const userAiCost = await db.pointTransaction.groupBy({
  by: ["userId"],
  where: { type: "ai_usage", amount: { lt: 0 } },
  _sum: { amount: true },
  _count: { _all: true },
});

// Query 3: Paginated users (existing getUserMetrics pattern)
const users = await db.user.findMany({ ... });

// JS join: merge revenue + cost into user rows
const revenueMap = new Map(userRevenue.map(r => [r.userId, r]));
const costMap = new Map(userAiCost.map(r => [r.userId, r]));
```

**Why not raw SQL**: Prisma's groupBy covers our needs. Raw SQL would bypass type safety and migration tracking. The dataset is small enough (< 10K users at MVP) that the JS join is negligible.

### 5.7 Margin Alerts

```typescript
static async getMarginAlerts(): Promise<MarginAlert[]> {
  const kpis = await this.getEnhancedKPIs();
  const alerts: MarginAlert[] = [];

  // Overall margin
  if (kpis.totalRevenueCents > 0) {
    const marginPct = kpis.marginPercent;
    if (marginPct < 20) {
      alerts.push({
        level: "critical",
        message: "Margem abaixo de 20% — custos de IA consumindo receita",
        metric: "margin_percent",
        currentValue: marginPct,
        threshold: 20,
      });
    } else if (marginPct < 50) {
      alerts.push({
        level: "warning",
        message: "Margem abaixo de 50% — monitorar tendencia de custos",
        metric: "margin_percent",
        currentValue: marginPct,
        threshold: 50,
      });
    }
  }

  // AI cost ratio
  if (kpis.totalRevenueCents > 0) {
    const aiRatio = (kpis.estimatedAiCostCents / kpis.totalRevenueCents) * 100;
    if (aiRatio > 70) {
      alerts.push({ level: "critical", ... });
    } else if (aiRatio > 40) {
      alerts.push({ level: "warning", ... });
    }
  }

  // PA in circulation vs revenue (inflation risk)
  if (kpis.totalRevenueCents > 0) {
    // Convert PA to estimated value: 1 PA ~ R$ 0.03 (based on cheapest package)
    const paValueCents = kpis.paInCirculation * 3;
    const paRatio = (paValueCents / kpis.totalRevenueCents) * 100;
    if (paRatio > 400) {
      alerts.push({ level: "critical", ... });
    } else if (paRatio > 200) {
      alerts.push({ level: "warning", ... });
    }
  }

  return alerts;
}
```

### 5.8 CSV Export

```typescript
static async exportCSV(
  type: "users" | "purchases" | "ai-usage" | "profitability"
): Promise<{ csv: string; filename: string }> {
  const BOM = "\uFEFF"; // Excel UTF-8 BOM
  let csv = BOM;
  const timestamp = new Date().toISOString().slice(0, 10);

  switch (type) {
    case "users": {
      csv += "ID,Nome,Email,Rank,Total Points,Available Points,Purchases (BRL),Trips,Criado Em\n";
      const data = await this.getUserMetrics(1, undefined, "recent", 10000);
      for (const u of data.users) {
        csv += `${u.id},"${u.name ?? ""}","${u.email}",${u.rank},${u.totalPoints},${u.availablePoints},${(u.purchaseTotal / 100).toFixed(2)},${u.tripCount},${u.createdAt.toISOString()}\n`;
      }
      return { csv, filename: `atlas-users-${timestamp}.csv` };
    }
    case "purchases": {
      csv += "ID,User ID,Package,PA,Valor (BRL),Status,Data\n";
      const purchases = await db.purchase.findMany({
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      for (const p of purchases) {
        csv += `${p.id},${p.userId},${p.packageId},${p.paAmount},${(p.amountCents / 100).toFixed(2)},${p.status},${p.createdAt.toISOString()}\n`;
      }
      return { csv, filename: `atlas-purchases-${timestamp}.csv` };
    }
    // ... similar for ai-usage and profitability
  }
}
```

**IMPORTANT**: CSV export does NOT include PII beyond name/email (which admin already has access to). No passport numbers, birth dates, or encrypted fields.

---

## 6. External Integrations

None. All data comes from the local PostgreSQL database.

---

## 7. Security Considerations

### 7.1 Admin Guard (Defense in Depth — unchanged from SPEC-ARCH-031)

All new methods and actions require the 3-layer admin guard:
1. **Middleware**: `token.role !== "admin"` -> redirect
2. **Layout**: `session.user.role !== "admin"` -> redirect
3. **Server Action**: `assertAdmin(session)` -> ForbiddenError

### 7.2 Data Exposure

| Data | Exposed to Admin? | Notes |
|---|---|---|
| User email | Yes | Required for user identification |
| User name | Yes | Display only |
| Purchase amounts | Yes | Revenue analytics |
| PA balances | Yes | Economy monitoring |
| Trip destinations | Yes (aggregated) | Top destinations only, no trip details |
| Passport / birth date | NO | Never included in admin queries |
| Booking codes | NO | Never included in admin queries |
| Password hashes | NO | Never selected |

### 7.3 Query Safety

- All pagination is capped: `pageSize = Math.min(Math.max(1, pageSize), 100)`
- CSV export capped at 10,000 rows (prevents OOM on large datasets)
- No raw SQL — all queries via Prisma (SQL injection protection)
- `search` parameter uses Prisma `contains` with `mode: "insensitive"` (no regex injection)

### 7.4 Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| All admin dashboard actions | 60 | 1 minute |
| CSV export | 5 | 10 minutes |

Rate limiting on admin endpoints is primarily to prevent accidental abuse or automated scraping, not hostile attacks (admin role is already gated).

---

## 8. Performance Requirements

### 8.1 Latency Targets

| Operation | Target | Strategy |
|---|---|---|
| getEnhancedKPIs | < 500ms cold, < 50ms cached | Redis 15min TTL |
| getUserSegmentation | < 500ms cold, < 50ms cached | Redis 15min TTL |
| getAIUsageTimeSeries | < 1s cold, < 50ms cached | Redis 15min TTL |
| getRankDistribution | < 200ms cold, < 50ms cached | Redis 15min TTL |
| getTopDestinations | < 300ms cold, < 50ms cached | Redis 15min TTL |
| getPerUserProfitability | < 1s (paginated) | No cache (paginated + sorted) |
| exportCSV | < 5s | No cache (one-off operation) |

### 8.2 Caching Strategy

**Cache Keys** (add to `src/server/cache/keys.ts`):

```typescript
export const AdminCacheKeys = {
  kpis: () => "admin:kpis:enhanced",
  segmentation: () => "admin:segmentation",
  aiUsage: (period: string, days: number) => `admin:ai-usage:${period}:${days}`,
  rankDistribution: () => "admin:rank-distribution",
  topDestinations: (limit: number) => `admin:top-destinations:${limit}`,
  marginAlerts: () => "admin:margin-alerts",
} as const;
```

**TTL**: 900 seconds (15 minutes) for all cached queries.

**Invalidation** (event-driven):

```typescript
// Call after purchase confirmation (in webhook handler / purchasePAAction)
async function invalidateAdminCacheOnPurchase(): Promise<void> {
  const keys = await redis.keys("admin:*");
  if (keys.length > 0) await redis.del(...keys);
}

// Call after AI point spend (in spendPoints / AI actions)
async function invalidateAdminCacheOnAISpend(): Promise<void> {
  const keys = await redis.keys("admin:kpis:*");
  const aiKeys = await redis.keys("admin:ai-usage:*");
  const allKeys = [...keys, ...aiKeys];
  if (allKeys.length > 0) await redis.del(...allKeys);
}
```

**IMPORTANT**: `redis.keys()` is O(N) and should not be used in production at scale. For MVP (< 20 cache keys), this is acceptable. At scale, switch to explicit key list deletion or Redis key tagging.

### 8.3 Database Query Complexity

| Query | Complexity | Index Used |
|---|---|---|
| Purchase aggregate (revenue) | O(N purchases) | `purchases_status_idx` |
| Purchase groupBy userId | O(N purchases) | `purchases_user_id_idx` |
| PointTransaction groupBy (AI) | O(N ai_transactions) | `point_transactions_user_id_type_idx` |
| UserProgress groupBy rank | O(N users) | Full table scan (small table) |
| Trip groupBy destination | O(N trips) | `trips_user_id_deleted_at_idx` |
| User count with subquery | O(N users) | `users_deleted_at_idx` |

At MVP scale (< 1K users, < 5K transactions), all queries complete in < 100ms. Redis caching provides headroom.

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Test | Layer | Description |
|---|---|---|
| `admin-dashboard.service.test.ts` | Service | Test each new method with mocked Prisma |
| `admin-kpis.test.ts` | Service | Verify ARPU, conversion rate, margin calculations |
| `admin-csv-export.test.ts` | Service | Verify CSV format, BOM, escaping |
| `margin-alerts.test.ts` | Service | Test alert thresholds with various margin scenarios |

**Key test scenarios**:
- Zero revenue: ARPU = 0, conversionRate = 0, marginPercent = 0 (no division by zero)
- All users paying: freeUsers = 0, conversionRate = 1.0
- No AI usage: aiCallsLast30d = 0, estimatedAiCostCents = 0
- Margin at exactly threshold boundary
- CSV with special characters in user names (commas, quotes)

### 9.2 Integration Tests

- Verify Redis caching: call twice, second call should be < 10ms
- Verify cache invalidation: purchase confirmation clears admin cache
- Verify pagination: correct offset/limit, totalPages calculation

### 9.3 E2E Tests (Playwright)

- Admin login -> dashboard loads KPIs
- Verify CSV download produces valid file
- Non-admin user cannot access /admin routes (redirect to /expeditions)

### 9.4 Performance Tests

- Seed 1000 users + 5000 transactions, verify KPI query < 500ms
- Not needed at MVP, but document seed script for future load testing

---

## 10. Implementation Notes for Developers

### 10.1 File Structure

```
src/
  server/
    services/
      admin-dashboard.service.ts    # MODIFY — extend with new methods
    actions/
      admin.actions.ts              # MODIFY — add new server actions
  server/
    cache/
      keys.ts                       # MODIFY — add AdminCacheKeys
```

### 10.2 Extending AdminDashboardService

Add new static methods to the existing class. Do NOT create a separate service — keep all admin analytics in one place for simplicity.

The existing `getKPIs()` method should be kept as-is (other code may depend on its shape). The new `getEnhancedKPIs()` calls it internally and extends the result.

### 10.3 CSV Escaping

Values containing commas, quotes, or newlines must be escaped:

```typescript
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

### 10.4 Date Helpers

Reuse the existing `getDateKey()` helper (already in `admin-dashboard.service.ts`) for time series grouping. Add a `thirtyDaysAgo()` helper:

```typescript
function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}
```

### 10.5 AI Cost Estimation

The current estimation (`1 PA = R$ 0.01`) is a rough heuristic. Document it clearly:

```typescript
// AI cost estimation:
// Based on average token usage per AI call and Anthropic pricing.
// 1 PA of AI spend ~ R$ 0.01 (1 cent BRL)
// This should be refined with actual API cost data from FinOps.
const AI_COST_PER_PA_CENTS = 1;
```

Extract this as a named constant so FinOps can adjust it without code archaeology.

### 10.6 Patterns to AVOID

- **Do NOT** use `$queryRaw` for aggregations. Prisma's `groupBy` and `aggregate` cover all our needs and maintain type safety.
- **Do NOT** cache paginated results. The cache key space explodes with page/sort combinations. Only cache summary metrics.
- **Do NOT** include userId in log messages. Use `hashUserId()` for audit logs.
- **Do NOT** expose the admin cache keys pattern to non-admin code. AdminCacheKeys should only be imported in admin service and cache invalidation hooks.

### 10.7 Prisma groupBy Limitations

Prisma `groupBy` does not support `HAVING` with computed aggregates in all cases. If `having` with `_min` does not work for the new-paying-users query, fall back to:

```typescript
const allPayingUsers = await db.purchase.groupBy({
  by: ["userId"],
  where: { status: "confirmed" },
  _min: { createdAt: true },
});
const newPaying = allPayingUsers.filter(
  u => u._min.createdAt && u._min.createdAt >= thirtyDaysAgo()
);
```

This is safe at MVP scale. Document the limitation for future optimization.

---

## 11. Open Questions

- [ ] OQ-1: Should AI cost estimation use a fixed constant (1 PA = R$0.01) or should we track actual Anthropic API costs? **Recommendation**: Fixed constant for MVP. Track actual costs in a future sprint when FinOps provides real usage data.
- [ ] OQ-2: Should CSV export include all-time data or respect a date range filter? **Recommendation**: All-time for MVP, capped at 10K rows. Add date range filter in next iteration.
- [ ] OQ-3: Should margin alerts trigger email/Slack notifications or just display in dashboard? **Recommendation**: Dashboard only for MVP. Notification integration is a separate feature.

---

## 12. Definition of Done

- [ ] getEnhancedKPIs returns all new metrics (ARPU, conversion, margin%, etc.)
- [ ] getUserSegmentation returns free vs paying breakdown
- [ ] getAIUsageTimeSeries returns daily/weekly/monthly AI usage
- [ ] getRankDistribution returns user count per rank
- [ ] getTopDestinations returns top N destinations
- [ ] getPerUserProfitability returns paginated user profit data
- [ ] getMarginAlerts returns alerts when thresholds are breached
- [ ] CSV export works for all 4 types (users, purchases, ai-usage, profitability)
- [ ] Redis caching (15min TTL) on all non-paginated queries
- [ ] Cache invalidation on purchase confirmation and AI spend
- [ ] AdminCacheKeys added to cache/keys.ts
- [ ] All division-by-zero edge cases handled (0 users, 0 revenue, etc.)
- [ ] Admin 3-layer guard enforced on all new actions
- [ ] No PII (passport, birthdate, booking codes) in any admin response
- [ ] Unit test coverage >= 80% on new code
- [ ] AI cost constant extracted as named constant
- [ ] CSV includes UTF-8 BOM for Excel compatibility

> READY FOR DEVELOPMENT
