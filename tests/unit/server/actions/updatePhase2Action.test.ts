/**
 * Unit tests for updatePhase2Action (TASK-S32-003).
 *
 * Verifies:
 * - BOLA check (trip belongs to user)
 * - Zod validation of Phase2 input
 * - Updates trip data without calling PhaseEngine.completePhase
 * - Does NOT award points or badges
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  updateSession: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn(),
    awardBadge: vi.fn(),
    initializeProgress: vi.fn(),
  },
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: {
    completePhase: vi.fn(),
    initializeExpedition: vi.fn(),
  },
}));

vi.mock("@/lib/engines/checklist-engine", () => ({
  ChecklistEngine: { toggleItem: vi.fn() },
}));

vi.mock("@/server/services/expedition.service", () => ({
  ExpeditionService: {
    createExpedition: vi.fn(),
    completePhase2: vi.fn(),
  },
}));

vi.mock("@/server/services/profile.service", () => ({
  ProfileService: {
    saveAndAwardProfileFields: vi.fn(),
    recalculateCompletionScore: vi.fn(),
  },
}));

vi.mock("@/server/services/expedition-summary.service", () => ({
  ExpeditionSummaryService: { getExpeditionSummary: vi.fn() },
}));

vi.mock("@/server/services/phase-completion.service", () => ({
  PhaseCompletionService: {
    checkAndCompleteTrip: vi.fn().mockResolvedValue(false),
    syncPhaseStatus: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock("@/server/services/ai.service", () => ({
  AiService: { generateDestinationGuide: vi.fn() },
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue("international"),
}));

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: vi.fn((s: string) => s),
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: vi.fn((s: string) => ({ masked: s, maskMap: {} })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ─── Import SUT after mocks ──────────────────────────────────────────────────

import { updatePhase2Action } from "@/server/actions/expedition.actions";
import { db } from "@/server/db";
import { PhaseEngine } from "@/lib/engines/phase-engine";
import { PointsEngine } from "@/lib/engines/points-engine";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-update-001";
const USER_ID = "user-update-001";

const VALID_PHASE2_INPUT = {
  travelerType: "solo" as const,
  accommodationStyle: "comfort" as const,
  travelPace: 5,
  budget: 3000,
  currency: "USD" as const,
};

function setupAuth(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("updatePhase2Action (TASK-S32-003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when trip does not belong to user (BOLA)", async () => {
    setupAuth(USER_ID);
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    const result = await updatePhase2Action(TRIP_ID, VALID_PHASE2_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBe("errors.tripNotFound");
  });

  it("returns error for invalid input (Zod validation)", async () => {
    setupAuth(USER_ID);
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);

    const result = await updatePhase2Action(TRIP_ID, {
      travelerType: "invalid" as "solo",
      accommodationStyle: "comfort",
      travelPace: 5,
      budget: 3000,
      currency: "USD",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("updates phase metadata without calling PhaseEngine.completePhase", async () => {
    setupAuth(USER_ID);
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.expeditionPhase.updateMany.mockResolvedValue({ count: 1 } as never);

    const result = await updatePhase2Action(TRIP_ID, VALID_PHASE2_INPUT);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ tripId: TRIP_ID });

    // Verify PhaseEngine.completePhase was NOT called
    expect(PhaseEngine.completePhase).not.toHaveBeenCalled();

    // Verify no points were awarded
    expect(PointsEngine.earnPoints).not.toHaveBeenCalled();
    expect(PointsEngine.awardBadge).not.toHaveBeenCalled();
  });

  it("updates expedition phase metadata with correct data", async () => {
    setupAuth(USER_ID);
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.expeditionPhase.updateMany.mockResolvedValue({ count: 1 } as never);

    await updatePhase2Action(TRIP_ID, VALID_PHASE2_INPUT);

    expect(prismaMock.expeditionPhase.updateMany).toHaveBeenCalledWith({
      where: { tripId: TRIP_ID, phaseNumber: 2 },
      data: {
        metadata: {
          travelerType: "solo",
          accommodationStyle: "comfort",
          travelPace: 5,
          budget: 3000,
          currency: "USD",
        },
      },
    });
  });

  it("saves passengers to Trip when provided", async () => {
    setupAuth(USER_ID);
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.trip.update.mockResolvedValue({} as never);
    prismaMock.expeditionPhase.updateMany.mockResolvedValue({ count: 1 } as never);

    const inputWithPassengers = {
      ...VALID_PHASE2_INPUT,
      travelerType: "family" as const,
      travelers: 4,
      passengers: {
        adults: 2,
        children: { count: 2, ages: [5, 8] },
        seniors: 0,
        infants: 0,
      },
    };

    await updatePhase2Action(TRIP_ID, inputWithPassengers);

    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: TRIP_ID },
      data: { passengers: expect.any(Object) },
    });
  });

  it("throws UnauthorizedError when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      updatePhase2Action(TRIP_ID, VALID_PHASE2_INPUT)
    ).rejects.toThrow();
  });
});
