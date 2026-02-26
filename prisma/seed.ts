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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
