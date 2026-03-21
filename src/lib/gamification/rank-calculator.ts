// ─── Rank Calculator (pure, isomorphic — no server-only) ─────────────────────
//
// Single source of truth for rank thresholds and rank calculation.
// Safe to import in both server and client code.

import type { Rank } from "@/types/gamification.types";

/**
 * Rank thresholds based on totalPoints (lifetime earned, never decremented).
 * Ordered from highest to lowest for calculation efficiency.
 */
export const RANK_THRESHOLDS: readonly { rank: Rank; minPoints: number }[] = [
  { rank: "lendario", minPoints: 7000 },
  { rank: "aventureiro", minPoints: 3500 },
  { rank: "capitao", minPoints: 1500 },
  { rank: "navegador", minPoints: 700 },
  { rank: "desbravador", minPoints: 300 },
  { rank: "novato", minPoints: 0 },
] as const;

/**
 * Calculate the rank for a given totalPoints value.
 * Pure function — no side effects, no DB calls.
 *
 * @param totalPoints - Lifetime earned points (never decremented by spending)
 * @returns The rank corresponding to the totalPoints threshold
 */
export function calculateRank(totalPoints: number): Rank {
  for (const { rank, minPoints } of RANK_THRESHOLDS) {
    if (totalPoints >= minPoints) {
      return rank;
    }
  }
  return "novato";
}

/**
 * Get the next rank and how many points are needed to reach it.
 * Returns null if the user is already at the highest rank.
 */
export function getNextRankProgress(totalPoints: number): {
  currentRank: Rank;
  nextRank: Rank | null;
  pointsToNext: number | null;
} {
  const currentRank = calculateRank(totalPoints);

  // Find the threshold for the next rank above current
  const sortedAsc = [...RANK_THRESHOLDS].reverse();
  const currentIndex = sortedAsc.findIndex((t) => t.rank === currentRank);
  const nextThreshold = sortedAsc[currentIndex + 1];

  if (!nextThreshold) {
    return { currentRank, nextRank: null, pointsToNext: null };
  }

  return {
    currentRank,
    nextRank: nextThreshold.rank,
    pointsToNext: nextThreshold.minPoints - totalPoints,
  };
}
