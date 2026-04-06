/**
 * Seed an admin user for staging/testing.
 * Run with: DATABASE_URL="..." npx tsx prisma/seed-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("📋 Current users:\n");

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  for (const u of users) {
    console.log(`  ${u.role === "admin" ? "👑" : "👤"} ${u.email} — role: ${u.role} — name: ${u.name ?? "(none)"}`);
  }

  console.log(`\n  Total: ${users.length} users\n`);

  // Promote test@test.com to admin if exists
  const testUser = users.find((u) => u.email === "test@test.com");
  if (testUser && testUser.role !== "admin") {
    await db.user.update({
      where: { id: testUser.id },
      data: { role: "admin" },
    });
    console.log(`✅ Promoted test@test.com to admin\n`);
  } else if (testUser?.role === "admin") {
    console.log(`ℹ️  test@test.com is already admin\n`);
  }

  // Create or update admin@atlas.travel
  const adminEmail = "admin@atlas.travel";
  const adminPassword = "Admin1234!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existing = await db.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    await db.user.update({
      where: { email: adminEmail },
      data: { role: "admin", passwordHash, name: "Atlas Admin", emailVerified: new Date() },
    });
    console.log(`✅ Updated ${adminEmail} → role: admin\n`);
  } else {
    await db.user.create({
      data: {
        email: adminEmail,
        name: "Atlas Admin",
        role: "admin",
        passwordHash,
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Created ${adminEmail} → role: admin\n`);
  }

  // Also seed AI governance tables if they exist
  try {
    for (const phase of ["global", "plan", "checklist", "guide"]) {
      await db.aiKillSwitch.upsert({
        where: { phase },
        create: { phase, isEnabled: false },
        update: {},
      });
    }
    console.log("✅ AI kill switches seeded (all disabled)\n");
  } catch {
    console.log("⚠️  AI governance tables not yet migrated\n");
  }

  console.log("🔑 Admin credentials:");
  console.log("   Email: admin@atlas.travel");
  console.log("   Password: Admin1234!");
  console.log("   Dashboard: /admin/ai-governance\n");

  console.log("🔑 Test user (promoted):");
  console.log("   Email: test@test.com");
  console.log("   Password: Test1234!");
  console.log("   Dashboard: /admin/ai-governance\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
