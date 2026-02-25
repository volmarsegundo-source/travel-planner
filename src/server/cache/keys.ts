export const CacheKeys = {
  emailVerify: (token: string) => `cache:email-verify:${token}`,
  passwordReset: (token: string) => `cache:pwd-reset:${token}`,
  userTrips: (userId: string) => `cache:user-trips:${userId}`,
  aiPlan: (hash: string) => `cache:ai-plan:${hash}`,
  aiChecklist: (hash: string) => `cache:ai-checklist:${hash}`,
} as const;

export const CacheTTL = {
  EMAIL_VERIFY: 60 * 60 * 24,    // 24h
  PASSWORD_RESET: 60 * 60,        // 1h
  USER_TRIPS: 60 * 5,             // 5min
  AI_PLAN: 60 * 60 * 24,          // 24h
  AI_CHECKLIST: 60 * 60 * 24,     // 24h
} as const;
