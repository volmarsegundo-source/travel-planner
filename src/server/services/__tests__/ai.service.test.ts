import { describe, it, expect, vi, beforeEach } from "vitest";

// Wave 2.8b — AiService branch coverage tests
// Target: ai.service.ts 59% branches → ~80% branches
// Focus: Redis cache error catches (787, 816, 896) + guide retry loop (886)

const {
  mockRedisGet,
  mockRedisSet,
  mockGenerateResponse,
  mockLoggerWarn,
  mockLoggerInfo,
  mockLoggerError,
  mockIsPhaseReorderEnabled,
  mockAssembleFor,
} = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockGenerateResponse: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
  mockIsPhaseReorderEnabled: vi.fn(() => false),
  mockAssembleFor: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/cache/redis", () => ({
  redis: { get: mockRedisGet, set: mockRedisSet, del: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: mockLoggerWarn, info: mockLoggerInfo, error: mockLoggerError },
}));

vi.mock("@/lib/hash", () => ({ hashUserId: (id: string) => `hash_${id}` }));

vi.mock("@/lib/cost-calculator", () => ({
  calculateEstimatedCost: () => ({ totalCost: 0.001, inputCost: 0, outputCost: 0 }),
}));

vi.mock("@/lib/flags/phase-reorder", () => ({
  isPhaseReorderEnabled: mockIsPhaseReorderEnabled,
}));

vi.mock("@/server/services/expedition-ai-context.service", () => ({
  ExpeditionAiContextService: { assembleFor: mockAssembleFor },
}));

// Stub provider — getProvider() returns this object
vi.mock("../providers/claude.provider", () => ({
  ClaudeProvider: class {
    name = "anthropic";
    generateResponse = mockGenerateResponse;
  },
}));
vi.mock("../providers/gemini.provider", () => ({
  GeminiProvider: class {
    name = "gemini";
    generateResponse = mockGenerateResponse;
  },
}));
vi.mock("../providers/fallback.provider", () => ({
  FallbackProvider: class {
    name = "fallback";
    generateResponse = mockGenerateResponse;
  },
}));

vi.mock("@/lib/prompts", () => ({
  travelPlanPrompt: {
    buildUserPrompt: () => "plan prompt",
    maxTokens: 4000,
    model: "plan" as const,
    system: "system",
  },
  checklistPrompt: {
    buildUserPrompt: () => "checklist v2 prompt",
    maxTokens: 2000,
    model: "checklist" as const,
    system: "system",
  },
  checklistPromptV1: {
    buildUserPrompt: () => "checklist v1 prompt",
    maxTokens: 2000,
    model: "checklist" as const,
    system: "system",
  },
  destinationGuidePrompt: {
    buildUserPrompt: () => "guide prompt",
    maxTokens: 4000,
    model: "guide" as const,
    system: "system",
  },
}));

import { AiService } from "../ai.service";

// Valid V2 guide payload for success path
const VALID_GUIDE_V2 = {
  destination: {
    name: "Paris",
    overview: ["City of lights"],
  },
  quickFacts: {
    climate: { label: "Climate", value: "Temperate" },
    currency: { label: "Currency", value: "EUR" },
    language: { label: "Language", value: "French" },
    timezone: { label: "Timezone", value: "CET" },
  },
  safety: {
    level: "safe",
    tips: ["Be aware of pickpockets"],
  },
  mustSee: [{ name: "Eiffel Tower", category: "landmark" }],
  culturalTips: ["Greet with kisses"],
};

const VALID_CHECKLIST = {
  categories: [
    {
      category: "DOCUMENTS",
      items: [{ label: "Passport", priority: "HIGH" }],
    },
  ],
};

function mockSuccessResponse(payload: unknown) {
  mockGenerateResponse.mockResolvedValueOnce({
    text: JSON.stringify(payload),
    inputTokens: 100,
    outputTokens: 200,
    wasTruncated: false,
  });
}

