/**
 * Unit tests for PromptRegistryService.
 *
 * Tests cover:
 * - Returns DB template when found (active)
 * - Falls back to inline when DB returns null
 * - Falls back to inline when DB throws an error
 * - Throws for unknown slug with no inline fallback
 * - Caches resolved templates (in-memory TTL)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/prompts/system-prompts", () => ({
  PLAN_SYSTEM_PROMPT: "inline-plan-prompt",
  CHECKLIST_SYSTEM_PROMPT: "inline-checklist-prompt",
  GUIDE_SYSTEM_PROMPT: "inline-guide-prompt",
}));

import { PromptRegistryService } from "@/server/services/prompt-registry.service";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  vi.clearAllMocks();
  PromptRegistryService.clearCache();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("PromptRegistryService", () => {
  describe("getTemplate", () => {
    it("returns DB template when found", async () => {
      prismaMock.promptTemplate.findFirst.mockResolvedValueOnce({
        id: "cuid-1",
        slug: "travel-plan",
        version: "2.0.0",
        modelType: "plan",
        systemPrompt: "db-system-prompt",
        userTemplate: "db-user-template",
        maxTokens: 4096,
        cacheControl: false,
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await PromptRegistryService.getTemplate("travel-plan");

      expect(result).toEqual({
        slug: "travel-plan",
        version: "2.0.0",
        modelType: "plan",
        systemPrompt: "db-system-prompt",
        maxTokens: 4096,
        cacheControl: false,
        source: "db",
      });
      expect(prismaMock.promptTemplate.findFirst).toHaveBeenCalledWith({
        where: { slug: "travel-plan", isActive: true },
      });
    });

    it("falls back to inline when DB returns null", async () => {
      prismaMock.promptTemplate.findFirst.mockResolvedValueOnce(null);

      const result = await PromptRegistryService.getTemplate("travel-plan");

      expect(result.source).toBe("inline");
      expect(result.version).toBe("1.1.0");
      expect(result.systemPrompt).toBe("inline-plan-prompt");
    });

    it("falls back to inline when DB throws", async () => {
      prismaMock.promptTemplate.findFirst.mockRejectedValueOnce(
        new Error("connection refused"),
      );

      const result = await PromptRegistryService.getTemplate("checklist");

      expect(result.source).toBe("inline");
      expect(result.slug).toBe("checklist");
      expect(result.systemPrompt).toBe("inline-checklist-prompt");
    });

    it("throws for unknown slug with no inline fallback", async () => {
      prismaMock.promptTemplate.findFirst.mockResolvedValueOnce(null);

      await expect(
        PromptRegistryService.getTemplate("nonexistent-slug"),
      ).rejects.toThrow("Prompt template not found: nonexistent-slug");
    });

    it("uses cached template on subsequent calls within TTL", async () => {
      prismaMock.promptTemplate.findFirst.mockResolvedValueOnce(null);

      // First call — hits DB, falls back to inline, caches it
      await PromptRegistryService.getTemplate("destination-guide");
      // Second call — should use cache
      const result = await PromptRegistryService.getTemplate("destination-guide");

      expect(result.source).toBe("inline");
      expect(result.slug).toBe("destination-guide");
      // DB should have been called only once
      expect(prismaMock.promptTemplate.findFirst).toHaveBeenCalledTimes(1);
    });

    it("clears cache correctly", async () => {
      prismaMock.promptTemplate.findFirst.mockResolvedValue(null);

      await PromptRegistryService.getTemplate("travel-plan");
      PromptRegistryService.clearCache();
      await PromptRegistryService.getTemplate("travel-plan");

      // DB called twice because cache was cleared
      expect(prismaMock.promptTemplate.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
