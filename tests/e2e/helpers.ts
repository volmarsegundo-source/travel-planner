import { Page } from "@playwright/test";

/**
 * Navigates to /auth/login and performs a credentials sign-in.
 * Waits until the URL changes to /trips or the root path after success.
 *
 * @param page     - Playwright Page object
 * @param email    - Test user e-mail (use TEST_USER.email by default)
 * @param password - Test user password (use TEST_USER.password by default)
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/auth/login");

  // The label text is "E-mail" in pt-BR; regex covers both forms.
  await page.getByLabel(/e-mail|email/i).fill(email);

  // Password label is "Senha" in pt-BR; the regex also matches "password"
  // to stay resilient if the locale is changed in future.
  await page.getByLabel(/senha|password/i).fill(password);

  // The sign-in button renders t("signIn") = "Entrar" in pt-BR.
  await page.getByRole("button", { name: /entrar|sign in|login/i }).click();

  // Wait until navigation lands on /trips or the root — whichever the app
  // redirects to after successful authentication.
  await page.waitForURL(/\/(trips|$)/, { timeout: 15_000 });
}

/**
 * Synthetic test user credentials.
 * Override via environment variables in CI so the same account can be
 * pre-created in the database via a setup script without touching production data.
 *
 * EMAIL FORMAT: uses @playwright.invalid domain — never routable on the internet,
 * never real PII.
 */
export const TEST_USER = {
  email:
    process.env.TEST_USER_EMAIL ?? "e2e-test@playwright.invalid",
  password: process.env.TEST_USER_PASSWORD ?? "TestPassword123!",
  name: "E2E Test User",
};

/**
 * Synthetic secondary test user — used for BOLA / isolation tests
 * to verify that User B cannot access User A's resources.
 */
export const TEST_USER_B = {
  email:
    process.env.TEST_USER_B_EMAIL ?? "e2e-test-b@playwright.invalid",
  password: process.env.TEST_USER_B_PASSWORD ?? "TestPassword456!",
  name: "E2E Test User B",
};
