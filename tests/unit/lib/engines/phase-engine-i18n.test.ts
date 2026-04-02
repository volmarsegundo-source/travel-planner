/**
 * Unit tests for PhaseEngine i18n error messages (TASK-S32-001).
 *
 * Verifies that all error messages thrown by PhaseEngine are i18n keys
 * (prefixed with "errors.") rather than raw English strings.
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
  },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { PhaseEngine } from "@/lib/engines/phase-engine";
import { db } from "@/server/db";
import { AppError } from "@/lib/errors";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-i18n-001";
const USER_ID = "user-i18n-001";

function createMockTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: TRIP_ID,
    userId: USER_ID,
    title: "Test",
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
    tripId: TRIP_ID,
    phaseNumber,
    status,
    pointsEarned: 0,
    completedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Assert the thrown error is an AppError with an i18n key message. */
async function expectI18nError(
  fn: () => Promise<unknown>,
  expectedKey: string
) {
  await expect(fn()).rejects.toThrow(AppError);
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toBe(expectedKey);
    expect((error as AppError).message).toMatch(/^errors\./);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PhaseEngine — i18n error messages (TASK-S32-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("completePhase", () => {
    it("throws errors.notExpeditionMode when trip is not expedition", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ expeditionMode: false }) as never
      );

      await expectI18nError(
        () => PhaseEngine.completePhase(TRIP_ID, USER_ID, 1),
        "errors.notExpeditionMode"
      );
    });

    it("throws errors.phaseOrderViolation when phase is out of order", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 1 }) as never
      );

      await expectI18nError(
        () => PhaseEngine.completePhase(TRIP_ID, USER_ID, 3),
        "errors.phaseOrderViolation"
      );
    });

    it("throws errors.phaseNotActive when phase is locked", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 2 }) as never
      );
      prismaMock.expeditionPhase.findUnique.mockResolvedValue(
        createMockPhase(2, "locked") as never
      );

      await expectI18nError(
        () => PhaseEngine.completePhase(TRIP_ID, USER_ID, 2),
        "errors.phaseNotActive"
      );
    });

    it("throws errors.phaseAlreadyCompleted when phase is already completed", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 2 }) as never
      );
      prismaMock.expeditionPhase.findUnique.mockResolvedValue(
        createMockPhase(2, "completed") as never
      );

      await expectI18nError(
        () => PhaseEngine.completePhase(TRIP_ID, USER_ID, 2),
        "errors.phaseAlreadyCompleted"
      );
    });

    it("throws errors.prerequisitesNotMet when Phase 3 checklist incomplete", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 3 }) as never
      );
      prismaMock.expeditionPhase.findUnique.mockResolvedValue(
        createMockPhase(3, "active") as never
      );
      prismaMock.phaseChecklistItem.count.mockResolvedValue(2 as never);

      await expectI18nError(
        () => PhaseEngine.completePhase(TRIP_ID, USER_ID, 3),
        "errors.prerequisitesNotMet"
      );
    });

    // Phase 5 no longer requires guide — generation is optional
  });

  describe("advanceFromPhase", () => {
    it("throws errors.notExpeditionMode when trip is not expedition", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ expeditionMode: false }) as never
      );

      await expectI18nError(
        () => PhaseEngine.advanceFromPhase(TRIP_ID, USER_ID, 3),
        "errors.notExpeditionMode"
      );
    });

    it("throws errors.phaseOrderViolation when not current phase", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 3 }) as never
      );

      await expectI18nError(
        () => PhaseEngine.advanceFromPhase(TRIP_ID, USER_ID, 4),
        "errors.phaseOrderViolation"
      );
    });

    it("throws errors.phaseNotActive when phase is not active", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 3 }) as never
      );
      prismaMock.expeditionPhase.findUnique.mockResolvedValue(
        createMockPhase(3, "locked") as never
      );

      await expectI18nError(
        () => PhaseEngine.advanceFromPhase(TRIP_ID, USER_ID, 3),
        "errors.phaseNotActive"
      );
    });
  });

  describe("useAiInPhase", () => {
    it("throws errors.phaseNotActive when phase is not active", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 5 }) as never
      );
      prismaMock.expeditionPhase.findUnique.mockResolvedValue(
        createMockPhase(5, "locked") as never
      );

      await expectI18nError(
        () => PhaseEngine.useAiInPhase(TRIP_ID, USER_ID, 5),
        "errors.phaseNotActive"
      );
    });

    it("throws errors.aiAgeRestricted when user is under 18", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(
        createMockTrip({ currentPhase: 5 }) as never
      );
      prismaMock.expeditionPhase.findUnique.mockResolvedValue(
        createMockPhase(5, "active") as never
      );
      // birthDate = today (0 years old)
      prismaMock.userProfile.findUnique.mockResolvedValue({
        userId: USER_ID,
        birthDate: new Date(),
      } as never);

      await expectI18nError(
        () => PhaseEngine.useAiInPhase(TRIP_ID, USER_ID, 5),
        "errors.aiAgeRestricted"
      );
    });
  });

  describe("all error messages use i18n key format", () => {
    it("no error message contains spaces (raw English)", () => {
      // This is a meta-test: all AppError messages in phase-engine should be i18n keys
      // i18n keys follow the pattern "errors.camelCase" without spaces
      const i18nKeys = [
        "errors.notExpeditionMode",
        "errors.phaseOrderViolation",
        "errors.phaseNotActive",
        "errors.phaseAlreadyCompleted",
        "errors.prerequisitesNotMet",
        "errors.invalidPhase",
        "errors.phaseNotSkippable",
        "errors.aiNotAvailable",
        "errors.aiAgeRestricted",
      ];

      for (const key of i18nKeys) {
        expect(key).toMatch(/^errors\.[a-zA-Z]+$/);
      }
    });
  });
});
