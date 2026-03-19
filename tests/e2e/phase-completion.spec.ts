/**
 * E2E Test Specification: Phase Completion Engine
 *
 * Sprint 32 — Stabilization v0.26.0
 *
 * This file contains DETAILED TEST SPECIFICATIONS for developers to implement.
 * Each test block includes preconditions, exact steps, expected outcomes, and
 * known risks. Tests use the registerAndLogin helper to create isolated users.
 *
 * Coverage:
 * - P0-002: Phase 3 checklist completion revert
 * - P0-003: Phase 4 completion without data
 * - P0-004: Phase 6 auto-generation on first visit
 * - P0-005: Progress bar phase skip blocking
 * - Full expedition flow: all 6 phases -> expedition complete
 *
 * Spec refs: SPEC-QA-009, SPEC-PROD-025, SPEC-PROD-023, SPEC-ARCH-016
 *
 * IMPLEMENTATION NOTES:
 * - Each test MUST use registerAndLogin() for user isolation
 * - Each test MUST call trackConsoleErrors() and assert zero errors
 * - Each test MUST use trackServerErrors() and assert zero 5xx responses
 * - NO "OR" conditions — assert EXACT outcomes
 * - Timeouts: 120s per test (staging cold starts)
 *
 * Run: npx playwright test tests/e2e/phase-completion.spec.ts
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, TEST_USER, loginAs } from "./helpers";
import { trackConsoleErrors, trackServerErrors } from "./helpers/console-errors";

test.describe.configure({ timeout: 120_000 });

// =============================================================================
// HELPERS (to be implemented)
// =============================================================================

/**
 * HELPER: createExpeditionAndAdvanceTo(page, targetPhase)
 *
 * Creates a new expedition and advances through phases sequentially until
 * reaching `targetPhase`. This is a prerequisite for many tests below.
 *
 * Implementation steps:
 * 1. Navigate to /en/expeditions
 * 2. Click "Start Expedition" / "Nova Expedicao"
 * 3. Fill Phase 1 form (name, destination "London", origin "Sao Paulo",
 *    dates: tomorrow + 7 days, birthDate: 1990-01-15)
 * 4. Submit Phase 1 -> advance to Phase 2
 * 5. Fill Phase 2 form (traveler type: "solo", pace: "moderate")
 * 6. Submit Phase 2 -> advance to Phase 3
 * 7. If targetPhase > 3: advance from Phase 3 (skip or complete checklist)
 * 8. If targetPhase > 4: advance from Phase 4 (skip logistics)
 * 9. If targetPhase > 5: generate guide in Phase 5, advance to Phase 6
 *
 * Returns: tripId extracted from URL
 *
 * IMPORTANT: Use data-testid selectors where available. Fallback to
 * getByRole/getByLabel with exact EN locale strings.
 */

/**
 * HELPER: getExpeditionTripId(page)
 *
 * Extracts tripId from the current URL.
 * Pattern: /expedition/{tripId}/phase-{N}
 * Returns: string | null
 */

/**
 * HELPER: getPhaseStatusLabel(page, phaseNumber)
 *
 * Reads the completion status label for a given phase from the progress bar.
 * Look for data-testid="phase-status-{N}" or the tooltip/title attribute
 * on the progress bar segment data-testid="progress-phase-{N}".
 *
 * Returns: "completed" | "in_progress" | "pending" | "locked" | null
 */

// =============================================================================
// P0-002: Phase 3 Checklist Completion Revert
// =============================================================================

