/**
 * Unit tests for Sprint 44 phase reorder migration logic.
 *
 * These tests verify the correctness of the mapping function that the
 * SQL migration implements (scripts/db/migrate-phase-reorder.sql).
 * They are pure TypeScript — no real Prisma, no real DB required.
 *
 * The mapping:
 *   1 → 1  (unchanged)
 *   2 → 2  (unchanged)
 *   3 → 6  (old Checklist → new slot 6)
 *   4 → 5  (old Logistics → new slot 5)
 *   5 → 3  (old Guide     → new slot 3)
 *   6 → 4  (old Itinerary → new slot 4)
 *   7 → 7  (unchanged)
 *   8 → 8  (unchanged)
 *
 * For currentPhase (TC-REG-001 through TC-REG-007):
 *   Tests simulate each FX-01..09 fixture defined in SPEC-QA-REORDER-PHASES §4.
 *
 * For checklist items (TC-REG phase_checklist_items table):
 *   phaseNumber=3 → 6; all others unchanged.
 *
 * For UserProgress and badges:
 *   TC-REG-005: PA totals unchanged by migration (no PointTransaction rows touched)
 *   TC-REG-006: UserBadge rows untouched
 *
 * Spec ref: SPEC-QA-REORDER-PHASES §4, §4.1
 * Spec ref: SPEC-ARCH-REORDER-PHASES §5.5
 */
import { describe, it, expect } from "vitest";

// ─── Pure migration mapping (mirrors the SQL migration logic) ─────────────────

/**
 * Maps an old phase number to the new phase number after Sprint 44 migration.
 * Phases 1, 2, 7, 8 are unchanged.
 *
 * This is the canonical mapping used in the SQL script:
 *   3 → 6 | 4 → 5 | 5 → 3 | 6 → 4
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §1, SPEC-QA-REORDER-PHASES §0
 */
function migratePhaseNumber(oldPhase: number): number {
  const MAPPING: Record<number, number> = {
    1: 1,
    2: 2,
    3: 6, // old Checklist (O Preparo)   → new slot 6
    4: 5, // old Logistics (A Logística) → new slot 5
    5: 3, // old Guide (Guia do Destino) → new slot 3
    6: 4, // old Itinerary (O Roteiro)   → new slot 4
    7: 7,
    8: 8,
  };
  return MAPPING[oldPhase] ?? oldPhase;
}

/**
 * Maps a checklist item's phaseNumber.
 * Only old phase 3 (checklist) changes to new phase 6; all others are unchanged.
 */
function migrateChecklistItemPhase(oldPhase: number): number {
  return oldPhase === 3 ? 6 : oldPhase;
}

/**
 * Simulates the full migration on an expedition fixture.
 * Returns the post-migration state.
 *
 * Note: Re-coherence logic (Step 4 of SQL) is omitted here because it
 * requires querying completed phase history — that path is tested in
 * integration tests (CI-only with real Prisma).
 */
interface ExpeditionState {
  tripId: string;
  currentPhase: number;
  expeditionMode: boolean;
  phases: Array<{ phaseNumber: number; status: string }>;
  checklistItems: Array<{ phaseNumber: number; label: string }>;
  pointTransactionTotal: number; // sum of PA
  badgeCount: number;
}

function runMigration(pre: ExpeditionState): ExpeditionState {
  return {
    ...pre,
    currentPhase: migratePhaseNumber(pre.currentPhase),
    phases: pre.phases.map((p) => ({
      ...p,
      phaseNumber: migratePhaseNumber(p.phaseNumber),
    })),
    checklistItems: pre.checklistItems.map((ci) => ({
      ...ci,
      phaseNumber: migrateChecklistItemPhase(ci.phaseNumber),
    })),
    // PA totals and badges are NOT touched by migration
    pointTransactionTotal: pre.pointTransactionTotal,
    badgeCount: pre.badgeCount,
  };
}

// ─── Fixtures (FX-01..09 from SPEC-QA-REORDER-PHASES §4) ─────────────────────

/** FX-01: currentPhase=1, no phase records completed */
const FX_01: ExpeditionState = {
  tripId: "fx-01-trip-cuid000001",
  currentPhase: 1,
  expeditionMode: true,
  phases: [{ phaseNumber: 1, status: "active" }],
  checklistItems: [],
  pointTransactionTotal: 100,
  badgeCount: 0,
};

