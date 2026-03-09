-- CreateTable
CREATE TABLE "itinerary_plans" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "locale" VARCHAR(10) NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_plans_tripId_key" ON "itinerary_plans"("tripId");

-- AddForeignKey
ALTER TABLE "itinerary_plans" ADD CONSTRAINT "itinerary_plans_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
