# Sprint 37 -- Orchestration Plan

**Tema**: Gamification Wave 3 -- Monetization (Stripe) + Admin Dashboard Enhancement
**Versao alvo**: v0.32.0
**Budget**: 50h
**Baseline**: v0.31.0 (2408 unit tests, 122/130 E2E, build clean)
**Branch**: feat/sprint-37-gamification-wave3
**Data**: 2026-03-23

---

## 1. Sprint Goal

Substituir o mock payment provider por integracao real com Stripe (Checkout Sessions + Webhooks) e evoluir o admin dashboard com queries de agregacao reais, filtros por periodo, exportacao CSV, e alertas de margem.

---

## 2. Spec Map

### Focus 1 -- Stripe Payment Integration

| Spec ID | Title | Owner | Status |
|---|---|---|---|
| SPEC-PROD-043 | Stripe Payment Integration | product-owner | Draft |
| SPEC-PROD-045 | Purchase Flow UX Enhancement | product-owner | Draft |
| SPEC-UX-045 | Stripe Purchase Flow UX | ux-designer | Draft |
| SPEC-ARCH-032 | Stripe Payment Architecture | architect | Draft |

### Focus 2 -- Enhanced Admin Dashboard

| Spec ID | Title | Owner | Status |
|---|---|---|---|
| SPEC-PROD-044 | Enhanced Admin Dashboard | product-owner | Draft |
| SPEC-UX-046 | Enhanced Admin Dashboard Layout | ux-designer | Draft |
| SPEC-ARCH-033 | Admin Data Aggregation | architect | Draft |

### Cross-Cutting

| Spec ID | Title | Owner | Status |
|---|---|---|---|
| SPEC-SEC-007 | Payment + Admin Security | security-specialist | Draft |
| SPEC-QA-013 | Test Strategy + Evals | qa-engineer | Draft |
| SPEC-AI-007 | AI Impact (zero) | prompt-engineer | Draft |
| SPEC-INFRA-007 | Stripe Infrastructure | devops-engineer | Draft |
| SPEC-RELEASE-007 | v0.32.0 Release Plan | release-manager | Draft |
| SPEC-COST-007 | Stripe Fees + Margin Impact | finops-engineer | Draft |

**Total: 13 specs**

---

## 3. Existing Foundation (from Sprint 36)

Sprint 37 builds directly on Sprint 36 deliverables:

| Component | Path | What exists | Sprint 37 change |
|---|---|---|---|
| PaymentProvider interface | `src/server/services/payment/payment-provider.interface.ts` | `createIntent`, `confirmIntent`, `verifyWebhookSignature` | Extend for Stripe Checkout Session model |
| MockPaymentProvider | `src/server/services/payment/mock-provider.ts` | Full mock implementation | Keep as test fallback |
| Provider factory | `src/server/services/payment/index.ts` | Returns MockPaymentProvider always | Switch on `PAYMENT_PROVIDER` env var |
| AdminDashboardService | `src/server/services/admin-dashboard.service.ts` | `getKPIs`, `getRevenueTimeSeries`, `getUserMetrics` | Add period filters, ARPU, conversion rate, CSV export, margin alerts |
| Purchase model | Prisma schema | Purchase with `amountCents`, `status` | Add `stripeSessionId`, `stripePaymentIntentId` fields |
| User.role | Prisma schema | `role` field on User | Already exists from Sprint 36 |

### Interface Compatibility Note

The existing `PaymentProvider` interface uses `createIntent`/`confirmIntent` which maps to Stripe's PaymentIntent flow. However, SPEC-ARCH-032 specifies **Stripe Checkout Sessions** (redirect-based). The interface MUST be extended (not replaced) to support both patterns:

```
PaymentProvider (existing)
  createIntent() -- kept for MockProvider compatibility
  confirmIntent() -- kept for MockProvider compatibility
  verifyWebhookSignature() -- reused by Stripe

StripePaymentProvider (new, extends PaymentProvider)
  createCheckoutSession() -- Stripe-specific redirect flow
  retrieveSession() -- check session status
```

This preserves backward compatibility and allows the factory to return either provider based on env config.

---

## 4. Track Breakdown

### Track 1 -- dev-fullstack-1: Stripe Payment (25h)

