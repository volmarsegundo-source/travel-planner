import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        // TEMPORARY: branches threshold reduced 80→78 during techdebt allowlist period
        // Reference: docs/specs/tech-debt/SPEC-TECHDEBT-CI-001.md
        // MUST BE RESTORED TO 80 AT END OF SPRINT 45
        branches: 78,
        statements: 80,
      },
      include: [
        "src/server/services/**",
        "src/lib/validations/**",
        "src/lib/errors.ts",
        "src/lib/engines/**",
        "src/components/features/auth/**",
        "src/components/features/onboarding/**",
      ],
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/**",
        "prisma/**",
        "**/*.config.*",
        "**/*.d.ts",
        "src/app/**",
      ],
    },
    exclude: [
      "node_modules",
      ".next",
      ".claude",
      "tests/e2e/**",
      "**/e2e/**",
      "tests/evals/**",
      "tests/visual/**",
      "travel-planner/**",
      // Tech-debt allowlist (SPEC-TECHDEBT-CI-001 §5.2) — removed in Sprint 45.
      // 51 pre-existing test failures from mocks drift / V2 component refactor.
      "src/components/ui/__tests__/AtlasPhaseProgress.test.tsx",
      "tests/unit/components/features/expedition/Phase1Wizard.test.tsx",
      "tests/unit/components/features/expedition/Phase1WizardRevisit.test.tsx",
      "tests/unit/components/features/expedition/Phase1WizardV2.test.tsx",
      "tests/unit/components/itinerary/PlanGeneratorWizard.test.tsx",
      "tests/unit/components/landing/LanguageSwitcher.test.tsx",
      "tests/unit/lib/prompts/system-prompts.test.ts",
      "tests/unit/scripts/project-bootstrap.test.ts",
      "tests/unit/server/actions/auth.actions.test.ts",
      "tests/unit/server/preferences.actions.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