test.describe("P0-002: Phase 3 checklist completion revert", () => {
  /**
   * SCENARIO: E2E-002-01
   * Check all Phase 3 mandatory items -> verify status is "Concluida"
   *
   * Preconditions:
   * - Fresh user registered via registerAndLogin()
   * - Expedition created and advanced to Phase 3
   * - Phase 3 has mandatory checklist items (generated from trip type)
   *
   * Steps:
   * 1. Register new user and create expedition (advance to Phase 3)
   * 2. On Phase 3, wait for checklist to render
   *    - Selector: [data-testid="checklist-section"] or similar
   * 3. Identify all mandatory checklist items
   *    - Selector: [data-testid^="checklist-item-"][data-required="true"]
   *    - Alternative: checkboxes within a "Required" section
   * 4. Click each unchecked mandatory item to check it
   *    - Wait for each toggle to complete (network request)
   *    - Verify checkbox state changes to checked
   * 5. After all mandatory items are checked, verify:
   *    - Phase 3 status label shows "Concluida" (PT) or "Completed" (EN)
   *    - Progress bar segment for Phase 3 has gold/completed styling
   *    - data-testid="progress-phase-3" has aria-label containing "completed"
   *
   * Expected: Status label transitions to "Concluida"/"Completed"
   * Console errors: 0
   * Server errors: 0
   */
  test("checking all mandatory items marks Phase 3 as completed", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using steps above
    // const { email, password } = await registerAndLogin(page);
    // ... create expedition, advance to Phase 3 ...
    // ... check all mandatory items ...
    // ... assert "Concluida" or "Completed" status ...

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });

  /**
   * SCENARIO: E2E-002-02
   * Uncheck one mandatory item -> verify status reverts to "Em andamento"
   *
   * Preconditions:
   * - Continuation of E2E-002-01 state (all mandatory items checked)
   * - OR: fresh user with expedition at Phase 3, all items checked
   *
   * Steps:
   * 1. From Phase 3 with all mandatory items checked (status "Concluida")
   * 2. Uncheck ONE mandatory checklist item
   *    - Click the first checked mandatory item
   *    - Wait for toggle to complete (network request)
   * 3. Verify immediately after uncheck:
   *    - Phase 3 status label shows "Em andamento" (PT) or "In Progress" (EN)
   *    - Progress bar segment for Phase 3 does NOT have gold/completed styling
   *    - The unchecked item's checkbox is visually unchecked
   * 4. Verify the change persists:
   *    - Reload the page
   *    - Verify the item is still unchecked
   *    - Verify status is still "Em andamento"/"In Progress"
   *
   * Expected: Status reverts from "Concluida" to "Em andamento" immediately
   * Console errors: 0
   * Server errors: 0
   *
   * KNOWN RISK: This test depends on P0-002 being fixed. Before the fix,
   * the status does NOT revert — it remains "Concluida" even with unchecked items.
   */
  test("unchecking one mandatory item reverts Phase 3 to in_progress", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using steps above

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });
});

// =============================================================================
// P0-003: Phase 4 Completion Without Data
// =============================================================================

test.describe("P0-003: Phase 4 must NOT be marked complete without data", () => {
  /**
   * SCENARIO: E2E-003-01
   * Advance through Phase 4 without adding transport or accommodation data
   * -> verify Phase 4 is NOT marked as "Concluida"
   *
   * Preconditions:
   * - Fresh user registered via registerAndLogin()
   * - Expedition created and advanced to Phase 4
   * - No transport segments or accommodations added
   *
   * Steps:
   * 1. Register new user, create expedition, advance to Phase 4
   * 2. On Phase 4 (A Logistica), do NOT fill any transport or accommodation data
   * 3. Click "Proximo" / "Next" / "Skip" to advance past Phase 4
   *    - Note: Phase 4 is non-blocking, so advance should be allowed
   * 4. After advancing to Phase 5, go back and check Phase 4 status:
   *    - Navigate to progress bar
   *    - Check data-testid="progress-phase-4" state
   * 5. Verify:
   *    - Phase 4 segment does NOT show gold/completed styling
   *    - Phase 4 status is "pending" or "available", NOT "completed"
   *    - The completion engine evaluatePhase4() with 0 transport + 0 accommodation
   *      returns "pending"
   *
   * Expected: Phase 4 remains "pending" when no logistics data is present
   * Console errors: 0
   * Server errors: 0
   *
   * KNOWN RISK: Before P0-003 fix, advancing from Phase 4 incorrectly
   * sets the ExpeditionPhase status to "COMPLETED" in the DB regardless
   * of actual data presence. The completion engine is correct but the
   * DB status may not reflect it.
   */
  test("Phase 4 without transport/accommodation is NOT completed", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using steps above

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });
});

// =============================================================================
// P0-004: Phase 6 Auto-Generation
// =============================================================================

