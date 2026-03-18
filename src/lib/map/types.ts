/**
 * GeoJSON types for the Atlas map.
 *
 * CRITICAL: GeoJSON uses [longitude, latitude] order, NOT [lat, lon].
 * All coordinates in this module follow the GeoJSON standard.
 */

export interface TripGeoFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    /** [longitude, latitude] -- GeoJSON standard order */
    coordinates: [number, number];
  };
  properties: {
    tripId: string;
    destination: string;
    currentPhase: number;
    status: "PLANNING" | "IN_PROGRESS" | "COMPLETED";
    startDate: string | null;
    endDate: string | null;
    coverEmoji: string;
  };
}

export interface TripGeoJSON {
  type: "FeatureCollection";
  features: TripGeoFeature[];
}

/** Pin color hex values by trip status */
export const PIN_COLORS = {
  PLANNING: "#EAB308",
  IN_PROGRESS: "#3B82F6",
  COMPLETED: "#22C55E",
} as const;

export type TripPinStatus = keyof typeof PIN_COLORS;
