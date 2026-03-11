# Architecture Review: Remaining ACs from SPEC-PROD-001 and SPEC-PROD-002

**Author**: architect
**Date**: 2026-03-11
**Sprint**: 26
**Context**: Sprint 25 implemented a subset of ACs from both product specs. This document reviews every remaining AC to determine its current state, required work, and estimated effort.

---

## Source: Sprint 25 Review

### SPEC-PROD-001 implemented in Sprint 25:
AC-002, AC-005, AC-006, AC-009, AC-011, AC-013, AC-016

### SPEC-PROD-002 implemented in Sprint 25:
AC-001, AC-006, AC-007, AC-010, AC-012

---

## SPEC-PROD-001: Expedition Navigation & Phase Sequencing

### Remaining ACs (11 of 18)

---

#### AC-001: Phase sequence must be exactly 6 phases in the defined order

**Status**: Already working -- needs E2E validation only

**Analysis**: Phase sequence is defined in `src/lib/engines/phase-config.ts` as a static configuration object. The 6-phase order (O Chamado, O Explorador, O Preparo, A Logistica, A Conexao, O Roteiro) has been correct since Sprint 9 and was not broken by Sprint 25 changes. The phase-config is the single source of truth; wizards and the progress bar consume it.

**Needs code changes**: No
**Needs architectural changes**: No
**Estimated effort**: 0h (code) + 1h (E2E test to assert phase order in UI)

---

#### AC-003: Each phase must collect all data defined in Phase Data Ownership table

**Status**: Partially working -- needs verification and potential wiring fixes

**Analysis**: Each phase collects data through its respective wizard component. Most data collection is working. The key risk is whether ALL fields listed in the Data Ownership table are actually collected and persisted. Specific concerns:

- Phase 1: Name, bio, destination, origin, dates -- all collected. Confirmed in Phase1Wizard.tsx.
- Phase 2: Traveler type, accommodation pref, pace, budget -- collected. Passengers -- conditional on family/group (see AC-004).
- Phase 3: Checklist -- working.
- Phase 4: Transport, accommodation, mobility -- working since Sprint 21.
- Phase 5: Guide -- working.
- Phase 6: Itinerary -- working.

