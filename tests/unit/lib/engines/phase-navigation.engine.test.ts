import { describe, it, expect } from "vitest";
import {
  resolveAccess,
  canNavigateToPhase,
  getNextPhase,
  getPreviousPhase,
  shouldRedirect,
  getPhaseUrl,
  buildNavigationContext,
  getPhaseState,
  TOTAL_ACTIVE_PHASES,
  NON_BLOCKING_PHASES,
  PHASE_ROUTE_MAP,
} from "@/lib/engines/phase-navigation.engine";

// ─── Constants ───────────────────────────────────────────────────────────────

describe("PhaseNavigationEngine constants", () => {
  it("TOTAL_ACTIVE_PHASES is 6", () => {
    expect(TOTAL_ACTIVE_PHASES).toBe(6);
  });

  it("NON_BLOCKING_PHASES contains 3 and 4", () => {
    expect(NON_BLOCKING_PHASES.has(3)).toBe(true);
    expect(NON_BLOCKING_PHASES.has(4)).toBe(true);
    expect(NON_BLOCKING_PHASES.size).toBe(2);
  });

  it("PHASE_ROUTE_MAP maps phase 1 to /phase-1 (not empty string)", () => {
    expect(PHASE_ROUTE_MAP[1]).toBe("/phase-1");
  });

  it("PHASE_ROUTE_MAP has entries for all 6 phases", () => {
    for (let i = 1; i <= 6; i++) {
      expect(PHASE_ROUTE_MAP[i]).toBeDefined();
      expect(PHASE_ROUTE_MAP[i]).toBe(`/phase-${i}`);
    }
  });

  it("PHASE_ROUTE_MAP has no entry for phase 7+", () => {
    expect(PHASE_ROUTE_MAP[7]).toBeUndefined();
    expect(PHASE_ROUTE_MAP[8]).toBeUndefined();
    expect(PHASE_ROUTE_MAP[0]).toBeUndefined();
  });
});

// ─── resolveAccess ───────────────────────────────────────────────────────────

