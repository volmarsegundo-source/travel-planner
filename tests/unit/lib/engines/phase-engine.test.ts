/**
 * Unit tests for PhaseEngine.
 *
 * All external dependencies (Prisma, logger, PointsEngine) are mocked so
 * these tests run in isolation with no infrastructure required.
 *
 * Mocking pattern follows the project convention:
 * - vi.mock() with mockDeep<PrismaClient>() for Prisma
 * - PointsEngine is fully mocked to isolate PhaseEngine logic
 * - logger is stubbed to verify structured log events
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn(),
    awardBadge: vi.fn().mockResolvedValue(true),
    updateRank: vi.fn(),
    spendPoints: vi.fn().mockResolvedValue({
      remainingPoints: 400,
      transactionId: "tx-1",
    }),
    canAfford: vi.fn().mockResolvedValue(true),
  },
}));

// ─── Import SUT after mocks are registered ────────────────────────────────────

import { PhaseEngine } from "@/lib/engines/phase-engine";
import { PointsEngine } from "@/lib/engines/points-engine";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { ForbiddenError, AppError } from "@/lib/errors";
import { hashUserId } from "@/lib/hash";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_TRIP_ID = "trip-001";
const TEST_USER_ID = "user-001";
const OTHER_USER_ID = "user-999";

function createMockTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TRIP_ID,
    userId: TEST_USER_ID,
    title: "Test Trip",
    expeditionMode: true,
    currentPhase: 1,
    tripType: "international",
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockPhase(
  phaseNumber: number,
  status: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `phase-${phaseNumber}`,
    tripId: TEST_TRIP_ID,
    phaseNumber,
    status,
    completedAt: status === "completed" ? new Date() : null,
    pointsEarned: status === "completed" ? 100 : 0,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createAllPhases(activePhase = 1) {
  return Array.from({ length: 8 }, (_, i) => {
    const num = i + 1;
    let status: string;
    if (num < activePhase) status = "completed";
    else if (num === activePhase) status = "active";
    else status = "locked";
    return createMockPhase(num, status);
  });
}

/**
 * Sets up the $transaction mock to execute the callback function with a
 * mock transaction client, simulating Prisma's interactive transaction.
 */
function setupTransactionMock() {
  const mockTx = {
    expeditionPhase: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    trip: {
      update: vi.fn().mockResolvedValue({}),
    },
  };

  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === "function") return fn(mockTx as never);
    return undefined as never;
  });

  return mockTx;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── initializeExpedition ─────────────────────────────────────────────────────

describe("PhaseEngine.initializeExpedition", () => {
  it("creates 8 phases with phase 1 active and 2-8 locked", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.count.mockResolvedValue(0 as never);
    prismaMock.expeditionPhase.createMany.mockResolvedValue({
      count: 8,
    } as never);

    await PhaseEngine.initializeExpedition(TEST_TRIP_ID, TEST_USER_ID);

    expect(prismaMock.expeditionPhase.createMany).toHaveBeenCalledOnce();

    const createCall = prismaMock.expeditionPhase.createMany.mock.calls[0]![0];
    const data = createCall!.data as Array<{
      tripId: string;
      phaseNumber: number;
      status: string;
    }>;

    expect(data).toHaveLength(8);
    expect(data[0]).toEqual({
      tripId: TEST_TRIP_ID,
      phaseNumber: 1,
      status: "active",
    });

    for (let i = 1; i < 8; i++) {
      expect(data[i]).toEqual({
        tripId: TEST_TRIP_ID,
        phaseNumber: i + 1,
        status: "locked",
      });
    }
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.initializeExpedition(TEST_TRIP_ID, TEST_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when trip belongs to different user", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.initializeExpedition(TEST_TRIP_ID, OTHER_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("skips creation when phases already exist (idempotent)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.count.mockResolvedValue(8 as never);

    await PhaseEngine.initializeExpedition(TEST_TRIP_ID, TEST_USER_ID);

    expect(prismaMock.expeditionPhase.createMany).not.toHaveBeenCalled();
  });

  it("logs gamification.expeditionInitialized on success", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.count.mockResolvedValue(0 as never);
    prismaMock.expeditionPhase.createMany.mockResolvedValue({
      count: 8,
    } as never);

    await PhaseEngine.initializeExpedition(TEST_TRIP_ID, TEST_USER_ID);

    expect(logger.info).toHaveBeenCalledWith(
      "gamification.expeditionInitialized",
      { tripId: TEST_TRIP_ID, userIdHash: hashUserId(TEST_USER_ID) }
    );
  });
});

