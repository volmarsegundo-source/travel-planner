/**
 * Unit tests for AI provider factory (TASK-S41-037).
 *
 * Tests cover:
 * - getProvider() with AI_PROVIDER=anthropic returns ClaudeProvider
 * - getProvider() with AI_PROVIDER=gemini returns GeminiProvider
 * - getProvider() default (no env) returns ClaudeProvider (backward compat)
 * - getModelIdForType() returns correct model IDs per provider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
}));

vi.mock("@/server/cache/keys", () => ({
  CacheKeys: {
    aiPlan: (hash: string) => `cache:ai:plan:${hash}`,
    aiChecklist: (hash: string) => `cache:ai:checklist:${hash}`,
    aiGuide: (hash: string) => `cache:ai:guide:${hash}`,
  },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: (id: string) => `hashed_${id}`,
}));

vi.mock("@/lib/cost-calculator", () => ({
  calculateEstimatedCost: vi.fn().mockReturnValue({
    inputCost: 0,
    outputCost: 0,
    cacheSavings: 0,
    totalCost: 0,
  }),
}));

vi.mock("@/lib/prompts", () => ({
  travelPlanPrompt: { buildUserPrompt: vi.fn(), model: "plan", system: "", maxTokens: 2048 },
  checklistPrompt: { buildUserPrompt: vi.fn(), model: "checklist", system: "", maxTokens: 1024 },
  destinationGuidePrompt: { buildUserPrompt: vi.fn(), model: "guide", system: "", maxTokens: 4096 },
}));

// We need to test the exported functions from ai.service.ts
// The factory is internal, so we test via getProviderForTest (we'll export it for testing)
// Actually, we should test the behavior indirectly via the model map and provider name

describe("AI Provider Factory", () => {
  const originalProvider = process.env.AI_PROVIDER;

  afterEach(() => {
    if (originalProvider !== undefined) {
      process.env.AI_PROVIDER = originalProvider;
    } else {
      delete process.env.AI_PROVIDER;
    }
    vi.resetModules();
  });

  it("returns ClaudeProvider when AI_PROVIDER is 'anthropic'", async () => {
    process.env.AI_PROVIDER = "anthropic";
    vi.resetModules();

    const { getProvider } = await import("@/server/services/ai.service");
    const provider = getProvider();
    expect(provider.name).toBe("claude");
  });

  it("returns GeminiProvider when AI_PROVIDER is 'gemini'", async () => {
    process.env.AI_PROVIDER = "gemini";
    vi.resetModules();

    const { getProvider } = await import("@/server/services/ai.service");
    const provider = getProvider();
    expect(provider.name).toBe("gemini");
  });

  it("returns ClaudeProvider by default when AI_PROVIDER is not set (backward compatible)", async () => {
    delete process.env.AI_PROVIDER;
    vi.resetModules();

    const { getProvider } = await import("@/server/services/ai.service");
    const provider = getProvider();
    expect(provider.name).toBe("claude");
  });

  it("returns correct model ID for anthropic provider", async () => {
    process.env.AI_PROVIDER = "anthropic";
    vi.resetModules();

    const { getModelIdForType } = await import("@/server/services/ai.service");
    expect(getModelIdForType("plan")).toBe("claude-haiku-4-5-20251001");
    expect(getModelIdForType("checklist")).toBe("claude-haiku-4-5-20251001");
    expect(getModelIdForType("guide")).toBe("claude-haiku-4-5-20251001");
  });

  it("returns correct model ID for gemini provider", async () => {
    process.env.AI_PROVIDER = "gemini";
    vi.resetModules();

    const { getModelIdForType } = await import("@/server/services/ai.service");
    expect(getModelIdForType("plan")).toBe("gemini-2.0-flash");
    expect(getModelIdForType("checklist")).toBe("gemini-2.0-flash");
    expect(getModelIdForType("guide")).toBe("gemini-2.0-flash");
  });
});
