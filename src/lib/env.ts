import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().refine(
      // Use REDIS_TLS_REQUIRED=true in production deployments (not tied to NODE_ENV,
      // which is also "production" during local `npm run build`).
      (url) => process.env.REDIS_TLS_REQUIRED !== "true" || url.startsWith("rediss://"),
      { message: "REDIS_URL must use rediss:// (TLS) when REDIS_TLS_REQUIRED=true" }
    ).default("redis://localhost:6379"),
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY cannot be empty").startsWith("sk-ant-").optional(),
    GOOGLE_AI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    AI_PROVIDER: z.enum(["anthropic", "gemini"]).default("anthropic"),
    AI_FALLBACK_PROVIDER: z.enum(["anthropic", "gemini"]).optional(),
    // Per-type provider overrides. If set, take precedence over AI_PROVIDER
    // for that specific ModelType. Useful for beta-gating expensive models
    // (e.g. Claude Sonnet for Phase 5 & 6 only). See SPEC-PROD-AI-PROGRESS.
    AI_PROVIDER_PLAN: z.enum(["anthropic", "gemini"]).optional(),
    AI_PROVIDER_GUIDE: z.enum(["anthropic", "gemini"]).optional(),
    AI_PROVIDER_CHECKLIST: z.enum(["anthropic", "gemini"]).optional(),
    // Per-provider monthly budget ceilings (Sprint 42 FinOps review).
    // When unset, the global AI_MONTHLY_BUDGET_USD governs both providers.
    AI_MONTHLY_BUDGET_USD: z.coerce.number().positive().optional(),
    AI_MONTHLY_BUDGET_GEMINI_USD: z.coerce.number().positive().optional(),
    AI_MONTHLY_BUDGET_ANTHROPIC_USD: z.coerce.number().positive().optional(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
    // Auth.js v5 reads AUTH_SECRET; keep NEXTAUTH_SECRET as v4 alias
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.string().url().default("http://localhost:3000"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    APPLE_ID: z.string().optional(),
    APPLE_SECRET: z.string().optional(),
    MAPBOX_SECRET_TOKEN: z.string().startsWith("sk.").optional(),
    UNSPLASH_ACCESS_KEY: z.string().min(1).optional(),
    // ENCRYPTION_KEY protects AES-256-GCM encryption of PII fields
    // (passport, bookingCode, etc.). Must be 64 hex chars (32 bytes).
    // Mandatory in production — fails fast on boot if missing to prevent
    // silent downgrade to an insecure state. Optional in dev/test so local
    // setups without the key still boot.
    ENCRYPTION_KEY: z
      .string()
      .length(64, "ENCRYPTION_KEY must be 64 hex chars (32 bytes)")
      .regex(/^[0-9a-fA-F]+$/, "ENCRYPTION_KEY must be hexadecimal")
      .optional()
      .refine(
        (val) => process.env.NODE_ENV !== "production" || (val !== undefined && val.length === 64),
        { message: "ENCRYPTION_KEY is required in production (64 hex chars)" }
      ),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    FEEDBACK_WEBHOOK_URL: z.string().url().optional(),
    MP_WEBHOOK_SECRET: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().startsWith("pk.").optional(),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url()
      .default("http://localhost:3000"),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    // Sprint 44: Phase reorder feature flag (Wave 1). Default OFF — set to "true"
    // to activate the new phase ordering (Guide→Itinerary→Logistics→Checklist).
    // Rollback: set to "false" or remove; DB snapshot restores data consistency.
    NEXT_PUBLIC_PHASE_REORDER_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER,
    AI_PROVIDER_PLAN: process.env.AI_PROVIDER_PLAN,
    AI_PROVIDER_GUIDE: process.env.AI_PROVIDER_GUIDE,
    AI_PROVIDER_CHECKLIST: process.env.AI_PROVIDER_CHECKLIST,
    AI_MONTHLY_BUDGET_USD: process.env.AI_MONTHLY_BUDGET_USD,
    AI_MONTHLY_BUDGET_GEMINI_USD: process.env.AI_MONTHLY_BUDGET_GEMINI_USD,
    AI_MONTHLY_BUDGET_ANTHROPIC_USD: process.env.AI_MONTHLY_BUDGET_ANTHROPIC_USD,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    APPLE_ID: process.env.APPLE_ID,
    APPLE_SECRET: process.env.APPLE_SECRET,
    MAPBOX_SECRET_TOKEN: process.env.MAPBOX_SECRET_TOKEN,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    FEEDBACK_WEBHOOK_URL: process.env.FEEDBACK_WEBHOOK_URL,
    MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_PHASE_REORDER_ENABLED: process.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
