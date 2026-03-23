# SPEC-QA-013: Sprint 37 Test Strategy

**Version**: 1.0.0
**Status**: Draft
**Author**: qa-engineer
**Reviewers**: tech-lead, architect, security-specialist
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Baseline**: v0.31.0, 2408 unit tests, 122/130 E2E passed, build clean

---

## 1. Scope

Sprint 37 replaces the mock payment provider with real Stripe integration and enhances
the admin dashboard with per-user profit, CSV export, margin alerts, and custom date range
filtering. It also adds the Purchase Flow UX connecting insufficient balance prompts to
the Stripe checkout and back.

### Features Under Test

| # | Feature | Spec Refs | Risk Level |
|---|---------|-----------|------------|
| F1 | Stripe Payment Integration | SPEC-ARCH-030 v2, SPEC-SEC-006 v2 | Critical |
| F2 | Enhanced Admin Dashboard | SPEC-ARCH-031 v2, SPEC-PROD-042 v2 | High |
| F3 | Purchase Flow UX | SPEC-UX-043 v2, SPEC-PROD-041 v2 | High |

### Out of Scope

- Stripe Connect / marketplace payouts (future sprint)
- Refund automation via Stripe API (manual refunds only in Sprint 37)
- Admin dashboard: export to PDF (CSV only)
- Mobile-native payment sheets (web checkout only)

---

## 2. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Webhook replay attack credits PA twice | Medium | Critical | P0 |
| Stripe signature validation bypass | Low | Critical | P0 |
| PA credit non-atomic (credits without purchase record) | Low | Critical | P0 |
| Checkout session created for invalid package | Medium | High | P0 |
| totalPoints incorrectly incremented on purchase | Medium | High | P0 |
| Margin calculation off by rounding | Medium | Medium | P1 |
| CSV export exposes sensitive fields | Low | High | P0 |
| Non-admin accesses admin endpoints | Low | Critical | P0 |
| Balance not updated in header after purchase | Medium | Medium | P1 |
| Stripe redirect timeout leaves user stranded | Medium | Medium | P1 |
| Rate limit bypass on checkout creation | Low | Medium | P1 |
| Period filter produces wrong date boundaries | Medium | Medium | P1 |
| Sort/search on user table with special chars | Low | Low | P2 |

---

## 3. Test Matrix

| Feature | Unit | Integration | E2E | Eval |
|---|---|---|---|---|
| Stripe provider (createCheckout) | 8 | 2 | -- | -- |
| Stripe webhook handler | 10 | 3 | -- | -- |
| Stripe redirect flow | -- | -- | 3 | 12 |
| PA credit atomicity | 4 | 2 | -- | -- |
| Idempotent credit | 3 | 1 | -- | -- |
| Purchase record creation | 3 | 1 | -- | -- |
| Balance update in header | 2 | -- | 1 | -- |
| Admin KPI accuracy | 6 | 2 | -- | 10 |
| Per-user profit calc | 4 | 1 | -- | -- |
| CSV export | 4 | 1 | 1 | -- |
| Period filter (7d/30d/90d/1y/custom) | 5 | -- | 1 | -- |
| Margin alerts (yellow/red) | 3 | -- | 1 | -- |
| Search + sort user table | 4 | -- | 1 | -- |
| Admin access denied | 2 | -- | 1 | -- |
| Purchase flow UX | 4 | -- | 3 | 8 |
| **TOTAL** | **~62** | **~13** | **~12** | **30** |

### Expected Post-Sprint Counts

- Unit tests: 2408 + ~75 = **~2483**
- E2E tests: 130 + ~12 = **~142**

---

## 4. Test Pyramid

```
         [E2E]           -- 12 critical journeys (Stripe redirect, admin, purchase UX)
       [Integration]     -- 13 tests (Stripe webhook, PA credit tx, admin queries)
      [Unit Tests]       -- 62 tests (provider logic, KPI math, schema validation)
     [Eval Datasets]     -- 30 scenarios across 3 datasets
```

