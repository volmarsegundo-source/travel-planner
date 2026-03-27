import "server-only";

export const CacheKeys = {
  userTrips: (userId: string) => `user:${userId}:trips`,
  trip: (tripId: string) => `trip:${tripId}`,
  search: (query: string, filters: string) =>
    `search:${encodeURIComponent(query)}:${filters}`,
  aiPlan: (hash: string) => `cache:ai-plan:${hash}`,
  aiChecklist: (hash: string) => `cache:ai-checklist:${hash}`,
  aiGuide: (hash: string) => `cache:ai-guide:v2:${hash}`,
} as const;
