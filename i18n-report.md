# i18n Consistency Report

**Date:** 2026-04-17

## Summary

| Check | Issues |
|-------|--------|
| Missing keys | 5 |
| Orphaned keys | 186 |
| Interpolation mismatches | 2 |
| Hardcoded strings | 7 |

**Total issues:** 200

## Missing Keys

- **[MEDIUM]** `phaseReorderBanner.message` — present in en, missing in pt-BR
- **[MEDIUM]** `phaseReorderBanner.dismiss` — present in en, missing in pt-BR
- **[MEDIUM]** `phaseReorderBanner.dismissAriaLabel` — present in en, missing in pt-BR
- **[MEDIUM]** `phaseReorderBanner.learnMore` — present in en, missing in pt-BR
- **[MEDIUM]** `phaseReorderBanner.learnMoreHref` — present in en, missing in pt-BR

## Orphaned Keys

- **[LOW]** `common.appName` — not referenced in source code
- **[LOW]** `navigation.userMenu` — not referenced in source code
- **[LOW]** `auth.resetPassword` — not referenced in source code
- **[LOW]** `auth.sendResetLink` — not referenced in source code
- **[LOW]** `auth.dontHaveAccount` — not referenced in source code
- **[LOW]** `auth.verifyEmailMessage` — not referenced in source code
- **[LOW]** `auth.resendEmail` — not referenced in source code
- **[LOW]** `auth.emailVerified` — not referenced in source code
- **[LOW]** `auth.passwordResetSent` — not referenced in source code
- **[LOW]** `auth.errors.emailRequired` — not referenced in source code
- **[LOW]** `auth.errors.emailNotVerified` — not referenced in source code
- **[LOW]** `authV2.showPassword` — not referenced in source code
- **[LOW]** `authV2.hidePassword` — not referenced in source code
- **[LOW]** `trips.errors.notAuthorized` — not referenced in source code
- **[LOW]** `itinerary.wizard.stepDestination` — not referenced in source code
- **[LOW]** `landing.hero.loginPrompt` — not referenced in source code
- **[LOW]** `landing.hero.eyebrow` — not referenced in source code
- **[LOW]** `landing.hero.titleHighlight` — not referenced in source code
- **[LOW]** `landing.hero.stat1Value` — not referenced in source code
- **[LOW]** `landing.hero.stat1Label` — not referenced in source code
- **[LOW]** `landing.hero.stat2Value` — not referenced in source code
- **[LOW]** `landing.hero.stat2Label` — not referenced in source code
- **[LOW]** `landing.hero.stat3Value` — not referenced in source code
- **[LOW]** `landing.hero.stat3Label` — not referenced in source code
- **[LOW]** `landing.features.sectionTag` — not referenced in source code
- **[LOW]** `account.accountDeleted` — not referenced in source code
- **[LOW]** `account.errors.deleteFailed` — not referenced in source code
- **[LOW]** `dashboard.phaseProgress` — not referenced in source code
- **[LOW]** `dashboard.currentPhase` — not referenced in source code
- **[LOW]** `dashboard.itineraryGenerated` — not referenced in source code
- **[LOW]** `dashboard.viewChecklist` — not referenced in source code
- **[LOW]** `dashboard.viewItinerary` — not referenced in source code
- **[LOW]** `dashboard.expeditions.sortAnnouncement` — not referenced in source code
- **[LOW]** `expedition.phase1.step1.useProfile` — not referenced in source code
- **[LOW]** `expedition.phase1.errors.dateRequired` — not referenced in source code
- **[LOW]** `expedition.phase2.groupSize.decrease` — not referenced in source code
- **[LOW]** `expedition.phase2.groupSize.increase` — not referenced in source code
- **[LOW]** `expedition.phase2.preferences.dietary` — not referenced in source code
- **[LOW]** `expedition.phase2.preferences.dietaryPlaceholder` — not referenced in source code
- **[LOW]** `expedition.phase2.preferences.accessibilityPlaceholder` — not referenced in source code
- **[LOW]** `expedition.phase2.step5.groupSize` — not referenced in source code
- **[LOW]** `expedition.phase2.step5.childrenAges` — not referenced in source code
- **[LOW]** `expedition.phase2.step5.preferencesCount` — not referenced in source code
- **[LOW]** `expedition.phase3.ctaDisabled` — not referenced in source code
- **[LOW]** `expedition.phase3.advancePending` — not referenced in source code
- **[LOW]** `expedition.phase3.advancePartial` — not referenced in source code
- **[LOW]** `expedition.phase3.advanceComplete` — not referenced in source code
- **[LOW]** `expedition.phase3.goToCurrentPhase` — not referenced in source code
- **[LOW]** `expedition.phase3.ctaBackReordered` — not referenced in source code
- **[LOW]** `expedition.phase4.ctaDisabled` — not referenced in source code
- **[LOW]** `expedition.phase4.advancePending` — not referenced in source code
- **[LOW]** `expedition.phase4.advancePartial` — not referenced in source code
- **[LOW]** `expedition.phase4.advanceComplete` — not referenced in source code
- **[LOW]** `expedition.phase4.goToCurrentPhase` — not referenced in source code
- **[LOW]** `expedition.phase4.transport.removeConfirm` — not referenced in source code
- **[LOW]** `expedition.phase4.transport.isReturn` — not referenced in source code
- **[LOW]** `expedition.phase4.accommodation.removeConfirm` — not referenced in source code
- **[LOW]** `expedition.phase4.ctaBackReordered` — not referenced in source code
- **[LOW]** `expedition.phase5.regenerateCta` — not referenced in source code
- **[LOW]** `expedition.phase5.completeCta` — not referenced in source code
- **[LOW]** `expedition.phase5.viewAllSectionsHint` — not referenced in source code
- **[LOW]** `expedition.phase5.ctaBackReordered` — not referenced in source code
- **[LOW]** `expedition.phase6.regenerateCta` — not referenced in source code
- **[LOW]** `expedition.phase6.cancelGeneration` — not referenced in source code
- **[LOW]** `expedition.phase6.regenerateConfirmTitle` — not referenced in source code
- **[LOW]** `expedition.phase6.regenerateConfirmMessage` — not referenced in source code
- **[LOW]** `expedition.phase6.footerBack` — not referenced in source code
- **[LOW]** `expedition.phase6.activityDeleting` — not referenced in source code
- **[LOW]** `expedition.phase6.backToGuide` — not referenced in source code
- **[LOW]** `expedition.phase6.style_culture` — not referenced in source code
- **[LOW]** `expedition.phase6.style_adventure` — not referenced in source code
- **[LOW]** `expedition.phase6.style_relaxation` — not referenced in source code
- **[LOW]** `expedition.phase6.style_gastronomy` — not referenced in source code
- **[LOW]** `expedition.phase6.style_sports` — not referenced in source code
- **[LOW]** `expedition.phase6.category_gastronomic` — not referenced in source code
- **[LOW]** `expedition.phase6.category_cultural` — not referenced in source code
- **[LOW]** `expedition.phase6.category_adventure` — not referenced in source code
- **[LOW]** `expedition.phase6.category_relaxation` — not referenced in source code
- **[LOW]** `expedition.phase6.category_nightlife` — not referenced in source code
- **[LOW]** `expedition.phase6.category_family` — not referenced in source code
- **[LOW]** `expedition.phase6.category_shopping` — not referenced in source code
- **[LOW]** `expedition.phase6.category_sports` — not referenced in source code
- **[LOW]** `expedition.phase6.category_religious` — not referenced in source code
- **[LOW]** `expedition.phase6.ctaBackReordered` — not referenced in source code
- **[LOW]** `expedition.cta.completing` — not referenced in source code
- **[LOW]** `expedition.completeConfirm` — not referenced in source code
- **[LOW]** `expedition.completeConfirmYes` — not referenced in source code
- **[LOW]** `expedition.completeConfirmNo` — not referenced in source code
- **[LOW]** `expedition.summary.notCompleted` — not referenced in source code
- **[LOW]** `expedition.summary.pace` — not referenced in source code
- **[LOW]** `expedition.summary.highlights` — not referenced in source code
- **[LOW]** `expedition.summary.totalActivities` — not referenced in source code
- **[LOW]** `expedition.summary.maskedBookingCode` — not referenced in source code
- **[LOW]** `expedition.summary.expeditionCompleted` — not referenced in source code
- **[LOW]** `expedition.summaryV2.heroCompletionFull` — not referenced in source code
- **[LOW]** `expedition.summaryV2.heroCompletionLabel` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewTitle` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewOrigin` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewDestination` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewDeparture` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewReturn` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewTripType` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewTravelers` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewBudget` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewStyle` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewFlexibleDates` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewNotDefined` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewNotInformed` — not referenced in source code
- **[LOW]** `expedition.summaryV2.overviewComplete1` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase1No` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase2TravelerType` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase2AccommodationStyle` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase5NotGenerated` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase6NotGenerated` — not referenced in source code
- **[LOW]** `expedition.summaryV2.gamificationPA` — not referenced in source code
- **[LOW]** `expedition.summaryV2.gamificationPhasesCompleted` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase2Styles` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase2Accessibility` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase2NotDefined` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase4CarRentalNo` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase4PendingSteps` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase4TransportPending` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase4AccommodationPending` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase4MobilityPending` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase6DayTitle` — not referenced in source code
- **[LOW]** `expedition.summaryV2.phase6DayActivitiesList` — not referenced in source code
- **[LOW]** `expedition.phaseProgress` — not referenced in source code
- **[LOW]** `gamification.phases.theDayMap` — not referenced in source code
- **[LOW]** `gamification.phases.theTreasure` — not referenced in source code
- **[LOW]** `gamification.badge.viewProfile` — not referenced in source code
- **[LOW]** `gamification.howItWorks.levelTable.threshold` — not referenced in source code
- **[LOW]** `gamification.howItWorks.faq.a1` — not referenced in source code
- **[LOW]** `gamification.howItWorks.faq.a2` — not referenced in source code
- **[LOW]** `gamification.howItWorks.faq.a3` — not referenced in source code
- **[LOW]** `gamification.howItWorks.faq.a4` — not referenced in source code
- **[LOW]** `admin.dashboard.kpisTitle` — not referenced in source code
- **[LOW]** `admin.dashboard.margin` — not referenced in source code
- **[LOW]** `admin.dashboard.columnRevenue` — not referenced in source code
- **[LOW]** `admin.dashboard.noUsers` — not referenced in source code
- **[LOW]** `admin.dashboard.export.exported` — not referenced in source code
- **[LOW]** `admin.dashboard.period.custom` — not referenced in source code
- **[LOW]** `admin.aiGovernance.perPhase` — not referenced in source code
- **[LOW]** `admin.adminAnalytics.aiUsageTitle` — not referenced in source code
- **[LOW]** `admin.prompts.response` — not referenced in source code
- **[LOW]** `admin.prompts.cacheHitNo` — not referenced in source code
- **[LOW]** `admin.prompts.interactionId` — not referenced in source code
- **[LOW]** `admin.prompts.createdAt` — not referenced in source code
- **[LOW]** `admin.prompts.templateNotFound` — not referenced in source code
- **[LOW]** `admin.prompts.viewTemplate` — not referenced in source code
- **[LOW]** `atlas.noCoordinates` — not referenced in source code
- **[LOW]** `atlas.noCoordinatesHint` — not referenced in source code
- **[LOW]** `atlas.mapError` — not referenced in source code
- **[LOW]** `atlas.retry` — not referenced in source code
- **[LOW]** `report.ageRange` — not referenced in source code
- **[LOW]** `report.interestsLabel` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q1.question` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q1.answer` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q2.question` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q2.answer` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q3.question` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q3.answer` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q4.question` — not referenced in source code
- **[LOW]** `legal.support.faq.items.q4.answer` — not referenced in source code
- **[LOW]** `destination.placeholder` — not referenced in source code
- **[LOW]** `destination.recentSearches` — not referenced in source code
- **[LOW]** `destination.clearRecent` — not referenced in source code
- **[LOW]** `destination.overlayTitle` — not referenced in source code
- **[LOW]** `designSystem.stepper.increase` — not referenced in source code
- **[LOW]** `designSystem.stepper.decrease` — not referenced in source code
- **[LOW]** `designSystem.input.showPassword` — not referenced in source code
- **[LOW]** `designSystem.input.hidePassword` — not referenced in source code
- **[LOW]** `designSystem.badge.newNotification` — not referenced in source code
- **[LOW]** `designSystem.badge.notificationCount` — not referenced in source code
- **[LOW]** `designSystem.phaseProgress.goToPhase` — not referenced in source code
- **[LOW]** `designSystem.chip.remove` — not referenced in source code
- **[LOW]** `landingV2.hero.imageAlt` — not referenced in source code
- **[LOW]** `landingV2.destinations.rio.imageAlt` — not referenced in source code
- **[LOW]** `landingV2.destinations.bonito.imageAlt` — not referenced in source code
- **[LOW]** `landingV2.destinations.pantanal.imageAlt` — not referenced in source code
- **[LOW]** `dashboardV2.nextTrips` — not referenced in source code
- **[LOW]** `subscription.conflict.alreadyTrialing` — not referenced in source code
- **[LOW]** `premium.trial.cardRequired` — not referenced in source code
- **[LOW]** `premium.myPlan.status.trialing` — not referenced in source code
- **[LOW]** `premium.myPlan.status.past_due` — not referenced in source code
- **[LOW]** `premium.myPlan.status.canceled` — not referenced in source code
- **[LOW]** `premium.myPlan.status.expired` — not referenced in source code

## Interpolation Mismatches

- **[HIGH]** `dashboard.expeditions.tripCount` — variables differ: {"en":["count","expedition","expeditions"],"pt-BR":["count"]}
- **[HIGH]** `expedition.phase2.step5.preferencesCount` — variables differ: {"en":["categories","category","count"],"pt-BR":["categoria","categorias","count"]}

## Hardcoded Strings

- **[MEDIUM]** "Something went wrong" in `src/app/global-error.tsx:21`
- **[MEDIUM]** "Recent Alerts" in `src/app/[locale]/(app)/admin/evals/page.tsx:105`
- **[MEDIUM]** "Eval Results" in `src/app/[locale]/(app)/admin/evals/page.tsx:135`
- **[MEDIUM]** "Trust Score" in `src/app/[locale]/(app)/admin/evals/page.tsx:205`
- **[MEDIUM]** "Verify your email" in `src/app/[locale]/auth/verify-email/page.tsx:36`
- **[MEDIUM]** "Verification failed" in `src/app/[locale]/auth/verify-email/page.tsx:49`
- **[MEDIUM]** "Close" in `src/components/ui/dialog.tsx:76`

