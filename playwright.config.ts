import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["html"], ["list"]],
  timeout: 90_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    // ── Desktop — P0 ──────────────────────────────────────────────────────────
    {
      // Primary browser for all E2E runs. Desktop Chrome uses a 1280x720
      // viewport by default via the Playwright device descriptor.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Explicit 1280x800 desktop viewport — matches the QA test-strategy
      // baseline resolution defined in docs/QA-SPEC-001.md.
      name: "desktop-1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },

    // ── Desktop — P1 ──────────────────────────────────────────────────────────
    {
      // Firefox cross-browser coverage — P1 priority per QA-SPEC-001.
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      // WebKit / Safari cross-browser coverage — P1 priority per QA-SPEC-001.
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // ── Mobile — P1 ───────────────────────────────────────────────────────────
    {
      // Pixel 5 — 393x851 physical, emulated at 1x. Covers the responsive
      // breakpoints used in TripDashboard and CreateTripModal.
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },

    // ── Smoke only ────────────────────────────────────────────────────────────
    {
      // Fast smoke suite — runs only *.smoke.ts files in CI pre-deploy gate.
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/*.smoke.ts",
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
