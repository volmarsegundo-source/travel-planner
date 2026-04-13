/**
 * Promote a user to Premium (admin + active Premium subscription + 1.500 PA).
 *
 * Sprint 43+ — used for staging QA accounts and internal team members so they
 * can exercise the full Premium-gated flow without going through checkout.
 *
 * What it does (idempotent):
 *   1. Sets user.role = "admin"
 *   2. Upserts a Subscription row with plan = PREMIUM_MONTHLY, status = ACTIVE,
 *      currentPeriodEnd = now + 30 days (rolls forward on re-run)
 *   3. Writes a SubscriptionEvent of type "ADMIN_GRANT" for audit trail
 *   4. Grants 1.500 PA via a PaEntitlement row (source PREMIUM_MONTHLY,
 *      expiresAt = currentPeriodEnd) — mirrors the real monthly refill path
 *
 * Usage:
 *   DATABASE_URL="<staging-url>" npx tsx prisma/promote-premium.ts user@example.com
 *
 * After running, the user must log out and log back in so the JWT picks up
 * the new role and entitlements.
 */
import { PrismaClient } from "@prisma/client";

const PREMIUM_MONTHLY_PA = 1500;
const PERIOD_DAYS = 30;

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npx tsx prisma/promote-premium.ts <email>");
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

    const now = new Date();
    const periodEnd = new Date(now.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      // 1. Role = admin
      if (user.role !== "admin") {
        await tx.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
      }

      // 2. Upsert Subscription → PREMIUM_MONTHLY ACTIVE
      const subscription = await tx.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: "PREMIUM_MONTHLY",
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan: "PREMIUM_MONTHLY",
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      // 3. Audit event
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: "ADMIN_GRANT",
          payload: {
            grantedBy: "promote-premium.ts",
            grantedAt: now.toISOString(),
            periodDays: PERIOD_DAYS,
            paGranted: PREMIUM_MONTHLY_PA,
          },
        },
      });

      // 4. Grant 1.500 PA (Premium monthly bucket)
      await tx.paEntitlement.create({
        data: {
          userId: user.id,
          source: "PREMIUM_MONTHLY",
          amount: PREMIUM_MONTHLY_PA,
          consumed: 0,
          expiresAt: periodEnd,
          subscriptionId: subscription.id,
        },
      });
    });

    console.log(`Promoted ${user.name ?? email} → admin + Premium (${PREMIUM_MONTHLY_PA} PA).`);
    console.log(`  Period ends: ${periodEnd.toISOString()}`);
    console.log("  User must log out and log back in for the JWT to pick up the new role.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
