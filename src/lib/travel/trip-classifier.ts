export type TripType = "domestic" | "mercosul" | "international" | "schengen";

export const MERCOSUL_CODES = [
  "AR", "BR", "PY", "UY", "VE",
] as const;

export const SCHENGEN_CODES = [
  "AT", "BE", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO",
  "PL", "PT", "SK", "SI", "ES", "SE", "CH",
] as const;

/**
 * Classify a trip based on origin and destination ISO 3166-1 alpha-2 country codes.
 * Comparison is case-insensitive (codes are uppercased internally).
 */
export function classifyTrip(
  originCode: string,
  destCode: string
): TripType {
  const origin = originCode.trim().toUpperCase();
  const destination = destCode.trim().toUpperCase();

  if (origin === destination) return "domestic";

  const mercosulSet = new Set<string>(MERCOSUL_CODES);
  if (origin === "BR" && mercosulSet.has(destination)) {
    return "mercosul";
  }

  const schengenSet = new Set<string>(SCHENGEN_CODES);
  if (schengenSet.has(destination)) return "schengen";

  return "international";
}
