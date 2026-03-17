# Phase Navigation Redesign -- Architecture Analysis & Target Design

**Spec ID**: SPEC-ARCH-010
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-16
**Related Issues**: DT-S9-001 (mass assignment), Sprint 27 RCA findings, Sprint 29 post-mortem

---

## 1. Executive Summary

The expedition phase navigation system was built incrementally over 29 sprints. What should be a clean state machine spanning 6 phases is instead a tangled web of 23+ files with duplicated routing logic, inconsistent guard behavior, three competing progress bar components, and a fragile `isRevisiting` pattern. Despite 115 E2E tests passing, manual testing shows a 60%+ failure rate -- the tests cover happy paths while real users encounter edge cases at every phase boundary.

This document maps the complete current state (broken), defines the target architecture (clean), and provides a migration plan.

---

## 2. Current State -- Complete Inventory

### 2.1 Files Involved in Phase Navigation

#### A. Phase Page Files (Server Components -- route-level guards)

| File | Guard Logic | Redirect Target |
|---|---|---|
| `src/app/[locale]/(app)/expedition/[tripId]/page.tsx` | Hub page: finds active phase via PhaseEngine, redirects to it | `phase-{N}` (phase 1 mapped to phase-2) |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-1/page.tsx` | Trip existence only (no `currentPhase` guard) | `/expeditions` if trip not found |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-2/page.tsx` | `trip.currentPhase < 2` blocks forward skip | `phase-{currentPhase}` |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx` | `trip.currentPhase < 3` blocks forward skip | `phase-{currentPhase}` |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-4/page.tsx` | `trip.currentPhase < 4` blocks forward skip | `phase-{currentPhase}` |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-5/page.tsx` | `trip.currentPhase < 5` blocks forward skip | `phase-{currentPhase}` |
| `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx` | `trip.currentPhase < 6` blocks forward skip | `phase-{currentPhase}` |
| `src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx` | No phase guard (trip existence only) | `/expeditions` on error |
| `src/app/[locale]/(app)/expedition/new/page.tsx` | Auth only | `/auth/login` |

**Inconsistency 1**: Phase 1 page has NO `currentPhase` guard. A user can always navigate to `/expedition/{id}/phase-1` regardless of trip state.

**Inconsistency 2**: The hub page redirects phase 1 to phase-2 (line 52: `const targetPhase = phaseNumber === 1 ? 2 : phaseNumber`), assuming phase 1 is always complete. But phase 1 revisit IS a valid flow.

**Inconsistency 3**: The guard pattern is duplicated 5 times (phases 2-6) with copy-pasted redirect logic:
```typescript
if (trip.currentPhase < N) {
  const currentPhaseRoute = trip.currentPhase === 1
    ? `/expedition/${tripId}/phase-1`
    : `/expedition/${tripId}/phase-${trip.currentPhase}`;
  redirect({ href: currentPhaseRoute, locale });
}
```
This is identical in 5 files but NOT extracted into a shared utility.

#### B. Wizard Components (Client Components -- forward navigation after actions)

| Component | Forward Navigation | Back Navigation |
|---|---|---|
| `Phase1Wizard.tsx` | `router.push(/expedition/{id}/phase-2)` via `handleTransitionContinue` | N/A (first phase) |
| `Phase2Wizard.tsx` | `router.push(/expedition/{id}/phase-3)` via `handleTransitionContinue` | `router.push(/expedition/{id}/phase-1)` (first step back button) |
| `Phase3Wizard.tsx` | `router.push(/expedition/{id}/phase-4)` via `handleTransitionContinue` | `router.push(/expedition/{id}/phase-2)` |
| `Phase4Wizard.tsx` | `router.push(/expedition/{id}/phase-5)` via `handleTransitionContinue` | `router.push(/expedition/{id}/phase-3)` (step 1 back button) |
| `DestinationGuideWizard.tsx` (Phase 5 actual) | `router.push(/expedition/{id}/phase-6)` via `handleTransitionContinue` | `router.push(/expedition/{id}/phase-4)` |
| `Phase5Wizard.tsx` (connectivity -- NOT phase 5 page) | `router.push(/expedition/{id}/phase-6)` via `handleTransitionContinue` | `router.push(/expedition/{id}/phase-4)` |
| `Phase6Wizard.tsx` | `router.push(/expedition/{id}/summary)` via `handleCompleteExpeditionConfirm` | `router.push(/expedition/{id}/phase-5)` |

**Inconsistency 4**: Phase5Wizard.tsx is NOT used by the phase-5 page. The phase-5 page renders `DestinationGuideWizard`. Phase5Wizard appears to be dead code or intended for a connectivity sub-feature.

**Inconsistency 5**: Every wizard hardcodes its own navigation targets as string literals. There is no single source of truth for "phase N goes to phase N+1" or "phase N goes back to phase N-1".

#### C. Progress Bar Components (3 components, 3 different routing strategies)

| Component | Purpose | Route Map | Navigability Logic |
|---|---|---|---|
| `PhaseProgressBar.tsx` | Intra-phase steps (e.g., 4 steps within Phase 1) | None (no cross-phase nav) | Not navigable -- display only |
| `ExpeditionProgressBar.tsx` | Cross-phase navigation bar within wizards | `PHASE_ROUTES` dict (1-6 only) | `isPast OR isCurrent` -- uses `currentPhase` prop comparison |
| `DashboardPhaseProgressBar.tsx` | Cross-phase progress on expedition cards | `PHASE_ROUTES` dict (1-6 only, separate copy) | `isCompleted OR isCurrent` -- uses `completedPhases` prop comparison |

**Inconsistency 6**: `PHASE_ROUTES` is defined independently in TWO files with identical content:
- `ExpeditionProgressBar.tsx` line 13-20
- `DashboardPhaseProgressBar.tsx` line 10-17

Both map phase 1 to `""` (root expedition URL), which means clicking phase 1 in the progress bar navigates to the hub page, which then redirects to phase-2 (see Inconsistency 2). Phase 1 is effectively unreachable from progress bars.

**Inconsistency 7**: ExpeditionProgressBar uses `currentPhase` to determine navigability (past = navigable), while DashboardPhaseProgressBar uses `completedPhases`. These can diverge: if `currentPhase` is 4 but only phases 1-2 are "completed" (3-4 still "active"), the two bars show different clickable segments.

**Inconsistency 8**: Phase6Wizard does NOT render `ExpeditionProgressBar`. It is the only wizard (phases 2-6) missing cross-phase navigation. (Phase 1 also lacks it, but Phase 1 is a creation wizard with no prior phases.)

#### D. Phase Engine (Server -- business logic layer)

| Method | Role in Navigation |
|---|---|
| `PhaseEngine.canAccessPhase()` | Returns boolean -- used NOWHERE in page-level guards. Pages use raw `trip.currentPhase` comparison instead. |
| `PhaseEngine.completePhase()` | Marks phase completed, unlocks next, updates `trip.currentPhase` |
| `PhaseEngine.advanceFromPhase()` | Non-blocking skip: unlocks next without completing current |
| `PhaseEngine.getCurrentPhase()` | Used only in hub page for redirect |
| `PhaseEngine.getHighestCompletedPhase()` | Used only in hub page fallback |
| `PhaseEngine.getPhaseStatus()` | Exists but unused outside engine tests |

**Inconsistency 9**: `PhaseEngine.canAccessPhase()` exists and correctly checks `status === "active" || status === "completed"`, but NONE of the 6 phase pages use it. Instead, they all use a weaker check: `trip.currentPhase < N`. This check does NOT account for the difference between "active" and "locked" statuses in the `ExpeditionPhase` table.

#### E. isRevisiting Pattern

| Component | Definition | Effect |
|---|---|---|
| `Phase3Wizard.tsx` line 62 | `const isRevisiting = currentPhase !== undefined && currentPhase > 3` | When revisiting, primary button navigates forward (`router.push(phase-4)`) instead of calling `advanceFromPhaseAction` |
| `Phase4Wizard.tsx` line 90 | `const isRevisiting = currentPhase !== undefined && currentPhase > 4` | Same: primary button navigates forward instead of calling `advanceFromPhaseAction` |
| `Phase1Wizard.tsx` line 55-61 | Uses `savedDestination` + `tripId` presence as implicit revisit signal | Different mechanism entirely -- no `isRevisiting` variable |
| `Phase2Wizard.tsx` line 47-50 | Uses `savedData` presence as implicit revisit signal | Different mechanism entirely -- no `isRevisiting` variable |

**Inconsistency 10**: Phases 1-2 determine revisit by checking whether saved data exists (a data-centric approach). Phases 3-4 determine revisit by comparing `currentPhase > N` (a position-centric approach). Neither approach handles the case where a user is on phase 6 and revisits phase 3, edits the checklist, and wants to re-complete phase 3 -- the `isRevisiting` flag bypasses the completion action entirely.

**Inconsistency 11**: Phase 5 (DestinationGuideWizard) and Phase 6 have NO revisit handling. Visiting a completed phase 5 shows the guide but completing it again calls `completePhase5Action`, which will throw `PHASE_ALREADY_COMPLETED`. Phase 6 has no completion re-trigger but its "Complete Expedition" button calls `completeExpeditionAction` which is idempotent.

#### F. PhaseTransition Component

Used by all wizards (Phases 1-6) as an interstitial overlay between phases. Navigation flow:
1. User clicks "Advance"
2. Server action completes phase
3. `showAnimation = true` (PointsAnimation overlay)
4. User dismisses -> `showTransition = true` (PhaseTransition overlay with countdown)
5. Auto-advance or manual "Continue" -> `router.push` to next phase

This component is clean and consistent. No issues identified.

#### G. ExpeditionSummary Component

Generates phase URLs via `getPhaseUrl()` (lines 92-95):
```typescript
function getPhaseUrl(phaseNum: number): string {
  if (phaseNum === 1) return `/expedition/${tripId}`;
  return `/expedition/${tripId}/phase-${phaseNum}`;
}
```
This is a THIRD independent implementation of the same route map.

#### H. Middleware (src/middleware.ts)

Contains NO phase-related logic. All phase guards are implemented at the page level.

### 2.2 Current State Machine (Broken)

```
              NEW EXPEDITION
                   |
                   v
    +--[Phase 1: O Chamado]--+  (creation wizard, /expedition/new)
    |   Steps: Profile->Dest->Dates->Confirm
    |   On complete: createExpeditionAction -> phase-2
    |   Back: N/A
    |   Guard: NONE (always accessible)
    +-------------------------+
                   |
                   v
    +--[Phase 2: O Explorador]--+  (/expedition/{id}/phase-2)
    |   Steps: TravelerType->Passengers?->Accommodation->Pace->Budget->Prefs->Confirm
    |   On complete: completePhase2Action -> phase-3
    |   Back: phase-1
    |   Guard: currentPhase >= 2
    +----------------------------+
                   |
                   v
    +--[Phase 3: O Preparo]--+  (/expedition/{id}/phase-3)
    |   Checklist (nonBlocking)
    |   On advance: advanceFromPhaseAction(3)
    |     - If all required done: completePhase(3) -> phase-4
    |     - If incomplete: advanceFromPhase(3) -> phase-4
    |   On revisit: router.push(phase-4) DIRECTLY (no server action!)
    |   Back: phase-2
    |   Guard: currentPhase >= 3
    +-------------------------+
                   |
                   v
    +--[Phase 4: A Logistica]--+  (/expedition/{id}/phase-4)
    |   Steps: Transport->Accommodation->CarRental+Mobility
    |   On advance: advanceFromPhaseAction(4)
    |     - If carRental prerequisites met: completePhase(4) -> phase-5
    |     - If not: advanceFromPhase(4) -> phase-5
    |   On revisit: router.push(phase-5) DIRECTLY (no server action!)
    |   Back: phase-3 (step 1 only)
    |   Guard: currentPhase >= 4
    +--------------------------+
                   |
                   v
    +--[Phase 5: O Mapa dos Dias]--+  (/expedition/{id}/phase-5)
    |   DestinationGuideWizard (NOT Phase5Wizard!)
    |   On complete: completePhase5Action -> phase-6
    |   No revisit handling (will throw PHASE_ALREADY_COMPLETED)
    |   Back: phase-4
    |   Guard: currentPhase >= 5
    +------------------------------+
                   |
                   v
    +--[Phase 6: O Tesouro]--+  (/expedition/{id}/phase-6)
    |   Itinerary generation + editing
    |   On complete: completeExpeditionAction -> /summary
    |   Missing ExpeditionProgressBar!
    |   Back: phase-5
    |   Guard: currentPhase >= 6
    +-------------------------+
                   |
                   v
    +--[Summary]--+  (/expedition/{id}/summary)
    |   Read-only recap with edit links back to phases
    |   No guard (any authenticated user can access)
    +-------------+
