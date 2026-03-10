-- AlterTable: add origin and localMobility to trips
ALTER TABLE "trips" ADD COLUMN "origin" VARCHAR(150);
ALTER TABLE "trips" ADD COLUMN "localMobility" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: transport_segments
CREATE TABLE "transport_segments" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "segmentOrder" INTEGER NOT NULL DEFAULT 0,
    "transportType" VARCHAR(20) NOT NULL,
    "departurePlace" VARCHAR(150),
    "arrivalPlace" VARCHAR(150),
    "departureAt" TIMESTAMP(3),
    "arrivalAt" TIMESTAMP(3),
    "provider" VARCHAR(100),
    "bookingCodeEnc" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "notes" VARCHAR(500),
    "isReturn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: accommodations
CREATE TABLE "accommodations" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "accommodationType" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150),
    "address" VARCHAR(300),
    "bookingCodeEnc" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "estimatedCost" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "notes" VARCHAR(500),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_segments_tripId_segmentOrder_idx" ON "transport_segments"("tripId", "segmentOrder");
CREATE INDEX "transport_segments_tripId_isReturn_idx" ON "transport_segments"("tripId", "isReturn");
CREATE INDEX "accommodations_tripId_orderIndex_idx" ON "accommodations"("tripId", "orderIndex");

-- AddForeignKey
ALTER TABLE "transport_segments" ADD CONSTRAINT "transport_segments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
