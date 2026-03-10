/**
 * Unit tests for Phase4Wizard component.
 *
 * Tests cover: car rental question, CINH alert for international/schengen,
 * CNH brasileira info for mercosul, domestic info, complete button state,
 * checkbox interaction, error handling, phase transition, and tabbed layout.
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

vi.mock("@/server/actions/transport.actions", () => ({
  saveTransportSegmentsAction: vi.fn().mockResolvedValue({ success: true, data: { count: 0 } }),
  getTransportSegmentsAction: vi.fn().mockResolvedValue({ success: true, data: { segments: [] } }),
  saveAccommodationsAction: vi.fn().mockResolvedValue({ success: true, data: { count: 0 } }),
  getAccommodationsAction: vi.fn().mockResolvedValue({ success: true, data: { accommodations: [] } }),
  saveLocalMobilityAction: vi.fn().mockResolvedValue({ success: true, data: { saved: true } }),
  getLocalMobilityAction: vi.fn().mockResolvedValue({ success: true, data: { mobility: [] } }),
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

  it("renders car rental question with yes/no buttons", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase4.carRentalQuestion")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.carRentalYes")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.carRentalNo")
    ).toBeInTheDocument();
  });

  it("renders tabbed sections (transport, accommodation, mobility)", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "expedition.phase4.tabs.transport" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: "expedition.phase4.tabs.accommodation" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: "expedition.phase4.tabs.mobility" })
      ).toBeInTheDocument();
    });
  });

  it("shows transport tab content by default", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByText("expedition.phase4.transport.title")
      ).toBeInTheDocument();
    });
  });

  it("switches to accommodation tab when clicked", async () => {
    renderWizard();

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "expedition.phase4.tabs.accommodation" })
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("tab", { name: "expedition.phase4.tabs.accommodation" })
    );

    expect(
      screen.getByText("expedition.phase4.accommodation.title")
    ).toBeInTheDocument();
  });

  it("shows advance button even before answering car rental question", () => {
    renderWizard();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advancePending/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows CINH alert when car rental = yes for international trip", () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cinhRequired")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.cinhDescription")
    ).toBeInTheDocument();
  });

  it("shows CINH alert when car rental = yes for schengen trip", () => {
    renderWizard({ tripType: "schengen" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cinhRequired")
    ).toBeInTheDocument();
  });

  it("shows CINH deadline based on start date", () => {
    renderWizard({ tripType: "international", startDate: "2026-06-15T00:00:00Z" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText(/expedition\.phase4\.cinhDeadline/)
    ).toBeInTheDocument();
  });

  it("shows lead time info for CINH", () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText(/expedition\.phase4\.cinhLeadTime/)
    ).toBeInTheDocument();
  });

  it("shows amber advance button when CINH not confirmed for international", () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advancePartial/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows gold advanceComplete button when CINH checkbox is confirmed", () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    // The CINH checkbox is inside the CINH alert section — find it by label text
    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel.closest("label")?.querySelector("input[type='checkbox']");
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows CNH brasileira info for mercosul trip with car rental", () => {
    renderWizard({ tripType: "mercosul" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cnhBrasileiraValid")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.cinhRequired")
    ).not.toBeInTheDocument();
  });

  it("shows regular CNH info for domestic trip with car rental", () => {
    renderWizard({ tripType: "domestic" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.getByText("expedition.phase4.cnhRegularValid")
    ).toBeInTheDocument();
  });

  it("shows advanceComplete for mercosul without CINH checkbox", () => {
    renderWizard({ tripType: "mercosul" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("shows no car rental message and advanceComplete when selecting no", () => {
    renderWizard();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    expect(
      screen.getByText("expedition.phase4.noCarRental")
    ).toBeInTheDocument();

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    expect(advanceButton).not.toBeDisabled();
  });

  it("calls advanceFromPhaseAction with metadata when no car rental", async () => {
    renderWizard();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

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

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const cinhLabel = screen.getByText("expedition.phase4.cinhConfirm");
    const checkbox = cinhLabel.closest("label")?.querySelector("input[type='checkbox']");
    fireEvent.click(checkbox!);

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

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

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

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    const advanceButton = screen.getByRole("button", {
      name: /expedition\.phase4\.advanceComplete/,
    });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("resets CINH confirmation when switching from yes to no", () => {
    renderWizard({ tripType: "international" });

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

  it("does not show CINH deadline when startDate is null", () => {
    renderWizard({ tripType: "international", startDate: null });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    expect(
      screen.queryByText(/expedition\.phase4\.cinhDeadline/)
    ).not.toBeInTheDocument();
  });
});
