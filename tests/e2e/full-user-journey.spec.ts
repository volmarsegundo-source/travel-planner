/**
 * E2E — Full User Journey
 *
 * Simulates a complete first-time user experience:
 * landing → register → verify-email → login → trips → language switch → logout
 *
 * This is the most important E2E test — it validates the entire flow
 * that a real user would follow from their first visit to logout.
 */

import { test, expect } from "@playwright/test";
import {
  trackConsoleErrors,
  trackServerErrors,
} from "./helpers/console-errors";

test("complete user journey from landing to logout", async ({
  page,
}) => {
  // This test covers the entire user flow and needs extra time.
  // Turbopack dev server compiles pages on-demand — each new page adds latency.
  test.setTimeout(300_000);

  const errors = trackConsoleErrors(page);
  const serverErrors = trackServerErrors(page);

  // Use unique email per run to avoid collisions
  const uniqueEmail = `journey-${Date.now()}@playwright.invalid`;
  const password = "JourneyTest@1234";

  // ── Step 1: Access landing page ──────────────────────────────────────────
  await page.goto("/en/");

  // Verify landing page loaded (header, hero visible)
  await expect(
    page.getByRole("heading", {
      name: /plan your|planeje sua|next adventure|aventura/i,
    }).first()
  ).toBeVisible();
  await expect(page.getByText(/Atlas/i).first()).toBeVisible();

  // ── Step 2: Click "Get Started" to go to register ────────────────────────
  await page
    .getByRole("link", { name: /get started|create account/i })
    .first()
    .click();

  await page.waitForURL(/\/auth\/register/, { timeout: 10_000 });

  // Verify register page loaded
  await expect(
    page.getByRole("heading", { name: /create account/i })
  ).toBeVisible();

  // ── Step 3: Fill registration form ───────────────────────────────────────
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);

  await page
    .getByRole("button", { name: /create account/i })
    .click();

  // After successful registration — staging may auto-login to /expeditions,
  // dev redirects to /auth/login?registered=true. Handle both flows.
  await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, {
    timeout: 60_000,
  });

  if (page.url().includes("/auth/login")) {
    // ── Step 4: Verify success banner and login page ─────────────────────
    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible();

    await expect(
      page.getByText(/account created|conta criada/i)
    ).toBeVisible({ timeout: 5_000 });

    // ── Step 5: Log in with the newly created credentials ────────────────
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill(password);

    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to trips/expeditions page
    await page.waitForURL(/\/trips|\/expeditions/, { timeout: 60_000 });
  }

  // At this point we are logged in and on the trips/expeditions page

  // ── Step 6: Verify trips/expeditions page loaded with user context ─────
  await expect(
    page.getByText(/expeditions|expedições|my trips|minhas viagens/i).first()
  ).toBeVisible();

  // ── Step 7: Switch language to PT ────────────────────────────────────────
  await page.getByRole("link", { name: "PT" }).first().click();

  await page.waitForURL(/\/trips|\/expeditions/, { timeout: 30_000 });

  // Text should now be in Portuguese
  await expect(
    page.getByText(/expedições|minhas viagens/i).first()
  ).toBeVisible({ timeout: 10_000 });

  // ── Step 8: Switch language back to EN ───────────────────────────────────
  await page.getByRole("link", { name: "EN" }).first().click();

  await page.waitForURL(/\/en\/.*(trips|expeditions)/, { timeout: 10_000 });

  await expect(
    page.getByText(/expeditions|my trips/i).first()
  ).toBeVisible();

  // ── Step 9: Logout ───────────────────────────────────────────────────────
  const avatarButton = page.locator(
    'button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])'
  );
  await avatarButton.click();

  await page
    .getByRole("menuitem", { name: /sign out|sair/i })
    .click();

  // Should redirect to landing page (URL may be / or /en or /en/)
  await page.waitForURL(/\/(en\/?)?$/, { timeout: 30_000 });

  await expect(
    page.getByRole("heading", {
      name: /plan your|planeje sua/i,
    }).first()
  ).toBeVisible();

  // ── Step 10: Verify session is gone — /expeditions redirects to login ──
  await page.goto("/en/expeditions");

  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });

  // ── Step 11: Log in again with the same credentials ────────────────────
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);

  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/trips|\/expeditions/, { timeout: 30_000 });

  await expect(
    page.getByText(/expeditions|expedições|my trips|minhas viagens/i).first()
  ).toBeVisible();

  // ── Final checks: no console errors, no 500s ────────────────────────────
  // Filter benign errors
  const realErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("__nextjs") &&
      !e.includes("hydration") &&
      !e.includes("Content Security Policy")
  );

  expect(
    realErrors,
    `Console errors during journey: ${realErrors.join(", ")}`
  ).toHaveLength(0);

  expect(
    serverErrors,
    `Server 500 errors during journey: ${JSON.stringify(serverErrors)}`
  ).toHaveLength(0);
});
