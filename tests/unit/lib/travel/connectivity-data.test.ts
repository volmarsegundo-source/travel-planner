import { describe, it, expect } from "vitest";
import {
  CONNECTIVITY_DATA,
  detectRegion,
  type ConnectivityRegion,
} from "@/lib/travel/connectivity-data";

const ALL_REGIONS: ConnectivityRegion[] = [
  "south_america",
  "north_america",
  "europe",
  "asia",
  "africa",
  "oceania",
];

describe("CONNECTIVITY_DATA", () => {
  it("has exactly 6 regions", () => {
    expect(Object.keys(CONNECTIVITY_DATA)).toHaveLength(6);
  });

  it("each region has exactly 4 connectivity options", () => {
    for (const region of ALL_REGIONS) {
      expect(CONNECTIVITY_DATA[region]).toHaveLength(4);
    }
  });

  it("all regions include wifi_only at cost 0", () => {
    for (const region of ALL_REGIONS) {
      const wifiOnly = CONNECTIVITY_DATA[region].find(
        (p) => p.option === "wifi_only"
      );
      expect(wifiOnly).toBeDefined();
      expect(wifiOnly!.costPerWeekUSD).toBe(0);
      expect(wifiOnly!.recommended).toBe(false);
    }
  });

  it("each region has at least one recommended option", () => {
    for (const region of ALL_REGIONS) {
      const recommended = CONNECTIVITY_DATA[region].filter(
        (p) => p.recommended
      );
      expect(recommended.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("option types are valid ConnectivityOption values", () => {
    const validOptions = ["chip_local", "esim", "roaming", "wifi_only"];
    for (const region of ALL_REGIONS) {
      for (const plan of CONNECTIVITY_DATA[region]) {
        expect(validOptions).toContain(plan.option);
      }
    }
  });

  it("roaming is never recommended", () => {
    for (const region of ALL_REGIONS) {
      const roaming = CONNECTIVITY_DATA[region].find(
        (p) => p.option === "roaming"
      );
      expect(roaming).toBeDefined();
      expect(roaming!.recommended).toBe(false);
    }
  });

  it("all costs are non-negative", () => {
    for (const region of ALL_REGIONS) {
      for (const plan of CONNECTIVITY_DATA[region]) {
        expect(plan.costPerWeekUSD).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("detectRegion", () => {
  it("detects europe from Paris", () => {
    expect(detectRegion("Paris, France", "international")).toBe("europe");
  });

  it("detects south_america from Buenos Aires", () => {
    expect(detectRegion("Buenos Aires, Argentina", "mercosul")).toBe("south_america");
  });

  it("detects north_america from New York", () => {
    expect(detectRegion("New York, USA", "international")).toBe("north_america");
  });

  it("detects asia from Tokyo", () => {
    expect(detectRegion("Tokyo, Japan", "international")).toBe("asia");
  });

  it("detects africa from Cape Town", () => {
    expect(detectRegion("Cape Town, South Africa", "international")).toBe("africa");
  });

  it("detects oceania from Sydney", () => {
    expect(detectRegion("Sydney, Australia", "international")).toBe("oceania");
  });

  it("falls back to south_america for domestic trips", () => {
    expect(detectRegion("Unknown City", "domestic")).toBe("south_america");
  });

  it("falls back to south_america for mercosul trips", () => {
    expect(detectRegion("Unknown City", "mercosul")).toBe("south_america");
  });

  it("falls back to europe for schengen trips", () => {
    expect(detectRegion("Unknown City", "schengen")).toBe("europe");
  });

  it("falls back to europe for unknown international destinations", () => {
    expect(detectRegion("Unknown City", "international")).toBe("europe");
  });

  it("is case-insensitive", () => {
    expect(detectRegion("PARIS, FRANCE", "international")).toBe("europe");
  });
});
