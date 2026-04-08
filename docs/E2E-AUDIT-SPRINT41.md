# E2E Test Suite Audit -- Sprint 41

**Audit ID**: QA-E2E-AUDIT-041
**QA Engineer**: qa-engineer
**Date**: 2026-04-07
**Framework**: Playwright 1.58.x
**Browser**: Chromium only (single project)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total test files | 16 |
| Total helper files | 2 |
| Total individual tests | ~128 |
| test.fixme (permanently skipped) | 2 |
| test.skip("Awaiting implementation") | 7 |
| Conditional test.skip (runtime) | 26 |
| Reported passing (sprint kickoff) | 100 |
| Reported failing (sprint kickoff) | ~30 |

The suite has **128 declared tests**. Of these, **9 are permanently non-executable** (2 fixme + 7 unimplemented stubs). This leaves **119 potentially runnable tests**. The gap between 119 runnable and 100 passing suggests **~19 actual failures** plus some conditional skips counting as "not passing."

---

## 2. Test Inventory

### 2.1 Test Files and Counts

| File | test() calls | Actual tests | Journey covered |
|---|---|---|---|
| `autocomplete.spec.ts` | 10 | 10 | Destination/origin autocomplete: dropdown, selection, no-results, debounce, spinner, badge |
| `dashboard.spec.ts` | 5 | 5 | Dashboard: auth user view, unauth guard, power user, language switch |
| `data-persistence.spec.ts` | 8 | 8 | Data persistence: profile across expeditions, phase back-nav, wizard reload, dashboard cards |
| `expedition.spec.ts` | 10 | 10 | Expedition lifecycle: Phase 1 wizard, Phase 2, dashboard display, trip badge, points, AI gen, checklist, theme |
| `expedition-domestic.spec.ts` | 15 | 15 | Domestic expedition: creation, badge, Phase 2-6 flows, back nav, confirmation step |
| `full-user-journey.spec.ts` | 1 | 1 | Complete journey: landing -> register -> login -> dashboard -> lang switch -> logout -> re-login |
| `landing-page.spec.ts` | 8 | 8 | Landing page: load, header, sign up nav, login nav, lang switch PT/EN, mobile, auth redirect |
| `login.spec.ts` | 6 | 6 | Login: form elements, valid credentials, wrong password, empty fields, PT locale, register link |
| `logout.spec.ts` | 3 | 3 | Logout: redirect to landing, session cleared, back button protection |
| `navigation.e2e.spec.ts` | 15 | 15 | Navigation: progress bar clicks, back buttons, revisit phases, breadcrumbs, access guards, lang switch, phase transition |
| `navigation.spec.ts` | 3 | 10 | Navigation health: no console errors (6 pages), no 500s (3 pages), 404 page |
| `phase-completion.spec.ts` | 7 | 7 | Phase completion: checklist revert, Phase 4 empty, Phase 6 auto-gen, skip blocking, full flow |
| `phase-navigation.e2e.spec.ts` | 8 | 8 | Phase navigation: access guards, progress bar segments, hub redirect, phase names, validations |
| `registration.e2e.spec.ts` | 5 | 5 | Registration extended: valid, register-then-login, duplicate email, weak password, mismatch |
| `registration.spec.ts` | 7 | 7 | Registration AC: form elements, successful flow, duplicate, password validation, empty fields, PT locale |
| `trip-flow.spec.ts` | 10 | 10 | Trip flow: dashboard, wizard nav, step validation, card content, BOLA isolation |
| **TOTAL** | **121** | **~128** | |

Note: `navigation.spec.ts` has 3 `test()` calls but produces 10 tests via `for` loops over page arrays.

### 2.2 Helper Files

| File | Purpose |
|---|---|
| `tests/e2e/helpers.ts` | `loginAs()`, `registerAndLogin()`, `TEST_USER`, `TEST_USER_B` constants |
| `tests/e2e/helpers/console-errors.ts` | `trackConsoleErrors()`, `trackServerErrors()` -- console.error and HTTP 500 tracking |

### 2.3 Test User Accounts

| User | Email | Password | Source |
|---|---|---|---|
| TEST_USER | testuser@travel.dev | Test@1234 | `npm run dev:setup` seed |
| TEST_USER_B | poweruser@travel.dev | Test@1234 | `npm run dev:setup` seed |
| Dynamic users | `{prefix}-{timestamp}@playwright.invalid` | TestPassword@1234 | `registerAndLogin()` creates per-test |

---

## 3. Skip and Fixme Annotations

### 3.1 test.fixme (2 tests -- permanently broken)

