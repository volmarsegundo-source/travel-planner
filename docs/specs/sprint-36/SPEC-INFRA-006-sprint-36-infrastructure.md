# SPEC-INFRA-006: Sprint 36 Infrastructure

**Version**: 1.0.0
**Status**: Draft
**Author**: devops-engineer
**Reviewers**: tech-lead, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Baseline**: v0.30.0

---

## 1. Environment Variables

### New Variables

| Variable | Value (Sprint 36) | Required | Description |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `mock` | Yes | Payment provider selection (mock/stripe) |
| `PAYMENT_WEBHOOK_SECRET` | `whsec_mock_dev_secret_xxxxx` | Yes | HMAC key for webhook signature verification |
| `STRIPE_SECRET_KEY` | (empty) | No | Stripe API key — Sprint 37+ |
| `STRIPE_PUBLISHABLE_KEY` | (empty) | No | Stripe publishable key — Sprint 37+ |
| `ADMIN_EMAILS` | `admin@travel.dev` | Yes | Comma-separated admin email list |

### Updated .env.example

All new variables must be added to `.env.example` and `src/lib/env.ts` (t3-oss validation).

---

## 2. Database Migration

### New Migration: `add_purchase_model_and_user_role`

```prisma
model Purchase {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  packageId   String    // explorador, navegador, cartografo, embaixador
  paAmount    Int
  amountCents Int
  currency    String    @default("BRL")
  status      String    // pending, completed, refunded
  paymentRef  String?   @unique
  refundedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

User model addition:
```prisma
model User {
  // ... existing
  role      String @default("user") @db.VarChar(20)
  purchases Purchase[]
}
```

### Migration Type
- **Additive only** — no data loss, no column drops
- **Backward compatible** — v0.30.0 code ignores new table/column
- **Rollback safe** — table can remain unused if rolled back

### Badge Index
- UserBadge already has `@@unique([userId, badgeKey])` — no changes needed

---

## 3. Redis Cache Strategy

| Cache Key Pattern | TTL | Data | Invalidation |
|---|---|---|---|
| `badges:${userId}` | 60s | User's badge list | On badge award |
| `badge-defs` | 3600s | Static badge definitions (16 entries) | On deploy |
| `admin:kpis` | 900s (15min) | Dashboard KPI summary | On purchase/spend |
| `admin:revenue:${period}` | 900s | Revenue time series | On purchase |
| `admin:users:${page}:${sort}` | 300s (5min) | Per-user table page | On purchase/spend |

### Memory Impact
- Badge data: ~500 bytes/user x 1000 users = ~500KB
- Admin cache: ~50KB total (aggregated data)
- **Total Redis delta**: <1MB — negligible for free tier

---

## 4. Webhook Endpoint

### `/api/webhooks/payment` (new)

- **Sprint 36**: Mock provider — immediate callback, HMAC verified
- **Sprint 37**: Stripe webhook — `stripe.webhooks.constructEvent()` signature verification
- Method: POST only
- No auth (webhook from external provider)
- Rate limit: 100/min (to prevent abuse)
- Idempotent: checks paymentRef unique constraint

---

## 5. CI/CD Updates

### Environment Variables in CI
Add to GitHub Actions secrets (for test environment):
- `PAYMENT_PROVIDER=mock`
- `PAYMENT_WEBHOOK_SECRET=whsec_test_xxxxx`
- `ADMIN_EMAILS=admin@test.dev`

### No Pipeline Changes
- Existing test gates (`npm test`, `npm run build`, `npm run lint`) cover new features
- Eval gate (`npm run eval:gate`) runs with new eval datasets
- No new Docker services needed

---

## 6. Monitoring & Alerting

### New Metrics to Track

| Metric | Source | Alert Threshold |
|---|---|---|
| PA purchases/hour | PointTransaction type=purchase | >50/hr (anomaly) |
| Badge awards/hour | UserBadge created | >100/hr (anomaly) |
| Admin API latency | /api/admin/* response time | >2000ms |
| Payment webhook failures | /api/webhooks/payment 5xx | >5/hr |

### Existing Monitoring (unchanged)
- API response times
- Error rates
- Redis memory usage
- DB connection pool

---

## 7. Rollback Plan

### Target: v0.30.0

| Step | Action | Risk |
|---|---|---|
| 1 | Revert to v0.30.0 tag | Zero risk |
| 2 | Purchase table remains in DB | No harm — unused by v0.30.0 code |
| 3 | User.role column remains | No harm — default "user", unused |
| 4 | Badge data generated during v0.31.0 | Lost if badges depend on new engine |
| 5 | PA credited via mock purchases | Already in availablePoints — remains |
| 6 | Redis cache | Auto-expires via TTL |

**Rollback is safe and non-destructive.**

---

## 8. Security Considerations

- Webhook endpoint must verify HMAC signature (even mock)
- Admin env var (`ADMIN_EMAILS`) must not be exposed to client
- Payment env vars validated at startup via `env.ts`
- No new ports, services, or external dependencies

---

## 9. Cost Impact

| Component | Sprint 35 | Sprint 36 | Delta |
|---|---|---|---|
| Infrastructure | $0-5/mo | $0-5/mo | $0 |
| Redis | Free tier | Free tier | $0 |
| CI/CD | Free tier | Free tier | $0 |
| **Total** | | | **$0.00** |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — Sprint 36 infrastructure |
