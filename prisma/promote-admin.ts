/**
 * Promote a user to admin role by email.
 *
 * Usage:
 *   npx tsx prisma/promote-admin.ts user@example.com
 *
 * Requires DATABASE_URL to be set in the environment.
 * After promotion, the user must log out and log back in
 * for the JWT token to pick up the new role.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npx tsx prisma/promote-admin.ts <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`User ${email} is already an admin.`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });

    console.log(`Successfully promoted ${user.name ?? email} to admin.`);
    console.log("The user must log out and log back in for the change to take effect.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
