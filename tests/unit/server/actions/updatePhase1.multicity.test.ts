/**
 * Unit tests for Sprint 43 Wave 3 multi-city enforcement in
 * createExpeditionAction and updatePhase1Action.
 *
 * Covers:
 * - Free user with destinations.length > 1 -> limits.destinationCap
 * - Premium user with destinations.length = 3 -> persists 3 rows + syncs Trip
 * - Legacy caller (no `destinations`) -> upserts single row (order=0)
 * - Zod validation rejects length > 4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockAuth, mockGetPlanTier, mockCanCreateExpedition } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPlanTier: vi.fn(),
  mockCanCreateExpedition: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  updateSession: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn(),
    awardBadge: vi.fn(),
    initializeProgress: vi.fn(),
  },
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: { completePhase: vi.fn(), initializeExpedition: vi.fn() },
}));

vi.mock("@/lib/engines/checklist-engine", () => ({
  ChecklistEngine: { toggleItem: vi.fn() },
}));

vi.mock("@/server/services/expedition.service", () => ({
  ExpeditionService: {
    createExpedition: vi.fn().mockResolvedValue({
      tripId: "trip-new-1",
      phaseResult: {
        phaseNumber: 1,
        pointsEarned: 100,
        badgeAwarded: "primeira_viagem",
        newRank: null,
        nextPhaseUnlocked: 2,
      },
    }),
    completePhase2: vi.fn(),
  },
}));

vi.mock("@/server/services/profile.service", () => ({
  ProfileService: {
    saveAndAwardProfileFields: vi.fn(),
    recalculateCompletionScore: vi.fn(),
  },
}));

vi.mock("@/server/services/expedition-summary.service", () => ({
  ExpeditionSummaryService: { getExpeditionSummary: vi.fn() },
}));

vi.mock("@/server/services/phase-completion.service", () => ({
  PhaseCompletionService: {
    checkAndCompleteTrip: vi.fn().mockResolvedValue(false),
    syncPhaseStatus: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock("@/server/services/ai.service", () => ({
  AiService: { generateDestinationGuide: vi.fn() },
}));

vi.mock("@/server/services/entitlement.service", () => ({
  EntitlementService: {
    getPlanTier: mockGetPlanTier,
    canCreateExpedition: mockCanCreateExpedition,
  },
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue("international"),
}));

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: vi.fn((s: string) => s),
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: vi.fn((s: string) => ({ masked: s, maskMap: {} })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ─── Import SUT after mocks ──────────────────────────────────────────────────

import {
  createExpeditionAction,
  updatePhase1Action,
} from "@/server/actions/expedition.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-ex-001";
const USER_ID = "user-ex-001";

// Use dates well into the future so Phase1Schema's "dateInPast" refinements
// don't reject the input during tests.
const FUTURE_START = "2099-06-01";
const FUTURE_END = "2099-06-10";

function setupAuth(userId = USER_ID) {
  mockAuth.mockResolvedValue({ user: { id: userId } });
}

function mockTransactionAsPassthrough() {
  // The action's persistDestinations helper uses db.$transaction(cb).
  // Forward the callback with the root prismaMock so its tx.* calls are
  // recorded on the same mock surface.
  prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: unknown) => Promise<unknown>)(prismaMock);
    }
    return Promise.all(arg as Array<Promise<unknown>>);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 1 multi-city enforcement (Sprint 43 Wave 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionAsPassthrough();
    // Default: Wave 5 entitlement gate allows the expedition. Specific tests
    // override per-call when they want to assert that path.
    mockCanCreateExpedition.mockResolvedValue({ allowed: true });
    prismaMock.destination.findFirst.mockResolvedValue(null as never);
    prismaMock.destination.create.mockResolvedValue({} as never);
    prismaMock.destination.update.mockResolvedValue({} as never);
    prismaMock.destination.deleteMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.destination.createMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.trip.update.mockResolvedValue({ id: TRIP_ID } as never);
    prismaMock.expeditionPhase.updateMany.mockResolvedValue({ count: 1 } as never);
  });

  describe("createExpeditionAction", () => {
    it("rejects a FREE user with more than one destination", async () => {
      setupAuth();
      mockGetPlanTier.mockResolvedValue("FREE");

      const result = await createExpeditionAction({
        destination: "Paris",
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        flexibleDates: false,
        destinations: [
          { city: "Paris" },
          { city: "Lisbon" },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("limits.destinationCap");
      expect(prismaMock.destination.createMany).not.toHaveBeenCalled();
    });

    it("persists 3 Destination rows for a PREMIUM user and syncs Trip scalars", async () => {
      setupAuth();
      mockGetPlanTier.mockResolvedValue("PREMIUM");

      const result = await createExpeditionAction({
        destination: "Paris",
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        flexibleDates: false,
        destinations: [
          { city: "Paris", latitude: 48.8, longitude: 2.3 },
          { city: "Lisbon" },
          { city: "Madrid" },
        ],
      });

      expect(result.success).toBe(true);
      expect(prismaMock.destination.deleteMany).toHaveBeenCalledWith({
        where: { tripId: "trip-new-1" },
      });
      expect(prismaMock.destination.createMany).toHaveBeenCalledTimes(1);
      const createManyCall = prismaMock.destination.createMany.mock.calls[0]?.[0] as
        | { data: Array<Record<string, unknown>> }
        | undefined;
      expect(createManyCall?.data).toHaveLength(3);
      expect(createManyCall?.data[0]?.order).toBe(0);
      expect(createManyCall?.data[0]?.city).toBe("Paris");
      expect(createManyCall?.data[2]?.order).toBe(2);

      // Trip scalars must mirror destinations[0]
      const tripUpdateCalls = prismaMock.trip.update.mock.calls;
      const mirrorCall = tripUpdateCalls.find((c) =>
        (c[0] as { data: Record<string, unknown> }).data.destination === "Paris"
      );
      expect(mirrorCall).toBeDefined();
    });

    it("rejects a 5-destination payload via Zod validation (cap=4)", async () => {
      setupAuth();
      mockGetPlanTier.mockResolvedValue("PREMIUM");

      const result = await createExpeditionAction({
        destination: "Paris",
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        flexibleDates: false,
        destinations: [
          { city: "A" },
          { city: "B" },
          { city: "C" },
          { city: "D" },
          { city: "E" },
        ],
      });

      expect(result.success).toBe(false);
      expect(prismaMock.destination.createMany).not.toHaveBeenCalled();
    });

    it("legacy single-city call (no `destinations`) still succeeds and upserts one row", async () => {
      setupAuth();
      // Plan tier is irrelevant in the single-city path, but the action
      // never calls getPlanTier when `destinations` is absent.

      const result = await createExpeditionAction({
        destination: "Paris",
        destinationLat: 48.8,
        destinationLon: 2.3,
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        flexibleDates: false,
      });

      expect(result.success).toBe(true);
      // No bulk replace path
      expect(prismaMock.destination.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.destination.createMany).not.toHaveBeenCalled();
      // But the single-row upsert path must have fired
      expect(prismaMock.destination.findFirst).toHaveBeenCalledWith({
        where: { tripId: "trip-new-1", order: 0 },
        select: { id: true },
      });
      expect(prismaMock.destination.create).toHaveBeenCalledTimes(1);
      // Plan tier check is skipped because there's no `destinations` array
      expect(mockGetPlanTier).not.toHaveBeenCalled();
    });
  });

  describe("updatePhase1Action", () => {
    it("rejects a FREE user trying to grow a trip beyond 1 destination", async () => {
      setupAuth();
      mockGetPlanTier.mockResolvedValue("FREE");
      prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);

      const result = await updatePhase1Action(TRIP_ID, {
        destination: "Paris",
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        flexibleDates: false,
        destinations: [{ city: "Paris" }, { city: "Lisbon" }],
      });

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toBe("limits.destinationCap");
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it("persists 3 rows for a PREMIUM user on update and keeps Trip in sync", async () => {
      setupAuth();
      mockGetPlanTier.mockResolvedValue("PREMIUM");
      prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);

      const result = await updatePhase1Action(TRIP_ID, {
        destination: "Paris",
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        flexibleDates: false,
        destinations: [
          { city: "Paris" },
          { city: "Lisbon" },
          { city: "Madrid" },
        ],
      });

      expect(result.success).toBe(true);
      expect(prismaMock.destination.deleteMany).toHaveBeenCalledWith({
        where: { tripId: TRIP_ID },
      });
      const createManyCall = prismaMock.destination.createMany.mock.calls[0]?.[0] as
        | { data: Array<Record<string, unknown>> }
        | undefined;
      expect(createManyCall?.data).toHaveLength(3);
    });
  });
});
