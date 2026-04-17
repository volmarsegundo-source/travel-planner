# QA Engineer — Persistent Memory

## Project Conventions

### Test File Locations
- Unit tests: `tests/unit/server/services/`, `tests/unit/lib/validations/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/trips/`
- Performance tests: `tests/performance/`
- Accessibility tests: `tests/e2e/accessibility/`
- Fixtures and helpers: `tests/fixtures/`, `tests/helpers/`

### Test Framework Stack
- Unit + Integration: Vitest + `vitest-mock-extended` (mock Prisma with `mockDeep<PrismaClient>()`)
- E2E: Playwright (Chromium P0, Firefox + WebKit P1)
- Accessibility: `@axe-core/playwright`
- Performance: Playwright Lighthouse plugin

### Synthetic Test Data Conventions
- Never use real PII — always `@playwright.invalid` email domains
- Synthetic userIds follow pattern: `test-user-a-cuid00000001`
- Fixtures in `tests/fixtures/users.ts` and `tests/fixtures/trips.ts`
- Integration tests use DB transaction rollback in `afterEach` for idempotency

### Key Security Tests Always Required for Trip Features
- BOLA: User B cannot access User A's resources (expects 404, not 403 — no existence leakage)
- Mass assignment: `userId`, `status`, `deletedAt`, `id` stripped by Zod, never from user input
- Auth check is first statement in every Server Action
- `redirect()` must NOT be inside `try/catch` (Next.js NEXT_REDIRECT exception is caught)

### Soft Delete Critical Test (CR-003)
Integration test must verify soft-deleted records do not appear in `findMany`. This must run against real Prisma (not mocked) to catch deprecated `db.$use` / correct `db.$extends` issues.

### Performance Targets (US-001 baseline)
- FCP `/trips`: < 1,500ms (Lighthouse, 4G)
- `createTrip` Server Action: < 500ms P95
- `listTrips` DB query: < 50ms P95
- `getTripById` DB query: < 20ms P95

### AC Coverage Approach
Every AC from `docs/tasks.md` must map to at least one test in QA-SPEC. Coverage Summary table is the traceability matrix.

### Sprint 7 Test Locations
- `tests/unit/server/account.actions.test.ts` — updateProfile + deleteAccount Server Actions
- `tests/unit/lib/validations/account.schema.test.ts` — Zod schema edge cases
- `tests/unit/components/account/ProfileForm.test.tsx` — ProfileForm behavior + a11y
- `tests/unit/components/account/ProfileForm-spinner.test.tsx` — Loader2 spinner state
- `tests/unit/components/account/DeleteAccountModal.test.tsx` — 2-step modal, focus trap, signOut
- `tests/unit/app/loading-*.test.tsx` — 4 loading skeleton tests
- `tests/unit/app/error-app.test.tsx` + `error-trip.test.tsx` — error boundary tests
- `tests/unit/components/checklist/ChecklistGeneratingSkeleton.test.tsx` — rotating message
- `tests/unit/components/itinerary/ItineraryEditor-skeleton.test.tsx` — add day skeleton
- `tests/unit/components/layout/Footer.test.tsx` — public + authenticated variants
- `tests/unit/scripts/generate-test-plan.test.ts` — test plan generator

### Sprint 7 Findings (QA-REL-007)
- No DeleteAccountSection test file (thin wrapper, covered indirectly)
- Hardcoded strings: "Portugues (Brasil)" in ProfileForm locale options, "Loading" in loading.tsx aria-labels, "Traveler" fallback in layout.tsx
- Footer links to /terms, /privacy, /support pages that do not exist yet (dead links)
- userId logged in logger.info/logger.error (acceptable per current logger config, PII concern noted)

### Sprint 22 E2E Review Findings (QA-E2E-001)
- **BUG-A (P0)**: `tripType` never persisted — `ExpeditionService.createExpedition()` does not set it, Prisma defaults to "international". `classifyTrip()` runs on client only. Fix: compute server-side, add to `Phase1Schema`.
- **BUG-B (P0)**: `expedition.phase4.title` in both locales still says "O Abrigo"/"The Shelter" (ADR-012 missed i18n update). `phase-config.ts` is correct ("A Logistica"), but Phase4Wizard uses `t("title")` not `tPhases(nameKey)`.
- **BUG-E root cause**: TWO code paths in `phase-engine.ts` — `PHASE_ORDER_VIOLATION` uses i18n key correctly, but `PHASE_ALREADY_COMPLETED` (line 202) uses raw English. Also 5 other raw English strings in AppError messages in same file.
- **I18N-011**: `en.json` has duplicate `gamification.phases` JSON key (lines 776 and 788). Second silently overwrites first.
- **Test file layout**: Server action tests at `tests/unit/server/` (flat), NOT `tests/unit/server/actions/`. Expedition actions test file does NOT exist.
- **Phase engine test gap**: `phase-engine.test.ts` uses `tripType: "international"` in all mock trips — domestic/mercosul paths completely untested.
- **Full E2E review document**: `docs/qa/END-TO-END-REVIEW.md`

## Spec-Driven Development (SDD) — Effective Sprint 25

