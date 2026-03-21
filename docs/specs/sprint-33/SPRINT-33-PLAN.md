# Sprint 33 -- Technical Plan

**Theme**: "Data Integrity + UX Foundation + Social Login"
**Baseline**: v0.27.1 (Sprint 32 stabilization + hotfix)
**Target**: v0.28.0
**Branch**: `feat/sprint-33`
**Tag**: `v0.28.0`
**Date**: 2026-03-20
**Author**: tech-lead

---

## Pre-Sprint Investigation: Data Integrity

### Finding: Stale `currentPhase = 7` in Database

**Root Cause**: Before Sprint 32 FIX-02, `PhaseEngine.completePhase` could set
`trip.currentPhase = phaseNumber + 1` without capping. Completing Phase 6 set
`currentPhase = 7`. FIX-02 added `Math.min(phaseNumber + 1, TOTAL_ACTIVE_PHASES)`
but this only prevents NEW writes. Existing trips still have `currentPhase = 7`
persisted in the database.

**Impact Analysis** (with `currentPhase = 7` in DB):
- `guardPhaseAccess` coerces to `safeCurrentPhase = 7` (passes `>= 1` check
  but NOT clamped to 6)
- `resolveAccess(requestedPhase=6, tripCurrentPhase=7, ...)`: Phase 6 resolves
  as `requestedPhase < tripCurrentPhase` which returns `first_visit` -- so
  access still works, but the access mode is wrong (should be `revisit` since
  Phase 6 is completed)
- `getPhaseState(7, 7, completedPhases)`: returns `"locked"` because
  `7 > TOTAL_ACTIVE_PHASES` -- progress bar has no "current" indicator
- `PHASE_ROUTE_MAP[7]` is `undefined` -- redirect fallback issues

**Fixes Applied (this sprint, pre-planning)**:
1. **Defensive guard clamp** (TASK-S33-002, already implemented):
   `phase-access.guard.ts` now clamps `safeCurrentPhase` to
   `Math.min(rawPhase, TOTAL_ACTIVE_PHASES)`. Even with stale DB data,
   all navigation and access logic operates within valid range.
2. **Data migration script** (TASK-S33-001, already implemented):
   `scripts/fix-phase7-trips.ts` -- finds and caps all trips with
   `currentPhase > 6`. Supports `--dry-run`. Idempotent.

### Verification: Sprint 32 Fixes in Codebase

| Fix ID | Description | Status | Location |
|--------|-------------|--------|----------|
| FIX-01 | totalPhases computed at read time | Effective | `phase-navigation.engine.ts:10` |
| FIX-02 | completePhase caps at TOTAL_ACTIVE_PHASES | Effective | `phase-engine.ts:274` |
| FIX-02b | advanceFromPhase caps at TOTAL_ACTIVE_PHASES | Effective | `phase-engine.ts:361` |
| FIX-03 | Phase2Wizard revisit guard | Effective | `Phase2Wizard.tsx` |
| FIX-04 | completedPhases array (not count) | Effective | `trip.service.ts` |
| FIX-05 | syncPhaseStatus | Effective | `phase-completion.service.ts` |
| FIX-06 | Phase6 auto-complete | Effective | `Phase6Wizard.tsx:204` |

All code fixes confirmed in codebase. Remaining issue is stale DB data only.

---

## Dependency Map

```
Track A (Data Integrity) -- MUST complete first
  TASK-S33-001 (migration script) -----> TASK-S33-004 (verify fixes)
  TASK-S33-002 (defensive guard)  -----> TASK-S33-004
  TASK-S33-003 (Phase6 auto-gen verify) -> TASK-S33-004

Track B (UX Foundation) -- parallel after Track A
  TASK-S33-005 (WizardFooter enhance) --- independent
  TASK-S33-006 (Phase 3 completion)   --- independent
  TASK-S33-007 (Phase 4 mandatory)    --- independent

Track C (Summary Report) -- parallel after Track A
  TASK-S33-008 (summary from Phase 2+) -> TASK-S33-009 (full aggregation)
  TASK-S33-009                         -> TASK-S33-010 (pending items)

Track D (Phase 6 Prompt) -- parallel after Track A
  TASK-S33-011 (collect all data)      -> TASK-S33-012 (token budget)

Track E (Social Login) -- lowest priority, parallel
  TASK-S33-013 (Google OAuth)          -> TASK-S33-015 (UI)
  TASK-S33-014 (Apple ID)             -> TASK-S33-015 (UI)
```

---

