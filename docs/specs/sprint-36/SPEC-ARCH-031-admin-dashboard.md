# SPEC-ARCH-031: Admin Dashboard Data Aggregation

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: tech-lead, security-specialist, data-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**References**: SPEC-PROD-042, SPEC-UX-044, SPEC-SEC-006

---

## 1. Problem Statement

Atlas needs operational visibility into the PA economy: revenue, AI costs, margins, user engagement. An admin-only dashboard provides these metrics for business decision-making.

---

## 2. System Design

### 2.1 Component Architecture

```
src/
  app/[locale]/(app)/admin/
    layout.tsx                    # Admin guard (auth + role check)
    dashboard/
      page.tsx                    # Server Component — fetches KPIs
  server/services/
    admin-dashboard.service.ts    # Data aggregation queries
  server/actions/
    admin.actions.ts              # Admin server actions
```

### 2.2 Admin Guard (Defense in Depth)

Per SPEC-SEC-006 SEC-036-013:

**Layer 1 — Middleware** (`src/middleware.ts`):
```typescript
if (pathname.startsWith("/admin")) {
  if (token?.role !== "admin") {
    return NextResponse.redirect(new URL("/expeditions", req.url));
  }
}
```

**Layer 2 — Layout** (`admin/layout.tsx`):
```typescript
const session = await auth();
if (session?.user?.role !== "admin") redirect("/expeditions");
```

**Layer 3 — Server Actions**:
```typescript
function assertAdmin(session: Session) {
  if (session?.user?.role !== "admin") throw new ForbiddenError();
}
```

---

## 3. Data Aggregation Service

```typescript
// src/server/services/admin-dashboard.service.ts
import "server-only";

export interface DashboardKPIs {
  totalRevenueCents: number;      // SUM(Purchase.amountCents) WHERE completed
  totalAICostEstimate: number;    // Estimated from PointTransaction ai_usage
  netMarginCents: number;         // revenue - AI cost
  activeUsers30d: number;         // DISTINCT users with activity in 30d
  paInCirculation: number;        // SUM(UserProgress.availablePoints)
  totalPurchases: number;         // COUNT(Purchase) WHERE completed
}

export interface RevenueDataPoint {
  date: string;                   // ISO date
  revenueCents: number;
  purchaseCount: number;
}

export interface UserMetrics {
  userId: string;                 // last 6 chars only (SEC-036-016)
  email: string;
  name: string | null;
  availablePoints: number;
  totalPoints: number;
  currentRank: string;
  badgeCount: number;
  tripCount: number;
  totalPurchasedCents: number;
  totalAISpendPA: number;
  estimatedAICost: number;
  margin: number;
  createdAt: Date;
}
```

### Key Queries

**Revenue**:
```sql
SELECT DATE_TRUNC('day', "createdAt") as date,
       SUM("amountCents") as revenue,
       COUNT(*) as count
FROM "Purchase"
WHERE "status" = 'completed'
  AND "createdAt" BETWEEN $1 AND $2
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY date;
```

**AI Cost Estimation**:
```sql
SELECT SUM(ABS("amount")) as total_pa_spent
FROM "PointTransaction"
WHERE "type" = 'ai_usage'
  AND "createdAt" BETWEEN $1 AND $2;
-- Multiply by COST_PER_PA env var
```

**Per-User**:
```sql
SELECT u.id, u.email, u.name,
       up."availablePoints", up."totalPoints", up."currentRank",
       (SELECT COUNT(*) FROM "UserBadge" ub WHERE ub."userId" = u.id) as "badgeCount",
       (SELECT COUNT(*) FROM "Trip" t WHERE t."userId" = u.id) as "tripCount",
       COALESCE((SELECT SUM("amountCents") FROM "Purchase" p WHERE p."userId" = u.id AND p."status" = 'completed'), 0) as "totalPurchased",
       COALESCE((SELECT SUM(ABS("amount")) FROM "PointTransaction" pt WHERE pt."userId" = u.id AND pt."type" = 'ai_usage'), 0) as "totalAISpend"
FROM "User" u
LEFT JOIN "UserProgress" up ON up."userId" = u.id
ORDER BY "totalPurchased" DESC
LIMIT $1 OFFSET $2;
```

---

## 4. API Routes

### GET /api/admin/dashboard/kpis
Returns KPI summary. Cached 15min in Redis.

### GET /api/admin/dashboard/revenue?period=daily|weekly|monthly&from=&to=
Returns revenue time series. Cached 15min.

### GET /api/admin/dashboard/users?search=&sort=revenue|points|rank&page=&pageSize=
Returns per-user table. Cached 5min. Paginated.

All routes: admin role required, Zod-validated params, `Cache-Control: no-store`.

---

## 5. Cost-per-PA Configuration

```
COST_PER_PA_BRL=0.004  # R$0.004 per PA (derived from Anthropic pricing)
```

Used to estimate AI cost from PA spend: `aiCost = totalPASpent * COST_PER_PA_BRL`

---

## 6. Redis Cache

| Key | TTL | Data |
|---|---|---|
| `admin:kpis` | 900s | KPI summary JSON |
| `admin:revenue:${period}:${from}:${to}` | 900s | Revenue time series |
| `admin:users:${page}:${sort}` | 300s | User table page |

Invalidation: on purchase completion or PA spend event.

---

## 7. Performance

- Heavy aggregation queries → Redis cache essential
- User table: paginated (max 100 per page)
- Revenue chart: pre-aggregated by period (day/week/month)
- No full table scans: all queries use indexes + LIMIT
- Rate limit: 30 req/min per admin (SEC-036-019)

---

## 8. Security

- No PII beyond email in admin views (SEC-036-016)
- userId displayed as last 6 characters only
- All mutations logged with hashed admin ID (SEC-036-015)
- Cache-Control: no-store on all responses (SEC-036-017)
- Zod validation on all query params (SEC-036-018)

---

## 9. Testing Strategy

| Test | Count |
|---|---|
| Admin guard: non-admin rejected at each layer | 3 |
| KPI calculation accuracy | 4 |
| Revenue aggregation: daily/weekly/monthly | 3 |
| Per-user table: search, sort, pagination | 4 |
| Empty state: no purchases/no users | 2 |
| Cache: TTL, invalidation | 2 |
| **Total** | **~18** |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — admin dashboard data aggregation |
