import { describe, it, expect } from "vitest";
import {
  evaluatePhaseCompletion,
  getExpeditionCompletionSummary,
  isExpeditionComplete,
  type PhaseDataSnapshot,
} from "@/lib/engines/phase-completion.engine";

// ─── Helper ─────────────────────────────────────────────────────────────────

function makeEmptySnapshot(): PhaseDataSnapshot {
  return {
    phase1: {
      hasDestination: false,
      hasStartDate: false,
      hasEndDate: false,
      hasUserName: false,
      hasUserBirthDate: false,
    },
    phase2: { hasTravelerType: false },
    phase3: { totalRequired: 0, completedRequired: 0, hasAnyItems: false },
    phase4: { transportSegmentCount: 0, accommodationCount: 0 },
    phase5: { hasGuide: false },
    phase6: { itineraryDayCount: 0 },
  };
}

function makeCompleteSnapshot(): PhaseDataSnapshot {
  return {
    phase1: {
      hasDestination: true,
      hasStartDate: true,
      hasEndDate: true,
      hasUserName: true,
      hasUserBirthDate: true,
    },
    phase2: { hasTravelerType: true },
    phase3: { totalRequired: 3, completedRequired: 3, hasAnyItems: true },
    phase4: { transportSegmentCount: 1, accommodationCount: 1 },
    phase5: { hasGuide: true },
    phase6: { itineraryDayCount: 3 },
  };
}

// ─── Phase 1 ────────────────────────────────────────────────────────────────

describe("evaluatePhaseCompletion - Phase 1", () => {
  it("returns completed when all 5 requirements are met", () => {
    const snapshot = makeCompleteSnapshot();
    const result = evaluatePhaseCompletion(1, snapshot);
    expect(result.status).toBe("completed");
    expect(result.phase).toBe(1);
    expect(result.requirements).toHaveLength(5);
    expect(result.requirements.every((r) => r.met)).toBe(true);
  });

  it("returns in_progress when some requirements are met", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase1.hasDestination = true;
    snapshot.phase1.hasStartDate = true;
    const result = evaluatePhaseCompletion(1, snapshot);
    expect(result.status).toBe("in_progress");
    expect(result.requirements.filter((r) => r.met)).toHaveLength(2);
  });

  it("returns pending when no requirements are met", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(1, snapshot);
    expect(result.status).toBe("pending");
    expect(result.requirements.every((r) => !r.met)).toBe(true);
  });

  it("returns in_progress when only destination is present", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase1.hasDestination = true;
    const result = evaluatePhaseCompletion(1, snapshot);
    expect(result.status).toBe("in_progress");
  });

  it("returns in_progress when 4 of 5 requirements are met (missing birthDate)", () => {
    const snapshot = makeCompleteSnapshot();
    snapshot.phase1.hasUserBirthDate = false;
    const result = evaluatePhaseCompletion(1, snapshot);
    expect(result.status).toBe("in_progress");
    const birthReq = result.requirements.find((r) => r.key === "userBirthDate");
    expect(birthReq?.met).toBe(false);
  });

  it("has correct requirement keys and labels", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(1, snapshot);
    const keys = result.requirements.map((r) => r.key);
    expect(keys).toEqual(["destination", "startDate", "endDate", "userName", "userBirthDate"]);
    expect(result.requirements[0]!.label).toBe("phase1.destination");
  });
});

// ─── Phase 2 ────────────────────────────────────────────────────────────────

describe("evaluatePhaseCompletion - Phase 2", () => {
  it("returns completed when travelerType is present", () => {
    const snapshot = makeCompleteSnapshot();
    const result = evaluatePhaseCompletion(2, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns pending when travelerType is absent", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(2, snapshot);
    expect(result.status).toBe("pending");
  });

  it("has one requirement with correct label", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(2, snapshot);
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0]!.key).toBe("travelerType");
    expect(result.requirements[0]!.label).toBe("phase2.travelerType");
  });
});

// ─── Phase 3 ────────────────────────────────────────────────────────────────

describe("evaluatePhaseCompletion - Phase 3", () => {
  it("returns completed when all required items are checked", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase3 = { totalRequired: 5, completedRequired: 5, hasAnyItems: true };
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns in_progress when items exist but not all required are checked", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase3 = { totalRequired: 5, completedRequired: 2, hasAnyItems: true };
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.status).toBe("in_progress");
  });

  it("returns pending when no checklist items exist", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.status).toBe("pending");
  });

  it("returns in_progress when items exist but no required items (totalRequired=0)", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase3 = { totalRequired: 0, completedRequired: 0, hasAnyItems: true };
    const result = evaluatePhaseCompletion(3, snapshot);
    // hasAnyItems is true but totalRequired is 0, so mandatoryChecklist requirement is NOT met
    expect(result.status).toBe("in_progress");
  });

  it("returns completed when exactly 1 required item is checked of 1 total", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase3 = { totalRequired: 1, completedRequired: 1, hasAnyItems: true };
    const result = evaluatePhaseCompletion(3, snapshot);
    expect(result.status).toBe("completed");
  });
});

// ─── Phase 4 ────────────────────────────────────────────────────────────────