// ─── getPhases ────────────────────────────────────────────────────────────────

describe("PhaseEngine.getPhases", () => {
  it("returns all 8 phases with definitions attached", async () => {
    const mockPhases = createAllPhases(1);
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findMany.mockResolvedValue(
      mockPhases as never
    );

    const result = await PhaseEngine.getPhases(TEST_TRIP_ID, TEST_USER_ID);

    expect(result).toHaveLength(8);
    for (const phase of result) {
      expect(phase.definition).toBeDefined();
      expect(phase.definition!.phaseNumber).toBe(phase.phaseNumber);
    }
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.getPhases(TEST_TRIP_ID, TEST_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("returns phases ordered by phaseNumber", async () => {
    const mockPhases = createAllPhases(1);
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findMany.mockResolvedValue(
      mockPhases as never
    );

    const result = await PhaseEngine.getPhases(TEST_TRIP_ID, TEST_USER_ID);

    const phaseNumbers = result.map((p) => p.phaseNumber);
    expect(phaseNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // Verify findMany was called with orderBy
    expect(prismaMock.expeditionPhase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { phaseNumber: "asc" },
      })
    );
  });
});

// ─── getCurrentPhase ──────────────────────────────────────────────────────────

describe("PhaseEngine.getCurrentPhase", () => {
  it("returns the active phase with definition", async () => {
    const activePhase = createMockPhase(3, "active");
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findFirst.mockResolvedValue(
      activePhase as never
    );

    const result = await PhaseEngine.getCurrentPhase(
      TEST_TRIP_ID,
      TEST_USER_ID
    );

    expect(result).not.toBeNull();
    expect(result!.phaseNumber).toBe(3);
    expect(result!.status).toBe("active");
    expect(result!.definition).toBeDefined();
    expect(result!.definition!.name).toBe("O Preparo");
  });

  it("returns null when no active phase exists", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findFirst.mockResolvedValue(null as never);

    const result = await PhaseEngine.getCurrentPhase(
      TEST_TRIP_ID,
      TEST_USER_ID
    );

    expect(result).toBeNull();
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.getCurrentPhase(TEST_TRIP_ID, TEST_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });
});

// ─── getHighestCompletedPhase ─────────────────────────────────────────────────

describe("PhaseEngine.getHighestCompletedPhase", () => {
  it("returns the highest completed phase with definition", async () => {
    const completedPhase = createMockPhase(6, "completed");
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findFirst.mockResolvedValue(
      completedPhase as never
    );

    const result = await PhaseEngine.getHighestCompletedPhase(
      TEST_TRIP_ID,
      TEST_USER_ID
    );

    expect(result).not.toBeNull();
    expect(result!.phaseNumber).toBe(6);
    expect(result!.status).toBe("completed");
    expect(result!.definition).toBeDefined();

    // Verify query uses correct ordering
    expect(prismaMock.expeditionPhase.findFirst).toHaveBeenCalledWith({
      where: { tripId: TEST_TRIP_ID, status: "completed" },
      orderBy: { phaseNumber: "desc" },
    });
  });

  it("returns null when no completed phases exist", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findFirst.mockResolvedValue(null as never);

    const result = await PhaseEngine.getHighestCompletedPhase(
      TEST_TRIP_ID,
      TEST_USER_ID
    );

    expect(result).toBeNull();
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.getHighestCompletedPhase(TEST_TRIP_ID, TEST_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });
});

// ─── completePhase ────────────────────────────────────────────────────────────

describe("PhaseEngine.completePhase", () => {
  it("completes phase and returns PhaseCompletionResult with points/badge/rank/nextPhase", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(result).toEqual({
      phaseNumber: 1,
      pointsEarned: 100,
      badgeAwarded: null,
      newRank: null,
      nextPhaseUnlocked: 2,
    });

    // Verify phase was marked completed in transaction
    expect(mockTx.expeditionPhase.update).toHaveBeenCalled();
    expect(mockTx.trip.update).toHaveBeenCalled();
  });

  it("awards points via PointsEngine.earnPoints in transaction", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 1);

    expect(PointsEngine.earnPoints).toHaveBeenCalledWith(
      TEST_USER_ID,
      100, // Phase 1 pointsReward
      "phase_complete",
      "Completed phase 1: O Chamado",
      TEST_TRIP_ID,
      expect.anything() // tx
    );
  });

  it("does not award badge when phase definition has no badgeKey (phase 1)", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(PointsEngine.awardBadge).not.toHaveBeenCalled();
    expect(result.badgeAwarded).toBeNull();
  });

  it("does not award badge when phase definition has no badgeKey (phase 2)", async () => {
    const trip = createMockTrip({ currentPhase: 2 });
    const phase = createMockPhase(2, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      2
    );

    expect(PointsEngine.awardBadge).not.toHaveBeenCalled();
    expect(result.badgeAwarded).toBeNull();
  });

  it("updates rank when phase definition has rankPromotion (phase 2 -> desbravador)", async () => {
    const trip = createMockTrip({ currentPhase: 2 });
    const phase = createMockPhase(2, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      2
    );

    expect(PointsEngine.updateRank).toHaveBeenCalledWith(
      TEST_USER_ID,
      "desbravador",
      expect.anything() // tx
    );
    expect(result.newRank).toBe("desbravador");
  });

  it("does not update rank when phase definition has no rankPromotion (phase 1)", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(PointsEngine.updateRank).not.toHaveBeenCalled();
    expect(result.newRank).toBeNull();
  });

  it("unlocks next phase (status: active)", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(result.nextPhaseUnlocked).toBe(2);

    // Verify next phase was unlocked in the transaction
    expect(mockTx.expeditionPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tripId_phaseNumber: { tripId: TEST_TRIP_ID, phaseNumber: 2 },
        },
        data: { status: "active" },
      })
    );
  });

  it("does not unlock phase 9 when completing phase 8 (last phase)", async () => {
    const trip = createMockTrip({ currentPhase: 8 });
    const phase = createMockPhase(8, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      8
    );

    expect(result.nextPhaseUnlocked).toBeNull();
    expect(result.pointsEarned).toBe(500);
    expect(result.badgeAwarded).toBeNull();

    // The update calls: 1 for marking completed. No second update for next phase.
    // Trip update still happens via mockTx.trip.update.
    // We verify no phase unlock by checking the second update call pattern
    const phaseUpdateCalls = mockTx.expeditionPhase.update.mock.calls;
    const unlockCalls = phaseUpdateCalls.filter(
      (call) => call[0]?.data?.status === "active"
    );
    expect(unlockCalls).toHaveLength(0);
  });

  it("updates trip.currentPhase", async () => {
    const trip = createMockTrip({ currentPhase: 3 });
    const phase = createMockPhase(3, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3);

    expect(mockTx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TRIP_ID },
        data: { currentPhase: 4 },
      })
    );
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 1)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NOT_EXPEDITION when trip.expeditionMode is false", async () => {
    const trip = createMockTrip({ expeditionMode: false });
    prismaMock.trip.findFirst.mockResolvedValue(trip as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 1)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 1);
    } catch (err) {
      expect((err as AppError).code).toBe("NOT_EXPEDITION");
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("throws PHASE_ORDER_VIOLATION when phaseNumber !== trip.currentPhase", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    prismaMock.trip.findFirst.mockResolvedValue(trip as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_ORDER_VIOLATION");
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("throws PHASE_NOT_ACTIVE when phase status is not active", async () => {
    const trip = createMockTrip({ currentPhase: 2 });
    const lockedPhase = createMockPhase(2, "locked");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      lockedPhase as never
    );

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 2)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 2);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_NOT_ACTIVE");
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("logs gamification.phaseCompleted on success", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 1);

    expect(logger.info).toHaveBeenCalledWith(
      "gamification.phaseCompleted",
      expect.objectContaining({
        tripId: TEST_TRIP_ID,
        userIdHash: hashUserId(TEST_USER_ID),
        phaseNumber: 1,
        pointsEarned: 100,
      })
    );
  });

  it("passes metadata to the phase update when provided", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");
    const mockTx = setupTransactionMock();
    const metadata = { completionSource: "manual" };

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1,
      metadata
    );

    // First update call is the "mark completed" update
    const firstUpdateCall = mockTx.expeditionPhase.update.mock.calls[0];
    expect(firstUpdateCall[0].data.metadata).toEqual(metadata);
  });

  it("caps trip.currentPhase at TOTAL_PHASES when completing phase 8", async () => {
    const trip = createMockTrip({ currentPhase: 8 });
    const phase = createMockPhase(8, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 8);

    // Math.min(8 + 1, 8) = 8
    expect(mockTx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentPhase: 8 },
      })
    );
  });
});

