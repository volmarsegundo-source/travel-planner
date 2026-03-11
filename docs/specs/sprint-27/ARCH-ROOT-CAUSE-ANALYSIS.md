# Architecture Root-Cause Analysis: Recurring Bugs

**Document ID**: ARCH-RCA-S27
**Author**: architect
**Status**: Final
**Created**: 2026-03-11
**Sprint**: 27 (Pre-planning)

---

## Executive Summary

Manual testing across v0.19.0 surfaced ~40 NOK findings, many of which are **recurrences** of bugs previously marked as fixed. This document traces each recurring bug to its structural root cause, explains why prior fixes were insufficient, and prescribes the correct architectural fix.

The overarching pattern: these bugs share a common anti-pattern of **treating symptoms (CSS values, isolated component fixes) rather than structural defects (container constraints, missing architectural layers, inconsistent navigation contracts)**.

---

## REC-001: Destination Autocomplete Dropdown Clipped / Invisible

### Symptom
The `DestinationAutocomplete` dropdown appears behind or is clipped by surrounding elements. Users type a destination, results load (confirmed via network tab), but the dropdown is not visible.

### Prior Fix Attempts
Multiple sprints applied CSS corrections: `z-50`, `shadow-lg`, `bg-card`, `absolute` positioning. All correct in isolation.

### Root Cause: CSS Stacking Context + Overflow Clipping

The autocomplete dropdown renders inside the following DOM hierarchy:

```
Phase1Wizard (line 252)
  div.flex.min-h-[80vh].flex-col.items-center.justify-center.p-6
    div.w-full.max-w-md                         <-- (A) narrow container
      div.mt-8.flex.flex-col.gap-6              <-- (B) step content, key={currentStep}
        div.flex.flex-col.gap-4                 <-- (C) Step 2 wrapper
          DestinationAutocomplete
            div.relative                        <-- (D) autocomplete container
              ul.absolute.z-50.mt-1...          <-- dropdown
```

**Problem 1 -- Overflow chain**: While none of these containers explicitly set `overflow: hidden`, the combination of `flex-col` + `gap-6` + `max-w-md` creates a layout where the dropdown's `absolute` positioning is constrained by the nearest containing block (D). The `z-50` on the dropdown is correct, but z-index only works within the same stacking context. If any ancestor creates a new stacking context (e.g., via `transform`, `opacity < 1`, `will-change`, `filter`, or certain `backdrop-blur` effects), the z-index is trapped.

**Problem 2 -- `key={currentStep}` remount**: The step content wrapper at (B) uses `key={currentStep}`. When the step changes, React unmounts and remounts the entire subtree. If the dropdown is open during a rapid step transition, the component is destroyed mid-render.

**Problem 3 -- No portal rendering**: The dropdown renders inside the DOM hierarchy of the form. Any parent that clips overflow (now or in a future CSS change) will hide the dropdown. This is the fundamental architectural issue.

### Evidence from Code

File: `src/components/features/expedition/Phase1Wizard.tsx`
- Line 264-268: `<div ref={stepContentRef} key={currentStep} className="mt-8 flex flex-col gap-6">` -- this is the step container.
- Line 434-452: Step 2 renders two `DestinationAutocomplete` instances (destination + origin), both inside `<div className="flex flex-col gap-4">`.

File: `src/components/features/expedition/DestinationAutocomplete.tsx`
- Line 183: `<div ref={containerRef} className="relative">` -- dropdown anchor.
- Line 213-248: `<ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto ...">` -- the dropdown. CSS is correct in isolation.

### Why CSS-Only Fixes Keep Failing

Each fix correctly identifies the CSS properties needed (`z-50`, `bg-card`, `shadow-lg`). But the bug is not about the dropdown's own styles -- it is about the **rendering context**. The dropdown is trapped inside a DOM subtree that may clip it. Any future change to parent containers (adding a transform, changing overflow, adding backdrop effects) will re-break it.

### Correct Fix

**Use a React portal** to render the dropdown outside the DOM hierarchy entirely, appending it to `document.body`. This escapes all stacking contexts and overflow constraints. The portal approach requires:

1. Compute dropdown position relative to the viewport using `getBoundingClientRect()` on the input element.
2. Render the `<ul>` via `createPortal(...)` to `document.body`.
3. Update position on scroll/resize.
4. Handle click-outside detection correctly (portal is outside `containerRef`).

**Alternative**: Replace the custom autocomplete with an established combobox library that already handles portal rendering (see SPEC-ARCH-003).

### Severity: HIGH
### Estimated Effort: 4h (portal) or 6-8h (library replacement)