```

### 2.3 Critical Bugs Summary

| ID | Severity | Description | Root Cause |
|---|---|---|---|
| NAV-001 | CRITICAL | Phase 1 has no access guard -- URL manipulation lets any trip owner revisit phase 1 and re-submit `createExpeditionAction`, which creates a NEW trip instead of updating | Phase 1 page lacks `currentPhase` check; Phase1Wizard calls `createExpeditionAction` (not updatePhase1Action) |
| NAV-002 | HIGH | Revisiting completed phase 5 and clicking "Advance" throws server error (PHASE_ALREADY_COMPLETED) | DestinationGuideWizard has no `isRevisiting` logic |
| NAV-003 | HIGH | Progress bars show phase 1 as clickable but navigating to it goes to hub, which redirects to phase 2 | Hub page hardcodes phase 1 -> phase 2 redirect; PHASE_ROUTES maps phase 1 to "" (hub) |
| NAV-004 | MEDIUM | Phase 6 has no ExpeditionProgressBar -- user cannot navigate backward from phase 6 except via browser back or the single "back" footer button | Missing `<ExpeditionProgressBar>` in Phase6Wizard |
| NAV-005 | MEDIUM | `isRevisiting` in phases 3/4 skips server action entirely -- no audit trail for revisit navigation | Design flaw in isRevisiting pattern |
| NAV-006 | MEDIUM | Three independent PHASE_ROUTES dictionaries (ExpeditionProgressBar, DashboardPhaseProgressBar, ExpeditionSummary) can drift | No single source of truth |
| NAV-007 | LOW | `PhaseEngine.canAccessPhase()` exists but is unused -- page guards use weaker `trip.currentPhase < N` check | Organic growth without architecture review |
| NAV-008 | LOW | Dead code: `Phase5Wizard.tsx` is not used by any page | DestinationGuideWizard replaced it; cleanup missed |

---

## 3. Target State -- PhaseNavigationEngine

### 3.1 Design Principles

1. **Single source of truth**: One engine defines all navigation rules, route maps, and guard logic.
2. **Isomorphic**: Engine is pure TypeScript with NO server imports -- usable in both server pages and client components.
3. **Exhaustive state machine**: Every (currentState, requestedAction) pair has a defined outcome.
4. **No implicit patterns**: Replace `isRevisiting` inference with explicit `PhaseAccessMode` enum.
5. **Auditable**: Every navigation decision can be logged with reason.

### 3.2 Architecture Diagram

```
                                 +--------------------------+
                                 | PhaseNavigationEngine    |
                                 | (src/lib/engines/        |
                                 |  phase-navigation.ts)    |
                                 |                          |
                                 | - PHASE_ROUTE_MAP        |
                                 | - canNavigateToPhase()   |
                                 | - getNextPhase()         |
                                 | - getPreviousPhase()     |
                                 | - resolveAccess()        |
                                 | - getPhaseUrl()          |
                                 | - getPhaseBackUrl()      |
                                 +-----------+--------------+
                                             |
                 +---------------------------+---------------------------+
                 |                           |                           |
     +-----------v-----------+   +-----------v-----------+   +-----------v-----------+
     | Server Page Guards     |   | Client Wizard Nav     |   | Progress Bars         |
     | (page.tsx files)       |   | (Phase*Wizard.tsx)    |   | (ExpeditionProgressBar|
     |                        |   |                        |   |  DashboardPhase*)     |
     | Uses:                  |   | Uses:                  |   | Uses:                 |
     | - resolveAccess()      |   | - getNextPhase()       |   | - getPhaseUrl()       |
     | - getPhaseUrl()        |   | - getPreviousPhase()   |   | - canNavigateToPhase()|
     |                        |   | - getPhaseUrl()        |   |                       |
     +------------------------+   +------------------------+   +-----------------------+
