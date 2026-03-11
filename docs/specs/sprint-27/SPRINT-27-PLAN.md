# Sprint 27 Planning Document

**Version**: 1.0.0
**Author**: tech-lead
**Date**: 2026-03-11
**Budget**: 40h (5 working days, 2 devs at 4h/day each)
**Baseline**: v0.19.0, 1655 tests, build clean, lint clean
**Process**: Spec-Driven Development (SDD) -- third sprint under SDD
**Test Target**: 1700+ (from 1655 baseline)

---

## 0. Critical Context: Recurring Bug Analysis

### The Problem

Manual testing of v0.19.0 identified ~40 NOK results out of 111 scenarios. Investigation reveals that several bugs have been reported across 3-4 consecutive sprints. Fixes ARE being written and tests pass, but the bugs persist in production for three root causes:

1. **Wrong component targeted**: Three distinct progress bar components exist (PhaseProgressBar for intra-phase steps, ExpeditionProgressBar for cross-phase navigation, DashboardPhaseProgressBar for dashboard cards). Fixes applied to one do not affect the others.

2. **CSS untestable by unit tests**: JSDOM does not compute CSS stacking contexts. The autocomplete dropdown has correct classes (`bg-card`, `z-50`, `shadow-lg`) but parent containers with `overflow: hidden` clip it. Unit tests pass; users see a clipped dropdown.

3. **Architectural root cause masked by CSS workarounds**: The autocomplete dropdown is rendered inside a parent with constrained overflow. No amount of `z-index` or `background-color` fixes will resolve clipping. The fix requires rendering via a React portal at `document.body` level.

### Mandate for Sprint 27

Every Group A bug fix MUST include a manual verification protocol (see Section 9). Unit tests alone are NOT sufficient evidence that a recurring bug is fixed.

---

## 1. Prioritization & Scope Decision

### Budget Analysis

| Group | Item | Priority | Est. (h) | Specs Required | Decision |
|-------|------|----------|----------|----------------|----------|
| A | A1: Autocomplete portal rendering | P0 | 4 | SPEC-UX-006, SPEC-ARCH-003 | IN |
| A | A2: Navigation fixes (Phase 2 back, Phase 6 progress bar, completed phase guards) | P0 | 4 | -- (XS, covered by existing SPEC-PROD-001) | IN |
| A | A3: Guide fixes (remove "Atualizar", card uniformity, hero banner) | P0 | 4 | -- (XS, covered by SPEC-PROD-003) | IN |
| A | A4: Preferences persistence on back navigation | P0 | 2 | -- (XS, covered by SPEC-UX-004) | IN |
| A | A5: Profile name display fix | P0 | 1 | -- (XS, trivial) | IN |
| A | A6: Confirmation screen preferences detail | P0 | 2 | -- (XS, covered by SPEC-PROD-001) | IN |
| A | A7: Summary page completeness | P0 | 4 | -- (XS, covered by SPEC-PROD-005) | IN |
| A | A8: Phase 4 label corrections | P0 | 2 | -- (XS, covered by SPEC-PROD-TRANSPORT) | IN |
| A | A9: CTA button standardization | P0 | 3 | SPEC-UX-009 (new, needed) | IN |
| B | B1: Gamification header display | P1 | 6 | SPEC-PROD-006, SPEC-UX-007 | IN |
| B | B3: Map pin real-time updates | P1 | 4 | -- (S, needs mini-spec) | **DEFERRED** |
| B | B2: Navigation restructure (Expediciones/Atlas/Map) | P2 | 10 | SPEC-PROD-008, SPEC-ARCH-002 | **DEFERRED** |

### Included: 32h + 4h testing/buffer = 36h (4h buffer)

**Group A total**: 26h (all P0 recurring bugs)
**Group B included**: 6h (B1 gamification header only)
**Testing & integration**: 4h
**Buffer**: 4h

### Deferred to Sprint 28

| Item | Est. | Reason |
|------|------|--------|
| B2: Navigation restructure | 10h | High risk alongside 26h of bug fixes. Needs SPEC-PROD-008 + SPEC-ARCH-002 (both unwritten). Too much scope for a sprint already heavy on corrections. |
| B3: Map pin real-time updates | 4h | Budget does not accommodate after B1. Can be paired with B2 in Sprint 28 for a cohesive navigation/map sprint. |
| ITEM-5 (S26 carry): DnD time adjustment | 12h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft. Needs dedicated sprint capacity. |

---

## 2. SDD Spec Gate

### Specs Required (new)

| Spec ID | Title | Owner | Status | Sprint 27 Items |
|---------|-------|-------|--------|-----------------|
| SPEC-UX-006 | Autocomplete Portal Rendering | ux-designer | NEEDED | A1 |
| SPEC-ARCH-003 | Autocomplete Portal Architecture | architect | NEEDED | A1 |
| SPEC-UX-007 | Gamification Header Visual Spec | ux-designer | NEEDED | B1 |
| SPEC-UX-009 | CTA Button Standardization | ux-designer | NEEDED | A9 |
| SPEC-PROD-006 | Gamification Header Display | product-owner | Draft | B1 |

### Specs Reused (already approved)