// ─── canAccessPhase ───────────────────────────────────────────────────────────

describe("PhaseEngine.canAccessPhase", () => {
  it("returns true for active phase", async () => {
    const activePhase = createMockPhase(1, "active");
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      activePhase as never
    );

    const result = await PhaseEngine.canAccessPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(result).toBe(true);
  });

  it("returns true for completed phase", async () => {
    const completedPhase = createMockPhase(1, "completed");
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      completedPhase as never
    );

    const result = await PhaseEngine.canAccessPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(result).toBe(true);
  });

  it("returns false for locked phase", async () => {
    const lockedPhase = createMockPhase(3, "locked");
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      lockedPhase as never
    );

    const result = await PhaseEngine.canAccessPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3
    );

    expect(result).toBe(false);
  });

  it("returns false when trip not found (different user)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    const result = await PhaseEngine.canAccessPhase(
      TEST_TRIP_ID,
      OTHER_USER_ID,
      1
    );

    expect(result).toBe(false);
  });

  it("returns false when phase not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null as never);

    const result = await PhaseEngine.canAccessPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      1
    );

    expect(result).toBe(false);
  });
});

// ─── getPhaseStatus ───────────────────────────────────────────────────────────

describe("PhaseEngine.getPhaseStatus", () => {
  it('returns "active" for active phase', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    const activePhase = createMockPhase(1, "active");
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      activePhase as never
    );

    const result = await PhaseEngine.getPhaseStatus(TEST_TRIP_ID, TEST_USER_ID, 1);

    expect(result).toBe("active");
  });

  it('returns "locked" for locked phase', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    const lockedPhase = createMockPhase(3, "locked");
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      lockedPhase as never
    );

    const result = await PhaseEngine.getPhaseStatus(TEST_TRIP_ID, TEST_USER_ID, 3);

    expect(result).toBe("locked");
  });

  it('returns "completed" for completed phase', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    const completedPhase = createMockPhase(1, "completed");
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      completedPhase as never
    );

    const result = await PhaseEngine.getPhaseStatus(TEST_TRIP_ID, TEST_USER_ID, 1);

    expect(result).toBe("completed");
  });

  it("returns null when phase not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null as never);

    const result = await PhaseEngine.getPhaseStatus(TEST_TRIP_ID, TEST_USER_ID, 1);

    expect(result).toBeNull();
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.getPhaseStatus(TEST_TRIP_ID, TEST_USER_ID, 1)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError for different user", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.getPhaseStatus(TEST_TRIP_ID, OTHER_USER_ID, 1)
    ).rejects.toThrow(ForbiddenError);
  });
});