```

### 3.3 Engine API

```typescript
// src/lib/engines/phase-navigation.ts
// Pure data + logic -- no "server-only" import

import type { PhaseNumber } from "@/types/gamification.types";

// --- Constants ---

/** Total implemented phases (phases 7-8 are "coming soon") */
export const IMPLEMENTED_PHASES = 6;

/** Canonical route map -- THE single source of truth */
export const PHASE_ROUTE_MAP: Record<number, string> = {
  1: "/phase-1",
  2: "/phase-2",
  3: "/phase-3",
  4: "/phase-4",
  5: "/phase-5",
  6: "/phase-6",
};

// --- Types ---

export type PhaseAccessMode = "first_visit" | "revisit" | "blocked";

export interface PhaseAccessResult {
  allowed: boolean;
  mode: PhaseAccessMode;
  /** If not allowed, where to redirect */
  redirectTo: string | null;
  /** Human-readable reason (for logging, not user-facing) */
  reason: string;
}

export interface PhaseNavigationContext {
  /** The trip's current highest-reached phase (from trip.currentPhase) */
  currentPhase: number;
  /** Set of phase numbers that have status "completed" */
  completedPhases: Set<number>;
  /** Set of phase numbers that have status "active" */
  activePhases: Set<number>;
}

// --- Core Functions ---