| Spec ID | Items Covered |
|---------|---------------|
| SPEC-PROD-001 v1.1.0 | A2 (navigation, phase guards), A6 (confirmation) |
| SPEC-PROD-003 v1.1.0 | A3 (guide fixes) |
| SPEC-PROD-005 v1.1.0 | A7 (summary completeness) |
| SPEC-UX-004 v1.1.0 | A4 (preferences persistence) |
| SPEC-PROD-TRANSPORT (legacy) | A8 (Phase 4 labels) |

### SDD Exception: XS Bug Fixes

Per SDD-PROCESS.md Section 10, bug fixes under 2h that fall within an existing approved spec's scope do NOT require a new spec. Items A2-A8 qualify. They reference existing spec IDs.

### Spec Approval Priority (to unblock Day 1)

1. SPEC-UX-006 + SPEC-ARCH-003 (unblocks A1, the highest-value fix)
2. SPEC-UX-009 (unblocks A9, CTA standardization)
3. SPEC-UX-007 + SPEC-PROD-006 approval (unblocks B1, gamification header)

---

## 3. Architectural Decision: Autocomplete Fix Strategy

### Problem

The `DestinationAutocomplete` dropdown renders inside a wizard step container. Parent elements in the wizard layout have `overflow: hidden` or `overflow: auto` for scrolling. This creates a CSS stacking context that clips the dropdown regardless of `z-index`.

Sprint 26 fix (SPEC-UX-001) correctly set `bg-card`, `z-50`, `shadow-lg` on the dropdown. The dropdown is opaque and styled correctly. But it is visually clipped by parent overflow boundaries.

### Options Evaluated

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A: React Portal (`createPortal` to `document.body`) | Solves root cause (escapes stacking context). No new dependency. Proven pattern. | Requires position calculation (getBoundingClientRect). Must handle scroll and resize. | **RECOMMENDED** |
| B: Combobox library (e.g., downshift, cmdk) | Full keyboard/a11y support built-in. Portal rendering included. | New dependency (license check needed). Migration effort. May conflict with existing styles. | Fallback if A fails |
| C: Remove `overflow: hidden` from parent | Simplest change. | Breaks wizard scrolling. Side effects on other wizard content. | REJECTED |

### Decision

Use **Option A: React Portal** for Sprint 27. Implementation:
1. Wrap the dropdown `<ul>` in `createPortal(dropdown, document.body)`
2. Calculate position using `useRef` on the input + `getBoundingClientRect()`
3. Update position on scroll and window resize (throttled)
4. Close dropdown on outside click (already implemented)
5. Maintain existing keyboard navigation (arrow keys, Enter, Escape)

If the portal approach reveals unforeseen complexity during implementation (e.g., focus management breaks, mobile positioning issues), escalate to tech-lead within Day 1. Fallback to Option B in Sprint 28.

---

## 4. Task Breakdown

### GROUP A: Recurring Bug Fixes (P0)

---

#### TASK-27-001: Autocomplete dropdown portal rendering
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-UX-006, SPEC-ARCH-003
- **Description**: Refactor `DestinationAutocomplete` to render the dropdown list via `createPortal` at `document.body` level. Calculate absolute position from input element's bounding rect. Handle scroll repositioning and window resize. Maintain all existing keyboard navigation and accessibility (arrow keys, Enter, Escape, aria-live, 44px touch targets from SPEC-UX-001).
- **Acceptance**: Dropdown renders outside wizard overflow context. Visible on all viewports (375px, 768px, 1280px). Position tracks input on scroll. Existing SPEC-UX-001 ACs still pass.
- **Est**: 3h
- **Dependencies**: SPEC-UX-006 + SPEC-ARCH-003 approved
- **Verification**: MANUAL-V-001 (see Section 9)

#### TASK-27-002: Autocomplete portal tests
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-UX-006
- **Description**: Update existing autocomplete tests for portal rendering. Add tests for: portal mount/unmount, position calculation mock, cleanup on component unmount, scroll handler registration/cleanup.
- **Acceptance**: >= 80% coverage on DestinationAutocomplete. All SPEC-UX-001 ACs still have test assertions. Portal lifecycle tested.
- **Est**: 1h
- **Dependencies**: TASK-27-001

---

#### TASK-27-003: Phase 2 back button navigation fix
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-001 (phase navigation)
- **Description**: Fix hardcoded `router.push("/trips")` on line 273 of `Phase2Wizard.tsx`. Replace with proper back navigation to Phase 1 (`/trips/[id]/phases/1`). Use `@/i18n/navigation` router (not `next/navigation`). The back button must navigate to the previous phase, not to the trip list.
- **Acceptance**: Back button on Phase 2 navigates to Phase 1 of the same trip. Uses `@/i18n/navigation` router. Locale prefix preserved.
- **Est**: 0.5h
- **Dependencies**: None
- **Verification**: MANUAL-V-002

#### TASK-27-004: Phase 6 expedition progress bar
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-001 (phase navigation)
- **Description**: Phase6Wizard currently has NO `ExpeditionProgressBar` component (confirmed: grep returns empty). Add `ExpeditionProgressBar` with `currentPhase={6}` and `totalPhases={8}` matching the pattern used in Phase 3 (`Phase3Wizard.tsx:181`) and Phase 5 (`Phase5Wizard.tsx`). Import from `./ExpeditionProgressBar`.
- **Acceptance**: Phase 6 page shows the expedition-level progress bar. Phase 6 segment highlighted. Navigation to other phases works via progress bar clicks.
- **Est**: 0.5h
- **Dependencies**: None
- **Verification**: MANUAL-V-003

