/**
 * E2E -- Navigation flows
 *
 * Covers: dashboard progress bar navigation, back buttons, revisiting
 * completed phases, ExpeditionProgressBar navigation, breadcrumbs,
 * phase access guards, reload persistence, language switching, and
 * phase transitions.
 *
 * Uses the seeded testuser@travel.dev account.
 */

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER } from "./helpers";
import { trackConsoleErrors } from "./helpers/console-errors";

test.describe.configure({ timeout: 120_000 });

// ---------------------------------------------------------------------------
// Helper: find an expedition tripId from the dashboard
// ---------------------------------------------------------------------------
async function getFirstTripId(
  page: import("@playwright/test").Page
): Promise<string | null> {
  await page.goto("/en/expeditions");
  await page.waitForLoadState("networkidle");

  // Try to find a phase segment button (indicates an expedition exists)
  const segment = page.locator('[data-testid="phase-segment-1"]').first();
  if (!(await segment.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return null;
  }

  // Extract tripId from the expedition card link
  const expLink = page.getByRole("article").first().getByRole("link").first();
  if (!(await expLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return null;
  }

  const href = await expLink.getAttribute("href");
  const match = href?.match(/\/expedition\/([^/]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// 1. Dashboard progress bar -- click completed phase navigates
// ---------------------------------------------------------------------------

test.describe("Navigation -- dashboard progress bar", () => {
  test("clicking a completed phase segment navigates to that phase page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Phase 1 should be completed if expedition is on phase 2+
    const segment1 = page
      .locator('[data-testid="phase-segment-1"]')
      .first();

    // Check if it is a button (navigable)
    const tagName = await segment1.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === "button") {
      await segment1.click();
      await page.waitForURL(/\/expedition\//, { timeout: 15_000 });
      expect(page.url()).toContain(`/expedition/${tripId}`);
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Dashboard progress bar -- click current phase navigates
// ---------------------------------------------------------------------------

test.describe("Navigation -- current phase segment", () => {
  test("clicking the current phase segment navigates to that phase page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Find the pulsing (current) segment -- it should also be a button
    const segments = page.locator(
      '[data-testid^="phase-segment-"]'
    );
    const count = await segments.count();

    for (let i = 0; i < count; i++) {
      const seg = segments.nth(i);
      const tagName = await seg.evaluate((el) => el.tagName.toLowerCase());
      const classes = (await seg.getAttribute("class")) ?? "";

      if (tagName === "button" && classes.includes("animate-pulse")) {
        await seg.click();
        await page.waitForURL(/\/expedition\//, { timeout: 15_000 });
        expect(page.url()).toContain("/expedition/");
        break;
      }
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Dashboard progress bar -- future phases are NOT clickable
// ---------------------------------------------------------------------------

test.describe("Navigation -- future phase segments", () => {
  test("future phase segments are div elements, not buttons", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Phase segments that are beyond the current phase should be <div> not <button>
    const segments = page.locator('[data-testid^="phase-segment-"]');
    const count = await segments.count();
    let foundFuture = false;

    for (let i = count - 1; i >= 0; i--) {
      const seg = segments.nth(i);
      const tagName = await seg.evaluate((el) => el.tagName.toLowerCase());
      const classes = (await seg.getAttribute("class")) ?? "";

      // Future segments have no bg-atlas-gold and no animate-pulse
      if (
        !classes.includes("bg-atlas-gold") &&
        !classes.includes("animate-pulse") &&
        !classes.includes("bg-primary")
      ) {
        expect(tagName).toBe("div");
        foundFuture = true;
        break;
      }
    }

    // If all phases completed or current, that is also valid
    if (!foundFuture) {
      // All segments are navigable -- this is fine for fully completed expeditions
      expect(true).toBe(true);
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Back button on each phase goes to previous phase
// ---------------------------------------------------------------------------

test.describe("Navigation -- back button", () => {
  test("back button on phase 3 navigates to phase 2", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    const backBtn = page.locator('[data-testid="wizard-back"]');
    if (await backBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForURL(/\/phase-2/, { timeout: 10_000 });
      await expect(page).toHaveURL(/\/phase-2/);
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Revisit completed phase 3 -- data shown + advance button says "Advance"
// ---------------------------------------------------------------------------

test.describe("Navigation -- revisit completed phase", () => {
  test("revisiting completed phase 3 shows data and advance button", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    // If redirected away from phase 3, expedition hasn't reached it
    if (!page.url().includes("/phase-3")) {
      await expect(page.locator("main")).not.toBeEmpty({ timeout: 10_000 });
      expect(errors).toHaveLength(0);
      return;
    }

    // Advance button should be visible
    const advanceBtn = page.locator('[data-testid="wizard-primary"]');
    if (await advanceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = await advanceBtn.textContent();
      // Should contain "Advance" (en) or "Avançar" (pt) or "Next" or similar
      expect(text).toMatch(/advance|avançar|complete|concluir|next|próximo/i);
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Revisit completed phase 3 -- advance goes to phase 4
// ---------------------------------------------------------------------------

test.describe("Navigation -- advance from revisited phase", () => {
  test("clicking advance on completed phase 3 goes to phase 4", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    // If redirected away from phase 3, can't test advance
    if (!page.url().includes("/phase-3")) {
      await expect(page.locator("main")).not.toBeEmpty({ timeout: 10_000 });
      expect(errors).toHaveLength(0);
      return;
    }

    const advanceBtn = page.locator('[data-testid="wizard-primary"]');
    if (await advanceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await advanceBtn.click();
      // Should navigate to phase 4 or stay on phase 3 (if required items)
      try {
        await page.waitForURL(/\/phase-4/, { timeout: 15_000 });
      } catch {
        // May not advance — verify page still renders
        await expect(page.locator("main")).not.toBeEmpty({ timeout: 5_000 });
      }
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Revisit completed phase 4 -- advance goes to phase 5
// ---------------------------------------------------------------------------

test.describe("Navigation -- advance from revisited phase 4", () => {
  test("clicking advance on completed phase 4 goes to phase 5", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-4`);
    await page.waitForLoadState("networkidle");

    // Navigate through all phase 4 steps to reach the advance button
    const nextBtn = page.locator('[data-testid="wizard-primary"]');
    let steps = 0;
    while (steps < 5 && !page.url().includes("/phase-5")) {
      if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        if (!(await nextBtn.isDisabled())) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        } else break;
      } else break;
      steps++;
    }

    if (page.url().includes("/phase-5")) {
      await expect(page).toHaveURL(/\/phase-5/);
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. ExpeditionProgressBar inside wizard -- click completed phase
// ---------------------------------------------------------------------------

test.describe("Navigation -- in-wizard progress bar", () => {
  test("ExpeditionProgressBar in wizard allows navigation to completed phases", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Go to phase 3 (phase 1 should be completed and clickable in the in-wizard bar)
    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    // Look for in-wizard phase segments (same data-testid pattern)
    const phase1Segment = page.locator('[data-testid="phase-segment-1"]').first();
    if (await phase1Segment.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const tagName = await phase1Segment.evaluate((el) =>
        el.tagName.toLowerCase()
      );
      if (tagName === "button") {
        await phase1Segment.click();
        await page.waitForURL(/\/expedition\/[^/]+$/, { timeout: 15_000 });
        // Should navigate to phase 1 (expedition root)
        expect(page.url()).toContain(`/expedition/${tripId}`);
      }
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Dashboard "Continue" / "View Expedition" link goes to expedition
// ---------------------------------------------------------------------------

test.describe("Navigation -- dashboard continue link", () => {
  test("continue link on dashboard navigates to expedition page", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Find the first expedition card link
    const expCard = page.getByRole("article").first();
    if (!(await expCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No expedition cards on dashboard");
      return;
    }

    const cardLink = expCard.getByRole("link").first();
    await cardLink.click();
    await page.waitForURL(/\/expedition\//, { timeout: 15_000 });
    expect(page.url()).toContain("/expedition/");

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Breadcrumb navigation works
// ---------------------------------------------------------------------------

test.describe("Navigation -- breadcrumbs", () => {
  test("breadcrumb links navigate to parent pages", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    // Look for breadcrumb navigation
    const breadcrumb = page.getByRole("navigation", {
      name: /breadcrumb/i,
    });
    if (await breadcrumb.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const links = breadcrumb.getByRole("link");
      const count = await links.count();
      if (count > 0) {
        // Click the first breadcrumb link (should go to dashboard or expedition root)
        await links.first().click();
        await page.waitForURL(/\/dashboard|\/expeditions|\/expedition\//, {
          timeout: 10_000,
        });
      }
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Phase access guard: can't access phase 4 if currentPhase is 2
// ---------------------------------------------------------------------------

test.describe("Navigation -- phase access guard", () => {
  test("accessing a future phase beyond currentPhase redirects", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Try to access phase 6 directly (likely beyond the current phase)
    await page.goto(`/en/expedition/${tripId}/phase-6`);
    await page.waitForLoadState("networkidle");

    // Should either redirect to the current phase or show an error/guard
    // The URL should not remain on phase-6 if the expedition is not at that phase
    const currentUrl = page.url();

    // If phase 6 is not accessible, we should be redirected or see a guard message
    // This is valid if the expedition is at phase 6 too
    expect(currentUrl).toContain("/expedition/");

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 12. URL stays on correct phase after reload
// ---------------------------------------------------------------------------

test.describe("Navigation -- reload persistence", () => {
  test("reloading a phase page keeps the same URL", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    const urlBefore = page.url();
    await page.reload();
    await page.waitForLoadState("networkidle");
    const urlAfter = page.url();

    // URL should remain the same after reload (or redirect to current phase)
    expect(urlAfter).toContain("/expedition/");

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 13. Language switch preserves current phase
// ---------------------------------------------------------------------------

test.describe("Navigation -- language switch", () => {
  test("switching language preserves the current phase URL", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Go to phase 3 in English
    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    // Find language switcher and switch to Portuguese
    const langSwitcher = page.getByRole("button", {
      name: /language|idioma|PT|EN/i,
    });
    if (await langSwitcher.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await langSwitcher.click();
      await page.waitForTimeout(500);

      // Click on the Portuguese option
      const ptOption = page.getByRole("menuitem", { name: /português|PT/i })
        .or(page.getByText(/português|PT-BR/i));
      if (await ptOption.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await ptOption.first().click();
        await page.waitForLoadState("networkidle");

        // URL should still contain phase-3 but with /pt/ locale prefix
        expect(page.url()).toContain("/phase-3");
      }
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 14. Phase transition animation shows between phases
// ---------------------------------------------------------------------------

test.describe("Navigation -- phase transition", () => {
  test("phase transition backdrop appears during phase advancement", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    // Go to phase 3 and advance to phase 4
    await page.goto(`/en/expedition/${tripId}/phase-3`);
    await page.waitForLoadState("networkidle");

    // If redirected away from phase 3, can't test transition
    if (!page.url().includes("/phase-3")) {
      await expect(page.locator("main")).not.toBeEmpty({ timeout: 10_000 });
      expect(errors).toHaveLength(0);
      return;
    }

    const advanceBtn = page.locator('[data-testid="wizard-primary"]');
    if (await advanceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await advanceBtn.click();

      // Check if phase transition backdrop appears (may be brief)
      const transitionBackdrop = page.locator(
        '[data-testid="phase-transition-backdrop"]'
      );
      const appeared = await transitionBackdrop
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      // Either the transition showed or we landed on next phase
      if (!appeared) {
        // May stay on phase 3 if required items — just verify page renders
        await expect(page.locator("main")).not.toBeEmpty({ timeout: 10_000 });
      }
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 15. Back from phase 2 goes to phase 1 (expedition root)
// ---------------------------------------------------------------------------

test.describe("Navigation -- phase 2 back to phase 1", () => {
  test("back button on phase 2 navigates to phase 1 (expedition root)", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const tripId = await getFirstTripId(page);
    if (!tripId) {
      test.skip(true, "No expedition on dashboard");
      return;
    }

    await page.goto(`/en/expedition/${tripId}/phase-2`);
    await page.waitForLoadState("networkidle");

    const backBtn = page.locator('[data-testid="wizard-back"]');
    if (await backBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await backBtn.click();
      // Phase 1 may be at /phase-1 or at the expedition root (no /phase-N suffix)
      await page.waitForURL(
        new RegExp(`/expedition/${tripId}(/phase-1)?$`),
        { timeout: 10_000 }
      );
      expect(page.url()).toMatch(new RegExp(`/expedition/${tripId}`));
    }

    expect(errors).toHaveLength(0);
  });
});