### Core Principles
- SDD is the official development methodology starting Sprint 25
- QA validates code AGAINST approved specs, not just "does it work"
- Spec conformance audit is mandatory at end of every sprint
- **Spec drift = P0 bug** — any deviation from approved spec is treated as a blocker
- QA creates test plans directly from spec acceptance criteria (traceability required)
- Any deviation from spec discovered during testing must be flagged immediately to tech-lead
- Specs are the single source of truth; if code deviates, either code is fixed or spec is formally amended

### QA Workflow Under SDD
1. **Pre-sprint**: Read all approved specs (SPEC-PROD, SPEC-UX, SPEC-ARCH, SPEC-SEC) for planned work
2. **Test plan creation**: Derive test cases from spec ACs — every AC maps to at least one test case
3. **During sprint**: Flag spec drift immediately when found during testing
4. **Post-sprint**: Run spec conformance audit using `TEMPLATE-QA-CONFORMANCE.md`
5. **Sign-off**: QA sign-off now includes conformance audit verdict alongside test execution results

### SDD Templates
- Conformance audit: `docs/specs/templates/TEMPLATE-QA-CONFORMANCE.md`
- Test plan (spec-based): `docs/specs/templates/TEMPLATE-QA-TEST-PLAN.md`

### Drift Classification
| Drift Type | Severity | Example |
|---|---|---|
| Missing AC | P0 | AC says "show error toast on failure" — no toast implemented |
| Behavioral deviation | P0 | AC says "redirect to /trips" — code redirects to /dashboard |
| Constraint violation | P0 | Spec says "< 200ms response" — measured 450ms |
| Cosmetic deviation | P1 | Spec says "red badge" — code shows orange badge |
| Extra feature (not in spec) | P1 | Feature added that has no spec coverage — risk of untested code |

## Eval-Driven Development (EDD) — Effective Sprint 27
- [Full EDD details](project_edd_framework.md)
- [Sprint 30 EDD Plan](project_sprint30_edd_plan.md)
- Process: `docs/process/EVAL-DRIVEN-DEVELOPMENT.md`
- Trust Score: `docs/process/TRUST-SCORE.md`
- Eval Template: `docs/process/templates/EVAL-TEMPLATE.md`
- Datasets: `docs/evals/datasets/` (itinerary-quality, guide-accuracy, injection-resistance, i18n-completeness, autocomplete-quality, map-rendering, dashboard-layout, summary-completeness)

## Sprint 44 Wave 4 Findings (2026-04-15)

### Open Bugs (2 skipped tests with TODO markers)
- **BUG-S44-W4-001** (S2-High, P1): markdown data-exfil URL in `localMobility` not stripped by `sanitizeForPrompt`. Injection guard lacks HTTP URL / markdown image pattern. Fix: add URL pattern to HIGH_CONFIDENCE_PATTERNS in `src/lib/prompts/injection-guard.ts` OR add URL stripping in `safeField()` in `src/lib/prompts/digest.ts`. Skipped test: `expedition-ai-context.service.test.ts` (INJ-S44-05).
- **BUG-S44-W4-002** (S3-Medium, P2): `next-steps-engine` `completeChecklist` special case hardcoded to `phase === 3` — not flag-aware for new phase 6 slot. Fix: make checklist phase detection read from `getChecklistPhaseNumber()` (flag-aware helper). Skipped test: `next-steps-engine-reorder.test.ts`.

### Wave 4 Test Locations
- `tests/unit/server/expedition-ai-context.service.test.ts` — assembleFor context slices, BOLA, sanitization (39 tests)
- `tests/unit/server/expedition-phase-migration.test.ts` — migration mapping FX-01..09, bijection invariant (62 tests)
- `tests/unit/lib/engines/next-steps-engine-reorder.test.ts` — TC-NAV-E07 flag-aware (25 tests)
- `tests/unit/lib/prompts/digest.test.ts` — S44 invariant blocks appended (28 new tests)
- `tests/evals/injection-resistance.eval.ts` — S44 vectors IR-021..025 (7 new tests)
- `docs/evals/datasets/checklist-quality.json` — NEW: 25 cases (20 base + 5 itinerary-aware)
- `docs/evals/datasets/injection-resistance.json` — +5 S44 vectors IR-021..025

### Key sanitizeForPrompt behavior note
`sanitizeForPrompt` is mocked to pass-through in `tests/unit/lib/prompts/digest.test.ts`. Token budget / maxLen enforcement is only tested with real injection-guard (integration-level or `expedition-ai-context.service.test.ts`). Any new digest tests that need to validate length caps must NOT mock the guard.

## Key Docs for QA Context
- `docs/SPEC-001.md` — data model, Server Actions, business logic
- `docs/ux-patterns.md` — UX-001 screen specs, error states, accessibility checklist
- `docs/SEC-SPEC-001.md` — security findings (FIND-M-001 through FIND-L-003), SR-001..SR-008, CR-001..CR-004
- `docs/tasks.md` — acceptance criteria (source of truth)
- `docs/QA-SPEC-001.md` — this feature's test strategy (Strategy ID: QA-SPEC-001)
- `docs/specs/SPEC-QA-REORDER-PHASES.md` — Sprint 44 phase reorder test plan
