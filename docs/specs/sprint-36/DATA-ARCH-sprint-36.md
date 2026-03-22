# DATA-ARCH: Sprint 36 Data Architecture Assessment

**Version**: 1.0.0
**Status**: Draft
**Author**: data-engineer
**Reviewers**: tech-lead, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36

---

## 1. Key Findings

1. **No schema migration needed for badges.** Existing `UserBadge` model covers 100% of Wave 2 requirements. `@@unique([userId, badgeKey])` provides idempotency.

2. **Purchase model is additive.** New table, no impact on existing data.

3. **Badge progress calculated at runtime**, not stored — avoids stale data.

4. **Do NOT use PointTransaction for badge tracking.** Badges don't involve point changes. `UserBadge.earnedAt` is the authoritative record.

5. **Existing indexes are sufficient** for badge queries. The compound index `[userId, createdAt]` on PointTransaction covers paginated history.

---

## 2. Data Model Changes

### 2.1 Purchase Model (NEW)

```prisma
model Purchase {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  packageId   String
  paAmount    Int
  amountCents Int
  currency    String    @default("BRL")
  status      String    // pending | completed | refunded
  paymentRef  String?   @unique
  refundedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

### 2.2 User.role (NEW column)

```prisma
role String @default("user") @db.VarChar(20)
```

### 2.3 UserBadge (EXISTING — no changes)

Already has: id, userId, badgeKey, earnedAt, @@unique([userId, badgeKey]), @@index([userId])

---

## 3. Migration Strategy

- Single migration: `add_purchase_model_and_user_role`
- Type: additive only (CREATE TABLE + ALTER TABLE ADD COLUMN)
- Data migration: none needed
- Backward compatible: v0.30.0 code ignores new table/column
- Estimated execution: <1s on dev/staging databases

---

## 4. Index Recommendations

### Existing (sufficient)
- `UserBadge`: @@unique([userId, badgeKey]), @@index([userId])
- `PointTransaction`: @@index([userId]), @@index([userId, createdAt])
- `UserProgress`: @@unique([userId])

### New (Purchase table)
- `@@index([userId])` — user purchase history
- `@@index([status])` — filter completed purchases
- `@@index([createdAt])` — revenue time series
- `@@unique([paymentRef])` — idempotency constraint

### Future (Sprint 37+, if needed)
- `@@index([userId, createdAt])` on Purchase for per-user time series
- Partial index on `PointTransaction` WHERE type='ai_usage' for cost queries

---

## 5. Event Tracking Schema

### P0 Events (required for badges + admin)

| Event | Properties | Trigger |
|---|---|---|
| `badge_unlocked` | badgeKey, userId (hashed), category | badge-engine.awardBadge() |
| `rank_changed` | oldRank, newRank, userId (hashed) | PhaseEngine on rank promotion |

### P1 Events (analytics)

| Event | Properties | Trigger |
|---|---|---|
| `badge_grid_viewed` | userId (hashed), badgeCount, unlockedCount | Meu Atlas page load |
| `transaction_history_viewed` | userId (hashed), page | Transaction history page |
| `wizard_footer_save` | phase, step, userId (hashed) | WizardFooter save button |
| `wizard_footer_discard` | phase, step, userId (hashed) | WizardFooter discard confirm |
| `pa_package_viewed` | packageId | Package page load |
| `pa_package_selected` | packageId, priceDisplay | Package selection |

---

## 6. Analytics Queries for Admin Dashboard

### Revenue by Period
```sql
SELECT DATE_TRUNC($period, "createdAt") as period,
       SUM("amountCents") as revenue_cents,
       COUNT(*) as purchase_count
FROM "Purchase"
WHERE status = 'completed'
GROUP BY 1 ORDER BY 1;
```

### PA Economy Health
```sql
-- Earning rate
SELECT SUM(amount) as total_earned
FROM "PointTransaction"
WHERE type IN ('phase_complete', 'daily_login', 'profile_completion', 'purchase')
  AND "createdAt" > NOW() - INTERVAL '30 days';

-- Spending rate
SELECT SUM(ABS(amount)) as total_spent
FROM "PointTransaction"
WHERE type = 'ai_usage'
  AND "createdAt" > NOW() - INTERVAL '30 days';
```

### Top Users by Revenue
```sql
SELECT u.email, SUM(p."amountCents") as total_revenue
FROM "Purchase" p
JOIN "User" u ON p."userId" = u.id
WHERE p.status = 'completed'
GROUP BY u.id, u.email
ORDER BY total_revenue DESC
LIMIT 10;
```

---

## 7. Data Retention & LGPD

| Data | Retention | On Account Deletion |
|---|---|---|
| UserBadge | Indefinite (while account exists) | CASCADE delete |
| PointTransaction | Indefinite | Anonymize userId (hash), retain for audit |
| Purchase | Indefinite | Anonymize userId, retain for accounting/tax |
| UserProgress | Indefinite | CASCADE delete |
| Admin audit logs | 2 years | Retain (hashed IDs) |

**LGPD Data Export** must include: badges, transaction history, purchase history, PA balance.

---

## 8. Redis Cache Strategy

| Cache | Key Pattern | TTL | Size per User |
|---|---|---|---|
| Badge list | `badges:${userId}` | 60s | ~500 bytes |
| Badge definitions | `badge-defs` | 3600s | ~2KB (shared) |
| Transaction page 1 | `tx-history:${userId}:1` | 30s | ~1KB |
| Admin KPIs | `admin:kpis` | 900s | ~200 bytes |
| Admin revenue | `admin:revenue:*` | 900s | ~5KB |

**Total footprint**: ~5.6MB for 1000 active users. Well within free tier.

---

## 9. Recommendations

1. **Sprint 36**: Implement Purchase model as defined. Badge system uses existing UserBadge.
2. **Sprint 37**: When Stripe activates, add `stripeSessionId` column to Purchase.
3. **Sprint 38**: Consider materialized views for admin aggregations if query times exceed 2s.
4. **Ongoing**: Monitor PA earning/spending ratio — if >95% organic, adjust earning rates.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — Sprint 36 data architecture |