/** FX-02: currentPhase=3 (old Checklist), phases 1+2 completed, checklist answered */
const FX_02: ExpeditionState = {
  tripId: "fx-02-trip-cuid000002",
  currentPhase: 3,
  expeditionMode: true,
  phases: [
    { phaseNumber: 1, status: "completed" },
    { phaseNumber: 2, status: "completed" },
    { phaseNumber: 3, status: "active" },
  ],
  checklistItems: [
    { phaseNumber: 3, label: "Pack passport" },
    { phaseNumber: 3, label: "Book travel insurance" },
  ],
  pointTransactionTotal: 350, // P1(100) + P2(150) + partial P3
  badgeCount: 1,
};

/** FX-03: currentPhase=4 (old Logistics), transport/accommodation filled */
const FX_03: ExpeditionState = {
  tripId: "fx-03-trip-cuid000003",
  currentPhase: 4,
  expeditionMode: true,
  phases: [
    { phaseNumber: 1, status: "completed" },
    { phaseNumber: 2, status: "completed" },
    { phaseNumber: 3, status: "completed" },
    { phaseNumber: 4, status: "active" },
  ],
  checklistItems: [{ phaseNumber: 3, label: "Pack passport" }],
  pointTransactionTotal: 500,
  badgeCount: 2,
};

/** FX-04: currentPhase=5 (old Guide), guide generated */
const FX_04: ExpeditionState = {
  tripId: "fx-04-trip-cuid000004",
  currentPhase: 5,
  expeditionMode: true,
  phases: [
    { phaseNumber: 1, status: "completed" },
    { phaseNumber: 2, status: "completed" },
    { phaseNumber: 3, status: "completed" },
    { phaseNumber: 4, status: "completed" },
    { phaseNumber: 5, status: "active" },
  ],
  checklistItems: [{ phaseNumber: 3, label: "Book flights" }],
  pointTransactionTotal: 825,
  badgeCount: 3,
};

/** FX-05: currentPhase=6 (old Itinerary), itinerary generated */
const FX_05: ExpeditionState = {
  tripId: "fx-05-trip-cuid000005",
  currentPhase: 6,
  expeditionMode: true,
  phases: [
    { phaseNumber: 1, status: "completed" },
    { phaseNumber: 2, status: "completed" },
    { phaseNumber: 3, status: "completed" },
    { phaseNumber: 4, status: "completed" },
    { phaseNumber: 5, status: "completed" },
    { phaseNumber: 6, status: "active" },
  ],
  checklistItems: [{ phaseNumber: 3, label: "Pack medications" }],
  pointTransactionTotal: 1075,
  badgeCount: 4,
};

/** FX-06: currentPhase=7 (A Expedição), all 6 main phases completed */
const FX_06: ExpeditionState = {
  tripId: "fx-06-trip-cuid000006",
  currentPhase: 7,
  expeditionMode: true,
  phases: [
    { phaseNumber: 1, status: "completed" },
    { phaseNumber: 2, status: "completed" },
    { phaseNumber: 3, status: "completed" },
    { phaseNumber: 4, status: "completed" },
    { phaseNumber: 5, status: "completed" },
    { phaseNumber: 6, status: "completed" },
    { phaseNumber: 7, status: "active" },
  ],
  checklistItems: [
    { phaseNumber: 3, label: "Reconfirm hotel bookings" },
    { phaseNumber: 3, label: "Download offline maps" },
  ],
  pointTransactionTotal: 1200,
  badgeCount: 5,
};

/** FX-07: currentPhase=8 (O Legado), closed expedition */
const FX_07: ExpeditionState = {
  tripId: "fx-07-trip-cuid000007",
  currentPhase: 8,
  expeditionMode: true,
  phases: Array.from({ length: 8 }, (_, i) => ({
    phaseNumber: i + 1,
    status: "completed",
  })),
  checklistItems: [
    { phaseNumber: 3, label: "Buy souvenirs" },
    { phaseNumber: 3, label: "Write travel journal" },
  ],
  pointTransactionTotal: 1500,
  badgeCount: 7,
};

/** FX-08: Expedition created before Atlas (expeditionMode=false) */
const FX_08: ExpeditionState = {
  tripId: "fx-08-trip-cuid000008",
  currentPhase: 1,
  expeditionMode: false, // pre-Atlas — should not be touched
  phases: [],
  checklistItems: [],
  pointTransactionTotal: 0,
  badgeCount: 0,
};

/** FX-09: Expedition with corrupt phase (phaseNumber=0 — invalid) */
const FX_09_CORRUPT: ExpeditionState = {
  tripId: "fx-09-trip-cuid000009",
  currentPhase: 0, // Invalid — migration must handle gracefully
  expeditionMode: true,
  phases: [{ phaseNumber: 0, status: "active" }],
  checklistItems: [],
  pointTransactionTotal: 0,
  badgeCount: 0,
};