**Unit**: Stripe provider methods, webhook signature validation, KPI aggregation
functions, margin calculation, CSV column selection, period date boundary computation,
PA credit math (availablePoints only), idempotency guard, package validation.

**Integration**: Stripe webhook end-to-end with Prisma transaction, PA credit atomicity
with real database, admin KPI queries against seeded data, CSV export content verification.

**E2E**: Stripe checkout redirect flow (success + cancel), balance update after purchase,
admin dashboard load with data, CSV download, non-admin access denied, insufficient
balance to purchase to success flow.

---

## 5. E2E Scenarios

### Stripe Payment Integration (5 scenarios)

| ID | Scenario | Priority |
|---|---|---|
| E2E-S37-001 | Select Explorador package, complete Stripe Checkout (test mode), PA balance +500, purchase record visible | P0 |
| E2E-S37-002 | Stripe Checkout cancel button returns to purchase page, no PA credited, no purchase record | P0 |
| E2E-S37-003 | Duplicate webhook delivery (same event ID) credits PA only once | P0 |
| E2E-S37-004 | Invalid package ID in checkout request returns error, no session created | P1 |
| E2E-S37-005 | Header balance updates without full page reload after successful purchase | P1 |

### Enhanced Admin Dashboard (4 scenarios)

| ID | Scenario | Priority |
|---|---|---|
| E2E-S37-006 | Non-admin navigates to /admin/dashboard, redirected to /expeditions | P0 |
| E2E-S37-007 | Admin sees KPI cards, revenue chart, and user table with data | P0 |
| E2E-S37-008 | Admin downloads CSV, file contains correct columns (no passwordHash/passport/phone), data matches UI | P0 |
| E2E-S37-009 | Admin applies custom date filter, KPIs and chart update accordingly | P1 |

### Purchase Flow UX (3 scenarios)

| ID | Scenario | Priority |
|---|---|---|
| E2E-S37-010 | Insufficient balance modal appears, click "Buy PA", redirected to purchase page, complete purchase, return to original action with balance updated | P0 |
| E2E-S37-011 | Package selection card shows visual highlight, price, and PA amount; clicking confirms selection | P1 |
| E2E-S37-012 | Stripe Checkout error (e.g., card declined) shows error message, user can retry | P1 |

---

## 6. Detailed E2E Scenario Specs

### E2E-S37-001: Stripe Checkout Success

**Priority**: P0
**Persona**: @leisure-solo with existing PA balance
**Preconditions**: User authenticated, Stripe test mode enabled, STRIPE_SECRET_KEY set to test key

#### Steps

1. Navigate to /meu-atlas/comprar-pa --> Package selection page loads with 4 packages
2. Click "Explorador" package card --> Card visually highlighted, "Confirmar" button enabled
3. Click "Confirmar" --> Redirect to Stripe Checkout (test mode)
4. In Stripe Checkout, use test card 4242424242424242 --> Payment succeeds
5. Stripe redirects to success URL --> Success confirmation page displayed
6. Check header PA balance --> Balance increased by 500
7. Navigate to purchase history --> New entry: Explorador, 500 PA, R$14.90, "completed"

#### Edge Cases

- Network timeout between Stripe redirect and success page
- User closes browser during Stripe Checkout (session expires after 24h)
- Stripe webhook arrives BEFORE user is redirected to success page

#### Test Data

- Traveler: `stripe-test-user@playwright.invalid`
- Payment: Stripe test card `4242 4242 4242 4242`, exp 12/30, CVC 123
- Package: Explorador (500 PA / R$14.90)

#### Pass Criteria

- [ ] PA balance incremented by exactly 500
- [ ] totalPoints NOT incremented
- [ ] Purchase record exists with status "completed" and correct Stripe payment intent ID
- [ ] PointTransaction record exists with type "purchase", amount 500

