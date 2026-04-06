-- AlterTable: Add isManual flag to activities (SPEC-ROTEIRO-REGEN-INTELIGENTE)
-- All existing activities default to false (AI-generated).
ALTER TABLE "activities" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;
