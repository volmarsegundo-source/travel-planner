import { describe, it, expect } from "vitest";
import { buildTripGeoJSON, derivePinStatus } from "@/lib/map/build-geojson";

describe("derivePinStatus", () => {
  it("returns COMPLETED when trip status is COMPLETED", () => {
    expect(derivePinStatus({ status: "COMPLETED", currentPhase: 6 })).toBe("COMPLETED");
  });

  it("returns IN_PROGRESS when currentPhase > 3", () => {
    expect(derivePinStatus({ status: "PLANNING", currentPhase: 4 })).toBe("IN_PROGRESS");
    expect(derivePinStatus({ status: "PLANNING", currentPhase: 5 })).toBe("IN_PROGRESS");
    expect(derivePinStatus({ status: "PLANNING", currentPhase: 6 })).toBe("IN_PROGRESS");
  });

  it("returns PLANNING when currentPhase is 1-3 (planning phases)", () => {
    expect(derivePinStatus({ status: "PLANNING", currentPhase: 1 })).toBe("PLANNING");
    expect(derivePinStatus({ status: "PLANNING", currentPhase: 2 })).toBe("PLANNING");
    expect(derivePinStatus({ status: "PLANNING", currentPhase: 3 })).toBe("PLANNING");
  });

  it("returns COMPLETED even if currentPhase is low (status takes priority)", () => {
    expect(derivePinStatus({ status: "COMPLETED", currentPhase: 1 })).toBe("COMPLETED");
  });
});

describe("buildTripGeoJSON", () => {
  const baseTripData = {
    id: "trip-1",
    destination: "Tokyo",
    currentPhase: 3,
    status: "PLANNING",
    startDate: "2026-04-01",
    endDate: "2026-04-10",
    coverEmoji: "🗼",
    destinationLat: 35.68,
    destinationLon: 139.69,
  };

  it("builds a valid GeoJSON FeatureCollection", () => {
    const result = buildTripGeoJSON([baseTripData]);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
    expect(result.features[0]!.type).toBe("Feature");
    expect(result.features[0]!.geometry.type).toBe("Point");
  });

  it("uses [lon, lat] order in GeoJSON coordinates (critical)", () => {
    const result = buildTripGeoJSON([baseTripData]);
    const [lon, lat] = result.features[0]!.geometry.coordinates;
    // GeoJSON: [longitude, latitude]
    expect(lon).toBe(139.69);
    expect(lat).toBe(35.68);
  });

  it("skips trips with null latitude", () => {
    const result = buildTripGeoJSON([
      { ...baseTripData, destinationLat: null },
    ]);
    expect(result.features).toHaveLength(0);
  });

  it("skips trips with null longitude", () => {
    const result = buildTripGeoJSON([
      { ...baseTripData, destinationLon: null },
    ]);
    expect(result.features).toHaveLength(0);
  });

  it("skips trips with both null coordinates", () => {
    const result = buildTripGeoJSON([
      { ...baseTripData, destinationLat: null, destinationLon: null },
    ]);
    expect(result.features).toHaveLength(0);
  });

  it("includes all trips with valid coordinates", () => {
    const trips = [
      baseTripData,
      { ...baseTripData, id: "trip-2", destinationLat: -33.86, destinationLon: 151.20 },
      { ...baseTripData, id: "trip-3", destinationLat: null, destinationLon: null },
    ];
    const result = buildTripGeoJSON(trips);
    expect(result.features).toHaveLength(2);
  });

  it("correctly maps status to pin status", () => {
    const completed = { ...baseTripData, status: "COMPLETED", currentPhase: 6 };
    const result = buildTripGeoJSON([completed]);
    expect(result.features[0]!.properties.status).toBe("COMPLETED");
  });

  it("converts Date startDate to string", () => {
    const trip = {
      ...baseTripData,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-10"),
    };
    const result = buildTripGeoJSON([trip]);
    expect(result.features[0]!.properties.startDate).toBe("2026-04-01");
    expect(result.features[0]!.properties.endDate).toBe("2026-04-10");
  });

  it("handles null dates", () => {
    const trip = { ...baseTripData, startDate: null, endDate: null };
    const result = buildTripGeoJSON([trip]);
    expect(result.features[0]!.properties.startDate).toBeNull();
    expect(result.features[0]!.properties.endDate).toBeNull();
  });

  it("returns empty FeatureCollection for empty input", () => {
    const result = buildTripGeoJSON([]);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });

  it("preserves trip properties in feature", () => {
    const result = buildTripGeoJSON([baseTripData]);
    const props = result.features[0]!.properties;
    expect(props.tripId).toBe("trip-1");
    expect(props.destination).toBe("Tokyo");
    expect(props.coverEmoji).toBe("🗼");
    expect(props.currentPhase).toBe(3);
  });
});
