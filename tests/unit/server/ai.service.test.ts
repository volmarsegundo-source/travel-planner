/**
 * Unit tests for AiService.
 *
 * All external dependencies (AI provider, ioredis) are mocked so
 * these tests run in isolation with no infrastructure required.
 *
 * Mocking pattern: vi.mock() factories are hoisted above all const
 * declarations by the vitest transformer. Any variable used inside a
 * vi.mock factory MUST be created with vi.hoisted().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashUserId } from "@/lib/hash";

// ─── Hoisted mock handles ──────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  generateResponse: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}));

vi.mock("@/server/services/providers/claude.provider", () => {
  // Use a regular function so it works as a constructor with `new`
  function MockClaudeProvider() {
    return {
      name: "claude",
      generateResponse: mocks.generateResponse,
    };
  }
  return { ClaudeProvider: MockClaudeProvider };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Import SUT after mocks ────────────────────────────────────────────────────

import { AiService } from "@/server/services/ai.service";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_PLAN_RESPONSE = {
  destination: "Paris, France",
  totalDays: 3,
  estimatedBudgetUsed: 1500,
  currency: "USD",
  days: [
    {
      dayNumber: 1,
      date: "2026-06-01",
      theme: "Arrival and city walk",
      activities: [
        {
          title: "Eiffel Tower visit",
          description: "Visit the iconic landmark",
          startTime: "10:00",
          endTime: "12:00",
          estimatedCost: 30,
          activityType: "SIGHTSEEING",
        },
      ],
    },
  ],
  tips: ["Book tickets in advance"],
};

const VALID_CHECKLIST_RESPONSE = {
  categories: [
    {
      category: "DOCUMENTS",
      items: [
        { label: "Passport", priority: "HIGH" },
        { label: "Travel insurance", priority: "MEDIUM" },
      ],
    },
    {
      category: "HEALTH",
      items: [{ label: "First aid kit", priority: "LOW" }],
    },
  ],
};

const BASE_PLAN_PARAMS = {
  userId: "user-1",
  destination: "Paris, France",
  startDate: "2026-06-01",
  endDate: "2026-06-03",
  travelStyle: "CULTURE" as const,
  budgetTotal: 2000,
  budgetCurrency: "USD",
  travelers: 1,
  language: "en" as const,
};

const BASE_CHECKLIST_PARAMS = {
  userId: "user-1",
  destination: "Paris, France",
  startDate: "2026-06-01",
  travelers: 1,
  language: "en" as const,
};

function makeProviderResponse(text: string, wasTruncated = false) {
  return {
    text,
    wasTruncated,
    inputTokens: 100,
    outputTokens: 200,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiService.generateTravelPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached plan on cache hit without calling the provider", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_PLAN_RESPONSE));

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    expect(result).toEqual(VALID_PLAN_RESPONSE);
    expect(mocks.generateResponse).not.toHaveBeenCalled();
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("calls AI provider on cache miss and caches the result", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    expect(result.destination).toBe("Paris, France");
    expect(result.totalDays).toBe(3);
    expect(mocks.generateResponse).toHaveBeenCalledOnce();
    expect(mocks.redisSet).toHaveBeenCalledOnce();
    // Verify TTL argument is present
    const [, , , ttl] = mocks.redisSet.mock.calls[0] as unknown[];
    expect(ttl).toBe(86400);
  });

  it("throws AppError when provider returns malformed JSON", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse("This is not JSON at all.")
    );

    await expect(
      AiService.generateTravelPlan(BASE_PLAN_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when provider response fails Zod validation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    const badResponse = { destination: "Paris", days: [], tips: [] };
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(badResponse))
    );

    await expect(
      AiService.generateTravelPlan(BASE_PLAN_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when provider throws", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockRejectedValue(
      new AppError("AI_TIMEOUT", "errors.timeout", 504)
    );

    await expect(
      AiService.generateTravelPlan(BASE_PLAN_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("parses provider response wrapped in markdown code block", async () => {
    mocks.redisGet.mockResolvedValue(null);
    const wrapped = "```json\n" + JSON.stringify(VALID_PLAN_RESPONSE) + "\n```";
    mocks.generateResponse.mockResolvedValue(makeProviderResponse(wrapped));
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);
    expect(result.destination).toBe("Paris, France");
  });

  it("retries with higher token budget when first attempt is truncated", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.redisSet.mockResolvedValue("OK");

    // First call: truncated response
    mocks.generateResponse
      .mockResolvedValueOnce(
        makeProviderResponse('{"destination":"Paris","totalDays":3', true)
      )
      // Second call: complete response
      .mockResolvedValueOnce(
        makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
      );

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    expect(result.destination).toBe("Paris, France");
    expect(mocks.generateResponse).toHaveBeenCalledTimes(2);
    // Second call should have higher max_tokens
    const firstCallTokens = (mocks.generateResponse.mock.calls[0] as unknown[])[1] as number;
    const secondCallTokens = (mocks.generateResponse.mock.calls[1] as unknown[])[1] as number;
    expect(secondCallTokens).toBeGreaterThan(firstCallTokens);
  });

  it("uses dynamic token budget based on trip duration", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // 3-day trip (BASE_PLAN_PARAMS: June 1-3)
    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);
    const shortTripTokens = (mocks.generateResponse.mock.calls[0] as unknown[])[1] as number;

    vi.clearAllMocks();
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // 14-day trip → should use more tokens
    await AiService.generateTravelPlan({
      ...BASE_PLAN_PARAMS,
      endDate: "2026-06-14",
    });
    const longTripTokens = (mocks.generateResponse.mock.calls[0] as unknown[])[1] as number;

    expect(longTripTokens).toBeGreaterThan(shortTripTokens);
  });

  it("includes travelNotes in the prompt when provided", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan({
      ...BASE_PLAN_PARAMS,
      travelNotes: "I love museums and local food",
    });

    const prompt = (mocks.generateResponse.mock.calls[0] as unknown[])[0] as string;
    expect(prompt).toContain("Additional traveler notes");
    expect(prompt).toContain("I love museums and local food");
  });

  it("includes expedition context in prompt when provided", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan({
      ...BASE_PLAN_PARAMS,
      expeditionContext: {
        tripType: "international",
        travelerType: "solo",
        accommodationStyle: "comfort",
        travelPace: 7,
        destinationGuideContext: "Timezone: CET. Currency: EUR.",
      },
    });

    const prompt = (mocks.generateResponse.mock.calls[0] as unknown[])[0] as string;
    expect(prompt).toContain("Expedition context");
    expect(prompt).toContain("Trip type: international");
    expect(prompt).toContain("Traveler type: solo");
    expect(prompt).toContain("Accommodation preference: comfort");
    expect(prompt).toContain("Travel pace: 7/10");
    expect(prompt).toContain("Destination insights: Timezone: CET. Currency: EUR.");
  });

  it("omits expedition context section when not provided", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    const prompt = (mocks.generateResponse.mock.calls[0] as unknown[])[0] as string;
    expect(prompt).not.toContain("Expedition context");
  });

  it("uses different cache keys with and without expeditionContext", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // Without context
    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);
    const key1 = mocks.redisGet.mock.calls[0]?.[0] as string;

    vi.clearAllMocks();
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // With context
    await AiService.generateTravelPlan({
      ...BASE_PLAN_PARAMS,
      expeditionContext: { tripType: "international", travelerType: "solo" },
    });
    const key2 = mocks.redisGet.mock.calls[0]?.[0] as string;

    expect(key1).not.toBe(key2);
  });

  it("uses different cache keys with and without travelNotes", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // Without notes
    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);
    const key1 = mocks.redisGet.mock.calls[0]?.[0] as string;

    vi.clearAllMocks();
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // With notes
    await AiService.generateTravelPlan({
      ...BASE_PLAN_PARAMS,
      travelNotes: "I love museums",
    });
    const key2 = mocks.redisGet.mock.calls[0]?.[0] as string;

    expect(key1).not.toBe(key2);
  });
});

describe("AiService.generateChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached checklist on cache hit without calling the provider", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_CHECKLIST_RESPONSE));

    const result = await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    expect(result.categories).toHaveLength(2);
    expect(mocks.generateResponse).not.toHaveBeenCalled();
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("calls AI provider on cache miss and caches the result", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    expect(result.categories[0]?.category).toBe("DOCUMENTS");
    expect(mocks.generateResponse).toHaveBeenCalledOnce();
    expect(mocks.redisSet).toHaveBeenCalledOnce();
  });

  it("throws AppError when provider returns malformed JSON for checklist", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse("not valid json { broken")
    );

    await expect(
      AiService.generateChecklist(BASE_CHECKLIST_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when checklist response fails Zod schema validation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    const badResponse = {
      categories: [
        {
          category: "INVALID_CAT",
          items: [{ label: "Passport", priority: "HIGH" }],
        },
      ],
    };
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(badResponse))
    );

    await expect(
      AiService.generateChecklist(BASE_CHECKLIST_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("uses month-based cache key (not exact date) for better reuse", async () => {
    const params1 = { ...BASE_CHECKLIST_PARAMS, startDate: "2026-06-01" };
    const params2 = { ...BASE_CHECKLIST_PARAMS, startDate: "2026-06-15" };

    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(params1);
    const key1 = mocks.redisGet.mock.calls[0]?.[0] as string;

    vi.clearAllMocks();
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(params2);
    const key2 = mocks.redisGet.mock.calls[0]?.[0] as string;

    // Same month → same cache key
    expect(key1).toBe(key2);
  });

  it("throws AppError when checklist provider call throws", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockRejectedValue(
      new AppError("AI_TIMEOUT", "errors.timeout", 504)
    );

    await expect(
      AiService.generateChecklist(BASE_CHECKLIST_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ─── Destination Guide Tests ────────────────────────────────────────────────

const VALID_GUIDE_RESPONSE = {
  timezone: { title: "Timezone", icon: "clock", summary: "CET (UTC+1)", tips: ["Adjust your clock on arrival"] },
  currency: { title: "Currency", icon: "euro", summary: "Euro (EUR)", tips: ["Cards widely accepted"] },
  language: { title: "Language", icon: "speech", summary: "French", tips: ["Learn basic greetings"] },
  electricity: { title: "Electricity", icon: "plug", summary: "Type C/E, 230V", tips: ["Bring an adapter"] },
  connectivity: { title: "Connectivity", icon: "wifi", summary: "Good 4G coverage", tips: ["Get a local SIM"] },
  cultural_tips: { title: "Culture", icon: "star", summary: "Rich history", tips: ["Greet with bonjour"] },
};

const BASE_GUIDE_PARAMS = {
  userId: "user-1",
  destination: "Paris, France",
  language: "en" as const,
};

describe("AiService.generateDestinationGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes 'guide' as model type to the provider (not 'checklist')", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_GUIDE_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateDestinationGuide(BASE_GUIDE_PARAMS);

    expect(mocks.generateResponse).toHaveBeenCalledOnce();
    const modelArg = (mocks.generateResponse.mock.calls[0] as unknown[])[2] as string;
    expect(modelArg).toBe("guide");
  });

  it("returns cached guide on cache hit without calling the provider", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_GUIDE_RESPONSE));

    const result = await AiService.generateDestinationGuide(BASE_GUIDE_PARAMS);

    expect(result.timezone.title).toBe("Timezone");
    expect(mocks.generateResponse).not.toHaveBeenCalled();
  });

  it("calls AI provider on cache miss and caches the result", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_GUIDE_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateDestinationGuide(BASE_GUIDE_PARAMS);

    expect(result.currency.summary).toBe("Euro (EUR)");
    expect(mocks.generateResponse).toHaveBeenCalledOnce();
    expect(mocks.redisSet).toHaveBeenCalledOnce();
  });

  it("throws AppError when guide response fails Zod validation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    const badResponse = { timezone: { title: "TZ" } }; // incomplete
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(badResponse))
    );

    await expect(
      AiService.generateDestinationGuide(BASE_GUIDE_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when provider returns malformed JSON for guide", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse("not json at all")
    );

    await expect(
      AiService.generateDestinationGuide(BASE_GUIDE_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ─── System Prompt Tests ────────────────────────────────────────────────────

describe("System prompt passing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes system prompt to provider for plan generation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    const options = (mocks.generateResponse.mock.calls[0] as unknown[])[3] as { systemPrompt?: string };
    expect(options).toBeDefined();
    expect(options.systemPrompt).toBeDefined();
    expect(options.systemPrompt).toContain("professional travel planner");
    expect(options.systemPrompt).toContain("JSON");
  });

  it("passes system prompt to provider for checklist generation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    const options = (mocks.generateResponse.mock.calls[0] as unknown[])[3] as { systemPrompt?: string };
    expect(options).toBeDefined();
    expect(options.systemPrompt).toBeDefined();
    expect(options.systemPrompt).toContain("travel expert");
    expect(options.systemPrompt).toContain("checklist");
  });

  it("passes system prompt to provider for guide generation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_GUIDE_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateDestinationGuide(BASE_GUIDE_PARAMS);

    const options = (mocks.generateResponse.mock.calls[0] as unknown[])[3] as { systemPrompt?: string };
    expect(options).toBeDefined();
    expect(options.systemPrompt).toBeDefined();
    expect(options.systemPrompt).toContain("pocket guide");
    expect(options.systemPrompt).toContain("6 sections");
  });

  it("user message for plan contains trip details, not system instructions", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    const userMessage = (mocks.generateResponse.mock.calls[0] as unknown[])[0] as string;
    // User message should have dynamic data
    expect(userMessage).toContain("Paris, France");
    expect(userMessage).toContain("2026-06-01");
    expect(userMessage).toContain("CULTURE");
    // User message should NOT repeat the full system instructions
    expect(userMessage).not.toContain("Respond ONLY with this JSON structure");
  });

  it("user message for checklist contains trip details, not system instructions", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    const userMessage = (mocks.generateResponse.mock.calls[0] as unknown[])[0] as string;
    expect(userMessage).toContain("Paris, France");
    expect(userMessage).toContain("2026-06");
    // Should not contain the system instructions that are now in the system prompt
    expect(userMessage).not.toContain("You are a travel expert");
  });

  it("user message for guide contains destination and language, not system instructions", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_GUIDE_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateDestinationGuide(BASE_GUIDE_PARAMS);

    const userMessage = (mocks.generateResponse.mock.calls[0] as unknown[])[0] as string;
    expect(userMessage).toContain("Paris, France");
    expect(userMessage).toContain("English");
    // Should not contain the system instructions
    expect(userMessage).not.toContain("You are a travel expert");
  });
});

// ─── Token Usage Logging Tests ──────────────────────────────────────────────

describe("Token usage logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs token usage after plan generation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue({
      text: JSON.stringify(VALID_PLAN_RESPONSE),
      wasTruncated: false,
      inputTokens: 150,
      outputTokens: 500,
      cacheReadInputTokens: 50,
      cacheCreationInputTokens: 100,
    });
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    const loggerInfo = vi.mocked(logger.info);
    const tokenLogCall = loggerInfo.mock.calls.find(
      (call) => call[0] === "ai.tokens.usage"
    );
    expect(tokenLogCall).toBeDefined();
    const meta = tokenLogCall?.[1];
    expect(meta).toMatchObject({
      userId: hashUserId("user-1"),
      generationType: "plan",
      model: "claude",
      inputTokens: 150,
      outputTokens: 500,
      cacheReadTokens: 50,
      cacheWriteTokens: 100,
    });
    // Verify cost data is included
    expect(meta).toHaveProperty("estimatedCostUSD");
    expect(meta).toHaveProperty("costBreakdown");
    const breakdown = (meta as Record<string, unknown>).costBreakdown as Record<string, number>;
    expect(breakdown.totalCost).toBeGreaterThan(0);
    expect(breakdown.outputCost).toBeGreaterThan(0);
  });

  it("logs token usage after checklist generation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue({
      text: JSON.stringify(VALID_CHECKLIST_RESPONSE),
      wasTruncated: false,
      inputTokens: 80,
      outputTokens: 300,
    });
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    const loggerInfo = vi.mocked(logger.info);
    const tokenLogCall = loggerInfo.mock.calls.find(
      (call) => call[0] === "ai.tokens.usage"
    );
    expect(tokenLogCall).toBeDefined();
    const meta = tokenLogCall?.[1];
    expect(meta).toMatchObject({
      userId: hashUserId("user-1"),
      generationType: "checklist",
      model: "claude",
      inputTokens: 80,
      outputTokens: 300,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  });

  it("logs token usage after guide generation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue({
      text: JSON.stringify(VALID_GUIDE_RESPONSE),
      wasTruncated: false,
      inputTokens: 90,
      outputTokens: 400,
      cacheReadInputTokens: 30,
    });
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateDestinationGuide(BASE_GUIDE_PARAMS);

    const loggerInfo = vi.mocked(logger.info);
    const tokenLogCall = loggerInfo.mock.calls.find(
      (call) => call[0] === "ai.tokens.usage"
    );
    expect(tokenLogCall).toBeDefined();
    const meta = tokenLogCall?.[1];
    expect(meta).toMatchObject({
      userId: hashUserId("user-1"),
      generationType: "guide",
      model: "claude",
      inputTokens: 90,
      outputTokens: 400,
      cacheReadTokens: 30,
      cacheWriteTokens: 0,
    });
  });

  it("does not log token usage on cache hit", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_PLAN_RESPONSE));

    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    const loggerInfo = vi.mocked(logger.info);
    const tokenLogCall = loggerInfo.mock.calls.find(
      (call) => call[0] === "ai.tokens.usage"
    );
    expect(tokenLogCall).toBeUndefined();
  });

  it("uses 2300 tokens for a 3-day trip (MIN_PLAN_TOKENS=2048)", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    // 3-day trip: 3*600 + 500 = 2300, which is above MIN_PLAN_TOKENS (2048)
    await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    const tokenBudget = (mocks.generateResponse.mock.calls[0] as unknown[])[1] as number;
    expect(tokenBudget).toBe(2300);
  });

  it("does not include PII in token usage log", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.generateResponse.mockResolvedValue(
      makeProviderResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateTravelPlan({
      ...BASE_PLAN_PARAMS,
      travelNotes: "Contact me at john@example.com",
    });

    const loggerInfo = vi.mocked(logger.info);
    const tokenLogCall = loggerInfo.mock.calls.find(
      (call) => call[0] === "ai.tokens.usage"
    );
    expect(tokenLogCall).toBeDefined();
    const metaStr = JSON.stringify(tokenLogCall?.[1]);
    expect(metaStr).not.toContain("john@example.com");
    expect(metaStr).not.toContain("Contact me");
  });
});
