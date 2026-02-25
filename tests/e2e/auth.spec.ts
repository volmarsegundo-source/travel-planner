import { test, expect } from "@playwright/test";

/**
 * T-014 — E2E: Authentication flows
 * Tests: register, login, password recovery, trust signals
 */

test.describe("Registration flow", () => {
  test("renders register page with all required fields", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /criar conta/i })).toBeVisible();
  });

  test("shows validation error when fields are empty", async ({ page }) => {
    await page.goto("/auth/register");

    await page.getByRole("button", { name: /criar conta/i }).click();

    // At least one error message should appear
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 3000 });
  });

  test("shows password strength error when password is too short", async ({ page }) => {
    await page.goto("/auth/register");

    await page.getByLabel(/e-mail/i).fill("test@example.com");
    await page.getByLabel(/senha/i).first().fill("short");
    await page.getByRole("button", { name: /criar conta/i }).click();

    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 3000 });
  });

  test("has Google OAuth button", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(
      page.getByRole("button", { name: /google/i }),
    ).toBeVisible();
  });

  test("trust signals (T-003): displays trust badge on register page", async ({ page }) => {
    await page.goto("/auth/register");

    // Trust badge should mention data security (US-002B)
    await expect(
      page.getByText(/seguros|segurança|privacidade/i),
    ).toBeVisible();
  });

  test("has link to login page", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByRole("link", { name: /entrar/i })).toBeVisible();
  });
});

test.describe("Login flow", () => {
  test("renders login page with email and password fields", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("has forgot password link", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(
      page.getByRole("link", { name: /esqueci/i }),
    ).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByLabel(/e-mail/i).fill("nobody@example.com");
    await page.getByLabel(/senha/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar/i }).click();

    // Either a validation error or auth error should be visible
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 5000 });
  });

  test("has link to register page", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("link", { name: /cadastre|cadastrar/i })).toBeVisible();
  });
});

test.describe("Forgot password flow", () => {
  test("renders forgot password page", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /enviar/i }),
    ).toBeVisible();
  });

  test("shows success state after submitting email", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    await page.getByLabel(/e-mail/i).fill("user@example.com");
    await page.getByRole("button", { name: /enviar/i }).click();

    // Should show success message or loading state
    await expect(
      page.getByText(/link enviado|e-mail/i),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Auth pages — mobile 375px", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("login page renders correctly on mobile", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("register page renders correctly on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(page.getByRole("button", { name: /criar conta/i })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
