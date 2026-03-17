/**
 * Unit tests for Phase2Wizard revisit behavior (TASK-29-005).
 *
 * Tests cover: pre-population of traveler type, accommodation, pace, budget,
 * currency, and passengers from saved expedition data when a user revisits Phase 2.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Global polyfills (Radix Slider uses ResizeObserver) ─────────────────────

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

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

vi.mock("server-only", () => ({}));

vi.mock("@/server/actions/expedition.actions", () => ({
  completePhase2Action: vi.fn(),
}));

vi.mock("@/server/actions/profile.actions", () => ({
  savePreferencesAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/utils/currency", () => ({
  getDefaultCurrency: () => "USD",
  formatCurrency: (amount: number, currency: string) =>
    `${currency} ${amount}`,
}));

// Mock PhaseShell as a pass-through wrapper that renders title, children, and footer
vi.mock("@/components/features/expedition/PhaseShell", () => ({
  PhaseShell: ({ children, phaseTitle, phaseSubtitle, footerProps, showFooter }: {
    children: React.ReactNode;
    phaseTitle?: string;
    phaseSubtitle?: string;
    footerProps?: { onBack?: () => void; onPrimary: () => void; primaryLabel: string; isLoading?: boolean; isDisabled?: boolean };
    showFooter?: boolean;
    [key: string]: unknown;
  }) => (
    <div data-testid="phase-shell">
      {phaseTitle && <h1>{phaseTitle}</h1>}
      {phaseSubtitle && <p>{phaseSubtitle}</p>}
      {children}
      {showFooter && footerProps && (
        <div data-testid="wizard-footer">
          {footerProps.onBack && (
            <button type="button" data-testid="wizard-back" onClick={footerProps.onBack}>
              common.back
            </button>
          )}
          <button
            type="button"
            data-testid="wizard-primary"
            onClick={footerProps.onPrimary}
            disabled={footerProps.isDisabled || footerProps.isLoading}
          >
            {footerProps.primaryLabel}
          </button>
        </div>
      )}
    </div>
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAVED_SOLO_DATA = {
  travelerType: "solo",
  accommodationStyle: "comfort",
  travelPace: 7,
  budget: 5000,
  currency: "EUR",
};

const SAVED_FAMILY_DATA = {
  travelerType: "family",
  accommodationStyle: "luxury",
  travelPace: 3,
  budget: 10000,
  currency: "BRL",
};

const SAVED_PASSENGERS = {
  adults: 2,
  children: { count: 2, ages: [5, 8] },
  seniors: 1,
  infants: 0,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase2Wizard — revisit pre-population (TASK-29-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Traveler type pre-population", () => {
    it("pre-selects traveler type from saved data", () => {
      render(
        <Phase2Wizard
          tripId="trip-revisit-1"
          savedData={SAVED_SOLO_DATA}
        />
      );

      // The VisualCardSelector renders buttons with role="radio" and aria-checked
      const soloCard = screen.getByText("expedition.phase2.step1.solo")
        .closest("[role='radio']");
      expect(soloCard).toHaveAttribute("aria-checked", "true");
    });

    it("shows no pre-selected traveler type when no saved data", () => {
      render(<Phase2Wizard tripId="trip-new-1" />);

      const soloCard = screen.getByText("expedition.phase2.step1.solo")
        .closest("[role='radio']");
      expect(soloCard).toHaveAttribute("aria-checked", "false");

      const coupleCard = screen.getByText("expedition.phase2.step1.couple")
        .closest("[role='radio']");
      expect(coupleCard).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Passengers pre-population", () => {
    it("pre-populates passenger counts from saved data for family type", () => {
      render(
        <Phase2Wizard
          tripId="trip-revisit-2"
          savedData={SAVED_FAMILY_DATA}
          savedPassengers={SAVED_PASSENGERS}
        />
      );

      // Family is pre-selected, click next to go to passengers step
      fireEvent.click(screen.getByText("common.next"));

      // Should show passengers step with saved values
      // Total = 2 adults + 2 children + 1 senior + 0 infants = 5
      expect(
        screen.getByText("expedition.phase2.passengers.total[5]")
      ).toBeInTheDocument();
    });

    it("defaults to 1 adult when no saved passengers for family type", () => {
      render(
        <Phase2Wizard
          tripId="trip-revisit-3"
          savedData={{ travelerType: "family" }}
        />
      );

      fireEvent.click(screen.getByText("common.next"));

      // Default: 1 adult only
      expect(
        screen.getByText("expedition.phase2.passengers.total[1]")
      ).toBeInTheDocument();
    });
  });

  describe("Budget and currency pre-population", () => {
    it("pre-populates budget value from saved data", () => {
      render(
        <Phase2Wizard
          tripId="trip-revisit-4"
          savedData={SAVED_SOLO_DATA}
        />
      );

      // Navigate: travelerType (pre-selected) -> accommodation -> pace -> budget
      fireEvent.click(screen.getByText("common.next")); // -> accommodation (comfort pre-selected)
      fireEvent.click(screen.getByText("common.next")); // -> pace
      fireEvent.click(screen.getByText("common.next")); // -> budget

      const budgetInput = screen.getByLabelText(
        "expedition.phase2.step4.amount"
      ) as HTMLInputElement;
      expect(budgetInput.value).toBe("5000");
    });

    it("pre-populates currency from saved data", () => {
      render(
        <Phase2Wizard
          tripId="trip-revisit-5"
          savedData={SAVED_SOLO_DATA}
        />
      );

      // Navigate to budget step
      fireEvent.click(screen.getByText("common.next")); // -> accommodation
      fireEvent.click(screen.getByText("common.next")); // -> pace
      fireEvent.click(screen.getByText("common.next")); // -> budget

      const currencySelect = screen.getByLabelText(
        "expedition.phase2.step4.currency"
      ) as HTMLSelectElement;
      expect(currencySelect.value).toBe("EUR");
    });
  });

  describe("Empty state without saved data", () => {
    it("uses default budget of 1000 when no saved data", () => {
      render(<Phase2Wizard tripId="trip-new-2" />);

      // Select solo and navigate to budget
      fireEvent.click(screen.getByText("expedition.phase2.step1.solo"));
      fireEvent.click(screen.getByText("common.next")); // -> accommodation
      fireEvent.click(screen.getByText("expedition.phase2.step2.budget"));
      fireEvent.click(screen.getByText("common.next")); // -> pace
      fireEvent.click(screen.getByText("common.next")); // -> budget

      const budgetInput = screen.getByLabelText(
        "expedition.phase2.step4.amount"
      ) as HTMLInputElement;
      expect(budgetInput.value).toBe("1000");
    });

    it("uses locale-default currency when no saved data", () => {
      render(<Phase2Wizard tripId="trip-new-3" />);

      // Select solo and navigate to budget
      fireEvent.click(screen.getByText("expedition.phase2.step1.solo"));
      fireEvent.click(screen.getByText("common.next"));
      fireEvent.click(screen.getByText("expedition.phase2.step2.budget"));
      fireEvent.click(screen.getByText("common.next"));
      fireEvent.click(screen.getByText("common.next"));

      const currencySelect = screen.getByLabelText(
        "expedition.phase2.step4.currency"
      ) as HTMLSelectElement;
      // Mock returns "USD" as default
      expect(currencySelect.value).toBe("USD");
    });
  });

  describe("Accommodation pre-population", () => {
    it("pre-selects accommodation style from saved data", () => {
      render(
        <Phase2Wizard
          tripId="trip-revisit-6"
          savedData={SAVED_SOLO_DATA}
        />
      );

      // Navigate past traveler type to accommodation
      fireEvent.click(screen.getByText("common.next"));

      // Comfort should be pre-selected
      const comfortCard = screen.getByText("expedition.phase2.step2.comfort")
        .closest("[role='radio']");
      expect(comfortCard).toHaveAttribute("aria-checked", "true");
    });
  });
});
