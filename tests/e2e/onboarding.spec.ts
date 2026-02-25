import { test, expect } from "@playwright/test";

/**
 * T-014 — E2E: Onboarding wizard flows
 * Tests: auth guard, 3-step wizard navigation, skip button, mobile
 *
 * NOTE: The OnboardingWizard is a client component rendered only after the
 * server-side auth check passes.  Tests that require an authenticated session
 * are marked `.skip` with setup notes.
 */

test.describe("Auth guard — /onboarding", () => {
  test("redirects unauthenticated user to /auth/login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("login page rendered after redirect has email field", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });
});

test.describe("Onboarding wizard — authenticated (skip until storageState exists)", () => {
  /**
   * These tests require a real authenticated session.
   * Setup:  add `storageState: 'playwright/.auth/user.json'` to the project
   *         in playwright.config.ts and create a globalSetup that seeds a
   *         test user and stores the session.
   */

  test.skip("renders step 1 with progress indicator (1 of 3)", async ({ page }) => {
    // await page.goto("/onboarding");
    // await expect(page.getByText(/1.*3|passo 1/i)).toBeVisible();
    // await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test.skip("clicking the CTA advances to step 2", async ({ page }) => {
    // await page.goto("/onboarding");
    // const cta = page.getByRole("button").filter({ hasNot: page.getByText(/pular/i) }).first();
    // await cta.click();
    // await expect(page.getByText(/2.*3|passo 2/i)).toBeVisible();
  });

  test.skip("clicking the CTA on step 2 advances to step 3", async ({ page }) => {
    // await page.goto("/onboarding");
    // navigate to step 2 then click CTA
    // await expect(page.getByText(/3.*3|passo 3/i)).toBeVisible();
  });

  test.skip("completing step 3 navigates to /trips?onboarding=done", async ({ page }) => {
    // After completing all 3 steps the router.push fires
    // await expect(page).toHaveURL(/\/trips.*onboarding=done/);
  });

  test.skip("'Pular' button skips to /trips immediately", async ({ page }) => {
    // await page.goto("/onboarding");
    // await page.getByRole("button", { name: /pular/i }).click();
    // await expect(page).toHaveURL(/\/trips/);
  });

  test.skip("heading on step 1 includes user first name", async ({ page }) => {
    // await page.goto("/onboarding");
    // heading should contain the test user's first name
  });
});

test.describe("Onboarding — mobile 375px", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("redirect to login at 375px has no horizontal scroll", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/login/);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test.skip("wizard renders single-column at 375px without overflow", async ({ page }) => {
    // await page.goto("/onboarding");
    // const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    // const clientWidth = await page.evaluate(() => document.body.clientWidth);
    // expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
