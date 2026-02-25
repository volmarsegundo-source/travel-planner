import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (vi.hoisted runs before vi.mock factories) ─────────────────

const { mockTrip, mockRedis } = vi.hoisted(() => {
  const mockTrip = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  };
  return { mockTrip, mockRedis };
});

vi.mock("@/server/db/client", () => ({ db: { trip: mockTrip } }));
vi.mock("@/server/cache/client", () => ({ redis: mockRedis }));
vi.mock("@/server/cache/keys", () => ({
  CacheKeys: { userTrips: (id: string) => `cache:user-trips:${id}` },
  CacheTTL: { USER_TRIPS: 300 },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  listTrips,
  getTripById,
  createTrip,
  updateTrip,
  archiveTrip,
  deleteTrip,
} from "../trip.service";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TRIP_FIXTURE = {
  id: "trip-1",
  title: "Férias em Lisboa",
  destinationName: "Lisboa, Portugal",
  startDate: new Date("2025-07-01"),
  endDate: new Date("2025-07-10"),
  travelers: 2,
  status: "PLANNING" as const,
  coverGradient: "sunset",
  coverEmoji: "🏖️",
  travelStyle: "CULTURE",
  budgetTotal: 5000,
  budgetCurrency: "BRL",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const USER_ID = "user-abc";

// ── listTrips ─────────────────────────────────────────────────────────────────

describe("listTrips", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached result when available (page 1, pageSize 20)", async () => {
    const cached = { trips: [TRIP_FIXTURE], total: 1 };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await listTrips(USER_ID);

    // Dates are serialized as strings via JSON; check key fields instead
    expect(result.total).toBe(1);
    expect(result.trips[0]?.id).toBe(TRIP_FIXTURE.id);
    expect(result.trips[0]?.title).toBe(TRIP_FIXTURE.title);
    expect(mockTrip.findMany).not.toHaveBeenCalled();
  });

  it("queries DB and caches result on cache miss (page 1)", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockTrip.findMany.mockResolvedValue([TRIP_FIXTURE]);
    mockTrip.count.mockResolvedValue(1);
    mockRedis.setex.mockResolvedValue("OK");

    const result = await listTrips(USER_ID);

    expect(result.trips).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockRedis.setex).toHaveBeenCalledWith(
      `cache:user-trips:${USER_ID}`,
      300,
      expect.any(String),
    );
  });

  it("does not write to cache for page > 1", async () => {
    // Service still reads cache (for potential hit) but never writes for page > 1
    mockRedis.get.mockResolvedValue(null);
    mockTrip.findMany.mockResolvedValue([TRIP_FIXTURE]);
    mockTrip.count.mockResolvedValue(25);

    await listTrips(USER_ID, { page: 2, pageSize: 20 });

    expect(mockRedis.setex).not.toHaveBeenCalled();
    expect(mockTrip.findMany).toHaveBeenCalled();
  });

  it("queries DB with userId and deletedAt:null (BOLA-safe)", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockTrip.findMany.mockResolvedValue([]);
    mockTrip.count.mockResolvedValue(0);

    await listTrips(USER_ID);

    expect(mockTrip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID, deletedAt: null }),
      }),
    );
  });
});

// ── getTripById ───────────────────────────────────────────────────────────────

