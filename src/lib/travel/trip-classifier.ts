export type TripType = "domestic" | "mercosul" | "international" | "schengen";

export const MERCOSUL_COUNTRIES = [
  "Argentina",
  "Brazil",
  "Paraguay",
  "Uruguay",
  "Venezuela",
] as const;

export const SCHENGEN_COUNTRIES = [
  "Austria",
  "Belgium",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
] as const;

/**
 * Classify a trip based on origin and destination countries.
 * Comparison is case-insensitive.
 */
export function classifyTrip(
  originCountry: string,
  destinationCountry: string
): TripType {
  const origin = originCountry.trim().toLowerCase();
  const destination = destinationCountry.trim().toLowerCase();

  if (origin === destination) return "domestic";

  const mercosulLower = MERCOSUL_COUNTRIES.map((c) => c.toLowerCase());
  if (origin === "brazil" && mercosulLower.includes(destination)) {
    return "mercosul";
  }

  const schengenLower = SCHENGEN_COUNTRIES.map((c) => c.toLowerCase());
  if (schengenLower.includes(destination)) return "schengen";

  return "international";
}
