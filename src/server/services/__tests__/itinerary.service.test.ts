import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (vi.hoisted runs before vi.mock factories) ─────────────────

const { mockTrip, mockItineraryDay, mockActivity, mockTransaction } = vi.hoisted(() => {
  const mockTrip = { findUnique: vi.fn() };
  const mockItineraryDay = {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  };
  const mockActivity = {
    createMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  // Mock $transaction so it executes the callback synchronously
  const mockTransaction = vi.fn(async (callbackOrArray: unknown) => {
    if (typeof callbackOrArray === "function") {
      return callbackOrArray({
        itineraryDay: mockItineraryDay,
        activity: mockActivity,
      });
    }
    // Array mode: execute each promise in sequence
    const results = [];
    for (const p of callbackOrArray as Array<Promise<unknown>>) {
      results.push(await p);
    }
    return results;
  });
  return { mockTrip, mockItineraryDay, mockActivity, mockTransaction };
});

vi.mock("@/server/db/client", () => ({
  db: {
    trip: mockTrip,
    itineraryDay: mockItineraryDay,
    activity: mockActivity,
    $transaction: mockTransaction,
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  saveItineraryPlan,
  getItineraryPlan,
  addActivity,
  deleteActivity,
  reorderActivities,
} from "../itinerary.service";
import type { ItineraryPlan } from "@/types/ai.types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const TRIP_ID = "trip-123";
const DAY_ID = "day-456";
const ACTIVITY_ID = "act-789";

const PLAN_FIXTURE: ItineraryPlan = {
  destination: "Lisboa, Portugal",
  totalDays: 2,
  travelStyle: "CULTURE",
  highlights: ["Torre de Belém"],
  days: [
    {
      dayNumber: 1,
      date: "2025-07-01",
      theme: "Chegada",
      activities: [
        {
          time: "15:00",
          title: "Check-in no hotel",
          description: "Instalação no hotel.",
          category: "ACCOMMODATION",
          estimatedCost: 0,
        },
      ],
    },
    {
      dayNumber: 2,
      theme: "Exploração",
      activities: [
        {
          title: "Torre de Belém",
          description: "Visita ao monumento histórico.",
          category: "SIGHTSEEING",
        },
        {
          title: "Almoço em Alfama",
          description: "Restaurante típico português.",
          category: "FOOD",
          estimatedCost: 30,
        },
      ],
    },
  ],
};

// ── saveItineraryPlan ─────────────────────────────────────────────────────────

describe("saveItineraryPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.create.mockImplementation(({ data }: { data: { dayNumber: number } }) =>
      Promise.resolve({ id: `day-${data.dayNumber}` }),
    );
    mockItineraryDay.deleteMany.mockResolvedValue({ count: 0 });
    mockActivity.createMany.mockResolvedValue({ count: 1 });
  });

  it("asserts ownership before writing", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("deletes existing days before creating new ones (inside transaction)", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    expect(mockItineraryDay.deleteMany).toHaveBeenCalledWith({ where: { tripId: TRIP_ID } });
  });

  it("creates one ItineraryDay row per DayPlan", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    expect(mockItineraryDay.create).toHaveBeenCalledTimes(2);
    expect(mockItineraryDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dayNumber: 1, tripId: TRIP_ID, title: "Chegada" }),
      }),
    );
    expect(mockItineraryDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dayNumber: 2, tripId: TRIP_ID, title: "Exploração" }),
      }),
    );
  });

  it("creates Activity rows for each activity in each day", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    // Day 1 has 1 activity, day 2 has 2 activities
    expect(mockActivity.createMany).toHaveBeenCalledTimes(2);
  });

  it("maps AI SIGHTSEEING category to DB ATTRACTION type", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    const day2Call = mockActivity.createMany.mock.calls[1] as [{ data: Array<{ type: string }> }];
    const attractionActivity = day2Call[0].data.find((a) => a.type === "ATTRACTION");
    expect(attractionActivity).toBeDefined();
  });

  it("maps AI FOOD category to DB RESTAURANT type", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    const day2Call = mockActivity.createMany.mock.calls[1] as [{ data: Array<{ type: string }> }];
    const restaurantActivity = day2Call[0].data.find((a) => a.type === "RESTAURANT");
    expect(restaurantActivity).toBeDefined();
  });

  it("maps AI ACCOMMODATION category to DB ACCOMMODATION type", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    const day1Call = mockActivity.createMany.mock.calls[0] as [{ data: Array<{ type: string }> }];
    const accommodationActivity = day1Call[0].data.find((a) => a.type === "ACCOMMODATION");
    expect(accommodationActivity).toBeDefined();
  });

  it("parses date string to Date object for days that have a date", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    expect(mockItineraryDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: new Date("2025-07-01"),
        }),
      }),
    );
  });

  it("sets date to null for days without a date", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    expect(mockItineraryDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dayNumber: 2,
          date: null,
        }),
      }),
    );
  });

  it("assigns orderIndex based on activity position within the day", async () => {
    await saveItineraryPlan(TRIP_ID, USER_ID, PLAN_FIXTURE);

    const day2Call = mockActivity.createMany.mock.calls[1] as [{ data: Array<{ orderIndex: number; title: string }> }];
    expect(day2Call[0].data[0]!.orderIndex).toBe(0);
    expect(day2Call[0].data[1]!.orderIndex).toBe(1);
  });
});

