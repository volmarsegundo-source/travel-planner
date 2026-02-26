/**
 * E2E — Trip management flows
 *
 * Covers: viewing the trip dashboard, creating a trip via the modal,
 * and verifying that a created trip card displays correct information.
 *
 * All test data is synthetic. The TEST_USER account must exist in the
 * database before this suite runs (created via the registration flow or
 * a global setup script). Set TEST_USER_EMAIL / TEST_USER_PASSWORD env
 * vars in CI to point at the pre-seeded account.
 *
 * Test isolation strategy:
 * - Each test logs in fresh (new browser context per test in Playwright by default).
 * - Trip creation tests generate unique titles per run to avoid cross-test
 *   pollution on a shared database.
 * - The suite does NOT clean up created trips after itself — CI should use a
 *   dedicated ephemeral database that is wiped between pipeline runs.
 */

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER } from "./helpers";

// ---------------------------------------------------------------------------
// Shared beforeEach: log in as the synthetic test user before every test.
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await loginAs(page, TEST_USER.email, TEST_USER.password);
  // After loginAs, the URL is already /trips.
  // Ensure the dashboard heading is present before the test body runs.
  await expect(
    page.getByRole("heading", { name: /minhas viagens/i })
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 1. Trip dashboard renders correctly
// ---------------------------------------------------------------------------

test.describe("Trip dashboard", () => {
  test("E2E-010 — authenticated user sees the Minhas viagens heading", async ({
    page,
  }) => {
    // loginAs already navigated to /trips; heading assertion is in beforeEach.
    // This test documents the baseline render as a standalone scenario.
    await expect(
      page.getByRole("heading", { name: /minhas viagens/i })
    ).toBeVisible();
  });

  test("E2E-011 — dashboard shows either trip cards or the empty-state message", async ({
    page,
  }) => {
    // The dashboard renders one of three mutually exclusive states:
    // loading skeletons, an error alert, trip cards, or an empty-state message.
    // We assert that at least one of the non-error terminal states is visible.

    // Wait for loading to settle — skeletons disappear once data resolves.
    // We do not wait for a specific card count because the test account may
    // have 0 or more trips depending on prior runs.
    await expect(
      page.getByRole("heading", { name: /minhas viagens/i })
    ).toBeVisible();

    // The empty state text is t("noTrips") = "Você ainda não tem viagens."
    // The grid is identified by the presence of article elements (TripCard).
    // At least one of these must be visible after loading completes.
    //
    // Strategy: use Playwright's built-in .or() locator combinator which
    // matches when either locator is visible, then assert on the combined
    // result. This avoids the unhandled-rejection risk of Promise.race with
    // expect() calls that throw on failure.
    const emptyStateOrCard = page
      .getByText(/você ainda não tem viagens/i)
      .or(page.getByRole("article").first());

    await expect(emptyStateOrCard).toBeVisible({ timeout: 10_000 });
  });

  test("E2E-012 — Nova viagem button is visible on the dashboard", async ({
    page,
  }) => {
    // The TripDashboard renders a button with t("newTrip") = "Nova viagem".
    // This is the primary CTA for trip creation.
    await expect(
      page.getByRole("button", { name: /nova viagem/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Create a trip via the modal
// ---------------------------------------------------------------------------

test.describe("Create trip flow", () => {
  test("E2E-020 — user can open the create-trip modal and submit a new trip", async ({
    page,
  }) => {
    // Unique title per run prevents false-positive matches on stale cards.
    const tripTitle = `Paris Adventure ${Date.now()}`;
    const tripDestination = "Paris, France";

    // Open the modal via the header button.
    await page.getByRole("button", { name: /nova viagem/i }).click();

    // The Dialog renders with DialogTitle = t("newTrip") = "Nova viagem".
    // Playwright's getByRole('dialog') targets the shadcn Dialog element.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The CreateTripModal uses Label + Input with explicit htmlFor/id pairs.
    // Labels: t("title") = "Nome da viagem", t("destination") = "Destino".
    await dialog.getByLabel(/nome da viagem|title/i).fill(tripTitle);
    await dialog.getByLabel(/destino|destination/i).fill(tripDestination);

    // Submit — button renders tCommon("save") = "Salvar".
    await dialog.getByRole("button", { name: /salvar|save/i }).click();

    // After successful creation the modal closes and the query is invalidated.
    // The new trip card should appear in the grid.
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // TripCard renders the title in an <h2> element inside an <article>.
    await expect(
      page.getByRole("heading", { name: tripTitle })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("E2E-021 — create trip form shows validation error when title is empty", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /nova viagem/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Leave title empty, fill only destination.
    await dialog.getByLabel(/destino|destination/i).fill("Tokyo, Japan");

    // Attempt to save without a title.
    await dialog.getByRole("button", { name: /salvar|save/i }).click();

    // The form renders an inline validation error for the title field:
    // t("errors.titleRequired") = "Nome da viagem é obrigatório."
    await expect(
      dialog.getByRole("alert")
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      dialog.getByText(/nome da viagem é obrigatório|title is required/i)
    ).toBeVisible();

    // The modal must remain open — no successful creation.
    await expect(dialog).toBeVisible();
  });

  test("E2E-022 — create trip form shows validation error when destination is empty", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /nova viagem/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill title but leave destination empty.
    await dialog.getByLabel(/nome da viagem|title/i).fill("My Great Trip");

    await dialog.getByRole("button", { name: /salvar|save/i }).click();

    // t("errors.destinationRequired") = "Destino é obrigatório."
    await expect(
      dialog.getByText(/destino é obrigatório|destination is required/i)
    ).toBeVisible({ timeout: 5_000 });

    await expect(dialog).toBeVisible();
  });

  test("E2E-023 — cancel button closes the create-trip modal without creating a trip", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /nova viagem/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByLabel(/nome da viagem|title/i).fill("This trip should not exist");

    // tCommon("cancel") = "Cancelar".
    await dialog.getByRole("button", { name: /cancelar|cancel/i }).click();

    // Dialog must be gone.
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // The trip title must not appear in the dashboard.
    await expect(
      page.getByText("This trip should not exist")
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Trip card displays correct information after creation
// ---------------------------------------------------------------------------

test.describe("Trip card content", () => {
  test("E2E-030 — created trip card shows title and destination", async ({
    page,
  }) => {
    // Use unique strings so assertions cannot match stale data from prior runs.
    const tripTitle = `London Weekend ${Date.now()}`;
    const tripDestination = "London, UK";

    // Create the trip via the modal.
    await page.getByRole("button", { name: /nova viagem/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByLabel(/nome da viagem|title/i).fill(tripTitle);
    await dialog.getByLabel(/destino|destination/i).fill(tripDestination);
    await dialog.getByRole("button", { name: /salvar|save/i }).click();

    // Wait for the modal to close.
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Locate the specific card by its title heading.
    // TripCard renders: <article> > ... <h2>{trip.title}</h2> ... <p>{trip.destination}</p>
    const card = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: tripTitle }) });

    await expect(card).toBeVisible({ timeout: 10_000 });

    // The destination is rendered in a <p> inside the same article.
    await expect(card.getByText(tripDestination)).toBeVisible();
  });

  test("E2E-031 — trip card link navigates to the trip detail page", async ({
    page,
  }) => {
    const tripTitle = `Rome Explorer ${Date.now()}`;

    // Create a trip to guarantee at least one card exists.
    await page.getByRole("button", { name: /nova viagem/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByLabel(/nome da viagem|title/i).fill(tripTitle);
    await dialog.getByLabel(/destino|destination/i).fill("Rome, Italy");
    await dialog.getByRole("button", { name: /salvar|save/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // The TripCard renders a Link with aria-label={trip.title} wrapping the
    // cover gradient div, and a second Link wrapping the <h2>.
    // Click the heading link to navigate to the detail page.
    await page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: tripTitle }) })
      .getByRole("heading", { name: tripTitle })
      .click();

    // The trip detail page URL follows the pattern /trips/<id>.
    await page.waitForURL(/\/trips\/[^/]+$/, { timeout: 10_000 });
  });
});
