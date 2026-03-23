# Sprint 37 -- Task Checklist

**Budget**: 50h | **Estimated**: 47h | **Buffer**: 3h

---

## Track 1 -- Stripe Payment Integration (dev-fullstack-1) -- 25h

### Setup (1.5h)

- [ ] **T1.1** (0.5h) Install `stripe` npm package; add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_PROVIDER` to `.env.example` and `src/lib/env.ts` with Zod validation [SPEC-ARCH-032]
  - Acceptance: `npm run build` passes; env vars validated at startup; missing Stripe vars only error when `PAYMENT_PROVIDER=stripe`
  - License check: `stripe` package uses MIT -- APPROVED

- [ ] **T1.2** (1h) Prisma migration: add `stripeSessionId String?` and `stripePaymentIntentId String?` to Purchase model; add index on `stripeSessionId` [SPEC-ARCH-032]
  - Depends on: --
  - Acceptance: `npx prisma migrate dev` succeeds; existing Purchase rows unaffected; new fields nullable

### Provider Implementation (3.5h)

- [ ] **T1.3** (3h) Create `StripePaymentProvider` at `src/server/services/payment/stripe-provider.ts` implementing `PaymentProvider` interface [SPEC-ARCH-032]
  - Depends on: T1.1
  - Implementation notes:
    - `createIntent()` -> creates Stripe Checkout Session (mode: payment), returns session ID as `intentId`, session URL as `clientToken`
    - `confirmIntent()` -> retrieves session via `stripe.checkout.sessions.retrieve()`, maps status
    - `verifyWebhookSignature()` -> uses `stripe.webhooks.constructEvent()` with raw body
    - Import `stripe` from env-validated key; use `"server-only"` import guard
  - Acceptance: Provider instantiates with valid Stripe key; methods return correct types; `"server-only"` enforced

- [ ] **T1.4** (0.5h) Update `src/server/services/payment/index.ts` factory to return `StripePaymentProvider` when `PAYMENT_PROVIDER=stripe`, `MockPaymentProvider` otherwise (default: mock) [SPEC-ARCH-032]
  - Depends on: T1.3
  - Acceptance: Factory returns correct provider based on env var; `MockPaymentProvider` remains default

### API Routes (6h)

- [ ] **T1.5** (2h) API route: POST `/api/checkout/create-session` [SPEC-ARCH-032, SPEC-SEC-007 SEC-037-005]
  - Depends on: T1.3, T1.2
  - Auth: session required; validate user owns the purchase intent
  - Input: `{ packageId: string }` -- validate package exists server-side (no client-supplied price)
  - Output: `{ sessionUrl: string, sessionId: string }`
  - Creates Purchase record with `status: "pending"`, `stripeSessionId`
  - Acceptance: Authenticated request creates Checkout Session; unauthenticated returns 401; invalid package returns 400

- [ ] **T1.6** (3h) API route: POST `/api/webhooks/stripe` [SPEC-ARCH-032, SPEC-SEC-007 SEC-037-001/003/004]
  - Depends on: T1.3
  - Implementation:
    - Verify signature with `stripe.webhooks.constructEvent()` using raw body
    - Handle `checkout.session.completed` event: update Purchase status, credit PA to user
    - Idempotency: check if event ID already processed (store `stripeEventId` or check Purchase status)
    - Handle `checkout.session.expired`: update Purchase status to "failed"
  - CRITICAL: Must use raw body (not parsed JSON) for signature verification
  - CRITICAL: Next.js App Router -- export `const runtime = "nodejs"` and disable body parsing
  - Acceptance: Valid webhook updates Purchase + credits PA; invalid signature returns 400; duplicate event is idempotent (no double credit)

- [ ] **T1.7** (1h) API route: GET `/api/checkout/session-status` [SPEC-ARCH-032]
  - Depends on: T1.3
  - Auth: session required
  - Input: `?sessionId=cs_xxx`
  - Output: `{ status: "pending" | "confirmed" | "failed" | "expired", purchaseId?: string }`
  - Acceptance: Returns correct status for valid session; 401 for unauthenticated; 404 for unknown session

### Integration (5h)

- [ ] **T1.8** (2h) Update `purchase.actions.ts` to use Stripe provider instead of mock [SPEC-PROD-043, SPEC-ARCH-032]
  - Depends on: T1.4, T1.5
  - Replace direct `confirmIntent` call with Checkout Session redirect flow
  - Purchase confirmation now happens via webhook (T1.6), not client-side action
  - Keep mock path for `PAYMENT_PROVIDER=mock` (feature flag)
  - Acceptance: `createPurchaseAction` returns Stripe Checkout URL when provider is Stripe; mock flow unchanged

- [ ] **T1.9** (3h) Update `/meu-atlas/comprar-pa` page for Stripe Checkout redirect [SPEC-PROD-045, SPEC-UX-045]
  - Depends on: T1.5, T1.8
  - Flow: user selects package -> click "Comprar" -> server creates session -> redirect to Stripe Checkout
  - Show loading state during redirect
  - Handle edge case: user returns without completing (show "Pagamento pendente" state)
  - i18n: add keys for Stripe-specific messaging (pt-BR + en)
  - Acceptance: Clicking purchase redirects to Stripe Checkout; back button returns to package selection; loading state visible during redirect

- [ ] **T1.10** (2h) Success + cancel return pages [SPEC-UX-045]
  - Depends on: T1.7
  - `/checkout/success` -- polls session status, shows confirmation when confirmed, redirects to Meu Atlas after 5s
  - `/checkout/cancel` -- shows "Pagamento cancelado" with link back to purchase page
  - i18n: add keys for success/cancel messaging
  - Acceptance: Success page shows PA credited amount; cancel page has clear CTA to retry; both pages accessible only when session exists

### Testing (7h)

- [ ] **T1.11** (4h) Unit tests [SPEC-QA-013]
  - Depends on: T1.3-T1.10
  - Tests for:
    - `StripePaymentProvider`: createIntent, confirmIntent, verifyWebhookSignature (mock Stripe SDK) -- 12 tests
    - Webhook route: valid/invalid signature, checkout.session.completed, idempotency, expired -- 10 tests
    - Checkout create-session route: auth, valid/invalid package, Purchase creation -- 8 tests
    - Session-status route: auth, valid/invalid session, status mapping -- 5 tests
    - Updated purchase.actions.ts: Stripe path + mock path -- 5 tests
  - Target: 40 tests
  - Acceptance: All 40 tests pass; coverage >= 80% on provider, routes, and actions

- [ ] **T1.12** (3h) E2E tests: Stripe test mode [SPEC-QA-013]
  - Depends on: T1.11
  - Scenarios:
    1. Complete purchase flow: select package -> Stripe Checkout -> webhook -> PA credited
    2. Cancel flow: select package -> Stripe Checkout -> cancel -> return to purchase page
    3. Session status polling: verify success page shows correct PA amount
  - NOTE: E2E with real Stripe requires `PAYMENT_PROVIDER=stripe` + test keys; mock fallback for CI
  - Acceptance: All 3 scenarios pass in Stripe test mode; CI runs with mock provider as fallback

---

## Track 2 -- Enhanced Admin Dashboard (dev-fullstack-2) -- 22h

### Backend Aggregation (11h)

- [ ] **T2.1** (2h) Add period filter parameter to `getKPIs()` and `getRevenueTimeSeries()` in `admin-dashboard.service.ts` [SPEC-ARCH-033]
  - Depends on: --
  - Add `period` param: `"7d" | "30d" | "90d" | "1y" | { from: Date, to: Date }`
  - Apply date filter to all aggregate queries
  - Default: 30d (current behavior preserved)
  - Acceptance: `getKPIs({ period: "7d" })` returns data filtered to last 7 days; existing calls without period unchanged

- [ ] **T2.2** (2h) New aggregation queries: free vs paying users, ARPU, conversion rate [SPEC-ARCH-033]
  - Depends on: --
  - `getFreeVsPayingUsers(period)` -- count users with/without confirmed purchases
  - `getARPU(period)` -- total revenue / paying users
  - `getConversionRate(period)` -- paying users / total active users
  - Add to `DashboardKPIs` interface or create new `DashboardInsights` type
  - Acceptance: Queries return correct counts; ARPU returns 0 when no paying users (no division by zero)

- [ ] **T2.3** (3h) New queries: AI calls per period, user level distribution, top destinations [SPEC-ARCH-033]
  - Depends on: --
  - `getAiCallsPerPeriod(period)` -- count PointTransactions with type "ai_usage" grouped by day
  - `getUserLevelDistribution()` -- count users per rank (novato, explorador, aventureiro, etc.)
  - `getTopDestinations(limit, period)` -- most frequent trip destinations
  - Acceptance: All queries return expected shape; empty data returns empty arrays (not errors)

- [ ] **T2.4** (2h) Per-user profit calculation: revenue minus estimated AI cost per user [SPEC-ARCH-033]
  - Depends on: T2.2
  - Extend `UserMetricRow` with `estimatedAiCostCents` and `profitCents`
  - Calculate from Purchase sum - (PointTransaction ai_usage sum * cost-per-PA estimate)
  - Acceptance: Per-user profit displayed correctly; users with no purchases show 0 profit (not negative)

- [ ] **T2.5** (2h) CSV export server action [SPEC-PROD-044, SPEC-SEC-007 SEC-037-006]
  - Depends on: T2.1-T2.4
  - Server action: `exportAdminCSVAction(period, type: "kpis" | "users")`
  - Returns CSV string with proper escaping
  - SECURITY: Prefix all text cells with single-quote to prevent formula injection (`=`, `+`, `-`, `@`)
  - Acceptance: CSV downloads correctly in browser; formula injection test passes (cell starting with `=` is escaped)

- [ ] **T2.6** (2h) Margin alerts engine [SPEC-PROD-044, SPEC-ARCH-033]
  - Depends on: T2.1
  - Calculate margin percentage: `(revenue - aiCost) / revenue * 100`
  - Thresholds: green >= 80%, yellow 50-79%, red < 50%
  - Return alert level + message with current KPIs
  - Acceptance: Alert returns correct level for each threshold; edge cases (0 revenue) handled gracefully

### Frontend (7h)

- [ ] **T2.7** (3h) Enhanced `AdminDashboardClient`: period filter dropdown + date range picker [SPEC-UX-046]
  - Depends on: T2.1
  - Dropdown with presets: 7d, 30d, 90d, 1y
  - Custom date range: two date inputs (from/to) with validation (from < to, max 1 year range)
  - Filter change triggers re-fetch of all dashboard data
  - i18n: add keys for period labels and date picker
  - Acceptance: Selecting period updates all dashboard cards; custom range validates correctly; loading state shown during fetch

- [ ] **T2.8** (2h) Revenue + margin chart with alert zones [SPEC-UX-046]
  - Depends on: T2.7, T2.6
  - Time series line chart (revenue over time)
  - Margin indicator bar with color coding (green/yellow/red)
  - Alert banner when margin < 80%: yellow warning; < 50%: red critical
  - Acceptance: Chart renders with correct data; alert banner appears at correct thresholds; responsive on mobile

- [ ] **T2.9** (2h) User distribution cards: free/paying breakdown, level distribution, top destinations [SPEC-UX-046]
  - Depends on: T2.2, T2.3
  - Card 1: Free vs Paying pie/donut with ARPU + conversion rate
  - Card 2: Level distribution bar chart
  - Card 3: Top 10 destinations list
  - Acceptance: Cards render with correct data; empty state handled; responsive layout

### Testing (5h)

- [ ] **T2.10** (3h) Unit tests [SPEC-QA-013]
  - Depends on: T2.1-T2.6
  - Tests for:
    - Period-filtered `getKPIs` and `getRevenueTimeSeries` -- 8 tests
    - Free vs paying, ARPU, conversion rate queries -- 8 tests
    - AI calls, level distribution, top destinations -- 8 tests
    - Per-user profit calculation -- 5 tests
    - CSV export + formula injection prevention -- 6 tests
    - Margin alerts (green/yellow/red + edge cases) -- 5 tests
  - Target: 40 tests
  - Acceptance: All 40 tests pass; coverage >= 80% on service and actions

- [ ] **T2.11** (2h) E2E tests [SPEC-QA-013]
  - Depends on: T2.7-T2.9
  - Scenarios:
    1. Admin loads dashboard, changes period filter, verifies data updates
    2. Admin clicks CSV export, verifies file downloads
    3. Non-admin user cannot access admin routes (redirected)
  - Acceptance: All 3 scenarios pass; admin guard E2E confirms 3-layer defense

---

## Cross-Cutting -- 3h (included in buffer)

- [ ] **TC.1** (1h) Spec review + approval -- tech-lead
- [ ] **TC.2** (0.5h) Security audit of PRs -- security-specialist (focus: SEC-037-001 through SEC-037-008)
- [ ] **TC.3** (0.5h) Eval gate validation -- qa-engineer
- [ ] **TC.4** (--) i18n: add all new keys to en.json + pt-BR.json -- dev-fullstack-1 + dev-fullstack-2
  - Stripe: purchase page messaging, success/cancel pages, loading states
  - Admin: period labels, chart labels, alert messages, CSV export button

---

## Release

- [ ] **TR.1** Tag v0.32.0
- [ ] **TR.2** Sprint 37 review document -> `docs/sprint-reviews/SPRINT-037-review.md`
- [ ] **TR.3** Update CHANGELOG.md
- [ ] **TR.4** Update package.json version

---

## Summary

| Track | Tasks | Hours |
|---|---|---|
| Track 1 (Stripe) | 12 | 25h |
| Track 2 (Admin) | 11 | 22h |
| Cross-cutting | 4 | ~2h |
| **Total** | **27** | **47h** |
| **Buffer** | | **3h** |
| **Budget** | | **50h** |

---

## Dependency Map

```
Track 1 (Stripe)                           Track 2 (Admin Dashboard)

T1.1 (install)                             T2.1 (period filter)
  |                                          |
T1.2 (migration) ----+                    T2.2 (free/paying, ARPU)    T2.3 (AI calls, levels, destinations)
  |                   |                      |                           |
T1.3 (provider)       |                   T2.4 (per-user profit)        |
  |                   |                      |                           |
T1.4 (factory)        |                   T2.5 (CSV export) <----------+------ T2.1
  |                   |                      |
T1.5 (create-session)-+                   T2.6 (margin alerts)
  |                                          |
T1.6 (webhook)                            T2.7 (UI: period filter) <-- T2.1
  |                                          |
T1.7 (session-status)                     T2.8 (UI: charts) <--------- T2.6, T2.7
  |                                          |
T1.8 (actions)                            T2.9 (UI: cards) <---------- T2.2, T2.3
  |                                          |
T1.9 (purchase page)                      T2.10 (unit tests)
  |                                          |
T1.10 (success/cancel)                    T2.11 (E2E tests)
  |
T1.11 (unit tests)
  |
T1.12 (E2E tests)

PARALLEL: Track 1 and Track 2 are fully independent.
          Both can start on Day 1 simultaneously.
```
