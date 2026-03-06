export const MAX_TRIPS_PER_USER = 20;
export const MAX_TRIP_TITLE_LENGTH = 100;
export const MAX_TRIP_DESCRIPTION_LENGTH = 500;
export const MAX_TRIP_DESTINATION_LENGTH = 150;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CACHE_TTL = {
  SEARCH: 300,        // 5 minutes
  AI_PLAN: 86400,    // 24 hours
  USER_TRIPS: 60,    // 1 minute
} as const;

export const MAX_TRAVELERS = 10;
export const BUDGET_MIN = 100;
export const BUDGET_MAX = 100000;

export const RATE_LIMIT = {
  PUBLIC_PER_MINUTE: 60,
  AUTH_PER_MINUTE: 120,
  SEARCH_PER_MINUTE: 30,
} as const;
