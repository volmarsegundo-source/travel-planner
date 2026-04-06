/**
 * Development seed — creates a test user for local development.
 * Run with: npx prisma db seed
 */
import { config } from "dotenv";
import { resolve } from "path";

// Prisma CLI doesn't load .env.local automatically (that's Next.js-specific).
// Load it explicitly so DATABASE_URL is available.
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = "test@test.com";
  const password = "Test1234!";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: new Date(),
      deletedAt: null,
      deactivatedAt: null,
    },
    create: {
      email,
      name: "Test User",
      passwordHash,
      emailVerified: new Date(), // pre-verified so credentials login works
    },
  });

  console.log(`✓ Test user ready: ${user.email} (id: ${user.id})`);
  console.log(`  password: ${password}`);

  // ─── Seed AI Governance ─────────────────────────────────────────────────────
  console.log("Seeding AI governance...");

  // Prompt templates (from inline constants)
  const promptTemplates = [
    {
      slug: "travel-plan",
      version: "1.1.0",
      modelType: "plan",
      systemPrompt: "See src/lib/prompts/system-prompts.ts",
      userTemplate: "See src/lib/prompts/travel-plan.prompt.ts",
      maxTokens: 2048,
    },
    {
      slug: "checklist",
      version: "1.0.0",
      modelType: "checklist",
      systemPrompt: "See src/lib/prompts/system-prompts.ts",
      userTemplate: "See src/lib/prompts/checklist.prompt.ts",
      maxTokens: 2048,
    },
    {
      slug: "destination-guide",
      version: "2.0.0",
      modelType: "guide",
      systemPrompt: "See src/lib/prompts/system-prompts.ts",
      userTemplate: "See src/lib/prompts/destination-guide.prompt.ts",
      maxTokens: 4096,
    },
  ];

  for (const pt of promptTemplates) {
    await db.promptTemplate.upsert({
      where: { slug: pt.slug },
      create: pt,
      update: { version: pt.version, maxTokens: pt.maxTokens },
    });
  }

  // Kill switches (all disabled by default)
  for (const phase of ["global", "plan", "checklist", "guide"]) {
    await db.aiKillSwitch.upsert({
      where: { phase },
      create: { phase, isEnabled: false },
      update: {},
    });
  }

  console.log("AI governance seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
