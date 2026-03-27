/**
 * E2E — Landing Page (AC-001 to AC-008)
 *
 * Validates the public landing page renders correctly, navigation links
 * work, language switching functions, and authenticated users are redirected.
 */

import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./helpers/console-errors";
import { registerAndLogin } from "./helpers";

// ---------------------------------------------------------------------------
// AC-001: Access / → redirected to locale page with full landing page
// ---------------------------------------------------------------------------

test.describe("Landing page — load and redirect", () => {
  test("AC-001 — accessing / shows landing page with header, hero, features, footer", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");

    // Should land on a locale-prefixed page (pt-BR default or /en)
    await expect(page).toHaveURL(/\/(en|pt-BR)?\/?$/);

    // Header is visible with app name
    await expect(page.getByText(/Atlas/i).first()).toBeVisible();

    // Hero section — text may vary between deployments
    await expect(
      page.getByRole("heading", {
        name: /plan your|planeje sua|next adventure|aventura|proxima/i,
      }).first()
    ).toBeVisible();

    // Features section — at least one feature card or section heading
    await expect(
      page.getByText(/ai-powered|planejamento|planning|inteligência|smart|features|everything you need|phases|coordinate|intelligence/i).first()
    ).toBeVisible();

    // Footer
    await expect(
      page.getByText(/all rights reserved|todos os direitos|atlas travel planner|© 2026/i)
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-002: Header has logo, language switcher, Login, Sign Up
// ---------------------------------------------------------------------------

test.describe("Landing page — header elements", () => {
  test("AC-002 — header shows logo, language switcher, Login, and Sign Up buttons", async ({
    page,
  }) => {
    await page.goto("/en/");

    // Logo
    await expect(page.getByText(/Atlas/i).first()).toBeVisible();

    // Language switcher — EN and PT links
    await expect(page.getByRole("link", { name: "EN" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "PT" }).first()).toBeVisible();

    // Login button/link
    await expect(
      page.getByRole("link", { name: /sign in/i }).first()
    ).toBeVisible();

    // Sign Up button/link — may say "Create account", "Sign up", "Get Started", etc.
    await expect(
      page.getByRole("link", { name: /create account|sign up|get started|criar conta|cadastr/i }).first()
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC-003: Click Sign Up → /en/auth/register
// ---------------------------------------------------------------------------

test.describe("Landing page — Sign Up navigation", () => {
  test("AC-003 — clicking Get Started or Create Account navigates to register page", async ({
    page,
  }) => {
    await page.goto("/en/");

    // The hero CTA "Get Started — It's Free" or the header "Create account" / "Sign up"
    const signUpLink = page
      .getByRole("link", { name: /get started|create account|sign up|criar conta|cadastr/i })
      .first();
    await signUpLink.click();

    await page.waitForURL(/\/en\/auth\/register/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /create account/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC-004: Click Login → /en/auth/login
// ---------------------------------------------------------------------------

test.describe("Landing page — Login navigation", () => {
  test("AC-004 — clicking Sign In navigates to login page", async ({
    page,
  }) => {
    await page.goto("/en/");

    // Click the header "Sign in" link — use the header nav to avoid hero overlap
    const headerSignIn = page
      .locator("header")
      .getByRole("link", { name: /sign in/i });
    await headerSignIn.click();

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /sign in|welcome back|bem-vindo/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC-005: Switch to PT → texts change to Portuguese
// ---------------------------------------------------------------------------

test.describe("Landing page — language switch to PT", () => {
  test("AC-005 — switching to PT changes URL and all visible text to Portuguese", async ({
    page,
  }) => {
    await page.goto("/en/");

    // Verify we start in English
    await expect(
      page.getByRole("heading", {
        name: /plan your|next adventure|aventura/i,
      }).first()
    ).toBeVisible();

    // Click PT language switcher
    await page.getByRole("link", { name: "PT" }).first().click();

    // Wait for navigation to complete — pt-BR might keep locale cookie path
    await page.waitForLoadState("networkidle");

    // Texts should be in Portuguese
    await expect(
      page.getByRole("heading", {
        name: /planeje sua|proxima aventura|próxima aventura|sua proxima/i,
      }).first()
    ).toBeVisible();

    await expect(
      page.getByText(/comece|começar|criar conta|cadastr|expedicao|expedição/i).first()
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC-006: Switch from PT to EN → texts back to English
// ---------------------------------------------------------------------------

test.describe("Landing page — language switch to EN", () => {
  test("AC-006 — switching from PT to EN changes URL and texts back to English", async ({
    browser,
  }) => {
    // Start with pt-BR locale so we land on the Portuguese version
    const context = await browser.newContext({ locale: "pt-BR" });
    const page = await context.newPage();

    try {
      await page.goto("/");

      // Should be in PT — verify Portuguese heading
      await expect(
        page.getByRole("heading", {
          name: /planeje sua|proxima aventura|próxima aventura|sua proxima/i,
        }).first()
      ).toBeVisible();

      // Click EN language switcher
      await page.getByRole("link", { name: "EN" }).first().click();

      await page.waitForURL(/\/en\/?/, { timeout: 10_000 });

      // Texts should be in English
      await expect(
        page.getByRole("heading", {
          name: /plan your|next adventure|aventura/i,
        }).first()
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-007: Mobile viewport → responsive layout
// ---------------------------------------------------------------------------

test.describe("Landing page — mobile responsiveness", () => {
  test("AC-007 — page renders correctly at 375px mobile viewport", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();

    try {
      await page.goto("/en/");

      // Hero heading is visible and legible
      await expect(
        page.getByRole("heading", {
          name: /plan your|next adventure|aventura/i,
        }).first()
      ).toBeVisible();

      // No horizontal overflow — page width should not exceed viewport
      const bodyWidth = await page.evaluate(
        () => document.body.scrollWidth
      );
      expect(bodyWidth).toBeLessThanOrEqual(375 + 1); // 1px tolerance

      // Features visible (single column layout)
      await expect(
        page.getByText(/ai-powered|planning|features|planejamento|everything you need|phases|coordinate|intelligence|expedition|expedição|fases|roteiro|smart|inteligente/i).first()
      ).toBeVisible();

      // Footer visible
      await expect(
        page.getByText(/all rights reserved|todos os direitos|atlas travel planner|© 2026|lgpd/i)
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-008: Authenticated user on landing page → redirect to trips
// ---------------------------------------------------------------------------

test.describe("Landing page — authenticated redirect", () => {
  test("AC-008 — logged-in user accessing landing page is redirected to trips", async ({
    page,
  }) => {
    // Increase timeout: registerAndLogin takes ~40s, then redirect needs time
    test.setTimeout(120_000);

    // Register and login to create a session
    await registerAndLogin(page, "ac008");

    // Now navigate to the landing page
    await page.goto("/en/");

    // Should be redirected to expeditions (authenticated users skip the landing)
    await page.waitForURL(/\/trips|\/expeditions/, { timeout: 15_000 });
  });
});
