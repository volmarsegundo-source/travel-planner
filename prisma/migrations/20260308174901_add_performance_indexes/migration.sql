-- CreateIndex
CREATE INDEX "expedition_phases_tripId_status_idx" ON "expedition_phases"("tripId", "status");

-- CreateIndex
CREATE INDEX "point_transactions_userId_type_tripId_idx" ON "point_transactions"("userId", "type", "tripId");
