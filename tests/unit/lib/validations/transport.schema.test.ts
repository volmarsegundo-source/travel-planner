/**
 * Unit tests for TransportSegmentSchema, AccommodationSchema, and related types.
 */
import { describe, it, expect } from "vitest";
import {
  TransportSegmentSchema,
  AccommodationSchema,
  TransportTypeSchema,
  AccommodationTypeSchema,
  LocalMobilitySchema,
  OriginSchema,
  TRANSPORT_TYPES,
  ACCOMMODATION_TYPES,
  LOCAL_MOBILITY_OPTIONS,
  MAX_TRANSPORT_SEGMENTS,
  MAX_ACCOMMODATIONS,
} from "@/lib/validations/transport.schema";

describe("TransportTypeSchema", () => {
  it.each(TRANSPORT_TYPES)("accepts valid type: %s", (type) => {
    expect(TransportTypeSchema.parse(type)).toBe(type);
  });

  it("rejects invalid transport type", () => {
    expect(TransportTypeSchema.safeParse("helicopter").success).toBe(false);
  });
});

describe("AccommodationTypeSchema", () => {
  it.each(ACCOMMODATION_TYPES)("accepts valid type: %s", (type) => {
    expect(AccommodationTypeSchema.parse(type)).toBe(type);
  });

  it("rejects invalid accommodation type", () => {
    expect(AccommodationTypeSchema.safeParse("castle").success).toBe(false);
  });
});

describe("TransportSegmentSchema", () => {
  it("accepts valid minimal segment", () => {
    const result = TransportSegmentSchema.parse({
      transportType: "flight",
    });
    expect(result.transportType).toBe("flight");
    expect(result.isReturn).toBe(false);
    expect(result.segmentOrder).toBe(0);
  });

  it("accepts fully filled segment", () => {
    const result = TransportSegmentSchema.parse({
      transportType: "train",
      departurePlace: "Rome",
      arrivalPlace: "Florence",
      departureAt: "2026-06-15T10:00:00Z",
      arrivalAt: "2026-06-15T12:00:00Z",
      provider: "Trenitalia",
      bookingCode: "ABC123",
      estimatedCost: 45.50,
      currency: "EUR",
      notes: "First class",
      isReturn: false,
      segmentOrder: 1,
    });
    expect(result.transportType).toBe("train");
    expect(result.departurePlace).toBe("Rome");
    expect(result.arrivalPlace).toBe("Florence");
    expect(result.estimatedCost).toBe(45.50);
    expect(result.currency).toBe("EUR");
  });

  it("rejects invalid transport type", () => {
    const result = TransportSegmentSchema.safeParse({
      transportType: "spaceship",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative estimated cost", () => {
    const result = TransportSegmentSchema.safeParse({
      transportType: "bus",
      estimatedCost: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects departure place exceeding max length", () => {
    const result = TransportSegmentSchema.safeParse({
      transportType: "flight",
      departurePlace: "A".repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it("accepts null optional fields", () => {
    const result = TransportSegmentSchema.parse({
      transportType: "car",
      departurePlace: null,
      arrivalPlace: null,
      estimatedCost: null,
    });
    expect(result.departurePlace).toBeNull();
  });
});

describe("AccommodationSchema", () => {
  it("accepts valid minimal accommodation", () => {
    const result = AccommodationSchema.parse({
      accommodationType: "hotel",
    });
    expect(result.accommodationType).toBe("hotel");
    expect(result.orderIndex).toBe(0);
  });

  it("accepts fully filled accommodation", () => {
    const result = AccommodationSchema.parse({
      accommodationType: "airbnb",
      name: "Cozy Apartment",
      address: "123 Via Roma, Florence",
      bookingCode: "BK-456",
      checkIn: "2026-06-15",
      checkOut: "2026-06-18",
      estimatedCost: 300.00,
      currency: "EUR",
      notes: "2nd floor, no elevator",
      orderIndex: 0,
    });
    expect(result.name).toBe("Cozy Apartment");
    expect(result.estimatedCost).toBe(300.00);
  });

  it("rejects invalid accommodation type", () => {
    const result = AccommodationSchema.safeParse({
      accommodationType: "palace",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = AccommodationSchema.safeParse({
      accommodationType: "hotel",
      name: "A".repeat(151),
    });
    expect(result.success).toBe(false);
  });
});

describe("LocalMobilitySchema", () => {
  it("accepts valid mobility options", () => {
    const result = LocalMobilitySchema.parse(["public_transit", "walking"]);
    expect(result).toEqual(["public_transit", "walking"]);
  });

  it("defaults to empty array", () => {
    const result = LocalMobilitySchema.parse(undefined);
    expect(result).toEqual([]);
  });

  it("rejects invalid mobility options", () => {
    const result = LocalMobilitySchema.safeParse(["teleportation"]);
    expect(result.success).toBe(false);
  });
});

describe("OriginSchema", () => {
  it("accepts valid origin string", () => {
    expect(OriginSchema.parse("Sao Paulo, Brazil")).toBe("Sao Paulo, Brazil");
  });

  it("accepts null", () => {
    expect(OriginSchema.parse(null)).toBeNull();
  });

  it("rejects origin exceeding max length", () => {
    const result = OriginSchema.safeParse("A".repeat(151));
    expect(result.success).toBe(false);
  });
});

describe("Business rules constants", () => {
  it("MAX_TRANSPORT_SEGMENTS is 10", () => {
    expect(MAX_TRANSPORT_SEGMENTS).toBe(10);
  });

  it("MAX_ACCOMMODATIONS is 5", () => {
    expect(MAX_ACCOMMODATIONS).toBe(5);
  });
});
