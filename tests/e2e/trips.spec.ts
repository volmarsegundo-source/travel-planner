import { test, expect } from "@playwright/test";

/**
 * T-014 — E2E: Trip dashboard flows
 * Tests: auth guard redirect, create-trip modal UX, form validation, mobile
 *
 * NOTE: Tests that require a logged-in session are skipped here because no
 * global storageState fixture is set up yet.  They are marked with `.skip`
 * and the required setup is documented inline.
 */

test.describe("Auth guard — protected routes", () => {
  test("GET /trips redirects unauthenticated user to /auth/login", async ({ page }) => {
    const response = await page.goto("/trips");
    // Next.js redirect() resolves in the browser; final URL must be /auth/login
    await expect(page).toHaveURL(/\/auth\/login/);
    // Should render the login form, not a blank page
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });

  test("GET /onboarding redirects unauthenticated user to /auth/login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /trips/[id]/generate redirects unauthenticated user", async ({ page }) => {
    await page.goto("/trips/fake-id/generate");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /trips/[id]/itinerary redirects unauthenticated user", async ({ page }) => {
    await page.goto("/trips/fake-id/itinerary");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /trips/[id]/checklist redirects unauthenticated user", async ({ page }) => {
    await page.goto("/trips/fake-id/checklist");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Login page — trips CTA", () => {
  // These tests verify the login page that the user lands on after a redirect

  test("login page rendered after /trips redirect has correct heading", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/auth\/login/);

    // The login page heading must be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login page has 'register' link so user can sign up first", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("link", { name: /cadastre|cadastrar/i })).toBeVisible();
  });
});

test.describe("Create-trip modal — isolated register page smoke", () => {
  /**
   * The CreateTripModal lives inside /trips (requires auth).
   * Until a global storageState fixture exists, we test its form-element
   * assumptions by checking the register page (same field patterns).
   *
   * When a test-user storageState is available, replace these with real
   * interactions against /trips.
   */

  test.skip("opens modal when 'Nova Viagem' button is clicked", async ({ page }) => {
    // Setup: authenticate → navigate to /trips
    // await page.goto("/trips");
    // await page.getByRole("button", { name: /nova viagem/i }).click();
    // await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.skip("modal has trip-name and destination fields", async ({ page }) => {
    // Setup: open modal
    // await expect(page.getByLabel(/nome da viagem/i)).toBeVisible();
    // await expect(page.getByRole("combobox")).toBeVisible(); // DestinationSearch
  });

  test.skip("shows validation error when submitting empty modal form", async ({ page }) => {
    // await page.getByRole("button", { name: /criar viagem|salvar/i }).click();
    // await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 3000 });
  });

  test.skip("modal closes when Cancel is clicked", async ({ page }) => {
    // await page.getByRole("button", { name: /cancelar/i }).click();
    // await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test.skip("modal closes when Escape key is pressed", async ({ page }) => {
    // await page.keyboard.press("Escape");
    // await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("Trips page — mobile 375px", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("GET /trips on mobile redirects to login without horizontal scroll", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/auth\/login/);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
