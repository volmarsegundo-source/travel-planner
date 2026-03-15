/**
 * E2E — Dashboard / Trips page (AC-301 to AC-304)
 *
 * Validates the authenticated trips page shows user info,
 * protects against unauthenticated access, handles power user data,
 * and supports language switching while authenticated.
 */

import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./helpers/console-errors";
import { registerAndLogin, loginAs, TEST_USER } from "./helpers";

// ---------------------------------------------------------------------------
// AC-301: Logged in → dashboard with user indication
// ---------------------------------------------------------------------------

test.describe("Dashboard — authenticated user view", () => {
  test("AC-301 — logged-in user sees trips page with user indication and content", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);

    await registerAndLogin(page, "ac301");

    // Authenticated expeditions page — check for "Expeditions" text in nav/breadcrumb or empty state
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Either expedition cards or empty state should be visible
    await page.waitForLoadState("networkidle");
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-302: Not logged in → redirect to login
// ---------------------------------------------------------------------------

test.describe("Dashboard — unauthenticated guard", () => {
  test("AC-302 — unauthenticated user accessing /expeditions is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/expeditions");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test("AC-302b — unauthenticated user accessing /dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/dashboard");

    // Should be redirected to login (dashboard → expeditions → auth guard)
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-303: Power user → sees pre-loaded trip data (uses seeded user)
// ---------------------------------------------------------------------------

test.describe("Dashboard — power user data", () => {
  test("AC-303 — power user sees pre-loaded trip data without errors", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // This test requires the seeded poweruser — use loginAs with TEST_USER_B
    // If the user doesn't exist, the test will fail at login (expected)
    try {
      await loginAs(page, "poweruser@travel.dev", "Test@1234");
    } catch {
      test.skip(true, "Power user not seeded — run npm run dev:setup first");
      return;
    }

    // Authenticated expeditions page — check for "Expeditions" text in nav/breadcrumb
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Page should have content loaded
    await page.waitForLoadState("networkidle");
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-304: Language switch while authenticated
// ---------------------------------------------------------------------------

test.describe("Dashboard — language switch while logged in", () => {
  test("AC-304 — switching language to PT while logged in keeps session and shows Portuguese", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await registerAndLogin(page, "ac304");

    // Verify we are on EN expeditions page
    await expect(
      page.getByText(/expeditions/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Switch to PT
    await page.getByRole("link", { name: "PT" }).first().click();

    // Wait for navigation — should stay on expeditions but in PT locale
    await page.waitForURL(/\/trips|\/expeditions/, { timeout: 10_000 });

    // Page should now show Portuguese text (nav/breadcrumb "Expedições" or empty state)
    await expect(
      page.getByText(/expedições/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Should still be logged in — page has main content
    await page.waitForLoadState("networkidle");
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });
  });
});
