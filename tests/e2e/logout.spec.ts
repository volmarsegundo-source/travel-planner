/**
 * E2E — Logout flow (AC-401 to AC-403)
 *
 * Validates that logout redirects to landing, session is cleared,
 * and back-button does not show protected content.
 */

import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./helpers/console-errors";
import { registerAndLogin } from "./helpers";

// ---------------------------------------------------------------------------
// AC-401: Logout → redirect to landing page
// ---------------------------------------------------------------------------

test.describe("Logout — redirect to landing", () => {
  test("AC-401 — clicking logout redirects to the landing page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await registerAndLogin(page, "ac401");

    // Open user menu and click sign out
    const avatarButton = page.locator(
      'button[aria-haspopup="menu"]'
    );
    await avatarButton.click();

    // Click "Sign out" in the dropdown
    await page
      .getByRole("menuitem", { name: /sign out|sair/i })
      .click();

    // Should redirect to landing page
    await page.waitForURL(/\/(en\/)?$/, { timeout: 30_000 });

    // Landing page content should be visible
    await expect(
      page.getByRole("heading", {
        name: /plan your perfect trip|planeje sua viagem perfeita/i,
      })
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-402: After logout → /trips redirects to login
// ---------------------------------------------------------------------------

test.describe("Logout — session cleared", () => {
  test("AC-402 — after logout, accessing /trips redirects to login", async ({
    page,
  }) => {
    await registerAndLogin(page, "ac402");

    // Perform logout
    const avatarButton = page.locator(
      'button[aria-haspopup="menu"]'
    );
    await avatarButton.click();
    await page
      .getByRole("menuitem", { name: /sign out|sair/i })
      .click();
    await page.waitForURL(/\/(en\/)?$/, { timeout: 30_000 });

    // Now try to access trips directly
    await page.goto("/en/trips");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-403: Back button after logout → no dashboard content
// ---------------------------------------------------------------------------

test.describe("Logout — back button protection", () => {
  test("AC-403 — pressing back after logout does not show dashboard content", async ({
    page,
  }) => {
    await registerAndLogin(page, "ac403");

    // Verify we are on the trips page
    await expect(
      page.getByRole("heading", { name: /my trips|minhas viagens/i })
    ).toBeVisible();

    // Perform logout
    const avatarButton = page.locator(
      'button[aria-haspopup="menu"]'
    );
    await avatarButton.click();
    await page
      .getByRole("menuitem", { name: /sign out|sair/i })
      .click();
    await page.waitForURL(/\/(en\/)?$/, { timeout: 30_000 });

    // Press back button
    await page.goBack();

    // Should NOT see the trips dashboard content
    // Should be redirected to login or see the landing page
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const isOnProtectedPage = /\/trips/.test(url);

    if (isOnProtectedPage) {
      // If the browser cache shows the trips URL, at minimum the content
      // should not be the authenticated dashboard — it should redirect
      await expect(page).toHaveURL(/\/auth\/login/, {
        timeout: 10_000,
      });
    }
    // Otherwise we are on the landing page or login — that is correct
  });
});
