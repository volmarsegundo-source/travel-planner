/**
 * Unit tests for AI server actions — rate limiting.
 *
 * Tests verify that generateChecklistAction enforces rate limits
 * matching the pattern already used by generateTravelPlanAction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockAuth, mockCheckRateLimit, mockFindFirst, mockProfileFindUnique } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockFindFirst: vi.fn(),
  mockProfileFindUnique: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/server/db", () => ({
  db: {
    trip: { findFirst: mockFindFirst },
    userProfile: { findUnique: mockProfileFindUnique },
    $transaction: vi.fn(),
  },
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

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: (e: Error) => e.message,
}));

vi.mock("@/server/services/itinerary-plan.service", () => ({
  ItineraryPlanService: {
    getExpeditionContext: vi.fn().mockResolvedValue(null),
    recordGeneration: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { generateChecklistAction, generateTravelPlanAction } from "@/server/actions/ai.actions";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateChecklistAction", () => {
  const session = { user: { id: "user-1", email: "test@test.com" } };
  const params = { destination: "Paris", startDate: "2026-06-01", travelers: 2, language: "en" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 3600000 });
    mockFindFirst.mockResolvedValue({ id: "trip-1" });
    mockProfileFindUnique.mockResolvedValue(null);
  });

  it("calls checkRateLimit with ai:checklist:{userId} key", async () => {
    await generateChecklistAction("trip-1", params);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "ai:checklist:user-1",
      5,
      3600
    );
  });

  it("returns rateLimitExceeded when rate limit is hit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() });

    const result = await generateChecklistAction("trip-1", params);

    expect(result).toEqual({
      success: false,
      error: "errors.rateLimitExceeded",
    });
  });

  it("proceeds to BOLA check when rate limit allows", async () => {
    await generateChecklistAction("trip-1", params);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "trip-1", userId: "user-1", deletedAt: null },
      })
    );
  });
});

describe("generateTravelPlanAction", () => {
  const session = { user: { id: "user-1", email: "test@test.com" } };
  const params = {
    destination: "Paris",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    travelStyle: "CULTURE" as const,
    budgetTotal: 1000,
    budgetCurrency: "USD",
    travelers: 2,
    language: "en" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 });
    mockFindFirst.mockResolvedValue({ id: "trip-1" });
    mockProfileFindUnique.mockResolvedValue(null);
  });

  it("calls checkRateLimit with ai:plan:{userId} key", async () => {
    await generateTravelPlanAction("trip-1", params);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "ai:plan:user-1",
      10,
      3600
    );
  });

  it("returns rateLimitExceeded when rate limit is hit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() });

    const result = await generateTravelPlanAction("trip-1", params);

    expect(result).toEqual({
      success: false,
      error: "errors.rateLimitExceeded",
    });
  });
});
