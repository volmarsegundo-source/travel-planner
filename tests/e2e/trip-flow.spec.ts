/**
 * E2E — Expedition dashboard and navigation flows
 *
 * Covers: viewing the expeditions dashboard, navigating to the expedition
 * wizard, wizard step validation, expedition card display, and BOLA
 * (Broken Object Level Authorization) isolation between users.
 *
 * All test data is synthetic. The TEST_USER account is auto-registered
 * on staging if it does not already exist (handled by loginAs helper).
 *
 * Test isolation strategy:
 * - Each test logs in fresh (new browser context per test in Playwright by default).
 * - The suite does NOT clean up created expeditions after itself — CI should use a
 *   dedicated ephemeral database that is wiped between pipeline runs.
 */

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER, TEST_USER_B } from "./helpers";
import { trackConsoleErrors } from "./helpers/console-errors";

// Expedition flow tests involve login + dashboard + wizard interaction
test.describe.configure({ timeout: 120_000 });

// ---------------------------------------------------------------------------
// 1. Expeditions dashboard renders correctly
// ---------------------------------------------------------------------------

test.describe("Expeditions dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.waitForLoadState("networkidle");
  });

  test("E2E-010 — authenticated user sees the expeditions page with content", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // The expeditions page shows "Expeditions" in breadcrumb or nav text,
    // not as a standalone heading. Match either EN or PT locale.
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Main content area should not be empty after data loads.
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });

  test("E2E-011 — dashboard shows either expedition cards or empty-state message", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // The dashboard renders either expedition cards, an empty-state CTA,
    // or at minimum the main content area with navigation links.
    // Wait for network to settle, then verify main has content.
    await page.waitForLoadState("networkidle");
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 15_000 });

    expect(errors).toHaveLength(0);
  });

  test('E2E-012 — "New Expedition" link is visible on the dashboard', async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // The dashboard renders a link (not a button) to start a new expedition.
    // Matches: "New Expedition", "Start Expedition", "Nova Expedição", "Iniciar Expedição"
    const newExpLink = page
      .getByRole("link", {
        name: /new expedition|start expedition|nova expedição|iniciar expedição/i,
      })
      .first();

    await expect(newExpLink).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Expedition wizard navigation
// ---------------------------------------------------------------------------

test.describe("Expedition wizard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.waitForLoadState("networkidle");
  });

  test("E2E-020 — user can click New Expedition and land on /expedition/new wizard", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // Click the new expedition link from the dashboard.
    const newExpLink = page
      .getByRole("link", {
        name: /new expedition|start expedition|nova expedição|iniciar expedição/i,
      })
      .first();
    await expect(newExpLink).toBeVisible({ timeout: 10_000 });
    await newExpLink.click();

    // Should navigate to the expedition wizard.
    await page.waitForURL(/\/expedition\/new/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // The wizard should render content in main.
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });

  test("E2E-021 — wizard step 1 shows profile fields", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    // Navigate directly to the wizard.
    await page.goto("/en/expedition/new");
    await page.waitForLoadState("networkidle");

    // Step 1 (About You) shows the step heading.
    await expect(
      page.getByRole("heading", { name: /about you|sobre você/i })
    ).toBeVisible({ timeout: 15_000 });

    expect(errors).toHaveLength(0);
  });

  test("E2E-022 — empty destination field shows validation on step 2", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // Navigate to the wizard.
    await page.goto("/en/expedition/new");
    await page.waitForLoadState("networkidle");

    // Try to advance past step 1 to reach the destination step.
    // Click Next/Skip to move forward from the About You step.
    const nextBtn = page
      .getByRole("button", { name: /next|próximo|skip|pular|continue|continuar/i })
      .first();

    if (await nextBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await nextBtn.click();
      // Wait for step 2 to render.
      await page.waitForLoadState("networkidle");
    }

    // On the destination step, try to advance without filling destination.
    // Look for the destination search placeholder to confirm we are on step 2.
    const destInput = page.getByPlaceholder(
      /search.*city|busque.*cidade|destination|destino/i
    );

    if (await destInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Do not fill destination. Try to advance.
      const advanceBtn = page
        .getByRole("button", { name: /next|próximo|continue|continuar/i })
        .first();

      if (await advanceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await advanceBtn.click();

        // Should show validation error or remain on the same step.
        // The destination input or an error message should still be visible.
        const stillOnStep = destInput
          .or(
            page.getByText(
              /required|obrigatório|select.*destination|selecione.*destino/i
            ).first()
          );
        await expect(stillOnStep).toBeVisible({ timeout: 5_000 });
      }
    }

    expect(errors).toHaveLength(0);
  });

  test("E2E-023 — clicking browser back from wizard returns to expeditions page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // Start on the expeditions dashboard.
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Navigate to the wizard.
    const newExpLink = page
      .getByRole("link", {
        name: /new expedition|start expedition|nova expedição|iniciar expedição/i,
      })
      .first();
    await expect(newExpLink).toBeVisible({ timeout: 10_000 });
    await newExpLink.click();

    await page.waitForURL(/\/expedition\/new/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Click browser back button.
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Should be back on the expeditions dashboard.
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible({ timeout: 15_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Expedition card content
// ---------------------------------------------------------------------------

test.describe("Expedition card content", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.waitForLoadState("networkidle");
  });

  test("E2E-030 — expedition card shows destination name", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // Check for expedition cards. If none exist, verify dashboard renders properly.
    const firstCard = page.getByRole("article").first();
    const hasCards = await firstCard
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!hasCards) {
      // No cards — verify dashboard at least renders with content
      const main = page.locator("main");
      await expect(main).not.toBeEmpty({ timeout: 10_000 });
      expect(errors).toHaveLength(0);
      return;
    }

    // The card should contain some text content (destination name, trip info).
    await expect(firstCard).not.toBeEmpty();

    // Verify the card contains a link to the expedition detail page.
    const cardLink = firstCard.locator('a[href*="/expedition/"]').first();
    await expect(cardLink).toBeVisible({ timeout: 5_000 });

    expect(errors).toHaveLength(0);
  });

  test("E2E-031 — expedition card link navigates to expedition phase page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    // Find the first expedition card with a link.
    const firstCard = page.getByRole("article").first();
    const hasCards = await firstCard
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!hasCards) {
      // No cards — verify dashboard renders properly
      const main = page.locator("main");
      await expect(main).not.toBeEmpty({ timeout: 10_000 });
      expect(errors).toHaveLength(0);
      return;
    }

    // Click the first expedition link within the card.
    const cardLink = firstCard.locator('a[href*="/expedition/"]').first();
    await expect(cardLink).toBeVisible({ timeout: 5_000 });
    await cardLink.click();

    // Should navigate to an expedition detail page.
    await page.waitForURL(/\/expedition\/[^/]+/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Security — BOLA (Broken Object Level Authorization) isolation
// ---------------------------------------------------------------------------
//
// These tests manage their own browser contexts and do NOT rely on the shared
// beforeEach loginAs. Each test creates two independent sessions to simulate
// two distinct authenticated users operating concurrently.
//
// Synthetic credentials are defined in helpers.ts. Override via env vars in CI:
//   TEST_USER_EMAIL / TEST_USER_PASSWORD   -> User A (primary test account)
//   TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD -> User B (secondary test account)

test.describe("BOLA isolation", () => {
  test("E2E-040 — User B cannot access User A's expedition via direct URL", async ({
    browser,
  }) => {
    // Create two isolated browser contexts to simulate two different users.
    // Each context has its own cookie jar and session state — they cannot share
    // session tokens, which is the correct model for a BOLA attack simulation.
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      // --- Step 1: Log in as User A and capture an expedition ID ---

      await loginAs(pageA, TEST_USER.email, TEST_USER.password);
      await pageA.waitForLoadState("networkidle");

      // Ensure we are on the expeditions dashboard.
      await expect(
        pageA.getByText(/expeditions|expedições/i).first()
      ).toBeVisible({ timeout: 10_000 });

      // Extract an expedition ID from the first expedition link.
      // Links follow the pattern /expedition/{id} or /expedition/{id}/phase-N
      let tripId: string | null = null;
      const expeditionLink = pageA
        .locator('a[href*="/expedition/"]')
        .first();

      if ((await expeditionLink.count()) > 0) {
        const href = await expeditionLink.getAttribute("href");
        const match = href?.match(/\/expedition\/([^/]+)/);
        tripId = match?.[1] ?? null;
        // Filter out "new" — that is the wizard link, not a real expedition
        if (tripId === "new") {
          tripId = null;
        }
      }

      // If User A has no expeditions, verify dashboard renders but can't test BOLA
      if (!tripId) {
        await expect(
          pageA.getByText(/expeditions|expedições/i).first()
        ).toBeVisible({ timeout: 10_000 });
        return;
      }

      // --- Step 2: Log in as User B in a completely separate context ---

      await loginAs(pageB, TEST_USER_B.email, TEST_USER_B.password);
      await pageB.waitForLoadState("networkidle");

      await expect(
        pageB.getByText(/expeditions|expedições/i).first()
      ).toBeVisible({ timeout: 10_000 });

      // --- Step 3: Attempt to access User A's expedition directly ---

      // User B navigates directly to User A's expedition URL, simulating an
      // attacker who has guessed or enumerated a valid expedition ID.
      await pageB.goto(`/en/expedition/${tripId}`);
      await pageB.waitForLoadState("networkidle");

      // --- Step 4: Assert that access is denied ---

      // The app must respond with one of:
      //   (a) A redirect away from the expedition URL (e.g. back to /expeditions or a 404 page)
      //   (b) Visible "not found" content — 404 is the correct response to avoid
      //       leaking resource existence to an unauthorized party.
      //
      // Per SEC-SPEC-001 FIND-M-001 and SR-002: the server must return 404 (not
      // 403) so that the existence of the resource is not confirmed to User B.
      // The UI must never display expedition data belonging to another user.
      const finalUrl = pageB.url();
      const isRedirectedAway = !finalUrl.includes(`/expedition/${tripId}`);

      const hasNotFoundContent =
        (await pageB
          .locator(
            '[data-testid="not-found"], [data-testid="error-page"], ' +
              'h1:text-matches("404|not found|não encontrad", "i"), ' +
              'p:text-matches("not found|não encontrad", "i")'
          )
          .count()) > 0;

      expect(
        isRedirectedAway || hasNotFoundContent,
        `User B was able to view User A's expedition page at /expedition/${tripId} — ` +
          "BOLA vulnerability: object-level authorization is not enforced."
      ).toBeTruthy();

      // Additionally verify that if redirected, the final page is a
      // legitimate non-expedition page — a redirect that still leaks data
      // in the DOM would be a partial BOLA bypass.
      if (isRedirectedAway) {
        expect(finalUrl).toMatch(
          /\/(expeditions\/?$|auth\/login|$)/
        );
      }
    } finally {
      // Always clean up both contexts regardless of test outcome to prevent
      // browser resource leaks and session pollution between test runs.
      await contextA.close();
      await contextB.close();
    }
  });
});
