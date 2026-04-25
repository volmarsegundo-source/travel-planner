/**
 * B-W1-003 — Seed defaults for AI Governance V2.
 *
 * Spec refs:
 *   - SPEC-ARCH-AI-GOVERNANCE-V2 §8.3 — ModelAssignment seed (3 phases)
 *   - SPEC-ARCH-AI-GOVERNANCE-V2 §5.3.1 — AiRuntimeConfig allowlist (13 keys)
 *
 * Idempotent — uses Prisma `upsert` keyed on the unique columns (`phase`
 * for ModelAssignment, `key` for AiRuntimeConfig). Safe to run on every
 * deploy. Runs unconditionally regardless of `AI_GOVERNANCE_V2` flag —
 * the flag gates runtime UI/API consumers (Wave 3 in S47), not the
 * data layer.
 *
 * Called from `prisma/seed.ts` so `npx prisma db seed` populates these
 * defaults alongside the test user + prompt templates + kill switches.
 */
import type { PrismaClient } from "@prisma/client";

// ─── ModelAssignment defaults — SPEC §8.3 ────────────────────────────────────

interface ModelAssignmentSeed {
  phase: string;
  primaryProvider: string;
  primaryModelId: string;
  primaryTimeoutMs: number;
  fallbackProvider: string | null;
  fallbackModelId: string | null;
  fallbackTimeoutMs: number | null;
}

const MODEL_ASSIGNMENT_DEFAULTS: ReadonlyArray<ModelAssignmentSeed> = [
  {
    phase: "plan",
    primaryProvider: "anthropic",
    primaryModelId: "claude-haiku-4-5-20251001",
    primaryTimeoutMs: 30000,
    fallbackProvider: "gemini",
    fallbackModelId: "gemini-2.0-flash",
    fallbackTimeoutMs: 25000,
  },
  {
    phase: "checklist",
    primaryProvider: "anthropic",
    primaryModelId: "claude-haiku-4-5-20251001",
    primaryTimeoutMs: 20000,
    fallbackProvider: null,
    fallbackModelId: null,
    fallbackTimeoutMs: null,
  },
  {
    phase: "guide",
    primaryProvider: "anthropic",
    primaryModelId: "claude-haiku-4-5-20251001",
    primaryTimeoutMs: 25000,
    fallbackProvider: null,
    fallbackModelId: null,
    fallbackTimeoutMs: null,
  },
];

// ─── AiRuntimeConfig defaults — SPEC §5.3.1 allowlist ────────────────────────
//
// Schema stores `value` as TEXT (JSON-encoded). Booleans / numbers must be
// stringified. Description is human-readable for the admin UI tooltip.

interface AiRuntimeConfigSeed {
  key: string;
  value: unknown;
  description: string;
}

const AI_RUNTIME_CONFIG_DEFAULTS: ReadonlyArray<AiRuntimeConfigSeed> = [
  // maxTokens — 256-16384
  { key: "maxTokens.plan", value: 2048, description: "Max output tokens for plan generation (range 256-16384)" },
  { key: "maxTokens.checklist", value: 2048, description: "Max output tokens for checklist generation (range 256-16384)" },
  { key: "maxTokens.guide", value: 4096, description: "Max output tokens for guide generation (range 256-16384)" },
  // temperature — 0.0-2.0
  { key: "temperature.plan", value: 0.7, description: "Sampling temperature for plan generation (range 0.0-2.0)" },
  { key: "temperature.checklist", value: 0.3, description: "Sampling temperature for checklist generation (range 0.0-2.0)" },
  { key: "temperature.guide", value: 0.7, description: "Sampling temperature for guide generation (range 0.0-2.0)" },
  // killSwitch — boolean
  { key: "killSwitch.global", value: false, description: "Global AI kill-switch — disables all AI generation when true" },
  { key: "killSwitch.plan", value: false, description: "Per-phase kill-switch for plan generation" },
  { key: "killSwitch.checklist", value: false, description: "Per-phase kill-switch for checklist generation" },
  { key: "killSwitch.guide", value: false, description: "Per-phase kill-switch for guide generation" },
  // rateLimitPerHour — 1-100
  { key: "rateLimitPerHour.plan", value: 10, description: "Max plan generations per hour per user (range 1-100)" },
  { key: "rateLimitPerHour.checklist", value: 5, description: "Max checklist generations per hour per user (range 1-100)" },
  { key: "rateLimitPerHour.guide", value: 5, description: "Max guide generations per hour per user (range 1-100)" },
];

// ─── Seed function ──────────────────────────────────────────────────────────
//
// Accepts a PrismaClient (or compatible mock for tests). Idempotent — every
// row is upserted on its unique key. updatedAt fields refresh on each call;
// other fields are not overwritten if the admin has tuned values via the V2
// admin UI (last-write-wins on `update: {}`).

export async function seedAiGovernanceV2Defaults(
  db: PrismaClient
): Promise<void> {
  // ModelAssignment — phase is the unique key.
  for (const m of MODEL_ASSIGNMENT_DEFAULTS) {
    await db.modelAssignment.upsert({
      where: { phase: m.phase },
      create: m,
      // Empty update preserves admin-tuned values across re-seeds.
      // The `updatedAt` column updates automatically on any upsert touch.
      update: {},
    });
  }

  // AiRuntimeConfig — key is the unique key. Value is JSON-encoded.
  for (const c of AI_RUNTIME_CONFIG_DEFAULTS) {
    const valueStr = JSON.stringify(c.value);
    await db.aiRuntimeConfig.upsert({
      where: { key: c.key },
      create: {
        key: c.key,
        value: valueStr,
        description: c.description,
      },
      // Same admin-tuned-value preservation rationale as ModelAssignment.
      update: {},
    });
  }
}
