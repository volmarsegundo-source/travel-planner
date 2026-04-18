-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "aiConsentGiven" BOOLEAN;
ALTER TABLE "user_profiles" ADD COLUMN "aiConsentAt" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN "aiConsentVersion" VARCHAR(10);
