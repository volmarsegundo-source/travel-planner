/**
 * Builds a GeoJSON FeatureCollection from trip data.
 * Used by both the server component (page.tsx) and tests.
 */

import type { TripGeoJSON, TripGeoFeature, TripPinStatus } from "./types";

interface TripForGeoJSON {
  id: string;
  destination: string;
  currentPhase: number;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  coverEmoji: string;
  destinationLat: number | null;
  destinationLon: number | null;
}

/**
 * Derive the pin status from trip data.
 *
 * - COMPLETED: trip.status === "COMPLETED"
 * - IN_PROGRESS: trip.currentPhase > 1 (user has progressed beyond creation)
 * - PLANNING: default
 */
export function derivePinStatus(trip: {
  status: string;
  currentPhase: number;
}): TripPinStatus {
  if (trip.status === "COMPLETED") return "COMPLETED";
  if (trip.currentPhase > 1) return "IN_PROGRESS";
  return "PLANNING";
}

/**
 * Build a GeoJSON FeatureCollection from an array of trips.
 * Skips trips with null coordinates.
 */
export function buildTripGeoJSON(trips: TripForGeoJSON[]): TripGeoJSON {
  const features: TripGeoFeature[] = [];

  for (const trip of trips) {
    // Skip trips without coordinates
    if (trip.destinationLat == null || trip.destinationLon == null) {
      continue;
    }

    const status = derivePinStatus(trip);
    const startDate =
      trip.startDate instanceof Date
        ? trip.startDate.toISOString().split("T")[0]!
        : trip.startDate;
    const endDate =
      trip.endDate instanceof Date
        ? trip.endDate.toISOString().split("T")[0]!
        : trip.endDate;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        // CRITICAL: GeoJSON = [longitude, latitude]
        coordinates: [trip.destinationLon, trip.destinationLat],
      },
      properties: {
        tripId: trip.id,
        destination: trip.destination,
        currentPhase: trip.currentPhase,
        status,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        coverEmoji: trip.coverEmoji,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
