/**
 * Unit tests for Sprint 44 phase-config additions:
 * - PHASE_DEFINITIONS_REORDERED (new order)
 * - getPhaseDefinitions() (flag-aware)
 * - getPhaseDefinition() (flag-aware)
 * - PHASE_TOOLS_REORDERED (new order)
 * - getPhaseTools() (flag-aware)
 *
 * Tests cover BOTH flag paths to ensure:
 *   flag OFF → original order (backward-compat)
 *   flag ON  → new order (Sprint 44)
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3.1, §3.3, §3.4
 * Spec ref: SPEC-PROD-REORDER-PHASES (PA values)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock flag helper ─────────────────────────────────────────────────────────

const mockFlag = vi.hoisted(() => ({ isPhaseReorderEnabled: vi.fn(() => false) }));

vi.mock("@/lib/flags/phase-reorder", () => mockFlag);

// ─── Import SUT after mock ────────────────────────────────────────────────────

import {
  PHASE_DEFINITIONS,
  PHASE_DEFINITIONS_REORDERED,
  getPhaseDefinitions,
  getPhaseDefinition,
  PHASE_TOOLS,
  PHASE_TOOLS_REORDERED,
  getPhaseTools,
} from "@/lib/engines/phase-config";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setFlag(enabled: boolean) {
  mockFlag.isPhaseReorderEnabled.mockReturnValue(enabled);
}

// ─── PHASE_DEFINITIONS_REORDERED ─────────────────────────────────────────────

describe("PHASE_DEFINITIONS_REORDERED", () => {
  it("contains exactly 8 phase entries", () => {
    expect(PHASE_DEFINITIONS_REORDERED).toHaveLength(8);
  });

  it("has unique and sequential phase numbers from 1 to 8", () => {
    const nums = PHASE_DEFINITIONS_REORDERED.map((p) => p.phaseNumber);
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("phase 3 is Guide (Guia do Destino)", () => {
    const p3 = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === 3);
    expect(p3).toBeDefined();
    expect(p3!.name).toBe("Guia do Destino");
    expect(p3!.nameKey).toBe("phases.theDestinationGuide");
  });

  it("phase 4 is Itinerary (O Roteiro)", () => {
    const p4 = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === 4);
    expect(p4).toBeDefined();
    expect(p4!.name).toBe("O Roteiro");
    expect(p4!.nameKey).toBe("phases.theItinerary");
  });

  it("phase 5 is Logistics (A Logística)", () => {
    const p5 = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === 5);
    expect(p5).toBeDefined();
    expect(p5!.name).toBe("A Logística");
    expect(p5!.nameKey).toBe("phases.theLogistics");
  });

  it("phase 6 is Checklist (O Preparo)", () => {
    const p6 = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === 6);
    expect(p6).toBeDefined();
    expect(p6!.name).toBe("O Preparo");
    expect(p6!.nameKey).toBe("phases.thePreparation");
  });

  it("assigns PA (aiCost) by content: Guide=50, Itinerary=80, Logistics=0, Checklist=30", () => {
    const aiCostMap = PHASE_DEFINITIONS_REORDERED
      .filter((p) => p.phaseNumber <= 6)
      .map((p) => ({ phase: p.phaseNumber, aiCost: p.aiCost }));

    expect(aiCostMap).toEqual([
      { phase: 1, aiCost: 0 },
      { phase: 2, aiCost: 0 },
      { phase: 3, aiCost: 50 },  // Guide
      { phase: 4, aiCost: 80 },  // Itinerary
      { phase: 5, aiCost: 0 },   // Logistics (no AI)
      { phase: 6, aiCost: 30 },  // Checklist
    ]);
  });

  it("assigns pointsReward by content: Guide=40, Itinerary=250, Logistics=50, Checklist=75", () => {
    const rewardMap = PHASE_DEFINITIONS_REORDERED
      .filter((p) => p.phaseNumber <= 6)
      .map((p) => ({ phase: p.phaseNumber, reward: p.pointsReward }));

    expect(rewardMap).toEqual([
      { phase: 1, reward: 100 },
      { phase: 2, reward: 150 },
      { phase: 3, reward: 40 },   // Guide
      { phase: 4, reward: 250 },  // Itinerary
      { phase: 5, reward: 50 },   // Logistics
      { phase: 6, reward: 75 },   // Checklist
    ]);
  });

  it("NON_BLOCKING phases (new) = {5, 6} — Logistics and Checklist", () => {
    const nonBlocking = PHASE_DEFINITIONS_REORDERED
      .filter((p) => p.nonBlocking)
      .map((p) => p.phaseNumber);

    expect(nonBlocking).toContain(5);
    expect(nonBlocking).toContain(6);
    // Phases 3 and 4 must NOT be non-blocking in new order
    expect(nonBlocking).not.toContain(3);
    expect(nonBlocking).not.toContain(4);
  });

  it("phase 4 (Itinerary) is NOT free — premium gate", () => {
    const p4 = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === 4);
    expect(p4!.isFree).toBe(false);
  });

  it("phase 3 (Guide) is free", () => {
    const p3 = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === 3);
    expect(p3!.isFree).toBe(true);
  });

  it("rank promotions: desbravador at phase 2, capitao at phase 3 (Guide), aventureiro at phase 7", () => {
    const rankMap = PHASE_DEFINITIONS_REORDERED
      .filter((p) => p.rankPromotion !== null)
      .map((p) => ({ phase: p.phaseNumber, rank: p.rankPromotion }));

    expect(rankMap).toEqual([
      { phase: 2, rank: "desbravador" },
      { phase: 3, rank: "capitao" },
      { phase: 7, rank: "aventureiro" },
    ]);
  });

  it("phases 1, 2 are identical in old and new definitions", () => {
    for (const phaseNum of [1, 2] as const) {
      const original = PHASE_DEFINITIONS.find((p) => p.phaseNumber === phaseNum);
      const reordered = PHASE_DEFINITIONS_REORDERED.find((p) => p.phaseNumber === phaseNum);
      expect(reordered).toEqual(original);
    }
  });
});

// ─── getPhaseDefinitions (flag-aware) ────────────────────────────────────────

describe("getPhaseDefinitions", () => {
  beforeEach(() => setFlag(false));

  it("returns PHASE_DEFINITIONS when flag is OFF", () => {
    setFlag(false);
    const defs = getPhaseDefinitions();
    expect(defs).toBe(PHASE_DEFINITIONS);
  });

  it("returns PHASE_DEFINITIONS_REORDERED when flag is ON", () => {
    setFlag(true);
    const defs = getPhaseDefinitions();
    expect(defs).toBe(PHASE_DEFINITIONS_REORDERED);
  });

  it("flag OFF: phase 3 is O Preparo (Checklist)", () => {
    setFlag(false);
    const p3 = getPhaseDefinitions().find((p) => p.phaseNumber === 3);
    expect(p3!.name).toBe("O Preparo");
  });

  it("flag ON: phase 3 is Guia do Destino (Guide)", () => {
    setFlag(true);
    const p3 = getPhaseDefinitions().find((p) => p.phaseNumber === 3);
    expect(p3!.name).toBe("Guia do Destino");
  });
});

// ─── getPhaseDefinition (flag-aware) ─────────────────────────────────────────

describe("getPhaseDefinition", () => {
  beforeEach(() => setFlag(false));

  it("flag OFF: phase 3 returns O Preparo", () => {
    setFlag(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = getPhaseDefinition(3 as any);
    expect(def!.name).toBe("O Preparo");
  });

  it("flag ON: phase 3 returns Guia do Destino", () => {
    setFlag(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = getPhaseDefinition(3 as any);
    expect(def!.name).toBe("Guia do Destino");
  });

  it("flag OFF: phase 5 returns Guia do Destino", () => {
    setFlag(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = getPhaseDefinition(5 as any);
    expect(def!.name).toBe("Guia do Destino");
  });

  it("flag ON: phase 5 returns A Logística", () => {
    setFlag(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = getPhaseDefinition(5 as any);
    expect(def!.name).toBe("A Logística");
  });

  it("returns undefined for phase 9 regardless of flag", () => {
    for (const flagState of [false, true]) {
      setFlag(flagState);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getPhaseDefinition(9 as any)).toBeUndefined();
    }
  });
});

// ─── PHASE_TOOLS_REORDERED ────────────────────────────────────────────────────

describe("PHASE_TOOLS_REORDERED", () => {
  it("defines tools for all 8 phases", () => {
    for (let i = 1; i <= 8; i++) {
      expect(PHASE_TOOLS_REORDERED[i]).toBeDefined();
      expect(Array.isArray(PHASE_TOOLS_REORDERED[i])).toBe(true);
    }
  });

  it("phase 3 tool is destination_guide pointing to /phase-3", () => {
    const tool = PHASE_TOOLS_REORDERED[3]![0]!;
    expect(tool.key).toBe("destination_guide");
    expect(tool.href("trip-1")).toBe("/expedition/trip-1/phase-3");
    expect(tool.status).toBe("available");
  });

  it("phase 4 tool is itinerary pointing to /phase-4", () => {
    const tool = PHASE_TOOLS_REORDERED[4]![0]!;
    expect(tool.key).toBe("itinerary");
    expect(tool.href("trip-1")).toBe("/expedition/trip-1/phase-4");
    expect(tool.status).toBe("available");
  });

  it("phase 5 tool is transport pointing to /phase-5", () => {
    const tool = PHASE_TOOLS_REORDERED[5]![0]!;
    expect(tool.key).toBe("transport");
    expect(tool.href("trip-1")).toBe("/expedition/trip-1/phase-5");
    expect(tool.status).toBe("available");
  });

  it("phase 6 tool is checklist pointing to /phase-6", () => {
    const tool = PHASE_TOOLS_REORDERED[6]![0]!;
    expect(tool.key).toBe("checklist");
    expect(tool.href("trip-1")).toBe("/expedition/trip-1/phase-6");
    expect(tool.status).toBe("available");
  });
});

// ─── getPhaseTools (flag-aware) ───────────────────────────────────────────────

describe("getPhaseTools", () => {
  beforeEach(() => setFlag(false));

  it("flag OFF: phase 3 tool is destination_guide → /phase-5 (old URL)", () => {
    setFlag(false);
    const tools = getPhaseTools(3);
    expect(tools[0]!.key).toBe("destination_guide");
    expect(tools[0]!.href("t-1")).toBe("/expedition/t-1/phase-5");
  });

  it("flag ON: phase 3 tool is destination_guide → /phase-3 (new URL)", () => {
    setFlag(true);
    const tools = getPhaseTools(3);
    expect(tools[0]!.key).toBe("destination_guide");
    expect(tools[0]!.href("t-1")).toBe("/expedition/t-1/phase-3");
  });

  it("flag OFF: phase 6 tool is itinerary → /phase-6", () => {
    setFlag(false);
    const tools = getPhaseTools(6);
    expect(tools[0]!.key).toBe("itinerary");
    expect(tools[0]!.href("t-1")).toBe("/expedition/t-1/phase-6");
  });

  it("flag ON: phase 6 tool is checklist → /phase-6", () => {
    setFlag(true);
    const tools = getPhaseTools(6);
    expect(tools[0]!.key).toBe("checklist");
    expect(tools[0]!.href("t-1")).toBe("/expedition/t-1/phase-6");
  });

  it("returns empty array for an out-of-range phase (both flag states)", () => {
    for (const flagState of [false, true]) {
      setFlag(flagState);
      expect(getPhaseTools(99)).toEqual([]);
    }
  });

  it("flag OFF returns from PHASE_TOOLS, flag ON returns from PHASE_TOOLS_REORDERED", () => {
    setFlag(false);
    expect(getPhaseTools(5)).toStrictEqual(PHASE_TOOLS[5]);

    setFlag(true);
    expect(getPhaseTools(5)).toStrictEqual(PHASE_TOOLS_REORDERED[5]);
  });
});
