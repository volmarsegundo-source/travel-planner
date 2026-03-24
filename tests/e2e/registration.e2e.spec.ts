/**
 * E2E -- Registration flow (extended)
 *
 * Covers: successful registration, register-then-login, duplicate email,
 * weak password, and mismatched password scenarios.
 *
 * Uses the /en/ locale for deterministic label matching.
 */

import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./helpers/console-errors";

test.describe.configure({ timeout: 120_000 });

// ---------------------------------------------------------------------------
// Helper: generate a unique email to avoid collisions between test runs
// ---------------------------------------------------------------------------
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@playwright.invalid`;
}

// ---------------------------------------------------------------------------
// 1. Register with valid credentials -> redirected to login or auto-logged in
// ---------------------------------------------------------------------------

test.describe("Registration E2E -- valid credentials", () => {
  test("register with valid data redirects to login page or auto-logs in", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const email = uniqueEmail("reg-valid");

    await page.goto("/en/auth/register");

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill("StrongPass@1234");
    await page.getByLabel(/confirm password/i).fill("StrongPass@1234");

    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to login with ?registered=true OR auto-login to dashboard
    await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, { timeout: 60_000 });

    if (page.url().includes("/auth/login")) {
      // Success banner visible
      await expect(
        page.getByText(/account created|conta criada/i)
      ).toBeVisible({ timeout: 5_000 });
    } else {
      // Auto-logged in — main content should be visible
      await page.waitForLoadState("networkidle");
      const main = page.locator("main");
      await expect(main).not.toBeEmpty({ timeout: 10_000 });
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Register -> login -> dashboard shows correct greeting/name
// ---------------------------------------------------------------------------

test.describe("Registration E2E -- register then login", () => {
  test("newly registered user can log in and reach the dashboard", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const email = uniqueEmail("reg-login");
    const password = "StrongPass@1234";

    // Register
    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, { timeout: 60_000 });

    // If redirected to login, sign in manually
    if (page.url().includes("/auth/login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.locator('input[type="password"]').first().fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/trips|\/expeditions/, { timeout: 60_000 });
    }

    // Dashboard should render main content
    await page.waitForLoadState("networkidle");
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Register with duplicate email -> error message
// ---------------------------------------------------------------------------

test.describe("Registration E2E -- duplicate email", () => {
  test("registering with an already-used email shows error message", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const email = uniqueEmail("reg-dup");
    const password = "StrongPass@1234";

    // First registration
    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, { timeout: 60_000 });

    // Second registration with the same email
    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Error alert should appear
    const alert = page.locator("#register-server-error");
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(alert).toContainText(/email|e-mail|already|cadastrado/i);

    // Must stay on register page
    await expect(page).toHaveURL(/\/auth\/register/);

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Register with weak password -> validation error
// ---------------------------------------------------------------------------

test.describe("Registration E2E -- weak password", () => {
  test("submitting with a too-short password shows validation error", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill("weak-pwd@playwright.invalid");
    await page.getByLabel(/^password$/i).fill("short");
    await page.getByLabel(/confirm password/i).fill("short");

    await page.getByRole("button", { name: /create account/i }).click();

    // Validation error for password length
    await expect(
      page.getByText(/at least 8 characters|pelo menos 8 caracteres/i)
    ).toBeVisible({ timeout: 5_000 });

    // Must stay on register page
    await expect(page).toHaveURL(/\/auth\/register/);

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Register with mismatched passwords -> validation error
// ---------------------------------------------------------------------------

test.describe("Registration E2E -- mismatched passwords", () => {
  test("mismatched confirm password shows validation error", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill("mismatch@playwright.invalid");
    await page.getByLabel(/^password$/i).fill("StrongPass@1234");
    await page.getByLabel(/confirm password/i).fill("DifferentPass@5678");

    await page.getByRole("button", { name: /create account/i }).click();

    // Validation error for password mismatch
    await expect(
      page.getByText(/passwords do not match|senhas não coincidem/i)
    ).toBeVisible({ timeout: 5_000 });

    // Must stay on register page
    await expect(page).toHaveURL(/\/auth\/register/);

    expect(errors).toHaveLength(0);
  });
});