| File | Test | Reason |
|---|---|---|
| `data-persistence.spec.ts:367` | transport data persists between phase 4 steps | "V2 Phase 4 uses chip-based step navigation instead of wizard-primary/back buttons. Needs full rewrite." |
| `data-persistence.spec.ts:423` | accommodation data persists on step navigation | Same reason as above -- V2 phase 4 navigation pattern changed. |

**Root cause**: Phase 4 was redesigned from wizard-primary/back buttons to chip-based step navigation. These two tests reference the old UI pattern and need rewriting for the new chip navigation.

### 3.2 test.skip("Awaiting implementation") (7 tests -- stubs only)

All in `phase-completion.spec.ts`. These contain detailed specs but zero executable code:

| Test | P0 Bug | Description |
|---|---|---|
| E2E-002-01 | P0-002 | Check all Phase 3 mandatory items -> status "Concluida" |
| E2E-002-02 | P0-002 | Uncheck one mandatory item -> status reverts |
| E2E-003-01 | P0-003 | Phase 4 without data is NOT completed |
| E2E-004-01 | P0-004 | Phase 6 auto-generation on first visit |
| E2E-005-01 | P0-005 | Progress bar prevents skip to locked phases |
| E2E-FULL-01 | all | Complete 6-phase expedition end-to-end |
| E2E-006-01 | P0-006 | Back navigation 6->5->4->3->2 then forward 2->3 |

**Impact**: These are the highest-value tests in the suite. They cover the critical P0 bugs identified in Sprint 32. Without implementation, there is no automated regression coverage for the phase completion engine.

### 3.3 Conditional test.skip (26 occurrences -- runtime)

These skip at runtime when preconditions are not met:

| Pattern | Count | Files | Condition |
|---|---|---|---|
| "No expedition on dashboard" | 21 | navigation.e2e, phase-navigation.e2e | TEST_USER has no expeditions in DB |
| "No expeditions available" | 2 | expedition.spec.ts | No expedition cards visible |
| "No expedition in phase 2" | 1 | expedition.spec.ts | No expedition in correct phase |
| "Power user not seeded" | 1 | dashboard.spec.ts | poweruser@travel.dev not in DB |
| "Origin autocomplete not visible" | 1 | autocomplete.spec.ts | Origin input not rendered on this step |

**Root cause**: Most conditional skips (21/26) are in navigation tests that depend on TEST_USER having at least one expedition in the database. If the DB is freshly seeded without running E2E-006 first (expedition creation), these all skip.

---

## 4. Failure Category Analysis

### Category A: Environment-Dependent (estimated 15-20 failures)

**Tests affected**: All 21 "No expedition on dashboard" conditional skips + any test depending on TEST_USER expedition state.

**Mechanism**: Tests in `navigation.e2e.spec.ts` and `phase-navigation.e2e.spec.ts` use `getFirstTripId()` which looks for `[data-testid="phase-segment-1"]` and `[data-testid="expedition-card"]` on the dashboard. If TEST_USER has no expeditions, the function returns null and the test skips. If the expedition exists but is at a different phase than expected, assertions fail.

**Fix approach**:
1. Add a global setup that creates an expedition for TEST_USER before the suite runs.
2. Use `registerAndLogin()` with a fresh user per test (like `phase-completion.spec.ts` specs recommend) for true isolation.
3. Define test ordering: expedition creation tests MUST run before navigation tests.

### Category B: Nominatim API Dependency (estimated 3-5 failures)

**Tests affected**: All autocomplete tests, expedition creation flows, domestic expedition tests.

**Mechanism**: Tests call the live Nominatim geocoding API through `/api/destinations/search`. On staging or slow networks, the API returns slowly or not at all. Tests have retry logic (`fillAutocompleteWithRetry` with 3 attempts) and fallback cities, but this is inherently flaky.

**Files with Nominatim dependency**:
- `autocomplete.spec.ts` (all 10 tests)
- `expedition-domestic.spec.ts` (tests 1, 2, 12)
- `expedition.spec.ts` (E2E-006 Phase 1 wizard)
- `data-persistence.spec.ts` (createExpeditionViaPhase1 helper)

**Fix approach**:
1. Mock Nominatim responses at the network layer using Playwright route interception.
2. Alternatively, seed test data with pre-saved coordinates to bypass autocomplete.

### Category C: Unimplemented Stubs (7 failures -- always skip)

**Tests affected**: All 7 tests in `phase-completion.spec.ts`.

**Mechanism**: Tests contain `test.skip(true, "Awaiting implementation")` -- they are detailed specifications but have no executable code.

**Fix approach**: Implement the test bodies following the detailed step-by-step specs already written in the file.

### Category D: V2 UI Pattern Changes (2 failures -- fixme)

**Tests affected**: 2 tests in `data-persistence.spec.ts` (transport/accommodation step navigation).