---

### E2E-S37-003: Duplicate Webhook Idempotency

**Priority**: P0
**Preconditions**: Webhook endpoint configured, valid Stripe webhook signing secret

#### Steps

1. Simulate Stripe `checkout.session.completed` webhook with event ID `evt_test_001`
   --> PA credited, purchase record created
2. Resend identical webhook with same event ID `evt_test_001`
   --> Webhook returns 200 OK but NO additional PA credited
3. Query user balance --> Same as after step 1

#### Pass Criteria

- [ ] PA credited exactly once
- [ ] Only one Purchase record with this Stripe session ID
- [ ] Second webhook returns 200 (not 409 or 500)
- [ ] Stripe event ID stored in Purchase record for dedup

---

### E2E-S37-008: CSV Export Security

**Priority**: P0
**Preconditions**: Admin user authenticated, at least 5 users with purchase history in system

#### Steps

1. Navigate to /admin/dashboard as admin --> Dashboard loads
2. Click "Exportar CSV" --> CSV file downloaded
3. Open CSV, inspect columns --> Contains: email, name, available PA, total PA, rank, badge count, trip count, purchased (BRL), AI spend (PA), AI cost (BRL), margin (BRL), margin (%), created date
4. Verify NO sensitive columns --> passwordHash, passport, phone, full userId MUST NOT appear

#### Pass Criteria

- [ ] CSV downloaded successfully with correct MIME type (text/csv)
- [ ] Column headers match spec
- [ ] Data rows match what is displayed in the UI user table
- [ ] Zero sensitive fields present in export

---

### E2E-S37-010: Insufficient Balance to Purchase to Success

**Priority**: P0
**Persona**: @leisure-solo with 10 PA balance, AI action requiring 80 PA
**Preconditions**: User has 10 available PA, itinerary generation costs 80 PA

#### Steps

1. Attempt to generate itinerary --> Insufficient balance modal appears
2. Modal shows current balance (10 PA), required (80 PA), and "Comprar PA" button
3. Click "Comprar PA" --> Redirected to /meu-atlas/comprar-pa
4. Select Explorador (500 PA) --> Complete Stripe checkout
5. Redirected back to success page --> Balance now 510 PA
6. Navigate back to itinerary --> Can now generate (510 >= 80)

#### Pass Criteria

- [ ] Modal displays correct current and required PA values
- [ ] After purchase, balance reflects new amount
- [ ] User can complete the originally blocked action

---

## 7. Test Cases (from Acceptance Criteria)

### Happy Path

| TC# | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|-----|---------|-------------|--------------|-------|----------------|----------|
| TC-001 | F1 | Create checkout session for valid package | Auth user, Stripe test keys | Call createCheckoutAction("explorador") | Returns sessionUrl, Purchase record (pending) | P0 |
| TC-002 | F1 | Webhook processes valid checkout.session.completed | Pending Purchase exists | POST /api/stripe/webhook with valid sig | Purchase=completed, PA+500, PointTx created | P0 |
| TC-003 | F1 | PA credit is atomic | Valid webhook | Process webhook in transaction | Both Purchase update AND PA credit succeed or neither | P0 |
| TC-004 | F2 | KPI total revenue = SUM completed purchases | 3 completed, 1 refunded purchase | Call getDashboardKPIs() | Revenue = sum of 3 completed only | P0 |
| TC-005 | F2 | Per-user profit = revenue - AI cost | User with R$29.90 revenue, 160 PA AI spend | Call getUserMetrics(userId) | margin = 29.90 - (160 * 0.004) = 29.26 | P0 |
| TC-006 | F2 | CSV export contains correct columns | Admin, data exists | Call exportUsersCSV() | 13 columns, no sensitive fields | P0 |
| TC-007 | F3 | Package selection highlights card | On purchase page | Click package card | Visual highlight, confirm button enabled | P1 |
| TC-008 | F3 | Balance updated in header post-purchase | Successful purchase | Observe header component | New balance displayed without full page reload | P1 |

