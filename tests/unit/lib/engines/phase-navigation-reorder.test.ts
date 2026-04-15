/**
 * Unit tests for phase-navigation.engine Sprint 44 additions:
 * - NON_BLOCKING_PHASES_REORDERED constant
 * - getNonBlockingPhases() flag-aware helper
 * - resolveAccess() behaviour when flag is ON (phases 5, 6 are non-blocking)
 * - canNavigateToPhase() and getPhaseState() flag-aware behaviour
 *
 * Existing tests cover flag-OFF behaviour. These tests cover flag-ON.
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3.3
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock flag helper ─────────────────────────────────────────────────────────

const mockFlag = vi.hoisted(() => ({ isPhaseReorderEnabled: vi.fn(() => false) }));

vi.mock("@/lib/flags/phase-reorder", () => mockFlag);

// ─── Import SUT after mock ────────────────────────────────────────────────────

import {
  NON_BLOCKING_PHASES,
  NON_BLOCKING_PHASES_REORDERED,
  getNonBlockingPhases,
  resolveAccess,
  canNavigateToPhase,
  getPhaseState,
} from "@/lib/engines/phase-navigation.engine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setFlag(enabled: boolean) {
  mockFlag.isPhaseReorderEnabled.mockReturnValue(enabled);
}

// ─── Constants ───────────────────────────────────────────────────────────────

describe("NON_BLOCKING_PHASES_REORDERED", () => {
  it("contains 5 and 6", () => {
    expect(NON_BLOCKING_PHASES_REORDERED.has(5)).toBe(true);
    expect(NON_BLOCKING_PHASES_REORDERED.has(6)).toBe(true);
    expect(NON_BLOCKING_PHASES_REORDERED.size).toBe(2);
  });

  it("does NOT contain 3 or 4 (those were non-blocking in old order)", () => {
    expect(NON_BLOCKING_PHASES_REORDERED.has(3)).toBe(false);
    expect(NON_BLOCKING_PHASES_REORDERED.has(4)).toBe(false);
  });
});

describe("getNonBlockingPhases", () => {
  beforeEach(() => setFlag(false));

  it("returns NON_BLOCKING_PHASES {3,4} when flag is OFF", () => {
    setFlag(false);
    expect(getNonBlockingPhases()).toBe(NON_BLOCKING_PHASES);
  });

  it("returns NON_BLOCKING_PHASES_REORDERED {5,6} when flag is ON", () => {
    setFlag(true);
    expect(getNonBlockingPhases()).toBe(NON_BLOCKING_PHASES_REORDERED);
  });
});

// ─── resolveAccess — flag ON ──────────────────────────────────────────────────

describe("resolveAccess — flag ON (new phase ordering)", () => {
  beforeEach(() => setFlag(true));

  it("blocks phase 3 (Guide) when on phase 2 — Guide is now a linear gate", () => {
    // In new ordering phase 3 (Guide) is NOT non-blocking → must be unlocked linearly
    // When tripCurrentPhase=2 and completedPhases=[1], phase 3 is ahead and NOT non-blocking
    const result = resolveAccess(3, 2, [1]);
    expect(result.allowed).toBe(false);
    expect(result.mode).toBe("blocked");
  });

  it("allows phase 3 (Guide) when it is the current phase", () => {
    const result = resolveAccess(3, 3, [1, 2]);
    expect(result.allowed).toBe(true);
    expect(result.mode).toBe("first_visit");
  });

  it("allows phase 5 (Logistics) when on phase 3 — phase 5 is non-blocking in new order", () => {
    const result = resolveAccess(5, 3, [1, 2]);
    expect(result.allowed).toBe(true);
    expect(result.mode).toBe("first_visit");
  });

  it("allows phase 6 (Checklist) when on phase 3 — phase 6 is non-blocking in new order", () => {
    const result = resolveAccess(6, 3, [1, 2]);
    expect(result.allowed).toBe(true);
    expect(result.mode).toBe("first_visit");
  });

  it("blocks phase 5 when still on phase 1 — non-blocking requires past phase 1", () => {
    const result = resolveAccess(5, 1, []);
    expect(result.allowed).toBe(false);
    expect(result.mode).toBe("blocked");
  });

  it("blocks phase 6 when still on phase 1", () => {
    const result = resolveAccess(6, 1, []);
    expect(result.allowed).toBe(false);
    expect(result.mode).toBe("blocked");
  });

  it("allows phase 4 (Itinerary) as current phase", () => {
    const result = resolveAccess(4, 4, [1, 2, 3]);
    expect(result.allowed).toBe(true);
    expect(result.mode).toBe("first_visit");
  });

  it("blocks phase 4 (Itinerary) when on phase 2 — Itinerary is NOT non-blocking", () => {
    const result = resolveAccess(4, 2, [1]);
    expect(result.allowed).toBe(false);
    expect(result.mode).toBe("blocked");
  });
});

// ─── canNavigateToPhase — flag ON ─────────────────────────────────────────────

describe("canNavigateToPhase — flag ON", () => {
  beforeEach(() => setFlag(true));

  it("can navigate to phase 5 (Logistics) when on phase 3 — non-blocking", () => {
    expect(canNavigateToPhase(3, 5, [1, 2])).toBe(true);
  });

  it("can navigate to phase 6 (Checklist) when on phase 2 — non-blocking", () => {
    expect(canNavigateToPhase(2, 6, [1])).toBe(true);
  });

  it("cannot navigate to phase 4 (Itinerary) when on phase 2 — locked", () => {
    expect(canNavigateToPhase(2, 4, [1])).toBe(false);
  });
});

// ─── getPhaseState — flag ON ──────────────────────────────────────────────────

describe("getPhaseState — flag ON", () => {
  beforeEach(() => setFlag(true));

  it("phase 5 is available (non-blocking) when tripCurrentPhase=2", () => {
    const state = getPhaseState(5, 2, [1]);
    expect(state).toBe("available");
  });

  it("phase 6 is available (non-blocking) when tripCurrentPhase=2", () => {
    const state = getPhaseState(6, 2, [1]);
    expect(state).toBe("available");
  });

  it("phase 3 is locked when tripCurrentPhase=2 — Guide is a linear gate", () => {
    // tripCurrentPhase=2 means phase 3 is next but not yet active
    // Wait: getPhaseState logic: phaseNumber > tripCurrentPhase AND not non-blocking → locked
    const state = getPhaseState(3, 2, [1]);
    expect(state).toBe("locked");
  });

  it("phase 3 is current when tripCurrentPhase=3", () => {
    const state = getPhaseState(3, 3, [1, 2]);
    expect(state).toBe("current");
  });
});

// ─── Backward compat: flag OFF still uses {3,4} ──────────────────────────────

describe("resolveAccess — flag OFF (original non-blocking {3,4})", () => {
  beforeEach(() => setFlag(false));

  it("allows phase 3 when on phase 2 (flag OFF — non-blocking)", () => {
    const result = resolveAccess(3, 2, [1]);
    expect(result.allowed).toBe(true);
  });

  it("allows phase 4 when on phase 2 (flag OFF — non-blocking)", () => {
    const result = resolveAccess(4, 2, [1]);
    expect(result.allowed).toBe(true);
  });

  it("blocks phase 5 when on phase 2 (flag OFF — phase 5 is linear)", () => {
    const result = resolveAccess(5, 2, [1]);
    expect(result.allowed).toBe(false);
  });
});
