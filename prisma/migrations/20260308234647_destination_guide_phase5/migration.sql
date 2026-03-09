-- CreateTable
CREATE TABLE "destination_guides" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "destination" VARCHAR(200) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "generationCount" INTEGER NOT NULL DEFAULT 1,
    "viewedSections" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destination_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destination_guides_tripId_key" ON "destination_guides"("tripId");

-- AddForeignKey
ALTER TABLE "destination_guides" ADD CONSTRAINT "destination_guides_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