/**
 * Determines whether a user can navigate to a target phase, and in what mode.
 *
 * Rules:
 * - Forward to an unlocked phase (active or completed): ALLOWED
 * - Forward to a locked phase (ahead of currentPhase): BLOCKED -> redirect to currentPhase
 * - Backward to any completed or active phase: ALLOWED (revisit mode)
 * - Phase must be within IMPLEMENTED_PHASES range
 */
export function resolveAccess(
  targetPhase: number,
  ctx: PhaseNavigationContext
): PhaseAccessResult {
  // Out of range
  if (targetPhase < 1 || targetPhase > IMPLEMENTED_PHASES) {
    return {
      allowed: false,
      mode: "blocked",
      redirectTo: getPhaseUrl(ctx.currentPhase),
      reason: `Phase ${targetPhase} is out of implemented range (1-${IMPLEMENTED_PHASES})`,
    };
  }

  // Phase is completed -- revisit
  if (ctx.completedPhases.has(targetPhase)) {
    return {
      allowed: true,
      mode: "revisit",
      redirectTo: null,
      reason: `Phase ${targetPhase} is completed -- revisit allowed`,
    };
  }

  // Phase is active (current frontier or non-blocking unlock)
  if (ctx.activePhases.has(targetPhase)) {
    const isFirstVisit = targetPhase === ctx.currentPhase;
    return {
      allowed: true,
      mode: isFirstVisit ? "first_visit" : "revisit",
      redirectTo: null,
      reason: `Phase ${targetPhase} is active`,
    };
  }

  // Phase is locked -- block and redirect
  return {
    allowed: false,
    mode: "blocked",
    redirectTo: getPhaseUrl(Math.min(ctx.currentPhase, IMPLEMENTED_PHASES)),
    reason: `Phase ${targetPhase} is locked (current phase: ${ctx.currentPhase})`,
  };
}