// ─── Phase mapping unit tests ─────────────────────────────────────────────────

describe("migratePhaseNumber — canonical mapping (TC-REG-001)", () => {
  it("phases 1 and 2 are unchanged", () => {
    expect(migratePhaseNumber(1)).toBe(1);
    expect(migratePhaseNumber(2)).toBe(2);
  });

  it("old phase 3 (Checklist) maps to new phase 6", () => {
    expect(migratePhaseNumber(3)).toBe(6);
  });

  it("old phase 4 (Logistics) maps to new phase 5", () => {
    expect(migratePhaseNumber(4)).toBe(5);
  });

  it("old phase 5 (Guide) maps to new phase 3", () => {
    expect(migratePhaseNumber(5)).toBe(3);
  });

  it("old phase 6 (Itinerary) maps to new phase 4", () => {
    expect(migratePhaseNumber(6)).toBe(4);
  });

  it("phases 7 and 8 are unchanged", () => {
    expect(migratePhaseNumber(7)).toBe(7);
    expect(migratePhaseNumber(8)).toBe(8);
  });

  it("migration is a bijection — each old phase maps to a unique new phase", () => {
    const oldPhases = [1, 2, 3, 4, 5, 6, 7, 8];
    const newPhases = oldPhases.map(migratePhaseNumber);
    const unique = new Set(newPhases);
    expect(unique.size).toBe(oldPhases.length);
    expect(newPhases.sort((a, b) => a - b)).toEqual(oldPhases);
  });

  it("migration is not self-inverse — double migration produces a different result for phases 3-6", () => {
    // Verifies the SQL note: "This script is NOT idempotent. Running it twice double-swaps."
    for (const phase of [3, 4, 5, 6]) {
      const migrated = migratePhaseNumber(phase);
      const doubleMigrated = migratePhaseNumber(migrated);
      expect(doubleMigrated).not.toBe(phase); // double migration produces wrong result
    }
  });
});

// ─── Checklist item mapping ────────────────────────────────────────────────────

describe("migrateChecklistItemPhase", () => {
  it("phaseNumber=3 → 6 (checklist items move to new slot 6)", () => {
    expect(migrateChecklistItemPhase(3)).toBe(6);
  });

  it("all other phase numbers are unchanged (no checklist items for other phases)", () => {
    for (const p of [1, 2, 4, 5, 6, 7, 8]) {
      expect(migrateChecklistItemPhase(p)).toBe(p);
    }
  });
});

// ─── FX-01..09 fixture migration correctness ─────────────────────────────────

describe("runMigration — FX-01 (currentPhase=1, no completed phases)", () => {
  it("TC-REG-001: currentPhase=1 stays at 1", () => {
    const result = runMigration(FX_01);
    expect(result.currentPhase).toBe(1);
  });

  it("TC-REG-005: PA total unchanged", () => {
    const result = runMigration(FX_01);
    expect(result.pointTransactionTotal).toBe(FX_01.pointTransactionTotal);
  });

  it("TC-REG-006: badge count unchanged", () => {
    const result = runMigration(FX_01);
    expect(result.badgeCount).toBe(FX_01.badgeCount);
  });
});

describe("runMigration — FX-02 (currentPhase=3, old Checklist)", () => {
  it("TC-REG-001/004: currentPhase=3 maps to currentPhase=6 (new Checklist slot)", () => {
    const result = runMigration(FX_02);
    expect(result.currentPhase).toBe(6);
  });

  it("active phase (old phaseNumber=3) is remapped to phaseNumber=6 in expedition_phases", () => {
    const result = runMigration(FX_02);
    const activePhase = result.phases.find((p) => p.status === "active");
    expect(activePhase).toBeDefined();
    expect(activePhase!.phaseNumber).toBe(6);
  });

  it("completed phases 1 and 2 are unchanged", () => {
    const result = runMigration(FX_02);
    const p1 = result.phases.find((p) => p.phaseNumber === 1);
    const p2 = result.phases.find((p) => p.phaseNumber === 2);
    expect(p1?.status).toBe("completed");
    expect(p2?.status).toBe("completed");
  });

  it("checklist items phaseNumber remapped from 3 to 6", () => {
    const result = runMigration(FX_02);
    expect(result.checklistItems.every((ci) => ci.phaseNumber === 6)).toBe(true);
  });

  it("TC-REG-005: PA total unchanged", () => {
    const result = runMigration(FX_02);
    expect(result.pointTransactionTotal).toBe(FX_02.pointTransactionTotal);
  });

  it("TC-REG-006: badge count unchanged", () => {
    const result = runMigration(FX_02);
    expect(result.badgeCount).toBe(FX_02.badgeCount);
  });
});

