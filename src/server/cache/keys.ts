import "server-only";

export const CacheKeys = {
  userTrips: (userId: string) => `user:${userId}:trips`,
  trip: (tripId: string) => `trip:${tripId}`,
  search: (query: string, filters: string) =>
    `search:${encodeURIComponent(query)}:${filters}`,
} as const;
