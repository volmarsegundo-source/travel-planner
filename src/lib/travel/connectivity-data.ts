import type { ConnectivityOption } from "@/types/gamification.types";

export interface ConnectivityPlan {
  option: ConnectivityOption;
  costPerWeekUSD: number;
  recommended: boolean;
}

export type ConnectivityRegion =
  | "south_america"
  | "north_america"
  | "europe"
  | "asia"
  | "africa"
  | "oceania";

export const CONNECTIVITY_DATA: Record<ConnectivityRegion, ConnectivityPlan[]> = {
  south_america: [
    { option: "chip_local", costPerWeekUSD: 10, recommended: true },
    { option: "esim", costPerWeekUSD: 15, recommended: true },
    { option: "roaming", costPerWeekUSD: 50, recommended: false },
    { option: "wifi_only", costPerWeekUSD: 0, recommended: false },
  ],
  north_america: [
    { option: "chip_local", costPerWeekUSD: 15, recommended: false },
    { option: "esim", costPerWeekUSD: 20, recommended: true },
    { option: "roaming", costPerWeekUSD: 70, recommended: false },
    { option: "wifi_only", costPerWeekUSD: 0, recommended: false },
  ],
  europe: [
    { option: "chip_local", costPerWeekUSD: 12, recommended: false },
    { option: "esim", costPerWeekUSD: 18, recommended: true },
    { option: "roaming", costPerWeekUSD: 80, recommended: false },
    { option: "wifi_only", costPerWeekUSD: 0, recommended: false },
  ],
  asia: [
    { option: "chip_local", costPerWeekUSD: 8, recommended: true },
    { option: "esim", costPerWeekUSD: 15, recommended: true },
    { option: "roaming", costPerWeekUSD: 90, recommended: false },
    { option: "wifi_only", costPerWeekUSD: 0, recommended: false },
  ],
  africa: [
    { option: "chip_local", costPerWeekUSD: 10, recommended: true },
    { option: "esim", costPerWeekUSD: 20, recommended: false },
    { option: "roaming", costPerWeekUSD: 100, recommended: false },
    { option: "wifi_only", costPerWeekUSD: 0, recommended: false },
  ],
  oceania: [
    { option: "chip_local", costPerWeekUSD: 15, recommended: false },
    { option: "esim", costPerWeekUSD: 22, recommended: true },
    { option: "roaming", costPerWeekUSD: 85, recommended: false },
    { option: "wifi_only", costPerWeekUSD: 0, recommended: false },
  ],
};