| # | Task | Est. | Spec | Depends On |
|---|---|---|---|---|
| T1.1 | Install `stripe` npm package + env vars setup | 0.5h | ARCH-032 | -- |
| T1.2 | Prisma migration: add `stripeSessionId`, `stripePaymentIntentId` to Purchase | 1h | ARCH-032 | -- |
| T1.3 | Create `StripePaymentProvider` implementing `PaymentProvider` | 3h | ARCH-032 | T1.1 |
| T1.4 | Update provider factory to switch on `PAYMENT_PROVIDER` env var | 0.5h | ARCH-032 | T1.3 |
| T1.5 | API route: POST `/api/checkout/create-session` | 2h | ARCH-032, SEC-007 | T1.3, T1.2 |
| T1.6 | API route: POST `/api/webhooks/stripe` (signature verification) | 3h | ARCH-032, SEC-007 | T1.3 |
| T1.7 | API route: GET `/api/checkout/session-status` | 1h | ARCH-032 | T1.3 |
| T1.8 | Update `purchase.actions.ts` to use Stripe provider | 2h | PROD-043, ARCH-032 | T1.4, T1.5 |
| T1.9 | Update `/meu-atlas/comprar-pa` page (Stripe Checkout redirect) | 3h | PROD-045, UX-045 | T1.5, T1.8 |
| T1.10 | Success + cancel return pages (`/checkout/success`, `/checkout/cancel`) | 2h | UX-045 | T1.7 |
| T1.11 | Unit tests: StripePaymentProvider, webhook handler, actions | 4h | QA-013 | T1.3-T1.10 |
| T1.12 | E2E tests: purchase flow with Stripe test mode (3 scenarios) | 3h | QA-013 | T1.11 |

### Track 2 -- dev-fullstack-2: Enhanced Admin Dashboard (25h)

| # | Task | Est. | Spec | Depends On |
|---|---|---|---|---|
| T2.1 | Add period filter to `getKPIs` (7d/30d/90d/1y/custom date range) | 2h | ARCH-033 | -- |
| T2.2 | New queries: free vs paying users count, ARPU, conversion rate | 2h | ARCH-033 | -- |
| T2.3 | New queries: AI calls per period, user level distribution, top destinations | 3h | ARCH-033 | -- |
| T2.4 | Per-user profit calculation (revenue - estimated AI cost per user) | 2h | ARCH-033 | T2.2 |
| T2.5 | CSV export server action (KPIs + user metrics) | 2h | PROD-044 | T2.1-T2.4 |
| T2.6 | Margin alerts engine (yellow <80%, red <50%) | 2h | PROD-044, ARCH-033 | T2.1 |
| T2.7 | Enhanced `AdminDashboardClient` -- period filter dropdown + date range picker | 3h | UX-046 | T2.1 |
| T2.8 | Revenue + margin chart (time series with alert zones) | 2h | UX-046 | T2.7, T2.6 |
| T2.9 | User distribution cards (free/paying, level breakdown, top destinations) | 2h | UX-046 | T2.2, T2.3 |
| T2.10 | Unit tests: aggregation queries, CSV export, margin alerts | 3h | QA-013 | T2.1-T2.6 |
| T2.11 | E2E tests: admin access + data display + CSV download (3 scenarios) | 2h | QA-013 | T2.7-T2.9 |

---

## 5. Dependencies Between Tracks

```
Track 1 (Stripe)             Track 2 (Admin Dashboard)
     |                              |
     |  T1.2 (migration) ---------> T2.4 (per-user profit needs Purchase.stripePaymentIntentId)
     |                              |     (SOFT dependency -- T2.4 works with existing Purchase data)
     |                              |
     v                              v
  Both tracks are LARGELY INDEPENDENT.
  T1.2 migration should run first (Day 1) as Track 2 benefits from new Purchase fields.
  Admin dashboard already queries Purchase table -- no breaking changes.
```

### Cross-Track Integration Points

1. **Prisma migration** (T1.2): Additive columns only -- no breaking change for Track 2
2. **Purchase data**: Admin dashboard reads Purchase table that Track 1 writes to -- read-only dependency, no coordination needed
3. **Admin can see Stripe purchases**: After T1.8 ships, admin dashboard will show real Stripe purchase data automatically

---

## 6. Definition of Ready (DoR)

- [ ] All 13 specs approved by tech-lead
- [ ] SPEC-SEC-007 CRITICAL items reviewed: Stripe webhook signature verification, PCI-DSS scope, secret key storage
- [ ] SPEC-ARCH-032 approved: PaymentProvider interface extension strategy confirmed
- [ ] Stripe test-mode API keys provisioned and documented in `.env.example`
- [ ] Branch `feat/sprint-37-gamification-wave3` created from `master`
- [ ] Eval datasets created (SPEC-QA-013)
- [ ] No open questions

---

## 7. Definition of Done (DoD)

- [ ] All tasks completed per track (12 + 11 = 23 tasks)
- [ ] Unit tests: +60 minimum (target ~2468)
- [ ] E2E tests: +6 minimum (target ~128)
- [ ] Build clean (`npm run build`)
- [ ] Lint clean (`npm run lint`)
- [ ] Eval gate passes (trust >= 0.85)
- [ ] Security checklist completed (SPEC-SEC-007)
  - [ ] Stripe webhook signature verified with `stripe.webhooks.constructEvent()`
  - [ ] No Stripe secret key in client-side code
  - [ ] STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in env vars only
  - [ ] Admin routes protected by 3-layer guard (middleware, layout, action)
  - [ ] CSV export sanitized against formula injection
  - [ ] No PII exposed in CSV beyond what admin already sees
