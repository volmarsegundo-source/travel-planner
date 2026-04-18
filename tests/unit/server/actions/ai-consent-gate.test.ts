/**
 * Tests that AI generation actions are gated by AI consent guard.
 *
 * Verifies SPEC-ARCH-056 Section 4.3: generateDestinationGuideAction,
 * regenerateGuideAction, and regenerateItineraryAction all call
 * assertAiConsent and propagate AI_CONSENT_REQUIRED errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockAssertAiConsent,
  mockFindFirst,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockAssertAiConsent: vi.fn(),
  mockFindFirst: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/guards/ai-consent-guard", () => ({
  assertAiConsent: mockAssertAiConsent,
}));

vi.mock("@/server/db", () => ({
  db: {
    trip: { findFirst: mockFindFirst },
    userProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    destinationGuide: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
    userProgress: { findUnique: vi.fn().mockResolvedValue({ availablePoints: 1000 }) },
    activity: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: { completePhase: vi.fn(), advanceFromPhase: vi.fn() },
}));

vi.mock("@/lib/engines/checklist-engine", () => ({
  ChecklistEngine: {
    initializePhase3Checklist: vi.fn(),
    getPhaseChecklist: vi.fn().mockResolvedValue([]),
    initializeChecklistItems: vi.fn(),
    getChecklistItems: vi.fn().mockResolvedValue([]),
    isChecklistComplete: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn().mockResolvedValue(undefined),
    getBalance: vi.fn().mockResolvedValue({ availablePoints: 1000 }),
    debitPoints: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: (e: Error) => e.message,
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: (id: string) => `hashed_${id}`,
}));

vi.mock("@/lib/guards/age-guard", () => ({
  canUseAI: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 3600000 }),
}));

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: vi.fn().mockImplementation((text: string) => text),
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: vi.fn().mockReturnValue({ masked: "masked", hasPII: false, detectedTypes: [] }),
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue("international"),
}));

vi.mock("@/lib/flags/phase-reorder", () => ({
  isPhaseReorderEnabled: vi.fn().mockReturnValue(false),
}));

vi.mock("@/server/services/expedition.service", () => ({
  ExpeditionService: {
    getByTripId: vi.fn(),
    createExpedition: vi.fn(),
  },
}));

vi.mock("@/server/services/profile.service", () => ({
  ProfileService: { recalculateCompletionScore: vi.fn() },
}));

vi.mock("@/server/services/ai-gateway.service", () => ({
  AiGatewayService: {
    generateGuide: vi.fn().mockResolvedValue({ data: {}, interaction: {} }),
    generateChecklist: vi.fn().mockResolvedValue({ data: { categories: [] }, interaction: {} }),
  },
}));

vi.mock("@/server/services/expedition-summary.service", () => ({
  ExpeditionSummaryService: { getExpeditionSummary: vi.fn() },
}));

vi.mock("@/server/services/phase-completion.service", () => ({
  PhaseCompletionService: { completePhase: vi.fn() },
}));

vi.mock("@/server/services/entitlement.service", () => ({
  EntitlementService: { checkQuota: vi.fn().mockResolvedValue({ allowed: true }) },
}));

vi.mock("@/server/services/trip.service", () => ({
  TripService: { verifyOwnership: vi.fn().mockResolvedValue(true) },
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
    ForbiddenError: class ForbiddenError extends AppError {
      constructor() {
        super("FORBIDDEN", "Forbidden", 403);
      }
    },
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  generateDestinationGuideAction,
  regenerateGuideAction,
} from "@/server/actions/expedition.actions";
import { regenerateItineraryAction } from "@/server/actions/itinerary.actions";
import { AppError } from "@/lib/errors";

// ─── Tests ────────────────────────────────────────────────────────────────────

const session = { user: { id: "user-1", email: "test@test.com" } };

describe("AI consent gate on generation actions (SPEC-ARCH-056)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockAssertAiConsent.mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue({
      id: "trip-1",
      destination: "Paris",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-05"),
      tripType: "international",
      passengers: null,
      localMobility: [],
      phases: [],
      transportSegments: [],
    });
  });

  it("generateDestinationGuideAction blocks when consent missing", async () => {
    mockAssertAiConsent.mockRejectedValue(
      new AppError("AI_CONSENT_REQUIRED", "AI_CONSENT_REQUIRED", 403)
    );

    await expect(
      generateDestinationGuideAction("trip-1", "pt-BR")
    ).rejects.toThrow("AI_CONSENT_REQUIRED");
  });

  it("regenerateGuideAction blocks when consent missing", async () => {
    mockAssertAiConsent.mockRejectedValue(
      new AppError("AI_CONSENT_REQUIRED", "AI_CONSENT_REQUIRED", 403)
    );

    await expect(
      regenerateGuideAction("trip-1", "pt-BR", [], "")
    ).rejects.toThrow("AI_CONSENT_REQUIRED");
  });

  it("regenerateItineraryAction blocks when consent missing", async () => {
    mockAssertAiConsent.mockRejectedValue(
      new AppError("AI_CONSENT_REQUIRED", "AI_CONSENT_REQUIRED", 403)
    );

    await expect(
      regenerateItineraryAction("trip-1", false)
    ).rejects.toThrow("AI_CONSENT_REQUIRED");
  });
});