#### TASK-27-005: Completed phase access guards
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-001 (phase sequencing)
- **Description**: Add server-side guards to phase page routes that check the trip's `currentPhase`. Users should NOT be blocked from viewing completed phases (they must remain accessible for review/editing per SPEC-PROD-005 AC-004). However, users MUST NOT be able to access phases AHEAD of their current phase. Add a check: if requested phase > trip.currentPhase, redirect to the current phase page. This prevents URL manipulation to skip phases.
- **Acceptance**: Accessing phase N when currentPhase < N redirects to currentPhase. Accessing completed phases (phase < currentPhase) works normally. redirect() is OUTSIDE try/catch (FIND-M-001).
- **Est**: 2h
- **Dependencies**: None
- **Verification**: MANUAL-V-004

#### TASK-27-006: Navigation fixes tests
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-001
- **Description**: Tests for TASK-27-003 (Phase 2 back button), TASK-27-004 (Phase 6 progress bar), TASK-27-005 (phase access guards). Include: back button target assertion, progress bar render assertion, phase guard redirect logic.
- **Acceptance**: All three fixes have test coverage. Phase guard tests cover: forward skip blocked, backward access allowed, edge case (currentPhase = 1, access phase 1).
- **Est**: 1h
- **Dependencies**: TASK-27-003, TASK-27-004, TASK-27-005

---

#### TASK-27-007: Guide visual fixes
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-003 v1.1.0
- **Description**: Fix remaining guide issues from manual testing: (a) remove any residual "Atualizar" button if still present (AC-008 regression), (b) ensure card visual uniformity across all 10 sections (consistent border, padding, spacing), (c) hero banner rendering on edge cases (empty destination name, very long names). Cross-reference SPEC-UX-002 for visual spec.
- **Acceptance**: No "Atualizar"/"Update" button visible. All 10 section cards have uniform styling. Hero banner handles edge cases gracefully (truncation with ellipsis for names > 50 chars).
- **Est**: 3h
- **Dependencies**: None
- **Verification**: MANUAL-V-005

#### TASK-27-008: Guide fixes tests
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-003
- **Description**: Tests for guide visual fixes. Regression test: "Atualizar" button must not render. Edge case tests for hero banner (empty name, long name).
- **Acceptance**: Regression test prevents reintroduction of update button. Edge cases covered.
- **Est**: 1h
- **Dependencies**: TASK-27-007

---

#### TASK-27-009: Preferences persistence on back navigation
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-004 v1.1.0
- **Description**: When a user navigates forward from preferences and then presses back, their selections must be preserved. Investigate whether state is being lost due to component remount or form state reset. Fix: persist preferences to server on each page change (not just on final submit), OR use session-level state that survives navigation.
- **Acceptance**: User selects preferences on page 1, navigates to page 2, goes back to page 1 -- selections preserved. User navigates away from preferences wizard step and returns -- selections preserved.
- **Est**: 2h
- **Dependencies**: None
- **Verification**: MANUAL-V-006

---

#### TASK-27-010: Profile name display fix
- **Assigned**: dev-fullstack-2
- **Spec ref**: -- (XS, trivial)
- **Description**: Fix profile name not displaying correctly in the UI. Root-cause: the `name` field is saved via `db.user.update` in `createExpeditionAction` (separate from `PROFILE_FIELD_POINTS`), but the display component may not be reading from the correct source. Verify data flow: where name is saved -> where name is read -> where name is displayed.
- **Acceptance**: User's name displays correctly in all locations where it appears (navbar UserMenu, profile page, expedition summary).
- **Est**: 1h
- **Dependencies**: None
- **Verification**: MANUAL-V-007

---

#### TASK-27-011: Confirmation screen preferences detail
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-001
- **Description**: The confirmation screen at the end of Phase 1/Phase 2 wizards should display the user's selected preferences in a readable format. Currently either missing or showing raw data. Format preferences as human-readable labels (localized) grouped by category.
- **Acceptance**: Confirmation screen shows preferences with readable labels. Localized (PT-BR + EN). Categories grouped logically.
- **Est**: 2h
- **Dependencies**: None

---

#### TASK-27-012: Summary page completeness
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-005 v1.1.0
- **Description**: The expedition summary page (built in Sprint 26) may have incomplete data rendering for some phases. Verify and fix: (a) all 6 phases display their data, (b) deferred ACs from Sprint 26 review (AC-007 summary from dashboard, AC-009/010 gamification badge display, AC-014/015 completed trip filter). Implement any missing AC from the deferred list.
- **Acceptance**: Summary page shows complete data for all 6 phases. Accessible from dashboard (AC-007). Gamification badge for completion visible (AC-009/010). Dashboard can filter completed trips (AC-014/015). Missing data shows "Not completed" indicator.
- **Est**: 4h
- **Dependencies**: None
- **Verification**: MANUAL-V-008

---

