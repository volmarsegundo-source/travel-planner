/**
 * Unit tests for phase-completion.engine Sprint 44 additions.
 *
 * Tests the NEW phase ordering (flag ON):
 *   phase 3 = Guide     (snapshot.phase3 has { hasGuide })
 *   phase 4 = Itinerary (snapshot.phase4 has { itineraryDayCount })
 *   phase 5 = Logistics (snapshot.phase5 has { transportSegmentCount, accommodationCount })
 *   phase 6 = Checklist (snapshot.phase6 has { totalRequired, completedRequired, hasAnyItems })
 *
 * Also verifies that flag OFF path is unchanged (backward compat).
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3.1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock flag helper ─────────────────────────────────────────────────────────

const mockFlag = vi.hoisted(() => ({ isPhaseReorderEnabled: vi.fn(() => false) }));

vi.mock("@/lib/flags/phase-reorder", () => mockFlag);

// ─── Import SUT after mock ────────────────────────────────────────────────────

import {
  evaluatePhaseCompletion,
  getExpeditionCompletionSummary,
  type PhaseDataSnapshot,
} from "@/lib/engines/phase-completion.engine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setFlag(enabled: boolean) {
  mockFlag.isPhaseReorderEnabled.mockReturnValue(enabled);
}

/**
 * A snapshot laid out for the NEW ordering (flag ON).
 *
 * Key semantics with flag ON:
 *   phase3: Guide data      → { hasGuide }
 *   phase4: Itinerary data  → { itineraryDayCount }
 *   phase5: Logistics data  → { transportSegmentCount, accommodationCount }
 *   phase6: Checklist data  → { totalRequired, completedRequired, hasAnyItems }
 */
function makeReorderedSnapshot(overrides?: Partial<PhaseDataSnapshot>): PhaseDataSnapshot {
  return {
    phase1: {
      hasDestination: true,
      hasStartDate: true,
      hasEndDate: true,
      hasUserName: true,
      hasUserBirthDate: true,
    },
    phase2: { hasTravelerType: true },
    // Guide data in position 3
    phase3: { hasGuide: true } as unknown as PhaseDataSnapshot["phase3"],
    // Itinerary data in position 4
    phase4: { itineraryDayCount: 5 } as unknown as PhaseDataSnapshot["phase4"],
    // Logistics data in position 5
    phase5: {
      transportSegmentCount: 1,
      accommodationCount: 1,
    } as unknown as PhaseDataSnapshot["phase5"],
    // Checklist data in position 6
    phase6: {
      totalRequired: 3,
      completedRequired: 3,
      hasAnyItems: true,
    } as unknown as PhaseDataSnapshot["phase6"],
    ...overrides,
  };
}

function makeEmptyReorderedSnapshot(): PhaseDataSnapshot {
  return {
    phase1: {
      hasDestination: false,
      hasStartDate: false,
      hasEndDate: false,
      hasUserName: false,
      hasUserBirthDate: false,
    },
    phase2: { hasTravelerType: false },
    phase3: { hasGuide: false } as unknown as PhaseDataSnapshot["phase3"],
    phase4: { itineraryDayCount: 0 } as unknown as PhaseDataSnapshot["phase4"],
    phase5: {
      transportSegmentCount: 0,
      accommodationCount: 0,
    } as unknown as PhaseDataSnapshot["phase5"],
    phase6: {
      totalRequired: 0,
      completedRequired: 0,
      hasAnyItems: false,
    } as unknown as PhaseDataSnapshot["phase6"],
  };
}

// ─── Phase 3 = Guide (flag ON) ───────────────────────────────────────────────

describe("evaluatePhaseCompletion — phase 3 = Guide (flag ON)", () => {
  beforeEach(() => setFlag(true));

  it("returns completed when guide exists (hasGuide=true)", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.phase).toBe(3);
    expect(result.status).toBe("completed");
  });

  it("returns pending when no guide (hasGuide=false)", () => {
    const snapshot = makeEmptyReorderedSnapshot();
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.phase).toBe(3);
    expect(result.status).toBe("pending");
  });

  it("requirement key is 'guide'", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.requirements.some((r) => r.key === "guide")).toBe(true);
  });
});

// ─── Phase 4 = Itinerary (flag ON) ───────────────────────────────────────────

describe("evaluatePhaseCompletion — phase 4 = Itinerary (flag ON)", () => {
  beforeEach(() => setFlag(true));

  it("returns completed when itineraryDayCount > 0", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.phase).toBe(4);
    expect(result.status).toBe("completed");
  });

  it("returns pending when itineraryDayCount = 0", () => {
    const snapshot = makeEmptyReorderedSnapshot();
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.phase).toBe(4);
    expect(result.status).toBe("pending");
  });

  it("requirement key is 'itinerary'", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.requirements.some((r) => r.key === "itinerary")).toBe(true);
  });
});

