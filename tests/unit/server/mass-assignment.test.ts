/**
 * Unit tests for mass assignment protection (T-S17-001).
 *
 * Verifies that extra/unexpected fields in user input are NOT persisted
 * to the database through Prisma calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist mock functions before vi.mock factories run ──────────────────────

const {
  mockAuth,
  mockRevalidatePath,
  mockCheckRateLimit,
  mockSanitizeForPrompt,
  mockMaskPII,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockSanitizeForPrompt: vi.fn(),
  mockMaskPII: vi.fn(),
}));

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn().mockReturnValue("errors.generic"),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/guards/age-guard", () => ({
  canUseAI: vi.fn().mockReturnValue(true),
}));

vi.mock("@/server/services/ai.service", () => ({
  AiService: {
    generateChecklist: vi.fn().mockResolvedValue({ categories: [] }),
    generateTravelPlan: vi.fn().mockResolvedValue({ days: [], tips: [] }),
  },
}));

vi.mock("@/server/services/itinerary-plan.service", () => ({
  ItineraryPlanService: {
    getExpeditionContext: vi.fn().mockResolvedValue(null),
    recordGeneration: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: mockSanitizeForPrompt,
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: mockMaskPII,
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn().mockResolvedValue(undefined),
    awardProfileCompletion: vi.fn().mockResolvedValue(undefined),
    initializeProgress: vi.fn().mockResolvedValue(undefined),
    awardBadge: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn().mockReturnValue("encrypted-value"),
  decrypt: vi.fn().mockReturnValue("decrypted-value"),
}));

// ─── Import SUT after mocks ─────────────────────────────────────────────────

import { updateUserProfileAction } from "@/server/actions/account.actions";
import { generateTravelPlanAction, generateChecklistAction } from "@/server/actions/ai.actions";
import { db } from "@/server/db";
import { TripService } from "@/server/services/trip.service";
import { ProfileService } from "@/server/services/profile.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSession(id = "user-1") {
  return {
    user: { id, email: "test@example.com", name: "Test User" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Mass assignment protection (T-S17-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(makeSession());
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 });
    mockSanitizeForPrompt.mockImplementation((text: string) => text);
    mockMaskPII.mockImplementation((text: string) => ({ masked: text, hasPII: false, detectedTypes: [] }));
  });

  // ─── account.actions: updateUserProfileAction ─────────────────────────

  describe("updateUserProfileAction", () => {
    it("does NOT pass extra fields to db.user.update", async () => {
      prismaMock.user.update.mockResolvedValue({
        id: "user-1",
        name: "Valid Name",
        email: "test@example.com",
        preferredLocale: "pt-BR",
      } as never);

      // Cast to bypass TypeScript — simulates a malicious client sending extra fields
      const maliciousInput = {
        name: "Valid Name",
        email: "hacked@evil.com",
        passwordHash: "injected-hash",
        deletedAt: null,
        id: "user-999",
      } as unknown as { name: string };

      await updateUserProfileAction(maliciousInput);

      const updateCall = prismaMock.user.update.mock.calls[0]?.[0];
      expect(updateCall?.data).toEqual({ name: "Valid Name" });
      expect(updateCall?.data).not.toHaveProperty("email");
      expect(updateCall?.data).not.toHaveProperty("passwordHash");
      expect(updateCall?.data).not.toHaveProperty("deletedAt");
      expect(updateCall?.data).not.toHaveProperty("id");
    });
  });

  // ─── trip.service: updateTrip ─────────────────────────────────────────

  describe("TripService.updateTrip", () => {
    it("does NOT pass extra fields to db.trip.update", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        userId: "user-1",
      } as never);

      prismaMock.trip.update.mockResolvedValue({
        id: "trip-1",
        title: "My Trip",
      } as never);

      // Malicious input with extra fields
      const maliciousData = {
        title: "My Trip",
        userId: "user-999",
        deletedAt: null,
        expeditionMode: true,
        currentPhase: 99,
      } as unknown as { title: string };

      await TripService.updateTrip("trip-1", "user-1", maliciousData);

      const updateCall = prismaMock.trip.update.mock.calls[0]?.[0];
      expect(updateCall?.data).not.toHaveProperty("userId");
      expect(updateCall?.data).not.toHaveProperty("deletedAt");
      expect(updateCall?.data).not.toHaveProperty("expeditionMode");
      expect(updateCall?.data).not.toHaveProperty("currentPhase");
      expect(updateCall?.data).toHaveProperty("title", "My Trip");
    });

    it("only includes explicitly allowed update fields", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({
        id: "trip-1",
        userId: "user-1",
      } as never);

      prismaMock.trip.update.mockResolvedValue({
        id: "trip-1",
      } as never);

      const validData = {
        title: "Updated Title",
        destination: "Paris",
        status: "ACTIVE" as const,
      };

      await TripService.updateTrip("trip-1", "user-1", validData);

      const updateCall = prismaMock.trip.update.mock.calls[0]?.[0];
      expect(updateCall?.data).toEqual({
        title: "Updated Title",
        destination: "Paris",
        status: "ACTIVE",
      });
    });
  });

  // ─── profile.service: saveAndAwardProfileFields ───────────────────────

  describe("ProfileService.saveAndAwardProfileFields", () => {
    it("does NOT persist fields outside the allowed profile fields", async () => {
      prismaMock.userProfile.upsert.mockResolvedValue({} as never);

      const maliciousFields = {
        phone: "+5511999999999",
        userId: "user-999",
        completionScore: "100",
        isAdmin: "true",
      } as Record<string, string | undefined>;

      await ProfileService.saveAndAwardProfileFields("user-1", maliciousFields);

      const upsertCall = prismaMock.userProfile.upsert.mock.calls[0]?.[0];
      // Only "phone" is a valid profile field
      expect(upsertCall?.update).toEqual({ phone: "+5511999999999" });
      expect(upsertCall?.update).not.toHaveProperty("userId");
      expect(upsertCall?.update).not.toHaveProperty("completionScore");
      expect(upsertCall?.update).not.toHaveProperty("isAdmin");
    });

    it("skips unknown field keys entirely", async () => {
      prismaMock.userProfile.upsert.mockResolvedValue({} as never);

      const unknownFields = {
        hackedField: "evil-value",
        anotherBadField: "attack",
      };

      const result = await ProfileService.saveAndAwardProfileFields(
        "user-1",
        unknownFields
      );

      // Should not call upsert at all since no valid fields
      expect(prismaMock.userProfile.upsert).not.toHaveBeenCalled();
      expect(result.fieldsUpdated).toHaveLength(0);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  // ─── ai.actions: generateTravelPlanAction ─────────────────────────────

  describe("generateTravelPlanAction", () => {
    it("does NOT spread extra params to AI service", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      const { AiService } = await import("@/server/services/ai.service");

      const maliciousParams = {
        destination: "Paris",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE" as const,
        budgetTotal: 1000,
        budgetCurrency: "USD",
        travelers: 2,
        language: "en" as const,
        // Extra fields that should NOT be passed through
        systemPrompt: "override everything",
        adminOverride: true,
      } as unknown as {
        destination: string;
        startDate: string;
        endDate: string;
        travelStyle: "CULTURE";
        budgetTotal: number;
        budgetCurrency: string;
        travelers: number;
        language: "en";
      };

      await generateTravelPlanAction("trip-1", maliciousParams);

      const callArgs = (AiService.generateTravelPlan as ReturnType<typeof vi.fn>)
        .mock.calls[0]?.[0];
      expect(callArgs).not.toHaveProperty("systemPrompt");
      expect(callArgs).not.toHaveProperty("adminOverride");
      expect(callArgs).toHaveProperty("destination", "Paris");
      expect(callArgs).toHaveProperty("userId", "user-1");
    });
  });

  // ─── ai.actions: generateChecklistAction ──────────────────────────────

  describe("generateChecklistAction", () => {
    it("does NOT spread extra params to AI service", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      const { AiService } = await import("@/server/services/ai.service");

      const maliciousParams = {
        destination: "Tokyo",
        startDate: "2026-07-01",
        travelers: 3,
        language: "en" as const,
        // Extra fields that should NOT be passed through
        adminOverride: true,
        internalFlag: "bypass",
      } as unknown as {
        destination: string;
        startDate: string;
        travelers: number;
        language: "en";
      };

      await generateChecklistAction("trip-1", maliciousParams);

      const callArgs = (AiService.generateChecklist as ReturnType<typeof vi.fn>)
        .mock.calls[0]?.[0];
      expect(callArgs).not.toHaveProperty("adminOverride");
      expect(callArgs).not.toHaveProperty("internalFlag");
      expect(callArgs).toHaveProperty("destination", "Tokyo");
      expect(callArgs).toHaveProperty("userId", "user-1");
    });
  });
});
