# Sprint 25 -- Technical Analysis

**Date**: 2026-03-11
**Author**: tech-lead
**Version**: v0.17.0 | **Tests**: 1593 | **Sprint Budget**: 40h
**SDD Status**: First SDD sprint -- all tasks MUST reference spec IDs

---

## Root Cause Analysis

### BUG-P0-001: Phase sequencing -- Passengers selector NEVER appears

**Root cause**: NOT CONFIRMED AS A BUG. The PassengersStep component exists and IS rendered in Phase2Wizard.

Evidence:
- `src/components/features/expedition/Phase2Wizard.tsx` line 14 imports `PassengersStep`
- Line 76-83: the dynamic `steps` array conditionally includes `"passengers"` ONLY when `travelerType === "family" || travelerType === "group"`
- Line 272-288: `PassengersStep` is rendered when `currentStep === "passengers"`

The passengers step correctly appears only for family/group traveler types. For solo, couple, business, and student travelers, the step is intentionally skipped. If the stakeholder expected passengers for ALL traveler types, this is a spec change, not a bug.

**Likely user confusion**: The user may have selected "solo" or "couple" and expected to see passengers. This is by-design conditional logic.

**Fix scope**: If spec says passengers should always appear, change Phase2Wizard line 78 condition. Requires SPEC-PROD-001 clarification.
**Estimate**: 1h (if spec change confirmed) | 0h (if by-design)

---

### BUG-P0-002: Progress bar navigation -- clicking any phase goes to LAST completed

**Root cause**: NOT CONFIRMED AS A BUG in current code. The DashboardPhaseProgressBar has correct link logic.

Evidence in `src/components/features/dashboard/DashboardPhaseProgressBar.tsx`:
- Line 40: `isClickable = tripId && (isCompleted || isCurrent)`
- Line 102-104: `targetPhase = isCompleted ? phaseNum + 1 : phaseNum` then `clampedTarget = Math.min(targetPhase, 6)`
- Line 105: `phaseHref = /expedition/${tripId}/phase-${clampedTarget}`

So:
- Clicking a COMPLETED phase links to `phaseNum + 1` (the next phase after it)
- Clicking the CURRENT phase links to its own phase number
- Phase 1 completed -> links to phase-2
- Phase 2 completed -> links to phase-3
- Etc.

**Potential issue**: If a user clicks Phase 1 (completed), they go to phase-2. If they click Phase 2 (completed), they go to phase-3. This is correct. However, there is a SECOND progress bar component: `ExpeditionProgressBar.tsx` used INSIDE wizard pages (e.g., DestinationGuideWizard on phase-5). This one at line 13-19 uses `PHASE_ROUTES` mapping and at line 57-60 navigates via `router.push()`. This component DOES navigate correctly to past phases.

**Possible confusion source**: The DashboardPhaseProgressBar always links COMPLETED phases to the NEXT phase, not back to the completed phase itself. If the bug reporter expected clicking Phase 2 (completed) to revisit Phase 2, that would be a UX spec change.

**Fix scope**: Depends on SPEC-PROD-001 decision -- should completed phases link to themselves or to next phase?
**Estimate**: 1.5h (change link logic + tests) | 0h (if current behavior is desired)

---

### BUG-P0-003: Dashboard buttons still present ("Itens", "Checklist", "Hospedagem")

**Root cause**: PARTIALLY CONFIRMED. There is no "Itens" string anywhere in the codebase. However, "Checklist" and "Hospedagem" DO exist as i18n labels.

Evidence:
- `src/components/features/dashboard/ExpeditionCard.tsx` line 74: renders `PhaseToolsBar` with `getPhaseTools(currentPhase)`
- `src/lib/engines/phase-config.ts` PHASE_TOOLS defines tools per phase:
  - Phase 3: `destination_guide` ("Guia")
  - Phase 4: `transport` ("Transporte")
  - Phase 5: `checklist` ("Checklist")
  - Phase 6: `itinerary` ("Roteiro")
- The i18n keys at `dashboard.tools.checklist` = "Checklist" and `dashboard.tools.accommodation` = "Hospedagem" exist in `messages/pt-BR.json`

