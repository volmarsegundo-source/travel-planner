-- CreateTable
CREATE TABLE "phase_checklist_items" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "itemKey" VARCHAR(50) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "deadline" TIMESTAMP(3),
    "pointsValue" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phase_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phase_checklist_items_tripId_phaseNumber_itemKey_key" ON "phase_checklist_items"("tripId", "phaseNumber", "itemKey");

-- CreateIndex
CREATE INDEX "phase_checklist_items_tripId_phaseNumber_idx" ON "phase_checklist_items"("tripId", "phaseNumber");

-- AddForeignKey
ALTER TABLE "phase_checklist_items" ADD CONSTRAINT "phase_checklist_items_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
