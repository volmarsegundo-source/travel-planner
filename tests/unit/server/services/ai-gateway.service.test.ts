/**
 * Unit tests for AiGatewayService.
 *
 * Tests cover:
 * - Delegates to AiService correctly (plan, checklist, guide)
 * - Writes AiInteractionLog on success
 * - Writes AiInteractionLog on error (with errorCode)
 * - Re-throws the original error from AiService
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

const mockGenerateTravelPlan = vi.fn();
const mockGenerateChecklist = vi.fn();
const mockGenerateDestinationGuide = vi.fn();

vi.mock("@/server/services/ai.service", () => ({
  AiService: {
    generateTravelPlan: (...args: unknown[]) => mockGenerateTravelPlan(...args),
    generateChecklist: (...args: unknown[]) => mockGenerateChecklist(...args),
    generateDestinationGuide: (...args: unknown[]) =>
      mockGenerateDestinationGuide(...args),
  },
}));

vi.mock("@/server/services/prompt-registry.service", () => ({
  PromptRegistryService: {
    getTemplate: vi.fn().mockResolvedValue({
      slug: "travel-plan",
      version: "1.1.0",
      modelType: "plan",
      systemPrompt: "test",
      maxTokens: 2048,
      cacheControl: true,
      source: "inline",
    }),
  },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn().mockReturnValue("hashed-user-id"),
}));

import { AiGatewayService } from "@/server/services/ai-gateway.service";
import { db } from "@/server/db";
import type { GeneratePlanParams, GenerateChecklistParams, GenerateGuideParams } from "@/types/ai.types";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: logInteraction succeeds
  prismaMock.aiInteractionLog.create.mockResolvedValue({
    id: "log-1",
    userId: "hashed",
    phase: "plan",
    provider: "claude",
    model: "claude-sonnet-4-6",
    promptSlug: "travel-plan",
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUsd: 0,
    latencyMs: 0,
    status: "success",
    errorCode: null,
    cacheHit: false,
    metadata: null,
    createdAt: new Date(),
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const planParams: GeneratePlanParams = {
  userId: "user-1",
  destination: "Tokyo",
  startDate: "2026-05-01",
  endDate: "2026-05-05",
  travelStyle: "CULTURE",
  budgetTotal: 3000,
  budgetCurrency: "USD",
  travelers: 2,
  language: "en",
};

const checklistParams: GenerateChecklistParams = {
  userId: "user-1",
  destination: "Tokyo",
  startDate: "2026-05-01",
  travelers: 2,
  language: "en",
};

const guideParams: GenerateGuideParams = {
  userId: "user-1",
  destination: "Tokyo",
  language: "en",
};

const fakePlanResult = {
  destination: "Tokyo",
  totalDays: 5,
  estimatedBudgetUsed: 2500,
  currency: "USD",
  days: [],
  tips: [],
};

const fakeChecklistResult = { categories: [] };

const fakeGuideResult = {
  destination: { name: "Tokyo", nickname: "", subtitle: "", overview: ["Great city"] },
  quickFacts: {
    climate: { label: "Climate", value: "Temperate" },
    currency: { label: "Currency", value: "JPY" },
    language: { label: "Language", value: "Japanese" },
    timezone: { label: "Timezone", value: "JST" },
    plugType: { label: "Plug", value: "A/B" },
    dialCode: { label: "Code", value: "+81" },
  },
  safety: { level: "safe", tips: ["Safe city"], emergencyNumbers: { police: "110", ambulance: "119", tourist: null } },
  dailyCosts: { items: [], dailyTotal: { budget: "$50", mid: "$100", premium: "$200" } },
  mustSee: [{ name: "Senso-ji", category: "culture", estimatedTime: "2h", costRange: "Free", description: "Temple" }],
  documentation: { passport: "Required", visa: "90 days", vaccines: "None", insurance: "Recommended" },
  localTransport: { options: ["Train"], tips: ["Get Suica card"] },
  culturalTips: ["Remove shoes indoors"],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AiGatewayService", () => {
  describe("generatePlan", () => {
    it("delegates to AiService.generateTravelPlan and returns wrapped result", async () => {
      mockGenerateTravelPlan.mockResolvedValueOnce(fakePlanResult);

      const result = await AiGatewayService.generatePlan(planParams);

      expect(mockGenerateTravelPlan).toHaveBeenCalledWith(planParams);
      expect(result.data).toEqual(fakePlanResult);
      expect(result.interaction.source).toBe("inline");
      expect(typeof result.interaction.latencyMs).toBe("number");
    });
  });

  describe("generateChecklist", () => {
    it("delegates to AiService.generateChecklist", async () => {
      mockGenerateChecklist.mockResolvedValueOnce(fakeChecklistResult);

      const result = await AiGatewayService.generateChecklist(checklistParams);

      expect(mockGenerateChecklist).toHaveBeenCalledWith(checklistParams);
      expect(result.data).toEqual(fakeChecklistResult);
    });
  });

  describe("generateGuide", () => {
    it("delegates to AiService.generateDestinationGuide", async () => {
      mockGenerateDestinationGuide.mockResolvedValueOnce(fakeGuideResult);

      const result = await AiGatewayService.generateGuide(guideParams);

      expect(mockGenerateDestinationGuide).toHaveBeenCalledWith(guideParams);
      expect(result.data).toEqual(fakeGuideResult);
    });
  });

  describe("interaction logging", () => {
    it("writes AiInteractionLog on success", async () => {
      mockGenerateTravelPlan.mockResolvedValueOnce(fakePlanResult);

      await AiGatewayService.generatePlan(planParams);

      // Fire-and-forget — wait for microtask queue
      await new Promise((r) => setTimeout(r, 50));

      expect(prismaMock.aiInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "hashed-user-id",
          phase: "plan",
          provider: "claude",
          model: "claude-sonnet-4-6",
          promptSlug: "travel-plan",
          status: "success",
        }),
      });
    });

    it("writes AiInteractionLog on error with errorCode", async () => {
      mockGenerateChecklist.mockRejectedValueOnce(
        new Error("AI provider timeout"),
      );

      await expect(
        AiGatewayService.generateChecklist(checklistParams),
      ).rejects.toThrow("AI provider timeout");

      // Fire-and-forget — wait for microtask queue
      await new Promise((r) => setTimeout(r, 50));

      expect(prismaMock.aiInteractionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phase: "checklist",
          status: "error",
          errorCode: "AI provider timeout",
        }),
      });
    });

    it("re-throws the original error from AiService", async () => {
      const originalError = new Error("Rate limit exceeded");
      mockGenerateDestinationGuide.mockRejectedValueOnce(originalError);

      await expect(
        AiGatewayService.generateGuide(guideParams),
      ).rejects.toThrow(originalError);
    });

    it("does not throw if logging itself fails", async () => {
      mockGenerateTravelPlan.mockResolvedValueOnce(fakePlanResult);
      prismaMock.aiInteractionLog.create.mockRejectedValueOnce(
        new Error("DB write failed"),
      );

      // Should not throw despite logging failure
      const result = await AiGatewayService.generatePlan(planParams);
      expect(result.data).toEqual(fakePlanResult);
    });
  });
});
