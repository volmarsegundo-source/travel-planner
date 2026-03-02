/**
 * E2E — General navigation checks (AC-501 to AC-503)
 *
 * Validates that there are no console errors, no 500 server errors,
 * and that invalid URLs show a friendly 404 page.
 */

import { test, expect } from "@playwright/test";
import {
  trackConsoleErrors,
  trackServerErrors,
} from "./helpers/console-errors";

// ---------------------------------------------------------------------------
// AC-501: No console errors on main pages
// ---------------------------------------------------------------------------

test.describe("Navigation — no console errors", () => {
  const pages = [
    { name: "Landing (EN)", url: "/en/" },
    { name: "Landing (PT)", url: "/" },
    { name: "Login (EN)", url: "/en/auth/login" },
    { name: "Login (PT)", url: "/auth/login" },
    { name: "Register (EN)", url: "/en/auth/register" },
    { name: "Register (PT)", url: "/auth/register" },
  ];

  for (const { name, url } of pages) {
    test(`AC-501 — ${name} has no console errors`, async ({
      page,
    }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(url);
      await page.waitForLoadState("networkidle");

      // Filter out known benign errors (e.g., third-party scripts, favicon)
      const realErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("__nextjs") &&
          !e.includes("hydration")
      );

      expect(
        realErrors,
        `Console errors found on ${name}: ${realErrors.join(", ")}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-502: No 500 server errors on main pages
// ---------------------------------------------------------------------------

test.describe("Navigation — no 500 server errors", () => {
  const pages = [
    { name: "Landing", url: "/en/" },
    { name: "Login", url: "/en/auth/login" },
    { name: "Register", url: "/en/auth/register" },
  ];

  for (const { name, url } of pages) {
    test(`AC-502 — ${name} has no 500 server errors`, async ({
      page,
    }) => {
      const serverErrors = trackServerErrors(page);
      await page.goto(url);
      await page.waitForLoadState("networkidle");

      expect(
        serverErrors,
        `Server 500 errors on ${name}: ${JSON.stringify(serverErrors)}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-503: Invalid URL → friendly 404 page
// ---------------------------------------------------------------------------

test.describe("Navigation — 404 page", () => {
  test("AC-503 — accessing an invalid URL shows a friendly 404 page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/en/pagina-inexistente");
    await page.waitForLoadState("networkidle");

    // Should see a 404 indicator — heading, text, or status
    const notFoundIndicator = page
      .getByText(/not found|404|página não encontrada|não encontrad/i)
      .first();

    await expect(notFoundIndicator).toBeVisible({ timeout: 10_000 });

    // Should NOT be a blank page — some content must be rendered
    const bodyText = await page.textContent("body");
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });
});