#### TASK-27-013: Phase 4 label corrections
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-PROD-TRANSPORT (legacy)
- **Description**: Fix incorrect labels in Phase 4 wizard. Cross-reference with Phase 4 rename (Sprint 20: "O Abrigo" -> "A Logistica") and Sprint 23 fixes. Verify all i18n keys for Phase 4 steps (Transport, Accommodation, Mobility) are correct in both PT-BR and EN. Fix any mislabeled fields or buttons.
- **Acceptance**: All Phase 4 labels match the correct i18n keys. No "O Abrigo" remnants. Step names consistent: Transporte/Hospedagem/Mobilidade (PT) and Transport/Accommodation/Mobility (EN).
- **Est**: 2h
- **Dependencies**: None
- **Verification**: MANUAL-V-009

---

#### TASK-27-014: CTA button standardization
- **Assigned**: dev-fullstack-2
- **Spec ref**: SPEC-UX-009 (new)
- **Description**: Standardize call-to-action buttons across all wizard phases. Per SPEC-UX-009, define a consistent pattern for: primary action ("Next", "Save", "Complete"), secondary action ("Back", "Cancel"), and destructive action ("Delete", "Reset"). Apply consistent sizing, colors, positioning, and loading states across Phase 1-6 wizards. Ensure all CTAs use theme tokens (no hardcoded colors).
- **Acceptance**: All 6 phase wizards use the same CTA button pattern. Primary/secondary/destructive styling is consistent. Loading states present on all async actions. No hardcoded color values. Keyboard accessible (Tab order, Enter/Space activation).
- **Est**: 3h
- **Dependencies**: SPEC-UX-009 approved
- **Verification**: MANUAL-V-010

---

### GROUP B: New Features

---

#### TASK-27-015: Gamification header -- backend data endpoint
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-006 (AC-001, AC-005, AC-008, AC-009, AC-010)
- **Description**: Create a server-side function (or extend existing gamification service) that returns compact gamification data for the header: total points, current level/rank name, and level progress percentage. Must use authenticated session (BOLA). Must return initial state for new users (0 pts, "Explorer" rank). Must NOT be a separate API route -- use a server component data fetch or server action to avoid unnecessary API surface.
- **Acceptance**: Function returns { points, levelName, levelProgress } for authenticated user. BOLA enforced. New user returns { points: 0, levelName: "Explorer", levelProgress: 0 }. Responds in < 500ms. No PII logged.
- **Est**: 2h
- **Dependencies**: SPEC-PROD-006 approved

#### TASK-27-016: Gamification header -- UI component
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-006 (AC-001-010), SPEC-UX-007
- **Description**: Build the compact gamification indicator for the authenticated navbar. Display points + level name. Clickable (navigates to profile/gamification page). Skeleton loading state (AC-008). Mobile responsive (AC-004). Real-time update after point-earning actions via React state revalidation (AC-005, AC-006). Level-up visual cue respects `prefers-reduced-motion` (AC-006). Accessible label for screen readers (AC from constraints).
- **Acceptance**: Indicator visible on all authenticated pages. Points and level display correctly. Click navigates to gamification profile. Skeleton shown during load (no flash of "0 points"). Mobile layout adapts per SPEC-UX-007. Points update after earning without page reload. Screen reader announces "Your progress: X points, Level Y".
- **Est**: 2.5h
- **Dependencies**: TASK-27-015, SPEC-UX-007 approved

#### TASK-27-017: Gamification header tests
- **Assigned**: dev-fullstack-1
- **Spec ref**: SPEC-PROD-006
- **Description**: Tests for gamification header: data function (BOLA, new user default, point/level calculation), UI component (render states, skeleton, click navigation, accessibility label, mobile rendering). Integration: point award triggers header update.
- **Acceptance**: >= 80% coverage on header data function and component. All SPEC-PROD-006 ACs have test assertions. BOLA test included.
- **Est**: 1.5h
- **Dependencies**: TASK-27-015, TASK-27-016

---

### Cross-Cutting

---

#### TASK-27-018: Integration testing & build verification
- **Assigned**: dev-fullstack-1 + dev-fullstack-2 (shared)
- **Spec ref**: All
- **Description**: Final integration verification. Run `npm run build` (catches stricter ESLint+TS than Vitest). Run full test suite. Verify test count >= 1700. Fix any integration issues discovered. Prepare PR.
- **Est**: 2h (1h per dev)
- **Dependencies**: All other tasks complete

---

## 5. Dependency Map

```
Independent (can start Day 1 -- no inter-task dependencies):
  TASK-27-001 (autocomplete portal)     [blocked on SPEC-UX-006 + SPEC-ARCH-003]
  TASK-27-003 (Phase 2 back button)
  TASK-27-004 (Phase 6 progress bar)
  TASK-27-005 (completed phase guards)
  TASK-27-007 (guide fixes)
  TASK-27-009 (preferences persistence)
  TASK-27-010 (profile name)
  TASK-27-011 (confirmation preferences)
  TASK-27-013 (Phase 4 labels)

Sequential chains:
  TASK-27-001 --> TASK-27-002 (autocomplete tests)
  TASK-27-003 + TASK-27-004 + TASK-27-005 --> TASK-27-006 (nav tests)
  TASK-27-007 --> TASK-27-008 (guide tests)
  TASK-27-014 --> (blocked on SPEC-UX-009)
  TASK-27-015 --> TASK-27-016 --> TASK-27-017 (gamification chain)
  ALL --> TASK-27-018 (integration)
```