test.describe("P0-004: Phase 6 auto-generation on first visit", () => {
  /**
   * SCENARIO: E2E-004-01
   * First visit to Phase 6 triggers itinerary auto-generation
   *
   * Preconditions:
   * - Fresh user registered via registerAndLogin()
   * - Expedition fully advanced to Phase 6 (phases 1-5 completed/advanced)
   * - No existing itinerary for this trip
   *
   * Steps:
   * 1. Register new user, create expedition, advance through phases 1-5
   *    - Phase 1: fill all required data
   *    - Phase 2: select traveler type
   *    - Phase 3: skip or complete checklist
   *    - Phase 4: skip (non-blocking)
   *    - Phase 5: generate destination guide
   * 2. Advance to Phase 6
   * 3. On Phase 6, verify auto-generation triggers:
   *    - Look for generation indicator:
   *      - data-testid="itinerary-generating" skeleton/spinner
   *      - OR a loading state with "Generating itinerary" / "Gerando roteiro" text
   *    - Wait for generation to complete (up to 60s for AI generation)
   * 4. After generation completes, verify:
   *    - At least 1 itinerary day is visible
   *    - data-testid="itinerary-day-1" or similar exists
   *    - No error state is shown
   *
   * Expected: Itinerary generation starts automatically, produces at least 1 day
   * Console errors: 0
   * Server errors: 0
   *
   * KNOWN RISK:
   * - AI generation may timeout on staging (cold start + Anthropic API latency)
   * - Flaky: depends on AI provider availability
   * - Mitigation: 60s timeout for generation, retry once on failure
   */
  test("first visit to Phase 6 starts itinerary generation", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using steps above

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });
});

// =============================================================================
// P0-005: Progress Bar Phase Skip Blocking
// =============================================================================

test.describe("P0-005: Progress bar prevents skipping to locked phases", () => {
  /**
   * SCENARIO: E2E-005-01
   * On Phase 3 (incomplete), clicking Phase 6 in progress bar should NOT navigate
   *
   * Preconditions:
   * - Fresh user or TEST_USER with expedition at Phase 3
   * - Phases 1 and 2 completed, Phase 3 is current
   * - Phase 6 is locked (not completed, not current, not non-blocking)
   *
   * Steps:
   * 1. Login and navigate to Phase 3 of an expedition
   * 2. Verify progress bar is visible
   *    - data-testid="unified-progress-bar" is present
   * 3. Check Phase 6 segment state:
   *    - data-testid="progress-phase-6" should have "locked" state
   *    - It should be a <span> (not clickable) OR a disabled <button>
   *    - It should have dashed border / gray styling per SPEC-UX-019
   * 4. Attempt to click Phase 6 segment
   * 5. Verify:
   *    - URL does NOT change to /phase-6
   *    - URL remains on /phase-3
   *    - No navigation occurs
   *    - No console errors
   *
   * Expected: Phase 6 is not navigable from Phase 3
   * Console errors: 0
   * Server errors: 0
   */
  test("locked Phase 6 is not clickable from Phase 3", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using steps above

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });
});

// =============================================================================
// Full Expedition Flow: All 6 Phases -> Expedition Complete
// =============================================================================