The "Checklist" tool button appears on dashboard when a trip is at Phase 5. The "Hospedagem" i18n key exists but is NOT used by any phase tool (no tool uses `dashboard.tools.accommodation` labelKey). "Itens" does not exist at all.

**Assessment**: The PhaseToolsBar shows contextual buttons per current phase. These are INTENTIONAL navigation shortcuts, not leftover buttons. If the stakeholder wants them removed, that is a spec change requiring SPEC-PROD-002.

**Fix scope**: If removal confirmed by spec, remove from `PHASE_TOOLS` in phase-config.ts.
**Estimate**: 0.5h (if removal) | 0h (if by-design)

---

### BUG-P0-004: Confirmation screen incomplete

**Root cause**: PARTIALLY CONFIRMED. The Phase1Wizard step 4 confirmation (line 516-608) shows: destination, origin, dates, flexible dates, and profile summary (name, birthDate, phone, country/city, bio). It does NOT show passengers or preferences because those are collected in Phase 2, which happens AFTER Phase 1 expedition creation.

The Phase2Wizard confirmation (line 407-514) DOES show: destination, origin, dates, traveler type, passengers (if family/group), accommodation, pace, budget, and preferences count.

**Missing items per bug report**: "Nome, Bio, Passageiros, Preferencias"
- Nome (name): IS shown in Phase1Wizard step 4 line 557-560 (if filled)
- Bio: IS shown in Phase1Wizard step 4 line 583-589 (if filled)
- Passageiros (passengers): shown in Phase2Wizard confirmation line 441-468 (if family/group)
- Preferencias (preferences): shown in Phase2Wizard confirmation line 484-497

**Assessment**: Both confirmations exist and show the relevant data. The bug may stem from the Phase1 confirmation not showing Phase2 data (passengers, preferences), which is expected since Phase2 has not been completed yet at that point. If the stakeholder wants a GLOBAL confirmation that shows ALL data from all phases, that would be a new feature requiring SPEC-PROD-002.

**Fix scope**: If a global confirmation is needed, new component + spec required. If Phase1 confirmation needs more fields, requires SPEC-PROD-002.
**Estimate**: 3h (new global confirmation) | 0h (if current is correct)

---

### BUG-P1-001: Autocomplete UX -- transparency and format

**Root cause**: CONFIRMED UX issue.

Evidence in `src/components/features/expedition/DestinationAutocomplete.tsx`:
- Line 193: displays `result.shortName ?? result.displayName` in dropdown
- Line 85: on select, sets value to `result.shortName ?? result.displayName`
- Line 177: dropdown has `bg-card` background -- may appear transparent with certain themes
- No indication of which country a result belongs to (e.g., "Paris" could be France or Texas)

**Issues**:
1. Dropdown background uses `bg-card` which may have low opacity in some themes
2. Results show only `shortName` or `displayName` without country disambiguation
3. No visual indication of result type (city vs state vs country)

**Fix scope**: `DestinationAutocomplete.tsx` -- add country code/flag to results, ensure opaque background
**Estimate**: 2h

---

### BUG-P1-002: Guide collapsed sections

**Root cause**: BY DESIGN.

Evidence in `src/components/features/expedition/DestinationGuideWizard.tsx`:
- Line 29-34: STAT_SECTIONS (timezone, currency, language, electricity) are ALWAYS visible as compact 2-col grid cards
- Line 36-43: CONTENT_SECTIONS (connectivity, cultural_tips, safety, health, transport_overview, local_customs) are expandable accordion-style
- Line 286-378: content sections render as clickable buttons that expand on click
- Only ONE section can be expanded at a time (line 114-117: toggling collapses current)

**Assessment**: The 4 stat cards are always visible. The 6 content cards are collapsed by default with title+summary visible, expandable on click. This is the intended card-based layout from Sprint 19 redesign.

If the stakeholder wants all sections expanded by default, that is a UX spec change.

**Fix scope**: If "expand all by default" desired, change state logic in DestinationGuideWizard.tsx
**Estimate**: 1h (if spec change confirmed) | 0h (if by-design)

---

### BUG-P1-003: Phase 4 car rental in wrong step

**Root cause**: CONFIRMED. The car rental prerequisite question (with CNH logic) is in Phase4Wizard step 1 (transport step), lines 302-462. The stakeholder wants it in step 3 (mobility step).