---

## 6. Dev Assignment Summary

### dev-fullstack-1 (20h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-27-001 | Autocomplete portal | 3h | Day 1 |
| TASK-27-002 | Autocomplete portal tests | 1h | Day 1 |
| TASK-27-007 | Guide fixes | 3h | Day 2 |
| TASK-27-008 | Guide fixes tests | 1h | Day 2 |
| TASK-27-011 | Confirmation preferences detail | 2h | Day 3 |
| TASK-27-012 | Summary page completeness | 4h | Day 3-4 |
| TASK-27-015 | Gamification header backend | 2h | Day 4 |
| TASK-27-016 | Gamification header UI | 2.5h | Day 5 |
| TASK-27-017 | Gamification header tests | 1.5h | Day 5 |
| TASK-27-018 | Integration (shared) | 1h | Day 5 |
| **Total** | | **21h** | |

### dev-fullstack-2 (19h total)

| Task | Item | Hours | Days |
|------|------|-------|------|
| TASK-27-003 | Phase 2 back button | 0.5h | Day 1 |
| TASK-27-004 | Phase 6 progress bar | 0.5h | Day 1 |
| TASK-27-005 | Completed phase guards | 2h | Day 1 |
| TASK-27-006 | Navigation tests | 1h | Day 1 |
| TASK-27-009 | Preferences persistence | 2h | Day 2 |
| TASK-27-010 | Profile name fix | 1h | Day 2 |
| TASK-27-013 | Phase 4 labels | 2h | Day 2 |
| TASK-27-014 | CTA button standardization | 3h | Day 3 |
| TASK-27-012 | Summary page (assist) | -- | Day 3-4 (if needed) |
| TASK-27-018 | Integration (shared) | 1h | Day 5 |
| **Buffer** | | **6h** | Day 4-5 |
| **Total** | | **13h + 6h buffer** | |

Note: dev-fullstack-2 has intentional buffer. This accounts for: (a) recurring bug fixes being harder than estimated (historical pattern), (b) manual verification time for MANUAL-V protocols, (c) potential SPEC-UX-009 approval delay pushing TASK-27-014 later.

---

## 7. Execution Plan (Day-by-Day)

### Day 1 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-27-001: Autocomplete portal refactor | 3h | Highest-value fix. Requires SPEC-UX-006 + SPEC-ARCH-003. |
| dev-fullstack-1 | TASK-27-002: Autocomplete portal tests | 1h | Immediately after implementation. |
| dev-fullstack-2 | TASK-27-003: Phase 2 back button | 0.5h | Quick fix, one-line change. |
| dev-fullstack-2 | TASK-27-004: Phase 6 progress bar | 0.5h | Quick fix, add component import + render. |
| dev-fullstack-2 | TASK-27-005: Phase access guards | 2h | Server-side route protection. |
| dev-fullstack-2 | TASK-27-006: Navigation tests | 1h | Tests for all three nav fixes. |

**End of Day 1**: Autocomplete portal fix complete (A1). Navigation fixes complete (A2). 6 tasks done.

### Day 2 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-27-007: Guide visual fixes | 3h | Card uniformity, hero banner edge cases. |
| dev-fullstack-1 | TASK-27-008: Guide fixes tests | 1h | Regression + edge case tests. |
| dev-fullstack-2 | TASK-27-009: Preferences persistence | 2h | State management investigation + fix. |
| dev-fullstack-2 | TASK-27-010: Profile name fix | 1h | Data flow investigation + fix. |
| dev-fullstack-2 | TASK-27-013: Phase 4 label corrections | 1h | Start i18n key audit. |

**End of Day 2**: Guide fixes complete (A3). Preferences persistence fixed (A4). Profile name fixed (A5). 11 tasks done.

### Day 3 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-27-011: Confirmation preferences detail | 2h | Format preferences for confirmation screen. |
| dev-fullstack-1 | TASK-27-012: Summary page completeness (start) | 2h | Begin deferred ACs from Sprint 26. |
| dev-fullstack-2 | TASK-27-013: Phase 4 labels (finish) | 1h | Complete i18n audit. |
| dev-fullstack-2 | TASK-27-014: CTA button standardization | 3h | Requires SPEC-UX-009. |

**End of Day 3**: Confirmation detail fixed (A6). Phase 4 labels fixed (A8). CTA standardization done (A9). 14 tasks done. All Group A items either complete or in progress.

### Day 4 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-27-012: Summary page completeness (finish) | 2h | Complete remaining deferred ACs. |
| dev-fullstack-1 | TASK-27-015: Gamification header backend | 2h | Server-side data function. |
| dev-fullstack-2 | Manual verification protocol | 3h | Execute MANUAL-V-001 through MANUAL-V-010. Document results. |
| dev-fullstack-2 | Buffer / assist | 1h | Help with summary if needed. |

**End of Day 4**: Summary page complete (A7). Gamification backend done. All Group A verified manually.

### Day 5 (8h total: 4h per dev)

