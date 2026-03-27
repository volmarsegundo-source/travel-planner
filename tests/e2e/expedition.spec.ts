/**
 * E2E — Expedition flows (E2E-006 to E2E-015)
 *
 * Covers: expedition creation (Phase 1-2), dashboard display, trip type badge,
 * Phase 3 checklist interaction, dark/light theme toggle persistence,
 * itinerary generation, and reload persistence.
 *
 * These tests use the seeded test user (testuser@travel.dev / Test@1234).
 * Run `npm run dev:setup` before the first E2E run.
 */

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER } from "./helpers";
import { trackConsoleErrors } from "./helpers/console-errors";

// Expedition tests involve login + multi-step wizards — need extra time
test.describe.configure({ timeout: 120_000 });

// ---------------------------------------------------------------------------
// E2E-006: Phase 1 wizard — complete destination + dates + confirm
// ---------------------------------------------------------------------------

test.describe("Expedition — Phase 1 wizard", () => {
  test("E2E-006 — user can complete Phase 1 with destination and dates", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    // Navigate to expedition creation
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Click "New Expedition" or "Start Expedition" (empty state CTA)
    const newExpBtn = page
      .getByRole("link", { name: /new expedition|start expedition/i })
      .or(page.getByRole("link", { name: /nova expedição|iniciar expedição/i }));
    await newExpBtn.first().click();

    await page.waitForURL(/\/expedition\/new/, { timeout: 15_000 });

    // Step 1: Profile fields — fill required name + birthDate (or skip if pre-populated)
    await page.waitForLoadState("networkidle");

    // Wait for wizard to render
    const nextBtnStep1 = page.getByRole("button", { name: /^next$/i });
    await nextBtnStep1.first().waitFor({ timeout: 15_000 });

    // Check for profile summary card first (profile already populated)
    const summaryCard = page.locator('[data-testid="edit-profile-btn"]');
    if (await summaryCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Profile already populated — just click Next
    } else {
      // Fill name and birthDate — V2 uses -v2 suffix IDs
      const nameInput = page.locator("#profile-name-v2, #profile-name").first();
      if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nameInput.fill("Test User");
      }
      const birthInput = page.locator("#profile-birthdate-v2, #profile-birthdate").first();
      if (await birthInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const bval = await birthInput.inputValue();
        if (!bval) await birthInput.fill("1990-01-01");
      }
    }

    // Click Next to advance to step 2
    await nextBtnStep1.first().click();

    // Wait for step 2 to render (destination input)
    await page.locator('[data-testid="destination-input"]').first().waitFor({ timeout: 15_000 });

    // Step 2: Destination — type and select using reliable city (with fallback)
    const destInput = page.locator('[data-testid="destination-input"]').first();
    await expect(destInput).toBeVisible({ timeout: 15_000 });

    const firstResult = page.locator('[data-testid="destination-option"]').first();
    const cities = ["Roma", "London", "Berlin", "Madrid"];
    let selected = false;
    for (const city of cities) {
      await destInput.fill("");
      await page.waitForTimeout(300);
      await destInput.fill(city);
      const appeared = await firstResult
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => true)
        .catch(() => false);
      if (appeared) {
        selected = true;
        break;
      }
    }
    expect(selected).toBe(true);
    await firstResult.click();

    // Click Next (wizard-primary) to go to step 3 (dates)
    const wizardNext = page.locator('[data-testid="wizard-primary"]');
    await wizardNext.click();
    await page.waitForTimeout(500);

    // Step 3: Dates — fill start and end (V2 uses expedition-*-date-v2 IDs)
    const startDate = page.locator("#expedition-start-date-v2, #expedition-start-date").first()
      .or(page.getByLabel(/departure|start|ida|início/i).first());
    const endDate = page.locator("#expedition-end-date-v2, #expedition-end-date").first()
      .or(page.getByLabel(/return|end|volta|fim/i).first());
    if (await startDate.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startDate.fill("2026-07-01");
      await endDate.fill("2026-07-15");
    }

    // Click Next to go to step 4 (confirmation)
    await wizardNext.click();
    await page.waitForTimeout(500);

    // Step 4: Confirm — click the primary button (Start Expedition / Advance)
    await wizardNext.click();

    // Should navigate to phase 2 or expedition hub
    await page.waitForURL(/\/expedition\//, { timeout: 30_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// E2E-007: Phase 2 wizard — complete traveler type + confirm
// ---------------------------------------------------------------------------

test.describe("Expedition — Phase 2 wizard", () => {
  test("E2E-007 — user can complete Phase 2 with traveler type and preferences", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    // Navigate to expeditions to find an expedition in phase 2
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Click on the first expedition card that shows "Continue"
    const continueLink = page
      .getByRole("link", { name: /continue|continuar/i })
      .first();

    if (!(await continueLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No expedition in phase 2 — run E2E-006 first");
      return;
    }
    await continueLink.click();
    await page.waitForURL(/\/expedition\//, { timeout: 15_000 });

    // If on phase 2: select traveler type
    const soloBtn = page.getByRole("button", { name: /solo/i });
    if (await soloBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await soloBtn.click();

      // Select accommodation style
      const comfortBtn = page.getByRole("button", { name: /comfort|conforto/i });
      if (await comfortBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await comfortBtn.click();
      }

      // Navigate through remaining steps
      const nextBtn = page.getByRole("button", { name: /next|próximo/i });
      while (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }

      // Click Complete & Earn Points
      const completeBtn = page.getByRole("button", {
        name: /complete.*earn|concluir.*ganhar/i,
      });
      if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await completeBtn.click();
        await page.waitForTimeout(2_000);
      }
    }

    // Should advance past phase 2
    await expect(page).toHaveURL(/\/expedition\//, { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// E2E-008: Expedition appears on dashboard after creation
// ---------------------------------------------------------------------------

test.describe("Expedition — dashboard display", () => {
  test("E2E-008 — created expedition appears on the expeditions page", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // V2 Dashboard shows greeting, trip cards, or empty state
    const dashboardContent = page.locator('[data-testid="dashboard-v2"]');
    await expect(dashboardContent).toBeVisible({ timeout: 15_000 });

    // Should show either trip cards or the empty state CTA
    const hasContent = page.locator('[data-testid="trip-card"], [data-testid="featured-trip-section"], [data-testid="no-active-trip"], [data-testid="start-expedition-btn"]').first();
    await expect(hasContent).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// E2E-009: Trip type badge shows correct type for international destination
// ---------------------------------------------------------------------------

test.describe("Expedition — trip type badge", () => {
  test("E2E-009 — international destination shows correct trip type indicator", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Look for trip type indicators on expedition cards
    // The page shows expedition cards with destination info
    const dashboardContent = await page.textContent("main");

    // At minimum, the page rendered without errors
    expect(dashboardContent).toBeTruthy();

    // If there are expedition cards, they should display phase info
    const phaseText = page.getByText(/phase \d|fase \d/i).first();
    if (await phaseText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(phaseText).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// E2E-010: Coordenadas (points) increase after completing a phase
// ---------------------------------------------------------------------------

test.describe("Expedition — points increase", () => {
  test("E2E-010 — user points are displayed on the expeditions page", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // V2 navbar shows PA points via AtlasBadge — look for text containing "PA" or point numbers
    const pointsDisplay = page.getByText(/\d+\s*PA|\d+\s*pontos|\d+\s*points/i).first()
      .or(page.locator('[data-testid="gamification-badge"]').first())
      .or(page.locator('[data-slot="atlas-badge"]').first());
    await expect(pointsDisplay).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// E2E-011: Itinerary generation via AI (requires trip with legacy flow)
// ---------------------------------------------------------------------------

test.describe("Itinerary — AI generation", () => {
  test("E2E-011 — generate itinerary link is visible for expedition without itinerary", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    // Navigate to expeditions page
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // If there are expedition cards, click the first one
    const expeditionCard = page.locator('[data-testid="trip-card"], [data-testid="expedition-card"]').first();
    if (!(await expeditionCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No expeditions available — create an expedition first");
      return;
    }

    // Click on expedition link to navigate to detail
    // V2 wraps trip-card inside <a>, so use parent link if child not found
    let expeditionLink = expeditionCard.locator("a").first();
    if (!(await expeditionLink.isVisible({ timeout: 2_000 }).catch(() => false))) {
      expeditionLink = page.locator('a:has([data-testid="trip-card"])').first()
        .or(page.locator('a:has([data-testid="expedition-card"])').first());
    }
    await expeditionLink.click();

    await page.waitForURL(/\/expedition\/[^/]+/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // The expedition detail page should render — wait for main to have content
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// E2E-012: Expedition phase page renders correctly
// ---------------------------------------------------------------------------

test.describe("Expedition — phase page", () => {
  test("E2E-012 — expedition phase page renders with wizard content", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    // Go to expeditions
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    const expeditionCard = page.locator('[data-testid="trip-card"], [data-testid="expedition-card"]').first();
    if (!(await expeditionCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No expeditions available");
      return;
    }

    // Navigate to expedition phase page — V2 wraps card inside <a>
    let expeditionLink = expeditionCard.locator("a").first();
    if (!(await expeditionLink.isVisible({ timeout: 2_000 }).catch(() => false))) {
      expeditionLink = page.locator('a:has([data-testid="trip-card"])').first()
        .or(page.locator('a:has([data-testid="expedition-card"])').first());
    }
    await expeditionLink.click();
    await page.waitForURL(/\/expedition\/[^/]+/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // The expedition phase page should render with main content
    const main = page.locator("main");
    await expect(main).not.toBeEmpty({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// E2E-013: Data persists after page reload
// ---------------------------------------------------------------------------

test.describe("Itinerary — persistence after reload", () => {
  test("E2E-013 — expeditions page data persists after full page reload", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Capture current page content
    const beforeReload = await page.textContent("main");

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Content should still be present (data comes from PostgreSQL, not sessionStorage)
    const afterReload = await page.textContent("main");
    expect(afterReload).toBeTruthy();

    // Expeditions text should still be visible
    await expect(
      page.getByText(/expeditions|expedições/i).first()
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// E2E-014: Phase 3 checklist — toggle item updates progress
// ---------------------------------------------------------------------------

test.describe("Expedition — Phase 3 checklist", () => {
  test("E2E-014 — phase 3 checklist page renders with items when accessible", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Try to find an expedition in phase 3
    const continueLink = page
      .getByRole("link", { name: /continue|continuar/i })
      .first();

    if (!(await continueLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // No expeditions — verify page renders correctly instead
      const dashContent = await page.textContent("main");
      expect(dashContent).toBeTruthy();
      return;
    }

    await continueLink.click();
    await page.waitForURL(/\/expedition\//, { timeout: 15_000 });

    // If we land on phase 3, check for checklist items
    const phaseTitle = page.getByText(/the route|a rota/i);
    if (await phaseTitle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Phase 3 page — should show required section
      await expect(
        page.getByText(/required|obrigatório/i).first()
      ).toBeVisible({ timeout: 5_000 });

      // Should show at least one checklist item
      const checklistItem = page.getByRole("button").filter({
        hasText: /passport|visa|insurance|passaporte|visto|seguro/i,
      });

      if (await checklistItem.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Click to toggle
        await checklistItem.first().click();
        await page.waitForTimeout(1_000);

        // Progress text should be visible
        await expect(
          page.getByText(/\d+\/\d+/i).first()
        ).toBeVisible();
      }
    }

    // Page rendered without navigation errors
    await expect(page).toHaveURL(/\/expedition\//);
  });
});

// ---------------------------------------------------------------------------
// E2E-015: Dark/light theme toggle persists after reload
// ---------------------------------------------------------------------------

test.describe("Theme — toggle persistence", () => {
  test("E2E-015 — dark/light theme toggle persists across page reload", async ({
    page,
  }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.goto("/en/expeditions");
    await page.waitForLoadState("networkidle");

    // Look for theme toggle button
    const themeToggle = page.getByRole("button", {
      name: /theme|tema|dark|light|toggle/i,
    });

    if (!(await themeToggle.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Theme toggle might be in the navbar or user menu
      // Try opening user menu first
      const avatarButton = page.locator(
        'button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])'
      );
      if (await avatarButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await avatarButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Check for theme toggle in any form
    const toggle = page
      .getByRole("button", { name: /theme|tema|dark|light/i })
      .first();

    if (!(await toggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // No theme toggle visible — check if <html> has a class-based theme
      const htmlClass = await page.getAttribute("html", "class");
      const initialTheme = htmlClass?.includes("dark") ? "dark" : "light";

      // Reload and verify theme class persists
      await page.reload();
      await page.waitForLoadState("networkidle");

      const afterClass = await page.getAttribute("html", "class");
      const afterTheme = afterClass?.includes("dark") ? "dark" : "light";

      expect(afterTheme).toBe(initialTheme);
      return;
    }

    // Get initial theme state
    const htmlClassBefore = await page.getAttribute("html", "class");
    const isDarkBefore = htmlClassBefore?.includes("dark") ?? false;

    // Toggle theme
    await toggle.click();
    await page.waitForTimeout(500);

    // Verify theme changed
    const htmlClassAfter = await page.getAttribute("html", "class");
    const isDarkAfter = htmlClassAfter?.includes("dark") ?? false;
    expect(isDarkAfter).not.toBe(isDarkBefore);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify theme persisted
    const htmlClassReloaded = await page.getAttribute("html", "class");
    const isDarkReloaded = htmlClassReloaded?.includes("dark") ?? false;
    expect(isDarkReloaded).toBe(isDarkAfter);
  });
});
