"use server";
import "server-only";

import { UnsplashService } from "@/server/services/unsplash.service";
import { getDestinationImage as getHardcodedImage } from "@/lib/utils/destination-images";

export interface DestinationImageActionResult {
  url: string;
  photographer?: string;
  photographerUrl?: string;
}

/**
 * Server action to fetch a destination image. Tries Unsplash API first
 * (with Redis cache), then falls back to the hardcoded DESTINATION_IMAGES map.
 */
export async function getDestinationImageAction(
  destination: string
): Promise<DestinationImageActionResult | null> {
  if (!destination || typeof destination !== "string") {
    return null;
  }

  const sanitized = destination.trim();
  if (sanitized.length === 0 || sanitized.length > 200) {
    return null;
  }

  // Try Unsplash API first (with Redis cache)
  const unsplash = await UnsplashService.getDestinationImage(sanitized);
  if (unsplash) {
    return {
      url: unsplash.url,
      photographer: unsplash.photographerName,
      photographerUrl: unsplash.photographerUrl,
    };
  }

  // Fallback to hardcoded map
  const hardcoded = getHardcodedImage(sanitized);
  if (hardcoded) {
    return { url: hardcoded };
  }

  return null;
}