Evidence:
- `src/components/features/expedition/Phase4Wizard.tsx` step 1 (line 302-463): contains BOTH the car rental question AND the TransportStep
- Step 3 (line 488-536): contains MobilityStep + advance button
- `src/components/features/expedition/MobilityStep.tsx`: has `car_rental` as one of the `LOCAL_MOBILITY_OPTIONS` (from transport.schema.ts line 25)

**Issue**: Car rental question is a PREREQUISITE check (need CNH?) that logically belongs with mobility planning, not transport booking. Currently, step 1 mixes long-haul transport (flights/trains) with local car rental decisions.

**Fix scope**: Move car rental question + CNH logic from Phase4Wizard step 1 to step 3 (before MobilityStep). Requires SPEC-PROD-001.
**Estimate**: 2.5h (refactor Phase4Wizard, move state, update tests)

---

### BUG-P1-004: Phase 4 transport not pre-filled

**Root cause**: CONFIRMED. TransportStep does not pre-fill origin/destination from trip data.

Evidence:
- `src/components/features/expedition/Phase4Wizard.tsx` line 33-39: receives `tripId, tripType, destination, startDate` as props -- but NOT origin
- `src/components/features/expedition/TransportStep.tsx` line 27-32: receives `tripId, initialSegments, onSave, saving` -- no trip context
- Line 36-51: `createEmptySegment()` creates a blank segment with all null fields
- Line 63-67: uses `initialSegments` if loaded from DB, else creates one empty segment

The TransportStep has no mechanism to pre-populate `departurePlace`/`arrivalPlace` from the trip's origin/destination, nor `departureAt` from the trip's startDate.

**Fix scope**: Pass origin + destination + dates from Phase4Wizard to TransportStep and pre-fill first segment. Requires SPEC-PROD-001.
**Estimate**: 2h (add props, pre-fill logic, fetch origin from trip, tests)

---

### BUG-P1-005: Profile name not saving

**Root cause**: NOT CONFIRMED from code analysis. Two save paths both look correct:

1. Phase1Wizard -> `createExpeditionAction` -> line 74-85: `db.user.update({ data: { name } })` -- saves to User model
2. Account ProfileForm -> `updateUserProfileAction` -> line 72-81: `db.user.update({ data: { name } })` -- saves to User model

Both paths write to `User.name` correctly. The `name` field is NOT in `PROFILE_FIELD_POINTS` (gamification.types.ts line 104-116), so `ProfileService.saveAndAwardProfileFields` skips it, but that is handled separately by the explicit `db.user.update` call.

**Possible issue**: Race condition or revalidation -- after Phase1 saves name, the dashboard may not show updated name until page refresh because `revalidatePath("/dashboard")` may not cover the session display name.

**Fix scope**: Needs reproduction steps. May require `revalidatePath` on user layout or session refresh.
**Estimate**: 1h (investigation + fix if confirmed)

---

### BUG-P1-006: Language switch 404 on Phase 3

**Root cause**: LIKELY CONFIRMED. The i18n routing uses `localePrefix: 'as-needed'` (routing.ts line 6), meaning the default locale (pt-BR) has no prefix. When switching language on `/expedition/[tripId]/phase-3`:

- The `next-intl` middleware handles locale switching by rewriting URLs
- Phase routes are dynamic: `/expedition/[tripId]/phase-3`
- The middleware at line 78 runs `intlMiddleware(req)` which handles the locale rewrite

The 404 could occur if the language switcher constructs an incorrect URL for the current path. The `LanguageSwitcher` component would need to preserve the full dynamic path when switching locales.

**Fix scope**: Check LanguageSwitcher implementation and ensure it passes the full pathname (including dynamic segments) when switching locale. May need to use `usePathname()` correctly.
**Estimate**: 1.5h (debug + fix LanguageSwitcher or middleware)

---

### BUG-P1-007: Gamification points not removed on deselect

**Root cause**: CONFIRMED BY DESIGN -- points are NEVER removed.

Evidence in `src/server/actions/profile.actions.ts` line 260-283:
- `savePreferencesAction` iterates over categories
- Line 266: only awards points when `isFilledNow && !wasFilledBefore` (newly filled)
- Line 268-278: checks for existing `pointTransaction` and only creates if not found
- There is NO logic to reverse/deduct points when a category is unfilled

