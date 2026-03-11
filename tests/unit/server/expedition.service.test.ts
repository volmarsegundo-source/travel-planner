/**
 * Unit tests for ExpeditionService.
 *
 * Mocks Prisma, PointsEngine, and PhaseEngine so tests run in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    initializeProgress: vi.fn(),
    earnPoints: vi.fn(),
    awardBadge: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/engines/phase-engine", () => ({
  PhaseEngine: {
    completePhase: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { ExpeditionService } from "@/server/services/expedition.service";
import { db } from "@/server/db";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PhaseEngine } from "@/lib/engines/phase-engine";
import { AppError } from "@/lib/errors";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpeditionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createExpedition", () => {
    const validInput = {
      destination: "Tokyo",
      travelers: 2,
      flexibleDates: false,
    };

    it("creates expedition and returns tripId + phaseResult", async () => {
      prismaMock.trip.count.mockResolvedValue(0);

      // Mock $transaction to execute the callback
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const txMock = mockDeep<PrismaClient>();
        txMock.trip.create.mockResolvedValue({
          id: "trip-new",
          userId: "user-1",
          title: "Tokyo",
          destination: "Tokyo",
          expeditionMode: true,
          currentPhase: 1,
        } as any);
        txMock.expeditionPhase.createMany.mockResolvedValue({ count: 8 });
        txMock.expeditionPhase.update.mockResolvedValue({} as any);
        txMock.trip.update.mockResolvedValue({} as any);

        return fn(txMock);
      });

      const result = await ExpeditionService.createExpedition("user-1", validInput);

      expect(result.tripId).toBe("trip-new");
      expect(result.phaseResult.phaseNumber).toBe(1);
      expect(result.phaseResult.pointsEarned).toBe(100);
      expect(result.phaseResult.badgeAwarded).toBe("first_step");
      expect(result.phaseResult.nextPhaseUnlocked).toBe(2);
    });

    it("throws MAX_TRIPS_REACHED when user has too many trips", async () => {
      prismaMock.trip.count.mockResolvedValue(20);

      await expect(
        ExpeditionService.createExpedition("user-1", validInput)
      ).rejects.toThrow(AppError);

      await expect(
        ExpeditionService.createExpedition("user-1", validInput)
      ).rejects.toThrow("trips.errors.maxTripsReached");
    });

    it("calls PointsEngine.initializeProgress within transaction", async () => {
      prismaMock.trip.count.mockResolvedValue(0);
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const txMock = mockDeep<PrismaClient>();
        txMock.trip.create.mockResolvedValue({ id: "trip-x" } as any);
        txMock.expeditionPhase.createMany.mockResolvedValue({ count: 8 });
        txMock.expeditionPhase.update.mockResolvedValue({} as any);
        txMock.trip.update.mockResolvedValue({} as any);
        return fn(txMock);
      });

      await ExpeditionService.createExpedition("user-1", validInput);

      expect(PointsEngine.initializeProgress).toHaveBeenCalledWith(
        "user-1",
        expect.anything()
      );
    });

    it("awards first_step badge via PointsEngine", async () => {
      prismaMock.trip.count.mockResolvedValue(0);
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const txMock = mockDeep<PrismaClient>();
        txMock.trip.create.mockResolvedValue({ id: "trip-x" } as any);
        txMock.expeditionPhase.createMany.mockResolvedValue({ count: 8 });
        txMock.expeditionPhase.update.mockResolvedValue({} as any);
        txMock.trip.update.mockResolvedValue({} as any);
        return fn(txMock);
      });

      await ExpeditionService.createExpedition("user-1", validInput);

      expect(PointsEngine.awardBadge).toHaveBeenCalledWith(
        "user-1",
        "first_step",
        expect.anything()
      );
    });

    it("creates 8 expedition phases within transaction", async () => {
      prismaMock.trip.count.mockResolvedValue(0);

      let capturedPhases: any;
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const txMock = mockDeep<PrismaClient>();
        txMock.trip.create.mockResolvedValue({ id: "trip-x" } as any);
        txMock.expeditionPhase.createMany.mockImplementation((async (args: any) => {
          capturedPhases = args.data;
          return { count: 8 };
        }) as any);
        txMock.expeditionPhase.update.mockResolvedValue({} as any);
        txMock.trip.update.mockResolvedValue({} as any);
        return fn(txMock);
      });

      await ExpeditionService.createExpedition("user-1", validInput);

      expect(capturedPhases).toHaveLength(8);
      expect(capturedPhases[0].status).toBe("active");
      expect(capturedPhases[1].status).toBe("locked");
      expect(capturedPhases[7].status).toBe("locked");
    });
  });

  describe("createExpedition — tripType classification", () => {
    function setupTxMock() {
      let capturedTripData: Record<string, unknown> | undefined;
      prismaMock.trip.count.mockResolvedValue(0);
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const txMock = mockDeep<PrismaClient>();
        txMock.trip.create.mockImplementation((async (args: any) => {
          capturedTripData = args.data;
          return { id: "trip-classified", ...args.data };
        }) as any);
        txMock.expeditionPhase.createMany.mockResolvedValue({ count: 8 });
        txMock.expeditionPhase.update.mockResolvedValue({} as any);
        txMock.trip.update.mockResolvedValue({} as any);
        return fn(txMock);
      });
      return () => capturedTripData;
    }

    it("sets tripType to domestic when origin and dest codes match", async () => {
      const getData = setupTxMock();
      await ExpeditionService.createExpedition("user-1", {
        destination: "Sao Paulo",
        flexibleDates: false,
        originCountryCode: "BR",
        destinationCountryCode: "BR",
      });
      expect(getData()?.tripType).toBe("domestic");
    });

    it("sets tripType to mercosul for BR → AR", async () => {
      const getData = setupTxMock();
      await ExpeditionService.createExpedition("user-1", {
        destination: "Buenos Aires",
        flexibleDates: false,
        originCountryCode: "BR",
        destinationCountryCode: "AR",
      });
      expect(getData()?.tripType).toBe("mercosul");
    });

    it("sets tripType to schengen for BR → DE", async () => {
      const getData = setupTxMock();
      await ExpeditionService.createExpedition("user-1", {
        destination: "Berlin",
        flexibleDates: false,
        originCountryCode: "BR",
        destinationCountryCode: "DE",
      });
      expect(getData()?.tripType).toBe("schengen");
    });

    it("sets tripType to international for BR → JP", async () => {
      const getData = setupTxMock();
      await ExpeditionService.createExpedition("user-1", {
        destination: "Tokyo",
        flexibleDates: false,
        originCountryCode: "BR",
        destinationCountryCode: "JP",
      });
      expect(getData()?.tripType).toBe("international");
    });

    it("defaults to international when only destinationCountryCode is provided", async () => {
      const getData = setupTxMock();
      await ExpeditionService.createExpedition("user-1", {
        destination: "Tokyo",
        flexibleDates: false,
        destinationCountryCode: "JP",
      });
      expect(getData()?.tripType).toBe("international");
    });

    it("does not set tripType when no country codes are provided", async () => {
      const getData = setupTxMock();
      await ExpeditionService.createExpedition("user-1", {
        destination: "Tokyo",
        flexibleDates: false,
      });
      expect(getData()?.tripType).toBeUndefined();
    });
  });

  describe("completePhase2", () => {
    const validPhase2Input = {
      travelerType: "solo" as const,
      accommodationStyle: "comfort" as const,
      travelPace: 5,
      budget: 3000,
      currency: "USD" as const,
    };

    it("delegates to PhaseEngine.completePhase with correct args", async () => {
      const expectedResult = {
        phaseNumber: 2 as const,
        pointsEarned: 150,
        badgeAwarded: null,
        newRank: "explorer" as const,
        nextPhaseUnlocked: 3 as const,
      };

      (PhaseEngine.completePhase as any).mockResolvedValue(expectedResult);

      const result = await ExpeditionService.completePhase2(
        "trip-1",
        "user-1",
        validPhase2Input
      );

      expect(PhaseEngine.completePhase).toHaveBeenCalledWith(
        "trip-1",
        "user-1",
        2,
        {
          travelerType: "solo",
          accommodationStyle: "comfort",
          travelPace: 5,
          budget: 3000,
          currency: "USD",
        }
      );
      expect(result.pointsEarned).toBe(150);
      expect(result.newRank).toBe("explorer");
    });

    it("propagates errors from PhaseEngine", async () => {
      (PhaseEngine.completePhase as any).mockRejectedValue(
        new AppError("PHASE_NOT_ACTIVE", "Phase 2 is not active", 400)
      );

      await expect(
        ExpeditionService.completePhase2("trip-1", "user-1", validPhase2Input)
      ).rejects.toThrow("Phase 2 is not active");
    });
  });
});