---

## REC-002: Progress Bar Does Not Navigate When Clicked

### Symptom
Users click the progress bar and nothing happens. "The progress bar is not interactive."

### Root Cause: Three Components, Two Non-Interactive

The codebase has **three distinct progress bar components**, each with different behavior:

| Component | File | Purpose | Interactive? |
|---|---|---|---|
| `PhaseProgressBar` | `src/components/features/expedition/PhaseProgressBar.tsx` | Step counter within a phase (e.g., "Step 2 of 4") | **No** -- renders `<div>` elements |
| `ExpeditionProgressBar` | `src/components/features/expedition/ExpeditionProgressBar.tsx` | Phase-to-phase navigation within expedition | **Partially** -- past phases are `<button>`, current/future are `<div>` |
| `DashboardPhaseProgressBar` | `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` | Overview on dashboard expedition cards | **No** -- all `<div>` elements, explicitly read-only |

### Usage Mapping

| Wizard | Uses | Interactive? |
|---|---|---|
| Phase1Wizard | `PhaseProgressBar` | No |
| Phase2Wizard | `PhaseProgressBar` | No |
| Phase3Wizard | `ExpeditionProgressBar` | Partially (past phases only) |
| Phase4Wizard | `PhaseProgressBar` | No |
| Phase5Wizard (DestinationGuideWizard) | `ExpeditionProgressBar` | Partially (past phases only) |
| Phase6Wizard | **None** | N/A |
| Dashboard (ExpeditionCard) | `DashboardPhaseProgressBar` | No |

### Why This Is Confusing

1. **Inconsistent usage**: Phases 1, 2, and 4 use `PhaseProgressBar` (step counter, non-interactive). Phases 3 and 5 use `ExpeditionProgressBar` (phase navigator, partially interactive). Phase 6 has no progress bar at all.

2. **Visual similarity**: All three components render horizontal colored bars/dots. Users cannot distinguish which type is rendered on their current page.

3. **Dashboard bar is non-interactive by design** (`DashboardPhaseProgressBar` uses `<div>` not `<button>`), but it is wrapped inside an `ExpeditionCard` that itself is a link. Users may be clicking the card and expecting phase-level navigation, but the card links to the expedition hub (`/expedition/${tripId}`), which redirects to the current phase.

4. **ExpeditionProgressBar only navigates to PAST phases**: Current phase renders as a wider `<div>` (not a button). Future phases render as `<div>`. Only `isPast && tripId` phases render as `<button>`. If the user is on Phase 2 and clicks Phase 2's segment, nothing happens -- it is a `<div>`.

### Evidence from Code

File: `src/components/features/expedition/ExpeditionProgressBar.tsx`
- Lines 44-46: `isPast = phaseNum < currentPhase`, `isCurrent = phaseNum === currentPhase`, `isNavigable = isPast && tripId && PHASE_ROUTES[phaseNum] !== undefined`
- Lines 52-66: Only `isNavigable` phases get a `<button>`. Current and future phases are `<div aria-hidden="true">`.

File: `src/components/features/expedition/PhaseProgressBar.tsx`
- Lines 19-27: Pure `<div>` elements, `aria-hidden="true"`. No interactivity at all.

File: `src/components/features/dashboard/DashboardPhaseProgressBar.tsx`
- Lines 68-77: All `<div>` elements. Comments explicitly say "all non-interactive (read-only)".

### Correct Fix

1. **Standardize to one expedition-level progress bar**: Replace `PhaseProgressBar` usage in Phase 1/2/4 wizards with `ExpeditionProgressBar` (which already handles phase navigation). This gives every phase wizard a consistent navigation mechanism.

2. **Make ExpeditionProgressBar navigate to current phase too**: The current phase segment should also be a button (navigating to current page is a no-op but maintains visual consistency -- or it can serve as a "refresh" action).

3. **Add ExpeditionProgressBar to Phase 6**: Currently missing entirely.

4. **DashboardPhaseProgressBar stays non-interactive**: This is correct behavior for the dashboard overview. No change needed.

5. **Rename for clarity**: Consider renaming `PhaseProgressBar` to `StepProgressDots` (it shows steps within a phase) and keeping `ExpeditionProgressBar` as the phase navigator.

### Severity: MEDIUM
### Estimated Effort: 3h (standardize usage) + 1h (Phase 6 addition) + 1h (rename)

---

## REC-003: Phase 2 Back Button Navigates to /trips Instead of Phase 1

