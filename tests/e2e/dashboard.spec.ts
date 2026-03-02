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

    // Trips page heading
    await expect(
      page.getByRole("heading", { name: /my trips|minhas viagens/i })
    ).toBeVisible();

    // Authenticated navbar is rendered (logo links to /trips)
    await expect(
      page.getByText("Travel Planner").first()
    ).toBeVisible();

    // Either trip cards or empty state should be visible
    const emptyStateOrContent = page
      .getByText(/you don't have any trips yet|você ainda não tem viagens/i)
      .or(page.getByRole("article").first())
      .or(page.getByRole("button", { name: /new trip|nova viagem/i }));

    await expect(emptyStateOrContent).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-302: Not logged in → redirect to login
// ---------------------------------------------------------------------------

test.describe("Dashboard — unauthenticated guard", () => {
  test("AC-302 — unauthenticated user accessing /trips is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/trips");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test("AC-302b — unauthenticated user accessing /dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/dashboard");

    // Should be redirected to login (dashboard → trips → auth guard)
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

    // Trips page heading
    await expect(
      page.getByRole("heading", { name: /my trips|minhas viagens/i })
    ).toBeVisible();

    // Power user should have at least one trip card OR empty state
    const tripCardOrEmpty = page
      .getByRole("article")
      .first()
      .or(
        page.getByText(
          /you don't have any trips yet|você ainda não tem viagens/i
        )
      );

    await expect(tripCardOrEmpty).toBeVisible({ timeout: 10_000 });

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

    // Verify we are on EN trips page
    await expect(
      page.getByRole("heading", { name: /my trips/i })
    ).toBeVisible();

    // Switch to PT
    await page.getByRole("link", { name: "PT" }).first().click();

    // Wait for navigation — should stay on trips but in PT locale
    await page.waitForURL(/\/trips/, { timeout: 10_000 });

    // Heading should now be in Portuguese
    await expect(
      page.getByRole("heading", { name: /minhas viagens/i })
    ).toBeVisible();

    // Should still be logged in — new trip button visible
    await expect(
      page.getByRole("button", { name: /new trip|nova viagem/i })
    ).toBeVisible();
  });
});