| Dev | Task | Hours | Notes |
|-----|------|-------|-------|
| dev-fullstack-1 | TASK-27-016: Gamification header UI | 2.5h | Component implementation. |
| dev-fullstack-1 | TASK-27-017: Gamification header tests | 1.5h | Tests for backend + UI. |
| dev-fullstack-2 | TASK-27-018: Integration testing | 1h | npm run build + full test suite. |
| dev-fullstack-1 | TASK-27-018: Integration testing | 1h | PR prep, final verification. |
| dev-fullstack-2 | Buffer / PR prep | 3h | Fix any integration issues. |

**End of Day 5**: Gamification header complete (B1). All tasks done. Build clean. Test count >= 1700. PR ready.

---

## 8. Item Completion Timeline

| Day | Items Completed | Running Test Count (est.) |
|-----|----------------|--------------------------|
| Day 1 | A1 (Autocomplete portal), A2 (Navigation fixes) | ~1670 |
| Day 2 | A3 (Guide fixes), A4 (Preferences), A5 (Profile name) | ~1680 |
| Day 3 | A6 (Confirmation), A8 (Phase 4 labels), A9 (CTA buttons) | ~1690 |
| Day 4 | A7 (Summary completeness), B1 backend | ~1695 |
| Day 5 | B1 complete (Gamification header) | ~1705 |

---

## 9. Recurring Bug Verification Protocol

**CRITICAL**: For each recurring bug, unit tests are NECESSARY but NOT SUFFICIENT. The following manual verification steps are MANDATORY before the bug can be marked as resolved.

### MANUAL-V-001: Autocomplete Dropdown Visibility

**Bug**: Dropdown clipped by parent overflow.
**Verification environment**: Local dev server (`npm run dev`), browser DevTools.
**Steps**:
1. Navigate to Phase 1 Wizard (destination step).
2. Type "Par" in the destination field.
3. VERIFY: Dropdown appears FULLY visible, not clipped by any parent container.
4. Open browser DevTools -> Elements panel -> inspect the dropdown `<ul>`.
5. VERIFY: The dropdown element is a DIRECT CHILD of `<body>` (rendered via portal), NOT nested inside wizard container.
6. Scroll the page while dropdown is open.
7. VERIFY: Dropdown repositions to stay aligned with the input field.
8. Test on viewport 375px (mobile) and 1280px (desktop).
9. VERIFY: Dropdown fully visible on both viewports.
**Pass criteria**: All 5 VERIFY checks pass.
**Evidence**: Screenshot of DevTools showing dropdown as child of body.

### MANUAL-V-002: Phase 2 Back Button

**Bug**: Back button navigates to `/trips` instead of Phase 1.
**Steps**:
1. Start an expedition, complete Phase 1, enter Phase 2.
2. Click the back button.
3. VERIFY: Navigates to Phase 1 of the SAME trip (URL contains `/phases/1`).
4. VERIFY: Does NOT navigate to `/trips` list.
5. VERIFY: URL preserves locale prefix (`/en/` or `/pt/`).
**Pass criteria**: Navigation goes to Phase 1, not trips list.

### MANUAL-V-003: Phase 6 Progress Bar

**Bug**: Phase 6 has no expedition progress bar.
**Steps**:
1. Navigate to Phase 6 of any trip.
2. VERIFY: `ExpeditionProgressBar` is rendered (8 segments, phase 6 highlighted).
3. VERIFY: Clicking other phase segments navigates to those phases.
4. VERIFY: Visual consistency with Phase 3 and Phase 5 progress bars.
**Pass criteria**: Progress bar visible and functional on Phase 6.

### MANUAL-V-004: Phase Access Guards

**Bug**: Users can URL-hack to skip phases.
**Steps**:
1. Create a new trip (currentPhase = 1).
2. Manually change URL to `/trips/[id]/phases/3`.
3. VERIFY: Redirected to Phase 1 (or current phase).
4. Complete Phase 1. Manually change URL to `/trips/[id]/phases/4`.
5. VERIFY: Redirected to Phase 2 (current phase).
6. Navigate to a completed phase (e.g., Phase 1 after completing it).
7. VERIFY: Phase 1 is accessible (completed phases are viewable).
**Pass criteria**: Forward skip blocked, backward access allowed.

### MANUAL-V-005: Guide Visual Consistency

**Bug**: "Atualizar" button visible, card styling inconsistent.
**Steps**:
1. Navigate to Phase 5 (guide) for a trip with a generated guide.
2. VERIFY: No "Atualizar" or "Update" button visible anywhere.
3. VERIFY: All 10 section cards have identical border style, padding, and spacing.
4. VERIFY: Hero banner renders correctly with destination name.
5. Test with a destination name > 50 characters.
6. VERIFY: Name truncates gracefully (ellipsis or word break).
**Pass criteria**: No update button. Uniform cards. Hero handles edge cases.

### MANUAL-V-006: Preferences Persistence

**Bug**: Preferences lost on back navigation.
**Steps**:
1. Navigate to Phase 2, reach the preferences step.
2. Select preferences in at least 3 categories on page 1.
3. Navigate to page 2 of preferences.
4. Go back to page 1.
5. VERIFY: Previously selected preferences are still checked.
6. Navigate away from the preferences step (to another wizard step).
7. Navigate back to preferences.
8. VERIFY: All selections preserved.
**Pass criteria**: No selection loss on any navigation path.

