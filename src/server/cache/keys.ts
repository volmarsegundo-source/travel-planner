export const CacheKeys = {
  emailVerify: (token: string) => `cache:email-verify:${token}`,
  passwordReset: (token: string) => `cache:pwd-reset:${token}`,
  userTrips: (userId: string) => `cache:user-trips:${userId}`,
  aiPlan: (hash: string) => `cache:ai-plan:${hash}`,
  aiChecklist: (hash: string) => `cache:ai-checklist:${hash}`,
  // Rate limiting — window counters (key TTL = window duration)
  rateAuth: (ip: string) => `rl:auth:${ip}`,           // login / register / forgot-password
  rateAiPlan: (userId: string) => `rl:ai-plan:${userId}`,
  rateAiChecklist: (userId: string) => `rl:ai-checklist:${userId}`,
} as const;

export const CacheTTL = {
  EMAIL_VERIFY: 60 * 60 * 24,    // 24h
  PASSWORD_RESET: 60 * 60,        // 1h
  USER_TRIPS: 60 * 5,             // 5min
  AI_PLAN: 60 * 60 * 24,          // 24h
  AI_CHECKLIST: 60 * 60 * 24,     // 24h
} as const;

// Rate limit windows (seconds) and max attempts
export const RateLimit = {
  AUTH_WINDOW: 60 * 15,    // 15 min sliding window
  AUTH_MAX: 10,             // max 10 auth attempts per IP per window
  AI_PLAN_WINDOW: 60 * 60, // 1h window
  AI_PLAN_MAX: 10,          // max 10 plan generations per user per hour
  AI_CHECKLIST_WINDOW: 60 * 60,
  AI_CHECKLIST_MAX: 20,     // checklists are cheaper — allow more
} as const;
