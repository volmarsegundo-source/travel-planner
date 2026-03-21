/**
 * Regression tests for profile name persistence in createExpeditionAction.
 *
 * Verifies that when a user saves their name via Phase1Wizard, the name is:
 * 1. Persisted to the User model in the database
 * 2. Propagated to the JWT session via updateSession (unstable_update)
 *
 * This prevents the bug where the navbar/UserMenu displays a stale name
 * after the user updates it in the Phase1Wizard profile form.
 *
 * @see TASK-29-001
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist mock functions ─────────────────────────────────────────────────────

const { mockAuth, mockUpdateSession } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUpdateSession: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  updateSession: mockUpdateSession,
}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: {
    completePhase: vi.fn(),
    advanceFromPhase: vi.fn(),
  },
}));

vi.mock("@/lib/engines/checklist-engine", () => ({
  ChecklistEngine: {
    toggleItem: vi.fn(),
  },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn(),
    awardBadge: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn().mockReturnValue("errors.generic"),
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn().mockReturnValue("hashed-user"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

vi.mock("@/server/services/ai.service", () => ({
  AiService: {
    generateDestinationGuide: vi.fn(),
  },
}));

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: vi.fn().mockReturnValue("sanitized"),
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: vi.fn().mockReturnValue({ masked: "masked", findings: [] }),
}));

vi.mock("@/server/services/expedition-summary.service", () => ({
  ExpeditionSummaryService: {
    getExpeditionSummary: vi.fn(),
  },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { createExpeditionAction } from "@/server/actions/expedition.actions";
import { db } from "@/server/db";
import { ExpeditionService } from "@/server/services/expedition.service";
import { ProfileService } from "@/server/services/profile.service";
import { logger } from "@/lib/logger";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
const mockExpeditionService = ExpeditionService as {
  createExpedition: ReturnType<typeof vi.fn>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_SESSION = { user: { id: "user-123", name: "Old Name" } };

const MOCK_PHASE_RESULT = {
  tripId: "trip-abc",
  phaseResult: {
    phaseNumber: 1,
    pointsEarned: 100,
    badgeAwarded: "primeira_viagem",
    newRank: null,
    nextPhaseUnlocked: 2,
  },
};

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    destination: "Tokyo, Japan",
    flexibleDates: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("createExpeditionAction — name persistence (TASK-29-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
    mockUpdateSession.mockResolvedValue(undefined);
    mockExpeditionService.createExpedition.mockResolvedValue(MOCK_PHASE_RESULT);
    (ProfileService.saveAndAwardProfileFields as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (ProfileService.recalculateCompletionScore as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    prismaMock.user.update.mockResolvedValue({} as never);
  });

  it("updates User.name in DB and refreshes JWT session when profileFields.name is provided", async () => {
    const result = await createExpeditionAction(
      validInput({
        profileFields: { name: "Maria Silva", birthDate: "1990-01-15" },
      })
    );

    expect(result.success).toBe(true);

    // Verify name saved to User model
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { name: "Maria Silva" },
    });

    // Verify JWT session refreshed with updated name
    expect(mockUpdateSession).toHaveBeenCalledWith({
      user: { name: "Maria Silva" },
    });

    // Verify updateSession was called exactly once
    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
  });

  it("does NOT call updateSession or update User.name when profileFields.name is absent", async () => {
    const result = await createExpeditionAction(
      validInput({
        profileFields: { birthDate: "1990-01-15", phone: "+5511999998888" },
      })
    );

    expect(result.success).toBe(true);

    // Name should not be updated in DB
    expect(prismaMock.user.update).not.toHaveBeenCalled();

    // Session should not be refreshed for name
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it("still succeeds if updateSession fails (name DB update succeeds but JWT refresh fails)", async () => {
    mockUpdateSession.mockRejectedValue(new Error("Cookie write failed"));

    const result = await createExpeditionAction(
      validInput({
        profileFields: { name: "João Souza" },
      })
    );

    // Expedition creation should still succeed
    expect(result.success).toBe(true);

    // DB update should have been attempted
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { name: "João Souza" },
    });

    // Error should be logged, not thrown
    expect(logger.error).toHaveBeenCalledWith(
      "expedition.name.error",
      expect.any(Error),
      expect.objectContaining({ userId: "hashed-user" })
    );
  });

  it("still succeeds if User.name DB update fails", async () => {
    prismaMock.user.update.mockRejectedValue(new Error("DB constraint violation"));

    const result = await createExpeditionAction(
      validInput({
        profileFields: { name: "Test User" },
      })
    );

    // Expedition creation should still succeed (name error is non-blocking)
    expect(result.success).toBe(true);

    // Error should be logged
    expect(logger.error).toHaveBeenCalledWith(
      "expedition.name.error",
      expect.any(Error),
      expect.objectContaining({ userId: "hashed-user" })
    );

    // updateSession should NOT have been called since DB update failed first
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });
});