describe("AiService.generateChecklist — cache error branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPhaseReorderEnabled.mockReturnValue(false);
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
  });

  it("logs warn when redis.get throws during cache-read (line 661)", async () => {
    mockRedisGet.mockRejectedValueOnce(new Error("redis down"));
    mockSuccessResponse(VALID_CHECKLIST);

    const result = await AiService.generateChecklist({
      userId: "user_1",
      destination: "Paris",
      startDate: "2026-06-01",
      travelers: 2,
      language: "pt-BR",
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.checklist.cache.error",
      expect.objectContaining({ error: expect.stringContaining("redis down") })
    );
    expect(result.categories).toBeDefined();
  });

  it("swallows redis.set failure silently and logs warn (line 787 cache-set catch)", async () => {
    mockRedisSet.mockRejectedValueOnce(new Error("write failed"));
    mockSuccessResponse(VALID_CHECKLIST);

    const result = await AiService.generateChecklist({
      userId: "user_1",
      destination: "Paris",
      startDate: "2026-06-01",
      travelers: 2,
      language: "pt-BR",
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.checklist.cache.set.error",
      expect.objectContaining({ userId: "hash_user_1" })
    );
    expect(result.categories).toBeDefined();
  });

  it("returns cached result on cache hit (cache hit branch)", async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(VALID_CHECKLIST));

    const result = await AiService.generateChecklist({
      userId: "user_1",
      destination: "Paris",
      startDate: "2026-06-01",
      travelers: 2,
      language: "pt-BR",
    });

    expect(mockGenerateResponse).not.toHaveBeenCalled();
    expect(result.categories).toBeDefined();
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "ai.checklist.cache.hit",
      expect.any(Object)
    );
  });
});

describe("AiService.generateDestinationGuide — cache error & retry branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
  });

  it("logs warn when redis.get throws on cache-read (line 816 catch)", async () => {
    mockRedisGet.mockRejectedValueOnce(new Error("read failed"));
    mockSuccessResponse(VALID_GUIDE_V2);

    const result = await AiService.generateDestinationGuide({
      userId: "user_1",
      destination: "Paris",
      language: "pt-BR",
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.guide.cache.error",
      expect.objectContaining({ error: expect.stringContaining("read failed") })
    );
    expect(result.destination.name).toBe("Paris");
  });

  it("swallows redis.set failure silently and logs warn (line 896 cache-set catch)", async () => {
    mockRedisSet.mockRejectedValueOnce(new Error("write failed"));
    mockSuccessResponse(VALID_GUIDE_V2);

    const result = await AiService.generateDestinationGuide({
      userId: "user_1",
      destination: "Paris",
      language: "pt-BR",
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.guide.cache.set.error",
      expect.objectContaining({ userId: "hash_user_1" })
    );
    expect(result.destination.name).toBe("Paris");
  });

  it("retries on invalid JSON and succeeds on attempt 2 (line 872 continue branch)", async () => {
    // Attempt 1: unparseable garbage (triggers parse.error warn + continue)
    mockGenerateResponse.mockResolvedValueOnce({
      text: "not even json-ish at all",
      inputTokens: 100, outputTokens: 50, wasTruncated: false,
    });
    // Attempt 2: valid payload
    mockSuccessResponse(VALID_GUIDE_V2);

    const result = await AiService.generateDestinationGuide({
      userId: "user_1",
      destination: "Paris",
      language: "pt-BR",
    });

    expect(mockGenerateResponse).toHaveBeenCalledTimes(2);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.guide.parse.error",
      expect.objectContaining({ attempt: 1 })
    );
    expect(result.destination.name).toBe("Paris");
  });

  it("retries on schema-failure and succeeds on attempt 2 (line 886 continue branch)", async () => {
    // Attempt 1: parseable JSON but wrong shape (schema fail → continue)
    mockGenerateResponse.mockResolvedValueOnce({
      text: JSON.stringify({ wrong: "shape" }),
      inputTokens: 100, outputTokens: 50, wasTruncated: false,
    });
    // Attempt 2: valid payload
    mockSuccessResponse(VALID_GUIDE_V2);

    const result = await AiService.generateDestinationGuide({
      userId: "user_1",
      destination: "Paris",
      language: "pt-BR",
    });

    expect(mockGenerateResponse).toHaveBeenCalledTimes(2);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.guide.schema.error",
      expect.objectContaining({ attempt: 1 })
    );
    expect(result.destination.name).toBe("Paris");
  });

  it("throws AI_SCHEMA_ERROR after MAX_ATTEMPTS exhausted (line 887)", async () => {
    // Both attempts produce schema-invalid JSON → throws on attempt 2
    mockGenerateResponse.mockResolvedValue({
      text: JSON.stringify({ wrong: "shape" }),
      inputTokens: 100, outputTokens: 50, wasTruncated: false,
    });

    await expect(
      AiService.generateDestinationGuide({
        userId: "user_1",
        destination: "Paris",
        language: "pt-BR",
      })
    ).rejects.toMatchObject({ code: "AI_SCHEMA_ERROR" });
    expect(mockGenerateResponse).toHaveBeenCalledTimes(2);
  });

  it("returns cached result on cache hit (cache hit branch)", async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(VALID_GUIDE_V2));

    const result = await AiService.generateDestinationGuide({
      userId: "user_1",
      destination: "Paris",
      language: "pt-BR",
    });

    expect(mockGenerateResponse).not.toHaveBeenCalled();
    expect(result.destination.name).toBe("Paris");
  });
});
