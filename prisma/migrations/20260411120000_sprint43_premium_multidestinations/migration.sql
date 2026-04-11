-- Sprint 43 Wave 1: Premium + Multidestinations foundation
--
-- This migration introduces the schema foundation for:
--   - Multi-city expeditions (1..4 Destinations per Trip)
--   - Premium subscriptions (Subscription + SubscriptionEvent audit log)
--   - PA entitlement buckets with expiry (PaEntitlement)
--
-- Strategy: additive only. No existing columns are dropped. Backwards
-- compatibility with the Free (single-destination) path is preserved:
--   - `trips.destination`, `trips.destinationLat`, `trips.destinationLon`
--     remain as legacy denormalizations
--   - `destination_guides.tripId` keeps its UNIQUE constraint during Wave 1
--     (dropped in Wave 4 when multi-city guide generation ships)
--
-- Zero-downtime: all new columns are nullable or have defaults. All new
-- tables are empty on creation. The backfill step at the bottom populates
-- one `destinations` row per existing trip so legacy queries that join
-- on `destinations.tripId` return the expected single row.

-- ─── 1. Enums ───────────────────────────────────────────────────────────────

CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM_MONTHLY', 'PREMIUM_ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED');
CREATE TYPE "PaymentGateway" AS ENUM ('MERCADO_PAGO', 'STRIPE');
CREATE TYPE "PaEntitlementSource" AS ENUM ('PREMIUM_MONTHLY', 'PACKAGE_PURCHASE', 'ONBOARDING', 'ADMIN_GRANT');

-- ─── 2. destinations table ──────────────────────────────────────────────────

CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "city" VARCHAR(150) NOT NULL,
    "country" VARCHAR(100),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "nights" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "destinations_tripId_order_key" ON "destinations"("tripId", "order");
CREATE INDEX "destinations_tripId_order_idx" ON "destinations"("tripId", "order");

ALTER TABLE "destinations" ADD CONSTRAINT "destinations_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. subscriptions table ─────────────────────────────────────────────────

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "gateway" "PaymentGateway",
    "gatewaySubscriptionId" VARCHAR(200),
    "gatewayCustomerId" VARCHAR(200),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE INDEX "subscriptions_status_currentPeriodEnd_idx" ON "subscriptions"("status", "currentPeriodEnd");
CREATE INDEX "subscriptions_plan_status_idx" ON "subscriptions"("plan", "status");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 4. subscription_events table (immutable audit) ────────────────────────

CREATE TABLE "subscription_events" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "gatewayEventId" VARCHAR(200),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- Unique on gatewayEventId guarantees webhook idempotency.
CREATE UNIQUE INDEX "subscription_events_gatewayEventId_key" ON "subscription_events"("gatewayEventId");
CREATE INDEX "subscription_events_subscriptionId_createdAt_idx" ON "subscription_events"("subscriptionId", "createdAt");
CREATE INDEX "subscription_events_type_createdAt_idx" ON "subscription_events"("type", "createdAt");

-- RESTRICT on delete so the audit log can never be orphaned silently.
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 5. pa_entitlements table ──────────────────────────────────────────────

CREATE TABLE "pa_entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PaEntitlementSource" NOT NULL,
    "amount" INTEGER NOT NULL,
    "consumed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pa_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pa_entitlements_userId_expiresAt_idx" ON "pa_entitlements"("userId", "expiresAt");
CREATE INDEX "pa_entitlements_userId_source_idx" ON "pa_entitlements"("userId", "source");

ALTER TABLE "pa_entitlements" ADD CONSTRAINT "pa_entitlements_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pa_entitlements" ADD CONSTRAINT "pa_entitlements_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 6. destination_guides: add nullable destinationId ─────────────────────

ALTER TABLE "destination_guides" ADD COLUMN "destinationId" TEXT;

ALTER TABLE "destination_guides" ADD CONSTRAINT "destination_guides_destinationId_fkey"
    FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "destination_guides_destinationId_idx" ON "destination_guides"("destinationId");

-- NOTE: `destination_guides.tripId` keeps its UNIQUE constraint during Wave 1
-- to preserve compatibility with 15+ legacy call sites that do
-- `findUnique({where: {tripId}})`. Wave 4 (multi-city guide generation) will:
--   1. Backfill `destinationId` for every row
--   2. Drop `destination_guides_tripId_key`
--   3. Enforce `destinationId NOT NULL` and add `UNIQUE(destinationId)`
--   4. Refactor legacy call sites to use `findFirst` or per-destination lookups

-- ─── 7. itinerary_days: add destinationId + transit metadata ───────────────

ALTER TABLE "itinerary_days" ADD COLUMN "destinationId" TEXT;
ALTER TABLE "itinerary_days" ADD COLUMN "isTransit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "itinerary_days" ADD COLUMN "transitFrom" VARCHAR(150);
ALTER TABLE "itinerary_days" ADD COLUMN "transitTo" VARCHAR(150);

ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_destinationId_fkey"
    FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "itinerary_days_destinationId_idx" ON "itinerary_days"("destinationId");

-- ─── 8. Backfill: seed destinations from existing trips ────────────────────
--
-- Every non-deleted trip gets exactly one Destination row (order=0) that
-- mirrors the legacy scalar columns. After this step the Destination table
-- becomes the source of truth while `trips.destination*` is kept read-only
-- for backwards compatibility with legacy query paths.
--
-- The row id uses a deterministic prefix so follow-up statements in this
-- migration can reference it without a SELECT round-trip. Downstream Prisma
-- code will use the generated cuid IDs for all NEW destinations; only the
-- backfill rows carry the `dst_<tripId>` format.

INSERT INTO "destinations" (
    "id", "tripId", "order", "city", "country", "latitude", "longitude",
    "startDate", "endDate", "nights", "createdAt", "updatedAt"
)
SELECT
    'dst_' || "id",
    "id",
    0,
    "destination",
    NULL,
    "destinationLat",
    "destinationLon",
    "startDate",
    "endDate",
    CASE
      WHEN "startDate" IS NOT NULL AND "endDate" IS NOT NULL
      THEN GREATEST(1, DATE_PART('day', "endDate" - "startDate")::INTEGER)
      ELSE NULL
    END,
    "createdAt",
    "updatedAt"
FROM "trips"
WHERE "deletedAt" IS NULL;

-- ─── 9. Backfill: link existing guides and days to the backfilled destination ─

UPDATE "destination_guides" AS g
SET "destinationId" = 'dst_' || g."tripId"
WHERE g."destinationId" IS NULL
  AND EXISTS (SELECT 1 FROM "destinations" d WHERE d."id" = 'dst_' || g."tripId");

UPDATE "itinerary_days" AS d
SET "destinationId" = 'dst_' || d."tripId"
WHERE d."destinationId" IS NULL
  AND EXISTS (SELECT 1 FROM "destinations" dst WHERE dst."id" = 'dst_' || d."tripId");