// ── getItineraryPlan ──────────────────────────────────────────────────────────

describe("getItineraryPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no ItineraryDay rows exist for the trip", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.findMany.mockResolvedValue([]);

    const result = await getItineraryPlan(TRIP_ID, USER_ID);

    expect(result).toBeNull();
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(getItineraryPlan(TRIP_ID, "other-user")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns a mapped ItineraryPlan with correct day count when days exist", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.findMany.mockResolvedValue([
      {
        id: DAY_ID,
        dayNumber: 1,
        date: new Date("2025-07-01"),
        title: "Chegada",
        activities: [
          {
            id: ACTIVITY_ID,
            title: "Check-in",
            description: "Hotel check-in",
            startTime: "15:00",
            type: "ACCOMMODATION",
            estimatedCost: null,
            orderIndex: 0,
          },
        ],
      },
    ]);

    const result = await getItineraryPlan(TRIP_ID, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.totalDays).toBe(1);
    expect(result!.days).toHaveLength(1);
    expect(result!.days[0]!.dayNumber).toBe(1);
    expect(result!.days[0]!.theme).toBe("Chegada");
  });

  it("maps DB ATTRACTION type back to SIGHTSEEING AI category", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.findMany.mockResolvedValue([
      {
        id: DAY_ID,
        dayNumber: 1,
        date: null,
        title: null,
        activities: [
          {
            id: ACTIVITY_ID,
            title: "Torre de Belém",
            description: "Monumento histórico",
            startTime: null,
            type: "ATTRACTION",
            estimatedCost: null,
            orderIndex: 0,
          },
        ],
      },
    ]);

    const result = await getItineraryPlan(TRIP_ID, USER_ID);

    expect(result!.days[0]!.activities[0]!.category).toBe("SIGHTSEEING");
  });

  it("maps DB RESTAURANT type back to FOOD AI category", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.findMany.mockResolvedValue([
      {
        id: DAY_ID,
        dayNumber: 1,
        date: null,
        title: null,
        activities: [
          {
            id: ACTIVITY_ID,
            title: "Jantar",
            description: "Restaurante típico",
            startTime: null,
            type: "RESTAURANT",
            estimatedCost: "25.00",
            orderIndex: 0,
          },
        ],
      },
    ]);

    const result = await getItineraryPlan(TRIP_ID, USER_ID);

    expect(result!.days[0]!.activities[0]!.category).toBe("FOOD");
    expect(result!.days[0]!.activities[0]!.estimatedCost).toBe(25);
  });

  it("queries with deletedAt: null on activities (BOLA-safe)", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.findMany.mockResolvedValue([]);

    await getItineraryPlan(TRIP_ID, USER_ID);

    expect(mockItineraryDay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tripId: TRIP_ID },
        include: expect.objectContaining({
          activities: expect.objectContaining({
            where: { deletedAt: null },
          }),
        }),
      }),
    );
  });
});

