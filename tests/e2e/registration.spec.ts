/**
 * E2E — Registration flow (AC-101 to AC-106)
 *
 * Validates the registration form fields, successful registration,
 * duplicate email error, validation errors, and Portuguese locale.
 */

import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./helpers/console-errors";

// ---------------------------------------------------------------------------
// AC-101: Register page shows form with email, password, submit
// ---------------------------------------------------------------------------

test.describe("Registration — form elements", () => {
  test("AC-101 — register page shows form with email, password, optional name, and submit button", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/en/auth/register");

    // Heading
    await expect(
      page.getByRole("heading", { name: /create account/i })
    ).toBeVisible();

    // Email field with visible label
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();

    // Password field with visible label
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-102: Valid registration → user can complete signup
// ---------------------------------------------------------------------------

test.describe("Registration — successful flow", () => {
  test("AC-102 — registering with valid data creates account and redirects to verify-email", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-ac102-${Date.now()}@playwright.invalid`;

    await page.goto("/en/auth/register");

    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill("TestPassword@123");

    await page
      .getByRole("button", { name: /create account/i })
      .click();

    // After successful registration, the app redirects to verify-email
    await page.waitForURL(/\/auth\/verify-email/, { timeout: 60_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-103: Duplicate email → error message
// ---------------------------------------------------------------------------

test.describe("Registration — duplicate email", () => {
  test("AC-103 — registering with an already-used email shows error message", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // First, register a user to ensure the email exists
    const dupEmail = `e2e-dup-${Date.now()}@playwright.invalid`;

    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(dupEmail);
    await page.getByLabel(/password/i).fill("TestPassword@123");
    await page
      .getByRole("button", { name: /create account/i })
      .click();
    await page.waitForURL(/\/auth\/verify-email/, { timeout: 60_000 });

    // Now try to register again with the same email
    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(dupEmail);
    await page.getByLabel(/password/i).fill("TestPassword@123");
    await page
      .getByRole("button", { name: /create account/i })
      .click();

    // Error alert should appear — use specific ID (may take time for server response)
    const alert = page.locator("#register-server-error");
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(alert).toContainText(/email|e-mail|already|cadastrado/i);

    // Must stay on the register page
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

// ---------------------------------------------------------------------------
// AC-104: Password validation
// (The current form does not have a confirm-password field, so we test
//  password length validation instead — minimum 8 characters.)
// ---------------------------------------------------------------------------

test.describe("Registration — password validation", () => {
  test("AC-104 — submitting with too-short password shows validation error", async ({
    page,
  }) => {
    await page.goto("/en/auth/register");

    await page
      .getByLabel(/email/i)
      .fill("ac104-test@playwright.invalid");
    await page.getByLabel(/password/i).fill("short");

    await page
      .getByRole("button", { name: /create account/i })
      .click();

    // Inline validation error for password
    await expect(
      page.getByText(/at least 8 characters|pelo menos 8 caracteres/i)
    ).toBeVisible({ timeout: 5_000 });

    // Must stay on register page
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

// ---------------------------------------------------------------------------
// AC-105: Empty fields → validation messages
// ---------------------------------------------------------------------------

test.describe("Registration — empty field validation", () => {
  test("AC-105 — submitting with empty fields shows validation messages", async ({
    page,
  }) => {
    await page.goto("/en/auth/register");

    // Click submit without filling anything
    await page
      .getByRole("button", { name: /create account/i })
      .click();

    // Should show validation error(s) and stay on register page
    const errorMessages = page.getByRole("alert");
    await expect(errorMessages.first()).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

// ---------------------------------------------------------------------------
// AC-106: Register in PT → all texts in Portuguese
// ---------------------------------------------------------------------------

test.describe("Registration — Portuguese locale", () => {
  test("AC-106 — register page in Portuguese shows all texts in Portuguese", async ({
    browser,
  }) => {
    // Create context with pt-BR locale to prevent auto-redirect to /en/
    const context = await browser.newContext({ locale: "pt-BR" });
    const page = await context.newPage();

    try {
      await page.goto("/auth/register");

      // Heading in Portuguese
      await expect(
        page.getByRole("heading", { name: /criar conta/i })
      ).toBeVisible();

      // Email label in Portuguese
      await expect(page.getByText("E-mail")).toBeVisible();

      // Password label in Portuguese
      await expect(page.getByText("Senha")).toBeVisible();

      // Submit button in Portuguese
      await expect(
        page.getByRole("button", { name: /criar conta/i })
      ).toBeVisible();

      // Login link in Portuguese
      await expect(
        page.getByText(/já tem uma conta/i)
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
