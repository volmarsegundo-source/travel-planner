/**
 * Unit tests for BOLA (Broken Object Level Authorization) fixes
 * in completePhase4Action and advanceFromPhaseAction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist mock functions ─────────────────────────────────────────────────────

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import {
  completePhase4Action,
  advanceFromPhaseAction,
  viewGuideSectionAction,
} from "@/server/actions/expedition.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BOLA ownership checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  describe("completePhase4Action", () => {
    it("rejects when trip does not belong to user", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      const result = await completePhase4Action("trip-other-user", {
        needsCarRental: false,
        cnhResolved: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("errors.tripNotFound");
    });

    it("proceeds when trip belongs to user", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as any);
      prismaMock.expeditionPhase.findUnique.mockResolvedValue({
        id: "phase-4",
        tripId: "trip-1",
        phaseNumber: 4,
      } as any);
      prismaMock.expeditionPhase.update.mockResolvedValue({} as any);

      const { PhaseEngine } = await import("@/lib/engines/phase-engine");
      (PhaseEngine.completePhase as ReturnType<typeof vi.fn>).mockResolvedValue({
        phaseNumber: 4,
        pointsEarned: 200,
        badgeAwarded: null,
        newRank: null,
        nextPhaseUnlocked: 5,
      });

      const result = await completePhase4Action("trip-1", {
        needsCarRental: false,
        cnhResolved: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("viewGuideSectionAction", () => {
    it("rejects when trip does not belong to user", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      const result = await viewGuideSectionAction("trip-other-user", "timezone");

      expect(result.success).toBe(false);
      expect(result.error).toBe("errors.tripNotFound");
    });

    it("proceeds when trip belongs to user and guide exists", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as any);
      prismaMock.destinationGuide.findUnique.mockResolvedValue({
        tripId: "trip-1",
        viewedSections: [],
      } as any);
      prismaMock.destinationGuide.update.mockResolvedValue({} as any);

      const { PointsEngine } = await import("@/lib/engines/points-engine");
      (PointsEngine.earnPoints as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await viewGuideSectionAction("trip-1", "timezone");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ pointsAwarded: 5 });
    });
  });

  describe("advanceFromPhaseAction", () => {
    it("rejects when trip does not belong to user", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      const result = await advanceFromPhaseAction("trip-other-user", 3);

      expect(result.success).toBe(false);
      expect(result.error).toBe("errors.tripNotFound");
    });

    it("proceeds when trip belongs to user", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as any);

      // Phase 3: check required checklist items
      prismaMock.phaseChecklistItem.count.mockResolvedValue(0);

      const { PhaseEngine } = await import("@/lib/engines/phase-engine");
      (PhaseEngine.completePhase as ReturnType<typeof vi.fn>).mockResolvedValue({
        phaseNumber: 3,
        pointsEarned: 200,
        badgeAwarded: null,
        newRank: null,
        nextPhaseUnlocked: 4,
      });

      const result = await advanceFromPhaseAction("trip-1", 3);

      expect(result.success).toBe(true);
    });
  });
});