### Edge Cases

| TC# | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|-----|---------|-------------|--------------|-------|----------------|----------|
| TC-E01 | F1 | Checkout for non-existent package ID | Auth user | createCheckoutAction("fake-pkg") | Zod validation error, no Stripe session | P0 |
| TC-E02 | F1 | Webhook with expired session (>24h) | Expired Stripe session | Process webhook | Purchase marked failed, no PA credit | P1 |
| TC-E03 | F1 | Rate limit: >5 checkout requests in 1 minute | Auth user | Send 6 rapid requests | 6th request returns 429 | P1 |
| TC-E04 | F2 | Period filter boundary: exactly 7 days | Admin | Filter 7d with purchase on day 7 at 00:00:01 | Purchase included in results | P1 |
| TC-E05 | F2 | Custom date range: end < start | Admin | Set end date before start date | Validation error, no query executed | P1 |
| TC-E06 | F2 | Search with SQL injection in query | Admin | Search for `'; DROP TABLE--` | Input sanitized, no error, empty results | P0 |
| TC-E07 | F2 | Sort by margin descending | Admin, multiple users | Click margin column header | Users ordered by margin DESC | P2 |
| TC-E08 | F3 | User has exactly 0 PA, tries AI action | 0 balance | Trigger AI action | Insufficient modal, not a crash | P0 |

### Error Paths

| TC# | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|-----|---------|-------------|--------------|-------|----------------|----------|
| TC-F01 | F1 | Stripe API unreachable during checkout creation | Network issue simulated | createCheckoutAction | Graceful error: "Pagamento indisponivel", no Purchase record created | P0 |
| TC-F02 | F1 | Webhook with invalid signature | Tampered payload | POST webhook with wrong sig | 400 response, no PA credit, logged as security event | P0 |
| TC-F03 | F1 | Webhook with valid sig but unknown event type | Stripe sends unsupported event | POST webhook | 200 OK (acknowledged), no side effects | P1 |
| TC-F04 | F1 | Card declined in Stripe Checkout | User uses 4000000000000002 | Complete Stripe form | Stripe shows decline, user stays on Checkout | P0 |
| TC-F05 | F1 | Double-click confirm button | User clicks fast | Two createCheckoutAction calls | Only one Stripe session created (debounce or dedupe) | P1 |
| TC-F06 | F3 | Payment failure after redirect | Stripe error post-redirect | User lands on error return URL | Error page with "Tentar novamente" button | P0 |

---

## 8. Negative Test Cases (from Security Spec)

| TC# | Threat Vector | Description | Steps | Expected Result | Priority |
|-----|-------------|-------------|-------|----------------|----------|
| TC-N01 | Webhook forgery | POST to /api/stripe/webhook without Stripe-Signature header | Send POST with body but no sig | 400, no processing | P0 |
| TC-N02 | Webhook replay | Resend webhook with same Stripe event ID | Send identical webhook twice | Second returns 200, no double credit | P0 |
| TC-N03 | Price manipulation | Client sends custom price in checkout request | POST with amountCents: 1 | Server ignores client price, uses PA_PACKAGES constant | P0 |
| TC-N04 | Mass assignment | Client includes userId/role in checkout request body | POST with userId: "other-user" | userId from session only, Zod strips extra fields | P0 |
| TC-N05 | Admin bypass | Non-admin calls admin server actions directly | Import and call getDashboardKPIs as regular user | ForbiddenError thrown | P0 |
| TC-N06 | CSV data leak | CSV export includes passwordHash or passport | Admin exports CSV | Sensitive fields absent from export | P0 |
| TC-N07 | BOLA on purchase history | User A requests User B purchase history | Call getPurchaseHistory with different userId | 404 or empty (not 403) | P0 |
| TC-N08 | Checkout rate limit | >5 checkout session creations per minute | Rapid requests | 429 after threshold | P1 |

