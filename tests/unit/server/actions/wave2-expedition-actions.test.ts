/**
 * Sprint 44 Wave 2 — expedition.actions semantic renames and flag-aware behavior.
 *
 * Tests cover:
 * - toggleChecklistItemAction: uses flag-aware phaseNumber (3 OFF / 6 ON)
 * - togglePhase3ItemAction (deprecated alias) == toggleChecklistItemAction
 * - syncItineraryCompletionAction: uses flag-aware itinerary phaseNumber (6 OFF / 4 ON)
 * - syncPhase6CompletionAction (deprecated alias) == syncItineraryCompletionAction
 * - addCustomChecklistItemAction: uses checklistPhaseNumber()
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §6.2
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist flag mock ──────────────────────────────────────────────────────────

const mockFlagModule = vi.hoisted(() => ({
  isPhaseReorderEnabled: vi.fn(() => false),
}));

// ─── Hoist other mocks ────────────────────────────────────────────────────────

const { mockAuth, mockToggleItem, mockSyncPhaseStatus, mockCompletePhase, mockCheckAndCompleteTrip } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockToggleItem: vi.fn(),
    mockSyncPhaseStatus: vi.fn().mockResolvedValue(false),
    mockCompletePhase: vi.fn(),
    mockCheckAndCompleteTrip: vi.fn(),
  }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags/phase-reorder", () => mockFlagModule);

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

vi.mock("@/lib/engines/checklist-engine", () => ({
  ChecklistEngine: {
    toggleItem: mockToggleItem,
    initializePhase3Checklist: vi.fn(),
    initializeChecklistItems: vi.fn(),
  },
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: {
    completePhase: mockCompletePhase,
    initializeExpedition: vi.fn(),
  },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: vi.fn(),
    awardBadge: vi.fn(),
    initializeProgress: vi.fn(),
  },
}));

vi.mock("@/server/services/phase-completion.service", () => ({
  PhaseCompletionService: {
    checkAndCompleteTrip: mockCheckAndCompleteTrip,
    syncPhaseStatus: mockSyncPhaseStatus,
  },
}));

vi.mock("@/server/services/expedition.service", () => ({
  ExpeditionService: {
    createExpedition: vi.fn(),
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

vi.mock("@/server/services/ai.service", () => ({
  AiService: { generateDestinationGuide: vi.fn() },
}));

vi.mock("@/server/services/ai-gateway.service", () => ({
  AiGatewayService: {
    generateGuide: vi.fn(),
    generatePlan: vi.fn(),
  },
}));

vi.mock("@/server/services/entitlement.service", () => ({
  EntitlementService: { checkEntitlement: vi.fn().mockResolvedValue({ entitled: true }) },
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

// ─── Import SUT after mocks ────────────────────────────────────────────────────

import {
  toggleChecklistItemAction,
  togglePhase3ItemAction,
  syncItineraryCompletionAction,
  syncPhase6CompletionAction,
  addCustomChecklistItemAction,
} from "@/server/actions/expedition.actions";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-wave2-act";
const USER_ID = "user-wave2-act";

function setupAuth(userId = USER_ID) {
  mockAuth.mockResolvedValue({ user: { id: userId } });
}

function mockTrip() {
  prismaMock.trip.findFirst.mockResolvedValue({ id: TRIP_ID } as never);
}

function setFlag(enabled: boolean) {
  mockFlagModule.isPhaseReorderEnabled.mockReturnValue(enabled);
}

// ─── toggleChecklistItemAction ────────────────────────────────────────────────

describe("toggleChecklistItemAction — flag-aware phaseNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockTrip();
    setFlag(false);
  });

  it("calls ChecklistEngine.toggleItem with phaseNumber=3 when flag is OFF", async () => {
    setFlag(false);
    mockToggleItem.mockResolvedValue({ completed: true, pointsAwarded: 15 });

    await toggleChecklistItemAction(TRIP_ID, "passport_valid_6m");

    expect(mockToggleItem).toHaveBeenCalledWith(
      TRIP_ID,
      USER_ID,
      3,
      "passport_valid_6m"
    );
  });

  it("calls ChecklistEngine.toggleItem with phaseNumber=6 when flag is ON", async () => {
    setFlag(true);
    mockToggleItem.mockResolvedValue({ completed: true, pointsAwarded: 15 });

    await toggleChecklistItemAction(TRIP_ID, "passport_valid_6m");

    expect(mockToggleItem).toHaveBeenCalledWith(
      TRIP_ID,
      USER_ID,
      6,
      "passport_valid_6m"
    );
  });

  it("returns success with toggle result", async () => {
    setFlag(false);
    mockToggleItem.mockResolvedValue({ completed: false, pointsAwarded: 0 });

    const result = await toggleChecklistItemAction(TRIP_ID, "emergency_contacts");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ completed: false, pointsAwarded: 0 });
  });

  it("sync uses flag-aware phaseNumber (3 when OFF)", async () => {
    setFlag(false);
    mockToggleItem.mockResolvedValue({ completed: true, pointsAwarded: 15 });

    await toggleChecklistItemAction(TRIP_ID, "passport_valid_6m");

    // syncPhaseStatus is fire-and-forget — allow slight async delay
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSyncPhaseStatus).toHaveBeenCalledWith(TRIP_ID, USER_ID, 3);
  });

  it("sync uses flag-aware phaseNumber (6 when ON)", async () => {
    setFlag(true);
    mockToggleItem.mockResolvedValue({ completed: true, pointsAwarded: 15 });

    await toggleChecklistItemAction(TRIP_ID, "passport_valid_6m");

    await new Promise((r) => setTimeout(r, 10));
    expect(mockSyncPhaseStatus).toHaveBeenCalledWith(TRIP_ID, USER_ID, 6);
  });
});

// ─── togglePhase3ItemAction — deprecated alias ────────────────────────────────

describe("togglePhase3ItemAction (deprecated alias)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockTrip();
    setFlag(false);
  });

  it("is identical to toggleChecklistItemAction", () => {
    expect(togglePhase3ItemAction).toBe(toggleChecklistItemAction);
  });

  it("still works as a call — uses phaseNumber=3 when flag OFF", async () => {
    setFlag(false);
    mockToggleItem.mockResolvedValue({ completed: true, pointsAwarded: 15 });

    await togglePhase3ItemAction(TRIP_ID, "passport_valid_6m");

    expect(mockToggleItem).toHaveBeenCalledWith(TRIP_ID, USER_ID, 3, "passport_valid_6m");
  });

  it("uses phaseNumber=6 when flag ON — follows the flag through alias", async () => {
    setFlag(true);
    mockToggleItem.mockResolvedValue({ completed: false, pointsAwarded: 0 });

    await togglePhase3ItemAction(TRIP_ID, "passport_valid_6m");

    expect(mockToggleItem).toHaveBeenCalledWith(TRIP_ID, USER_ID, 6, "passport_valid_6m");
  });
});

// ─── syncItineraryCompletionAction — flag-aware phaseNumber ──────────────────

describe("syncItineraryCompletionAction — flag-aware phaseNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockTrip();
    setFlag(false);
  });

  it("checks expeditionPhase with phaseNumber=6 when flag is OFF (original order)", async () => {
    setFlag(false);
    prismaMock.itineraryDay.count.mockResolvedValue(0 as never);

    await syncItineraryCompletionAction(TRIP_ID);

    expect(prismaMock.itineraryDay.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tripId: TRIP_ID }) })
    );
    // No days → no phase completion call
    expect(mockCompletePhase).not.toHaveBeenCalled();
  });

  it("checks expeditionPhase with phaseNumber=4 when flag is ON (new order)", async () => {
    setFlag(true);
    prismaMock.itineraryDay.count.mockResolvedValue(5 as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-4",
      phaseNumber: 4,
      status: "active",
    } as never);
    mockCompletePhase.mockResolvedValue({
      phaseNumber: 4,
      pointsEarned: 250,
      badgeAwarded: null,
      newRank: null,
      nextPhaseUnlocked: null,
    });
    mockCheckAndCompleteTrip.mockResolvedValue(false);

    await syncItineraryCompletionAction(TRIP_ID);

    expect(prismaMock.expeditionPhase.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tripId_phaseNumber: { tripId: TRIP_ID, phaseNumber: 4 } }),
      })
    );
    expect(mockCompletePhase).toHaveBeenCalledWith(TRIP_ID, USER_ID, 4);
  });

  it("uses phaseNumber=6 in completePhase call when flag is OFF", async () => {
    setFlag(false);
    prismaMock.itineraryDay.count.mockResolvedValue(5 as never);
    prismaMock.expeditionPhase.findUnique.mockResolvedValue({
      id: "phase-6",
      phaseNumber: 6,
      status: "active",
    } as never);
    mockCompletePhase.mockResolvedValue({
      phaseNumber: 6,
      pointsEarned: 300,
      badgeAwarded: null,
      newRank: null,
      nextPhaseUnlocked: null,
    });
    mockCheckAndCompleteTrip.mockResolvedValue(false);

    await syncItineraryCompletionAction(TRIP_ID);

    expect(mockCompletePhase).toHaveBeenCalledWith(TRIP_ID, USER_ID, 6);
  });
});

// ─── syncPhase6CompletionAction — deprecated alias ───────────────────────────

describe("syncPhase6CompletionAction (deprecated alias)", () => {
  it("is identical to syncItineraryCompletionAction", () => {
    expect(syncPhase6CompletionAction).toBe(syncItineraryCompletionAction);
  });
});

// ─── addCustomChecklistItemAction — uses flag-aware phase ────────────────────

describe("addCustomChecklistItemAction — flag-aware phase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    setFlag(false);
  });

  it("creates item with phaseNumber=3 when flag is OFF", async () => {
    setFlag(false);
    prismaMock.phaseChecklistItem.create.mockResolvedValue({
      id: "item-1",
      itemKey: "custom_my_item",
      required: false,
    } as never);

    await addCustomChecklistItemAction(TRIP_ID, "My Item", false);

    expect(prismaMock.phaseChecklistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phaseNumber: 3 }),
      })
    );
  });

  it("creates item with phaseNumber=6 when flag is ON", async () => {
    setFlag(true);
    prismaMock.phaseChecklistItem.create.mockResolvedValue({
      id: "item-1",
      itemKey: "custom_my_item",
      required: false,
    } as never);

    await addCustomChecklistItemAction(TRIP_ID, "My Item", false);

    expect(prismaMock.phaseChecklistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phaseNumber: 6 }),
      })
    );
  });

  it("returns error for item name shorter than 2 chars", async () => {
    const result = await addCustomChecklistItemAction(TRIP_ID, "a", false);
    expect(result.success).toBe(false);
    expect(result.error).toBe("expedition.phase3.invalidItemName");
  });
});