## Track A -- Data Integrity (BLOCKS ALL TESTING)

### TASK-S33-001: Data migration script for currentPhase > 6
- **Assignee**: `dev-fullstack-1`
- **Priority**: P0
- **Est**: S (0.5h) -- ALREADY IMPLEMENTED
- **Status**: DONE
- **Description**: Script `scripts/fix-phase7-trips.ts` finds all trips where
  `currentPhase > 6` and updates them to `currentPhase = 6`. Supports `--dry-run`.
  Idempotent -- safe to run multiple times. Uses Prisma `updateMany` for batch
  efficiency.
- **Files**:
  - `scripts/fix-phase7-trips.ts`
- **Acceptance**:
  - `npx tsx scripts/fix-phase7-trips.ts --dry-run` reports affected trips
  - `npx tsx scripts/fix-phase7-trips.ts` caps all trips at 6
  - Verification query confirms 0 trips with `currentPhase > 6`
  - Script is idempotent (second run reports 0 affected)

### TASK-S33-002: Defensive guard clamping in phase-access.guard.ts
- **Assignee**: `dev-fullstack-1`
- **Priority**: P0
- **Est**: S (0.5h) -- ALREADY IMPLEMENTED
- **Status**: DONE
- **Description**: After reading `trip.currentPhase` from DB, clamp to
  `Math.min(rawPhase, TOTAL_ACTIVE_PHASES)` before passing to `resolveAccess`.
  Prevents stale data from causing navigation issues even without running the
  migration script.
- **Files**:
  - `src/lib/guards/phase-access.guard.ts`
- **Acceptance**:
  - Trip with `currentPhase = 7` in DB resolves to `safeCurrentPhase = 6`
  - All 6 phases remain accessible with correct access modes
  - Progress bar shows Phase 6 as "current" (not a ghost Phase 7)
  - Unit test covers clamping behavior

### TASK-S33-003: Verify Phase6Wizard auto-generation trigger
- **Assignee**: `dev-fullstack-1`
- **Priority**: P0
- **Est**: S (1h)
- **Description**: Verify that `Phase6Wizard` correctly auto-triggers itinerary
  generation on first visit (line 256-261). Confirm `syncPhase6CompletionAction`
  fires after `[DONE]` (line 204). Write a test that simulates the full flow:
  first visit -> auto-generate -> completion sync.
- **Files**:
  - `src/components/features/expedition/Phase6Wizard.tsx` (verify, no changes expected)
  - `tests/unit/components/features/expedition/Phase6Wizard.test.tsx` (add regression test)
- **Acceptance**:
  - Auto-generation triggers when `initialDays.length === 0`
  - `syncPhase6CompletionAction` called after `[DONE]` event
  - Regeneration (revisit) does not double-complete
  - Test verifies these behaviors

### TASK-S33-004: End-to-end verification of v0.27.1 fixes after data migration
- **Assignee**: `dev-fullstack-1` + `dev-fullstack-2`
- **Priority**: P0
- **Est**: M (2h)
- **Depends on**: TASK-S33-001, TASK-S33-002, TASK-S33-003
- **Description**: After running the migration script, verify all Sprint 32 fixes
  work correctly. Manual verification protocol (MANUAL-V) required for:
  - Phase transitions 1->2->3->4->5->6 (fresh trip)
  - Phase transitions on a trip that had currentPhase=7 (post-migration)
  - Reverse navigation (6->5->4->3->2, then forward)
  - Dashboard progress bar accuracy
  - Phase 3 checklist toggle -> status sync
  - Phase 6 auto-completion after generation
- **Acceptance**:
  - All 6 phase transitions work on both fresh and migrated trips
  - Dashboard shows correct completion state
  - No console errors, no stale data issues
  - Document results in sprint review

---

## Track B -- UX Foundation (IMP-001, IMP-002, IMP-003)

### TASK-S33-005: WizardFooter enhancement (Voltar/Salvar/Avancar + save dialog)
- **Assignee**: `dev-fullstack-2`
- **Priority**: P1
- **Est**: M (3h)
- **Description**: Enhance `WizardFooter` component to support a three-button
  layout: Voltar (back), Salvar (save draft), Avancar (advance to next phase).
  When user clicks Avancar with unsaved changes, show a confirmation dialog
  ("Deseja salvar antes de avancar?"). Add `onSave` callback prop. Ensure the
  footer remains sticky at bottom of viewport on mobile.