// ─── resetExpedition ──────────────────────────────────────────────────────────

describe("PhaseEngine.resetExpedition", () => {
  it("resets all phases to locked except phase 1 (active)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    const mockTx = setupTransactionMock();

    await PhaseEngine.resetExpedition(TEST_TRIP_ID, TEST_USER_ID);

    // All phases set to locked first
    expect(mockTx.expeditionPhase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tripId: TEST_TRIP_ID },
        data: { status: "locked", completedAt: null, pointsEarned: 0 },
      })
    );

    // Phase 1 set to active
    expect(mockTx.expeditionPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tripId_phaseNumber: { tripId: TEST_TRIP_ID, phaseNumber: 1 },
        },
        data: { status: "active" },
      })
    );
  });

  it("resets trip.currentPhase to 1", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    const mockTx = setupTransactionMock();

    await PhaseEngine.resetExpedition(TEST_TRIP_ID, TEST_USER_ID);

    expect(mockTx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TRIP_ID },
        data: { currentPhase: 1 },
      })
    );
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.resetExpedition(TEST_TRIP_ID, TEST_USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it("logs gamification.expeditionReset on success", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    setupTransactionMock();

    await PhaseEngine.resetExpedition(TEST_TRIP_ID, TEST_USER_ID);

    expect(logger.info).toHaveBeenCalledWith(
      "gamification.expeditionReset",
      { tripId: TEST_TRIP_ID, userIdHash: hashUserId(TEST_USER_ID) }
    );
  });
});

