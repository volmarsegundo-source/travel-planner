/**
 * Unit tests for Phase5Wizard component.
 *
 * Tests cover: rendering connectivity options, region display, selection,
 * recommended badge, costs, complete button state, action calls, error handling.
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
  completePhase5Action: (...args: unknown[]) => mockCompleteAction(...args),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase5Wizard } from "@/components/features/expedition/Phase5Wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_PLANS = [
  { option: "chip_local" as const, costPerWeekUSD: 12, recommended: false },
  { option: "esim" as const, costPerWeekUSD: 18, recommended: true },
  { option: "roaming" as const, costPerWeekUSD: 80, recommended: false },
  { option: "wifi_only" as const, costPerWeekUSD: 0, recommended: false },
];

function renderWizard(region = "europe") {
  return render(
    <Phase5Wizard
      tripId="trip-001"
      region={region}
      destination="Paris, France"
      plans={MOCK_PLANS}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCompleteAction.mockResolvedValue({
    success: true,
    data: {
      phaseNumber: 5,
      pointsEarned: 40,
      badgeAwarded: null,
      newRank: "cartographer",
      nextPhaseUnlocked: 6,
    },
  });
});

describe("Phase5Wizard", () => {
  it("renders title and subtitle", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase5.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.subtitle")
    ).toBeInTheDocument();
  });

  it("renders destination and region", () => {
    renderWizard();

    expect(screen.getByText(/Paris, France/)).toBeInTheDocument();
  });

  it("renders all four connectivity options", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase5.options.chip_local")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.options.esim")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.options.roaming")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.options.wifi_only")
    ).toBeInTheDocument();
  });

  it("shows recommended badge on recommended option", () => {
    renderWizard();

    const badges = screen.getAllByText("expedition.phase5.recommended");
    // Only eSIM is recommended in MOCK_PLANS
    expect(badges).toHaveLength(1);
  });

  it("shows costs for paid options", () => {
    renderWizard();

    expect(screen.getByText("$12")).toBeInTheDocument();
    expect(screen.getByText("$18")).toBeInTheDocument();
    expect(screen.getByText("$80")).toBeInTheDocument();
  });

  it("shows free label for wifi_only", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase5.free")
    ).toBeInTheDocument();
  });

  it("shows descriptions for all options", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase5.descriptions.chip_local")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.descriptions.esim")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.descriptions.roaming")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.descriptions.wifi_only")
    ).toBeInTheDocument();
  });

  it("disables complete button when no option is selected", () => {
    renderWizard();

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase5\.ctaDisabled/,
    });
    expect(completeButton).toBeDisabled();
  });

  it("enables complete button when an option is selected", () => {
    renderWizard();

    const esimButton = screen.getByText("expedition.phase5.options.esim")
      .closest("button")!;
    fireEvent.click(esimButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase5\.cta/,
    });
    expect(completeButton).not.toBeDisabled();
  });

  it("highlights selected option with aria-pressed", () => {
    renderWizard();

    const esimButton = screen.getByText("expedition.phase5.options.esim")
      .closest("button")!;
    fireEvent.click(esimButton);

    expect(esimButton).toHaveAttribute("aria-pressed", "true");
  });

  it("calls completePhase5Action with selected option and region", async () => {
    renderWizard("europe");

    const esimButton = screen.getByText("expedition.phase5.options.esim")
      .closest("button")!;
    fireEvent.click(esimButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase5\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteAction).toHaveBeenCalledWith("trip-001", {
        connectivityChoice: "esim",
        region: "europe",
      });
    });
  });

  it("calls action with chip_local when selected", async () => {
    renderWizard();

    const chipButton = screen.getByText("expedition.phase5.options.chip_local")
      .closest("button")!;
    fireEvent.click(chipButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase5\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteAction).toHaveBeenCalledWith("trip-001", {
        connectivityChoice: "chip_local",
        region: "europe",
      });
    });
  });

  it("shows error message when action fails", async () => {
    mockCompleteAction.mockResolvedValue({
      success: false,
      error: "errors.generic",
    });

    renderWizard();

    const esimButton = screen.getByText("expedition.phase5.options.esim")
      .closest("button")!;
    fireEvent.click(esimButton);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase5\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("allows changing selection between options", () => {
    renderWizard();

    // Select eSIM first
    const esimButton = screen.getByText("expedition.phase5.options.esim")
      .closest("button")!;
    fireEvent.click(esimButton);
    expect(esimButton).toHaveAttribute("aria-pressed", "true");

    // Switch to roaming
    const roamingButton = screen.getByText("expedition.phase5.options.roaming")
      .closest("button")!;
    fireEvent.click(roamingButton);
    expect(roamingButton).toHaveAttribute("aria-pressed", "true");
    expect(esimButton).toHaveAttribute("aria-pressed", "false");
  });

  it("shows per-week label for paid options", () => {
    renderWizard();

    // 3 paid options (chip_local, esim, roaming) should have /week labels
    const weekLabels = screen.getAllByText("expedition.phase5.perWeek");
    expect(weekLabels).toHaveLength(3);
  });
});
