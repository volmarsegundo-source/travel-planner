/**
 * Unit tests for Atlas phase configuration.
 *
 * Validates PHASE_DEFINITIONS data integrity, TOTAL_PHASES constant,
 * and getPhaseDefinition lookup function. These are pure data tests
 * with no external dependencies — no mocks required.
 */
import { describe, it, expect } from "vitest";
import {
  PHASE_DEFINITIONS,
  TOTAL_PHASES,
  getPhaseDefinition,
  PHASE_TOOLS,
  getPhaseTools,
} from "@/lib/engines/phase-config";

// ─── PHASE_DEFINITIONS ──────────────────────────────────────────────────────

describe("PHASE_DEFINITIONS", () => {
  it("contains exactly 8 phase entries", () => {
    expect(PHASE_DEFINITIONS).toHaveLength(8);
  });

  it("has unique and sequential phase numbers from 1 to 8", () => {
    const phaseNumbers = PHASE_DEFINITIONS.map((p) => p.phaseNumber);
    expect(phaseNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("sums to 1565 total points reward across all phases", () => {
    const totalReward = PHASE_DEFINITIONS.reduce(
      (sum, p) => sum + p.pointsReward,
      0
    );
    // 100+150+75+50+40+250+400+500 = 1565
    expect(totalReward).toBe(1565);
  });

  it("marks phases 1-5 as free and phases 6-8 as not free", () => {
    const freePhases = PHASE_DEFINITIONS.filter((p) => p.isFree);
    const paidPhases = PHASE_DEFINITIONS.filter((p) => !p.isFree);

    expect(freePhases.map((p) => p.phaseNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(paidPhases.map((p) => p.phaseNumber)).toEqual([6, 7, 8]);
  });

  it("assigns AI costs only to phases 3 (100), 4 (100), and 5 (150)", () => {
    const phasesWithAiCost = PHASE_DEFINITIONS.filter((p) => p.aiCost > 0);

    expect(phasesWithAiCost).toHaveLength(3);
    expect(phasesWithAiCost.map((p) => ({ phase: p.phaseNumber, cost: p.aiCost }))).toEqual([
      { phase: 3, cost: 100 },
      { phase: 4, cost: 100 },
      { phase: 5, cost: 150 },
    ]);
  });

  it("assigns badge keys to the correct phases", () => {
    const badgeMap = PHASE_DEFINITIONS
      .filter((p) => p.badgeKey !== null)
      .map((p) => ({ phase: p.phaseNumber, badge: p.badgeKey }));

    expect(badgeMap).toEqual([
      { phase: 1, badge: "first_step" },
      { phase: 3, badge: "navigator" },
      { phase: 4, badge: "logistics_master" },
      { phase: 6, badge: "treasurer" },
      { phase: 8, badge: "ambassador" },
    ]);
  });

  it("assigns rank promotions to the correct phases", () => {
    const rankMap = PHASE_DEFINITIONS
      .filter((p) => p.rankPromotion !== null)
      .map((p) => ({ phase: p.phaseNumber, rank: p.rankPromotion }));

    expect(rankMap).toEqual([
      { phase: 2, rank: "explorer" },
      { phase: 5, rank: "cartographer" },
      { phase: 7, rank: "pathfinder" },
    ]);
  });
});

// ─── TOTAL_PHASES ────────────────────────────────────────────────────────────

describe("TOTAL_PHASES", () => {
  it("equals 8", () => {
    expect(TOTAL_PHASES).toBe(8);
  });
});

// ─── getPhaseDefinition ──────────────────────────────────────────────────────

describe("getPhaseDefinition", () => {
  it('returns "O Chamado" for phase 1', () => {
    const phase = getPhaseDefinition(1);
    expect(phase).toBeDefined();
    expect(phase!.name).toBe("O Chamado");
    expect(phase!.phaseNumber).toBe(1);
  });

  it('returns "O Legado" for phase 8', () => {
    const phase = getPhaseDefinition(8);
    expect(phase).toBeDefined();
    expect(phase!.name).toBe("O Legado");
    expect(phase!.phaseNumber).toBe(8);
  });

  it("returns undefined for an out-of-range phase number", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phase = getPhaseDefinition(9 as any);
    expect(phase).toBeUndefined();
  });
});

// ─── PHASE_TOOLS ──────────────────────────────────────────────────────────────

describe("PHASE_TOOLS", () => {
  it("defines tools for all 8 phases", () => {
    for (let i = 1; i <= 8; i++) {
      expect(PHASE_TOOLS[i]).toBeDefined();
      expect(Array.isArray(PHASE_TOOLS[i])).toBe(true);
    }
  });

  it("phases 1-2 have no tools", () => {
    expect(PHASE_TOOLS[1]).toHaveLength(0);
    expect(PHASE_TOOLS[2]).toHaveLength(0);
  });

  it("phases 3-6 each have one tool", () => {
    expect(PHASE_TOOLS[3]).toHaveLength(1);
    expect(PHASE_TOOLS[4]).toHaveLength(1);
    expect(PHASE_TOOLS[5]).toHaveLength(1);
    expect(PHASE_TOOLS[6]).toHaveLength(1);
  });

  it("phases 7-8 each have two tools", () => {
    expect(PHASE_TOOLS[7]).toHaveLength(2);
    expect(PHASE_TOOLS[8]).toHaveLength(2);
  });

  it("marks phases 3, 5, 6 tools as available", () => {
    expect(PHASE_TOOLS[3]![0]!.status).toBe("available");
    expect(PHASE_TOOLS[5]![0]!.status).toBe("available");
    expect(PHASE_TOOLS[6]![0]!.status).toBe("available");
  });

  it("marks phase 4 as available and phases 7, 8 tools as coming_soon", () => {
    expect(PHASE_TOOLS[4]![0]!.status).toBe("available");
    for (const tool of PHASE_TOOLS[7]!) {
      expect(tool.status).toBe("coming_soon");
    }
    for (const tool of PHASE_TOOLS[8]!) {
      expect(tool.status).toBe("coming_soon");
    }
  });

  it("tool href functions generate correct paths", () => {
    const guideTool = PHASE_TOOLS[3]![0]!;
    expect(guideTool.href("t-1")).toBe("/expedition/t-1/phase-5");

    const checklistTool = PHASE_TOOLS[5]![0]!;
    expect(checklistTool.href("t-2")).toBe("/expedition/t-2/phase-3");

    const itineraryTool = PHASE_TOOLS[6]![0]!;
    expect(itineraryTool.href("t-3")).toBe("/expedition/t-3/phase-6");
  });
});

// ─── getPhaseTools ──────────────────────────────────────────────────────────

describe("getPhaseTools", () => {
  it("returns tools for a valid phase", () => {
    const tools = getPhaseTools(5);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.key).toBe("checklist");
  });

  it("returns empty array for a phase with no tools", () => {
    expect(getPhaseTools(1)).toEqual([]);
  });

  it("returns empty array for an out-of-range phase", () => {
    expect(getPhaseTools(99)).toEqual([]);
  });
});
