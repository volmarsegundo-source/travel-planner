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

// ─── Region Detection ────────────────────────────────────────────────────────

const REGION_KEYWORDS: Record<ConnectivityRegion, string[]> = {
  south_america: [
    "brazil", "brasil", "argentina", "chile", "colombia", "peru",
    "uruguay", "paraguai", "paraguay", "bolivia", "ecuador", "venezuela",
    "guyana", "suriname", "são paulo", "rio de janeiro", "buenos aires",
    "santiago", "bogotá", "lima",
  ],
  north_america: [
    "usa", "united states", "estados unidos", "canada", "canadá",
    "mexico", "méxico", "new york", "los angeles", "toronto", "vancouver",
    "miami", "chicago", "san francisco",
  ],
  europe: [
    "france", "frança", "germany", "alemanha", "italy", "itália",
    "spain", "espanha", "portugal", "uk", "united kingdom", "reino unido",
    "netherlands", "holanda", "belgium", "bélgica", "switzerland", "suíça",
    "austria", "áustria", "greece", "grécia", "sweden", "suécia",
    "paris", "london", "londres", "rome", "roma", "berlin", "berlim",
    "madrid", "barcelona", "lisbon", "lisboa", "amsterdam",
  ],
  asia: [
    "japan", "japão", "china", "south korea", "coreia do sul", "india",
    "índia", "thailand", "tailândia", "vietnam", "vietnã", "indonesia",
    "indonésia", "malaysia", "malásia", "singapore", "singapura",
    "tokyo", "tóquio", "bangkok", "seoul", "seul", "delhi",
  ],
  africa: [
    "south africa", "áfrica do sul", "egypt", "egito", "morocco",
    "marrocos", "kenya", "quênia", "nigeria", "nigéria", "tanzania",
    "tanzânia", "cape town", "cairo", "marrakech", "nairobi",
  ],
  oceania: [
    "australia", "austrália", "new zealand", "nova zelândia",
    "sydney", "melbourne", "auckland", "fiji",
  ],
};

/**
 * Detect connectivity region from destination string and trip type.
 * Falls back to south_america for domestic/mercosul, europe for schengen,
 * and europe for unknown international destinations.
 */
export function detectRegion(
  destination: string,
  tripType: string
): ConnectivityRegion {
  const lower = destination.toLowerCase();

  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return region as ConnectivityRegion;
    }
  }

  // Fallback by trip type
  if (tripType === "domestic" || tripType === "mercosul") {
    return "south_america";
  }
  if (tripType === "schengen") {
    return "europe";
  }
  return "europe";
}