- [ ] i18n: all new keys in en.json + pt-BR.json
- [ ] Sprint review document committed
- [ ] Tag v0.32.0 created
- [ ] CHANGELOG.md updated

---

## 8. Risk Register

| ID | Risk | Prob | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Stripe SDK version conflict with Next.js 15 | Low | High | Pin to latest stable; test build early (Day 1) | dev-fullstack-1 |
| R2 | Webhook signature verification fails in dev (no HTTPS) | Med | Med | Use Stripe CLI `stripe listen --forward-to` for local testing | dev-fullstack-1 |
| R3 | PaymentProvider interface extension breaks MockProvider | Low | Med | Keep interface backward-compatible; add optional methods | dev-fullstack-1 |
| R4 | Admin aggregation queries slow on large dataset | Low | Med | Add DB indexes; limit default period to 30d | dev-fullstack-2 |
| R5 | CSV formula injection via user names/emails | Med | High | Prefix cells with `'` or use csv-stringify with escaping | dev-fullstack-2 |
| R6 | Stripe test mode webhooks unreliable in CI | Med | Med | Mock webhook payload in unit tests; Stripe CLI in local E2E | tech-lead |
| R7 | Budget overrun (50h) | Med | Med | Cut chart animations (P2) and custom date range (P2) | tech-lead |
| R8 | PCI-DSS scope creep -- handling card data | Low | Critical | Stripe Checkout redirect = card data never touches our server | security-specialist |

---

## 9. Timeline

| Day | Track 1 (Stripe) | Track 2 (Admin) | Cross-cutting |
|---|---|---|---|
| 1 | T1.1-T1.2 (install + migration) | T2.1-T2.2 (period filter + new queries) | Spec review + approval |
| 2 | T1.3-T1.4 (provider + factory) | T2.3-T2.4 (AI calls + per-user profit) | -- |
| 3 | T1.5-T1.6 (checkout + webhook APIs) | T2.5-T2.6 (CSV export + margin alerts) | Security review (webhook) |
| 4 | T1.7-T1.8 (session status + actions) | T2.7-T2.8 (UI: filter + charts) | -- |
| 5 | T1.9-T1.10 (purchase page + return pages) | T2.9 (UI: distribution cards) | -- |
| 6 | T1.11 (unit tests) | T2.10 (unit tests) | Eval gate check |
| 7 | T1.12 (E2E tests) | T2.11 (E2E tests) | Sprint review, tag |

---

## 10. Eval Gates

| Gate | Dataset | Scenarios | Target |
|---|---|---|---|
| PR | stripe-checkout-flow | 12 | >= 0.80 |
| PR | webhook-signature-verification | 8 | >= 0.80 |
| PR | admin-period-filter | 10 | >= 0.80 |
| PR | admin-csv-export | 6 | >= 0.80 |
| Staging | All 4 datasets | 36 | >= 0.85 |

---

## 11. Security-Critical Items (SPEC-SEC-007)

These items require explicit sign-off from security-specialist before merge:

| ID | Item | Track | Why |
|---|---|---|---|
| SEC-037-001 | Stripe webhook signature verification via `stripe.webhooks.constructEvent()` | Track 1 | Prevents forged webhook attacks |
| SEC-037-002 | `STRIPE_SECRET_KEY` never imported in client components | Track 1 | PCI-DSS: secret key exposure = incident |
| SEC-037-003 | Idempotency on webhook handler (deduplicate by event ID) | Track 1 | Prevents double-crediting PA on retry |
| SEC-037-004 | `STRIPE_WEBHOOK_SECRET` in env vars, NOT in code | Track 1 | Standard secret management |
| SEC-037-005 | Checkout session creation validates package exists server-side | Track 1 | Prevents price manipulation |
| SEC-037-006 | CSV export: formula injection prevention | Track 2 | Prevents XSS via spreadsheet |
| SEC-037-007 | Admin routes: 3-layer guard verified (middleware + layout + action) | Track 2 | Already exists from Sprint 36; verify not regressed |
| SEC-037-008 | No raw SQL in aggregation queries -- Prisma only | Track 2 | SQL injection prevention |

---

## 12. Environment Variables (new)

| Variable | Description | Required |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_... / sk_live_...) | Yes (when PAYMENT_PROVIDER=stripe) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_test_... / pk_live_...) | Yes (client-side) |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (whsec_...) | Yes |
| `PAYMENT_PROVIDER` | `mock` or `stripe` (default: `mock`) | No |

These MUST be added to `.env.example` and `src/lib/env.ts` (with Zod validation).

---

## 13. Rollback Plan

If Stripe integration causes issues in staging:

1. Set `PAYMENT_PROVIDER=mock` to instantly revert to mock provider
2. Admin dashboard changes are read-only -- no rollback needed
3. Migration is additive (new nullable columns) -- no down migration required