### MANUAL-V-007: Profile Name Display

**Bug**: Name not showing in UI after saving.
**Steps**:
1. Set a name in the profile/account page.
2. Navigate to the navbar.
3. VERIFY: Name appears in the UserMenu component.
4. Navigate to expedition summary.
5. VERIFY: Name appears in summary if applicable.
6. Log out and log back in.
7. VERIFY: Name persists across sessions.
**Pass criteria**: Name visible in all expected locations.

### MANUAL-V-008: Summary Page Completeness

**Bug**: Summary missing data from some phases.
**Steps**:
1. Complete all 6 phases of an expedition.
2. Click "Complete Expedition" on Phase 6.
3. Navigate to the summary page.
4. VERIFY: Each of the 6 phases shows its data (destination, dates, travelers, checklist count, transport/accommodation, guide date, itinerary days).
5. VERIFY: Accessible from dashboard trip card for completed trips.
6. VERIFY: Gamification completion badge visible.
7. VERIFY: Missing data shows "Not completed" indicator (not blank or error).
**Pass criteria**: All 6 phases rendered with data or explicit "Not completed" indicator.

### MANUAL-V-009: Phase 4 Labels

**Bug**: Incorrect labels in Phase 4 wizard.
**Steps**:
1. Navigate to Phase 4 wizard.
2. Switch language to PT-BR.
3. VERIFY: Tabs/steps labeled "Transporte", "Hospedagem", "Mobilidade".
4. Switch language to EN.
5. VERIFY: Tabs/steps labeled "Transport", "Accommodation", "Mobility".
6. VERIFY: No remnants of "O Abrigo" anywhere in Phase 4.
**Pass criteria**: All labels correct in both languages.

### MANUAL-V-010: CTA Button Consistency

**Bug**: Inconsistent button styles across wizards.
**Steps**:
1. Navigate through Phase 1 through Phase 6.
2. VERIFY: Primary action button (Next/Save/Complete) has consistent color, size, and position across all phases.
3. VERIFY: Secondary action button (Back/Cancel) has consistent styling.
4. VERIFY: Loading spinner appears on all async action buttons.
5. VERIFY: No hardcoded colors (inspect via DevTools -- should use CSS custom properties or Tailwind theme tokens).
**Pass criteria**: Visual consistency across all 6 phases.

---

## 10. Definition of Done

### Per-Task DoD
- [ ] Code implements all ACs from the referenced spec
- [ ] Tests written and passing (included in same task or paired test task)
- [ ] No new lint warnings introduced
- [ ] `npm run build` passes
- [ ] Commits use Conventional Commits with spec IDs and task IDs: `fix(SPEC-PROD-001): description [TASK-27-XXX]`
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized
- [ ] PII not logged or exposed in responses
- [ ] Auth/authz (BOLA) correctly enforced on any endpoint touched
- [ ] Imports use `@/i18n/navigation` for router/Link (not `next/navigation`)
- [ ] Prisma JSON writes use `as unknown as Prisma.InputJsonValue` pattern (if applicable)
- [ ] redirect() calls are OUTSIDE try/catch blocks (FIND-M-001)

### Sprint-Level DoD
- [ ] All 18 tasks marked complete
- [ ] Code review approved by tech-lead (structured review per template)
- [ ] Test count >= 1700 (target: ~1705 from 1655 baseline)
- [ ] Build clean (`npm run build` -- zero errors)
- [ ] Lint clean (`npm run lint` -- no new warnings)
- [ ] Security checklist passed for all PRs
- [ ] Bias/ethics checklist passed for all PRs
- [ ] QA conformance audit against all referenced specs
- [ ] **ALL 10 MANUAL-V protocols executed and documented with PASS/FAIL** (Section 9)
- [ ] No recurring bugs remain from this sprint's scope
- [ ] No spec drift detected
- [ ] All commits reference spec IDs
- [ ] Merged to master via PR -- no direct commits
- [ ] SPEC-STATUS.md updated with new specs (SPEC-UX-006, SPEC-ARCH-003, SPEC-UX-007, SPEC-UX-009, SPEC-PROD-006)

### Security Checklist
- [ ] No hardcoded credentials, tokens, or API keys
- [ ] All inputs validated and sanitized (Zod schemas)
- [ ] PII data not logged or exposed in responses
- [ ] Auth/authz correctly enforced on touched endpoints
- [ ] No SQL injection, XSS, or CSRF vectors introduced
- [ ] BOLA checks present on all data access paths (especially gamification header, summary, phase guards)
- [ ] redirect() calls outside try/catch blocks (FIND-M-001)
- [ ] Phase access guards prevent unauthorized forward skipping

