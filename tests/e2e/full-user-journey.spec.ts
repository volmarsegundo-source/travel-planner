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
      name: /plan your perfect trip/i,
    })
  ).toBeVisible();
  await expect(page.getByText("Travel Planner").first()).toBeVisible();

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
  await page.getByLabel(/password/i).fill(password);

  await page
    .getByRole("button", { name: /create account/i })
    .click();

  // After successful registration → verify-email page
  await page.waitForURL(/\/auth\/verify-email/, { timeout: 30_000 });

  // ── Step 4: Navigate to login (since email is auto-verified) ─────────────
  await page.goto("/en/auth/login");

  await expect(
    page.getByRole("heading", { name: /sign in/i })
  ).toBeVisible();

  // ── Step 5: Log in with the newly created credentials ────────────────────
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);

  await page.getByRole("button", { name: /sign in/i }).click();

  // Should redirect to trips page
  await page.waitForURL(/\/trips/, { timeout: 30_000 });

  // ── Step 6: Verify trips page loaded with user context ───────────────────
  await expect(
    page.getByRole("heading", { name: /my trips|minhas viagens/i })
  ).toBeVisible();

  // ── Step 7: Switch language to PT ────────────────────────────────────────
  await page.getByRole("link", { name: "PT" }).first().click();

  await page.waitForURL(/\/trips/, { timeout: 10_000 });

  // Heading should now be in Portuguese
  await expect(
    page.getByRole("heading", { name: /minhas viagens/i })
  ).toBeVisible();

  // ── Step 8: Switch language back to EN ───────────────────────────────────
  await page.getByRole("link", { name: "EN" }).first().click();

  await page.waitForURL(/\/en\/.*trips/, { timeout: 10_000 });

  await expect(
    page.getByRole("heading", { name: /my trips/i })
  ).toBeVisible();

  // ── Step 9: Logout ───────────────────────────────────────────────────────
  const avatarButton = page.locator(
    'button[aria-haspopup="menu"]'
  );
  await avatarButton.click();

  await page
    .getByRole("menuitem", { name: /sign out|sair/i })
    .click();

  // Should redirect to landing page
  await page.waitForURL(/\/(en\/)?$/, { timeout: 30_000 });

  await expect(
    page.getByRole("heading", {
      name: /plan your perfect trip|planeje sua viagem perfeita/i,
    })
  ).toBeVisible();

  // ── Step 10: Verify session is gone — /trips redirects to login ──────────
  await page.goto("/en/trips");

  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });

  // ── Step 11: Log in again with the same credentials ──────────────────────
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);

  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/trips/, { timeout: 30_000 });

  await expect(
    page.getByRole("heading", { name: /my trips|minhas viagens/i })
  ).toBeVisible();

  // ── Final checks: no console errors, no 500s ────────────────────────────
  // Filter benign errors
  const realErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("__nextjs") &&
      !e.includes("hydration")
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
