/**
 * Cleanup duplicate trips — removes trips with the same destination+dates for each user.
 * Keeps the most recently updated trip in each group.
 *
 * Run with: npx tsx prisma/cleanup-duplicates.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🔍 Scanning for duplicate trips...\n");

  const users = await db.user.findMany({ select: { id: true, email: true } });

  let totalDeleted = 0;

  for (const user of users) {
    const trips = await db.trip.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        destination: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Group by destination + dates
    const seen = new Map<string, string>(); // key → kept trip ID
    const toDelete: string[] = [];

    for (const trip of trips) {
      const key = [
        trip.destination?.toLowerCase().trim() ?? "",
        trip.startDate?.toISOString().slice(0, 10) ?? "null",
        trip.endDate?.toISOString().slice(0, 10) ?? "null",
      ].join("|");

      if (seen.has(key)) {
        toDelete.push(trip.id);
        console.log(
          `  ❌ DELETE ${trip.id} — "${trip.destination}" (${trip.createdAt.toISOString().slice(0, 10)}) [dup of ${seen.get(key)}]`
        );
      } else {
        seen.set(key, trip.id);
      }
    }

    if (toDelete.length > 0) {
      console.log(`\n👤 User ${user.email}: ${toDelete.length} duplicates found`);

      // Soft-delete duplicates (set deletedAt instead of hard delete)
      for (const tripId of toDelete) {
        await db.trip.update({
          where: { id: tripId },
          data: { deletedAt: new Date() },
        });
      }

      totalDeleted += toDelete.length;
      console.log(`  ✅ Soft-deleted ${toDelete.length} trips\n`);
    }
  }

  if (totalDeleted === 0) {
    console.log("✅ No duplicates found.");
  } else {
    console.log(`\n🧹 Total: ${totalDeleted} duplicate trips soft-deleted.`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