- **Files**:
  - `src/components/features/expedition/WizardFooter.tsx` -- add onSave prop,
    save confirmation dialog, three-button layout
  - `tests/unit/components/features/expedition/WizardFooter.test.tsx` -- update
- **Acceptance**:
  - WizardFooter renders Voltar / Salvar / Avancar when all three callbacks provided
  - WizardFooter renders Voltar / Avancar when onSave is not provided (backward compat)
  - Confirmation dialog shown when advancing with unsaved changes
  - All buttons have min-height 44px touch target
  - Existing tests pass, new tests for save flow

### TASK-S33-006: Phase 3 completion rules (mandatory checkboxes only)
- **Assignee**: `dev-fullstack-1`
- **Priority**: P1
- **Est**: M (2h)
- **Depends on**: TASK-S33-004 (verify syncPhaseStatus works)
- **Description**: Ensure Phase 3 completion is gated strictly by mandatory
  checklist items (items with `required: true`). Optional items should not block
  phase completion. Verify the existing `validatePhasePrerequisites` logic
  (phase-engine.ts line 481-492) is correct and add UI feedback showing how many
  mandatory items remain.
- **Files**:
  - `src/components/features/expedition/Phase3Wizard.tsx` -- add mandatory item counter
  - `tests/unit/components/features/expedition/Phase3Wizard.test.tsx` -- update
- **Acceptance**:
  - Phase 3 "Complete" button disabled when mandatory items remain unchecked
  - Counter shows "X of Y mandatory items completed"
  - Optional items do NOT block completion
  - Test covers: all mandatory done, some mandatory pending, no mandatory items

### TASK-S33-007: Phase 4 mandatory fields (transport, accommodation, mobility)
- **Assignee**: `dev-fullstack-2`
- **Priority**: P1
- **Est**: M (3h)
- **Description**: Add validation to Phase 4 (Logistics) requiring at least one
  transport segment and one accommodation record before the phase can be completed.
  Mobility selection should have at least one option selected. Show validation
  feedback in the UI (not just server-side errors).
- **Files**:
  - `src/components/features/expedition/Phase4Wizard.tsx` -- add validation checks
  - `src/lib/engines/phase-engine.ts` -- add Phase 4 prerequisite validation
    (extend `validatePhasePrerequisites` for phase 4)
  - `tests/unit/components/features/expedition/Phase4Wizard.test.tsx` -- update
  - `tests/unit/lib/engines/phase-engine.test.ts` -- update
- **Acceptance**:
  - Cannot complete Phase 4 without >= 1 transport segment
  - Cannot complete Phase 4 without >= 1 accommodation record
  - Cannot complete Phase 4 without >= 1 mobility option selected
  - Validation messages shown inline (not just toast on submit)
  - Advancing without completing (non-blocking skip) still allowed
  - Tests cover all validation scenarios

---

## Track C -- Summary Report Redesign (IMP-004)

### TASK-S33-008: Summary page accessible from Phase 2+
- **Assignee**: `dev-fullstack-2`
- **Priority**: P1
- **Est**: M (2h)
- **Description**: Currently the summary page (`/expedition/[tripId]/summary`) is
  only meaningful after Phase 6. Change access rules so the summary is available
  from Phase 2 onwards, showing whatever data has been collected so far. Empty
  phases should show placeholder cards with "Not started yet" messages.
- **Files**:
  - `src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx` -- relax phase guard
  - `src/components/features/expedition/ExpeditionSummary.tsx` -- add empty-state
    rendering for incomplete phases
  - `tests/unit/components/features/expedition/ExpeditionSummary.test.tsx` -- update
