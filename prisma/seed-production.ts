/**
 * Production seed — AI governance data only. NO test users.
 *
 * Seeds:
 *   - PromptTemplate records (3 templates: travel-plan, checklist, destination-guide)
 *   - AiKillSwitch records (4: global, plan, checklist, guide)
 *
 * Featured destinations are stored as static JSON in prisma/data/featured-destinations.json
 * and do NOT require database insertion — they are consumed at build time.
 *
 * Run with: npx tsx prisma/seed-production.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

// Prisma CLI doesn't load .env.local automatically (that's Next.js-specific).
// Load it explicitly so DATABASE_URL is available.
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import {
  PLAN_SYSTEM_PROMPT,
  CHECKLIST_SYSTEM_PROMPT,
  GUIDE_SYSTEM_PROMPT,
} from "../src/lib/prompts/system-prompts";

const db = new PrismaClient();

const PROMPT_TEMPLATES = [
  {
    slug: "travel-plan",
    version: "1.1.0",
    modelType: "plan",
    systemPrompt: PLAN_SYSTEM_PROMPT,
    userTemplate: "See src/lib/prompts/travel-plan.prompt.ts",
    maxTokens: 2048,
  },
  {
    slug: "checklist",
    version: "1.0.0",
    modelType: "checklist",
    systemPrompt: CHECKLIST_SYSTEM_PROMPT,
    userTemplate: "See src/lib/prompts/checklist.prompt.ts",
    maxTokens: 2048,
  },
  {
    slug: "destination-guide",
    version: "2.0.0",
    modelType: "guide",
    systemPrompt: GUIDE_SYSTEM_PROMPT,
    userTemplate: "See src/lib/prompts/destination-guide.prompt.ts",
    maxTokens: 4096,
  },
] as const;

const KILL_SWITCH_PHASES = ["global", "plan", "checklist", "guide"] as const;

async function main() {
  // ─── Prompt Templates ───────────────────────────────────────────────────────
  for (const pt of PROMPT_TEMPLATES) {
    await db.promptTemplate.upsert({
      where: { slug: pt.slug },
      create: pt,
      update: {
        version: pt.version,
        maxTokens: pt.maxTokens,
        systemPrompt: pt.systemPrompt,
      },
    });
  }
  console.log(
    `\u2713 AI governance: ${PROMPT_TEMPLATES.length} prompt templates seeded`
  );

  // ─── Kill Switches ─────────────────────────────────────────────────────────
  for (const phase of KILL_SWITCH_PHASES) {
    await db.aiKillSwitch.upsert({
      where: { phase },
      create: { phase, isEnabled: false },
      update: {},
    });
  }
  console.log(
    `\u2713 AI governance: ${KILL_SWITCH_PHASES.length} kill switches seeded`
  );

  console.log("\u2713 Production seed complete (no test users created)");
}

main()
  .catch((e) => {
    console.error("Production seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
