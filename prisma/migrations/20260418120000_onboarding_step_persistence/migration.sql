-- BUG F3: Add onboarding step persistence fields to user_profiles
--
-- onboardingStep: tracks which step the user is currently on (0 = not started)
-- onboardingData: stores partial wizard data as JSON between steps
-- onboardingCompletedAt: timestamp when onboarding was fully completed

ALTER TABLE "user_profiles" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_profiles" ADD COLUMN "onboardingData" JSONB;
ALTER TABLE "user_profiles" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
