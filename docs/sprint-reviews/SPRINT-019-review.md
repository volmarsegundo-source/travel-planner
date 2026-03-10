# Sprint 19 Review -- Tech Lead

**Reviewer:** tech-lead
**Date:** 2026-03-10
**Branch:** `feat/sprint-19`
**Version:** v0.12.0 -> v0.13.0

---

## Executive Summary

Sprint 19 delivered critical bug fixes for the streaming itinerary pipeline, hub navigation, dashboard progress counting, and the high-priority LGPD compliance fix for cascade deletion (SEC-S18-001). The streaming fix was the largest workstream, spanning three sub-tasks: server-side persistence after stream completion, a progress UI replacing the raw JSON display, and a key-prop technique to force React remount after data refresh. All three parts are well-integrated and follow existing project patterns.

Beyond P0 bugs, the sprint delivered several UX improvements: auto-advance on phase transitions, bio display in the Phase 1 confirmation screen, destination deduplication in autocomplete, a card-based destination guide redesign with stat/content section types, and a currency formatting utility with locale-aware defaults. The guide system prompt was expanded from 6 to 10 sections with proper Zod validation on both new types (GuideSectionType, GuideSectionKey).

Two planned tasks were NOT delivered: T-S19-007 (remove duplicate Checklist/Roteiro buttons in ExpeditionCard) and T-S19-008 (Phase 1 step reorder -- personal info before trip info). These must carry over to Sprint 20. Additionally, task numbering in commits diverged from the planning document (SPRINT-19-TASKS.md), making traceability harder. The security review found no MEDIUM or higher findings and confirmed SEC-S18-001 as RESOLVED.

---

## Task Completion Table

| Planning ID | Commit ID | Description | Assignee | Status | Notes |
|-------------|-----------|-------------|----------|--------|-------|
| T-S19-001a | T-S19-001a (d9f10b3) | Stream progress UI (parse JSON into progress indicators) | dev-fullstack-1 | DONE | Progress phases, day counting, skeleton loaders |
| T-S19-001b | T-S19-001b (7a2c734) | Persist itinerary in DB after stream completion | dev-fullstack-1 | DONE | Extracted itinerary-persistence.service.ts, Redis lock, Zod validation |
| T-S19-001c | T-S19-001c (c04bc83) | Fix useState stale state with key prop | dev-fullstack-1 | DONE | key={`phase6-${trip.itineraryDays.length}`} on Phase6Wizard |
| T-S19-002 | T-S19-002 (bce792d) | Fix hub redirect for completed trips | dev-fullstack-2 | DONE | Added getHighestCompletedPhase() to PhaseEngine |
| T-S19-003 (SEC-S18-001) | T-S19-007 (782845b) | Cascade delete Activity/ItineraryDay/ChecklistItem | dev-fullstack-2 | DONE | FK order correct, atomic transaction, BOLA scoped |
| T-S19-004 | T-S19-003 (f55b70c) | Fix completedPhases count in dashboard | dev-fullstack-2 | DONE | Math.max(explicit count, currentPhase - 1) |
| T-S19-005 | T-S19-005 (0582700) | Show bio in Phase1Wizard confirmation | dev-fullstack-2 | DONE | Bio truncated at 100 chars, conditional display |
| T-S19-006 (guide redesign) | T-S19-008/009 (bdae35e, 78c1247, ad30bc9) | Guide redesign: 10 sections, card layout, dashboard cards | dev-fullstack-2 | DONE | stat vs content section types, expandable cards |
| T-S19-007 (remove duplicates) | -- | Remove duplicate Checklist/Roteiro buttons in ExpeditionCard | dev-fullstack-2 | NOT DONE | Carry to Sprint 20 |
| T-S19-008 (Phase 1 reorder) | -- | Reorder Phase 1: personal info before trip info | dev-fullstack-1 | NOT DONE | Carry to Sprint 20 |
| T-S19-009 | T-S19-004 (27d7a03) | Auto-advance PhaseTransition (2s timer) | dev-fullstack-1 | DONE | onContinueRef pattern, cleanup on unmount |
| T-S19-010 (default currency) | T-S19-011 (f3d7a7b) | Locale-based default currency + formatCurrency utility | dev-fullstack-1 | DONE | getDefaultCurrency() + formatCurrency() in currency.ts |
| T-S19-006 (dedup) | T-S19-006 (f0b69f8) | Deduplicate destinations in autocomplete | dev-fullstack-2 | DONE | city+state+country key, keep highest importance |
| T-S19-011 (clickable progress) | -- | Progress bar clickable segments | dev-fullstack-1 | NOT DONE | P2 -- deferred |
| T-S19-012 (phase labels) | -- | Progress bar phase labels | dev-fullstack-2 | NOT DONE | P2 -- deferred |