---

## 9. Accessibility Test Cases

| TC# | WCAG | Description | Method | Expected Result | Priority |
|-----|------|-------------|--------|----------------|----------|
| TC-A01 | 2.1.1 | Tab through package selection cards and confirm button | Keyboard | All cards focusable, Enter selects, confirm reachable | P0 |
| TC-A02 | 4.1.2 | Screen reader announces package name, PA, price on card focus | axe-core + manual | Accessible labels present on all cards | P0 |
| TC-A03 | 1.3.1 | Insufficient balance modal has proper heading hierarchy | axe-core | h2 heading, associated labels, close button labeled | P1 |
| TC-A04 | 2.4.3 | Focus moves to modal when insufficient balance triggers | Manual | Focus trapped inside modal, ESC closes | P1 |
| TC-A05 | 1.4.11 | Margin alert badges (yellow/red) meet non-text contrast | axe-core | 3:1 contrast ratio on alert indicators | P1 |

---

## 10. Performance Test Cases

| TC# | Metric | Description | Method | Target | Priority |
|-----|--------|-------------|--------|--------|----------|
| TC-P01 | Checkout creation | createCheckoutAction response time | Vitest timer | < 2000ms P95 (includes Stripe API call) | P0 |
| TC-P02 | Webhook processing | Webhook handler end-to-end | Vitest timer | < 500ms P95 | P0 |
| TC-P03 | KPI query | getDashboardKPIs with 10k purchases | k6 / Vitest | < 1000ms P95 | P1 |
| TC-P04 | CSV export | exportUsersCSV with 500 users | Vitest timer | < 3000ms P95 | P1 |
| TC-P05 | User table load | getUserMetrics paginated (20/page) | Vitest timer | < 200ms P95 | P1 |
| TC-P06 | Purchase page FCP | First Contentful Paint | Lighthouse | < 1500ms (4G) | P1 |

---

## 11. i18n Test Cases

| TC# | Description | Steps | Expected Result | Priority |
|-----|-------------|-------|----------------|----------|
| TC-I01 | Purchase page fully localized (pt) | Switch to pt, navigate purchase page | No English text; package names, prices, buttons in Portuguese | P0 |
| TC-I02 | Purchase page fully localized (en) | Switch to en, navigate purchase page | No Portuguese text | P0 |
| TC-I03 | Stripe Checkout locale matches app locale | Start checkout from pt locale | Stripe Checkout renders in Portuguese | P1 |
| TC-I04 | Admin dashboard localized | Switch locale on admin page | KPI labels, column headers, buttons in correct locale | P1 |
| TC-I05 | CSV export headers localized | Export CSV while locale is pt | Column headers in Portuguese | P2 |
| TC-I06 | Error messages localized | Trigger payment error in pt | Error toast in Portuguese, not raw English | P0 |

---

## 12. Trust Score Target

| Gate | Target | Dimensions |
|---|---|---|
| PR | >= 0.80 | Structure, Security, i18n |
| Staging | >= 0.85 | Structure, Security, i18n, UX-flow, Accessibility |

---

## 13. Eval Datasets

| Dataset | File | Scenarios | Grader |
|---|---|---|---|
| Stripe payment flow | `stripe-payment-flow.json` | 12 | Code |
| Admin dashboard enhanced | `admin-dashboard-enhanced.json` | 10 | Code |
| Purchase UX flow | `purchase-ux-flow.json` | 8 | Code |

---

## 14. Regression Scope

### Tests That Must Still Pass

