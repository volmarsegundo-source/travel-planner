import { describe, it, expect } from "vitest";
import {
  classifyTrip,
  SCHENGEN_COUNTRIES,
  MERCOSUL_COUNTRIES,
  type TripType,
} from "@/lib/travel/trip-classifier";

describe("trip-classifier", () => {
  it("returns domestic when origin equals destination", () => {
    expect(classifyTrip("Brazil", "Brazil")).toBe("domestic");
  });

  it("returns mercosul for Brazil → Argentina", () => {
    expect(classifyTrip("Brazil", "Argentina")).toBe("mercosul");
  });

  it("returns mercosul for Brazil → Uruguay", () => {
    expect(classifyTrip("Brazil", "Uruguay")).toBe("mercosul");
  });

  it("returns mercosul for Brazil → Paraguay", () => {
    expect(classifyTrip("Brazil", "Paraguay")).toBe("mercosul");
  });

  it("returns schengen for Brazil → France", () => {
    expect(classifyTrip("Brazil", "France")).toBe("schengen");
  });

  it("returns schengen for Brazil → Germany", () => {
    expect(classifyTrip("Brazil", "Germany")).toBe("schengen");
  });

  it("returns international for Brazil → USA", () => {
    expect(classifyTrip("Brazil", "USA")).toBe("international");
  });

  it("returns international for Brazil → Japan", () => {
    expect(classifyTrip("Brazil", "Japan")).toBe("international");
  });

  it("returns schengen for non-Brazil origin → schengen destination", () => {
    expect(classifyTrip("USA", "France")).toBe("schengen");
  });

  it("is case-insensitive", () => {
    expect(classifyTrip("brazil", "ARGENTINA")).toBe("mercosul");
    expect(classifyTrip("BRAZIL", "france")).toBe("schengen");
  });

  it("returns international as fallback for unknown country", () => {
    expect(classifyTrip("Brazil", "Narnia")).toBe("international");
  });

  it("returns domestic for same non-Brazil country", () => {
    expect(classifyTrip("USA", "USA")).toBe("domestic");
  });

  it("SCHENGEN_COUNTRIES has 27 entries", () => {
    expect(SCHENGEN_COUNTRIES).toHaveLength(27);
  });

  it("MERCOSUL_COUNTRIES has 5 entries", () => {
    expect(MERCOSUL_COUNTRIES).toHaveLength(5);
  });
});