describe("evaluatePhaseCompletion - Phase 4", () => {
  it("returns completed when transport segment exists", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase4 = { transportSegmentCount: 1, accommodationCount: 0 };
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns completed when accommodation exists", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase4 = { transportSegmentCount: 0, accommodationCount: 1 };
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns completed when both transport and accommodation exist", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase4 = { transportSegmentCount: 2, accommodationCount: 3 };
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns pending when neither transport nor accommodation exists", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(4, snapshot);
    expect(result.status).toBe("pending");
  });
});

// ─── Phase 5 ────────────────────────────────────────────────────────────────

describe("evaluatePhaseCompletion - Phase 5", () => {
  it("returns completed when guide exists", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase5 = { hasGuide: true };
    const result = evaluatePhaseCompletion(5, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns pending when guide does not exist", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(5, snapshot);
    expect(result.status).toBe("pending");
  });
});

// ─── Phase 6 ────────────────────────────────────────────────────────────────

describe("evaluatePhaseCompletion - Phase 6", () => {
  it("returns completed when itinerary days exist", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase6 = { itineraryDayCount: 5 };
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.status).toBe("completed");
  });

  it("returns pending when no itinerary days exist", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.status).toBe("pending");
  });

  it("returns completed when exactly 1 itinerary day exists", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase6 = { itineraryDayCount: 1 };
    const result = evaluatePhaseCompletion(6, snapshot);
    expect(result.status).toBe("completed");
  });
});

// ─── Edge: out-of-range phase numbers ───────────────────────────────────────

describe("evaluatePhaseCompletion - edge cases", () => {
  it("returns pending with empty requirements for phase 0", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(0, snapshot);
    expect(result.status).toBe("pending");
    expect(result.requirements).toHaveLength(0);
    expect(result.phase).toBe(0);
  });

  it("returns pending with empty requirements for phase 7", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(7, snapshot);
    expect(result.status).toBe("pending");
    expect(result.requirements).toHaveLength(0);
  });

  it("returns pending with empty requirements for phase -1", () => {
    const snapshot = makeEmptySnapshot();
    const result = evaluatePhaseCompletion(-1, snapshot);
    expect(result.status).toBe("pending");
    expect(result.phase).toBe(-1);
  });
});

// ─── getExpeditionCompletionSummary ─────────────────────────────────────────

describe("getExpeditionCompletionSummary", () => {
  it("returns all phases completed when snapshot is complete", () => {
    const snapshot = makeCompleteSnapshot();
    const summary = getExpeditionCompletionSummary(snapshot);
    expect(summary.completedCount).toBe(6);
    expect(summary.totalPhases).toBe(6);
    expect(summary.isComplete).toBe(true);
    expect(summary.phases).toHaveLength(6);
    for (const phase of summary.phases) {
      expect(phase.status).toBe("completed");
    }
  });

  it("returns zero completed when snapshot is empty", () => {
    const snapshot = makeEmptySnapshot();
    const summary = getExpeditionCompletionSummary(snapshot);
    expect(summary.completedCount).toBe(0);
    expect(summary.isComplete).toBe(false);
    expect(summary.phases).toHaveLength(6);
  });

  it("returns mixed statuses for partially complete snapshot", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase1 = {
      hasDestination: true,
      hasStartDate: true,
      hasEndDate: true,
      hasUserName: true,
      hasUserBirthDate: true,
    };
    snapshot.phase2 = { hasTravelerType: true };
    snapshot.phase5 = { hasGuide: true };

    const summary = getExpeditionCompletionSummary(snapshot);
    expect(summary.completedCount).toBe(3); // phases 1, 2, 5
    expect(summary.isComplete).toBe(false);
    expect(summary.phases[0]!.status).toBe("completed");
    expect(summary.phases[1]!.status).toBe("completed");
    expect(summary.phases[2]!.status).toBe("pending");  // phase 3
    expect(summary.phases[3]!.status).toBe("pending");  // phase 4
    expect(summary.phases[4]!.status).toBe("completed"); // phase 5
    expect(summary.phases[5]!.status).toBe("pending");  // phase 6
  });

  it("phases array has correct phase numbers 1-6", () => {
    const snapshot = makeEmptySnapshot();
    const summary = getExpeditionCompletionSummary(snapshot);
    const phaseNumbers = summary.phases.map((p) => p.phase);
    expect(phaseNumbers).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ─── isExpeditionComplete ───────────────────────────────────────────────────

describe("isExpeditionComplete", () => {
  it("returns true when all 6 phases are complete", () => {
    expect(isExpeditionComplete(makeCompleteSnapshot())).toBe(true);
  });

  it("returns false when empty snapshot", () => {
    expect(isExpeditionComplete(makeEmptySnapshot())).toBe(false);
  });

  it("returns false when 5 of 6 phases are complete (phase 3 incomplete)", () => {
    const snapshot = makeCompleteSnapshot();
    snapshot.phase3 = { totalRequired: 3, completedRequired: 1, hasAnyItems: true };
    expect(isExpeditionComplete(snapshot)).toBe(false);
  });

  it("returns false when only phase 1 is complete", () => {
    const snapshot = makeEmptySnapshot();
    snapshot.phase1 = {
      hasDestination: true,
      hasStartDate: true,
      hasEndDate: true,
      hasUserName: true,
      hasUserBirthDate: true,
    };
    expect(isExpeditionComplete(snapshot)).toBe(false);
  });
});
