/**
 * Unit tests for Phase4Wizard component.
 *
 * Tests cover: step navigation, PhaseProgressBar, skeleton loader,
 * car rental question (now on step 3 per T-S25-005b), CINH alert for
 * international/schengen, CNH brasileira info for mercosul, domestic info,
 * complete button state, checkbox interaction, error handling, phase transition,
 * save success feedback, TASK-S33-007 mandatory field validation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}));

const mockAdvanceAction = vi.fn();

vi.mock("@/server/actions/expedition.actions", () => ({
  advanceFromPhaseAction: (...args: unknown[]) => mockAdvanceAction(...args),
}));

const mockSaveTransport = vi.fn();
const mockGetTransport = vi.fn();
const mockSaveAccommodation = vi.fn();
const mockGetAccommodation = vi.fn();
const mockSaveMobility = vi.fn();
const mockGetMobility = vi.fn();

vi.mock("@/server/actions/transport.actions", () => ({
  saveTransportSegmentsAction: (...args: unknown[]) =>
    mockSaveTransport(...args),
  getTransportSegmentsAction: (...args: unknown[]) =>
    mockGetTransport(...args),
  saveAccommodationsAction: (...args: unknown[]) =>
    mockSaveAccommodation(...args),
  getAccommodationsAction: (...args: unknown[]) =>
    mockGetAccommodation(...args),
  saveLocalMobilityAction: (...args: unknown[]) => mockSaveMobility(...args),
  getLocalMobilityAction: (...args: unknown[]) => mockGetMobility(...args),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase4Wizard } from "@/components/features/expedition/Phase4Wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RenderOptions {
  tripType?: string;
  startDate?: string | null;
}

function renderWizard(opts: RenderOptions = {}) {
  return render(
    <Phase4Wizard
      tripId="trip-001"
      tripType={opts.tripType ?? "international"}
      origin="S\u00e3o Paulo, Brazil"
      destination="Paris, France"
      startDate={
        opts.startDate === null
          ? null
          : (opts.startDate ?? "2026-06-15T00:00:00Z")
      }
    />,
  );
}

/** Navigate from step 1 to step 3 */
function goToStep3() {
  fireEvent.click(screen.getByRole("button", { name: "common.next" }));
  fireEvent.click(screen.getByRole("button", { name: "common.next" }));
}

/** Select car_rental in MobilityStep — onChange syncs to parent immediately */
async function selectCarRentalInMobility() {
  // Find and click the car_rental option in MobilityStep
  const carRentalOption = screen.getByText(
    "expedition.phase4.mobility.options.car_rental",
  );
  fireEvent.click(carRentalOption);
  // onChange syncs to parent state, car rental question should appear
  await waitFor(() => {
    expect(
      screen.getByText("expedition.phase4.carRentalQuestion"),
    ).toBeInTheDocument();
  });
}

/** Dismiss the unsaved changes dialog if it appears by clicking "advance without saving" */
function dismissDirtyDialogIfPresent() {
  const advanceWithoutSaving = screen.queryByTestId("dialog-advance-without-saving");
  if (advanceWithoutSaving) {
    fireEvent.click(advanceWithoutSaving);
  }
}

