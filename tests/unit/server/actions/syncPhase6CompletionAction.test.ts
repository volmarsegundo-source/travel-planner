/**
 * Unit tests for syncPhase6CompletionAction (TASK-S32-008).
 *
 * Verifies:
 * - Returns not-completed when no itinerary days exist
 * - Completes Phase 6 via PhaseEngine when itinerary exists and phase not completed
 * - Checks expedition completion after Phase 6 is done
 * - BOLA check for trip ownership
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockAuth, mockCompletePhase, mockCheckAndCompleteTrip } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCompletePhase: vi.fn(),
  mockCheckAndCompleteTrip: vi.fn(),
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
    completePhase: mockCompletePhase,
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
    checkAndCompleteTrip: mockCheckAndCompleteTrip,
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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { syncPhase6CompletionAction } from "@/server/actions/expedition.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-phase6-001";
const USER_ID = "user-phase6-001";

function setupAuth(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("syncPhase6CompletionAction (TASK-S32-008)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth(USER_ID);
  });

  it("returns error when trip does not belong to user (BOLA)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    const result = await syncPhase6CompletionAction(TRIP_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("errors.tripNotFound");
  });

  it("returns not-completed when no itinerary days exist", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.itineraryDay.count.mockResolvedValue(0 as never);

    const result = await syncPhase6CompletionAction(TRIP_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ completed: false, tripCompleted: false });
    expect(mockCompletePhase).not.toHaveBeenCalled();
  });

  it("completes Phase 6 when itinerary exists and phase is active", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.itineraryDay.count.mockResolvedValue(5 as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-6",
      tripId: TRIP_ID,
      phaseNumber: 6,
      status: "active",
    } as never);

    mockCompletePhase.mockResolvedValue({
      phaseNumber: 6,
      pointsEarned: 300,
      badgeAwarded: null,
      newRank: null,
      nextPhaseUnlocked: null,
    });
    mockCheckAndCompleteTrip.mockResolvedValue(true);

    const result = await syncPhase6CompletionAction(TRIP_ID);

    expect(result.success).toBe(true);
    expect(result.data!.completed).toBe(true);
    expect(result.data!.tripCompleted).toBe(true);
    expect(mockCompletePhase).toHaveBeenCalledWith(TRIP_ID, USER_ID, 6);
    expect(mockCheckAndCompleteTrip).toHaveBeenCalledWith(TRIP_ID, USER_ID);
  });

  it("skips Phase 6 completion when already completed", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.itineraryDay.count.mockResolvedValue(5 as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-6",
      tripId: TRIP_ID,
      phaseNumber: 6,
      status: "completed",
    } as never);
    mockCheckAndCompleteTrip.mockResolvedValue(false);

    const result = await syncPhase6CompletionAction(TRIP_ID);

    expect(result.success).toBe(true);
    expect(result.data!.completed).toBe(true);
    expect(mockCompletePhase).not.toHaveBeenCalled();
  });

  it("handles PhaseEngine.completePhase failure gracefully", async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.itineraryDay.count.mockResolvedValue(5 as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-6",
      tripId: TRIP_ID,
      phaseNumber: 6,
      status: "active",
    } as never);

    mockCompletePhase.mockRejectedValue(new Error("Phase not active"));
    mockCheckAndCompleteTrip.mockResolvedValue(false);

    const result = await syncPhase6CompletionAction(TRIP_ID);

    // Should not fail -- gracefully handles the error
    expect(result.success).toBe(true);
    expect(result.data!.completed).toBe(false);
    expect(result.data!.tripCompleted).toBe(false);
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(syncPhase6CompletionAction(TRIP_ID)).rejects.toThrow();
  });
});