| Area | Test Suite | Reason |
|------|-----------|--------|
| Mock payment provider | `tests/unit/server/services/payment/` | Stripe provider extends same interface |
| PA credit logic | `tests/unit/server/services/points-engine.test.ts` | availablePoints vs totalPoints critical |
| Admin access guard | `tests/unit/server/actions/admin.actions.test.ts` | 3-layer guard must not regress |
| Purchase flow (Sprint 36) | `tests/e2e/trips/purchase-flow.spec.ts` | Stripe replaces mock but flow identical |
| Badge system | `tests/unit/server/services/badge-engine.test.ts` | Purchase may trigger badges |
| Webhook endpoint | `tests/integration/api/stripe-webhook.test.ts` | New endpoint, test from scratch |

### Smoke Tests (post-deploy)

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Login with valid credentials | Redirect to /expeditions |
| 2 | Open purchase page | 4 packages displayed with prices |
| 3 | Start Stripe checkout (test mode) | Redirect to Stripe, no 500 error |
| 4 | Admin loads dashboard | KPIs render, no loading spinner stuck |
| 5 | Non-admin visits /admin | Redirect to /expeditions |

---

## 15. Test Data Requirements

| Data | Source | Notes |
|------|--------|-------|
| Regular test user | `tests/fixtures/users.ts` | `stripe-test@playwright.invalid`, has 200 PA |
| Admin test user | `tests/fixtures/users.ts` | `admin-test@playwright.invalid`, role=admin |
| User with 0 PA | `tests/fixtures/users.ts` | `zero-pa@playwright.invalid` |
| Stripe test cards | Stripe docs | `4242...4242` (success), `4000...0002` (decline) |
| Seeded purchases | `tests/fixtures/purchases.ts` | 10 completed + 2 refunded for admin KPI testing |
| Seeded AI usage | `tests/fixtures/point-transactions.ts` | AI spend records for margin calculation |

All test data is synthetic. No real PII, no real payment cards, no production Stripe keys.

---

## 16. Test Execution Plan

| Phase | Test Type | Method | Owner | ETA |
|-------|----------|--------|-------|-----|
| 1 | Unit tests | Vitest (automated) | dev-fullstack | During implementation |
| 2 | Integration tests | Vitest + real Prisma (automated) | dev-fullstack | After implementation |
| 3 | Security tests | Vitest + manual | qa-engineer | Post-implementation |
| 4 | Accessibility tests | axe-core + manual | qa-engineer | Post-implementation |
| 5 | E2E tests | Playwright (automated) | qa-engineer | Pre-release |
| 6 | Performance tests | Lighthouse / Vitest timer | qa-engineer | Pre-release |
| 7 | Eval datasets | npm run eval | qa-engineer | Pre-release |
| 8 | Exploratory testing | Manual | qa-engineer | Pre-release |

---

## 17. Exit Criteria

This test plan is complete when:

- [ ] All P0 test cases pass
- [ ] All P1 test cases pass (or failures triaged and accepted)
- [ ] No P0 bugs remain open
- [ ] Spec conformance audit (QA-CONF-013) shows no drift
- [ ] Performance budgets met (Section 10)
- [ ] Accessibility audit clean (no critical/serious axe-core violations)
- [ ] Regression suite passes (2408+ existing tests)
- [ ] Trust score >= 0.80 (PR gate) and >= 0.85 (staging gate)
- [ ] All 3 eval datasets pass with >= 80% scenario pass rate

---

## 18. Exploratory Testing Areas

These areas are too dynamic or complex for full automation and will be tested manually
each sprint:

- Stripe Checkout UI behavior under slow network (3G throttle)
- Browser back button during Stripe redirect flow
- Multiple tabs: start checkout in tab A, complete in tab B
- Admin dashboard with zero data (fresh install)
- Admin dashboard with extremely high revenue values (overflow check)
- Margin alert color thresholds at exact boundaries (50.0%, 80.0%)
- CSV export with special characters in user names (accents, emojis)
- Purchase page behavior when Stripe is in maintenance mode

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-23 | Criacao inicial -- Sprint 37 test strategy (Stripe + Admin dashboard enhanced) |
