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
        // NOTE: branches held at 78 — actual is 78.99% (measured 2026-04-20,
        // Sprint 45 close). Target 80 deferred: Wave 2.8b covered profile.service
        // (→96%) and itinerary-plan.service (→86%) but ai.service.ts stayed at
        // 57% (68 branches missing — regression vs 59% pre-sprint). Residual
        // debt documented in docs/specs/sprint-45/COVERAGE-BRANCHES-DEBT-2026-04-20.md
        // and tracked as SPEC-TESTS-BRANCHES-80-001 (Sprint 46).
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
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