**Assessment**: The gamification engine uses an additive-only points model. Points are awarded on first fill and never revoked. This is common in gamification design to avoid negative player experience. However, if the stakeholder expects points to be deducted when preferences are deselected, that is a feature change.

**Fix scope**: If point reversal is required, add deduction logic in savePreferencesAction. Requires SPEC-PROD-002.
**Estimate**: 2.5h (deduction logic + idempotency + tests) | 0h (if additive-only is desired)

---

### BUG-P1-008: Phase 6 no back button

**Root cause**: CONFIRMED.

Evidence in `src/components/features/expedition/Phase6Wizard.tsx`:
- Line 326-364: empty state (no itinerary) -- has generate button, NO back button
- Line 368-443: generated state (with itinerary) -- has regenerate button, NO back button
- There is no navigation to return to Phase 5 from Phase 6

The Phase6Wizard has no back/return navigation to previous phases. Other wizards (Phase4Wizard) have back buttons between steps but not to return to previous phases.

**Fix scope**: Add a back/return button linking to `/expedition/${tripId}/phase-5`. Requires SPEC-PROD-001.
**Estimate**: 0.5h

---

### BUG-P1-009: Phase 6 drag-and-drop time adjustment

**Root cause**: FEATURE NOT IMPLEMENTED.

Evidence:
- `src/components/features/itinerary/ItineraryEditor.tsx` uses `@dnd-kit` for activity reordering WITHIN a day
- `src/components/features/itinerary/ActivityItem.tsx` uses `useSortable` for drag handles
- The drag-and-drop supports reordering the sequence of activities within a day
- There is NO time adjustment logic -- activities have a `startTime` field but dragging does NOT update times
- `reorderActivitiesAction` only updates `order` field, not `startTime`

**Assessment**: The current DnD only reorders activity sequence. Time adjustment via drag (e.g., drag an activity to a different time slot) is a new feature, not a bug fix.

**Fix scope**: New feature -- requires SPEC-PROD-002 or separate spec. Significant complexity.
**Estimate**: 6-8h (time-slot DnD, conflict detection, persist, tests)

---

## Effort Estimates

| Bug ID | Description | Estimate | Sprint | Spec Required | Classification |
|--------|-------------|----------|--------|---------------|----------------|
| BUG-P0-001 | Phase sequencing -- passengers conditional | 1h | 25 | SPEC-PROD-001 | Spec clarification needed |
| BUG-P0-002 | Progress bar link target | 1.5h | 25 | SPEC-PROD-001 | Spec clarification needed |
| BUG-P0-003 | Dashboard tool buttons | 0.5h | 25 | SPEC-PROD-002 | Spec clarification needed |
| BUG-P0-004 | Confirmation screen scope | 3h | 25 | SPEC-PROD-002 | Spec clarification needed |
| BUG-P1-001 | Autocomplete UX | 2h | 25 | SPEC-PROD-001 | Confirmed UX issue |
| BUG-P1-002 | Guide collapsed sections | 1h | 25 | SPEC-PROD-002 | By-design, spec change |
| BUG-P1-003 | Car rental in wrong step | 2.5h | 25 | SPEC-PROD-001 | Confirmed misplacement |
| BUG-P1-004 | Transport not pre-filled | 2h | 25 | SPEC-PROD-001 | Confirmed missing feature |
| BUG-P1-005 | Profile name save | 1h | 25 | -- | Needs reproduction |
| BUG-P1-006 | Language switch 404 | 1.5h | 25 | -- | Likely confirmed |
| BUG-P1-007 | Points not removed on deselect | 2.5h | 25/26 | SPEC-PROD-002 | By-design, spec change |
| BUG-P1-008 | Phase 6 back button | 0.5h | 25 | SPEC-PROD-001 | Confirmed missing |
| BUG-P1-009 | Phase 6 DnD time adjustment | 6-8h | 26 | New spec | New feature |
| **TOTAL** | | **~25h** | | | |

---

## Sprint 25 Task Plan (40h budget)

### Blockers

