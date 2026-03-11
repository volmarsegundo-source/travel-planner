/**
 * Unit tests for Phase4Wizard component.
 *
 * Tests cover: step navigation, PhaseProgressBar, skeleton loader,
 * car rental question, CINH alert for international/schengen,
 * CNH brasileira info for mercosul, domestic info, complete button state,
 * checkbox interaction, error handling, phase transition, save success feedback.
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
  Link: ({ children, ...props }: Record<string, unknown>) =>
    <a {...props}>{children as React.ReactNode}</a>,
}));

const mockAdvanceAction = vi.fn();

vi.mock("@/server/actions/expedition.actions", () => ({
  advanceFromPhaseAction: (...args: unknown[]) => mockAdvanceAction(...args),
}));

const mockSaveTransport = vi.fn().mockResolvedValue({ success: true, data: { count: 0 } });
const mockGetTransport = vi.fn().mockResolvedValue({ success: true, data: { segments: [] } });
const mockSaveAccommodation = vi.fn().mockResolvedValue({ success: true, data: { count: 0 } });
const mockGetAccommodation = vi.fn().mockResolvedValue({ success: true, data: { accommodations: [] } });
const mockSaveMobility = vi.fn().mockResolvedValue({ success: true, data: { saved: true } });
const mockGetMobility = vi.fn().mockResolvedValue({ success: true, data: { mobility: [] } });

vi.mock("@/server/actions/transport.actions", () => ({
  saveTransportSegmentsAction: (...args: unknown[]) => mockSaveTransport(...args),
  getTransportSegmentsAction: (...args: unknown[]) => mockGetTransport(...args),
  saveAccommodationsAction: (...args: unknown[]) => mockSaveAccommodation(...args),
  getAccommodationsAction: (...args: unknown[]) => mockGetAccommodation(...args),
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
      destination="Paris, France"
      startDate={
        opts.startDate === null
          ? null
          : opts.startDate ?? "2026-06-15T00:00:00Z"
      }
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
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
      screen.getByText("expedition.phase4.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.subtitle")
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
      screen.getByText("expedition.progress[1,3]")
    ).toBeInTheDocument();
  });

  it("shows skeleton loader when loading data", () => {
    // Before data loads, skeletons should be present
    renderWizard();

    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(3);
  });

  it("renders step 1 with prerequisites and transport by default", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Transport step content should be rendered on step 1
    expect(
      screen.getByText("expedition.phase4.transport.title")
    ).toBeInTheDocument();
  });

  it("renders car rental question with yes/no buttons", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("expedition.phase4.carRentalYes")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.carRentalNo")
    ).toBeInTheDocument();
  });

  it("navigates to step 2 when clicking next", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "common.next" });
    fireEvent.click(nextButton);

    // Step 2 should show accommodation
    expect(
      screen.getByText("expedition.phase4.accommodation.title")
    ).toBeInTheDocument();

    // Progress bar should update
    expect(
      screen.getByText("expedition.progress[2,3]")
    ).toBeInTheDocument();
  });

  it("navigates back from step 2 to step 1", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Go to step 2
    const nextButton = screen.getByRole("button", { name: "common.next" });
    fireEvent.click(nextButton);

    // Go back to step 1
    const backButton = screen.getByRole("button", { name: "common.back" });
    fireEvent.click(backButton);

    // Step 1 should be visible again
    expect(
      screen.getByText("expedition.phase4.carRentalQuestion")
    ).toBeInTheDocument();
  });

  it("renders accommodation on step 2", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Navigate to step 2
    const nextButton = screen.getByRole("button", { name: "common.next" });
    fireEvent.click(nextButton);

    expect(
      screen.getByText("expedition.phase4.accommodation.title")
    ).toBeInTheDocument();
  });

  it("renders mobility on step 3", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Navigate to step 2
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    expect(
      screen.getByText("expedition.phase4.mobility.title")
    ).toBeInTheDocument();
  });

  it("shows advance button only on step 3", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Step 1: no advance button
    expect(
      screen.queryByRole("button", { name: /expedition\.phase4\.advance/ })
    ).not.toBeInTheDocument();

    // Navigate to step 2
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    // Step 2: no advance button
    expect(
      screen.queryByRole("button", { name: /expedition\.phase4\.advance/ })
    ).not.toBeInTheDocument();

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    // Step 3: advance button is present
    expect(
      screen.getByRole("button", { name: /expedition\.phase4\.advancePending/ })
    ).toBeInTheDocument();
  });

  it("shows CINH alert when car rental = yes for international trip", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cinhRequired")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.cinhDescription")
    ).toBeInTheDocument();
  });

  it("shows CINH alert when car rental = yes for schengen trip", async () => {
    renderWizard({ tripType: "schengen" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cinhRequired")
    ).toBeInTheDocument();
  });

  it("shows CINH deadline based on start date", async () => {
    renderWizard({ tripType: "international", startDate: "2026-06-15T00:00:00Z" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText(/expedition\.phase4\.cinhDeadline/)
    ).toBeInTheDocument();
  });

  it("shows lead time info for CINH", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText(/expedition\.phase4\.cinhLeadTime/)
    ).toBeInTheDocument();
  });

  it("shows amber advance button when CINH not confirmed for international", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // Navigate to step 3 to see advance button
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advancePartial/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows gold advanceComplete button when CINH checkbox is confirmed", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // The CINH checkbox is inside the CINH alert section
    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel.closest("label")?.querySelector("input[type='checkbox']");
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows CNH brasileira info for mercosul trip with car rental", async () => {
    renderWizard({ tripType: "mercosul" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cnhBrasileiraValid")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.cinhRequired")
    ).not.toBeInTheDocument();
  });

  it("shows regular CNH info for domestic trip with car rental", async () => {
    renderWizard({ tripType: "domestic" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cnhRegularValid")
    ).toBeInTheDocument();
  });

  it("shows advanceComplete for mercosul without CINH checkbox", async () => {
    renderWizard({ tripType: "mercosul" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows no car rental message and advanceComplete when selecting no", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    expect(
      screen.getByText("expedition.phase4.noCarRental")
    ).toBeInTheDocument();

    // Navigate to step 3 to check advance button
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("calls advanceFromPhaseAction with metadata when no car rental", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: false,
        cnhResolved: true,
      });
    });
  });

  it("calls advanceFromPhaseAction with cnhResolved=true for international with confirmed checkbox", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel.closest("label")?.querySelector("input[type='checkbox']");
    fireEvent.click(checkbox!);

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: true,
        cnhResolved: true,
      });
    });
  });

  it("calls advanceFromPhaseAction with cnhResolved=true for mercosul car rental", async () => {
    renderWizard({ tripType: "mercosul" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(mockAdvanceAction).toHaveBeenCalledWith("trip-001", 4, {
        needsCarRental: true,
        cnhResolved: true,
      });
    });
  });

  it("advance button works without car rental selection (non-blocking)", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Navigate to step 3 without selecting car rental
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advancePending/,
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
    mockAdvanceAction.mockResolvedValue({
      success: false,
      error: "errors.generic",
    });

    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    // Navigate to step 3
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));
    fireEvent.click(screen.getByRole("button", { name: "common.next" }));

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("resets CINH confirmation when switching from yes to no", async () => {
    renderWizard({ tripType: "international" });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Select yes
    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // Confirm checkbox
    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel.closest("label")?.querySelector("input[type='checkbox']");
    fireEvent.click(checkbox!);

    // Switch to no
    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    // Should not show CINH section anymore
    expect(
      screen.queryByText("expedition.phase4.cinhRequired")
    ).not.toBeInTheDocument();
  });

  it("does not show CINH deadline when startDate is null", async () => {
    renderWizard({ tripType: "international", startDate: null });

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.queryByText(/expedition\.phase4\.cinhDeadline/)
    ).not.toBeInTheDocument();
  });

  it("shows save success feedback after successful transport save", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.carRentalQuestion")
      ).toBeInTheDocument();
    });

    // Find and click the transport save button
    const saveButton = screen.getByRole("button", {
      name: /expedition\.phase4\.transport\.save/,
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.steps.transport.saved")
      ).toBeInTheDocument();
    });
  });
});
