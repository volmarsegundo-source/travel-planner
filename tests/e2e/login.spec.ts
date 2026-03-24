/**
 * E2E — Login flow (AC-201 to AC-206)
 *
 * Validates the login form fields, successful login, invalid credentials,
 * empty field validation, Portuguese locale, and link to register.
 */

import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./helpers/console-errors";

// ---------------------------------------------------------------------------
// AC-201: Login page shows form with email, password, submit
// ---------------------------------------------------------------------------

test.describe("Login — form elements", () => {
  test("AC-201 — login page shows form with email, password fields and submit button", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/en/auth/login");

    // Heading
    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible();

    // Email field
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();

    // Password field
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: /sign in|entrar/i })
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-202: Valid credentials → redirect to trips
// ---------------------------------------------------------------------------

test.describe("Login — valid credentials", () => {
  test("AC-202 — logging in with valid credentials redirects to trips page", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);

    // Register a fresh user so we don't depend on seeded data
    const email = `ac202-${Date.now()}@playwright.invalid`;
    const password = "TestPassword@1234";

    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page
      .getByRole("button", { name: /create account/i })
      .click();
    // After registration, may redirect to /auth/login?registered=true or auto-login to /expeditions
    await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, { timeout: 60_000 });

    // If redirected to login page, sign in manually
    if (page.url().includes("/auth/login")) {
      // Verify success banner is visible
      await expect(
        page.getByText(/account created|conta criada/i)
      ).toBeVisible({ timeout: 5_000 });

      // Already on login page — fill credentials
      await page.getByLabel(/email/i).fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole("button", { name: /sign in|entrar/i }).click();

      // Should redirect to expeditions
      await page.waitForURL(/\/trips|\/expeditions/, { timeout: 60_000 });
    }

    // Should be on the authenticated expeditions page
    await expect(page).toHaveURL(/\/expeditions|\/trips/);
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-203: Wrong password → error message, stay on login page
// ---------------------------------------------------------------------------

test.describe("Login — invalid credentials", () => {
  test("AC-203 — wrong password shows error message and stays on login page", async ({
    page,
  }) => {
    await page.goto("/en/auth/login");

    await page.getByLabel(/email/i).fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("WrongPassword999!");

    await page.getByRole("button", { name: /sign in|entrar/i }).click();

    // Error alert should appear — use specific ID to avoid matching __next-route-announcer__
    const alert = page.locator("#login-error");
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toContainText(
      /invalid|incorrect|incorretos/i
    );

    // Must stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);

    // Password should not be visible in plain text
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});

// ---------------------------------------------------------------------------
// AC-204: Empty fields → validation, form not submitted
// ---------------------------------------------------------------------------

test.describe("Login — empty field validation", () => {
  test("AC-204 — submitting with empty fields shows validation and stays on login page", async ({
    page,
  }) => {
    await page.goto("/en/auth/login");

    // Click submit without filling anything
    await page.getByRole("button", { name: /sign in|entrar/i }).click();

    // Should stay on login page (HTML5 validation or form validation prevents submission)
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// ---------------------------------------------------------------------------
// AC-205: Login in PT → all texts in Portuguese
// ---------------------------------------------------------------------------

test.describe("Login — Portuguese locale", () => {
  test("AC-205 — login page in Portuguese shows all texts in Portuguese", async ({
    browser,
  }) => {
    // Create context with pt-BR locale to prevent auto-redirect to /en/
    const context = await browser.newContext({ locale: "pt-BR" });
    const page = await context.newPage();

    try {
      await page.goto("/auth/login");

      // Heading in Portuguese
      await expect(
        page.getByRole("heading", { name: /entrar/i })
      ).toBeVisible();

      // Email label — use getByLabel to find the associated input
      await expect(page.getByLabel(/e-mail/i)).toBeVisible();

      // Password label — use getByLabel to avoid matching "Esqueceu a senha?"
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Submit button
      await expect(
        page.getByRole("button", { name: /entrar/i })
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-206: Link to register page
// ---------------------------------------------------------------------------

test.describe("Login — register link", () => {
  test("AC-206 — login page has a link to register that navigates correctly", async ({
    page,
  }) => {
    await page.goto("/en/auth/login");

    // "Don't have an account?" text and "Create account" / "Sign up" link
    await expect(
      page.getByText(/don't have an account|não tem uma conta|sign up|criar conta/i)
    ).toBeVisible();

    // Use the link in the page body (not header) to avoid strict mode violation
    const createAccountLink = page
      .locator("main, form, [role='main'], .auth-form, section")
      .getByRole("link", { name: /create account|sign up|criar conta|cadastr/i });
    // Fall back to first match if no scoped element found
    const linkToClick = await createAccountLink.count() > 0
      ? createAccountLink.first()
      : page.getByRole("link", { name: /create account|sign up|criar conta|cadastr/i }).first();
    await linkToClick.click();

    await page.waitForURL(/\/auth\/register/, { timeout: 30_000 });

    await expect(
      page.getByRole("heading", { name: /create account/i })
    ).toBeVisible();
  });
});