/**
 * Returns the URL path for a given phase.
 * Always returns a path relative to the expedition root.
 */
export function getPhaseUrl(phaseNumber: number, tripId?: string): string {
  const route = PHASE_ROUTE_MAP[phaseNumber];
  if (!route) {
    // Phases 7+ or invalid: return expedition root
    return tripId ? `/expedition/${tripId}` : "/expeditions";
  }
  return tripId ? `/expedition/${tripId}${route}` : route;
}

/**
 * Returns the summary page URL for a trip.
 */
export function getSummaryUrl(tripId: string): string {
  return `/expedition/${tripId}/summary`;
}

/**
 * Get the next phase number. Returns null if at the last implemented phase.
 */
export function getNextPhase(currentPhase: number): number | null {
  if (currentPhase >= IMPLEMENTED_PHASES) return null;
  return currentPhase + 1;
}

/**
 * Get the previous phase number. Returns null if at phase 1.
 */
export function getPreviousPhase(currentPhase: number): number | null {
  if (currentPhase <= 1) return null;
  return currentPhase - 1;
}

/**
 * Whether a phase is navigable from a progress bar context.
 * Navigable = completed OR active (i.e., not locked).
 */
export function canNavigateToPhase(
  targetPhase: number,
  ctx: PhaseNavigationContext
): boolean {
  if (targetPhase < 1 || targetPhase > IMPLEMENTED_PHASES) return false;
  return ctx.completedPhases.has(targetPhase) || ctx.activePhases.has(targetPhase);
}

/**
 * Build a PhaseNavigationContext from raw phase status data.
 * This adapter converts the DB-shaped data into the engine's input format.
 */
export function buildNavigationContext(
  currentPhase: number,
  phases: Array<{ phaseNumber: number; status: string }>
): PhaseNavigationContext {
  const completedPhases = new Set<number>();
  const activePhases = new Set<number>();

  for (const phase of phases) {
    if (phase.status === "completed") completedPhases.add(phase.phaseNumber);
    if (phase.status === "active") activePhases.add(phase.phaseNumber);
  }

  return { currentPhase, completedPhases, activePhases };
}
```

### 3.4 Shared Guard Utility for Server Pages

```typescript
// src/lib/guards/phase-access-guard.ts
import "server-only";

import { redirect } from "@/i18n/navigation";
import { db } from "@/server/db";
import {
  resolveAccess,
  buildNavigationContext,
  getPhaseUrl,
} from "@/lib/engines/phase-navigation";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation";
import { logger } from "@/lib/logger";

interface GuardResult {
  trip: { id: string; currentPhase: number; [key: string]: unknown };
  accessMode: PhaseAccessMode;
}

/**
 * Shared phase access guard for all phase page.tsx files.
 * Fetches trip + phases, checks access, redirects if blocked.
 *
 * Usage in page.tsx:
 *   const { trip, accessMode } = await guardPhaseAccess(
 *     tripId, userId, phaseNumber, locale
 *   );
 */
