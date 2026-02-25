import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRedis, mockCreate } = vi.hoisted(() => {
  const mockRedis = { get: vi.fn(), setex: vi.fn() };
  const mockCreate = vi.fn();
  return { mockRedis, mockCreate };
});

vi.mock("@/lib/env", () => ({
  env: { ANTHROPIC_API_KEY: "test-key" },
}));
vi.mock("@/server/cache/client", () => ({ redis: mockRedis }));
vi.mock("@/server/cache/keys", () => ({
  CacheKeys: {
    aiPlan: (hash: string) => `cache:ai-plan:${hash}`,
    aiChecklist: (hash: string) => `cache:ai-checklist:${hash}`,
  },
  CacheTTL: { AI_PLAN: 86400, AI_CHECKLIST: 86400 },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: mockCreate };
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { generateTravelPlan, generateChecklist } from "../ai.service";
import type { GeneratePlanParams, GenerateChecklistParams } from "@/types/ai.types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAN_PARAMS: GeneratePlanParams = {
  destination: "Lisboa, Portugal",
  startDate: new Date("2025-07-01"),
  endDate: new Date("2025-07-05"),
  travelStyle: "CULTURE",
  budgetTotal: 5000,
  budgetCurrency: "BRL",
  travelers: 2,
  language: "pt-BR",
};

const VALID_PLAN_JSON = JSON.stringify({
  destination: "Lisboa, Portugal",
  totalDays: 4,
  travelStyle: "CULTURE",
  highlights: ["Torre de Belém", "Alfama", "Pastéis de Belém"],
  days: [
    {
      dayNumber: 1,
      theme: "Chegada",
      activities: [
        {
          time: "15:00",
          title: "Check-in",
          description: "Instale-se.",
          durationMinutes: 60,
          category: "ACCOMMODATION",
          estimatedCost: 0,
        },
      ],
    },
  ],
  tips: ["Use a Lisboa Card."],
});

const CHECKLIST_PARAMS: GenerateChecklistParams = {
  destination: "Lisboa, Portugal",
  startDate: new Date("2025-07-01"),
  travelers: 2,
  language: "pt-BR",
};

const VALID_CHECKLIST_JSON = JSON.stringify([
  {
    id: "DOCUMENTS",
    items: [
      { text: "Passaporte", required: true },
      { text: "Seguro viagem", required: false },
    ],
  },
]);

// ── generateTravelPlan ────────────────────────────────────────────────────────

describe("generateTravelPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns cached plan on cache hit", async () => {
    mockRedis.get.mockResolvedValue(VALID_PLAN_JSON);

    const result = await generateTravelPlan(PLAN_PARAMS);

    expect(result.destination).toBe("Lisboa, Portugal");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls Claude API and caches result on cache miss", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_PLAN_JSON }],
    });

    const result = await generateTravelPlan(PLAN_PARAMS);

    expect(result.destination).toBe("Lisboa, Portugal");
    expect(result.totalDays).toBe(4);
    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringContaining("cache:ai-plan:"),
      86400,
      expect.any(String),
    );
  });

  it("uses claude-sonnet-4-6 for plan generation", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_PLAN_JSON }],
    });

    await generateTravelPlan(PLAN_PARAMS);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" }),
      expect.any(Object),
    );
  });

  it("returns fallback plan when Claude response is invalid JSON", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Sorry, cannot help." }],
    });

    const result = await generateTravelPlan(PLAN_PARAMS);

    expect(result.destination).toBe("Lisboa, Portugal");
    expect(Array.isArray(result.days)).toBe(true);
    expect(result.days.length).toBeGreaterThan(0);
  });

  it("different travelStyle produces different cache key", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_PLAN_JSON }],
    });

    await generateTravelPlan(PLAN_PARAMS);
    await generateTravelPlan({ ...PLAN_PARAMS, travelStyle: "ADVENTURE" });

    const key1 = mockRedis.setex.mock.calls[0]?.[0] as string;
    const key2 = mockRedis.setex.mock.calls[1]?.[0] as string;
    expect(key1).not.toBe(key2);
  });

  it("budgets in same R$500 bucket share the same cache key", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_PLAN_JSON }],
    });

    await generateTravelPlan({ ...PLAN_PARAMS, budgetTotal: 5100 });
    await generateTravelPlan({ ...PLAN_PARAMS, budgetTotal: 5200 });

    const key1 = mockRedis.setex.mock.calls[0]?.[0] as string;
    const key2 = mockRedis.setex.mock.calls[1]?.[0] as string;
    expect(key1).toBe(key2); // both in R$5000 bucket
  });
});

// ── generateChecklist ─────────────────────────────────────────────────────────

describe("generateChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns cached checklist on cache hit", async () => {
    mockRedis.get.mockResolvedValue(VALID_CHECKLIST_JSON);

    const result = await generateChecklist(CHECKLIST_PARAMS);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("DOCUMENTS");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls Claude API and caches result on cache miss", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_CHECKLIST_JSON }],
    });

    const result = await generateChecklist(CHECKLIST_PARAMS);

    expect(result[0]!.id).toBe("DOCUMENTS");
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it("uses claude-haiku-4-5-20251001 (faster/cheaper for checklist)", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_CHECKLIST_JSON }],
    });

    await generateChecklist(CHECKLIST_PARAMS);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5-20251001" }),
      expect.any(Object),
    );
  });

  it("returns fallback checklist on invalid JSON response", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });

    const result = await generateChecklist(CHECKLIST_PARAMS);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("same month different day → same cache key (month-level granularity)", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: VALID_CHECKLIST_JSON }],
    });

    // Use mid-month noon times — stays in same local month regardless of UTC offset
    await generateChecklist({ ...CHECKLIST_PARAMS, startDate: new Date("2025-07-15T12:00:00") });
    await generateChecklist({ ...CHECKLIST_PARAMS, startDate: new Date("2025-07-25T12:00:00") });

    const key1 = mockRedis.setex.mock.calls[0]?.[0] as string;
    const key2 = mockRedis.setex.mock.calls[1]?.[0] as string;
    expect(key1).toBe(key2);
  });
});