### Bias & Ethics Checklist
- [ ] No discriminatory logic based on nationality, gender, age, disability, religion
- [ ] Search/sort/filter algorithms treat all users equitably
- [ ] Error messages are neutral and non-judgmental
- [ ] No dark patterns in UX flows
- [ ] Gamification header does not create pressure or anxiety (neutral framing of "0 points" for new users)

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-001: SPEC-UX-006 / SPEC-ARCH-003 not approved by Day 1 | Medium | High (blocks A1) | Tech-lead coordinates with ux-designer and architect pre-sprint. dev-fullstack-1 can start TASK-27-007 (guide fixes) instead and swap order. |
| R-002: Portal positioning is more complex than estimated (mobile, RTL, scroll edge cases) | Medium | Medium | 4h buffer available. If portal approach fails on Day 1, STOP and escalate. Fallback: combobox library in Sprint 28. |
| R-003: Phase access guards break existing navigation flows | Low | High | Thorough testing in TASK-27-006. Guards only block FORWARD skip, not backward access. MANUAL-V-004 catches regressions. |
| R-004: Recurring bugs re-regress due to unrelated changes | Medium | Medium | MANUAL-V protocols catch this. Run full verification on Day 4 after all fixes land, not Day 5 when buffer is thin. |
| R-005: SPEC-PROD-006 not approved for gamification header | Low | Low (B1 defers to Sprint 28, other work fills budget) | Spec is already in Draft. Product-owner created it. Should be approved quickly. |
| R-006: Summary page deferred ACs (AC-007, AC-009/010, AC-014/015) are larger than 4h | Medium | Medium | Prioritize AC-007 (dashboard access) and AC-014/015 (completed filter). AC-009/010 (badge display) can defer to Sprint 28 if over budget. |
| R-007: CTA standardization requires touching all 6 wizards -- higher blast radius than estimated | Medium | Medium | SPEC-UX-009 should define a minimal consistent pattern. Devs should NOT redesign buttons, only standardize existing ones (color token swap, not layout change). |

---

## 12. Spec Creation Assignments (Pre-Sprint)

These specs must be created and approved BEFORE the sprint begins or early Day 1:

| Spec | Owner | Priority | Deadline |
|------|-------|----------|----------|
| SPEC-UX-006: Autocomplete Portal UX | ux-designer | Critical (blocks Day 1) | Pre-sprint |
| SPEC-ARCH-003: Autocomplete Portal Architecture | architect | Critical (blocks Day 1) | Pre-sprint |
| SPEC-UX-009: CTA Button Standardization | ux-designer | High (blocks Day 3) | Day 2 |
| SPEC-UX-007: Gamification Header Visual | ux-designer | Medium (blocks Day 4-5) | Day 3 |
| SPEC-PROD-006: Gamification Header (approval) | product-owner | Medium (blocks Day 4) | Day 3 |

---

## 13. Sprint 28 Preview

| Item | Est. | Notes |
|------|------|-------|
| B2: Navigation restructure (Expediciones/Atlas/Map) | 10h | Needs SPEC-PROD-008 + SPEC-ARCH-002. Request creation during Sprint 27. |
| B3: Map pin real-time updates | 4h | Can pair with B2 for cohesive navigation sprint. |
| ITEM-5 (carry): DnD time adjustment | 12h | SPEC-PROD-004 + SPEC-ARCH-001 still Draft. |
| SPEC-PROD-005 AC-009/010: Gamification badge (if deferred) | 2h | Only if not completed in Sprint 27. |
| Accumulated tech debt | 3-5h | DEBT-S6-003, DEBT-S7-002. |

---

## 14. Coordination Notes

### For tech-lead (self)
- **Day 0 (pre-sprint)**: Ensure SPEC-UX-006 + SPEC-ARCH-003 are at minimum In Review. Brief ux-designer and architect on urgency.
- **Day 1 morning**: Confirm all Group A XS items are covered by existing specs (SDD exception).
- **Day 2**: Push for SPEC-UX-009 approval so TASK-27-014 is unblocked for Day 3.
- **Day 3**: Mid-sprint check. All Group A items should be complete or in final testing.
- **Day 4**: Review MANUAL-V results. Decide on B1 scope based on remaining budget.
- **Day 5**: Final code review. Ensure no recurring bug remains. Build + test gate.

### For devs
- dev-fullstack-1: You own the autocomplete portal fix (highest-risk, highest-value). If portal positioning is problematic on mobile, STOP and escalate by end of Day 1 -- do not spend Day 2 debugging.
- dev-fullstack-2: You own all the quick navigation fixes. These are individually small but collectively critical. Batch them in Day 1 to build momentum.
- BOTH: After fixing each recurring bug, IMMEDIATELY run the corresponding MANUAL-V protocol. Do not defer verification to Day 4. If the manual check fails, the fix is not done.
- BOTH: Run `npm run build` after completing each task cluster, not just at sprint end.

### For spec owners
- ux-designer: 3 new UX specs needed (SPEC-UX-006, SPEC-UX-007, SPEC-UX-009). Prioritize SPEC-UX-006 (autocomplete portal) -- it is the pre-sprint blocker.
- architect: 1 new ARCH spec needed (SPEC-ARCH-003, autocomplete portal architecture). Coordinate with ux-designer on SPEC-UX-006.
- product-owner: SPEC-PROD-006 (gamification header) is already in Draft. Submit for review.

---

> BLOCKED on: SPEC-UX-006, SPEC-ARCH-003 approval (blocks TASK-27-001 on Day 1). SPEC-UX-009 approval (blocks TASK-27-014 on Day 3). SPEC-PROD-006 + SPEC-UX-007 approval (blocks TASK-27-015/016 on Day 4-5). All Group A XS items (A2-A8) are UNBLOCKED under SDD XS exception.