> CRITICAL: SPEC-PROD-001 and SPEC-PROD-002 must reach "Approved" status before implementation begins. This is the first SDD sprint -- NO code ships without approved specs.

### Phase 1: Spec Review and Approval (Day 1) -- 4h

| Task | Owner | Depends On | Est |
|------|-------|------------|-----|
| T-S25-001: Review SPEC-PROD-001 (navigation/phase sequencing) against root-cause findings | tech-lead | SPEC-PROD-001 submitted | 1.5h |
| T-S25-002: Review SPEC-PROD-002 (dashboard/confirmation) against root-cause findings | tech-lead | SPEC-PROD-002 submitted | 1.5h |
| T-S25-003: Coordinate cross-agent reviews (security, architecture) on both specs | tech-lead | T-S25-001, T-S25-002 | 1h |

### Phase 2: Implementation (Days 2-4) -- 28h

#### Stream A: Navigation and Phase Sequencing (SPEC-PROD-001)

| Task | Owner | Depends On | Spec Ref | Est |
|------|-------|------------|----------|-----|
| T-S25-004: Fix progress bar link targets per approved spec | dev-fullstack-1 | T-S25-001 approved | SPEC-PROD-001 | 1.5h |
| T-S25-005: Move car rental prerequisite from step 1 to step 3 in Phase4Wizard | dev-fullstack-1 | T-S25-001 approved | SPEC-PROD-001 | 2.5h |
| T-S25-006: Pre-fill TransportStep with trip origin/destination/dates | dev-fullstack-1 | T-S25-005 | SPEC-PROD-001 | 2h |
| T-S25-007: Add back button to Phase6Wizard (link to phase-5) | dev-fullstack-1 | T-S25-001 approved | SPEC-PROD-001 | 0.5h |
| T-S25-008: Improve DestinationAutocomplete UX (country badge, opaque bg) | dev-fullstack-2 | T-S25-001 approved | SPEC-PROD-001 | 2h |
| T-S25-009: Resolve passengers step visibility per spec decision | dev-fullstack-2 | T-S25-001 approved | SPEC-PROD-001 | 1h |

#### Stream B: Dashboard and Confirmation (SPEC-PROD-002)

| Task | Owner | Depends On | Spec Ref | Est |
|------|-------|------------|----------|-----|
| T-S25-010: Update dashboard tool buttons per approved spec | dev-fullstack-2 | T-S25-002 approved | SPEC-PROD-002 | 0.5h |
| T-S25-011: Implement confirmation screen changes per approved spec | dev-fullstack-2 | T-S25-002 approved | SPEC-PROD-002 | 3h |
| T-S25-012: Update guide section expansion behavior per approved spec | dev-fullstack-2 | T-S25-002 approved | SPEC-PROD-002 | 1h |

#### Stream C: Independent Bug Fixes (no spec dependency)

| Task | Owner | Depends On | Spec Ref | Est |
|------|-------|------------|----------|-----|
| T-S25-013: Fix language switch 404 on Phase 3 (LanguageSwitcher + middleware) | dev-fullstack-1 | None | -- (bug fix) | 1.5h |
| T-S25-014: Investigate and fix profile name save issue | dev-fullstack-1 | None | -- (bug fix) | 1h |

### Phase 3: Testing and Verification (Day 5) -- 8h

| Task | Owner | Depends On | Est |
|------|-------|------------|-----|
| T-S25-015: Integration tests for Phase4Wizard changes (car rental move, pre-fill) | dev-fullstack-1 | T-S25-005, T-S25-006 | 2h |
| T-S25-016: Integration tests for progress bar, Phase6 back button, autocomplete | dev-fullstack-2 | T-S25-004, T-S25-007, T-S25-008 | 2h |
| T-S25-017: Spec conformance verification -- all tasks vs approved specs | tech-lead | T-S25-015, T-S25-016 | 2h |
| T-S25-018: Build verification (`npm run build` + `npm run test`) | dev-fullstack-1 | T-S25-017 | 1h |
| T-S25-019: Security review of Sprint 25 changes | tech-lead | T-S25-018 | 1h |

### Dependency Map

