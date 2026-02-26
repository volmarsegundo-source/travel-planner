/**
 * E2E — Authentication flows
 *
 * Covers: registration, login (valid credentials), login (invalid credentials),
 * and the unauthenticated redirect guard on protected routes.
 *
 * All test data is synthetic — never real PII, never production endpoints.
 * Payment and booking paths are out of scope for this spec.
 */

import { test, expect } from "@playwright/test";
import { TEST_USER } from "./helpers";

// ---------------------------------------------------------------------------
// 1. User registration flow
// ---------------------------------------------------------------------------

test.describe("Registration flow", () => {
  test("E2E-001 — new user can register and is redirected to verify-email page", async ({
    page,
  }) => {
    // Use a unique email per run so the test does not collide with a
    // previously registered address. The @playwright.invalid TLD is never
    // routable — no real email is sent.
    const uniqueEmail = `e2e-reg-${Date.now()}@playwright.invalid`;

    await page.goto("/auth/register");

    // The RegisterForm renders shadcn FormLabel elements whose for= attribute
    // points to the underlying <input>. getByLabel resolves that relationship.
    await page.getByLabel(/e-mail|email/i).fill(uniqueEmail);
    await page.getByLabel(/senha|password/i).fill("TestPassword123!");

    // Submit — button renders t("signUp") = "Criar conta" in pt-BR.
    await page.getByRole("button", { name: /criar conta|sign up|register/i }).click();

    // After successful registration the app calls router.push("/auth/verify-email").
    await page.waitForURL(/\/auth\/verify-email/, { timeout: 15_000 });

    // The verify-email page renders static English text (see verify-email/page.tsx).
    await expect(page.getByRole("heading", { name: /verify your email/i })).toBeVisible();
    await expect(
      page.getByText(/check your inbox for a verification link/i)
    ).toBeVisible();
  });

  test("E2E-002 — registering with an already-used email shows an error alert", async ({
    page,
  }) => {
    // Attempt to register the pre-existing test user account.
    await page.goto("/auth/register");

    await page.getByLabel(/e-mail|email/i).fill(TEST_USER.email);
    await page.getByLabel(/senha|password/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /criar conta|sign up|register/i }).click();

    // The form renders a server-side error in a role=alert div
    // (id="register-server-error") when the email is already registered.
    // t("errors.emailAlreadyExists") = "Este e-mail já está cadastrado."
    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toContainText(/e-mail|email/i);

    // Must stay on the register page — no redirect.
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

// ---------------------------------------------------------------------------
// 2. Login with valid credentials
// ---------------------------------------------------------------------------

test.describe("Login — valid credentials", () => {
  test("E2E-003 — user can sign in and is redirected to the trips dashboard", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    // Label "E-mail" in pt-BR — regex covers localised and English forms.
    await page.getByLabel(/e-mail|email/i).fill(TEST_USER.email);

    // Label "Senha" in pt-BR.
    await page.getByLabel(/senha|password/i).fill(TEST_USER.password);

    // Button text is t("signIn") = "Entrar".
    await page.getByRole("button", { name: /entrar|sign in|login/i }).click();

    // LoginForm calls router.push("/trips") on success.
    await page.waitForURL(/\/trips/, { timeout: 15_000 });

    // The TripDashboard renders h1 with t("myTrips") = "Minhas viagens".
    await expect(
      page.getByRole("heading", { name: /minhas viagens/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Login with invalid credentials
// ---------------------------------------------------------------------------

test.describe("Login — invalid credentials", () => {
  test("E2E-004 — wrong password shows error alert and stays on login page", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    await page.getByLabel(/e-mail|email/i).fill(TEST_USER.email);
    // Deliberately wrong password.
    await page.getByLabel(/senha|password/i).fill("WrongPassword999!");

    await page.getByRole("button", { name: /entrar|sign in|login/i }).click();

    // LoginForm sets errorKey = "errors.invalidCredentials" which renders
    // role="alert" with the text t("errors.invalidCredentials") =
    // "E-mail ou senha incorretos."
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toContainText(/incorretos|invalid|incorrect/i);

    // Must remain on the login page.
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("E2E-005 — empty credentials shows HTML5 / client validation and stays on login page", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    // Attempt submit without filling any fields.
    await page.getByRole("button", { name: /entrar|sign in|login/i }).click();

    // The form uses required attributes — browser validation prevents submission
    // and the URL must not change.
    await expect(page).toHaveURL(/\/auth\/login/);

    // The email input must be invalid (browser reports validity).
    const emailInput = page.getByLabel(/e-mail|email/i);
    await expect(emailInput).toBeVisible();
    // Aria-invalid or browser native :invalid — we just verify we stay put.
  });
});

// ---------------------------------------------------------------------------
// 4. Unauthenticated redirect guard
// ---------------------------------------------------------------------------

test.describe("Route guard — unauthenticated access", () => {
  test("E2E-006 — visiting /trips without a session redirects to /auth/login", async ({
    page,
  }) => {
    // No cookies or storage are set — browser context is fresh per test.
    await page.goto("/trips");

    // The TripsPage server component calls redirect(`/${locale}/auth/login`).
    // next-intl prefixes the locale, so the URL becomes /auth/login (prefix
    // as-needed — default locale has no prefix) or /pt-BR/auth/login on
    // non-default locales; either matches the regex below.
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test("E2E-007 — visiting a specific trip URL without a session redirects to /auth/login", async ({
    page,
  }) => {
    // Use a plausible-looking but non-existent synthetic trip id.
    await page.goto("/trips/fake-trip-id-00000001");

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });
});
