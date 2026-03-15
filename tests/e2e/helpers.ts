import { Page } from "@playwright/test";

/**
 * Set of emails that have already been registered during this test run.
 * Prevents duplicate registration attempts within the same worker.
 */
const registeredEmails = new Set<string>();

/**
 * Navigates to /auth/login and performs a credentials sign-in.
 * If login fails (user doesn't exist on staging), auto-registers the user first.
 * Waits until the URL changes to /trips or /expeditions after success.
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

  // Wait for redirect to dashboard — generous timeout for staging cold starts
  try {
    await page.waitForURL(/\/trips|\/expeditions/, { timeout: 30_000 });
    return;
  } catch {
    // Login failed — check if we're still on login page with an error
  }

  // Check if login page shows a specific error (not just any [role=alert])
  const loginError = page.locator("#login-server-error");
  const hasLoginError = await loginError.isVisible({ timeout: 2_000 }).catch(() => false);

  if (!hasLoginError) {
    // Might just be slow — try waiting longer
    try {
      await page.waitForURL(/\/trips|\/expeditions/, { timeout: 30_000 });
      return;
    } catch {
      // Still not redirected — try registering
    }
  }

  // Login failed — user probably doesn't exist on staging. Register first.
  if (!registeredEmails.has(email)) {
    await page.goto("/en/auth/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Registration may auto-login or redirect to login
    // Also handle case where email is already registered (stays on register)
    try {
      await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, { timeout: 30_000 });
    } catch {
      // May have stayed on register page — check for "already registered" error
      // In that case the user exists but login failed for another reason
    }
    registeredEmails.add(email);

    // If auto-logged in (redirected to dashboard), we're done
    if (page.url().includes("/expeditions") || page.url().includes("/trips")) {
      return;
    }
  }

  // Now login
  await page.goto("/en/auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/trips|\/expeditions/, { timeout: 60_000 });
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
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  // Registration may redirect to /auth/login?registered=true OR auto-login to /expeditions
  await page.waitForURL(/\/auth\/login|\/expeditions|\/trips/, { timeout: 60_000 });

  // If redirected to login page, sign in manually
  if (page.url().includes("/auth/login")) {
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/trips|\/expeditions/, { timeout: 60_000 });
  }

  return { email, password };
}

/**
 * Seeded test user credentials (created by `npm run dev:setup`).
 * On staging, loginAs will auto-register these if needed.
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
