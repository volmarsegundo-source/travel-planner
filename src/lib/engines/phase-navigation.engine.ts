// ─── Phase Navigation Engine (pure data + logic — isomorphic) ────────────────
//
// Single source of truth for ALL phase navigation rules, route maps, and
// guard logic. Works in both server (page.tsx) and client (wizard) contexts.
// NO server-only imports — pure TypeScript.
//
// Spec refs: SPEC-ARCH-010 §3, SPEC-PROD-016 §2, SPEC-UX-019 §5

/** Total implemented/active phases (phases 7-8 are "coming soon") */
export const TOTAL_ACTIVE_PHASES = 6;

/** Phases that can be accessed regardless of linear progression */
export const NON_BLOCKING_PHASES = new Set([3, 4]);

/** Canonical route map — THE single source of truth for phase URLs */
export const PHASE_ROUTE_MAP: Record<number, string> = {
  1: "/phase-1",
  2: "/phase-2",
  3: "/phase-3",
  4: "/phase-4",
  5: "/phase-5",
  6: "/phase-6",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseState = "completed" | "current" | "available" | "locked";

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
  tripId: string;
  viewingPhase: number;
  tripCurrentPhase: number;
  completedPhases: number[];
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Determines whether a user can access a requested phase, and in what mode.
 *
 * Rules:
 * - Out of range (< 1 or > TOTAL_ACTIVE_PHASES): BLOCKED
 * - Completed phase: ALLOWED (revisit)
 * - Current phase (tripCurrentPhase): ALLOWED (first_visit)
 * - Non-blocking phases (3, 4): ALLOWED if tripCurrentPhase >= 2
 * - Forward to a locked phase: BLOCKED -> redirect to current phase
 * - Backward to any completed/active phase: ALLOWED
 */
export function resolveAccess(
  requestedPhase: number,
  tripCurrentPhase: number,
  completedPhases: number[],
  nonBlockingPhases: Set<number> = NON_BLOCKING_PHASES
): PhaseAccessResult {
  // Out of range
  if (requestedPhase < 1 || requestedPhase > TOTAL_ACTIVE_PHASES) {
    return {
      allowed: false,
      mode: "blocked",
      redirectTo: PHASE_ROUTE_MAP[Math.min(tripCurrentPhase, TOTAL_ACTIVE_PHASES)] ?? PHASE_ROUTE_MAP[1]!,
      reason: `Phase ${requestedPhase} is out of range (1-${TOTAL_ACTIVE_PHASES})`,
    };
  }

  const completedSet = new Set(completedPhases);

  // Phase is completed — revisit allowed
  if (completedSet.has(requestedPhase)) {
    return {
      allowed: true,
      mode: "revisit",
      redirectTo: null,
      reason: `Phase ${requestedPhase} is completed — revisit allowed`,
    };
  }

  // Phase is the current frontier — first visit
  if (requestedPhase === tripCurrentPhase) {
    return {
      allowed: true,
      mode: "first_visit",
      redirectTo: null,
      reason: `Phase ${requestedPhase} is the current active phase`,
    };
  }

  // Phase is behind the current frontier but not completed
  // (edge case: phase was skipped via non-blocking advance)
  if (requestedPhase < tripCurrentPhase) {
    // Differentiate completed (revisit) vs skipped (first_visit)
    if (completedSet.has(requestedPhase)) {
      return {
        allowed: true,
        mode: "revisit",
        redirectTo: null,
        reason: `Phase ${requestedPhase} is completed — revisit allowed`,
      };
    }
    return {
      allowed: true,
      mode: "first_visit",
      redirectTo: null,
      reason: `Phase ${requestedPhase} was skipped — first visit allowed`,
    };
  }

  // Non-blocking phase (3 or 4) — always accessible if past phase 1
  if (nonBlockingPhases.has(requestedPhase) && tripCurrentPhase >= 2) {
    return {
      allowed: true,
      mode: "first_visit",
      redirectTo: null,
      reason: `Phase ${requestedPhase} is non-blocking and accessible`,
    };
  }

  // Phase is ahead of current and not non-blocking — blocked
  return {
    allowed: false,
    mode: "blocked",
    redirectTo: PHASE_ROUTE_MAP[tripCurrentPhase] ?? PHASE_ROUTE_MAP[1]!,
    reason: `Phase ${requestedPhase} is locked (current phase: ${tripCurrentPhase})`,
  };
}

/**
 * Whether a user can navigate to a target phase from a progress bar.
 */
export function canNavigateToPhase(
  currentPhase: number,
  targetPhase: number,
  completedPhases: number[]
): boolean {
  if (targetPhase < 1 || targetPhase > TOTAL_ACTIVE_PHASES) return false;

  const completedSet = new Set(completedPhases);

  // Can navigate to completed phases
  if (completedSet.has(targetPhase)) return true;

  // Can navigate to current phase
  if (targetPhase === currentPhase) return true;

  // Can navigate to phases behind current
  if (targetPhase < currentPhase) return true;

  // Can navigate to non-blocking phases if past phase 1
  if (NON_BLOCKING_PHASES.has(targetPhase) && currentPhase >= 2) return true;

  return false;
}

/**
 * Get the next phase number. Returns null if at the last implemented phase.
 */
export function getNextPhase(currentPhase: number): number | null {
  if (currentPhase >= TOTAL_ACTIVE_PHASES) return null;
  if (currentPhase < 1) return 1;
  return currentPhase + 1;
}

/**
 * Get the previous phase number. Returns null if at phase 1.
 */
export function getPreviousPhase(currentPhase: number): number | null {
  if (currentPhase <= 1) return null;
  if (currentPhase > TOTAL_ACTIVE_PHASES) return TOTAL_ACTIVE_PHASES;
  return currentPhase - 1;
}

/**
 * Whether a redirect is needed and where to redirect.
 */
export function shouldRedirect(
  requestedPhase: number,
  tripCurrentPhase: number,
  completedPhases: number[]
): { redirect: boolean; target: number } {
  const access = resolveAccess(requestedPhase, tripCurrentPhase, completedPhases);
  if (access.allowed) {
    return { redirect: false, target: requestedPhase };
  }
  // Extract target phase number from redirect URL
  const redirectRoute = access.redirectTo ?? PHASE_ROUTE_MAP[1]!;
  const match = redirectRoute.match(/phase-(\d+)/);
  const target = match ? parseInt(match[1]!, 10) : tripCurrentPhase;
  return { redirect: true, target };
}

/**
 * Returns the URL path for a given phase, optionally prefixed with trip path.
 * Phase 1 maps to "/phase-1" (NOT "" or root).
 */
export function getPhaseUrl(tripId: string, phase: number): string {
  const route = PHASE_ROUTE_MAP[phase];
  if (!route) {
    // Out of range: return expeditions list
    return "/expeditions";
  }
  return `/expedition/${tripId}${route}`;
}

/**
 * Build a PhaseNavigationContext from raw data.
 */
export function buildNavigationContext(
  tripId: string,
  viewingPhase: number,
  tripCurrentPhase: number,
  completedPhases: number[]
): PhaseNavigationContext {
  return {
    tripId,
    viewingPhase,
    tripCurrentPhase,
    completedPhases,
  };
}

/**
 * Get the visual state of a phase for progress bar rendering.
 *
 * States (per SPEC-UX-019 §4.1):
 * - "completed": gold + checkmark
 * - "current": navy + pulse + phase number
 * - "available": transparent + outlined border
 * - "locked": gray 30% + lock icon + dashed border
 */
export function getPhaseState(
  phaseNumber: number,
  tripCurrentPhase: number,
  completedPhases: number[]
): PhaseState {
  if (phaseNumber < 1 || phaseNumber > TOTAL_ACTIVE_PHASES) return "locked";

  const completedSet = new Set(completedPhases);

  // Completed phase
  if (completedSet.has(phaseNumber)) return "completed";

  // Current active phase
  if (phaseNumber === tripCurrentPhase) return "current";

  // Phase behind current but not completed (skipped non-blocking)
  if (phaseNumber < tripCurrentPhase) return "available";

  // Non-blocking phase accessible
  if (NON_BLOCKING_PHASES.has(phaseNumber) && tripCurrentPhase >= 2) return "available";

  // Everything else is locked
  return "locked";
}
