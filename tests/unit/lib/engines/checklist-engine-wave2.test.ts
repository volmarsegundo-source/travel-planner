/**
 * Sprint 44 Wave 2 — ChecklistEngine flag-aware behavior.
 *
 * Tests cover:
 * - initializeChecklistItems uses phaseNumber=6 when flag ON, 3 when OFF
 * - initializePhase3Checklist (deprecated alias) delegates correctly
 * - getChecklistItems calls getPhaseChecklist with flag-aware phase
 * - isChecklistComplete calls isPhaseChecklistComplete with flag-aware phase
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3.1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist flag mock ──────────────────────────────────────────────────────────

const mockFlagModule = vi.hoisted(() => ({
  isPhaseReorderEnabled: vi.fn(() => false),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags/phase-reorder", () => mockFlagModule);

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: { earnPoints: vi.fn() },
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────────

import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

const TRIP_ID = "trip-wave2";
const USER_ID = "user-wave2";

function mockTrip() {
  return {
    id: TRIP_ID,
    userId: USER_ID,
    tripType: "international",
    deletedAt: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setFlag(enabled: boolean) {
  mockFlagModule.isPhaseReorderEnabled.mockReturnValue(enabled);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setFlag(false);
});

// ─── initializeChecklistItems — flag-aware phase number ───────────────────────

describe("ChecklistEngine.initializeChecklistItems — flag OFF (phaseNumber=3)", () => {
  it("creates checklist items with phaseNumber=3 when flag is OFF", async () => {
    setFlag(false);
    prismaMock.trip.findFirst.mockResolvedValue(mockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({ count: 7 } as never);

    await ChecklistEngine.initializeChecklistItems(TRIP_ID, USER_ID, "international", null);

    const call = prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = call!.data as Array<{ phaseNumber: number }>;
    expect(data.every((d) => d.phaseNumber === 3)).toBe(true);
  });

  it("idempotency check uses phaseNumber=3 when flag is OFF", async () => {
    setFlag(false);
    prismaMock.trip.findFirst.mockResolvedValue(mockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(5 as never);

    await ChecklistEngine.initializeChecklistItems(TRIP_ID, USER_ID, "international", null);

    expect(prismaMock.phaseChecklistItem.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phaseNumber: 3 }) })
    );
    expect(prismaMock.phaseChecklistItem.createMany).not.toHaveBeenCalled();
  });
});

describe("ChecklistEngine.initializeChecklistItems — flag ON (phaseNumber=6)", () => {
  it("creates checklist items with phaseNumber=6 when flag is ON", async () => {
    setFlag(true);
    prismaMock.trip.findFirst.mockResolvedValue(mockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({ count: 7 } as never);

    await ChecklistEngine.initializeChecklistItems(TRIP_ID, USER_ID, "international", null);

    const call = prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = call!.data as Array<{ phaseNumber: number }>;
    expect(data.every((d) => d.phaseNumber === 6)).toBe(true);
  });

  it("idempotency check uses phaseNumber=6 when flag is ON", async () => {
    setFlag(true);
    prismaMock.trip.findFirst.mockResolvedValue(mockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(5 as never);

    await ChecklistEngine.initializeChecklistItems(TRIP_ID, USER_ID, "international", null);

    expect(prismaMock.phaseChecklistItem.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phaseNumber: 6 }) })
    );
    expect(prismaMock.phaseChecklistItem.createMany).not.toHaveBeenCalled();
  });
});

// ─── initializePhase3Checklist — deprecated alias ─────────────────────────────

describe("ChecklistEngine.initializePhase3Checklist — deprecated alias", () => {
  it("delegates to initializeChecklistItems and creates items with phaseNumber=3 (flag OFF)", async () => {
    setFlag(false);
    prismaMock.trip.findFirst.mockResolvedValue(mockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({ count: 7 } as never);

    await ChecklistEngine.initializePhase3Checklist(TRIP_ID, USER_ID, "international", null);

    const call = prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = call!.data as Array<{ phaseNumber: number }>;
    expect(data.every((d) => d.phaseNumber === 3)).toBe(true);
  });

  it("when flag is ON, alias follows the flag and uses phaseNumber=6", async () => {
    // The deprecated alias fully delegates — it too uses phase 6 when flag ON.
    // This is intentional: callers that haven't migrated get the correct behavior.
    setFlag(true);
    prismaMock.trip.findFirst.mockResolvedValue(mockTrip() as never);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);
    prismaMock.phaseChecklistItem.createMany.mockResolvedValue({ count: 7 } as never);

    await ChecklistEngine.initializePhase3Checklist(TRIP_ID, USER_ID, "international", null);

    const call = prismaMock.phaseChecklistItem.createMany.mock.calls[0]![0];
    const data = call!.data as Array<{ phaseNumber: number }>;
    expect(data.every((d) => d.phaseNumber === 6)).toBe(true);
  });
});

// ─── getChecklistItems — semantic wrapper (flag-aware) ────────────────────────

describe("ChecklistEngine.getChecklistItems", () => {
  it("queries phaseNumber=3 when flag is OFF", async () => {
    setFlag(false);
    prismaMock.phaseChecklistItem.findMany.mockResolvedValue([] as never);

    await ChecklistEngine.getChecklistItems(TRIP_ID);

    expect(prismaMock.phaseChecklistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phaseNumber: 3 }) })
    );
  });

  it("queries phaseNumber=6 when flag is ON", async () => {
    setFlag(true);
    prismaMock.phaseChecklistItem.findMany.mockResolvedValue([] as never);

    await ChecklistEngine.getChecklistItems(TRIP_ID);

    expect(prismaMock.phaseChecklistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phaseNumber: 6 }) })
    );
  });
});

// ─── isChecklistComplete — semantic wrapper (flag-aware) ─────────────────────

describe("ChecklistEngine.isChecklistComplete", () => {
  it("checks phaseNumber=3 when flag is OFF", async () => {
    setFlag(false);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    await ChecklistEngine.isChecklistComplete(TRIP_ID);

    expect(prismaMock.phaseChecklistItem.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phaseNumber: 3 }) })
    );
  });

  it("checks phaseNumber=6 when flag is ON", async () => {
    setFlag(true);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    await ChecklistEngine.isChecklistComplete(TRIP_ID);

    expect(prismaMock.phaseChecklistItem.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phaseNumber: 6 }) })
    );
  });

  it("returns true when no required incomplete items (flag-agnostic completion logic)", async () => {
    setFlag(true);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(0 as never);

    const result = await ChecklistEngine.isChecklistComplete(TRIP_ID);
    expect(result).toBe(true);
  });

  it("returns false when required incomplete items exist (flag-agnostic completion logic)", async () => {
    setFlag(false);
    prismaMock.phaseChecklistItem.count.mockResolvedValue(2 as never);

    const result = await ChecklistEngine.isChecklistComplete(TRIP_ID);
    expect(result).toBe(false);
  });
});
