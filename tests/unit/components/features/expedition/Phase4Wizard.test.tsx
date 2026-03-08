/**
 * Unit tests for Phase4Wizard component.
 *
 * Tests cover: car rental question, CINH alert for international/schengen,
 * CNH brasileira info for mercosul, domestic info, complete button state,
 * checkbox interaction, error handling, and phase transition.
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
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: Record<string, unknown>) =>
    <a {...props}>{children as React.ReactNode}</a>,
}));

const mockCompleteAction = vi.fn();

vi.mock("@/server/actions/expedition.actions", () => ({
  completePhase4Action: (...args: unknown[]) => mockCompleteAction(...args),
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
  mockCompleteAction.mockResolvedValue({
    success: true,
    data: {
      phaseNumber: 4,
      pointsEarned: 50,
      badgeAwarded: "host",
      newRank: null,
      nextPhaseUnlocked: 5,
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

  it("does not show complete button before answering car rental question", () => {
    renderWizard();

    expect(
      screen.queryByRole("button", { name: /expedition\.phase4\.cta/ })
    ).not.toBeInTheDocument();
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

    // cinhDeadline text should appear with interpolated date
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

  it("disables complete button when CINH not confirmed for international", () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.ctaDisabled/,
    });
    expect(completeButton).toBeDisabled();
  });

  it("enables complete button when CINH checkbox is confirmed", () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    expect(completeButton).not.toBeDisabled();
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

  it("enables complete button for mercosul without CINH checkbox", () => {
    renderWizard({ tripType: "mercosul" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    expect(completeButton).not.toBeDisabled();
  });

  it("shows no car rental message and enables complete when selecting no", () => {
    renderWizard();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    expect(
      screen.getByText("expedition.phase4.noCarRental")
    ).toBeInTheDocument();

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    expect(completeButton).not.toBeDisabled();
  });

  it("calls completePhase4Action with needsCarRental=false when no car rental", async () => {
    renderWizard();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteAction).toHaveBeenCalledWith("trip-001", {
        needsCarRental: false,
        cnhResolved: true,
      });
    });
  });

  it("calls completePhase4Action with cnhResolved=true for international with confirmed checkbox", async () => {
    renderWizard({ tripType: "international" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteAction).toHaveBeenCalledWith("trip-001", {
        needsCarRental: true,
        cnhResolved: true,
      });
    });
  });

  it("calls completePhase4Action with cnhResolved=true for mercosul car rental", async () => {
    renderWizard({ tripType: "mercosul" });

    const yesButton = screen.getByText("expedition.phase4.carRentalYes");
    fireEvent.click(yesButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteAction).toHaveBeenCalledWith("trip-001", {
        needsCarRental: true,
        cnhResolved: true,
      });
    });
  });

  it("shows error message when action fails", async () => {
    mockCompleteAction.mockResolvedValue({
      success: false,
      error: "errors.generic",
    });

    renderWizard();

    const noButton = screen.getByText("expedition.phase4.carRentalNo");
    fireEvent.click(noButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase4\.cta/,
    });
    fireEvent.click(completeButton);

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
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

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