// ─── useAiInPhase ─────────────────────────────────────────────────────────────

describe("PhaseEngine.useAiInPhase", () => {
  it("spends points for a phase with AI cost (phase 3, cost=30)", async () => {
    const trip = createMockTrip();
    const activePhase = createMockPhase(3, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      activePhase as never
    );

    const result = await PhaseEngine.useAiInPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3
    );

    expect(PointsEngine.spendPoints).toHaveBeenCalledWith(
      TEST_USER_ID,
      30, // Phase 3 aiCost
      "ai_usage",
      "AI usage in phase 3: O Preparo (ai_route)",
      TEST_TRIP_ID
    );
    expect(result).toEqual({
      remainingPoints: 400,
      transactionId: "tx-1",
    });
  });

  it("throws AI_NOT_AVAILABLE for phase without AI cost (phase 1)", async () => {
    const trip = createMockTrip();
    prismaMock.trip.findFirst.mockResolvedValue(trip as never);

    await expect(
      PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 1)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 1);
    } catch (err) {
      expect((err as AppError).code).toBe("AI_NOT_AVAILABLE");
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("throws PHASE_NOT_ACTIVE when phase is not active", async () => {
    const trip = createMockTrip();
    const lockedPhase = createMockPhase(3, "locked");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      lockedPhase as never
    );

    await expect(
      PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 3)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 3);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_NOT_ACTIVE");
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 3)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws AI_NOT_AVAILABLE for phase 4 (no AI cost)", async () => {
    const trip = createMockTrip();
    prismaMock.trip.findFirst.mockResolvedValue(trip as never);

    await expect(
      PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 4)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 4);
    } catch (err) {
      expect((err as AppError).code).toBe("AI_NOT_AVAILABLE");
    }
  });

  it("spends correct AI cost for phase 5 (cost=50, ai_accommodation)", async () => {
    const trip = createMockTrip();
    const activePhase = createMockPhase(5, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      activePhase as never
    );

    await PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 5);

    expect(PointsEngine.spendPoints).toHaveBeenCalledWith(
      TEST_USER_ID,
      50,
      "ai_usage",
      "AI usage in phase 5: Guia do Destino (ai_accommodation)",
      TEST_TRIP_ID
    );
  });

  it("spends correct AI cost for phase 6 (cost=80, ai_itinerary)", async () => {
    const trip = createMockTrip();
    const activePhase = createMockPhase(6, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(
      activePhase as never
    );

    await PhaseEngine.useAiInPhase(TEST_TRIP_ID, TEST_USER_ID, 6);

    expect(PointsEngine.spendPoints).toHaveBeenCalledWith(
      TEST_USER_ID,
      80,
      "ai_usage",
      "AI usage in phase 6: O Roteiro (ai_itinerary)",
      TEST_TRIP_ID
    );
  });
});

