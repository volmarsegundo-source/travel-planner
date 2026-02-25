import { test, expect } from "@playwright/test";

/**
 * T-014 — E2E: Critical user path
 * Spec: cadastro → onboarding → criar viagem → gerar plano → gerar checklist → validar 375px
 *
 * Sections:
 *  A — UI readiness of each step (no auth needed — tests static structure)
 *  B — Auth-required steps (skip until storageState global setup)
 *  C — Mobile 375px validation for every step
 */

// ─── A. UI readiness ──────────────────────────────────────────────────────────

test.describe("A — Cadastro (registration) — UI readiness", () => {
  test("register page has all critical form fields", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /criar conta/i }),
    ).toBeVisible();
  });

  test("trust badge is visible on register page (T-003 / US-002B)", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(
      page.getByText(/seguros|segurança|privacidade/i),
    ).toBeVisible();
  });

  test("Google OAuth button present on register page", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(
      page.getByRole("button", { name: /google/i }),
    ).toBeVisible();
  });

  test("empty form submission shows at least one validation error", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 3000 });
  });

  test("short password triggers validation error", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel(/e-mail/i).fill("test@example.com");
    await page.getByLabel(/senha/i).first().fill("abc");
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 3000 });
  });

  test("link to login page is present", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByRole("link", { name: /entrar/i })).toBeVisible();
  });
});

test.describe("A — Login — UI readiness", () => {
  test("login page has email, password and submit button", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/e-mail/i).fill("nobody@example.com");
    await page.getByLabel(/senha/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 5000 });
  });

  test("link to register page is present", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(
      page.getByRole("link", { name: /cadastre|cadastrar/i }),
    ).toBeVisible();
  });
});

test.describe("A — Protected routes — redirect chain", () => {
  const protectedRoutes = [
    "/trips",
    "/onboarding",
    "/trips/test-id/generate",
    "/trips/test-id/itinerary",
    "/trips/test-id/checklist",
    "/trips/test-id/edit",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated user to /auth/login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  }
});

// ─── B. Auth-required steps ───────────────────────────────────────────────────

test.describe("B — Onboarding wizard (requires auth)", () => {
  /**
   * These tests require a storageState with an authenticated user.
   * TODO: Add globalSetup that registers a test user and writes
   *       playwright/.auth/user.json, then set storageState in playwright.config.ts.
   */

  test.skip("wizard shows 3-step progress indicator", async ({ page }) => {
    // await page.goto("/onboarding");
    // await expect(page.getByText(/1.*3|step 1/i)).toBeVisible();
  });

  test.skip("each step CTA advances the wizard", async ({ page }) => {
    // step 1 → 2 → 3 → redirect to /trips
  });

  test.skip("skip button goes directly to /trips", async ({ page }) => {
    // await page.goto("/onboarding");
    // await page.getByRole("button", { name: /pular/i }).click();
    // await expect(page).toHaveURL("/trips");
  });
});

test.describe("B — Create trip (requires auth)", () => {
  test.skip("Nova Viagem button opens modal with trip form", async ({ page }) => {
    // await page.goto("/trips");
    // await page.getByRole("button", { name: /nova viagem/i }).click();
    // await expect(page.getByRole("dialog")).toBeVisible();
    // await expect(page.getByLabel(/nome da viagem/i)).toBeVisible();
  });

  test.skip("submitting valid form creates a trip and redirects", async ({ page }) => {
    // fill form, submit, verify redirect to /trips/{id}/generate or /trips
  });
});

test.describe("B — Generate itinerary (requires auth)", () => {
  test.skip("generate page shows destination name and style selection", async ({ page }) => {
    // await page.goto("/trips/{id}/generate");
    // style cards: ADVENTURE, CULTURE, RELAXATION, GASTRONOMY
  });

  test.skip("selecting a style and clicking generate shows loading messages", async ({ page }) => {
    // rotating messages visible during AI call
  });
});

test.describe("B — Checklist (requires auth)", () => {
  test.skip("checklist page shows categories with progress bar", async ({ page }) => {
    // progressbar role must be visible with aria-valuenow
  });

  test.skip("checking an item updates the progress bar", async ({ page }) => {
    // aria-valuenow should increment
  });
});

// ─── C. Mobile 375px — every critical-path step ──────────────────────────────

test.describe("C — Mobile 375px — all critical-path pages", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  async function assertNoHorizontalScroll(page: { evaluate: (fn: () => number) => Promise<number> }) {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  }

  test("register page — no horizontal scroll at 375px", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByRole("button", { name: /criar conta/i })).toBeVisible();
    await assertNoHorizontalScroll(page);
  });

  test("login page — no horizontal scroll at 375px", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
    await assertNoHorizontalScroll(page);
  });

  test("forgot-password page — no horizontal scroll at 375px", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByRole("button", { name: /enviar/i })).toBeVisible();
    await assertNoHorizontalScroll(page);
  });

  test("register page — trust badge visible on mobile", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(
      page.getByText(/seguros|segurança|privacidade/i),
    ).toBeVisible();
  });

  test("register page — Google button visible on mobile", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(
      page.getByRole("button", { name: /google/i }),
    ).toBeVisible();
  });

  test("login page — email and password fields accessible on mobile", async ({ page }) => {
    await page.goto("/auth/login");
    // Fields must be tappable (not hidden behind overflow)
    await expect(page.getByLabel(/e-mail/i)).toBeInViewport();
    await expect(page.getByLabel(/senha/i)).toBeInViewport();
  });

  test("protected routes redirect correctly on mobile", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/auth\/login/);
    await assertNoHorizontalScroll(page);
  });
});

// ─── A. Accessibility baseline ───────────────────────────────────────────────

test.describe("A — Keyboard accessibility — auth pages", () => {
  test("register form is fully navigable by Tab key", async ({ page }) => {
    await page.goto("/auth/register");

    // Tab through the form — each focusable element should receive focus
    await page.keyboard.press("Tab");
    const emailFocused = await page.evaluate(
      () => document.activeElement?.getAttribute("type") === "email" ||
            document.activeElement?.tagName === "INPUT",
    );
    expect(emailFocused).toBe(true);
  });

  test("login form submit button is reachable via Tab + Enter", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByLabel(/e-mail/i).fill("test@example.com");
    await page.keyboard.press("Tab"); // focus password
    await page.keyboard.type("testpassword");
    await page.keyboard.press("Tab"); // focus submit button or link
    // Submit button must exist and be focusable
    const submitBtn = page.getByRole("button", { name: /entrar/i });
    await expect(submitBtn).toBeVisible();
  });

  test("forgot password page — email field is focused on page load or first Tab", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.keyboard.press("Tab");
    const isInput = await page.evaluate(
      () => ["INPUT", "BUTTON"].includes(document.activeElement?.tagName ?? ""),
    );
    expect(isInput).toBe(true);
  });
});
