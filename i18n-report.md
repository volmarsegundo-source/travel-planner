# i18n Consistency Report

**Date:** 2026-03-09

## Summary

| Check | Issues |
|-------|--------|
| Missing keys | 0 |
| Orphaned keys | 23 |
| Interpolation mismatches | 0 |
| Hardcoded strings | 4 |

**Total issues:** 27

## Orphaned Keys

- **[LOW]** `common.finish` — not referenced in source code
- **[LOW]** `navigation.userMenu` — not referenced in source code
- **[LOW]** `auth.resetPassword` — not referenced in source code
- **[LOW]** `auth.sendResetLink` — not referenced in source code
- **[LOW]** `auth.verifyEmailMessage` — not referenced in source code
- **[LOW]** `auth.resendEmail` — not referenced in source code
- **[LOW]** `auth.emailVerified` — not referenced in source code
- **[LOW]** `auth.passwordResetSent` — not referenced in source code
- **[LOW]** `auth.errors.emailRequired` — not referenced in source code
- **[LOW]** `auth.errors.emailNotVerified` — not referenced in source code
- **[LOW]** `trips.errors.notAuthorized` — not referenced in source code
- **[LOW]** `itinerary.wizard.stepDestination` — not referenced in source code
- **[LOW]** `itinerary.wizard.dates` — not referenced in source code
- **[LOW]** `landing.hero.loginPrompt` — not referenced in source code
- **[LOW]** `account.accountDeleted` — not referenced in source code
- **[LOW]** `account.errors.deleteFailed` — not referenced in source code
- **[LOW]** `profile.rank` — not referenced in source code
- **[LOW]** `profile.stats.expeditions` — not referenced in source code
- **[LOW]** `profile.stats.badgesEarned` — not referenced in source code
- **[LOW]** `profile.stats.phasesCompleted` — not referenced in source code
- **[LOW]** `errors.network` — not referenced in source code
- **[LOW]** `errors.unauthorized` — not referenced in source code
- **[LOW]** `errors.forbidden` — not referenced in source code

## Hardcoded Strings

- **[MEDIUM]** "Authentication Error" in `src/app/[locale]/auth/error/page.tsx:27`
- **[MEDIUM]** "Verify your email" in `src/app/[locale]/auth/verify-email/page.tsx:36`
- **[MEDIUM]** "Verification failed" in `src/app/[locale]/auth/verify-email/page.tsx:49`
- **[MEDIUM]** "Close" in `src/components/ui/dialog.tsx:76`