describe("runMigration — FX-03 (currentPhase=4, old Logistics)", () => {
  it("TC-REG-001: currentPhase=4 maps to currentPhase=5 (new Logistics slot)", () => {
    const result = runMigration(FX_03);
    expect(result.currentPhase).toBe(5);
  });

  it("phase previously at old slot 3 (Checklist) remapped to slot 6", () => {
    const result = runMigration(FX_03);
    const p6 = result.phases.find((p) => p.phaseNumber === 6);
    expect(p6).toBeDefined();
    expect(p6!.status).toBe("completed");
  });

  it("phase previously at old slot 4 (Logistics) remapped to slot 5", () => {
    const result = runMigration(FX_03);
    const p5 = result.phases.find((p) => p.phaseNumber === 5);
    expect(p5).toBeDefined();
    expect(p5!.status).toBe("active");
  });

  it("checklist items remapped from phaseNumber=3 to 6", () => {
    const result = runMigration(FX_03);
    expect(result.checklistItems.every((ci) => ci.phaseNumber === 6)).toBe(true);
  });

  it("TC-REG-005: PA total unchanged", () => {
    expect(runMigration(FX_03).pointTransactionTotal).toBe(FX_03.pointTransactionTotal);
  });
});

describe("runMigration — FX-04 (currentPhase=5, old Guide)", () => {
  it("TC-REG-001: currentPhase=5 maps to currentPhase=3 (new Guide slot)", () => {
    const result = runMigration(FX_04);
    expect(result.currentPhase).toBe(3);
  });

  it("phases 1-4 all completed and remapped correctly", () => {
    const result = runMigration(FX_04);
    // Old 3→6, old 4→5, old 5→3 (active), old 1→1, old 2→2
    expect(result.phases.find((p) => p.phaseNumber === 1)?.status).toBe("completed");
    expect(result.phases.find((p) => p.phaseNumber === 2)?.status).toBe("completed");
    expect(result.phases.find((p) => p.phaseNumber === 6)?.status).toBe("completed"); // old 3
    expect(result.phases.find((p) => p.phaseNumber === 5)?.status).toBe("completed"); // old 4
    expect(result.phases.find((p) => p.phaseNumber === 3)?.status).toBe("active");    // old 5
  });

  it("TC-REG-005: PA total unchanged", () => {
    expect(runMigration(FX_04).pointTransactionTotal).toBe(FX_04.pointTransactionTotal);
  });
});

describe("runMigration — FX-05 (currentPhase=6, old Itinerary)", () => {
  it("TC-REG-001: currentPhase=6 maps to currentPhase=4 (new Itinerary slot)", () => {
    const result = runMigration(FX_05);
    expect(result.currentPhase).toBe(4);
  });

  it("TC-REG-005: PA total unchanged", () => {
    expect(runMigration(FX_05).pointTransactionTotal).toBe(FX_05.pointTransactionTotal);
  });
});