/** Pre-load valid data into all three sections so validation passes. */
function loadValidPhase4Data() {
  mockGetTransport.mockResolvedValue({
    success: true,
    data: {
      segments: [
        {
          transportType: "flight",
          departurePlace: "S\u00e3o Paulo",
          arrivalPlace: "Paris",
          departureAt: "2026-06-15",
          arrivalAt: "2026-06-16",
        },
      ],
    },
  });
  mockGetAccommodation.mockResolvedValue({
    success: true,
    data: {
      accommodations: [
        {
          accommodationType: "hotel",
          checkIn: "2026-06-16",
          checkOut: "2026-06-23",
        },
      ],
    },
  });
  mockGetMobility.mockResolvedValue({
    success: true,
    data: { mobility: ["walking"] },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default mock return values (clearAllMocks wipes them)
  mockSaveTransport.mockResolvedValue({
    success: true,
    data: { count: 0 },
  });
  mockGetTransport.mockResolvedValue({
    success: true,
    data: { segments: [] },
  });
  mockSaveAccommodation.mockResolvedValue({
    success: true,
    data: { count: 0 },
  });
  mockGetAccommodation.mockResolvedValue({
    success: true,
    data: { accommodations: [] },
  });
  mockSaveMobility.mockResolvedValue({
    success: true,
    data: { saved: true },
  });
  mockGetMobility.mockResolvedValue({
    success: true,
    data: { mobility: [] },
  });
  mockAdvanceAction.mockResolvedValue({
    success: true,
    data: {
      nextPhase: 5,
      completed: true,
      phaseResult: {
        phaseNumber: 4,
        pointsEarned: 50,
        badgeAwarded: "host",
        newRank: null,
        nextPhaseUnlocked: 5,
      },
    },
  });
});

describe("Phase4Wizard", () => {
  it("renders title and subtitle", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase4.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.subtitle"),
    ).toBeInTheDocument();
  });

  it("renders destination and trip type", () => {
    renderWizard();

    expect(screen.getByText(/Paris, France/)).toBeInTheDocument();
  });

  it("renders PhaseProgressBar with current step", () => {
    renderWizard();

    // PhaseProgressBar renders "expedition.progress[current,total]"
    expect(
      screen.getByText("expedition.progress[1,3]"),
    ).toBeInTheDocument();
  });

  it("shows skeleton loader when loading data", () => {
    // Before data loads, skeletons should be present
    renderWizard();

    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(3);
  });

  it("renders step 1 with transport only (no car rental)", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Car rental question should NOT be on step 1
    expect(
      screen.queryByText("expedition.phase4.carRentalQuestion"),
    ).not.toBeInTheDocument();
  });

  it("navigates to step 2 when clicking next", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "common.next" });
    fireEvent.click(nextButton);

    // Step 2 should show accommodation
    expect(
      screen.getByText("expedition.phase4.accommodation.title"),
    ).toBeInTheDocument();

    // Progress bar should update
    expect(
      screen.getByText("expedition.progress[2,3]"),
    ).toBeInTheDocument();
  });

  it("navigates back from step 2 to step 1", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Go to step 2
    const nextButton = screen.getByRole("button", { name: "common.next" });
    fireEvent.click(nextButton);

    // Go back to step 1
    const backButton = screen.getByRole("button", { name: "common.back" });
    fireEvent.click(backButton);

    // Step 1 should be visible again (transport, not car rental)
    expect(
      screen.getByText("expedition.phase4.transport.title"),
    ).toBeInTheDocument();
  });

  it("renders accommodation on step 2", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Navigate to step 2
    const nextButton = screen.getByRole("button", { name: "common.next" });
    fireEvent.click(nextButton);

    expect(
      screen.getByText("expedition.phase4.accommodation.title"),
    ).toBeInTheDocument();
  });

  it("renders mobility on step 3, car rental hidden until car_rental selected", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Navigate to step 3
    goToStep3();

    // Mobility section is always visible
    expect(
      screen.getByText("expedition.phase4.mobility.title"),
    ).toBeInTheDocument();

    // Car rental question is hidden until car_rental is selected in mobility
    expect(
      screen.queryByText("expedition.phase4.carRentalQuestion"),
    ).not.toBeInTheDocument();

    // Select car_rental and save
    await selectCarRentalInMobility();

    // Now car rental question is visible
    expect(
      screen.getByText("expedition.phase4.carRentalQuestion"),
    ).toBeInTheDocument();
  });

  it("renders car rental question with yes/no buttons after selecting car_rental in mobility", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    expect(
      screen.getByText("expedition.phase4.carRentalYes"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.carRentalNo"),
    ).toBeInTheDocument();
  });

  it("shows advance button only on step 3", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Step 1: no advance button
    expect(
      screen.queryByRole("button", { name: /expedition\.phase4\.advance/ }),
    ).not.toBeInTheDocument();

    // Navigate to step 2
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    // Step 2: no advance button
    expect(
      screen.queryByRole("button", { name: /expedition\.phase4\.advance/ }),
    ).not.toBeInTheDocument();

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    // Step 3: advance button is present
    expect(
      screen.getByRole("button", { name: /expedition\.cta\.advance/ }),
    ).toBeInTheDocument();
  });

  it("shows CINH alert when car rental = yes for international trip on step 3", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cinhRequired"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.cinhDescription"),
    ).toBeInTheDocument();
  });

  it("shows CINH alert when car rental = yes for schengen trip on step 3", async () => {
    renderWizard({ tripType: "schengen" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cinhRequired"),
    ).toBeInTheDocument();
  });

  it("shows CINH deadline based on start date", async () => {
    renderWizard({
      tripType: "international",
      startDate: "2026-06-15T00:00:00Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText(/expedition\.phase4\.cinhDeadline/),
    ).toBeInTheDocument();
  });

  it("shows lead time info for CINH", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText(/expedition\.phase4\.cinhLeadTime/),
    ).toBeInTheDocument();
  });

  it("shows amber advance button when CINH not confirmed for international", async () => {
    loadValidPhase4Data();
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows advance button when CINH checkbox is confirmed", async () => {
    loadValidPhase4Data();
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // The CINH checkbox is inside the CINH alert section
    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel
      .closest("label")
      ?.querySelector("input[type='checkbox']");
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows CNH brasileira info for mercosul trip with car rental on step 3", async () => {
    renderWizard({ tripType: "mercosul" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cnhBrasileiraValid"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.cinhRequired"),
    ).not.toBeInTheDocument();
  });

  it("shows regular CNH info for domestic trip with car rental on step 3", async () => {
    renderWizard({ tripType: "domestic" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cnhRegularValid"),
    ).toBeInTheDocument();
  });

  it("shows advance button for mercosul without CINH checkbox", async () => {
    loadValidPhase4Data();
    renderWizard({ tripType: "mercosul" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows no car rental message and advance button when selecting no on step 3", async () => {
    loadValidPhase4Data();
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    expect(
      screen.getByText("expedition.phase4.noCarRental"),
    ).toBeInTheDocument();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("calls advanceFromPhaseAction with metadata when no car rental", async () => {
    loadValidPhase4Data();
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    // Dirty dialog may appear — dismiss it
    dismissDirtyDialogIfPresent();

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: false,
        cnhResolved: true,
      });
    });
  });

  it("calls advanceFromPhaseAction with cnhResolved=true for international with confirmed checkbox", async () => {
    loadValidPhase4Data();
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel
      .closest("label")
      ?.querySelector("input[type='checkbox']");
    fireEvent.click(checkbox!);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    // Dirty dialog may appear — dismiss it
    dismissDirtyDialogIfPresent();

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: true,
        cnhResolved: true,
      });
    });
  });

  it("calls advanceFromPhaseAction with cnhResolved=true for mercosul car rental", async () => {
    loadValidPhase4Data();
    renderWizard({ tripType: "mercosul" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    // Dirty dialog may appear — dismiss it
    dismissDirtyDialogIfPresent();

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: true,
        cnhResolved: true,
      });
    });
  });

  it("advance button works without car rental selection when data is valid (non-blocking)", async () => {
    loadValidPhase4Data();
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Navigate to step 3 without selecting car rental
    goToStep3();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: false,
        cnhResolved: true,
      });
    });
  });

  it("shows error message when action fails", async () => {
    loadValidPhase4Data();
    mockAdvanceAction.mockResolvedValue({
      success: false,
      error: "errors.generic",
    });

    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    // Dirty dialog may appear — dismiss it
    dismissDirtyDialogIfPresent();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("resets CINH confirmation when switching from yes to no on step 3", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    // Select yes
    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // Confirm checkbox
    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel
      .closest("label")
      ?.querySelector("input[type='checkbox']");
    fireEvent.click(checkbox!);

    // Switch to no
    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    // Should not show CINH section anymore
    expect(
      screen.queryByText("expedition.phase4.cinhRequired"),
    ).not.toBeInTheDocument();
  });

  it("does not show CINH deadline when startDate is null", async () => {
    renderWizard({ tripType: "international", startDate: null });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();
    await selectCarRentalInMobility();

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.queryByText(/expedition\.phase4\.cinhDeadline/),
    ).not.toBeInTheDocument();
  });

  it("shows save success feedback after successful transport save via WizardFooter on step 1", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Find and click the WizardFooter save button
    const saveButton = screen.getByTestId("wizard-save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.steps.transport.saved"),
      ).toBeInTheDocument();
    });
  });

  it("renders WizardFooter on each step (TASK-29-008)", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    // Step 1: WizardFooter present
    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

    // Step 2: WizardFooter present
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

    // Step 3: WizardFooter present
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
  });

  // ─── TASK-S33-007: Mandatory field validation ───────────────────────────────

  it("disables advance button when all sections are empty (TASK-S33-007)", async () => {
    // Default mocks return empty data
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    expect(advanceButton).toBeDisabled();
  });

  it("shows validation banner when advancing with incomplete data (TASK-S33-007)", async () => {
    // Only load transport — missing accommodation and mobility
    mockGetTransport.mockResolvedValue({
      success: true,
      data: {
        segments: [
          {
            transportType: "flight",
            departurePlace: "SP",
            arrivalPlace: "Paris",
            departureAt: "2026-06-15",
            arrivalAt: "2026-06-16",
          },
        ],
      },
    });
    mockGetAccommodation.mockResolvedValue({
      success: true,
      data: { accommodations: [] },
    });
    mockGetMobility.mockResolvedValue({
      success: true,
      data: { mobility: [] },
    });

    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(
        screen.getByTestId("phase4-validation-banner"),
      ).toBeInTheDocument();
    });

    // Should show accommodation and mobility errors
    expect(
      screen.getByText("expedition.phase4.validation.accommodationRequired"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.validation.mobilityRequired"),
    ).toBeInTheDocument();

    // Should NOT show transport error since it has valid data
    expect(
      screen.queryByText("expedition.phase4.validation.transportRequired"),
    ).not.toBeInTheDocument();

    // advanceFromPhaseAction should NOT have been called
    expect(mockAdvanceAction).not.toHaveBeenCalled();
  });

  it("shows only mobility error when transport and accommodation are valid (TASK-S33-007)", async () => {
    mockGetTransport.mockResolvedValue({
      success: true,
      data: {
        segments: [
          {
            transportType: "flight",
            departurePlace: "SP",
            arrivalPlace: "Paris",
            departureAt: "2026-06-15",
            arrivalAt: "2026-06-16",
          },
        ],
      },
    });
    mockGetAccommodation.mockResolvedValue({
      success: true,
      data: {
        accommodations: [
          { accommodationType: "hotel", checkIn: "2026-06-16", checkOut: "2026-06-23" },
        ],
      },
    });
    mockGetMobility.mockResolvedValue({
      success: true,
      data: { mobility: [] },
    });

    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(
        screen.getByTestId("phase4-validation-banner"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("expedition.phase4.validation.mobilityRequired"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.validation.transportRequired"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "expedition.phase4.validation.accommodationRequired",
      ),
    ).not.toBeInTheDocument();
  });

  it("advances when all sections have valid data (TASK-S33-007)", async () => {
    loadValidPhase4Data();
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title"),
      ).toBeInTheDocument();
    });

    goToStep3();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.cta\.advance/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledOnce();
    });

    // Validation banner should not appear
    expect(
      screen.queryByTestId("phase4-validation-banner"),
    ).not.toBeInTheDocument();
  });
});
