-- AlterTable: Add passengers JSON field to trips
ALTER TABLE "trips" ADD COLUMN "passengers" JSONB;
