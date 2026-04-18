-- Grandfather: set consent for users who already have AI-generated content
-- Per SPEC-ARCH-056 Section 5 (OQ-056-01 resolution)
UPDATE user_profiles
SET
  "aiConsentGiven" = true,
  "aiConsentVersion" = 'v0-legacy',
  "aiConsentAt" = NULL
WHERE "userId" IN (
  SELECT DISTINCT t."userId"
  FROM trips t
  WHERE t."userId" IS NOT NULL
    AND t."deletedAt" IS NULL
    AND (
      EXISTS (SELECT 1 FROM destination_guides dg WHERE dg."tripId" = t.id)
      OR EXISTS (SELECT 1 FROM itinerary_plans ip WHERE ip."tripId" = t.id)
    )
)
AND "aiConsentGiven" IS NULL;