```
T-S25-001 (spec review) ──┬──> T-S25-004 (progress bar)
                          ├──> T-S25-005 (car rental move) ──> T-S25-006 (transport pre-fill) ──> T-S25-015 (tests)
                          ├──> T-S25-007 (phase6 back)
                          ├──> T-S25-008 (autocomplete UX) ──> T-S25-016 (tests)
                          └──> T-S25-009 (passengers visibility)

T-S25-002 (spec review) ──┬──> T-S25-010 (dashboard buttons)
                          ├──> T-S25-011 (confirmation screen)
                          └──> T-S25-012 (guide sections)

Independent:               ├──> T-S25-013 (lang switch 404)
                          └──> T-S25-014 (profile name save)

T-S25-015 + T-S25-016 ──> T-S25-017 (conformance) ──> T-S25-018 (build) ──> T-S25-019 (security)
```

### Parallel Execution Plan

| Day | dev-fullstack-1 | dev-fullstack-2 | tech-lead |
|-----|-----------------|-----------------|-----------|
| 1 | T-S25-013, T-S25-014 (independent fixes) | -- | T-S25-001, T-S25-002, T-S25-003 (spec review) |
| 2 | T-S25-005 (car rental move) | T-S25-008 (autocomplete), T-S25-009 (passengers) | Review spec feedback |
| 3 | T-S25-006 (transport pre-fill), T-S25-007 (phase6 back) | T-S25-010, T-S25-011, T-S25-012 (dashboard/confirm) | Code review |
| 4 | T-S25-004 (progress bar), T-S25-015 (tests) | T-S25-016 (tests) | Code review |
| 5 | T-S25-018 (build verification) | -- | T-S25-017 (conformance), T-S25-019 (security) |

### Total Estimate: ~36h (within 40h budget, 4h buffer)

---

## Sprint 26 Backlog (Deferred)

| Item | Estimate | Reason for Deferral |
|------|----------|-------------------|
| BUG-P1-007: Points reversal on preference deselect | 2.5h | Requires spec decision on gamification model |
| BUG-P1-009: Phase 6 DnD time adjustment | 6-8h | New feature, requires dedicated spec |
| SEC-S20-OBS-001: Total passenger cap enforcement | 0.5h | Already capped at 20 via Zod, needs API enforcement |
| SEC-S20-OBS-002: Booking code AES-256-GCM encryption | 1.5h | Already encrypted in transport.service.ts, needs audit |
| Phase2Wizard PassengersStep extraction | 0h | Already extracted in Sprint 21 |
| AI integration: itinerary uses transport data | 4-6h | Requires prompt-engineer coordination |
| Clickable progress bar labels (P3) | 1h | Low priority UX polish |

---

## Key Observations for Spec Authors

1. **Many "P0 bugs" are actually spec ambiguities**: BUG-P0-001, P0-002, P0-003, P0-004 all stem from unclear expected behavior rather than code defects. The specs MUST define exact expected behavior.

2. **Phase4Wizard step flow needs spec clarification**: Current order is (1) Car Rental + Transport, (2) Accommodation, (3) Mobility + Advance. If car rental moves to step 3, the steps become (1) Transport, (2) Accommodation, (3) Car Rental + Mobility + Advance.

3. **Confirmation screen scope**: Phase1 and Phase2 each have their own confirmation steps. A "global" confirmation showing all expedition data does not exist and would require a new component.

4. **Gamification points model**: Currently additive-only (never deducted). Changing this has implications for badges (identity_explorer at 5+ categories -- does unfilling revoke the badge?).

5. **Two progress bar components exist**: DashboardPhaseProgressBar (dashboard cards) and ExpeditionProgressBar (inside wizard pages). Both need consistent behavior per spec.

---

## Definition of Done -- Sprint 25

- [ ] All tasks above marked [x]
- [ ] SPEC-PROD-001 approved before Stream A implementation
- [ ] SPEC-PROD-002 approved before Stream B implementation
- [ ] Code review approved by tech-lead for all PRs
- [ ] Test coverage >= 80% on modified files
- [ ] `npm run build` passes cleanly
- [ ] `npm run test` passes with 0 failures
- [ ] Security checklist passed (no hardcoded secrets, inputs validated, auth enforced)
- [ ] No bias risks in modified outputs
- [ ] Merged to main via PR -- no direct commits
- [ ] All commits reference spec IDs per SDD convention
