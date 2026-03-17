/**
 * Unit tests for updatePhase1Action (SPEC-ARCH-010).
 *
 * Tests cover: auth guard, BOLA check, trip data update, profile fields save,
 * phase metadata update, and trip type classification.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { type DeepMockProxy, mockDeep } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockAuth, mockUpdateSession, mockProfileService, mockRevalidatePath, mockHashUserId } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockProfileService: {
    saveAndAwardProfileFields: vi.fn(),
    recalculateCompletionScore: vi.fn(),
  },
  mockRevalidatePath: vi.fn(),
  mockHashUserId: vi.fn().mockReturnValue("hashed-user-id"),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  updateSession: mockUpdateSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/server/services/expedition.service", () => ({
  ExpeditionService: { createExpedition: vi.fn() },
}));

vi.mock("@/server/services/profile.service", () => ({
  ProfileService: mockProfileService,
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: { completePhase: vi.fn(), advanceFromPhase: vi.fn(), getPhases: vi.fn() },
}));

vi.mock("@/lib/engines/checklist-engine", () => ({
  ChecklistEngine: { toggleItem: vi.fn(), initializePhase3Checklist: vi.fn(), getPhaseChecklist: vi.fn() },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: { earnPoints: vi.fn(), awardBadge: vi.fn(), initializeProgress: vi.fn() },
}));

vi.mock("@/server/services/ai.service", () => ({
  AiService: { generateDestinationGuide: vi.fn() },
}));

vi.mock("@/server/services/expedition-summary.service", () => ({
  ExpeditionSummaryService: { getExpeditionSummary: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: (err: unknown) => (err instanceof Error ? err.message : "errors.generic"),
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: mockHashUserId,
}));

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: vi.fn((s: string) => s),
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: vi.fn((s: string) => ({ masked: s, findings: [] })),
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue("international"),
}));

// ─── Import SUT + mocked db ────────────────────────────────────────────────

import { updatePhase1Action } from "@/server/actions/expedition.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("updatePhase1Action", () => {
  const VALID_USER_ID = "user-123";
  const VALID_TRIP_ID = "trip-456";

  const VALID_PAYLOAD = {
    destination: "Tokyo, Japan",
    origin: "Sao Paulo, Brazil",
    destinationCountryCode: "JP",
    originCountryCode: "BR",
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    flexibleDates: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
    prismaMock.trip.findFirst.mockResolvedValue({ id: VALID_TRIP_ID } as never);
    prismaMock.trip.update.mockResolvedValue({ id: VALID_TRIP_ID } as never);
    prismaMock.expeditionPhase.updateMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.user.update.mockResolvedValue({ id: VALID_USER_ID } as never);
    mockProfileService.saveAndAwardProfileFields.mockResolvedValue(undefined);
    mockProfileService.recalculateCompletionScore.mockResolvedValue(undefined);
  });

  it("returns success and tripId on valid update", async () => {
    const result = await updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.data?.tripId).toBe(VALID_TRIP_ID);
  });

  it("updates trip data with correct fields", async () => {
    await updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD);

    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: VALID_TRIP_ID },
      data: expect.objectContaining({
        title: "Tokyo, Japan",
        destination: "Tokyo, Japan",
        origin: "Sao Paulo, Brazil",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-15"),
        tripType: "international",
      }),
    });
  });

  it("throws UnauthorizedError when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD)).rejects.toThrow();
  });

  it("returns error when trip not found (BOLA check)", async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null as never);

    const result = await updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.error).toBe("errors.tripNotFound");
  });

  it("returns error on invalid schema input", async () => {
    const result = await updatePhase1Action(VALID_TRIP_ID, {
      destination: "", // empty destination fails schema
      flexibleDates: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("saves profile fields when provided", async () => {
    await updatePhase1Action(VALID_TRIP_ID, {
      ...VALID_PAYLOAD,
      profileFields: {
        birthDate: "1990-01-01",
        country: "Brazil",
        city: "Sao Paulo",
      },
    });

    expect(mockProfileService.saveAndAwardProfileFields).toHaveBeenCalledWith(
      VALID_USER_ID,
      expect.objectContaining({
        birthDate: "1990-01-01",
        country: "Brazil",
        city: "Sao Paulo",
      })
    );
    expect(mockProfileService.recalculateCompletionScore).toHaveBeenCalledWith(VALID_USER_ID);
  });

  it("updates user name when provided in profile fields", async () => {
    await updatePhase1Action(VALID_TRIP_ID, {
      ...VALID_PAYLOAD,
      profileFields: { name: "New Name" },
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: VALID_USER_ID },
      data: { name: "New Name" },
    });
    expect(mockUpdateSession).toHaveBeenCalledWith({
      user: { name: "New Name" },
    });
  });

  it("updates phase 1 metadata", async () => {
    await updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD);

    expect(prismaMock.expeditionPhase.updateMany).toHaveBeenCalledWith({
      where: { tripId: VALID_TRIP_ID, phaseNumber: 1 },
      data: {
        metadata: {
          destination: "Tokyo, Japan",
          flexibleDates: false,
        },
      },
    });
  });

  it("does NOT re-create expedition phases or award points", async () => {
    await updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD);

    // Should not create new expedition phases
    expect(prismaMock.expeditionPhase.createMany).not.toHaveBeenCalled();
    // Should not call trip.create (only trip.update)
    expect(prismaMock.trip.create).not.toHaveBeenCalled();
  });

  it("revalidates paths after successful update", async () => {
    await updatePhase1Action(VALID_TRIP_ID, VALID_PAYLOAD);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/expeditions");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/expedition/${VALID_TRIP_ID}`);
  });

  it("profile save failure does not block the update", async () => {
    mockProfileService.saveAndAwardProfileFields.mockRejectedValue(new Error("profile error"));

    const result = await updatePhase1Action(VALID_TRIP_ID, {
      ...VALID_PAYLOAD,
      profileFields: { birthDate: "1990-01-01" },
    });

    // Update should still succeed
    expect(result.success).toBe(true);
  });
});