export async function guardPhaseAccess(
  tripId: string,
  userId: string,
  targetPhase: number,
  locale: string,
  selectFields?: Record<string, unknown>
): Promise<GuardResult> {
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId, deletedAt: null },
    select: {
      id: true,
      currentPhase: true,
      ...selectFields,
    },
  });

  if (!trip) {
    redirect({ href: "/expeditions", locale });
    // TypeScript: redirect throws, but we need to satisfy the return type
    throw new Error("unreachable");
  }

  const phases = await db.expeditionPhase.findMany({
    where: { tripId },
    select: { phaseNumber: true, status: true },
  });

  const ctx = buildNavigationContext(trip.currentPhase, phases);
  const access = resolveAccess(targetPhase, ctx);

  if (!access.allowed) {
    logger.info("navigation.phaseBlocked", {
      tripId,
      targetPhase,
      currentPhase: trip.currentPhase,
      reason: access.reason,
    });
    redirect({ href: access.redirectTo!, locale });
    throw new Error("unreachable");
  }

  return {
    trip: trip as GuardResult["trip"],
    accessMode: access.mode,
  };
}
```

### 3.5 Target State Machine (Clean)

```
              NEW EXPEDITION
                   |
                   v
    +--[Phase 1: /expedition/new]--+
    |   Guard: Auth only (no tripId yet)
    |   Creates trip + completes phase 1
    |   Forward: -> /expedition/{id}/phase-2
    |   Back: N/A
    +------------------------------+
                   |
                   v
    +--[Phase 1 Revisit: /expedition/{id}/phase-1]--+
    |   Guard: guardPhaseAccess(tripId, userId, 1, locale)
    |   accessMode: "revisit" -> renders edit form
    |   Uses updatePhase1Action (NOT createExpeditionAction)
    |   Forward: -> back to where user came from (or phase-2)
    |   Back: -> /expeditions
    +-----------------------------------------------+
                   |
                   v
    +--[Phase 2-6: /expedition/{id}/phase-{N}]--+
    |   Guard: guardPhaseAccess(tripId, userId, N, locale)
    |   accessMode passed as prop to wizard
    |   Wizard behavior:
    |     first_visit: normal completion flow
    |     revisit: save changes, navigate forward without re-completing
    |   Forward: getNextPhase(N) -> phase-{N+1} (or /summary for phase 6)
    |   Back: getPreviousPhase(N) -> phase-{N-1}
    |   All routes via getPhaseUrl()
    +-----------------------------------------------+
                   |
                   v
    +--[Summary: /expedition/{id}/summary]--+
    |   Guard: trip existence + ownership only
    |   Edit links via getPhaseUrl(N, tripId)
    +---------------------------------------+