// ── addActivity ───────────────────────────────────────────────────────────────

describe("addActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockItineraryDay.findUnique.mockResolvedValue({ id: DAY_ID, tripId: TRIP_ID });
    mockActivity.findFirst.mockResolvedValue(null);
    mockActivity.create.mockResolvedValue({ id: "new-act" });
  });

  it("throws FORBIDDEN when trip not owned by user", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(
      addActivity(DAY_ID, TRIP_ID, USER_ID, { title: "New Activity" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when day does not belong to the trip", async () => {
    mockItineraryDay.findUnique.mockResolvedValue({ id: DAY_ID, tripId: "other-trip" });

    await expect(
      addActivity(DAY_ID, TRIP_ID, USER_ID, { title: "New Activity" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates activity with orderIndex 0 when no existing activities", async () => {
    mockActivity.findFirst.mockResolvedValue(null);

    await addActivity(DAY_ID, TRIP_ID, USER_ID, { title: "New Activity", category: "LEISURE" });

    expect(mockActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderIndex: 0, type: "FREE_TIME" }),
      }),
    );
  });

  it("creates activity with orderIndex = lastIndex + 1 when activities exist", async () => {
    mockActivity.findFirst.mockResolvedValue({ orderIndex: 4 });

    await addActivity(DAY_ID, TRIP_ID, USER_ID, { title: "New Activity" });

    expect(mockActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderIndex: 5 }),
      }),
    );
  });
});

// ── deleteActivity ────────────────────────────────────────────────────────────

describe("deleteActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockActivity.findUnique.mockResolvedValue({
      id: ACTIVITY_ID,
      day: { tripId: TRIP_ID },
    });
    mockActivity.update.mockResolvedValue({});
  });

  it("throws FORBIDDEN when trip not owned by user", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(deleteActivity(ACTIVITY_ID, TRIP_ID, USER_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when activity does not belong to trip", async () => {
    mockActivity.findUnique.mockResolvedValue({
      id: ACTIVITY_ID,
      day: { tripId: "other-trip" },
    });

    await expect(deleteActivity(ACTIVITY_ID, TRIP_ID, USER_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("soft-deletes the activity by setting deletedAt", async () => {
    await deleteActivity(ACTIVITY_ID, TRIP_ID, USER_ID);

    expect(mockActivity.update).toHaveBeenCalledWith({
      where: { id: ACTIVITY_ID },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

// ── reorderActivities ─────────────────────────────────────────────────────────

describe("reorderActivities", () => {
  const updates = [
    { id: "act-1", orderIndex: 0 },
    { id: "act-2", orderIndex: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockActivity.findMany.mockResolvedValue([
      { id: "act-1", day: { tripId: TRIP_ID } },
      { id: "act-2", day: { tripId: TRIP_ID } },
    ]);
    mockActivity.update.mockResolvedValue({});
  });

  it("throws FORBIDDEN when trip not owned by user", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(reorderActivities(TRIP_ID, USER_ID, updates)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when any activity does not belong to the trip", async () => {
    mockActivity.findMany.mockResolvedValue([
      { id: "act-1", day: { tripId: "other-trip" } },
      { id: "act-2", day: { tripId: TRIP_ID } },
    ]);

    await expect(reorderActivities(TRIP_ID, USER_ID, updates)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("runs updates inside a transaction", async () => {
    await reorderActivities(TRIP_ID, USER_ID, updates);

    expect(mockTransaction).toHaveBeenCalled();
  });
});