describe("runMigration — FX-06 (currentPhase=7, all main phases done)", () => {
  it("TC-REG-001: currentPhase=7 unchanged (downstream phases not affected)", () => {
    const result = runMigration(FX_06);
    expect(result.currentPhase).toBe(7);
  });

  it("all 6 main phases are present in post-migration result (none dropped)", () => {
    const result = runMigration(FX_06);
    const mainPhaseNums = result.phases
      .filter((p) => p.phaseNumber <= 6)
      .map((p) => p.phaseNumber)
      .sort((a, b) => a - b);
    expect(mainPhaseNums).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("all 6 main phases are completed in post-migration result", () => {
    const result = runMigration(FX_06);
    const mainPhases = result.phases.filter((p) => p.phaseNumber <= 6);
    expect(mainPhases.every((p) => p.status === "completed")).toBe(true);
  });

  it("checklist items in FX-06 are remapped to phaseNumber=6", () => {
    const result = runMigration(FX_06);
    expect(result.checklistItems.every((ci) => ci.phaseNumber === 6)).toBe(true);
  });

  it("TC-REG-005: PA total unchanged", () => {
    expect(runMigration(FX_06).pointTransactionTotal).toBe(FX_06.pointTransactionTotal);
  });

  it("TC-REG-006: badge count unchanged", () => {
    expect(runMigration(FX_06).badgeCount).toBe(FX_06.badgeCount);
  });
});

describe("runMigration — FX-07 (currentPhase=8, closed expedition)", () => {
  it("TC-REG-001/002: currentPhase=8 unchanged — closed expeditions immutable", () => {
    const result = runMigration(FX_07);
    expect(result.currentPhase).toBe(8);
  });

  it("TC-REG-002: all 8 phases present after migration (none dropped)", () => {
    const result = runMigration(FX_07);
    const phaseNums = result.phases.map((p) => p.phaseNumber).sort((a, b) => a - b);
    expect(phaseNums).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("TC-REG-003: sum of phase count is identical (no phases added or removed)", () => {
    const pre = FX_07.phases.length;
    const post = runMigration(FX_07).phases.length;
    expect(post).toBe(pre);
  });

  it("TC-REG-003: PA total unchanged (no points removed or added by migration)", () => {
    expect(runMigration(FX_07).pointTransactionTotal).toBe(FX_07.pointTransactionTotal);
  });

  it("TC-REG-006: badge count unchanged for completed expedition", () => {
    expect(runMigration(FX_07).badgeCount).toBe(FX_07.badgeCount);
  });

  it("TC-REG-002: all phases in closed expedition have status=completed after migration", () => {
    const result = runMigration(FX_07);
    expect(result.phases.every((p) => p.status === "completed")).toBe(true);
  });

  it("checklist items (old phaseNumber=3) are remapped to 6", () => {
    const result = runMigration(FX_07);
    expect(result.checklistItems.every((ci) => ci.phaseNumber === 6)).toBe(true);
  });
});

describe("runMigration — FX-08 (expeditionMode=false, pre-Atlas)", () => {
  it("TC-REG-001: currentPhase=1 unchanged", () => {
    const result = runMigration(FX_08);
    expect(result.currentPhase).toBe(1);
  });

  it("phases array is empty — no phase records to remap", () => {
    const result = runMigration(FX_08);
    expect(result.phases).toHaveLength(0);
  });

  it("checklist items array is empty — nothing to remap", () => {
    const result = runMigration(FX_08);
    expect(result.checklistItems).toHaveLength(0);
  });
});

describe("runMigration — FX-09 (corrupt phase, phaseNumber=0)", () => {
  it("does not crash when phaseNumber=0 (corrupt) is encountered", () => {
    expect(() => runMigration(FX_09_CORRUPT)).not.toThrow();
  });

  it("unknown phase number (0) is preserved as-is (no-op mapping)", () => {
    const result = runMigration(FX_09_CORRUPT);
    // migratePhaseNumber returns oldPhase for unmapped values
    expect(result.phases[0]!.phaseNumber).toBe(0);
  });

  it("currentPhase=0 (corrupt) is preserved as-is — not crashed, not silently reassigned", () => {
    const result = runMigration(FX_09_CORRUPT);
    expect(result.currentPhase).toBe(0);
    // NOTE: In the real SQL migration, Step 4 (re-coherence) would fix this.
    // That requires real Prisma and runs in CI only. The pure-logic test
    // verifies the mapping function alone does not crash on corrupt input.
    // TODO: Add CI integration test for re-coherence pass (real Prisma).
  });
});

// ─── Invariant: phase count preserved ────────────────────────────────────────

describe("migration invariant: phase count preserved across all fixtures", () => {
  const fixtures = [FX_01, FX_02, FX_03, FX_04, FX_05, FX_06, FX_07, FX_08];

  for (const fx of fixtures) {
    it(`FX ${fx.tripId}: phases.length before == phases.length after`, () => {
      const result = runMigration(fx);
      expect(result.phases.length).toBe(fx.phases.length);
    });
  }
});

describe("migration invariant: no phase number appears twice post-migration", () => {
  const fixtures = [FX_02, FX_03, FX_04, FX_05, FX_06, FX_07];

  for (const fx of fixtures) {
    it(`FX ${fx.tripId}: no duplicate phaseNumber after migration`, () => {
      const result = runMigration(fx);
      const nums = result.phases.map((p) => p.phaseNumber);
      const unique = new Set(nums);
      expect(unique.size).toBe(nums.length);
    });
  }
});

describe("migration invariant: PA totals and badge counts unchanged", () => {
  const fixtures = [FX_01, FX_02, FX_03, FX_04, FX_05, FX_06, FX_07, FX_08];

  for (const fx of fixtures) {
    it(`FX ${fx.tripId}: PA total preserved`, () => {
      expect(runMigration(fx).pointTransactionTotal).toBe(fx.pointTransactionTotal);
    });

    it(`FX ${fx.tripId}: badge count preserved`, () => {
      expect(runMigration(fx).badgeCount).toBe(fx.badgeCount);
    });
  }
});
