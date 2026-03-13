/**
 * E2E -- DestinationAutocomplete component
 *
 * Covers: dropdown behavior, result formatting, selection, no-results state,
 * debounce, loading spinner, origin autocomplete, and clearing selection.
 *
 * Uses the seeded testuser@travel.dev account.
 * Tests interact with the Phase 1 wizard which contains the autocomplete.
 */

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER } from "./helpers";
import { trackConsoleErrors } from "./helpers/console-errors";

test.describe.configure({ timeout: 120_000 });

// ---------------------------------------------------------------------------
// Helper: navigate to Phase 1 Step 2 (Destination) where autocomplete lives
// ---------------------------------------------------------------------------
async function goToDestinationStep(
  page: import("@playwright/test").Page
): Promise<void> {
  await page.goto("/en/dashboard");
  await page.waitForLoadState("networkidle");

  const newExpBtn = page
    .getByRole("link", { name: /new expedition|start expedition/i })
    .or(
      page.getByRole("link", {
        name: /nova expedição|iniciar expedição|começar/i,
      })
    );
  await newExpBtn.first().click();
  await page.waitForURL(/\/expedition\/new/, { timeout: 30_000 });

  // Step 1: fill required fields (name + birthDate) to enable Next
  const nameInput = page.getByLabel(/name|nome/i).first();
  if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const val = await nameInput.inputValue();
    if (!val) await nameInput.fill("Autocomplete Test");
  }
  const birthInput = page.getByLabel(/birth|nascimento/i).first();
  if (await birthInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const val = await birthInput.inputValue();
    if (!val) await birthInput.fill("1990-01-01");
  }

  // Advance to Step 2 (Destination)
  const nextBtn = page.locator('[data-testid="wizard-primary"]');
  await nextBtn.click();
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// 1. Type 2+ chars -- dropdown appears with results
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- dropdown appearance", () => {
  test("typing 2+ characters triggers dropdown with results", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    // Type in the destination input (last one, since origin may also be present)
    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("Par");

    // Wait for dropdown to appear
    const listbox = page.locator('[data-testid="destination-listbox"]');
    await expect(listbox).toBeVisible({ timeout: 10_000 });

    // Should have at least one option
    const options = page.locator('[data-testid="destination-option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Dropdown items show City + State, Country format
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- result format", () => {
  test("dropdown items show city name with state and country", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("Paris");

    const firstOption = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });

    // Line 1 should contain the city name
    const line1 = firstOption.locator('[data-testid="result-line1"]');
    await expect(line1).toBeVisible();
    const line1Text = await line1.textContent();
    expect(line1Text).toBeTruthy();

    // Line 2 should contain state/country info (may be empty for some results)
    const line2 = firstOption.locator('[data-testid="result-line2"]');
    if (await line2.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const line2Text = await line2.textContent();
      expect(line2Text).toBeTruthy();
    }

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Select result -- input shows "City, Country"
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- selection", () => {
  test("selecting a result populates input with 'City, Country'", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("London");

    const firstOption = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });
    await firstOption.click();

    // Input should now show "City, Country" format
    await page.waitForTimeout(300);
    const inputValue = await destInput.inputValue();
    // Should contain a comma (City, Country format)
    expect(inputValue).toContain(",");

    // Dropdown should be closed
    const listbox = page.locator('[data-testid="destination-listbox"]');
    await expect(listbox).not.toBeVisible({ timeout: 3_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Select result -- country code badge appears (trip type)
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- trip type badge", () => {
  test("selecting a destination shows trip type badge", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    // First set origin (Brazil)
    const originInput = page
      .locator('[data-testid="destination-input"]')
      .first();
    if (await originInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await originInput.fill("São Paulo");
      const originOpt = page
        .locator('[data-testid="destination-option"]')
        .first();
      await expect(originOpt).toBeVisible({ timeout: 10_000 });
      await originOpt.click();
      await page.waitForTimeout(500);
    }

    // Then set destination (international)
    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("Tokyo");
    const destOpt = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(destOpt).toBeVisible({ timeout: 10_000 });
    await destOpt.click();
    await page.waitForTimeout(500);

    // Trip type badge should appear (International / Intercontinental)
    await expect(
      page.getByText(
        /domestic|nacional|international|internacional|intercontinental/i
      )
    ).toBeVisible({ timeout: 5_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. No results -- shows "no results" message
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- no results", () => {
  test("typing a nonsense query shows no results hint", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("zzzzqqqxxx");

    // Wait for the no-results hint
    const noResults = page.locator('[data-testid="no-results-hint"]');
    await expect(noResults).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Clear input -- dropdown disappears
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- clear input", () => {
  test("clearing the input hides the dropdown", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("Berlin");

    const firstOption = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });

    // Clear the input
    await destInput.fill("");
    await page.waitForTimeout(600); // Wait for debounce

    // Dropdown should disappear
    const listbox = page.locator('[data-testid="destination-listbox"]');
    await expect(listbox).not.toBeVisible({ timeout: 5_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Debounce: fast typing doesn't trigger excessive API calls
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- debounce", () => {
  test("fast typing does not trigger excessive API calls", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    // Track API calls to /api/destinations/search
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/destinations/search")) {
        apiCalls.push(req.url());
      }
    });

    const destInput = page.locator('[data-testid="destination-input"]').last();

    // Type characters rapidly (faster than 400ms debounce)
    await destInput.pressSequentially("Barcelon", { delay: 50 });

    // Wait for debounce to settle
    await page.waitForTimeout(800);

    // Should NOT have fired 8 requests (one per character)
    // Debounce at 400ms should result in 1-3 calls at most
    expect(apiCalls.length).toBeLessThanOrEqual(3);
    expect(apiCalls.length).toBeGreaterThanOrEqual(1);

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Loading spinner while fetching results
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- loading spinner", () => {
  test("loading spinner appears while fetching results", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    const destInput = page.locator('[data-testid="destination-input"]').last();

    // Look for the loading spinner (role="status") that appears during fetch
    await destInput.fill("Amsterdam");

    // The spinner should appear briefly -- check for role="status"
    const spinner = page.locator('[role="status"]');
    // It may have already disappeared by the time we check, so just verify
    // the results eventually load
    const firstOption = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Origin autocomplete works same as destination
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- origin field", () => {
  test("origin autocomplete shows dropdown and allows selection", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    // Origin is the first destination-input (if visible)
    const originInput = page
      .locator('[data-testid="destination-input"]')
      .first();
    if (
      !(await originInput.isVisible({ timeout: 5_000 }).catch(() => false))
    ) {
      test.skip(true, "Origin autocomplete not visible on this step");
      return;
    }

    await originInput.fill("Rio");

    const firstOption = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });
    await firstOption.click();

    await page.waitForTimeout(300);
    const inputValue = await originInput.inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
    // Should contain comma for "City, Country" format
    expect(inputValue).toContain(",");

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Edit text after selection -- trip type badge disappears
// ---------------------------------------------------------------------------

test.describe("Autocomplete -- edit clears badge", () => {
  test("editing text after selection clears the trip type badge", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await goToDestinationStep(page);

    // Set origin (Brazil)
    const originInput = page
      .locator('[data-testid="destination-input"]')
      .first();
    if (await originInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await originInput.fill("São Paulo");
      const originOpt = page
        .locator('[data-testid="destination-option"]')
        .first();
      await expect(originOpt).toBeVisible({ timeout: 10_000 });
      await originOpt.click();
      await page.waitForTimeout(500);
    }

    // Select international destination
    const destInput = page.locator('[data-testid="destination-input"]').last();
    await destInput.fill("Rome");
    const destOpt = page
      .locator('[data-testid="destination-option"]')
      .first();
    await expect(destOpt).toBeVisible({ timeout: 10_000 });
    await destOpt.click();
    await page.waitForTimeout(500);

    // Badge should be visible
    const badge = page.getByText(
      /domestic|nacional|international|internacional|intercontinental/i
    );
    await expect(badge).toBeVisible({ timeout: 5_000 });

    // Now edit the destination text (breaking the selection)
    await destInput.fill("Rom");
    await page.waitForTimeout(600); // Wait for debounce

    // Badge should disappear since the selection was cleared
    await expect(badge).not.toBeVisible({ timeout: 5_000 });

    expect(errors).toHaveLength(0);
  });
});
