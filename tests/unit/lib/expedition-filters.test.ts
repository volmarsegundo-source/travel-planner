/**
 * Unit tests for expedition filtering and sorting utilities.
 * Pure function tests — no mocks needed.
 */
import { describe, it, expect } from "vitest";
import {
  filterExpeditions,
  sortExpeditions,
  filterAndSortExpeditions,
} from "@/lib/expedition-filters";
import { deriveExpeditionStatus } from "@/types/expedition.types";
import type { ExpeditionDTO } from "@/types/expedition.types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeExpedition(overrides: Partial<ExpeditionDTO> = {}): ExpeditionDTO {
  return {
    id: "trip-1",
    destination: "Paris, France",
    currentPhase: 3,
    completedPhases: [1, 2],
    totalPhases: 6,
    coverEmoji: "\u{1F5FC}",
    startDate: "2026-06-15",
    endDate: "2026-06-25",
    status: "PLANNING",
    tripType: "international",
    destinationLat: 48.8566,
    destinationLon: 2.3522,
    checklistRequired: 5,
    checklistRequiredDone: 3,
    checklistRecommendedPending: 2,
    hasItineraryPlan: false,
    createdAt: "2026-03-01T12:00:00.000Z",
    hasChecklist: false,
    hasGuide: false,
    hasLogistics: false,
    ...overrides,
  };
}

const activeTrip = makeExpedition({
  id: "active-1",
  currentPhase: 3,
  completedPhases: [1, 2],
  destination: "Tokyo, Japan",
  createdAt: "2026-03-10T00:00:00.000Z",
  startDate: "2026-07-01",
});

const completedTrip = makeExpedition({
  id: "completed-1",
  currentPhase: 6,
  completedPhases: [1, 2, 3, 4, 5, 6],
  destination: "London, UK",
  createdAt: "2026-01-15T00:00:00.000Z",
  startDate: "2026-02-01",
  endDate: "2026-02-10",
});

const plannedTrip = makeExpedition({
  id: "planned-1",
  currentPhase: 1,
  completedPhases: [],
  destination: "Buenos Aires, Argentina",
  createdAt: "2026-03-15T00:00:00.000Z",
  startDate: null,
  endDate: null,
});

const overdueTrip = makeExpedition({
  id: "overdue-1",
  currentPhase: 2,
  completedPhases: [1],
  destination: "Rome, Italy",
  createdAt: "2026-02-01T00:00:00.000Z",
  startDate: "2025-12-01",
  endDate: "2025-12-10",
});

const allTrips = [activeTrip, completedTrip, plannedTrip, overdueTrip];

// ─── deriveExpeditionStatus ──────────────────────────────────────────────────

describe("deriveExpeditionStatus", () => {
  it("returns 'completed' when completedPhases >= totalPhases", () => {
    expect(deriveExpeditionStatus(completedTrip)).toBe("completed");
  });

  it("returns 'active' when currentPhase > 1 and not completed", () => {
    expect(deriveExpeditionStatus(activeTrip)).toBe("active");
  });

  it("returns 'planned' when currentPhase <= 1 and no start date issue", () => {
    expect(deriveExpeditionStatus(plannedTrip)).toBe("planned");
  });

  it("returns 'overdue' when startDate is in the past and not completed", () => {
    expect(deriveExpeditionStatus(overdueTrip)).toBe("overdue");
  });

  it("returns 'planned' for phase 1 even with future start date", () => {
    const trip = makeExpedition({
      currentPhase: 1,
      completedPhases: [],
      startDate: "2027-01-01",
    });
    expect(deriveExpeditionStatus(trip)).toBe("planned");
  });
});

// ─── filterExpeditions ───────────────────────────────────────────────────────

