/**
 * Unit tests for rank-calculator (pure, isomorphic module).
 *
 * Tests cover:
 * - calculateRank: all 6 rank thresholds + boundary values
 * - getNextRankProgress: next rank calculation, top rank, boundary
 */
import { describe, it, expect } from "vitest";
import {
  calculateRank,
  getNextRankProgress,
  RANK_THRESHOLDS,
} from "@/lib/gamification/rank-calculator";

// ─── calculateRank ──────────────────────────────────────────────────────────

describe("calculateRank", () => {
  it("returns 'novato' for 0 points", () => {
    expect(calculateRank(0)).toBe("novato");
  });

  it("returns 'novato' for 299 points (below desbravador threshold)", () => {
    expect(calculateRank(299)).toBe("novato");
  });

  it("returns 'desbravador' at exactly 300 points", () => {
    expect(calculateRank(300)).toBe("desbravador");
  });

  it("returns 'desbravador' for 699 points (below navegador threshold)", () => {
    expect(calculateRank(699)).toBe("desbravador");
  });

  it("returns 'navegador' at exactly 700 points", () => {
    expect(calculateRank(700)).toBe("navegador");
  });

  it("returns 'navegador' for 1499 points (below capitao threshold)", () => {
    expect(calculateRank(1499)).toBe("navegador");
  });

  it("returns 'capitao' at exactly 1500 points", () => {
    expect(calculateRank(1500)).toBe("capitao");
  });

  it("returns 'capitao' for 3499 points (below aventureiro threshold)", () => {
    expect(calculateRank(3499)).toBe("capitao");
  });

  it("returns 'aventureiro' at exactly 3500 points", () => {
    expect(calculateRank(3500)).toBe("aventureiro");
  });

  it("returns 'aventureiro' for 6999 points (below lendario threshold)", () => {
    expect(calculateRank(6999)).toBe("aventureiro");
  });

  it("returns 'lendario' at exactly 7000 points", () => {
    expect(calculateRank(7000)).toBe("lendario");
  });

  it("returns 'lendario' for very high points (99999)", () => {
    expect(calculateRank(99999)).toBe("lendario");
  });

  it("returns 'novato' for negative points", () => {
    expect(calculateRank(-10)).toBe("novato");
  });
});

// ─── getNextRankProgress ────────────────────────────────────────────────────

describe("getNextRankProgress", () => {
  it("returns next rank and points needed for novato", () => {
    const result = getNextRankProgress(100);
    expect(result.currentRank).toBe("novato");
    expect(result.nextRank).toBe("desbravador");
    expect(result.pointsToNext).toBe(200); // 300 - 100
  });

  it("returns next rank for desbravador", () => {
    const result = getNextRankProgress(500);
    expect(result.currentRank).toBe("desbravador");
    expect(result.nextRank).toBe("navegador");
    expect(result.pointsToNext).toBe(200); // 700 - 500
  });

  it("returns null next rank for lendario (max rank)", () => {
    const result = getNextRankProgress(10000);
    expect(result.currentRank).toBe("lendario");
    expect(result.nextRank).toBeNull();
    expect(result.pointsToNext).toBeNull();
  });

  it("returns 0 pointsToNext when exactly at threshold", () => {
    const result = getNextRankProgress(300);
    expect(result.currentRank).toBe("desbravador");
    expect(result.nextRank).toBe("navegador");
    expect(result.pointsToNext).toBe(400); // 700 - 300
  });
});

// ─── RANK_THRESHOLDS constant ──────────────────────────────────────────────

describe("RANK_THRESHOLDS", () => {
  it("has exactly 6 rank tiers", () => {
    expect(RANK_THRESHOLDS).toHaveLength(6);
  });

  it("is sorted from highest to lowest minPoints", () => {
    for (let i = 0; i < RANK_THRESHOLDS.length - 1; i++) {
      expect(RANK_THRESHOLDS[i].minPoints).toBeGreaterThan(
        RANK_THRESHOLDS[i + 1].minPoints
      );
    }
  });

  it("matches approved thresholds", () => {
    const thresholdMap = Object.fromEntries(
      RANK_THRESHOLDS.map((t) => [t.rank, t.minPoints])
    );
    expect(thresholdMap).toEqual({
      novato: 0,
      desbravador: 300,
      navegador: 700,
      capitao: 1500,
      aventureiro: 3500,
      lendario: 7000,
    });
  });
});
