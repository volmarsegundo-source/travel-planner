/**
 * Data Migration Script: Fix trips with currentPhase > 6
 *
 * Problem: Before FIX-02 (Sprint 32), PhaseEngine.completePhase could set
 * trip.currentPhase to 7 when completing Phase 6. FIX-02 added
 * Math.min(phaseNumber + 1, TOTAL_ACTIVE_PHASES), but existing trips
 * in the database still have currentPhase = 7.
 *
 * Solution: Find all trips where currentPhase > 6 and cap them at 6.
 *
 * Usage:
 *   npx tsx scripts/fix-phase7-trips.ts
 *   npx tsx scripts/fix-phase7-trips.ts --dry-run
 *
 * Idempotent: Safe to run multiple times.
 */

import { PrismaClient } from "@prisma/client";

const TOTAL_ACTIVE_PHASES = 6;

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    console.log(
      `[fix-phase7-trips] Starting${isDryRun ? " (DRY RUN)" : ""}...`
    );

    // 1. Find all affected trips
    const affectedTrips = await prisma.trip.findMany({
      where: {
        currentPhase: { gt: TOTAL_ACTIVE_PHASES },
        deletedAt: null,
      },
      select: {
        id: true,
        currentPhase: true,
        title: true,
        userId: true,
      },
    });

    console.log(
      `[fix-phase7-trips] Found ${affectedTrips.length} trips with currentPhase > ${TOTAL_ACTIVE_PHASES}`
    );

    if (affectedTrips.length === 0) {
      console.log("[fix-phase7-trips] Nothing to fix. Exiting.");
      return;
    }

    // 2. Log affected trips (without PII -- no emails, just IDs)
    for (const trip of affectedTrips) {
      console.log(
        `  - Trip ${trip.id}: currentPhase=${trip.currentPhase}, title="${trip.title}"`
      );
    }

    if (isDryRun) {
      console.log(
        `[fix-phase7-trips] DRY RUN complete. Would update ${affectedTrips.length} trips.`
      );
      return;
    }

    // 3. Batch update all affected trips
    const result = await prisma.trip.updateMany({
      where: {
        currentPhase: { gt: TOTAL_ACTIVE_PHASES },
        deletedAt: null,
      },
      data: {
        currentPhase: TOTAL_ACTIVE_PHASES,
      },
    });

    console.log(
      `[fix-phase7-trips] Updated ${result.count} trips: currentPhase capped at ${TOTAL_ACTIVE_PHASES}`
    );

    // 4. Verify fix
    const remaining = await prisma.trip.count({
      where: {
        currentPhase: { gt: TOTAL_ACTIVE_PHASES },
        deletedAt: null,
      },
    });

    if (remaining > 0) {
      console.error(
        `[fix-phase7-trips] WARNING: ${remaining} trips still have currentPhase > ${TOTAL_ACTIVE_PHASES}`
      );
      process.exit(1);
    }

    console.log(
      "[fix-phase7-trips] Verification passed. All trips within valid range."
    );
  } catch (error) {
    console.error("[fix-phase7-trips] Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