**Mechanism**: Phase 4 was redesigned from wizard-primary/back button navigation to chip-based step indicators. Tests reference the old `wizard-primary`/`wizard-back` button pattern.

**Fix approach**: Rewrite to use the V2 chip-based step navigation selectors.

### Category E: Potential Flakiness (estimated 3-5 failures)

**Tests affected**: Various across the suite.

**Indicators found**:
- `waitForTimeout(500-1200)` hardcoded waits throughout: autocomplete, data-persistence, expedition-domestic, navigation.e2e
- `waitForLoadState("networkidle")` is unreliable with streaming/SSE responses
- `full-user-journey.spec.ts` has 300s timeout and flaky annotation
- Race conditions between Next.js Turbopack page compilation and test assertions (cold page load latency)
- Cookie timing issues in logout tests (signOut does not immediately clear browser cookies)

**Most flaky tests**:
1. `full-user-journey.spec.ts` -- 11-step journey with 300s timeout, explicitly marked as "flaky multi-step"
2. Autocomplete tests -- depend on Nominatim API response time
3. Logout back-button protection (`AC-403`) -- depends on cookie timing and bfcache behavior

---

## 5. Duplicate/Overlapping Test Coverage

Several test areas have significant overlap between files:

| Feature | Files covering it | Recommendation |
|---|---|---|
| Registration flow | `registration.spec.ts` (7), `registration.e2e.spec.ts` (5) | Consolidate into single file |
| Dashboard/expeditions view | `dashboard.spec.ts` (5), `trip-flow.spec.ts` (3), `expedition.spec.ts` (2) | Consolidate dashboard tests |
| Navigation + progress bar | `navigation.e2e.spec.ts` (15), `phase-navigation.e2e.spec.ts` (8) | Clarify boundaries |
| Expedition creation | `expedition.spec.ts`, `expedition-domestic.spec.ts`, `data-persistence.spec.ts` | Shared helper exists but duplication in setup |

---

## 6. Playwright Configuration Analysis

```
File: playwright.config.ts
```

| Setting | Value | Assessment |
|---|---|---|
| testDir | `./tests/e2e` | Correct |
| fullyParallel | `true` | Risk: tests with shared state (TEST_USER expeditions) may interfere |
| retries | CI: 2, local: 1 | Adequate for flaky mitigation |
| timeout | CI: 90s, local: 45s | Individual tests override to 120s or 300s -- config timeout is irrelevant |
| workers | CI: 1, local: auto | CI serial execution prevents parallelism issues |
| projects | Chromium only | No Firefox/WebKit coverage |
| locale | `pt-BR` | But most tests navigate to `/en/` -- locale config is partially overridden |
| webServer | `npm run dev` with 120s timeout | Starts dev server if localhost -- no production build tested locally |
| trace | on-first-retry | Good -- captures trace on flaky failures |
| screenshot | only-on-failure | Good |

**Issues identified**:
1. `fullyParallel: true` with shared TEST_USER state is a recipe for flakiness. Tests that create/modify expeditions for TEST_USER will interfere with navigation tests reading TEST_USER's dashboard.
2. No Firefox/WebKit projects -- cross-browser coverage gap.
3. `webServer` uses `npm run dev` (Turbopack) -- cold page compilation adds latency that production build would not have.

---

## 7. CI Configuration Analysis

E2E tests run in CI (`ci.yml`) under these conditions:
- **Trigger**: Only on PRs targeting `master` (`if: github.base_ref == 'master'`)
- **Dependencies**: Runs after `test` job passes (unit/integration)
- **Services**: PostgreSQL 16 + Redis 7 (same as unit tests but separate DB: `travel_planner_e2e`)
- **Build**: Runs `npm run build` before E2E (production build, not dev server)
- **Browser**: Chromium only (`--project=chromium`)
- **Missing**: No `npm run dev:setup` or `npx prisma db seed` -- TEST_USER may not exist in CI

**CI Gap**: The CI pipeline runs `prisma migrate deploy` but does NOT seed test users. This means:
- All tests using `loginAs(TEST_USER)` will trigger auto-registration via the fallback in `helpers.ts`
- Tests depending on pre-existing expeditions (21 conditional skips) will ALL skip
- The "100/130 passing" metric likely includes many skipped tests counted as "passing"

---

## 8. Prerequisites for Running E2E Tests

### Local Development

1. **Docker containers running**:
   - PostgreSQL: `docker compose up -d postgres` (port 5432)
   - Redis: `docker compose up -d redis` (port 6379)

2. **Database seeded**:
   - `npx prisma migrate deploy`
   - `npm run dev:setup` (creates TEST_USER + TEST_USER_B + sample data)

