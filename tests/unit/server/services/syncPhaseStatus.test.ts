/**
 * Unit tests for PhaseCompletionService.syncPhaseStatus (TASK-S32-006).
 *
 * Verifies:
 * - Status is updated when evaluation differs from DB
 * - Status is not updated when already matching
 * - Locked phases are never modified
 * - completedAt is set when transitioning to completed
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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { PhaseCompletionService } from "@/server/services/phase-completion.service";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-sync-001";
const USER_ID = "user-sync-001";

function mockBuildSnapshot(overrides: Record<string, unknown> = {}) {
  // Mock all DB calls that buildSnapshot makes
  prismaMock.trip.findFirst.mockResolvedValue({
    id: TRIP_ID,
    destination: "Paris",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-10"),
    userId: USER_ID,
    ...overrides,
  } as never);

  prismaMock.user.findUnique.mockResolvedValue({
    name: "Test User",
  } as never);

  prismaMock.userProfile.findUnique.mockResolvedValue({
    birthDate: new Date("1990-01-01"),
  } as never);

  prismaMock.expeditionPhase.findMany.mockResolvedValue([
    { phaseNumber: 1, status: "completed", metadata: null },
    { phaseNumber: 2, status: "completed", metadata: { travelerType: "solo" } },
    { phaseNumber: 3, status: "active", metadata: null },
    { phaseNumber: 4, status: "locked", metadata: null },
    { phaseNumber: 5, status: "locked", metadata: null },
    { phaseNumber: 6, status: "locked", metadata: null },
  ] as never);

  prismaMock.phaseChecklistItem.findMany.mockResolvedValue([] as never);
  prismaMock.transportSegment.count.mockResolvedValue(0 as never);
  prismaMock.accommodation.count.mockResolvedValue(0 as never);
  prismaMock.destinationGuide.findUnique.mockResolvedValue(null as never);
  prismaMock.itineraryDay.count.mockResolvedValue(0 as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PhaseCompletionService.syncPhaseStatus (TASK-S32-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates phase from active to completed when evaluation says completed", async () => {
    mockBuildSnapshot();

    // Phase 3: has checklist items, all required completed
    prismaMock.phaseChecklistItem.findMany.mockResolvedValue([
      { required: true, completed: true },
      { required: true, completed: true },
      { required: false, completed: false },
    ] as never);

    // Phase 3 is currently "active" in DB
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-3",
      tripId: TRIP_ID,
      phaseNumber: 3,
      status: "active",
      completedAt: null,
    } as never);

    prismaMock.expeditionPhase.update.mockResolvedValue({} as never);

    const changed = await PhaseCompletionService.syncPhaseStatus(
      TRIP_ID,
      USER_ID,
      3
    );

    expect(changed).toBe(true);
    expect(prismaMock.expeditionPhase.update).toHaveBeenCalledWith({
      where: { id: "phase-3" },
      data: {
        status: "completed",
        completedAt: expect.any(Date),
      },
    });
  });

  it("returns false when phase status already matches evaluation", async () => {
    mockBuildSnapshot();

    // Phase 3: no items -> pending -> maps to active
    prismaMock.phaseChecklistItem.findMany.mockResolvedValue([] as never);

    // Phase 3 is already "active"
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-3",
      tripId: TRIP_ID,
      phaseNumber: 3,
      status: "active",
      completedAt: null,
    } as never);

    const changed = await PhaseCompletionService.syncPhaseStatus(
      TRIP_ID,
      USER_ID,
      3
    );

    expect(changed).toBe(false);
    expect(prismaMock.expeditionPhase.update).not.toHaveBeenCalled();
  });

  it("never modifies locked phases", async () => {
    mockBuildSnapshot();

    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-4",
      tripId: TRIP_ID,
      phaseNumber: 4,
      status: "locked",
      completedAt: null,
    } as never);

    const changed = await PhaseCompletionService.syncPhaseStatus(
      TRIP_ID,
      USER_ID,
      4
    );

    expect(changed).toBe(false);
    expect(prismaMock.expeditionPhase.update).not.toHaveBeenCalled();
  });

  it("returns false when phase not found in DB", async () => {
    mockBuildSnapshot();
    prismaMock.expeditionPhase.findUnique.mockResolvedValue(null as never);

    const changed = await PhaseCompletionService.syncPhaseStatus(
      TRIP_ID,
      USER_ID,
      3
    );

    expect(changed).toBe(false);
  });

  it("transitions completed phase back to active when data is removed", async () => {
    mockBuildSnapshot();

    // Phase 6: no itinerary days -> pending -> maps to active
    prismaMock.itineraryDay.count.mockResolvedValue(0 as never);

    // Phase 6 is "completed" but has no data (e.g., itinerary was deleted)
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-6",
      tripId: TRIP_ID,
      phaseNumber: 6,
      status: "completed",
      completedAt: new Date(),
    } as never);

    prismaMock.expeditionPhase.update.mockResolvedValue({} as never);

    const changed = await PhaseCompletionService.syncPhaseStatus(
      TRIP_ID,
      USER_ID,
      6
    );

    expect(changed).toBe(true);
    expect(prismaMock.expeditionPhase.update).toHaveBeenCalledWith({
      where: { id: "phase-6" },
      data: { status: "active" },
    });
  });
});