// ─── Phase prerequisites ─────────────────────────────────────────────────────

describe("PhaseEngine.completePhase — prerequisites", () => {
  it("throws PHASE_PREREQUISITES_NOT_MET for phase 3 with incomplete required items", async () => {
    const trip = createMockTrip({ currentPhase: 3 });
    const phase = createMockPhase(3, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(2 as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_PREREQUISITES_NOT_MET");
    }
  });

  it("succeeds for phase 3 when all required checklist items are complete", async () => {
    const trip = createMockTrip({ currentPhase: 3 });
    const phase = createMockPhase(3, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3
    );

    expect(result.phaseNumber).toBe(3);
    expect(result.pointsEarned).toBe(75);
    expect(result.badgeAwarded).toBeNull();
  });

  it("throws PHASE_PREREQUISITES_NOT_MET for phase 4 when CINH unresolved for international", async () => {
    const trip = createMockTrip({ currentPhase: 4, tripType: "international" });
    const phase = createMockPhase(4, "active", {
      metadata: { needsCarRental: true },
    });

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 4)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 4);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_PREREQUISITES_NOT_MET");
    }
  });

  it("succeeds for phase 4 when car rental not needed", async () => {
    const trip = createMockTrip({ currentPhase: 4 });
    const phase = createMockPhase(4, "active", {
      metadata: { needsCarRental: false },
    });
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      4
    );

    expect(result.phaseNumber).toBe(4);
    expect(result.pointsEarned).toBe(50);
  });

  it("succeeds for phase 4 when CINH is resolved for international trip", async () => {
    const trip = createMockTrip({ currentPhase: 4, tripType: "international" });
    const phase = createMockPhase(4, "active", {
      metadata: { needsCarRental: true, cnhResolved: true },
    });
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      4
    );

    expect(result.phaseNumber).toBe(4);
  });

  it("succeeds for phase 4 with car rental on domestic trip (no CINH needed)", async () => {
    const trip = createMockTrip({ currentPhase: 4, tripType: "domestic" });
    const phase = createMockPhase(4, "active", {
      metadata: { needsCarRental: true },
    });
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      4
    );

    expect(result.phaseNumber).toBe(4);
  });

  it("throws PHASE_PREREQUISITES_NOT_MET for phase 5 without destination guide", async () => {
    const trip = createMockTrip({ currentPhase: 5 });
    const phase = createMockPhase(5, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 5)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 5);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_PREREQUISITES_NOT_MET");
    }
  });

  it("succeeds for phase 5 with destination guide present", async () => {
    const trip = createMockTrip({ currentPhase: 5 });
    const phase = createMockPhase(5, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);
    prismaMock.destinationGuide.findUnique.mockResolvedValue({
      id: "guide-1",
      tripId: TEST_TRIP_ID,
      content: {},
      destination: "Paris",
      locale: "en",
      generationCount: 1,
      viewedSections: [],
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      5
    );

    expect(result.phaseNumber).toBe(5);
    expect(result.pointsEarned).toBe(40);
    expect(result.newRank).toBe("capitao");
  });
});

// ─── advanceFromPhase ──────────────────────────────────────────────────────

