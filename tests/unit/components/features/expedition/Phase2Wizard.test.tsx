/**
 * Unit tests for Phase2Wizard — passenger breakdown UI (T-S20-010).
 *
 * Tests cover: passenger steppers (adults/children/seniors/infants),
 * children age dropdowns, total count, validation, and confirmation display.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

vi.mock("@/server/actions/expedition.actions", () => ({
  completePhase2Action: vi.fn(),
}));

vi.mock("@/lib/utils/currency", () => ({
  getDefaultCurrency: () => "USD",
  formatCurrency: (amount: number, currency: string) =>
    `${currency} ${amount}`,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Select a traveler type card by clicking it. */
function selectTravelerType(type: string) {
  const card = screen.getByText(`expedition.phase2.step1.${type}`);
  fireEvent.click(card);
}

/** Navigate to the passengers step (only for family/group). */
function navigateToPassengersStep(travelerType: string) {
  render(<Phase2Wizard tripId="trip-test-1" />);
  selectTravelerType(travelerType);
  fireEvent.click(screen.getByText("common.next"));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase2Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Passengers step (T-S20-010)", () => {
    it("shows passengers step for family traveler type", () => {
      navigateToPassengersStep("family");

      expect(
        screen.getByText("expedition.phase2.passengers.title")
      ).toBeInTheDocument();
      expect(
        screen.getByText("expedition.phase2.passengers.adults")
      ).toBeInTheDocument();
      expect(
        screen.getByText("expedition.phase2.passengers.children")
      ).toBeInTheDocument();
      expect(
        screen.getByText("expedition.phase2.passengers.seniors")
      ).toBeInTheDocument();
      expect(
        screen.getByText("expedition.phase2.passengers.infants")
      ).toBeInTheDocument();
    });

    it("shows passengers step for group traveler type", () => {
      navigateToPassengersStep("group");

      expect(
        screen.getByText("expedition.phase2.passengers.title")
      ).toBeInTheDocument();
    });

    it("skips passengers step for solo traveler type", () => {
      render(<Phase2Wizard tripId="trip-test-1" />);
      selectTravelerType("solo");
      fireEvent.click(screen.getByText("common.next"));

      // Should go directly to accommodation (step2), not passengers
      expect(
        screen.getByText("expedition.phase2.step2.title")
      ).toBeInTheDocument();
    });

    it("skips passengers step for couple traveler type", () => {
      render(<Phase2Wizard tripId="trip-test-1" />);
      selectTravelerType("couple");
      fireEvent.click(screen.getByText("common.next"));

      // Should go directly to accommodation
      expect(
        screen.getByText("expedition.phase2.step2.title")
      ).toBeInTheDocument();
    });

    it("defaults to 1 adult, 0 children, 0 seniors, 0 infants", () => {
      navigateToPassengersStep("family");

      // Total should be 1
      expect(
        screen.getByText("expedition.phase2.passengers.total[1]")
      ).toBeInTheDocument();
    });

    it("increments adults when + is clicked", () => {
      navigateToPassengersStep("family");

      const increaseBtn = screen.getByLabelText(
        "expedition.phase2.passengers.increase[expedition.phase2.passengers.adults]"
      );
      fireEvent.click(increaseBtn);

      // Total should now be 2
      expect(
        screen.getByText("expedition.phase2.passengers.total[2]")
      ).toBeInTheDocument();
    });

    it("does not decrement adults below 1", () => {
      navigateToPassengersStep("family");

      const decreaseBtn = screen.getByLabelText(
        "expedition.phase2.passengers.decrease[expedition.phase2.passengers.adults]"
      );
      fireEvent.click(decreaseBtn); // try to go below 1

      // Total should still be 1
      expect(
        screen.getByText("expedition.phase2.passengers.total[1]")
      ).toBeInTheDocument();
    });

    it("shows child age dropdown when children are added", () => {
      navigateToPassengersStep("family");

      const increaseChildren = screen.getByLabelText(
        "expedition.phase2.passengers.increase[expedition.phase2.passengers.children]"
      );
      fireEvent.click(increaseChildren);

      // Should show age dropdown for child 1
      expect(
        screen.getByLabelText("expedition.phase2.passengers.childAge[1]")
      ).toBeInTheDocument();
    });

    it("shows multiple child age dropdowns when multiple children added", () => {
      navigateToPassengersStep("family");

      const increaseChildren = screen.getByLabelText(
        "expedition.phase2.passengers.increase[expedition.phase2.passengers.children]"
      );
      fireEvent.click(increaseChildren);
      fireEvent.click(increaseChildren);

      expect(
        screen.getByLabelText("expedition.phase2.passengers.childAge[1]")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("expedition.phase2.passengers.childAge[2]")
      ).toBeInTheDocument();
    });

    it("removes last child age dropdown when children count decreases", () => {
      navigateToPassengersStep("family");

      const increaseChildren = screen.getByLabelText(
        "expedition.phase2.passengers.increase[expedition.phase2.passengers.children]"
      );
      const decreaseChildren = screen.getByLabelText(
        "expedition.phase2.passengers.decrease[expedition.phase2.passengers.children]"
      );

      // Add 2 children
      fireEvent.click(increaseChildren);
      fireEvent.click(increaseChildren);
      expect(
        screen.getByLabelText("expedition.phase2.passengers.childAge[2]")
      ).toBeInTheDocument();

      // Remove 1 child
      fireEvent.click(decreaseChildren);
      expect(
        screen.queryByLabelText("expedition.phase2.passengers.childAge[2]")
      ).not.toBeInTheDocument();
      expect(
        screen.getByLabelText("expedition.phase2.passengers.childAge[1]")
      ).toBeInTheDocument();
    });

    it("updates total count correctly with multiple passenger types", () => {
      navigateToPassengersStep("family");

      // Add 1 more adult (total adults = 2)
      fireEvent.click(
        screen.getByLabelText(
          "expedition.phase2.passengers.increase[expedition.phase2.passengers.adults]"
        )
      );
      // Add 1 child (total = 3)
      fireEvent.click(
        screen.getByLabelText(
          "expedition.phase2.passengers.increase[expedition.phase2.passengers.children]"
        )
      );
      // Add 1 senior (total = 4)
      fireEvent.click(
        screen.getByLabelText(
          "expedition.phase2.passengers.increase[expedition.phase2.passengers.seniors]"
        )
      );
      // Add 1 infant (total = 5)
      fireEvent.click(
        screen.getByLabelText(
          "expedition.phase2.passengers.increase[expedition.phase2.passengers.infants]"
        )
      );

      expect(
        screen.getByText("expedition.phase2.passengers.total[5]")
      ).toBeInTheDocument();
    });

    it("validates minimum 2 passengers for family/group", () => {
      navigateToPassengersStep("family");

      // Default is 1 adult, total = 1 -> should fail
      fireEvent.click(screen.getByText("common.next"));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "expedition.phase2.errors.groupSizeMin"
      );
    });

    it("allows proceeding with 2+ passengers", () => {
      navigateToPassengersStep("family");

      // Add 1 more adult (total = 2)
      fireEvent.click(
        screen.getByLabelText(
          "expedition.phase2.passengers.increase[expedition.phase2.passengers.adults]"
        )
      );
      fireEvent.click(screen.getByText("common.next"));

      // Should proceed to accommodation step
      expect(
        screen.getByText("expedition.phase2.step2.title")
      ).toBeInTheDocument();
    });
  });
});
