-- AlterTable: Add guide personalization columns (SPEC-GUIA-PERSONALIZACAO)
ALTER TABLE "destination_guides" ADD COLUMN "extraCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "destination_guides" ADD COLUMN "personalNotes" TEXT;
ALTER TABLE "destination_guides" ADD COLUMN "regenCount" INTEGER NOT NULL DEFAULT 0;