describe("getTripById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the trip when found", async () => {
    mockTrip.findUnique.mockResolvedValue(TRIP_FIXTURE);
    expect(await getTripById("trip-1", USER_ID)).toEqual(TRIP_FIXTURE);
  });

  it("throws NOT_FOUND when trip is absent", async () => {
    mockTrip.findUnique.mockResolvedValue(null);
    await expect(getTripById("missing", USER_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("includes userId in where clause (BOLA-safe)", async () => {
    mockTrip.findUnique.mockResolvedValue(TRIP_FIXTURE);
    await getTripById("trip-1", USER_ID);
    expect(mockTrip.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });
});

// ── createTrip ────────────────────────────────────────────────────────────────

describe("createTrip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a trip and invalidates cache", async () => {
    mockTrip.count.mockResolvedValue(0);
    mockTrip.create.mockResolvedValue({ ...TRIP_FIXTURE, id: "new-trip" });
    mockRedis.del.mockResolvedValue(1);

    const result = await createTrip(USER_ID, {
      title: "Férias em Lisboa",
      destinationName: "Lisboa, Portugal",
      travelers: 2,
      budgetCurrency: "BRL",
      coverGradient: "sunset",
    });

    expect(result.id).toBe("new-trip");
    expect(mockRedis.del).toHaveBeenCalledWith(`cache:user-trips:${USER_ID}`);
  });

  it("throws TRIP_LIMIT_REACHED when user has 20 active trips", async () => {
    mockTrip.count.mockResolvedValue(20);

    await expect(
      createTrip(USER_ID, {
        title: "Trip 21",
        destinationName: "Somewhere",
        travelers: 1,
        budgetCurrency: "BRL",
        coverGradient: "ocean",
      }),
    ).rejects.toMatchObject({ code: "TRIP_LIMIT_REACHED" });

    expect(mockTrip.create).not.toHaveBeenCalled();
  });

  it("creates with status=PLANNING and visibility=PRIVATE", async () => {
    mockTrip.count.mockResolvedValue(5);
    mockTrip.create.mockResolvedValue(TRIP_FIXTURE);
    mockRedis.del.mockResolvedValue(1);

    await createTrip(USER_ID, {
      title: "Test",
      destinationName: "Paris",
      travelers: 1,
      budgetCurrency: "BRL",
      coverGradient: "city",
    });

    expect(mockTrip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PLANNING",
          visibility: "PRIVATE",
        }),
      }),
    );
  });
});

// ── updateTrip ────────────────────────────────────────────────────────────────

describe("updateTrip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates trip and invalidates cache", async () => {
    mockTrip.findUnique
      .mockResolvedValueOnce({ id: "trip-1" }) // assertOwnership
      .mockResolvedValueOnce(null); // no status field in data → no status check
    mockTrip.update.mockResolvedValue({ ...TRIP_FIXTURE, title: "Updated" });
    mockRedis.del.mockResolvedValue(1);

    const result = await updateTrip("trip-1", USER_ID, { title: "Updated" });

    expect(result.title).toBe("Updated");
    expect(mockRedis.del).toHaveBeenCalled();
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);
    await expect(
      updateTrip("trip-1", "other-user", { title: "Hack" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── archiveTrip ───────────────────────────────────────────────────────────────

describe("archiveTrip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("archives a PLANNING trip successfully", async () => {
    mockTrip.findUnique
      .mockResolvedValueOnce({ id: "trip-1" }) // ownership
      .mockResolvedValueOnce({ status: "PLANNING" }); // current status
    mockTrip.update.mockResolvedValue({ ...TRIP_FIXTURE, status: "ARCHIVED" });
    mockRedis.del.mockResolvedValue(1);

    await archiveTrip("trip-1", USER_ID);

    expect(mockTrip.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "ARCHIVED" } }),
    );
  });

  it("throws when archiving an already-ARCHIVED trip", async () => {
    mockTrip.findUnique
      .mockResolvedValueOnce({ id: "trip-1" })
      .mockResolvedValueOnce({ status: "ARCHIVED" });

    await expect(archiveTrip("trip-1", USER_ID)).rejects.toThrow();
  });
});

// ── deleteTrip (soft delete) ──────────────────────────────────────────────────

describe("deleteTrip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("soft-deletes when confirmTitle matches", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: "trip-1", title: "Férias em Lisboa" });
    mockTrip.update.mockResolvedValue(TRIP_FIXTURE);
    mockRedis.del.mockResolvedValue(1);

    await deleteTrip("trip-1", USER_ID, "Férias em Lisboa");

    expect(mockTrip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it("throws when confirmTitle does not match", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: "trip-1", title: "Férias em Lisboa" });

    await expect(deleteTrip("trip-1", USER_ID, "Wrong")).rejects.toThrow(
      "Confirmation title does not match",
    );
    expect(mockTrip.update).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when trip does not exist", async () => {
    mockTrip.findUnique.mockResolvedValue(null);
    await expect(deleteTrip("missing", USER_ID, "Any")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