### Symptom
User is on Phase 2 wizard, clicks back button, lands on `/trips` (which likely 404s or redirects) instead of returning to Phase 1.

### Root Cause: Hardcoded Route

File: `src/components/features/expedition/Phase2Wizard.tsx`
- Line 271-278: The first step ("travelerType") renders a back button:
  ```tsx
  onClick={() => router.push("/trips")}
  ```
  This hardcodes `/trips` which is not a valid route in the application. The correct target is Phase 1.

### Why This Was Missed
Phase 1 is special -- it creates the trip. After Phase 1 completes, the trip exists and Phase 2 loads. Going "back" to Phase 1 means revisiting a completed phase. The developer likely reasoned "there is no Phase 1 to go back to" and used `/trips` as a dashboard fallback. But `/trips` does not exist -- the dashboard is at `/dashboard`.

### Structural Issue
There is no standard "navigation contract" for expedition phases. Each wizard independently decides where its back button goes. This leads to:
- Phase 1: Back buttons go to previous **steps** within Phase 1 (correct, internal navigation).
- Phase 2 first step: Goes to `/trips` (wrong route entirely).
- Phase 3+: Use `handleBack()` internally, or navigate to previous phase via `ExpeditionProgressBar`.

### Correct Fix

1. **Immediate fix**: Change line 273 from `router.push("/trips")` to `router.push(`/expedition/${tripId}/phase-1`)` -- but Phase 1 is the creation wizard, so revisiting it after creation may not make sense.

2. **Better fix**: The back button on Phase 2's first step should go to **dashboard** (`/dashboard`), since Phase 1 is the trip creation flow and is not meaningfully "revisitable" after the trip is created.

3. **Best fix**: Define a `PHASE_BACK_TARGET` mapping:
   ```ts
   const PHASE_BACK_TARGET: Record<number, string> = {
     2: "/dashboard",       // Phase 1 is creation-only, back goes to dashboard
     3: `/expedition/${tripId}/phase-2`,
     4: `/expedition/${tripId}/phase-3`,
     5: `/expedition/${tripId}/phase-4`,
     6: `/expedition/${tripId}/phase-5`,
   };
   ```
   And enforce that every wizard's first-step back button uses this mapping.

### Severity: HIGH (broken navigation)
### Estimated Effort: 0.5h (immediate fix) or 2h (standardized mapping)

---

## REC-004: Phase Navigation Inconsistency (No Standard Contract)

### Symptom
Navigation between phases is inconsistent. Some wizards have back buttons to previous phases, some do not. Some have `ExpeditionProgressBar`, some do not.

### Root Cause: No Shared Navigation Layer

Each phase wizard independently implements:
- Internal step navigation (back/next between steps within the phase)
- External phase navigation (back to previous phase, forward to next phase)
- Phase progress display (which progress bar to use, if any)

There is no shared `ExpeditionLayout` or `PhaseShell` component that provides:
- Consistent `ExpeditionProgressBar` at the top of every phase
- A standardized "back to previous phase" button
- Breadcrumb context for the current phase

### Correct Fix

Create an `ExpeditionPhaseShell` wrapper component that:
1. Renders `ExpeditionProgressBar` with `currentPhase` and `tripId`
2. Renders phase label and title consistently
3. Provides a standardized back-to-previous-phase button
4. Wraps the phase-specific wizard content

```tsx
<ExpeditionPhaseShell phase={3} tripId={tripId} totalPhases={8}>
  <Phase3Wizard ... />
</ExpeditionPhaseShell>
```

### Severity: MEDIUM (structural improvement)
### Estimated Effort: 4h

---

## REC-005: Phase 6 Has No Progress Bar

### Symptom
Phase 6 (O Roteiro) does not display any progress bar, unlike other phases.

### Root Cause: Omission During Implementation

File: `src/components/features/expedition/Phase6Wizard.tsx`
- The component renders three states: generating (spinner), empty (no itinerary), generated (ItineraryEditor).
- None of the three states includes either `PhaseProgressBar` or `ExpeditionProgressBar`.
- The component was built during Sprint 12-16 when the focus was on AI streaming functionality. The progress bar was not included because Phase 6 has no internal "steps" (it is generate-then-edit, not a multi-step wizard). The developer omitted `ExpeditionProgressBar` as well, which would have provided phase-to-phase navigation.

### Evidence

- Phase3Wizard imports `ExpeditionProgressBar` (line 9) and renders it.
- DestinationGuideWizard (Phase 5) imports `ExpeditionProgressBar` (line 9) and renders it.
- Phase6Wizard imports neither.

### Correct Fix

