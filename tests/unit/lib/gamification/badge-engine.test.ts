/**
 * Unit tests for badge-engine.
 *
 * Tests cover:
 * - checkAndAwardBadges: awards new badges, skips already-earned, handles P2002
 * - getUserBadgesWithStatus: all 16 badges returned, locked/unlocked status
 * - getBadgeProgress: returns correct progress, 100% for earned badges
 * - Idempotency: awarding same badge twice does not create duplicates
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────

import {
  checkAndAwardBadges,
  getUserBadgesWithStatus,
  getBadgeProgress,
} from "@/lib/gamification/badge-engine";
import { db } from "@/server/db";
import { BADGE_REGISTRY } from "@/lib/gamification/badge-registry";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

const USER_ID = "user-badge-test";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Shared helpers ─────────────────────────────────────────────────────────

function setupDefaultMocks() {
  prismaMock.trip.count.mockResolvedValue(0);
  prismaMock.expeditionPhase.groupBy.mockResolvedValue([]);
  prismaMock.expeditionPhase.count.mockResolvedValue(0);
  prismaMock.expeditionPhase.findMany.mockResolvedValue([]);
  prismaMock.trip.findMany.mockResolvedValue([]);
  prismaMock.userProgress.findUnique.mockResolvedValue(null);
  prismaMock.pointTransaction.count.mockResolvedValue(0);
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.destinationGuide.findMany.mockResolvedValue([]);
}

// ─── checkAndAwardBadges ────────────────────────────────────────────────────

describe("checkAndAwardBadges", () => {
  it("awards primeira_viagem when user has 1 completed trip", async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([]);
    setupDefaultMocks();
    prismaMock.trip.count.mockResolvedValue(1);
    prismaMock.userBadge.create.mockResolvedValue({
      id: "badge-1",
      userId: USER_ID,
      badgeKey: "primeira_viagem",
      earnedAt: new Date(),
    });

    const awarded = await checkAndAwardBadges(USER_ID, "trip_complete");

    expect(awarded).toContain("primeira_viagem");
    expect(prismaMock.userBadge.create).toHaveBeenCalled();
  });

  it("skips already-earned badges", async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([
      { id: "b1", userId: USER_ID, badgeKey: "primeira_viagem", earnedAt: new Date() },
    ]);
    setupDefaultMocks();

    const awarded = await checkAndAwardBadges(USER_ID, "trip_complete");

    expect(awarded).not.toContain("primeira_viagem");
  });

  it("handles P2002 unique constraint violation gracefully", async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([]);
    setupDefaultMocks();
    prismaMock.trip.count.mockResolvedValue(1);

    // Simulate unique constraint error on create
    const p2002Error = new Error("Unique constraint failed");
    (p2002Error as { code?: string }).code = "P2002";
    prismaMock.userBadge.create.mockRejectedValue(p2002Error);

    const awarded = await checkAndAwardBadges(USER_ID, "trip_complete");

    // Should not throw, just skip the badge
    expect(awarded).not.toContain("primeira_viagem");
  });

  it("re-throws non-P2002 errors", async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([]);
    setupDefaultMocks();
    prismaMock.trip.count.mockResolvedValue(1);

    prismaMock.userBadge.create.mockRejectedValue(new Error("DB connection lost"));

    await expect(
      checkAndAwardBadges(USER_ID, "trip_complete")
    ).rejects.toThrow("DB connection lost");
  });
});

// ─── getUserBadgesWithStatus ────────────────────────────────────────────────

describe("getUserBadgesWithStatus", () => {
  it("returns all 17 badges", async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([]);
    setupDefaultMocks();

    const badges = await getUserBadgesWithStatus(USER_ID);

    expect(badges).toHaveLength(17);
  });

  it("marks earned badges as unlocked", async () => {
    const now = new Date();
    prismaMock.userBadge.findMany.mockResolvedValue([
      { id: "b1", userId: USER_ID, badgeKey: "primeira_viagem", earnedAt: now },
    ]);
    setupDefaultMocks();

    const badges = await getUserBadgesWithStatus(USER_ID);

    const primeiraViagem = badges.find((b) => b.key === "primeira_viagem");
    expect(primeiraViagem?.unlocked).toBe(true);
    expect(primeiraViagem?.earnedAt).toBe(now);
    expect(primeiraViagem?.progress.percentage).toBe(100);
  });

  it("marks unearned badges as locked with progress", async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([]);
    setupDefaultMocks();
    prismaMock.trip.count.mockResolvedValue(2); // 2 out of 3 for viajante_frequente

    const badges = await getUserBadgesWithStatus(USER_ID);

    const viajante = badges.find((b) => b.key === "viajante_frequente");
    expect(viajante?.unlocked).toBe(false);
    expect(viajante?.progress.current).toBe(2);
    expect(viajante?.progress.target).toBe(3);
    expect(viajante?.progress.percentage).toBe(67);
  });
});

// ─── getBadgeProgress ───────────────────────────────────────────────────────

describe("getBadgeProgress", () => {
  it("returns 100% for earned badge", async () => {
    prismaMock.userBadge.findUnique.mockResolvedValue({
      id: "b1",
      userId: USER_ID,
      badgeKey: "primeira_viagem",
      earnedAt: new Date(),
    });

    const progress = await getBadgeProgress(USER_ID, "primeira_viagem");

    expect(progress.percentage).toBe(100);
    expect(progress.current).toBe(progress.target);
  });

  it("returns partial progress for unearned badge", async () => {
    prismaMock.userBadge.findUnique.mockResolvedValue(null);
    prismaMock.trip.count.mockResolvedValue(2);

    const progress = await getBadgeProgress(USER_ID, "viajante_frequente");

    expect(progress.current).toBe(2);
    expect(progress.target).toBe(3);
    expect(progress.percentage).toBe(67);
  });

  it("returns zero progress for unknown badge key", async () => {
    const progress = await getBadgeProgress(
      USER_ID,
      "not_real" as "primeira_viagem"
    );

    expect(progress).toEqual({ current: 0, target: 0, percentage: 0 });
  });
});