```

Key improvements in target state:
- **One guard function** (`guardPhaseAccess`) replaces 5 copy-pasted guard blocks
- **`accessMode` replaces `isRevisiting`** -- explicitly computed from phase status, not inferred from `currentPhase > N`
- **Route map is centralized** in `PHASE_ROUTE_MAP` -- progress bars, wizards, and summary all import from the same source
- **Phase 1 revisit** is properly handled as a distinct flow from creation
- **Phase 5/6 revisit** returns `accessMode: "revisit"` so wizards can disable the completion CTA
- **`PhaseEngine.canAccessPhase()`** is superseded by `resolveAccess()` which returns richer data

### 3.6 Progress Bar Consolidation

The three progress bar components should be reduced to two (their visual purposes are genuinely different, but they must share routing logic):

| Component | Purpose | Changes |
|---|---|---|
| `PhaseProgressBar` | Intra-phase steps | NO CHANGE (no cross-phase nav) |
| `ExpeditionProgressBar` | Cross-phase nav in wizards | DELETE local `PHASE_ROUTES`; import `getPhaseUrl`, `canNavigateToPhase` from engine |
| `DashboardPhaseProgressBar` | Cross-phase progress on cards | DELETE local `PHASE_ROUTES`; import `getPhaseUrl`, `canNavigateToPhase` from engine; accept `PhaseNavigationContext` instead of raw `completedPhases` number |

Both cross-phase bars use the same `canNavigateToPhase()` function, ensuring identical navigability rules.

---

## 4. Migration Plan

### Phase A: Create Engine + Guard (Non-breaking)

| Step | Files | Risk | Effort |
|---|---|---|---|
| A1 | Create `src/lib/engines/phase-navigation.ts` | None (new file) | 1h |
| A2 | Create `src/lib/guards/phase-access-guard.ts` | None (new file) | 1h |
| A3 | Write unit tests for engine (all edge cases) | None | 2h |
| A4 | Write unit tests for guard (mock DB) | None | 1h |

### Phase B: Migrate Page Guards (Breaking -- one page at a time)

| Step | Files Changed | Risk | Effort |
|---|---|---|---|
| B1 | `phase-2/page.tsx` -- replace inline guard with `guardPhaseAccess`, pass `accessMode` | Low | 30min |
| B2 | `phase-3/page.tsx` -- same | Low | 30min |
| B3 | `phase-4/page.tsx` -- same | Low | 30min |
| B4 | `phase-5/page.tsx` -- same | Low | 30min |
| B5 | `phase-6/page.tsx` -- same + add `accessMode` prop | Low | 30min |
| B6 | `phase-1/page.tsx` -- ADD guard (currently missing) + pass `accessMode` | Medium (new behavior) | 45min |
| B7 | Hub page (`[tripId]/page.tsx`) -- simplify to use `getPhaseUrl` | Low | 30min |

### Phase C: Migrate Wizard Navigation (Breaking -- one wizard at a time)

| Step | Files Changed | Risk | Effort |
|---|---|---|---|
| C1 | `Phase2Wizard.tsx` -- replace hardcoded routes with `getPhaseUrl`, `getNextPhase`, `getPreviousPhase` | Low | 30min |
| C2 | `Phase3Wizard.tsx` -- replace `isRevisiting` pattern with `accessMode` prop | Medium | 45min |
| C3 | `Phase4Wizard.tsx` -- replace `isRevisiting` pattern with `accessMode` prop | Medium | 45min |
| C4 | `DestinationGuideWizard.tsx` -- add `accessMode` prop, disable completion on revisit | Medium | 45min |
| C5 | `Phase6Wizard.tsx` -- add `ExpeditionProgressBar`, add `accessMode` prop | Low | 30min |
| C6 | `Phase1Wizard.tsx` -- add `accessMode` prop; when "revisit", call `updatePhase1Action` | High (new action needed) | 2h |

### Phase D: Migrate Progress Bars (Breaking -- both at once)

| Step | Files Changed | Risk | Effort |
|---|---|---|---|
| D1 | `ExpeditionProgressBar.tsx` -- import from engine, delete local `PHASE_ROUTES` | Low | 30min |
| D2 | `DashboardPhaseProgressBar.tsx` -- import from engine, accept `PhaseNavigationContext` | Medium (prop change) | 45min |
| D3 | `ExpeditionCard.tsx` -- build `PhaseNavigationContext` from existing data, pass to bar | Low | 30min |
| D4 | `ExpeditionSummary.tsx` -- replace `getPhaseUrl` with engine import | Low | 15min |

### Phase E: Cleanup

| Step | Files Changed | Risk | Effort |
|---|---|---|---|
| E1 | Delete `Phase5Wizard.tsx` (dead code) or move to connectivity sub-feature | None | 15min |
| E2 | Deprecate `PhaseEngine.canAccessPhase()` -- add JSDoc pointing to new engine | None | 10min |
| E3 | Update E2E tests for new guard behavior (phase 1 now guarded) | Medium | 2h |

**Total estimated effort**: ~16 hours (2 dev-days)

---

## 5. Test Strategy

### 5.1 Unit Tests (PhaseNavigationEngine)

Target: 100% branch coverage on the engine (pure logic, no DB).

| Test Case | Expected Result |
|---|---|
| `resolveAccess(3, {current:3, completed:{1,2}, active:{3}})` | allowed, first_visit |
| `resolveAccess(2, {current:3, completed:{1,2}, active:{3}})` | allowed, revisit |
| `resolveAccess(4, {current:3, completed:{1,2}, active:{3}})` | blocked, redirect to phase-3 |
| `resolveAccess(7, {current:6, completed:{1..5}, active:{6}})` | blocked (out of range) |
| `resolveAccess(1, {current:5, completed:{1..4}, active:{5}})` | allowed, revisit |
| `resolveAccess(3, {current:5, completed:{1,2}, active:{3,5}})` | allowed, revisit (non-blocking skip) |
| `getNextPhase(6)` | null |
| `getNextPhase(3)` | 4 |
| `getPreviousPhase(1)` | null |
| `canNavigateToPhase(4, {completed:{1,2}, active:{3}})` | false |
| `canNavigateToPhase(2, {completed:{1,2}, active:{3}})` | true |
| `getPhaseUrl(3, "abc")` | "/expedition/abc/phase-3" |
| `getPhaseUrl(7, "abc")` | "/expedition/abc" |
| `buildNavigationContext(3, [{1,"completed"},{2,"completed"},{3,"active"},{4,"locked"}...])` | correct Set contents |

### 5.2 Integration Tests (guardPhaseAccess)

| Test Case | Expected Result |
|---|---|
| Trip not found | Redirect to /expeditions |
| Phase ahead of current (locked) | Redirect to current phase |
| Phase equal to current (active) | Return trip + first_visit |
| Phase behind current (completed) | Return trip + revisit |
| Phase 1 with no expedition phases in DB | Redirect (graceful degradation) |

### 5.3 E2E Tests (Playwright)

| Flow | Steps | Assertion |
|---|---|---|
| Forward happy path | Create trip -> complete phases 1-6 -> summary | Each phase loads correctly, progress bars update |
| Phase skip attempt | On phase 2, navigate to /phase-5 URL | Redirect to /phase-2 |
| Phase revisit | Complete to phase 4, navigate to /phase-2 | Phase 2 loads in revisit mode, shows saved data |
| Phase 1 revisit guard | Complete to phase 3, navigate to /phase-1 | Phase 1 loads in revisit mode (NOT create mode) |
| Progress bar navigation | On phase 4, click phase 2 segment | Navigate to /phase-2 |
| Phase 6 progress bar | Navigate to phase 6 | ExpeditionProgressBar is visible |
| Summary edit links | On summary, click phase 3 edit link | Navigate to /phase-3 in revisit mode |

---

## 6. ADR-017: Phase Navigation Engine (PROPOSED)

**Date**: 2026-03-16
**Status**: PROPOSED
**Deciders**: architect, tech-lead

### Context

Phase navigation logic is scattered across 23+ files with no single source of truth. Three independent route maps, five copy-pasted guard blocks, and an inconsistent `isRevisiting` pattern create a maintenance nightmare. The system works for happy-path forward progression but breaks on edge cases: revisiting completed phases, URL manipulation, and progress bar interactions.

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| A. Centralized isomorphic engine (this proposal) | Single source of truth; testable; no runtime cost; works server+client | Requires touching ~15 files during migration |
| B. Middleware-level phase guard | Catches all routes in one place | Cannot pass `accessMode` to components; middleware runs on Edge (limited DB access); overly coarse |
| C. React Context for navigation state | Client-side SPA feel; no prop drilling | Requires client-side fetch of phase data on every page; server pages cannot use it; adds latency |
| D. Fix bugs individually without engine | Minimal refactor | Does not address root cause; each fix adds more scattered logic; guaranteed future regressions |

### Decision

**Option A: Centralized isomorphic engine** in `src/lib/engines/phase-navigation.ts` with a companion server guard in `src/lib/guards/phase-access-guard.ts`.

Primary reason: The navigation rules are pure business logic that MUST be identical everywhere they are applied. An isomorphic engine with zero dependencies is the simplest way to guarantee consistency.

### Consequences

**Positive**:
- One file to read to understand all navigation rules
- Unit-testable without mocking Next.js or Prisma
- Progress bars, wizards, and pages all behave identically
- `accessMode` replaces ambiguous `isRevisiting` inference
- `Phase5Wizard.tsx` dead code identified and cleaned

**Negative / Trade-offs**:
- Migration touches ~15 files across 3 categories (pages, wizards, bars)
- `guardPhaseAccess` adds one extra DB query (fetch ExpeditionPhases) per page load vs current approach that only reads `trip.currentPhase`
- Props change for DashboardPhaseProgressBar (breaking for any consumers)

**Risks**:
- Phase 1 revisit requires `updatePhase1Action` which does not exist yet -- must be created
- E2E tests that rely on phase skip ability (if any) will break when guard is added to phase 1

---

## 7. Open Questions

- [ ] **OQ-1**: Should `updatePhase1Action` be a new action or should `createExpeditionAction` be made dual-purpose (create if no tripId, update if tripId)? Recommendation: separate action -- follows single responsibility principle.
- [ ] **OQ-2**: When revisiting a completed non-blocking phase (3 or 4), should the user be able to re-complete it for points? Current behavior: no (isRevisiting skips the action). Proposed: no (idempotent -- already completed phases stay completed).
- [ ] **OQ-3**: The extra DB query in `guardPhaseAccess` (fetching ExpeditionPhases) adds ~5ms per page load. Is this acceptable? Recommendation: yes -- correctness over micro-optimization. The phases data is small (max 8 rows) and frequently needed by the page anyway.
- [ ] **OQ-4**: Should `Phase5Wizard.tsx` be deleted entirely or repurposed for a future connectivity sub-step within DestinationGuideWizard? Needs PO input.

---

## 8. Definition of Done

- [ ] `PhaseNavigationEngine` created with all functions
- [ ] Unit test coverage >= 95% on engine
- [ ] `guardPhaseAccess` utility created and tested
- [ ] All 6 phase pages migrated to use `guardPhaseAccess`
- [ ] Phase 1 page now has access guard (NAV-001 fixed)
- [ ] All wizards use `accessMode` prop instead of `isRevisiting`
- [ ] Phase 6 wizard renders `ExpeditionProgressBar` (NAV-004 fixed)
- [ ] Both cross-phase progress bars import from engine (NAV-006 fixed)
- [ ] DestinationGuideWizard handles revisit mode (NAV-002 fixed)
- [ ] Hub page uses `getPhaseUrl` instead of hardcoded redirect
- [ ] E2E tests pass for all flows (forward, revisit, block, progress bar nav)
- [ ] ADR-017 accepted by tech-lead
- [ ] Dead code (`Phase5Wizard.tsx`) disposition decided

> Status: DRAFT -- Awaiting tech-lead review before implementation begins