**Summary: 10 of 12 planned tasks delivered. 2 P1 tasks (duplicate buttons, Phase 1 reorder) not done. 2 P2 tasks deferred as expected.**

---

## Test Metrics

| Metric | Before (v0.12.0) | After | Delta |
|--------|-------------------|-------|-------|
| Tests | 1288 | 1365 | +77 |
| Suites | 89 | 94 | +5 |
| Failures | 0 | 0 | 0 |

New test files added:
- `tests/unit/lib/stream-progress.test.ts` (20 tests) -- stream parsing, progress phases, day counting
- `tests/unit/lib/utils/currency.test.ts` (67 lines) -- getDefaultCurrency, formatCurrency
- `tests/unit/server/itinerary-persistence.service.test.ts` (249 lines) -- persistence, parsing, lock acquire/release

Existing test files significantly updated:
- `tests/unit/api/ai/plan/stream-route.test.ts` (+166 lines) -- persistence integration, error paths
- `tests/unit/server/account.actions.test.ts` (+69 lines) -- cascade deletion coverage
- `tests/unit/lib/engines/phase-engine.test.ts` (+48 lines) -- getHighestCompletedPhase
- `tests/unit/server/trip.service.test.ts` (+79 lines) -- completedPhases count logic
- `tests/unit/api/destinations-search-route.test.ts` (+60 lines) -- deduplication logic

---

## Security Review Summary

**Verdict:** APPROVED (by security-specialist, 2026-03-10)

**Key findings:**
- SEC-S18-001 (MEDIUM): **RESOLVED**. ItineraryDay, Activity, and ChecklistItem are now explicitly deleted within the account deletion transaction. FK constraint order (Activities before ItineraryDays) is correct. All models referencing Trip directly or transitively are covered. No orphaned data remains.
- SEC-S19-001 (LOW, pre-existing): Raw userId in logger calls in phase-engine.ts (4 locations), points-engine.ts (4 locations), itinerary-plan.service.ts (1 location). Not a Sprint 19 regression. Carried as debt.
- Redis lock implementation: PASS. NX + EX ensures atomicity and deadlock prevention. Lock released in all code paths (success, error, finally).
- BOLA checks: PASS on all new endpoints and methods. Streaming persistence uses the same validated tripId from the BOLA check.

**Reference:** `docs/security/SPRINT-19-SECURITY-REVIEW.md`

---

## Code Review Findings

### Quality: APPROVED WITH NOTES

#### Positive Observations

1. **stream-progress.ts** is a clean, well-separated utility with pure functions and no side effects. Good use of heuristic pattern matching for partial JSON day counting. The 95% cap on progress prevents the bar from completing before actual data is saved.

2. **itinerary-persistence.service.ts** demonstrates good architectural extraction. The function was correctly pulled from the private scope of ai.actions.ts into a shared service with "server-only" directive. The multi-strategy JSON parsing (direct, code fence, raw extraction) is resilient to AI output variance. Zod validation before DB write is correct.

3. **Phase6Wizard.tsx** refactor is thorough. The raw `<pre>` display is fully eliminated. The progress UI uses `aria-live="polite"`, `role="progressbar"`, and `role="status"` for accessibility. The `accumulatedRef` is kept as a ref (not state) since it is not displayed -- correct optimization.

4. **PhaseTransition.tsx** auto-advance is well-implemented. The `onContinueRef` pattern avoids stale closure problems. Manual click properly cancels the timer. Cleanup on unmount prevents memory leaks.

5. **Cascade deletion** follows the exact FK constraint order documented in the task spec. The `if (tripIds.length > 0)` guard prevents unnecessary DB calls for users with no trips.

6. **Import conventions**: All Sprint 19 component files correctly use `@/i18n/navigation` for useRouter. The only `next/navigation` imports in components are the pre-existing exceptions (LoginForm useSearchParams, layout notFound).

#### Issues Found

1. **Task number mismatch in commits vs planning doc (PROCESS)**: Commit messages use different task IDs than SPRINT-19-TASKS.md. For example, commit T-S19-007 is actually planning T-S19-003 (cascade deletion), commit T-S19-008 is the guide expansion (planning T-S19-006). This breaks traceability. Going forward, commits MUST use the planning document task IDs. If task scope changes, update the planning doc first.

2. **ExpeditionCard still has duplicate buttons (DEBT-S18-001 unresolved)**: Lines 82-103 of ExpeditionCard.tsx still render manual Checklist and Itinerary shortcuts alongside PhaseToolsBar. T-S19-007 (planning doc) was not implemented. This remains as technical debt.

3. **Phase1Wizard step order unchanged (T-S19-008 not done)**: The step order remains Destination -> Dates -> About You -> Confirmation. The planned reorder to About You first was not implemented. Carry to Sprint 20.

