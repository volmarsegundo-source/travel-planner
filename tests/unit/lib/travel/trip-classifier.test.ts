import { describe, it, expect } from "vitest";
import {
  classifyTrip,
  SCHENGEN_CODES,
  MERCOSUL_CODES,
  type TripType,
} from "@/lib/travel/trip-classifier";

describe("trip-classifier", () => {
  it("returns domestic when origin equals destination", () => {
    expect(classifyTrip("BR", "BR")).toBe("domestic");
  });

  it("returns mercosul for BR → AR", () => {
    expect(classifyTrip("BR", "AR")).toBe("mercosul");
  });

  it("returns mercosul for BR → UY", () => {
    expect(classifyTrip("BR", "UY")).toBe("mercosul");
  });

  it("returns mercosul for BR → PY", () => {
    expect(classifyTrip("BR", "PY")).toBe("mercosul");
  });

  it("returns schengen for BR → FR", () => {
    expect(classifyTrip("BR", "FR")).toBe("schengen");
  });

  it("returns schengen for BR → DE", () => {
    expect(classifyTrip("BR", "DE")).toBe("schengen");
  });

  it("returns international for BR → US", () => {
    expect(classifyTrip("BR", "US")).toBe("international");
  });

  it("returns international for BR → JP", () => {
    expect(classifyTrip("BR", "JP")).toBe("international");
  });

  it("returns schengen for non-Brazil origin → schengen destination", () => {
    expect(classifyTrip("US", "FR")).toBe("schengen");
  });

  it("is case-insensitive", () => {
    expect(classifyTrip("br", "ar")).toBe("mercosul");
    expect(classifyTrip("BR", "fr")).toBe("schengen");
  });

  it("returns international as fallback for unknown country code", () => {
    expect(classifyTrip("BR", "XX")).toBe("international");
  });

  it("returns domestic for same non-Brazil country", () => {
    expect(classifyTrip("US", "US")).toBe("domestic");
  });

  it("SCHENGEN_CODES has 27 entries", () => {
    expect(SCHENGEN_CODES).toHaveLength(27);
  });

  it("MERCOSUL_CODES has 5 entries", () => {
    expect(MERCOSUL_CODES).toHaveLength(5);
  });

  it("exports TripType as a usable type", () => {
    const t: TripType = "domestic";
    expect(t).toBe("domestic");
  });
});
