import { Page } from "@playwright/test";

/**
 * Navigates to /auth/login and performs a credentials sign-in.
 * Waits until the URL changes to /trips after success.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/en/auth/login");

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Turbopack dev server may need extra time for on-demand compilation
  await page.waitForURL(/\/trips/, { timeout: 60_000 });
}

/**
 * Registers a new user and logs them in, returning the credentials.
 * This makes tests self-sufficient — no dependency on pre-seeded users.
 */
export async function registerAndLogin(
  page: Page,
  emailPrefix = "e2e"
): Promise<{ email: string; password: string }> {
  const email = `${emailPrefix}-${Date.now()}@playwright.invalid`;
  const password = "TestPassword@1234";

  // Register
  await page.goto("/en/auth/register");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  // Turbopack dev server may need extra time for on-demand compilation
  await page.waitForURL(/\/auth\/verify-email/, { timeout: 60_000 });

  // Login with the newly created account
  await page.goto("/en/auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/trips/, { timeout: 60_000 });

  return { email, password };
}

/**
 * Seeded test user credentials (created by `npm run dev:setup`).
 * Override via environment variables in CI.
 */
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? "testuser@travel.dev",
  password: process.env.TEST_USER_PASSWORD ?? "Test@1234",
  name: "Test User",
};

/**
 * Seeded secondary test user — used for BOLA / isolation tests.
 */
export const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL ?? "poweruser@travel.dev",
  password: process.env.TEST_USER_B_PASSWORD ?? "Test@1234",
  name: "Power User",
};
