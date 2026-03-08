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
      { phase: 4, badge: "host" },
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