describe("PhaseEngine.advanceFromPhase", () => {
  it("unlocks next phase and updates currentPhase without awarding points", async () => {
    const trip = createMockTrip({ currentPhase: 3 });
    const phase = createMockPhase(3, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.advanceFromPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3
    );

    expect(result).toEqual({ nextPhase: 4 });

    // Verify next phase was unlocked
    expect(mockTx.expeditionPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tripId_phaseNumber: { tripId: TEST_TRIP_ID, phaseNumber: 4 },
        },
        data: { status: "active" },
      })
    );

    // Verify trip.currentPhase updated
    expect(mockTx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TRIP_ID },
        data: { currentPhase: 4 },
      })
    );

    // Verify no points were awarded
    expect(PointsEngine.earnPoints).not.toHaveBeenCalled();
    expect(PointsEngine.awardBadge).not.toHaveBeenCalled();
  });

  it("works for phase 4 (also non-blocking)", async () => {
    const trip = createMockTrip({ currentPhase: 4 });
    const phase = createMockPhase(4, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    const result = await PhaseEngine.advanceFromPhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      4
    );

    expect(result).toEqual({ nextPhase: 5 });
    expect(mockTx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentPhase: 5 } })
    );
  });

  it("throws PHASE_NOT_NON_BLOCKING for blocking phases (phase 1)", async () => {
    const trip = createMockTrip({ currentPhase: 1 });
    const phase = createMockPhase(1, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await expect(
      PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 1)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 1);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_NOT_NON_BLOCKING");
    }
  });

  it("throws PHASE_NOT_NON_BLOCKING for blocking phases (phase 2)", async () => {
    const trip = createMockTrip({ currentPhase: 2 });
    const phase = createMockPhase(2, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await expect(
      PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 2)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 2);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_NOT_NON_BLOCKING");
    }
  });

  it("throws PHASE_NOT_NON_BLOCKING for blocking phases (phase 5)", async () => {
    const trip = createMockTrip({ currentPhase: 5 });
    const phase = createMockPhase(5, "active");

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await expect(
      PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 5)
    ).rejects.toThrow(AppError);
  });

  it("throws PHASE_ORDER_VIOLATION when phaseNumber !== currentPhase", async () => {
    const trip = createMockTrip({ currentPhase: 3 });

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);

    await expect(
      PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 4)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 4);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_ORDER_VIOLATION");
    }
  });

  it("throws ForbiddenError when trip not found", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 3)
    ).rejects.toThrow(ForbiddenError);
  });

  it("logs gamification.phaseAdvanced on success", async () => {
    const trip = createMockTrip({ currentPhase: 3 });
    const phase = createMockPhase(3, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);

    await PhaseEngine.advanceFromPhase(TEST_TRIP_ID, TEST_USER_ID, 3);

    expect(logger.info).toHaveBeenCalledWith(
      "gamification.phaseAdvanced",
      expect.objectContaining({
        tripId: TEST_TRIP_ID,
        userIdHash: hashUserId(TEST_USER_ID),
        phaseNumber: 3,
        nextPhase: 4,
      })
    );
  });
});

// ─── completePhase — non-blocking retroactive ──────────────────────────────

describe("PhaseEngine.completePhase — non-blocking retroactive completion", () => {
  it("allows completing phase 3 when currentPhase has advanced past it", async () => {
    const trip = createMockTrip({ currentPhase: 5 });
    const phase = createMockPhase(3, "active");
    setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    const result = await PhaseEngine.completePhase(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3
    );

    expect(result.phaseNumber).toBe(3);
    expect(result.pointsEarned).toBe(75);
    expect(result.badgeAwarded).toBeNull();
  });

  it("uses Math.max to avoid regressing currentPhase", async () => {
    const trip = createMockTrip({ currentPhase: 5 });
    const phase = createMockPhase(3, "active");
    const mockTx = setupTransactionMock();

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(phase as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3);

    // Math.max(4, 5) = 5 — should not regress
    expect(mockTx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentPhase: 5 },
      })
    );
  });

  it("still blocks non-blocking phase if phaseNumber > currentPhase", async () => {
    const trip = createMockTrip({ currentPhase: 2 });

    prismaMock.trip.findFirst.mockResolvedValue(trip as never);

    await expect(
      PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3)
    ).rejects.toThrow(AppError);

    try {
      await PhaseEngine.completePhase(TEST_TRIP_ID, TEST_USER_ID, 3);
    } catch (err) {
      expect((err as AppError).code).toBe("PHASE_ORDER_VIOLATION");
    }
  });
});