3. **Playwright browsers installed**:
   - `npx playwright install chromium`

4. **Run tests**:
   - `npm run test:e2e` (starts dev server automatically)
   - `npm run test:e2e:staging` (runs against Vercel staging URL)

### CI Pipeline

Already configured in `.github/workflows/ci.yml` with PostgreSQL + Redis services. Missing seed step.

---

## 9. Recommendations

### P0 -- Critical (must fix for reliable suite)

| # | Action | Estimated effort | Impact |
|---|---|---|---|
| 1 | **Add DB seed to CI pipeline** -- add `npm run dev:setup` or `npx prisma db seed` step after migrations in the e2e job | 15 min | Prevents 21+ conditional skips in CI |
| 2 | **Implement 7 phase-completion test stubs** -- these cover the most critical P0 bugs | 4-6 hours | Adds regression coverage for phase completion engine |
| 3 | **Add global setup that creates an expedition** -- Playwright `globalSetup` or `test.beforeAll` in a setup project to ensure TEST_USER has at least one expedition | 1 hour | Eliminates "No expedition on dashboard" skips |

### P1 -- High (should fix for stability)

| # | Action | Estimated effort | Impact |
|---|---|---|---|
| 4 | **Mock Nominatim API in tests** -- use `page.route()` to intercept `/api/destinations/search` with fixture data | 2 hours | Eliminates Nominatim flakiness (affects 15+ tests) |
| 5 | **Rewrite 2 fixme data-persistence tests** for V2 chip navigation | 1 hour | Recovers 2 dead tests |
| 6 | **Consolidate registration test files** -- merge `registration.spec.ts` and `registration.e2e.spec.ts` | 30 min | Reduces duplication |
| 7 | **Disable fullyParallel or use per-test user isolation** -- either set `fullyParallel: false` or switch all tests to `registerAndLogin()` | 2-3 hours | Eliminates shared-state race conditions |

### P2 -- Medium (improve over time)

| # | Action | Estimated effort | Impact |
|---|---|---|---|
| 8 | Replace `waitForTimeout()` calls with proper `waitFor` conditions | 2 hours | Reduces flakiness |
| 9 | Add Firefox project as P1 cross-browser coverage | 30 min config | Cross-browser confidence |
| 10 | Use production build (`npm run build` + `npx playwright test`) for local runs | Config change | Matches CI behavior, reduces cold-compilation latency |

### P3 -- Nice to have

| # | Action | Estimated effort | Impact |
|---|---|---|---|
| 11 | Add test tagging (@smoke, @regression, @slow) for selective runs | 1 hour | Faster feedback loops |
| 12 | Add accessibility tests using axe-core Playwright plugin | 2-3 hours | WCAG compliance coverage |

---

## 10. Estimated Failure Breakdown (100/128 passing)

| Category | Est. count | Root cause |
|---|---|---|
| Conditional skips (counted as skip, not pass) | ~15-20 | No expedition in DB for TEST_USER |
| Nominatim API timeout/flakiness | 3-5 | External API dependency |
| Unimplemented stubs (always skip) | 7 | test.skip("Awaiting implementation") |
| V2 UI pattern change (fixme) | 2 | Phase 4 chip navigation rewrite needed |
| Actual assertion failures | 0-3 | Selector drift, timing |

**Note**: The "100/130 passing" metric from the sprint kickoff likely counts conditional skips and fixmes differently. The actual number of tests that execute and produce a green check may be closer to 90-95, with the remainder being skipped.

---

## 11. Test Run Attempt

**Result**: FAILED -- dev server could not start.

```
Error: Timed out waiting 120000ms from config.webServer.
```

**Reason**: Docker containers (PostgreSQL, Redis) are not running. The Playwright config starts `npm run dev` which requires database connectivity. Claude Code does not have Docker access.

**Action required**: User must start Docker containers and run `npm run test:e2e` manually to get actual pass/fail counts.

---

## 12. Quality Verdict

The E2E suite has good coverage of the critical user journeys (auth, expedition creation, phase navigation, BOLA security). However, it suffers from three systemic issues:

1. **Shared mutable state**: 21 tests depend on TEST_USER having pre-existing expeditions, making the suite order-dependent and fragile.
2. **External API dependency**: Nominatim geocoding makes ~15 tests inherently flaky.
3. **9 dead tests**: 7 unimplemented stubs + 2 fixme tests covering the most critical P0 bugs have zero automated coverage.

Fixing items 1-3 from the P0 recommendations would likely bring the suite to 115+ passing with minimal effort. Implementing the 7 phase-completion stubs (item 2) is the highest-value work remaining.

> QA Assessment: E2E suite is **functional but unreliable** -- not suitable as a release gate until P0 recommendations are addressed.
