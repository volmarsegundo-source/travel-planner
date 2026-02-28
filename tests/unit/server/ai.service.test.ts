/**
 * Unit tests for AiService.
 *
 * All external dependencies (Anthropic SDK, ioredis) are mocked so
 * these tests run in isolation with no infrastructure required.
 *
 * Mocking pattern: vi.mock() factories are hoisted above all const
 * declarations by the vitest transformer. Any variable used inside a
 * vi.mock factory MUST be created with vi.hoisted().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock handles ──────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  messagesCreate: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}));

vi.mock("@anthropic-ai/sdk", () => {
  // Use a regular function (not arrow) so it works as a constructor with `new`
  function MockAnthropic() {
    return {
      messages: {
        create: mocks.messagesCreate,
      },
    };
  }
  return { default: MockAnthropic };
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

function makeClaudeTextResponse(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiService.generateTravelPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the Anthropic singleton so the mock constructor is used each time
    (globalThis as Record<string, unknown>)._anthropic = undefined;
  });

  it("returns cached plan on cache hit without calling Claude", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_PLAN_RESPONSE));

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    expect(result).toEqual(VALID_PLAN_RESPONSE);
    expect(mocks.messagesCreate).not.toHaveBeenCalled();
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("calls Claude API on cache miss and caches the result", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse(JSON.stringify(VALID_PLAN_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);

    expect(result.destination).toBe("Paris, France");
    expect(result.totalDays).toBe(3);
    expect(mocks.messagesCreate).toHaveBeenCalledOnce();
    expect(mocks.redisSet).toHaveBeenCalledOnce();
    // Verify TTL argument is present
    const [, , , ttl] = mocks.redisSet.mock.calls[0] as unknown[];
    expect(ttl).toBe(86400);
  });

  it("throws AppError when Claude returns malformed JSON", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse("This is not JSON at all.")
    );

    await expect(
      AiService.generateTravelPlan(BASE_PLAN_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when Claude response fails Zod validation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    // Missing required fields like 'currency'
    const badResponse = { destination: "Paris", days: [], tips: [] };
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse(JSON.stringify(badResponse))
    );

    await expect(
      AiService.generateTravelPlan(BASE_PLAN_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when Claude API call throws (network/timeout)", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockRejectedValue(new Error("Network error"));

    await expect(
      AiService.generateTravelPlan(BASE_PLAN_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("parses Claude response wrapped in markdown code block", async () => {
    mocks.redisGet.mockResolvedValue(null);
    const wrapped = "```json\n" + JSON.stringify(VALID_PLAN_RESPONSE) + "\n```";
    mocks.messagesCreate.mockResolvedValue(makeClaudeTextResponse(wrapped));
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateTravelPlan(BASE_PLAN_PARAMS);
    expect(result.destination).toBe("Paris, France");
  });
});

describe("AiService.generateChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as Record<string, unknown>)._anthropic = undefined;
  });

  it("returns cached checklist on cache hit without calling Claude", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(VALID_CHECKLIST_RESPONSE));

    const result = await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    expect(result.categories).toHaveLength(2);
    expect(mocks.messagesCreate).not.toHaveBeenCalled();
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("calls Claude API on cache miss and caches the result", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    const result = await AiService.generateChecklist(BASE_CHECKLIST_PARAMS);

    expect(result.categories[0]?.category).toBe("DOCUMENTS");
    expect(mocks.messagesCreate).toHaveBeenCalledOnce();
    expect(mocks.redisSet).toHaveBeenCalledOnce();
  });

  it("throws AppError when Claude returns malformed JSON for checklist", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse("not valid json { broken")
    );

    await expect(
      AiService.generateChecklist(BASE_CHECKLIST_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when checklist response fails Zod schema validation", async () => {
    mocks.redisGet.mockResolvedValue(null);
    // categories array has an invalid category value
    const badResponse = {
      categories: [
        {
          category: "INVALID_CAT",
          items: [{ label: "Passport", priority: "HIGH" }],
        },
      ],
    };
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse(JSON.stringify(badResponse))
    );

    await expect(
      AiService.generateChecklist(BASE_CHECKLIST_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });

  it("uses month-based cache key (not exact date) for better reuse", async () => {
    // Both params have the same month — should hit the same cache key
    const params1 = { ...BASE_CHECKLIST_PARAMS, startDate: "2026-06-01" };
    const params2 = { ...BASE_CHECKLIST_PARAMS, startDate: "2026-06-15" };

    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(params1);
    // Extract the cache key used in first call
    const key1 = mocks.redisGet.mock.calls[0]?.[0] as string;

    vi.clearAllMocks();
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockResolvedValue(
      makeClaudeTextResponse(JSON.stringify(VALID_CHECKLIST_RESPONSE))
    );
    mocks.redisSet.mockResolvedValue("OK");

    await AiService.generateChecklist(params2);
    const key2 = mocks.redisGet.mock.calls[0]?.[0] as string;

    // Same month → same cache key
    expect(key1).toBe(key2);
  });

  it("throws AppError when checklist API call throws", async () => {
    mocks.redisGet.mockResolvedValue(null);
    mocks.messagesCreate.mockRejectedValue(new Error("API unavailable"));

    await expect(
      AiService.generateChecklist(BASE_CHECKLIST_PARAMS)
    ).rejects.toBeInstanceOf(AppError);
  });
});
