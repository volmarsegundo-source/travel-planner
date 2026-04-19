// TEMPORARY tech-debt ESLint allowlist — tracked by docs/specs/tech-debt/SPEC-TECHDEBT-CI-001.md.
// Scheduled for removal in Sprint 45 (Saneamento). DO NOT add new files here — every entry
// is a pre-existing unused-var from pre-Beta wave (PR #32) cataloged in SPEC-TECHDEBT-CI-001 §5.3.
// Each file below has one or more `@typescript-eslint/no-unused-vars` errors that will be fixed
// in Sprint 45 by either deleting the unused identifier, prefixing with `_`, or wiring it up.
export default [
  {
    files: [
      "src/components/features/dashboard/DashboardV2.tsx",
      "src/components/features/dashboard/__tests__/TripCountdownInline.test.tsx",
      "src/components/features/expedition/DestinationGuideV2.tsx",
      "src/components/features/expedition/ExpeditionSummaryV2.tsx",
      "src/components/features/expedition/Phase3WizardV2.tsx",
      "src/components/features/expedition/Phase4WizardV2.tsx",
      "src/components/features/expedition/Phase6ItineraryV2.tsx",
      "src/components/layout/AuthenticatedNavbarV2.tsx",
      "src/server/services/ai.service.ts",
      "src/server/services/entitlement.service.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];