test.describe("Full expedition flow: 6 phases to completion", () => {
  /**
   * SCENARIO: E2E-FULL-01
   * Complete all 6 phases sequentially -> expedition marked as COMPLETED
   *
   * This is the highest-value E2E test in the suite. It validates the
   * entire critical path of the product.
   *
   * Preconditions:
   * - Fresh user registered via registerAndLogin()
   * - No existing expeditions
   *
   * Steps:
   *
   * PHASE 1 — O Explorador:
   * 1. Navigate to /en/expeditions
   * 2. Click "Start Expedition" / "Nova Expedicao"
   * 3. Fill profile fields (if shown):
   *    - Name: "Sprint32 Test User"
   *    - Birth date: 1990-01-15
   * 4. Click "Next" to advance to destination step
   * 5. Fill destination: "London" (select from autocomplete dropdown)
   * 6. Fill origin: "Sao Paulo" (select from autocomplete dropdown)
   * 7. Fill start date: tomorrow
   * 8. Fill end date: tomorrow + 7 days
   * 9. Submit Phase 1
   * 10. Verify: URL changes to /phase-2, no errors
   *
   * PHASE 2 — O Perfil:
   * 11. On Phase 2, select traveler type (e.g., "Solo")
   * 12. Optionally fill pace and budget
   * 13. Submit Phase 2
   * 14. Verify: URL changes to /phase-3, no errors
   *     (This is P0-001 — Phase 2->3 transition MUST work)
   *
   * PHASE 3 — O Preparo:
   * 15. On Phase 3, checklist items should be visible
   * 16. Check ALL mandatory checklist items
   *     - Iterate through [data-required="true"] items
   *     - Click each to toggle checked state
   *     - Wait for server confirmation after each toggle
   * 17. Click "Proximo" / "Next" to advance
   * 18. Verify: URL changes to /phase-4, no errors
   *
   * PHASE 4 — A Logistica:
   * 19. On Phase 4, add at least one transport segment:
   *     - Type: "flight"
   *     - From: "GRU"
   *     - To: "LHR"
   *     - Date: start date
   * 20. Submit / advance to Phase 5
   * 21. Verify: URL changes to /phase-5, no errors
   *
   * PHASE 5 — Guia do Destino:
   * 22. On Phase 5, click "Generate Guide" / "Gerar Guia"
   * 23. Wait for AI generation (up to 60s)
   * 24. Verify guide content is displayed
   * 25. Click "Proximo" / "Next" to advance
   * 26. Verify: URL changes to /phase-6, no errors
   *     (This is P0-001 — Phase 5->6 transition MUST work)
   *
   * PHASE 6 — O Roteiro:
   * 27. On Phase 6, auto-generation should start (P0-004)
   * 28. Wait for itinerary generation (up to 60s)
   * 29. Verify at least 1 itinerary day is visible
   * 30. Click "Complete Expedition" / "Concluir Expedicao"
   *
   * VERIFICATION:
   * 31. Verify expedition status is "COMPLETED":
   *     - Check for success toast / completion animation
   *     - Navigate to /expeditions
   *     - Verify expedition card shows "Concluida" badge
   * 32. Verify all 6 progress bar segments show completed state (gold/checkmark)
   *
   * Expected:
   * - All 6 transitions succeed without error screens
   * - Expedition is marked COMPLETED
   * - All progress bar segments show "completed"
   *
   * Console errors: 0
   * Server errors: 0
   *
   * KNOWN RISKS:
   * - Test duration: ~3-5 minutes due to AI generation in Phases 5 and 6
   * - AI provider availability: flaky on staging
   * - Autocomplete availability: depends on Mapbox/Nominatim
   * - Mitigation: generous timeouts, retry logic for AI steps
   *
   * TIMEOUT: 300_000 (5 minutes)
   */
  test("complete 6-phase expedition end to end", async ({ page }) => {
    test.setTimeout(300_000);
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using the 32-step plan above

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });
});

// =============================================================================
// P0-006: Back Navigation Then Forward (covered in phase-navigation.e2e.spec.ts
// but duplicated here for completeness)
// =============================================================================

test.describe("P0-006: Back navigation then forward 2->3", () => {
  /**
   * SCENARIO: E2E-006-01
   * Navigate backwards 6->5->4->3->2, then forward 2->3
   *
   * Preconditions:
   * - User with expedition advanced to Phase 6 (all phases accessible)
   * - All phases 1-5 completed
   *
   * Steps:
   * 1. Login and navigate to Phase 6 of an advanced expedition
   * 2. Click "Voltar" / "Back" button to go to Phase 5
   *    - Verify URL changes to /phase-5
   * 3. Click "Voltar" to go to Phase 4
   *    - Verify URL changes to /phase-4
   * 4. Click "Voltar" to go to Phase 3
   *    - Verify URL changes to /phase-3
   * 5. Click "Voltar" to go to Phase 2
   *    - Verify URL changes to /phase-2
   * 6. NOW: Click "Proximo" / "Next" to advance from Phase 2 to Phase 3
   * 7. Verify:
   *    - URL changes to /phase-3 (NOT an error page)
   *    - No "Algo deu errado" error screen
   *    - Phase 3 content renders correctly
   *    - No console errors
   *
   * Expected: Forward navigation 2->3 works after back-traversal
   * Console errors: 0
   * Server errors: 0
   *
   * KNOWN RISK: This is the exact P0-006 bug. Before the fix, the forward
   * navigation 2->3 after back-traversal throws an error.
   */
  test("forward 2->3 succeeds after back-navigation from Phase 6", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const serverErrors = trackServerErrors(page);

    // TODO: Implement using steps above

    test.skip(true, "Awaiting implementation — see spec above");
    expect(errors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });
});
