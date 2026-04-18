/**
 * Integration tests for Zod validation in AI actions (T-S17-005).
 *
 * Verifies that invalid params are rejected BEFORE any DB/AI calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockCheckRateLimit,
  mockFindFirst,
  mockProfileFindUnique,
  mockSanitizeForPrompt,
  mockMaskPII,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockFindFirst: vi.fn(),
  mockProfileFindUnique: vi.fn(),
  mockSanitizeForPrompt: vi.fn(),
  mockMaskPII: vi.fn(),
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

vi.mock("@/lib/guards/ai-consent-guard", () => ({
  assertAiConsent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/ai.service", () => ({
  AiService: {
    generateChecklist: vi.fn().mockResolvedValue({ categories: [] }),
    generateTravelPlan: vi.fn().mockResolvedValue({ days: [], tips: [] }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
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

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: mockSanitizeForPrompt,
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: mockMaskPII,
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/errors", () => {
  class AppError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.name = "AppError";
    }
  }
  return {
    AppError,
    UnauthorizedError: class UnauthorizedError extends AppError {
      constructor() {
        super("UNAUTHORIZED", "Authentication required", 401);
      }
    },
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  generateChecklistAction,
  generateTravelPlanAction,
} from "@/server/actions/ai.actions";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AI action Zod validation (T-S17-005)", () => {
  const session = { user: { id: "user-1", email: "test@test.com" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 3600000,
    });
    mockFindFirst.mockResolvedValue({ id: "trip-1" });
    mockProfileFindUnique.mockResolvedValue(null);
    mockSanitizeForPrompt.mockImplementation((text: string) => text);
    mockMaskPII.mockImplementation((text: string) => ({
      masked: text,
      hasPII: false,
      detectedTypes: [],
    }));
  });

  describe("generateTravelPlanAction", () => {
    it("rejects empty tripId", async () => {
      const result = await generateTravelPlanAction("", {
        destination: "Paris",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE",
        budgetTotal: 1000,
        budgetCurrency: "USD",
        travelers: 2,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
      // Should not reach rate limit check
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("rejects invalid travelStyle", async () => {
      const result = await generateTravelPlanAction("trip-1", {
        destination: "Paris",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "HACKING" as "CULTURE",
        budgetTotal: 1000,
        budgetCurrency: "USD",
        travelers: 2,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("rejects negative budget", async () => {
      const result = await generateTravelPlanAction("trip-1", {
        destination: "Paris",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE",
        budgetTotal: -500,
        budgetCurrency: "USD",
        travelers: 2,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
    });

    it("rejects empty destination", async () => {
      const result = await generateTravelPlanAction("trip-1", {
        destination: "",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE",
        budgetTotal: 1000,
        budgetCurrency: "USD",
        travelers: 2,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
    });

    it("rejects travelers exceeding max", async () => {
      const result = await generateTravelPlanAction("trip-1", {
        destination: "Paris",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE",
        budgetTotal: 1000,
        budgetCurrency: "USD",
        travelers: 99,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
    });
  });

  describe("generateChecklistAction", () => {
    it("rejects empty tripId", async () => {
      const result = await generateChecklistAction("", {
        destination: "Tokyo",
        startDate: "2026-07-01",
        travelers: 2,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("rejects zero travelers", async () => {
      const result = await generateChecklistAction("trip-1", {
        destination: "Tokyo",
        startDate: "2026-07-01",
        travelers: 0,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
    });

    it("rejects invalid language", async () => {
      const result = await generateChecklistAction("trip-1", {
        destination: "Tokyo",
        startDate: "2026-07-01",
        travelers: 2,
        language: "fr" as "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
    });

    it("rejects empty destination", async () => {
      const result = await generateChecklistAction("trip-1", {
        destination: "",
        startDate: "2026-07-01",
        travelers: 2,
        language: "en",
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("errors.validation");
    });
  });
});