Add `ExpeditionProgressBar` to Phase6Wizard's "generated" state (the main view with ItineraryEditor). It should also appear in the "empty" state. It should NOT appear in the "generating" state (that is a transient loading screen).

If the `ExpeditionPhaseShell` wrapper from REC-004 is implemented, this becomes automatic.

### Severity: LOW (cosmetic but inconsistent)
### Estimated Effort: 0.5h (standalone) or 0h if REC-004 shell is built

---

## REC-006: Completed Phase Revisit Causes Wizard Reset

### Symptom
When a user navigates back to a previously completed phase, the wizard appears in its initial state with empty fields, as if the phase was never completed.

### Root Cause: No State Hydration for Completed Phases

Phase page routes have guards that check `trip.currentPhase >= N` (e.g., phase-2/page.tsx line 35: `if (!trip || trip.currentPhase < 2)`). This means users CAN access previously completed phases -- the guard only blocks FUTURE phases.

However, when a user revisits a completed phase:
1. The server page fetches the trip data.
2. The wizard component receives props but starts with **empty local state** for form fields (e.g., Phase2Wizard initializes `travelerType` as `null`, `budget` as `1000`).
3. The Phase 2 metadata is stored in `ExpeditionPhase.metadata` (JSON) but is **not passed back to the wizard** when revisiting.
4. Result: the wizard renders as if the user never filled it out.

### Evidence

File: `src/app/[locale]/(app)/expedition/[tripId]/phase-2/page.tsx`
- Lines 24-33: Fetches `trip.destination`, `trip.origin`, `trip.startDate`, `trip.endDate`, `trip.currentPhase`. Does NOT fetch `ExpeditionPhase.metadata` for phase 2.
- Lines 50-58: Passes `tripContext` (trip-level data) to Phase2Wizard, but no phase-specific form data.

File: `src/components/features/expedition/Phase2Wizard.tsx`
- Lines 57-67: All form state is initialized with defaults (`travelerType: null`, `adults: 1`, `budget: 1000`), not from stored metadata.

The same pattern applies to Phase 4 (Phase4Wizard initializes transport/accommodation state from scratch, not from stored data).

Phase 3 is the exception -- it correctly loads checklist items from the database via `ChecklistEngine.getPhaseChecklist()`.

### Correct Fix

For each revisitable phase:
1. **Server page**: Fetch `ExpeditionPhase.metadata` for the current phase.
2. **Serialize and pass**: Extract previously saved form values from metadata and pass them as `initialValues` prop to the wizard.
3. **Wizard component**: Accept `initialValues` prop and use it to populate initial state.

Example for Phase 2:
```tsx
// phase-2/page.tsx
const phase2 = await db.expeditionPhase.findUnique({
  where: { tripId_phaseNumber: { tripId, phaseNumber: 2 } },
  select: { metadata: true, status: true },
});

const initialValues = phase2?.status === "completed" ? phase2.metadata : null;

// Phase2Wizard
<Phase2Wizard tripId={tripId} tripContext={...} initialValues={initialValues} />
```

### Severity: MEDIUM (data loss perception)
### Estimated Effort: 3h per phase (Phase 2 + Phase 4 = 6h)

---

## Summary: Root-Cause Categories

| Category | Bugs | Pattern |
|---|---|---|
| **Missing architectural layer** | REC-002, REC-004, REC-005 | No shared `ExpeditionPhaseShell` leads to inconsistent progress bars and navigation |
| **DOM rendering context** | REC-001 | Dropdown trapped inside stacking context; needs portal |
| **No navigation contract** | REC-003, REC-004 | Each wizard independently decides back-button targets |
| **No state hydration on revisit** | REC-006 | Completed phases do not re-populate wizard state from stored metadata |

---

## Recommended Fix Priority

| Priority | Bug | Effort | Impact |
|---|---|---|---|
| 1 | REC-001 (Autocomplete) | 4-8h | Blocks trip creation for some users |
| 2 | REC-003 (Phase 2 back) | 0.5h | Broken navigation, easy fix |
| 3 | REC-004 (Phase shell) | 4h | Eliminates REC-002 and REC-005 structurally |
| 4 | REC-006 (State hydration) | 6h | Improves revisit UX significantly |
| 5 | REC-002 (Progress bar naming) | 1h | Developer clarity |
| 6 | REC-005 (Phase 6 bar) | 0.5h | Cosmetic consistency |

**Total estimated effort**: 16-20h

---

> This document is intended for the tech-lead and development team. All findings are based on static code analysis of the v0.19.0 codebase. No runtime debugging was performed.
