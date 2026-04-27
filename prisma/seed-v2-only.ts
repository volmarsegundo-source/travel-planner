/**
 * Idempotent V2 governance seed entry-point.
 *
 * F-OPS-04 — Sprint 46.5 fix bundle.
 *
 * Invokes ONLY `seedAiGovernanceV2Defaults` (B-W1-003) — does not run the
 * full `prisma/seed.ts` which also creates a dev test user
 * (`test@test.com`) and 3 PromptTemplate rows. Those side-effects are
 * undesirable in Staging / Prod where:
 *
 *   - Test user creation in Prod is a security concern (live credentials
 *     `Test1234!` would be valid in Prod DB).
 *   - PromptTemplate upsert in Staging would touch the 3 already-existing
 *     rows (Sprint 7-8 era), updating `updatedAt` and potentially
 *     surprising the admin during a walk-through audit.
 *
 * This script is safe to run repeatedly — `seedAiGovernanceV2Defaults`
 * uses `upsert` with `update: {}` per row, so admin-tuned values are
 * preserved on re-runs (only `updatedAt` advances).
 *
 * Usage:
 *   DATABASE_URL=<staging-or-prod-url> npm run seed:v2-only
 *
 * Output: prints which rows were touched (insert vs no-op).
 */
import { config } from "dotenv";
import { resolve } from "path";

// Mirror prisma/seed.ts pattern — Prisma CLI does not load .env.local
// automatically. Load it explicitly so DATABASE_URL is available when
// running locally pointing at Staging.
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { seedAiGovernanceV2Defaults } from "./seed-ai-governance-v2";

const db = new PrismaClient();

async function main(): Promise<void> {
  console.log(
    "[seed:v2-only] Running seedAiGovernanceV2Defaults (idempotent upsert)…"
  );

  // Snapshot pre-state so the operator can confirm what changed.
  const [maBefore, arcBefore] = await Promise.all([
    db.modelAssignment.count(),
    db.aiRuntimeConfig.count(),
  ]);
  console.log(
    `[seed:v2-only] Pre: model_assignments=${maBefore} ai_runtime_configs=${arcBefore}`
  );

  await seedAiGovernanceV2Defaults(db);

  const [maAfter, arcAfter] = await Promise.all([
    db.modelAssignment.count(),
    db.aiRuntimeConfig.count(),
  ]);
  console.log(
    `[seed:v2-only] Post: model_assignments=${maAfter} ai_runtime_configs=${arcAfter}`
  );
  console.log(
    `[seed:v2-only] Inserted: model_assignments+${maAfter - maBefore} ai_runtime_configs+${arcAfter - arcBefore}`
  );
  console.log("[seed:v2-only] Done.");
}

main()
  .catch((e: unknown) => {
    console.error("[seed:v2-only] FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