- **Acceptance**:
  - Summary page accessible when `trip.currentPhase >= 2`
  - Phase 1 data always shown (it's complete by Phase 2)
  - Incomplete phases show placeholder with phase name and "Not started" label
  - No errors when accessing summary with partially complete expedition
  - Quick-access link to summary visible in dashboard from Phase 2+

### TASK-S33-009: Complete data aggregation (all phases, all fields)
- **Assignee**: `dev-fullstack-2`
- **Priority**: P1
- **Est**: L (4h)
- **Depends on**: TASK-S33-008
- **Description**: Extend `ExpeditionSummaryService` to aggregate ALL user data
  from all phases, including fields that may currently be missing:
  - Phase 1: destination, origin, dates, trip type, coordinates
  - Phase 2: traveler type, accommodation style, pace, budget, passengers
  - Phase 3: checklist progress (done/total for each category)
  - Phase 4: all transport segments, all accommodations, mobility choices
  - Phase 5: destination guide sections (generated/not generated)
  - Phase 6: itinerary days with activity counts
- **Files**:
  - `src/server/services/expedition-summary.service.ts` -- extend aggregation
  - `tests/unit/server/expedition-summary.service.test.ts` -- update
- **Acceptance**:
  - Summary includes all fields listed above
  - Booking codes remain masked (existing behavior)
  - BOLA check enforced on all queries
  - Null/undefined fields handled gracefully (no crashes)
  - Tests cover full expedition, partial expedition, empty expedition

### TASK-S33-010: Pending items highlighting in summary
- **Assignee**: `dev-fullstack-2`
- **Priority**: P2
- **Est**: S (2h)
- **Depends on**: TASK-S33-009
- **Description**: In the summary view, highlight incomplete or pending items
  with a visual indicator (amber border, "Action needed" badge). Items that
  should trigger a highlight:
  - Phase 3: mandatory checklist items not completed
  - Phase 4: no transport/accommodation entered
  - Phase 5: guide not generated
  - Phase 6: itinerary not generated
  Each pending item should link to the relevant phase for quick correction.
- **Files**:
  - `src/components/features/expedition/ExpeditionSummary.tsx` -- add pending indicators
  - `tests/unit/components/features/expedition/ExpeditionSummary.test.tsx` -- update
- **Acceptance**:
  - Pending items have amber visual treatment
  - Each pending item links to the correct phase
  - Fully completed expeditions show no pending indicators
  - Tests cover mixed-state scenarios

---

## Track D -- Phase 6 Prompt Enrichment (IMP-005)

### TASK-S33-011: Collect all user data from phases 1-5 into prompt context
- **Assignee**: `dev-fullstack-1`
- **Priority**: P2
- **Est**: L (4h)
- **Description**: Currently `Phase6Wizard` passes basic trip data to the AI
  (destination, dates, style, budget, travelers, travelNotes). Enrich the prompt
  context with ALL available user data:
  - Origin city (for transit recommendations)
  - Passenger breakdown (adults, children, seniors -- affects activity suggestions)
  - Checklist items (what they've already planned for)
  - Transport segments (flight times affect Day 1/last day planning)
  - Accommodation locations (proximity-based activity suggestions)
  - Mobility choices (determines transport recommendations within itinerary)
  - Guide sections viewed (avoid repeating known info)
  - User preferences (travel pace, food preferences, interests)
- **Files**:
  - `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx` -- fetch additional data
  - `src/components/features/expedition/Phase6Wizard.tsx` -- pass new props
  - `src/app/api/ai/plan/stream/route.ts` -- accept and use enriched context
  - `src/lib/prompts/` -- update itinerary prompt template
- **Acceptance**:
  - AI prompt includes origin, passengers, checklist, transport, accommodation,
    mobility, preferences data when available
  - Missing data fields are omitted (not sent as null/empty)
  - Prompt remains within token budget (see TASK-S33-012)
  - Tests verify data collection and prompt assembly

### TASK-S33-012: Token budget analysis for enriched prompt
- **Assignee**: `dev-fullstack-1` (with prompt-engineer review)
- **Priority**: P2
- **Est**: M (2h)
- **Depends on**: TASK-S33-011
- **Description**: Analyze the token impact of the enriched prompt from
  TASK-S33-011. Current model: claude-sonnet-4-6 for plan generation. Measure:
  - Baseline token count (current prompt)
  - Enriched token count (with all phase data)
  - Cost delta per generation
  Determine if a model tier change or prompt compression is needed.
  Document findings and recommendation.
- **Files**:
  - `docs/specs/sprint-33/TOKEN-BUDGET-ANALYSIS.md` -- analysis document
- **Acceptance**:
  - Baseline and enriched token counts documented
  - Cost impact calculated (per-generation and monthly estimate)
  - Recommendation: proceed as-is, compress, or escalate to finops-engineer
  - prompt-engineer reviews and approves

---

## Track E -- Social Login (IMP-006)

### TASK-S33-013: Google OAuth provider setup
- **Assignee**: `dev-fullstack-1`
- **Priority**: P2
- **Est**: S (1h) -- PARTIALLY DONE
- **Description**: Google provider is already configured in `auth.config.ts`
  (line 11-12) and `auth.ts` (line 33-35) with `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` env vars. This task is to:
  1. Verify the provider works end-to-end with PrismaAdapter
  2. Ensure account linking works (existing email user signs in with Google)
  3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.example`
  4. Document the Google Cloud Console setup in `docs/dev-testing-guide.md`
- **Files**:
  - `.env.example` -- add Google OAuth env vars
  - `docs/dev-testing-guide.md` -- add Google OAuth setup instructions
  - `tests/unit/lib/auth-google.test.ts` -- new test for Google flow
- **Acceptance**:
  - Google sign-in creates a new user account if email doesn't exist
  - Google sign-in links to existing account if email matches
  - JWT session includes correct user ID after Google sign-in
  - No credentials hardcoded

### TASK-S33-014: Apple ID provider setup
- **Assignee**: `dev-fullstack-1`
- **Priority**: P3 (defer if time runs out)
- **Est**: M (3h)
- **Description**: Add Apple provider to Auth.js configuration. Apple requires
  additional setup (team ID, key ID, private key). This task includes:
  1. Add `AppleProvider` to `auth.config.ts` and `auth.ts`
  2. Add env vars: `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_PRIVATE_KEY`
  3. Handle Apple's "private email relay" for Hide My Email users
  4. Test account creation and linking
- **Files**:
  - `src/lib/auth.config.ts` -- add Apple provider
  - `src/lib/auth.ts` -- add Apple provider
  - `src/lib/env.ts` -- add Apple env vars (optional)
  - `.env.example` -- add Apple env vars
  - `tests/unit/lib/auth-apple.test.ts` -- new test
- **Acceptance**:
  - Apple sign-in creates user account
  - Private email relay handled (store relay address, not hidden)
  - JWT session correct after Apple sign-in
  - Account linking works with existing email
  - No credentials hardcoded
- **Risk**: Apple Developer Program membership required for testing.
  If not available, implement but mark as "needs Apple Dev account for E2E".

### TASK-S33-015: Social login UI (buttons on login/register pages)
- **Assignee**: `dev-fullstack-2`
- **Priority**: P2
- **Est**: M (2h)
- **Depends on**: TASK-S33-013
- **Description**: Add Google (and Apple if TASK-S33-014 is done) sign-in
  buttons to the login and register pages. Follow standard OAuth button
  guidelines (branded icons, correct sizing). Add a divider ("or continue
  with email") between social buttons and the credential form.
- **Files**:
  - `src/components/features/auth/SocialLoginButtons.tsx` -- new component
  - `src/components/features/auth/LoginForm.tsx` -- integrate SocialLoginButtons
  - `src/components/features/auth/RegisterForm.tsx` -- integrate SocialLoginButtons
  - `messages/en.json` -- add i18n keys
  - `messages/pt-BR.json` -- add i18n keys
  - `tests/unit/components/features/auth/SocialLoginButtons.test.tsx` -- new test
- **Acceptance**:
  - Google button visible on login and register pages
  - Apple button visible only if Apple provider is configured
  - Buttons use official brand colors and icons
  - "or continue with email" divider between social and credential forms
  - Buttons have min-height 44px touch target
  - Loading state shown while OAuth redirect is in progress
  - i18n keys in both locales

---

## Implementation Schedule

```
Day 1 (Track A -- data integrity, BLOCKS ALL):
  dev-fullstack-1: TASK-S33-001 (done) + TASK-S33-002 (done) + TASK-S33-003
  dev-fullstack-2: TASK-S33-005 (WizardFooter -- can start early)
  JOINT:           TASK-S33-004 (verification after 001/002/003 complete)

Day 2 (Track B -- UX foundation):
  dev-fullstack-1: TASK-S33-006 (Phase 3 completion rules)
  dev-fullstack-2: TASK-S33-007 (Phase 4 mandatory fields)

Day 3 (Track C -- summary + Track D start):
  dev-fullstack-1: TASK-S33-011 (prompt enrichment data collection)
  dev-fullstack-2: TASK-S33-008 (summary from Phase 2+) + TASK-S33-009 (aggregation)

Day 4 (Track C finish + Track D finish + Track E start):
  dev-fullstack-1: TASK-S33-012 (token budget) + TASK-S33-013 (Google OAuth)
  dev-fullstack-2: TASK-S33-010 (pending items) + TASK-S33-015 (social login UI)

Day 5 (Track E finish + buffer):
  dev-fullstack-1: TASK-S33-014 (Apple ID -- if time permits)
  dev-fullstack-2: Code review fixes, test coverage gaps
  tech-lead: Code review all PRs, final quality gate
```

---

## Hour Estimates

| Task | Track | Assignee | Est (h) | Priority |
|------|-------|----------|---------|----------|
| TASK-S33-001 | A | dev-fullstack-1 | 0.5 | P0 -- DONE |
| TASK-S33-002 | A | dev-fullstack-1 | 0.5 | P0 -- DONE |
| TASK-S33-003 | A | dev-fullstack-1 | 1 | P0 |
| TASK-S33-004 | A | joint | 2 | P0 |
| TASK-S33-005 | B | dev-fullstack-2 | 3 | P1 |
| TASK-S33-006 | B | dev-fullstack-1 | 2 | P1 |
| TASK-S33-007 | B | dev-fullstack-2 | 3 | P1 |
| TASK-S33-008 | C | dev-fullstack-2 | 2 | P1 |
| TASK-S33-009 | C | dev-fullstack-2 | 4 | P1 |
| TASK-S33-010 | C | dev-fullstack-2 | 2 | P2 |
| TASK-S33-011 | D | dev-fullstack-1 | 4 | P2 |
| TASK-S33-012 | D | dev-fullstack-1 | 2 | P2 |
| TASK-S33-013 | E | dev-fullstack-1 | 1 | P2 |
| TASK-S33-014 | E | dev-fullstack-1 | 3 | P3 |
| TASK-S33-015 | E | dev-fullstack-2 | 2 | P2 |
| **TOTAL** | | | **32** | |

dev-fullstack-1: ~16h (Tracks A, B-partial, D, E-partial)
dev-fullstack-2: ~16h (Tracks B-partial, C, E-partial)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| No trips with currentPhase > 6 in production (migration is a no-op) | Medium | None | Migration is idempotent, defensive guard covers all cases regardless |
| WizardFooter refactor breaks existing wizard pages | Medium | Medium | Run full test suite after change; WizardFooter has backward-compatible API |
| Token budget exceeds model context window with enriched prompt | Low | High | TASK-S33-012 analyzes before shipping; prompt-engineer reviews |
| Apple Developer account not available for testing | High | Low | Implement provider config but mark as "needs E2E verification"; Google is primary |
| Summary page performance with full aggregation query | Low | Medium | Use `select` clauses on all Prisma queries; add index if needed |
| Phase 4 mandatory validation breaks non-blocking skip flow | Medium | High | Validation only blocks `completePhase`, NOT `advanceFromPhase` |

---

## Definition of Done

- [ ] All P0 tasks (TASK-S33-001 through TASK-S33-004) complete and verified
- [ ] All P1 tasks complete with tests
- [ ] P2 tasks complete or documented as deferred
- [ ] Code review approved by tech-lead
- [ ] Test coverage >= 80% on new/modified service and schema files
- [ ] `npm run build` passes cleanly
- [ ] `npm run test` -- 0 failures
- [ ] `npm run lint` -- 0 errors
- [ ] No hardcoded credentials or PII exposure
- [ ] All new i18n keys in both en + pt-BR
- [ ] Security checklist passed (no XSS, CSRF, BOLA in new endpoints)
- [ ] Manual verification: full expedition flow Phase 1-6 works
- [ ] Manual verification: summary page from Phase 2+
- [ ] Manual verification: social login (Google at minimum)
- [ ] Merged to main via PR
- [ ] Tagged as v0.28.0
- [ ] Sprint review completed by all required agents

---

## Key Technical Notes for Developers

### Data Migration: Run Before Testing
```bash
# Dry run first
npx tsx scripts/fix-phase7-trips.ts --dry-run

# Apply fix
npx tsx scripts/fix-phase7-trips.ts
```

### Defensive Guard Pattern (already applied)
```typescript
// phase-access.guard.ts -- clamp to valid range
const rawPhase = typeof trip.currentPhase === "number" && trip.currentPhase >= 1
  ? trip.currentPhase : 1;
const safeCurrentPhase = Math.min(rawPhase, TOTAL_ACTIVE_PHASES);
```

### WizardFooter Backward Compatibility
The enhanced WizardFooter MUST remain backward compatible. When `onSave` is not
provided, it should render the existing two-button layout (Voltar + Avancar).
Only show the three-button layout when `onSave` is explicitly passed.

### Phase 4 Validation vs Skip
Phase 4 is non-blocking. The mandatory field validation should ONLY apply when
the user explicitly clicks "Complete Phase" (if such a button exists). The
"Advance" (skip) action must remain unblocked.

### Social Login: Existing Config
Google provider is already in `auth.config.ts` and `auth.ts`. The implementation
work is mostly UI + testing + documentation. No architectural changes needed.
