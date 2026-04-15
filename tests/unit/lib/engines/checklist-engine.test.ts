/**
 * Unit tests for ChecklistEngine.
 *
 * Tests cover: Phase 3 checklist initialization, item toggling with
 * idempotent point awarding, checklist retrieval, and completion checks.
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
  },
}));

// ─── Import SUT after mocks ──────────────────────────────────────────────────

import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { PointsEngine } from "@/lib/engines/points-engine";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { ForbiddenError, AppError } from "@/lib/errors";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_TRIP_ID = "trip-001";
const TEST_USER_ID = "user-001";

function createMockTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TRIP_ID,
    userId: TEST_USER_ID,
    title: "Test Trip",
    tripType: "international",
    deletedAt: null,
    ...overrides,
  };
}

function createMockChecklistItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-001",
    tripId: TEST_TRIP_ID,
    phaseNumber: 3,
    itemKey: "emergency_contacts",
    required: true,
    completed: false,
    deadline: null,
    pointsValue: 15,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── initializePhase3Checklist ────────────────────────────────────────────────

describe("ChecklistEngine.initializePhase3Checklist", () => {
  it("creates checklist items based on tripType (international)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({
      count: 7,
    } as never);

    await ChecklistEngine.initializePhase3Checklist(
      TEST_TRIP_ID,
      TEST_USER_ID,
      "international",
      new Date("2026-06-15")
    );

    expect(prismaMock.phaseChecklistItem.createMany).toHaveBeenCalledOnce();

    const createCall =
      prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = createCall!.data as Array<{
      tripId: string;
      phaseNumber: number;
      itemKey: string;
      required: boolean;
      pointsValue: number;
    }>;

    // International gets 7 items (etias_eta is schengen-only)
    expect(data.length).toBe(7);
    expect(data.every((d) => d.phaseNumber === 3)).toBe(true);
    expect(data.every((d) => d.tripId === TEST_TRIP_ID)).toBe(true);
  });

  it("creates fewer items for domestic trips", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({
      count: 3,
    } as never);

    await ChecklistEngine.initializePhase3Checklist(
      TEST_TRIP_ID,
      TEST_USER_ID,
      "domestic",
      null
    );

    const createCall =
      prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = createCall!.data as Array<{ itemKey: string }>;

    // Domestic only gets: travel_insurance (rec), emergency_contacts (req), copies_documents (rec)
    expect(data.length).toBe(3);
    const keys = data.map((d) => d.itemKey);
    expect(keys).toContain("emergency_contacts");
    expect(keys).toContain("travel_insurance");
    expect(keys).toContain("copies_documents");
  });

  it("is idempotent — skips if items already exist", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(8 as never);

    await ChecklistEngine.initializePhase3Checklist(
      TEST_TRIP_ID,
      TEST_USER_ID,
      "international",
      null
    );

    expect(prismaMock.phaseChecklistItem.createMany).not.toHaveBeenCalled();
  });

  it("calculates deadlines from startDate", async () => {
    const startDate = new Date("2026-06-15T00:00:00Z");
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({
      count: 7,
    } as never);

    await ChecklistEngine.initializePhase3Checklist(
      TEST_TRIP_ID,
      TEST_USER_ID,
      "international",
      startDate
    );

    const createCall =
      prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = createCall!.data as Array<{
      itemKey: string;
      deadline: Date | null;
    }>;

    // All items should have a deadline before startDate
    for (const item of data) {
      expect(item.deadline).not.toBeNull();
      expect(item.deadline!.getTime()).toBeLessThan(startDate.getTime());
    }

    // passport_valid_6m: 90 days before
    const passport = data.find((d) => d.itemKey === "passport_valid_6m");
    const expectedDeadline = new Date(
      startDate.getTime() - 90 * 86400000
    );
    expect(passport!.deadline!.getTime()).toBe(expectedDeadline.getTime());
  });

  it("sets pointsValue correctly (15 for required, 8 for recommended)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({
      count: 7,
    } as never);

    await ChecklistEngine.initializePhase3Checklist(
      TEST_TRIP_ID,
      TEST_USER_ID,
      "international",
      null
    );

    const createCall =
      prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = createCall!.data as Array<{
      itemKey: string;
      required: boolean;
      pointsValue: number;
    }>;

    for (const item of data) {
      if (item.required) {
        expect(item.pointsValue).toBe(15);
      } else {
        expect(item.pointsValue).toBe(8);
      }
    }
  });

  it("throws ForbiddenError for wrong user", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      ChecklistEngine.initializePhase3Checklist(
        TEST_TRIP_ID,
        "user-999",
        "international",
        null
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("logs checklist.phase3Initialized on success", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({
      count: 7,
    } as never);

    await ChecklistEngine.initializePhase3Checklist(
      TEST_TRIP_ID,
      TEST_USER_ID,
      "international",
      null
    );

    // Wave 2: log key renamed from "checklist.phase3Initialized" to
    // "checklist.initialized" when initializePhase3Checklist delegates to
    // the new flag-aware initializeChecklistItems.
    expect(logger.info).toHaveBeenCalledWith(
      "checklist.initialized",
      expect.objectContaining({
        tripId: TEST_TRIP_ID,
        tripType: "international",
      })
    );
  });
});

// ─── toggleItem ───────────────────────────────────────────────────────────────

describe("ChecklistEngine.toggleItem", () => {
  it("toggles item from incomplete to complete", async () => {
    const item = createMockChecklistItem({ completed: false });
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.findUnique.mockResolvedValue(
      item as never
    );
    prismaMock.phaseChecklistItem.update.mockResolvedValue({
      ...item,
      completed: true,
    } as never);
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null as never);

    const result = await ChecklistEngine.toggleItem(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3,
      "emergency_contacts"
    );

    expect(result.completed).toBe(true);
    expect(result.pointsAwarded).toBe(15);
    expect(PointsEngine.earnPoints).toHaveBeenCalledWith(
      TEST_USER_ID,
      15,
      "phase_checklist",
      "Checklist item: emergency_contacts (phase 3)",
      TEST_TRIP_ID
    );
  });

  it("toggles item from complete to incomplete without deducting points", async () => {
    const item = createMockChecklistItem({ completed: true });
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.findUnique.mockResolvedValue(
      item as never
    );
    prismaMock.phaseChecklistItem.update.mockResolvedValue({
      ...item,
      completed: false,
    } as never);

    const result = await ChecklistEngine.toggleItem(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3,
      "emergency_contacts"
    );

    expect(result.completed).toBe(false);
    expect(result.pointsAwarded).toBe(0);
    expect(PointsEngine.earnPoints).not.toHaveBeenCalled();
  });

  it("does not re-award points on re-toggle (idempotent)", async () => {
    const item = createMockChecklistItem({ completed: false });
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.findUnique.mockResolvedValue(
      item as never
    );
    prismaMock.phaseChecklistItem.update.mockResolvedValue({
      ...item,
      completed: true,
    } as never);
    // Simulate that points were already awarded
    prismaMock.pointTransaction.findFirst.mockResolvedValue({
      id: "existing-tx",
    } as never);

    const result = await ChecklistEngine.toggleItem(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3,
      "emergency_contacts"
    );

    expect(result.completed).toBe(true);
    expect(result.pointsAwarded).toBe(0);
    expect(PointsEngine.earnPoints).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for wrong user", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    await expect(
      ChecklistEngine.toggleItem(TEST_TRIP_ID, "user-999", 3, "emergency_contacts")
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ITEM_NOT_FOUND for invalid item key", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.findUnique.mockResolvedValue(null as never);

    await expect(
      ChecklistEngine.toggleItem(
        TEST_TRIP_ID,
        TEST_USER_ID,
        3,
        "nonexistent_item"
      )
    ).rejects.toThrow(AppError);

    try {
      await ChecklistEngine.toggleItem(
        TEST_TRIP_ID,
        TEST_USER_ID,
        3,
        "nonexistent_item"
      );
    } catch (err) {
      expect((err as AppError).code).toBe("ITEM_NOT_FOUND");
    }
  });

  it("logs checklist.itemToggled on success", async () => {
    const item = createMockChecklistItem({ completed: false });
    prismaMock.trip.findFirst.mockResolvedValue(createMockTrip() as never);
    prismaMock.phaseChecklistItem.findUnique.mockResolvedValue(
      item as never
    );
    prismaMock.phaseChecklistItem.update.mockResolvedValue({
      ...item,
      completed: true,
    } as never);
    prismaMock.pointTransaction.findFirst.mockResolvedValue(null as never);

    await ChecklistEngine.toggleItem(
      TEST_TRIP_ID,
      TEST_USER_ID,
      3,
      "emergency_contacts"
    );

    expect(logger.info).toHaveBeenCalledWith(
      "checklist.itemToggled",
      expect.objectContaining({
        tripId: TEST_TRIP_ID,
        phaseNumber: 3,
        itemKey: "emergency_contacts",
        completed: true,
      })
    );
  });
});

// ─── getPhaseChecklist ────────────────────────────────────────────────────────

describe("ChecklistEngine.getPhaseChecklist", () => {
  it("returns items ordered by required desc, then itemKey asc", async () => {
    const items = [
      createMockChecklistItem({ itemKey: "b_item", required: true }),
      createMockChecklistItem({ itemKey: "a_item", required: false }),
    ];
    prismaMock.phaseChecklistItem.findMany.mockResolvedValue(items as never);

    await ChecklistEngine.getPhaseChecklist(TEST_TRIP_ID, 3);

    expect(prismaMock.phaseChecklistItem.findMany).toHaveBeenCalledWith({
      where: { tripId: TEST_TRIP_ID, phaseNumber: 3 },
      orderBy: [{ required: "desc" }, { itemKey: "asc" }],
    });
  });
});

// ─── isPhaseChecklistComplete ─────────────────────────────────────────────────

describe("ChecklistEngine.isPhaseChecklistComplete", () => {
  it("returns true when all required items are complete", async () => {
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    const result = await ChecklistEngine.isPhaseChecklistComplete(
      TEST_TRIP_ID,
      3
    );

    expect(result).toBe(true);
  });

  it("returns false when required items are incomplete", async () => {
    prismaMock.phaseChecklistItem.count.mockResolvedValue(3 as never);

    const result = await ChecklistEngine.isPhaseChecklistComplete(
      TEST_TRIP_ID,
      3
    );

    expect(result).toBe(false);
  });

  it("queries only required incomplete items", async () => {
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    await ChecklistEngine.isPhaseChecklistComplete(TEST_TRIP_ID, 3);

    expect(prismaMock.phaseChecklistItem.count).toHaveBeenCalledWith({
      where: {
        tripId: TEST_TRIP_ID,
        phaseNumber: 3,
        required: true,
        completed: false,
      },
    });
  });
});
