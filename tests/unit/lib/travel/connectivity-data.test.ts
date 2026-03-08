import { describe, it, expect } from "vitest";
import {
  CONNECTIVITY_DATA,
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