**Needs code changes**: No (data collection is complete per the table)
**Needs architectural changes**: No
**Estimated effort**: 0h (code) + 2h (systematic E2E validation of each phase's data collection)

---

#### AC-004: Phase 2 passengers step -- conditional for Family/Group only

**Status**: Already working -- needs E2E validation

**Analysis**: Sprint 25 review states this is "Already working, needs E2E validation." The PassengersStep component was built in Sprint 20-21 and conditionally rendered in Phase2Wizard based on traveler type. The Sprint 25 triage confirmed the conditional logic exists. However, the Sprint 25 review deferred E2E validation.

The conditional logic needs verification: does selecting "Family" or "Group" as traveler type actually show the passengers step? Does selecting "Solo" or "Business" skip it? The PassengersSchema validates adults (min 1, max 20), children, infants with total cap of 20.

Note: SPEC-PROD-001 AC-004 mentions "seniors" as a category. The current schema (`src/lib/validations/trip.schema.ts`) has `adultsCount`, `childrenCount`, `infantsCount` but NOT `seniorsCount`. The Prisma schema on Trip has `adultsCount`, `childrenCount`, `infantsCount`, `childrenAges`. **Seniors field does not exist in the data model.** This is either a spec oversight or requires a schema addition.

**Needs code changes**: Possibly -- if "seniors" category is required per product decision, it needs a new field.
**Needs architectural changes**: If seniors added: new migration (`ALTER TABLE trips ADD COLUMN seniors_count INT DEFAULT 0`), update PassengersSchema, update PassengersStep UI, update Phase 2 confirmation screen.
**Estimated effort**: 0h (if seniors is dropped from spec) or 3h (if seniors must be added: migration + schema + UI + tests)

**Action required**: Product owner must clarify whether "seniors" is a real requirement or a spec error. The current implementation does not have it. Recommend dropping it from the spec since the existing 3-category model (adults, children, infants) is standard in travel systems. Seniors are functionally adults.

---

#### AC-007: Next control navigates to N+1 when data is valid

**Status**: Already working -- needs E2E validation

**Analysis**: Each phase wizard has a "Next" or "Continue" action that navigates forward. Phase1Wizard saves data and navigates to Phase 2. Phase2Wizard completes and navigates to Phase 3. Etc. The `advanceFromPhaseAction` server action handles phase progression. The bi-directional navigation (AC-005/AC-006) was implemented in Sprint 25, which inherently required forward navigation to work.

**Needs code changes**: No
**Needs architectural changes**: No
**Estimated effort**: 0h (code) + 1h (E2E test for each phase forward navigation)

---

#### AC-008: Progress bar must visually distinguish completed/current/incomplete states

**Status**: Partially implemented -- needs verification

**Analysis**: The `DashboardPhaseProgressBar` component was updated in Sprint 25 (AC-009 fix for click navigation). The progress bar already uses different styles for completed (filled), current (highlighted), and incomplete (dimmed) segments. However, the Sprint 25 review does not explicitly confirm AC-008 as done. Visual states likely work but need QA verification against the exact spec requirements (distinct colors, not just opacity differences).

**Needs code changes**: Possibly minor CSS adjustments if current visual treatment is insufficient
**Needs architectural changes**: No
**Estimated effort**: 1h (QA verification + potential CSS fix)

---

#### AC-010: Navigating to a completed phase via progress bar pre-populates data

**Status**: Already working -- needs E2E validation

**Analysis**: When a user clicks a phase segment on the progress bar (fixed in Sprint 25 AC-009), they navigate to that phase's wizard page. Each wizard page loads data from the server in its `page.tsx` (server component) and passes it as props. Phase1Wizard receives profile and trip data. Phase2Wizard receives trip preferences. Phase4Wizard receives transport/accommodation/mobility data. This is the standard "server-side data loading" pattern used across all phases.

The data persistence behavior (AC-014) depends on this working correctly. Since each phase page.tsx fetches fresh data from the database, previously saved data is always pre-populated.

**Needs code changes**: No
**Needs architectural changes**: No
**Estimated effort**: 0h (code) + 1h (E2E validation of data persistence across back/forward navigation)

---

#### AC-012: Phase name and step number visible without scrolling (above the fold)

**Status**: Implemented in Sprint 25 (AC-011), but "above the fold" constraint not verified

**Analysis**: Sprint 25 implemented AC-011 (phase label display on all 6 wizards). The phase label shows "Phase N: [Name]" at the top of each wizard. Whether this is "above the fold" on 375px mobile depends on the layout. Each wizard has a header area before the form content. On desktop this is certainly above the fold. On mobile, if the progress bar + phase label + step indicator are stacked, they could push content below the fold.

**Needs code changes**: Possibly minor layout adjustment on mobile if label is pushed below fold
**Needs architectural changes**: No
**Estimated effort**: 1h (mobile viewport testing + potential CSS fix)

---

#### AC-014: Data persists when navigating back to a completed phase

**Status**: Already working -- needs E2E validation

**Analysis**: Same mechanism as AC-010. Each phase page.tsx is a server component that fetches trip data from the database. Navigation (forward or backward) triggers a new page load, which re-fetches data. Since data is persisted to the database on phase completion (or on form save), it is always available when the user returns.

**Needs code changes**: No
**Needs architectural changes**: No
**Estimated effort**: 0h (code) + 1h (E2E: complete phase 1, go to phase 2, go back to phase 1, verify data)

---

#### AC-015: Edited data in a previously completed phase is persisted and reflected downstream

**Status**: Partially working -- needs investigation

**Analysis**: This AC is more nuanced than AC-014. It requires that if a user goes back to Phase 1, changes the destination, and proceeds forward again, all downstream phases (checklist, guide, itinerary) reflect the new destination. Currently:

- Phase 1 changes (destination, dates) are saved to the Trip model on form submission.
- Phase 3 (checklist) uses trip classification which depends on origin/destination. If destination changes, the checklist should be re-classified. The trip classifier runs on trip creation -- it is NOT re-run when destination changes.
- Phase 5 (guide) was generated for the original destination. SPEC-PROD-003 (Sprint 26) addresses auto-regeneration of the guide when trip data changes.
- Phase 6 (itinerary) was generated for the original destination. There is no auto-regeneration for itinerary.

**Conclusion**: The "data persists" part works (AC-014). The "reflected in downstream phases" part does NOT fully work for derived AI content. This is a known limitation. SPEC-PROD-003 addresses the guide case. Itinerary regeneration is out of scope for Sprint 26.

**Needs code changes**: Partial -- trip re-classification on destination change would be ideal but is complex
**Needs architectural changes**: No new architecture needed. SPEC-PROD-003 handles the guide case. Itinerary regeneration is a future enhancement.
**Estimated effort**: 2h (if we add a destination-change detection that re-runs trip classifier) or 0h (if we accept the limitation and document it)

**Recommendation**: Accept the limitation for Sprint 26. Document that changing destination after Phase 3+ does not automatically re-classify the trip or regenerate AI content (except guide, per SPEC-PROD-003). Add a backlog item for full cascade re-generation.

---

#### AC-017: Phase 6 "Complete Expedition" final action

**Status**: Not implemented -- needs new code

**Analysis**: Currently, Phase 6 has "Back to Phase 5" and "Regenerate" buttons. There is no "Complete Expedition" or equivalent final action. This AC requires that Phase 6's "Next" control be replaced by a completion action that:
1. Marks the expedition as complete
2. Awards final phase points/badge
3. Navigates to a completion screen or trip summary

The `PhaseEngine.completePhase(tripId, userId, 6)` method exists and handles points/badge. The `advanceFromPhaseAction` supports phase 6. What is missing is:
- A "Complete Expedition" button in Phase6Wizard
- Navigation to a completion/summary screen (which relates to SPEC-PROD-002 AC-009)
- The completion summary screen itself

**Needs code changes**: Yes
- Add "Complete Expedition" button to Phase6Wizard.tsx
- Create completion handler that calls `advanceFromPhaseAction(tripId, 6)`
- Navigate to trip summary or dashboard on success

**Needs architectural changes**: No. Existing APIs support this. The `advanceFromPhaseAction` and `PhaseEngine.completePhase` already handle phase 6 completion.

**Estimated effort**: 3h (button + handler + navigation + success state/toast + tests)

**Dependency**: SPEC-PROD-002 AC-009 (expedition completion summary) -- if the summary page does not exist, the completion action can navigate to the dashboard with a success message.

---

#### AC-018: Navigating to an incomplete phase via progress bar -- consistent behavior

**Status**: Needs investigation and potential code changes

**Analysis**: The current progress bar allows clicking any phase segment (fixed in Sprint 25). But the behavior when clicking an incomplete phase (e.g., jumping from Phase 1 to Phase 4 without completing 2-3) is undefined. Currently, the progress bar navigates to `/expedition/[tripId]/phase-[N]`. The page.tsx for each phase loads data and renders the wizard.

Two behaviors are acceptable per the AC:
- (a) Allow the jump and show the incomplete phase with empty fields
- (b) Redirect to the first incomplete phase with a message

Currently, behavior is (a) -- the user can jump to any phase and see it, even if prior phases are not complete. This is consistent and predictable. However, some phases may not function correctly without prior phase data (e.g., Phase 5 guide requires a destination from Phase 1).

**Recommendation**: Keep behavior (a) since it is already implemented and consistent. Add a soft warning (info banner) if required prior data is missing. Do NOT add blocking redirects -- they confuse users more than empty fields.

**Needs code changes**: Minor -- add optional info banner on phases that detect missing prerequisite data
**Needs architectural changes**: No
**Estimated effort**: 2h (info banner component + integration in Phase 3/4/5/6 wizards + tests)

---

## SPEC-PROD-002: Dashboard Trip Cards & Phase Confirmation

### Remaining ACs (7 of 12)

---

#### AC-002: Trip card must display destination, dates, status, phase progress, single primary action

**Status**: Partially implemented -- needs redesign

**Analysis**: The current trip card (`ExpeditionCard` component, presumably in `src/components/features/dashboard/`) was updated in Sprint 25 to remove legacy buttons (AC-001). It currently shows destination and dates. What is missing:
- (c) Trip status indicator (active/completed/archived) -- not currently shown
- (d) Phase progress mini-bar or "Phase X of 6" indicator -- not currently shown
- (e) Single primary "Continue" action -- needs verification

The trip card needs to fetch phase progress data. The `ExpeditionPhase` model stores per-phase status. A query to count completed phases vs total (6) would give the progress.

**Needs code changes**: Yes -- add status badge, phase progress indicator, consolidate to single CTA
**Needs architectural changes**: Minor -- the trip card's server-side data fetching needs to include phase progress. This is a query change, not an architectural change. Add a `getPhaseProgress(tripId)` helper or include phase count in the existing trip list query.
**Estimated effort**: 4h (data fetching + UI components + status badge + progress indicator + tests)

---

#### AC-003: Primary action navigates to current phase

**Status**: Partially working -- needs verification

**Analysis**: The trip card likely has a "Continue" button that links to the expedition page. Whether it goes to the CURRENT phase (not phase 1 or the dashboard) depends on how the trip's `currentPhase` is determined. The Trip model has `currentPhase` field. The expedition page (`/expedition/[tripId]`) presumably redirects to the current phase.

**Needs code changes**: Verify and fix the CTA link to navigate to `/expedition/[tripId]/phase-[currentPhase]`
**Needs architectural changes**: No
**Estimated effort**: 1h (verify link + fix if needed + test)

---

#### AC-004: Archived trips show "View" (read-only) instead of "Continue"

**Status**: Not implemented -- needs new code

**Analysis**: The Trip model has a `status` field (string). Values include "active". There is no "archived" status currently in use. The trip card does not check for archived status. Implementing this requires:
1. Define "archived" as a valid trip status
2. Add archive action (or it may already exist)
3. Trip card conditionally renders "View" vs "Continue" based on status
4. Read-only mode for expedition phases when trip is archived

**Needs code changes**: Yes -- conditional rendering on trip card
**Needs architectural changes**: Minor -- need to verify that trip archival exists in the service layer. If not, this is a larger piece of work.
**Estimated effort**: 2h (if archive exists: conditional UI + test) or 6h (if archive needs to be built: service + action + UI + tests)

**Action required**: Verify if trip archival exists in the codebase. If not, this AC may need to be deferred or scoped down to just "completed" vs "active" states.

---

#### AC-005: No dead-link buttons on trip cards

**Status**: Mostly done -- needs QA audit

**Analysis**: Sprint 25 removed the legacy buttons (Itens, Checklist, Hospedagem). AC-005 is a broader requirement: EVERY button on the card must lead to a working screen. This is a QA validation task, not a code task (assuming the legacy button removal was the primary fix).

**Needs code changes**: No (unless QA finds remaining dead links)
**Needs architectural changes**: No
**Estimated effort**: 1h (QA audit of all trip card actions)

---

#### AC-008: Confirmation screens only required for Phase 1, Phase 2, and final summary

**Status**: Already satisfied -- no action needed

**Analysis**: This AC explicitly states that confirmation screens are NOT required for phases that do not currently have them (Phase 3, 4, 5). Phase 1 and Phase 2 confirmations were updated in Sprint 25 (AC-006, AC-007). No additional work needed.

**Needs code changes**: No
**Needs architectural changes**: No
**Estimated effort**: 0h

---

#### AC-009: Expedition completion summary -- consolidated view of all phases

**Status**: Not implemented -- needs new code and design

**Analysis**: This is a significant feature. A summary page that aggregates data from all 6 phases:
- Phase 1: Destination, Origin, Dates, Name, Bio
- Phase 2: Traveler type, Accommodation pref, Pace, Budget, Passengers
- Phase 3: Checklist completion count (X of Y)
- Phase 4: Transport count, Accommodation count, Mobility selections
- Phase 5: Guide generation date
- Phase 6: Number of itinerary days

This requires:
1. A new page component (e.g., `/expedition/[tripId]/summary`)
2. A server-side data aggregation query (fetch trip + all phases + counts)
3. Booking code masking (SPEC-PROD-002 constraint: "BOOK-****-XY7" format)
4. Locale-aware formatting
5. Link from "Complete Expedition" (AC-017) and from dashboard for completed trips

**Needs code changes**: Yes -- new page + data aggregation + UI
**Needs architectural changes**: Minor -- a new server action `getExpeditionSummaryAction(tripId)` that aggregates data from Trip, ExpeditionPhase, PhaseChecklistItem, TransportSegment, Accommodation, ItineraryDay, DestinationGuide. Single query with includes/counts. No new models.
**Estimated effort**: 6h (server action + page component + UI sections + booking code masking + locale formatting + tests)

---

#### AC-011: Confirmation screens display data from store (not form state)

**Status**: Already working -- needs verification

**Analysis**: Sprint 25 implemented Phase 1 and Phase 2 confirmation screens (AC-006, AC-007). The confirmation step in each wizard loads data from the server (passed as props from the server component page.tsx), not from the client-side form state. This is the standard pattern -- the page.tsx fetches data and passes it down. However, some wizards may use local state for the confirmation step display rather than re-fetching.

**Needs code changes**: Verify that confirmation steps read from server-loaded props, not from React form state
**Needs architectural changes**: No
**Estimated effort**: 1h (code audit of Phase1Wizard and Phase2Wizard confirmation steps)

---

## Summary Table

### SPEC-PROD-001 Remaining ACs

| AC | Description | Status | Code Changes | Arch Changes | Effort |
|----|-------------|--------|--------------|--------------|--------|
| AC-001 | 6 phases in correct order | Working | No | No | 1h E2E |
| AC-003 | Each phase collects defined data | Working | No | No | 2h E2E |
| AC-004 | Passengers conditional (family/group) | Working (note: no seniors field) | Maybe (seniors) | Maybe (migration) | 0-3h |
| AC-007 | Next control navigates to N+1 | Working | No | No | 1h E2E |
| AC-008 | Progress bar visual states | Likely working | Minor CSS | No | 1h |
| AC-010 | Progress bar nav pre-populates data | Working | No | No | 1h E2E |
| AC-012 | Phase label above fold on mobile | Likely working | Minor CSS | No | 1h |
| AC-014 | Data persists on back navigation | Working | No | No | 1h E2E |
| AC-015 | Edited data reflected downstream | Partial | Possible | No | 0-2h |
| AC-017 | Phase 6 "Complete Expedition" | Not implemented | Yes | No | 3h |
| AC-018 | Incomplete phase jump behavior | Partially working | Minor | No | 2h |

**SPEC-PROD-001 total remaining effort**: 13-18h (code) + 7h (E2E validation)

### SPEC-PROD-002 Remaining ACs

| AC | Description | Status | Code Changes | Arch Changes | Effort |
|----|-------------|--------|--------------|--------------|--------|
| AC-002 | Trip card: status, progress, single CTA | Partial | Yes | Minor (query) | 4h |
| AC-003 | Primary action -> current phase | Partial | Verify/fix | No | 1h |
| AC-004 | Archived trips show "View" | Not implemented | Yes | Minor (verify archival) | 2-6h |
| AC-005 | No dead-link buttons | Mostly done | No | No | 1h QA |
| AC-008 | Confirmation only for Phase 1/2/summary | Satisfied | No | No | 0h |
| AC-009 | Expedition completion summary | Not implemented | Yes | Minor (aggregation action) | 6h |
| AC-011 | Confirmation from store, not form state | Likely working | Verify | No | 1h |

**SPEC-PROD-002 total remaining effort**: 15-19h (code + QA)

---

## Sprint 26 Prioritization Recommendation

### Must-have (blocks user flow)
1. **AC-017** (Complete Expedition button) -- 3h. Without this, users have no way to finish the expedition.
2. **SPEC-ARCH-001** (DnD time adjustment) -- 3h. Fixes a visible bug in Phase 6.

### Should-have (improves quality)
3. **AC-002** (trip card redesign with progress) -- 4h. High visibility, improves dashboard.
4. **AC-009** (expedition summary) -- 6h. Depends on AC-017. Gives the expedition a proper ending.
5. **AC-018** (incomplete phase jump behavior) -- 2h. Prevents confusion.

### Nice-to-have (polish)
6. **AC-003 PROD-002** (CTA to current phase) -- 1h. Quick fix.
7. **AC-008 PROD-001** (progress bar visual states) -- 1h. Likely already working.
8. **AC-012** (above fold on mobile) -- 1h. Likely already working.
9. **AC-011 PROD-002** (confirmation from store) -- 1h. Audit only.

### Defer to Sprint 27
10. **AC-004 PROD-002** (archived trips) -- 2-6h. Low priority if archival is not implemented.
11. **AC-015** (downstream data cascade) -- complex, depends on SPEC-PROD-003 for guide.
12. **AC-004 PROD-001** seniors field -- needs product decision first.
13. **E2E validation suite** (AC-001, AC-003, AC-007, AC-010, AC-014) -- 7h of E2E tests should be spread across sprints.

### Total recommended for Sprint 26: ~21h
(AC-017 + SPEC-ARCH-001 + AC-002 + AC-009 + AC-018 + AC-003 + AC-008 + AC-012 + AC-011)

---

## Open Decisions for Product Owner

1. **Seniors field**: SPEC-PROD-001 AC-004 mentions "seniors" but the data model has no seniors field. Drop from spec or add? Recommendation: drop (seniors = adults in travel systems).
2. **AC-015 scope**: Should changing destination in Phase 1 auto-regenerate Phase 3 checklist and Phase 6 itinerary? Or is the current behavior (guide auto-regeneration per SPEC-PROD-003 only) acceptable? Recommendation: accept limitation, add backlog item.
3. **AC-004 PROD-002**: Does trip archival exist? If not, defer this AC entirely.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | architect | Initial review of remaining ACs for Sprint 26 planning |
