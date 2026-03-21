/**
 * Data Migration Script: Retroactive PA Award
 *
 * For each existing user with completed expedition phases, calculates how much
 * PA they should have earned from phase completions and awards the difference.
 *
 * This script does NOT double-award. It checks existing PointTransactions with
 * type "phase_complete" per trip to determine what was already awarded.
 *
 * Also checks for welcome bonus and awards it to users who lack it.
 *
 * Usage:
 *   npx tsx scripts/retroactive-pa-award.ts
 *   npx tsx scripts/retroactive-pa-award.ts --dry-run
 *
 * Idempotent: Safe to run multiple times.
 */

import { PrismaClient } from "@prisma/client";

// Phase rewards from phase-config.ts (source of truth)
const PHASE_REWARDS: Record<number, number> = {
  1: 100,
  2: 150,
  3: 75,
  4: 50,
  5: 40,
  6: 250,
  7: 400,
  8: 500,
};

const WELCOME_BONUS = 180;

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    console.log(
      `[retroactive-pa-award] Starting${isDryRun ? " (DRY RUN)" : ""}...`
    );

    // 1. Find all users with at least one completed expedition phase
    const usersWithPhases = await prisma.expeditionPhase.findMany({
      where: { status: "completed" },
      select: {
        tripId: true,
        phaseNumber: true,
        pointsEarned: true,
        trip: {
          select: { userId: true },
        },
      },
    });

    // Group by userId -> tripId -> phaseNumbers
    const userTripPhases = new Map<
      string,
      Map<string, number[]>
    >();

    for (const phase of usersWithPhases) {
      const userId = phase.trip.userId;
      if (!userTripPhases.has(userId)) {
        userTripPhases.set(userId, new Map());
      }
      const tripMap = userTripPhases.get(userId)!;
      if (!tripMap.has(phase.tripId)) {
        tripMap.set(phase.tripId, []);
      }
      tripMap.get(phase.tripId)!.push(phase.phaseNumber);
    }

    console.log(
      `[retroactive-pa-award] Found ${userTripPhases.size} users with completed phases`
    );

    let totalUsersProcessed = 0;
    let totalPointsAwarded = 0;
    let totalWelcomeBonuses = 0;

    for (const [userId, tripMap] of userTripPhases) {
      // 2. Check if user has UserProgress; if not, they need welcome bonus too
      const progress = await prisma.userProgress.findUnique({
        where: { userId },
      });

      if (!progress) {
        console.log(
          `  [${userId.slice(0, 8)}...] No UserProgress found — creating with welcome bonus`
        );
        if (!isDryRun) {
          await prisma.userProgress.create({
            data: {
              userId,
              totalPoints: WELCOME_BONUS,
              availablePoints: WELCOME_BONUS,
              currentRank: "novato",
            },
          });
          await prisma.pointTransaction.create({
            data: {
              userId,
              amount: WELCOME_BONUS,
              type: "purchase",
              description: "Welcome bonus",
            },
          });
        }
        totalWelcomeBonuses++;
      }

      // 3. For each trip, check which phases have phase_complete transactions
      let userPointsDelta = 0;

      for (const [tripId, completedPhases] of tripMap) {
        // Get existing phase_complete transactions for this trip
        const existingTxs = await prisma.pointTransaction.findMany({
          where: {
            userId,
            type: "phase_complete",
            tripId,
          },
          select: { description: true, amount: true },
        });

        // Parse phase numbers from descriptions like "Completed phase 3: O Preparo"
        const alreadyAwardedPhases = new Set<number>();
        for (const tx of existingTxs) {
          const match = tx.description.match(/Completed phase (\d+)/);
          if (match) {
            alreadyAwardedPhases.add(parseInt(match[1], 10));
          }
        }

        // Award missing phases
        for (const phaseNumber of completedPhases) {
          if (alreadyAwardedPhases.has(phaseNumber)) continue;

          const reward = PHASE_REWARDS[phaseNumber];
          if (!reward) continue;

          console.log(
            `  [${userId.slice(0, 8)}...] Trip ${tripId.slice(0, 8)}... — awarding ${reward} PA for phase ${phaseNumber}`
          );

          if (!isDryRun) {
            await prisma.pointTransaction.create({
              data: {
                userId,
                amount: reward,
                type: "phase_complete",
                description: `Completed phase ${phaseNumber} (retroactive)`,
                tripId,
              },
            });

            await prisma.userProgress.update({
              where: { userId },
              data: {
                totalPoints: { increment: reward },
                availablePoints: { increment: reward },
              },
            });
          }

          userPointsDelta += reward;
        }
      }

      if (userPointsDelta > 0) {
        console.log(
          `  [${userId.slice(0, 8)}...] Total retroactive: +${userPointsDelta} PA`
        );
        totalPointsAwarded += userPointsDelta;
        totalUsersProcessed++;
      }
    }

    console.log("\n[retroactive-pa-award] Summary:");
    console.log(`  Users processed: ${totalUsersProcessed}`);
    console.log(`  Welcome bonuses created: ${totalWelcomeBonuses}`);
    console.log(`  Total PA awarded: ${totalPointsAwarded}`);
    if (isDryRun) {
      console.log("  (DRY RUN — no changes were made)");
    }
  } catch (error) {
    console.error("[retroactive-pa-award] Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