describe("resolveAccess", () => {
  describe("out of range phases", () => {
    it("blocks phase 0", () => {
      const result = resolveAccess(0, 3, [1, 2]);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
      expect(result.redirectTo).toBe("/phase-3");
    });

    it("blocks phase 7", () => {
      const result = resolveAccess(7, 3, [1, 2]);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
    });

    it("blocks phase 99", () => {
      const result = resolveAccess(99, 5, [1, 2, 3, 4]);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
    });

    it("blocks negative phase", () => {
      const result = resolveAccess(-1, 1, []);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
    });
  });

  describe("completed phases (revisit)", () => {
    it("allows revisiting a completed phase", () => {
      const result = resolveAccess(2, 5, [1, 2, 3, 4]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("revisit");
      expect(result.redirectTo).toBeNull();
    });

    it("allows revisiting phase 1 when on phase 5", () => {
      const result = resolveAccess(1, 5, [1, 2, 3, 4]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("revisit");
    });

    it("allows revisiting phase 3 when all phases completed", () => {
      const result = resolveAccess(3, 6, [1, 2, 3, 4, 5, 6]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("revisit");
    });

    it("allows revisiting phase 6 when all phases completed", () => {
      const result = resolveAccess(6, 6, [1, 2, 3, 4, 5, 6]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("revisit");
    });
  });

  describe("current phase (first visit)", () => {
    it("allows accessing the current phase as first_visit", () => {
      const result = resolveAccess(3, 3, [1, 2]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("first_visit");
    });

    it("allows accessing phase 1 as current when on phase 1", () => {
      const result = resolveAccess(1, 1, []);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("first_visit");
    });

    it("allows accessing phase 6 as current when on phase 6", () => {
      const result = resolveAccess(6, 6, [1, 2, 3, 4, 5]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("first_visit");
    });
  });

  describe("backward navigation (behind current, not completed)", () => {
    it("allows accessing a phase behind current even if not in completedPhases", () => {
      // Edge case: phase was skipped (non-blocking advance)
      const result = resolveAccess(2, 4, [1]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("revisit");
    });
  });

  describe("non-blocking phases", () => {
    it("allows accessing phase 3 when on phase 2", () => {
      const result = resolveAccess(3, 2, [1]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("first_visit");
    });

    it("allows accessing phase 4 when on phase 2", () => {
      const result = resolveAccess(4, 2, [1]);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("first_visit");
    });

    it("blocks non-blocking phase when still on phase 1", () => {
      const result = resolveAccess(3, 1, []);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
    });

    it("allows non-blocking phase 4 when on phase 3", () => {
      const result = resolveAccess(4, 3, [1, 2]);
      expect(result.allowed).toBe(true);
    });
  });

  describe("locked phases (forward skip blocked)", () => {
    it("blocks forward skip from phase 2 to phase 5", () => {
      const result = resolveAccess(5, 2, [1]);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
      expect(result.redirectTo).toBe("/phase-2");
    });

    it("blocks forward skip from phase 1 to phase 2", () => {
      const result = resolveAccess(2, 1, []);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
      expect(result.redirectTo).toBe("/phase-1");
    });

    it("blocks forward skip from phase 3 to phase 6", () => {
      const result = resolveAccess(6, 3, [1, 2]);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe("blocked");
      expect(result.redirectTo).toBe("/phase-3");
    });

    it("blocks phase 5 when on phase 2 (not non-blocking)", () => {
      const result = resolveAccess(5, 2, [1]);
      expect(result.allowed).toBe(false);
    });

    it("blocks phase 6 when on phase 4", () => {
      const result = resolveAccess(6, 4, [1, 2, 3]);
      expect(result.allowed).toBe(false);
    });
  });

  describe("revisit + re-advance scenarios", () => {
    it("allows revisiting phase 1 from phase 6 and then advancing", () => {
      // Step 1: revisit phase 1
      const revisit = resolveAccess(1, 6, [1, 2, 3, 4, 5]);
      expect(revisit.allowed).toBe(true);
      expect(revisit.mode).toBe("revisit");

      // Step 2: after editing phase 1, navigating to phase 2 (also completed)
      const advance = resolveAccess(2, 6, [1, 2, 3, 4, 5]);
      expect(advance.allowed).toBe(true);
      expect(advance.mode).toBe("revisit");
    });

    it("allows revisiting completed phase 3 and navigating forward to phase 4", () => {
      const revisit = resolveAccess(3, 5, [1, 2, 3, 4]);
      expect(revisit.allowed).toBe(true);
      const advance = resolveAccess(4, 5, [1, 2, 3, 4]);
      expect(advance.allowed).toBe(true);
    });
  });

  describe("completedPhases empty", () => {
    it("allows phase 1 as first_visit when completedPhases is empty", () => {
      const result = resolveAccess(1, 1, []);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("first_visit");
    });

    it("blocks phase 2 when completedPhases is empty and current is 1", () => {
      const result = resolveAccess(2, 1, []);
      expect(result.allowed).toBe(false);
    });
  });

  describe("completedPhases full (all 6 completed)", () => {
    const allCompleted = [1, 2, 3, 4, 5, 6];

    it("allows revisiting any phase when all completed", () => {
      for (let i = 1; i <= 6; i++) {
        const result = resolveAccess(i, 6, allCompleted);
        expect(result.allowed).toBe(true);
        expect(result.mode).toBe("revisit");
      }
    });
  });

  describe("redirect target correctness", () => {
    it("redirects to current phase route when blocked", () => {
      const result = resolveAccess(5, 3, [1, 2]);
      expect(result.redirectTo).toBe("/phase-3");
    });

    it("redirects to phase-1 for out-of-range when current is 1", () => {
      const result = resolveAccess(0, 1, []);
      expect(result.redirectTo).toBe("/phase-1");
    });

    it("includes reason string for logging", () => {
      const result = resolveAccess(5, 2, [1]);
      expect(result.reason).toContain("locked");
      expect(result.reason).toContain("2");
    });
  });
});

// ─── canNavigateToPhase ──────────────────────────────────────────────────────

describe("canNavigateToPhase", () => {
  it("returns true for completed phases", () => {
    expect(canNavigateToPhase(4, 2, [1, 2, 3])).toBe(true);
  });

  it("returns true for current phase", () => {
    expect(canNavigateToPhase(3, 3, [1, 2])).toBe(true);
  });

  it("returns true for phases behind current", () => {
    expect(canNavigateToPhase(4, 2, [1])).toBe(true);
  });

  it("returns false for locked future phases", () => {
    expect(canNavigateToPhase(3, 5, [1, 2])).toBe(false);
  });

  it("returns false for phase 0", () => {
    expect(canNavigateToPhase(3, 0, [1, 2])).toBe(false);
  });

  it("returns false for phase 7", () => {
    expect(canNavigateToPhase(3, 7, [1, 2])).toBe(false);
  });

  it("returns true for non-blocking phase 3 when on phase 2", () => {
    expect(canNavigateToPhase(2, 3, [1])).toBe(true);
  });

  it("returns true for non-blocking phase 4 when on phase 2", () => {
    expect(canNavigateToPhase(2, 4, [1])).toBe(true);
  });

  it("returns false for non-blocking phase 3 when on phase 1", () => {
    expect(canNavigateToPhase(1, 3, [])).toBe(false);
  });
});

// ─── getNextPhase ────────────────────────────────────────────────────────────

describe("getNextPhase", () => {
  it("returns 2 for phase 1", () => {
    expect(getNextPhase(1)).toBe(2);
  });

  it("returns 3 for phase 2", () => {
    expect(getNextPhase(2)).toBe(3);
  });

  it("returns 6 for phase 5", () => {
    expect(getNextPhase(5)).toBe(6);
  });

  it("returns null for phase 6 (last active phase)", () => {
    expect(getNextPhase(6)).toBeNull();
  });

  it("returns null for phase 7", () => {
    expect(getNextPhase(7)).toBeNull();
  });

  it("returns null for phase 99", () => {
    expect(getNextPhase(99)).toBeNull();
  });

  it("returns 1 for phase 0", () => {
    expect(getNextPhase(0)).toBe(1);
  });

  it("returns 1 for negative phase", () => {
    expect(getNextPhase(-1)).toBe(1);
  });
});

// ─── getPreviousPhase ────────────────────────────────────────────────────────

describe("getPreviousPhase", () => {
  it("returns null for phase 1", () => {
    expect(getPreviousPhase(1)).toBeNull();
  });

  it("returns 1 for phase 2", () => {
    expect(getPreviousPhase(2)).toBe(1);
  });

  it("returns 5 for phase 6", () => {
    expect(getPreviousPhase(6)).toBe(5);
  });

  it("returns null for phase 0", () => {
    expect(getPreviousPhase(0)).toBeNull();
  });

  it("returns null for negative phase", () => {
    expect(getPreviousPhase(-1)).toBeNull();
  });

  it("returns TOTAL_ACTIVE_PHASES for phase beyond range", () => {
    expect(getPreviousPhase(8)).toBe(6);
  });
});

// ─── shouldRedirect ──────────────────────────────────────────────────────────

describe("shouldRedirect", () => {
  it("returns no redirect for accessible phase", () => {
    const result = shouldRedirect(3, 3, [1, 2]);
    expect(result.redirect).toBe(false);
    expect(result.target).toBe(3);
  });

  it("returns redirect for locked phase", () => {
    const result = shouldRedirect(5, 3, [1, 2]);
    expect(result.redirect).toBe(true);
    expect(result.target).toBe(3);
  });

  it("returns no redirect for completed phase revisit", () => {
    const result = shouldRedirect(2, 5, [1, 2, 3, 4]);
    expect(result.redirect).toBe(false);
    expect(result.target).toBe(2);
  });

  it("returns redirect for out-of-range phase", () => {
    const result = shouldRedirect(7, 3, [1, 2]);
    expect(result.redirect).toBe(true);
    expect(result.target).toBe(3);
  });

  it("returns redirect to phase 1 for phase 0", () => {
    const result = shouldRedirect(0, 1, []);
    expect(result.redirect).toBe(true);
    expect(result.target).toBe(1);
  });
});

// ─── getPhaseUrl ─────────────────────────────────────────────────────────────

describe("getPhaseUrl", () => {
  it("returns correct URL for phase 1 (NOT empty string)", () => {
    expect(getPhaseUrl("abc", 1)).toBe("/expedition/abc/phase-1");
  });

  it("returns correct URL for phase 3", () => {
    expect(getPhaseUrl("abc", 3)).toBe("/expedition/abc/phase-3");
  });

  it("returns correct URL for phase 6", () => {
    expect(getPhaseUrl("trip-123", 6)).toBe("/expedition/trip-123/phase-6");
  });

  it("returns /expeditions for out-of-range phase", () => {
    expect(getPhaseUrl("abc", 7)).toBe("/expeditions");
  });

  it("returns /expeditions for phase 0", () => {
    expect(getPhaseUrl("abc", 0)).toBe("/expeditions");
  });

  it("returns /expeditions for negative phase", () => {
    expect(getPhaseUrl("abc", -1)).toBe("/expeditions");
  });
});

// ─── buildNavigationContext ──────────────────────────────────────────────────

describe("buildNavigationContext", () => {
  it("builds context with all fields", () => {
    const ctx = buildNavigationContext("trip-1", 3, 4, [1, 2, 3]);
    expect(ctx.tripId).toBe("trip-1");
    expect(ctx.viewingPhase).toBe(3);
    expect(ctx.tripCurrentPhase).toBe(4);
    expect(ctx.completedPhases).toEqual([1, 2, 3]);
  });

  it("builds context with empty completedPhases", () => {
    const ctx = buildNavigationContext("trip-1", 1, 1, []);
    expect(ctx.completedPhases).toEqual([]);
  });

  it("builds context with all phases completed", () => {
    const ctx = buildNavigationContext("trip-1", 6, 6, [1, 2, 3, 4, 5, 6]);
    expect(ctx.completedPhases).toHaveLength(6);
  });
});

// ─── getPhaseState ───────────────────────────────────────────────────────────

describe("getPhaseState", () => {
  describe("completed state", () => {
    it("returns completed for phase in completedPhases", () => {
      expect(getPhaseState(2, 4, [1, 2, 3])).toBe("completed");
    });

    it("returns completed for all phases when all completed", () => {
      const completed = [1, 2, 3, 4, 5, 6];
      for (let i = 1; i <= 6; i++) {
        expect(getPhaseState(i, 6, completed)).toBe("completed");
      }
    });
  });

  describe("current state", () => {
    it("returns current for tripCurrentPhase", () => {
      expect(getPhaseState(3, 3, [1, 2])).toBe("current");
    });

    it("returns current for phase 1 when on phase 1", () => {
      expect(getPhaseState(1, 1, [])).toBe("current");
    });
  });

  describe("available state", () => {
    it("returns available for phase behind current but not completed", () => {
      // Phase 2 is behind current (4) but not in completedPhases
      expect(getPhaseState(2, 4, [1])).toBe("available");
    });

    it("returns available for non-blocking phase 3 when current >= 2", () => {
      expect(getPhaseState(3, 2, [1])).toBe("available");
    });

    it("returns available for non-blocking phase 4 when current >= 2", () => {
      expect(getPhaseState(4, 2, [1])).toBe("available");
    });
  });

  describe("locked state", () => {
    it("returns locked for future phase", () => {
      expect(getPhaseState(5, 3, [1, 2])).toBe("locked");
    });

    it("returns locked for phase 6 when on phase 3", () => {
      expect(getPhaseState(6, 3, [1, 2])).toBe("locked");
    });

    it("returns locked for non-blocking phase when on phase 1", () => {
      expect(getPhaseState(3, 1, [])).toBe("locked");
    });

    it("returns locked for out-of-range phases", () => {
      expect(getPhaseState(0, 3, [1, 2])).toBe("locked");
      expect(getPhaseState(7, 3, [1, 2])).toBe("locked");
      expect(getPhaseState(-1, 3, [1, 2])).toBe("locked");
      expect(getPhaseState(99, 3, [1, 2])).toBe("locked");
    });
  });

  describe("priority: completed > current > available > locked", () => {
    it("completed takes priority over current", () => {
      // Phase 3 is both completed AND current
      expect(getPhaseState(3, 3, [1, 2, 3])).toBe("completed");
    });
  });
});

// ─── Integration scenarios ───────────────────────────────────────────────────

describe("Integration: full expedition flow", () => {
  it("new expedition: only phase 1 accessible", () => {
    const completed: number[] = [];
    const current = 1;

    expect(resolveAccess(1, current, completed).allowed).toBe(true);
    expect(resolveAccess(2, current, completed).allowed).toBe(false);
    expect(resolveAccess(3, current, completed).allowed).toBe(false);
    expect(resolveAccess(4, current, completed).allowed).toBe(false);
    expect(resolveAccess(5, current, completed).allowed).toBe(false);
    expect(resolveAccess(6, current, completed).allowed).toBe(false);
  });

  it("after phase 1 complete: phases 1-4 accessible (2=current, 3-4=non-blocking)", () => {
    const completed = [1];
    const current = 2;

    expect(resolveAccess(1, current, completed).mode).toBe("revisit");
    expect(resolveAccess(2, current, completed).mode).toBe("first_visit");
    expect(resolveAccess(3, current, completed).allowed).toBe(true); // non-blocking
    expect(resolveAccess(4, current, completed).allowed).toBe(true); // non-blocking
    expect(resolveAccess(5, current, completed).allowed).toBe(false);
    expect(resolveAccess(6, current, completed).allowed).toBe(false);
  });

  it("mid-expedition: phase 4 current, phases 1-4 accessible", () => {
    const completed = [1, 2, 3];
    const current = 4;

    for (let i = 1; i <= 4; i++) {
      expect(resolveAccess(i, current, completed).allowed).toBe(true);
    }
    expect(resolveAccess(5, current, completed).allowed).toBe(false);
    expect(resolveAccess(6, current, completed).allowed).toBe(false);
  });

  it("post-completion: all 6 phases accessible as revisit", () => {
    const completed = [1, 2, 3, 4, 5, 6];
    const current = 6;

    for (let i = 1; i <= 6; i++) {
      const result = resolveAccess(i, current, completed);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe("revisit");
    }
  });

  it("progress bar states match expected pattern at each stage", () => {
    // Stage: phase 3 current, 1-2 completed
    expect(getPhaseState(1, 3, [1, 2])).toBe("completed");
    expect(getPhaseState(2, 3, [1, 2])).toBe("completed");
    expect(getPhaseState(3, 3, [1, 2])).toBe("current");
    expect(getPhaseState(4, 3, [1, 2])).toBe("available"); // non-blocking
    expect(getPhaseState(5, 3, [1, 2])).toBe("locked");
    expect(getPhaseState(6, 3, [1, 2])).toBe("locked");
  });
});