#### Minor Notes (non-blocking)

1. **PhaseTransition auto-advance delay**: The constant `AUTO_ADVANCE_DELAY_MS = 2000` is 2 seconds, but the task spec says 3 seconds. This is minor and arguably better for UX, but should be documented as intentional deviation.

2. **`eslint-disable @typescript-eslint/no-unused-vars`** in destinations/search/route.ts line 106 for destructuring `importance` out of the result. Consider using `_importance` naming convention instead of eslint-disable.

3. **`_generationCount` prefixed with underscore** in DestinationGuideWizard.tsx line 58 to suppress unused warning. This is acceptable but suggests the state is not being used for display yet -- consider removing if not needed, or adding generation count display.

4. **`phase-engine.ts` raw userId in logs** (SEC-S19-001): Pre-existing debt confirmed by security review. 9 occurrences across 3 files. Estimate 1h to fix.

5. **`ExpeditionHubPage` coming soon section** (lines 57-63) uses hardcoded emoji `\u{1F680}` and no dark mode text colors (`text-gray-900`, `text-gray-500`). Should use `text-foreground` / `text-muted-foreground` for theme consistency.

---

## Security & Privacy Checklist

- [x] No hardcoded credentials, tokens, or API keys
- [x] All inputs validated and sanitized (Zod schemas on all endpoints)
- [x] PII data not logged or exposed in responses (hashUserId in all Sprint 19 logger calls)
- [x] Auth/authz correctly enforced (BOLA checks on all data access paths)
- [x] No SQL injection, XSS, or CSRF vectors introduced
- [x] SEC-S18-001 resolved: cascade deletion covers all child models

## Bias & Ethics Checklist

- [x] Currency default based on locale, not nationality (non-discriminatory)
- [x] Progress messages neutral and inclusive
- [x] No discriminatory logic in redirect flows
- [x] No dark patterns in auto-advance (manual button remains visible)

---

## Items Deferred to Sprint 20

| Item | Priority | Reason |
|------|----------|--------|
| T-S19-007: Remove duplicate Checklist/Roteiro buttons | P1 | Not implemented this sprint |
| T-S19-008: Phase 1 step reorder (personal info first) | P1 | Not implemented this sprint |
| T-S19-011: Clickable progress bar segments | P2 | Deprioritized as planned |
| T-S19-012: Progress bar phase labels | P2 | Deprioritized as planned |
| SEC-S19-001: hashUserId in gamification engines (9 occurrences) | LOW | Pre-existing debt, not regression |
| ITEM-10: Traveler count adult/child/senior breakdown | P2 | Deferred from Sprint 19 planning |
| ITEM-12: Expanded personal preferences with toggles | P2 | Deferred from Sprint 19 planning |
| ExpeditionHubPage dark mode colors | P3 | Minor UI inconsistency |

---

## Lessons Learned

1. **Task ID discipline**: Commit task IDs MUST match the planning document. When the scope of a task changes during implementation, update SPRINT-XX-TASKS.md before committing. The mismatch in this sprint required manual reconciliation during review and reduces auditability.

2. **Streaming persistence as a service**: Extracting `persistItinerary` from a private function in ai.actions.ts to a shared service (`itinerary-persistence.service.ts`) was the right architectural call. The multi-strategy JSON parser is a pragmatic approach to handling AI output variance. This pattern should be documented in architecture.md as a reference.

3. **Key prop for React remount**: The `key={phase6-${count}}` pattern is a clean solution for the stale-useState problem after router.refresh(). This is a recurring Next.js App Router pattern and should be shared with the team.

4. **Redis lock for generation dedup**: The NX + EX lock with graceful degradation (proceed without lock if Redis fails) is a good availability-over-consistency tradeoff for a non-critical operation (worst case: two plans overwrite each other). Worth reusing for other long-running AI operations.

5. **Two P1 tasks missed**: T-S19-007 (duplicate buttons) and T-S19-008 (Phase 1 reorder) were not delivered. Root cause appears to be the guide redesign (T-S19-006/008/009) taking more scope than estimated. Future sprints should track scope creep during mid-sprint check-ins.

---

## Definition of Done

- [x] 10 of 12 tasks completed (2 P1 deferred, 2 P2 deferred as planned)
- [x] Code review approved by tech-lead (this document)
- [x] Test coverage target met: 1365 tests, 0 failures, 5 new test suites
- [x] Security checklist passed -- SEC-S18-001 RESOLVED
- [x] Bias & ethics checklist passed
- [x] No import convention violations in Sprint 19 code
- [x] Build passes without errors
- [ ] PR merged to main via feature branch -- PENDING (awaiting merge)
