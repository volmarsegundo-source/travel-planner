/**
 * Unit tests for itinerary-persistence.service.ts (T-S19-001b).
 *
 * Tests cover:
 * - parseItineraryJson: valid JSON, invalid JSON, markdown code fences, partial JSON
 * - persistItinerary: transaction with delete + create
 * - acquireGenerationLock / releaseGenerationLock
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn().mockReturnValue("hashed-id"),
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import {
  parseItineraryJson,
  persistItinerary,
  acquireGenerationLock,
  releaseGenerationLock,
} from "@/server/services/itinerary-persistence.service";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_PLAN = {
  destination: "Tokyo, Japan",
  totalDays: 3,
  estimatedBudgetUsed: 1500,
  currency: "USD",
  days: [
    {
      dayNumber: 1,
      date: "2026-06-01",
      theme: "Arrival",
      activities: [
        {
          title: "Check in",
          description: "Hotel check-in",
          startTime: "14:00",
          endTime: "15:00",
          estimatedCost: 0,
          activityType: "ACCOMMODATION" as const,
        },
      ],
    },
    {
      dayNumber: 2,
      date: "2026-06-02",
      theme: "Exploration",
      activities: [],
    },
  ],
  tips: ["Carry cash"],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("itinerary-persistence.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── parseItineraryJson ──────────────────────────────────────────────────

  describe("parseItineraryJson", () => {
    it("parses valid JSON into ItineraryPlan", () => {
      const result = parseItineraryJson(JSON.stringify(VALID_PLAN));
      expect(result).not.toBeNull();
      expect(result!.destination).toBe("Tokyo, Japan");
      expect(result!.days).toHaveLength(2);
      expect(result!.days[0].activities).toHaveLength(1);
    });

    it("returns null for invalid JSON", () => {
      expect(parseItineraryJson("not json at all")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseItineraryJson("")).toBeNull();
    });

    it("returns null for valid JSON that fails schema validation", () => {
      const invalid = JSON.stringify({ destination: "Test", missing: "fields" });
      expect(parseItineraryJson(invalid)).toBeNull();
    });

    it("extracts JSON from markdown code fences", () => {
      const wrapped = "```json\n" + JSON.stringify(VALID_PLAN) + "\n```";
      const result = parseItineraryJson(wrapped);
      expect(result).not.toBeNull();
      expect(result!.destination).toBe("Tokyo, Japan");
    });

    it("extracts JSON object from mixed content", () => {
      const mixed = "Here is the plan:\n" + JSON.stringify(VALID_PLAN) + "\nDone!";
      const result = parseItineraryJson(mixed);
      expect(result).not.toBeNull();
      expect(result!.destination).toBe("Tokyo, Japan");
    });

    it("returns null when JSON object is valid but not an itinerary plan", () => {
      const result = parseItineraryJson('{"name": "test"}');
      expect(result).toBeNull();
    });
  });

  // ─── persistItinerary ──────────────────────────────────────────────────

  describe("persistItinerary", () => {
    beforeEach(() => {
      // Wave 4: persistItinerary pre-fetches destinations so day.city can be
      // resolved to a Destination.id. Tests that don't care about multi-city
      // default to an empty list — the implementation falls back to null
      // destinationId and preserves the legacy single-city behavior.
      prismaMock.destination.findMany.mockResolvedValue([] as never);
    });

    it("creates days and activities in a transaction", async () => {
      const mockTx = {
        itineraryDay: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({ id: "day-1" }),
        },
        activity: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      await persistItinerary("trip-1", VALID_PLAN);

      expect(mockTx.itineraryDay.deleteMany).toHaveBeenCalledWith({
        where: { tripId: "trip-1" },
      });
      // Called once per day
      expect(mockTx.itineraryDay.create).toHaveBeenCalledTimes(2);
      // Only day 1 has activities
      expect(mockTx.activity.createMany).toHaveBeenCalledTimes(1);
    });

    it("deletes existing days before creating new ones (upsert semantics)", async () => {
      const callOrder: string[] = [];
      const mockTx = {
        itineraryDay: {
          deleteMany: vi.fn().mockImplementation(() => {
            callOrder.push("deleteMany");
            return Promise.resolve({ count: 3 });
          }),
          create: vi.fn().mockImplementation(() => {
            callOrder.push("create");
            return Promise.resolve({ id: "day-new" });
          }),
        },
        activity: {
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      await persistItinerary("trip-1", VALID_PLAN);

      expect(callOrder[0]).toBe("deleteMany");
      expect(callOrder[1]).toBe("create");
    });

    it("does not call createMany for days with no activities", async () => {
      const planNoActivities = {
        ...VALID_PLAN,
        days: [
          { dayNumber: 1, date: "2026-06-01", theme: "Rest", activities: [] },
        ],
      };

      const mockTx = {
        itineraryDay: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({ id: "day-1" }),
        },
        activity: {
          createMany: vi.fn(),
        },
      };

      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      await persistItinerary("trip-1", planNoActivities);

      expect(mockTx.activity.createMany).not.toHaveBeenCalled();
    });
  });

  // ─── acquireGenerationLock / releaseGenerationLock ───────────────────────

  describe("acquireGenerationLock", () => {
    it("returns true when lock is acquired (NX returns OK)", async () => {
      const mockRedis = { set: vi.fn().mockResolvedValue("OK") };
      const result = await acquireGenerationLock("trip-1", mockRedis);
      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "lock:plan:trip-1",
        "1",
        "EX",
        300,
        "NX",
      );
    });

    it("returns false when lock already exists (NX returns null)", async () => {
      const mockRedis = { set: vi.fn().mockResolvedValue(null) };
      const result = await acquireGenerationLock("trip-1", mockRedis);
      expect(result).toBe(false);
    });
  });

  describe("releaseGenerationLock", () => {
    it("deletes the lock key", async () => {
      const mockRedis = { del: vi.fn().mockResolvedValue(1) };
      await releaseGenerationLock("trip-1", mockRedis);
      expect(mockRedis.del).toHaveBeenCalledWith("lock:plan:trip-1");
    });
  });
});