describe("filterExpeditions", () => {
  it("returns all expeditions when filter is 'all'", () => {
    const result = filterExpeditions(allTrips, "all");
    expect(result).toHaveLength(4);
  });

  it("returns only non-completed expeditions when filter is 'active'", () => {
    const result = filterExpeditions(allTrips, "active");
    // active + planned + overdue = 3
    expect(result).toHaveLength(3);
    expect(result.find((e) => e.id === "completed-1")).toBeUndefined();
  });

  it("returns only completed expeditions when filter is 'completed'", () => {
    const result = filterExpeditions(allTrips, "completed");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("completed-1");
  });

  it("returns empty array when no expeditions match filter", () => {
    const onlyActive = [activeTrip];
    const result = filterExpeditions(onlyActive, "completed");
    expect(result).toHaveLength(0);
  });

  it("returns empty array when input is empty", () => {
    const result = filterExpeditions([], "all");
    expect(result).toHaveLength(0);
  });
});

// ─── sortExpeditions ─────────────────────────────────────────────────────────

describe("sortExpeditions", () => {
  it("sorts by newest (createdAt descending)", () => {
    const result = sortExpeditions(allTrips, "newest");
    expect(result[0]!.id).toBe("planned-1"); // 2026-03-15
    expect(result[1]!.id).toBe("active-1"); // 2026-03-10
    expect(result[2]!.id).toBe("overdue-1"); // 2026-02-01
    expect(result[3]!.id).toBe("completed-1"); // 2026-01-15
  });

  it("sorts by departure (startDate ascending, nulls last)", () => {
    const result = sortExpeditions(allTrips, "departure");
    expect(result[0]!.id).toBe("overdue-1"); // 2025-12-01
    expect(result[1]!.id).toBe("completed-1"); // 2026-02-01
    expect(result[2]!.id).toBe("active-1"); // 2026-07-01
    expect(result[3]!.id).toBe("planned-1"); // null → last
  });

  it("sorts by destination (alphabetical A-Z)", () => {
    const result = sortExpeditions(allTrips, "destination");
    expect(result[0]!.destination).toBe("Buenos Aires, Argentina");
    expect(result[1]!.destination).toBe("London, UK");
    expect(result[2]!.destination).toBe("Rome, Italy");
    expect(result[3]!.destination).toBe("Tokyo, Japan");
  });

  it("does not mutate the original array", () => {
    const original = [...allTrips];
    sortExpeditions(allTrips, "newest");
    expect(allTrips).toEqual(original);
  });

  it("handles empty array", () => {
    const result = sortExpeditions([], "newest");
    expect(result).toHaveLength(0);
  });

  it("puts trips without startDate at end when sorting by departure", () => {
    const trips = [
      makeExpedition({ id: "a", startDate: null }),
      makeExpedition({ id: "b", startDate: "2026-01-01" }),
    ];
    const result = sortExpeditions(trips, "departure");
    expect(result[0]!.id).toBe("b");
    expect(result[1]!.id).toBe("a");
  });

  it("keeps order for trips with same startDate=null when sorting by departure", () => {
    const trips = [
      makeExpedition({ id: "a", startDate: null }),
      makeExpedition({ id: "b", startDate: null }),
    ];
    const result = sortExpeditions(trips, "departure");
    expect(result).toHaveLength(2);
  });
});

// ─── filterAndSortExpeditions ────────────────────────────────────────────────

describe("filterAndSortExpeditions", () => {
  it("applies both filter and sort", () => {
    const result = filterAndSortExpeditions(allTrips, "active", "destination");
    // active filter: 3 items (no completed)
    expect(result).toHaveLength(3);
    // sorted by destination A-Z
    expect(result[0]!.destination).toBe("Buenos Aires, Argentina");
    expect(result[1]!.destination).toBe("Rome, Italy");
    expect(result[2]!.destination).toBe("Tokyo, Japan");
  });

  it("returns empty when filter produces no results", () => {
    const onlyActive = [activeTrip];
    const result = filterAndSortExpeditions(onlyActive, "completed", "newest");
    expect(result).toHaveLength(0);
  });
});