// ─── Phase 5 = Logistics (flag ON) ───────────────────────────────────────────

describe("evaluatePhaseCompletion — phase 5 = Logistics (flag ON)", () => {
  beforeEach(() => setFlag(true));

  it("returns completed when transport or accommodation exists", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(5, snapshot);
    expect(result.phase).toBe(5);
    expect(result.status).toBe("completed");
  });

  it("returns pending when no transport or accommodation", () => {
    const snapshot = makeEmptyReorderedSnapshot();
    const result = evaluatePhaseCompletion(5, snapshot);
    expect(result.phase).toBe(5);
    expect(result.status).toBe("pending");
  });

  it("requirement key is 'logisticsEntry'", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(5, snapshot);
    expect(result.requirements.some((r) => r.key === "logisticsEntry")).toBe(true);
  });
});

// ─── Phase 6 = Checklist (flag ON) ───────────────────────────────────────────

describe("evaluatePhaseCompletion — phase 6 = Checklist (flag ON)", () => {
  beforeEach(() => setFlag(true));

  it("returns completed when all required checklist items done", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.phase).toBe(6);
    expect(result.status).toBe("completed");
  });

  it("returns pending when no checklist items", () => {
    const snapshot = makeEmptyReorderedSnapshot();
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.phase).toBe(6);
    expect(result.status).toBe("pending");
  });

  it("returns in_progress when checklist has items but not all required done", () => {
    const snapshot = makeReorderedSnapshot({
      phase6: {
        totalRequired: 3,
        completedRequired: 1,
        hasAnyItems: true,
      } as unknown as PhaseDataSnapshot["phase6"],
    });
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.phase).toBe(6);
    expect(result.status).toBe("in_progress");
  });

  it("requirement key is 'mandatoryChecklist'", () => {
    const snapshot = makeReorderedSnapshot();
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.requirements.some((r) => r.key === "mandatoryChecklist")).toBe(true);
  });
});

// ─── Full summary (flag ON) ──────────────────────────────────────────────────

describe("getExpeditionCompletionSummary — flag ON", () => {
  beforeEach(() => setFlag(true));

  it("marks all 6 phases completed when snapshot is fully populated", () => {
    const snapshot = makeReorderedSnapshot();
    const summary = getExpeditionCompletionSummary(snapshot);
    expect(summary.completedCount).toBe(6);
    expect(summary.isComplete).toBe(true);
  });

  it("marks 2 phases completed when only phases 1 and 2 have data", () => {
    const snapshot = makeEmptyReorderedSnapshot();
    snapshot.phase1 = {
      hasDestination: true,
      hasStartDate: true,
      hasEndDate: true,
      hasUserName: true,
      hasUserBirthDate: true,
    };
    snapshot.phase2 = { hasTravelerType: true };
    const summary = getExpeditionCompletionSummary(snapshot);
    expect(summary.completedCount).toBe(2);
  });

  it("summary phases array has 6 entries with correct phase numbers", () => {
    const snapshot = makeReorderedSnapshot();
    const summary = getExpeditionCompletionSummary(snapshot);
    const phaseNums = summary.phases.map((p) => p.phase);
    expect(phaseNums).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ─── Backward compat: flag OFF unchanged ─────────────────────────────────────

describe("evaluatePhaseCompletion — flag OFF (original mapping)", () => {
  beforeEach(() => setFlag(false));

  it("phase 3 (flag OFF) evaluates checklist data", () => {
    const snapshot: PhaseDataSnapshot = {
      phase1: { hasDestination: true, hasStartDate: true, hasEndDate: true, hasUserName: true, hasUserBirthDate: true },
      phase2: { hasTravelerType: true },
      phase3: { totalRequired: 2, completedRequired: 2, hasAnyItems: true },
      phase4: { transportSegmentCount: 0, accommodationCount: 0 },
      phase5: { hasGuide: false },
      phase6: { itineraryDayCount: 0 },
    };
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.phase).toBe(3);
    expect(result.status).toBe("completed");
    expect(result.requirements.some((r) => r.key === "mandatoryChecklist")).toBe(true);
  });

  it("phase 5 (flag OFF) evaluates guide data", () => {
    const snapshot: PhaseDataSnapshot = {
      phase1: { hasDestination: true, hasStartDate: true, hasEndDate: true, hasUserName: true, hasUserBirthDate: true },
      phase2: { hasTravelerType: true },
      phase3: { totalRequired: 0, completedRequired: 0, hasAnyItems: false },
      phase4: { transportSegmentCount: 0, accommodationCount: 0 },
      phase5: { hasGuide: true },
      phase6: { itineraryDayCount: 0 },
    };
    const result = evaluatePhaseCompletion(5, snapshot);
    expect(result.phase).toBe(5);
    expect(result.status).toBe("completed");
  });
});
