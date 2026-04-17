/**
 * Unit tests for AccommodationStep component.
 *
 * Tests cover: add/remove entries, max 5 cap, type selection,
 * initial values, accessibility, undecided checkbox, required asterisks.
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
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { AccommodationStep } from "@/components/features/expedition/AccommodationStep";
import { MAX_ACCOMMODATIONS, ACCOMMODATION_TYPES } from "@/lib/validations/transport.schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnSave = vi.fn().mockResolvedValue(undefined);

function renderStep(overrides: Partial<Parameters<typeof AccommodationStep>[0]> = {}) {
  return render(
    <AccommodationStep
      tripId="trip-456"
      onSave={mockOnSave}
      {...overrides}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccommodationStep", () => {
  it("renders title and subtitle", () => {
    renderStep();

    expect(screen.getByText("expedition.phase4.accommodation.title")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase4.accommodation.subtitle")).toBeInTheDocument();
  });

  it("renders one default entry on mount", () => {
    renderStep();

    expect(screen.getByText("expedition.phase4.accommodation.entry[number=1]")).toBeInTheDocument();
  });

  it("renders all accommodation type options for each entry", () => {
    renderStep();

    for (const type of ACCOMMODATION_TYPES) {
      expect(
        screen.getByRole("radio", { name: new RegExp(`types\\.${type}`) })
      ).toBeInTheDocument();
    }
  });

  it("adds a new entry when add button is clicked", () => {
    renderStep();

    const addButton = screen.getByRole("button", { name: /addEntry/ });
    fireEvent.click(addButton);

    expect(screen.getByText("expedition.phase4.accommodation.entry[number=1]")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase4.accommodation.entry[number=2]")).toBeInTheDocument();
  });

  it("removes an entry when remove button is clicked", () => {
    renderStep();

    // Add a second entry
    fireEvent.click(screen.getByRole("button", { name: /addEntry/ }));
    expect(screen.getByText("expedition.phase4.accommodation.entry[number=2]")).toBeInTheDocument();

    // Remove the first entry
    const removeButtons = screen.getAllByRole("button", {
      name: /removeEntry/,
    });
    fireEvent.click(removeButtons[0]);

    // Should have only 1 entry now
    expect(screen.queryByText("expedition.phase4.accommodation.entry[number=2]")).not.toBeInTheDocument();
    expect(screen.getByText("expedition.phase4.accommodation.entry[number=1]")).toBeInTheDocument();
  });

  it("does not show remove button when only one entry exists", () => {
    renderStep();

    expect(
      screen.queryByRole("button", { name: /removeEntry/ })
    ).not.toBeInTheDocument();
  });

  it("caps entries at MAX_ACCOMMODATIONS (5)", () => {
    renderStep();

    const addButton = screen.getByRole("button", { name: /addEntry/ });

    // Add 4 more entries (total 5)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(addButton);
    }

    // Should show 5 entries
    expect(screen.getByText("expedition.phase4.accommodation.entry[number=5]")).toBeInTheDocument();

    // Add button should be disabled and show maxReached text
    const disabledButton = screen.getByRole("button", {
      name: new RegExp(`maxReached\\[max=${MAX_ACCOMMODATIONS}\\]`),
    });
    expect(disabledButton).toBeDisabled();
  });

  it("selects accommodation type on click", () => {
    renderStep();

    const hostelButton = screen.getByRole("radio", {
      name: /types\.hostel/,
    });
    fireEvent.click(hostelButton);

    expect(hostelButton).toHaveAttribute("aria-checked", "true");

    // Hotel should no longer be checked
    const hotelButton = screen.getByRole("radio", {
      name: /types\.hotel/,
    });
    expect(hotelButton).toHaveAttribute("aria-checked", "false");
  });

  it("renders initial accommodations", () => {
    renderStep({
      initialAccommodations: [
        {
          accommodationType: "airbnb",
          name: "Beach House",
          address: "123 Ocean Ave",
          bookingCode: null,
          checkIn: null,
          checkOut: null,
          estimatedCost: null,
          currency: null,
          notes: null,
          orderIndex: 0,
        },
        {
          accommodationType: "hotel",
          name: "City Hotel",
          address: null,
          bookingCode: null,
          checkIn: null,
          checkOut: null,
          estimatedCost: null,
          currency: null,
          notes: null,
          orderIndex: 1,
        },
      ],
    });

    expect(screen.getByText("expedition.phase4.accommodation.entry[number=1]")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase4.accommodation.entry[number=2]")).toBeInTheDocument();
  });

  it("entry groups have aria-label", () => {
    renderStep();

    const group = screen.getByRole("group", {
      name: "expedition.phase4.accommodation.entry[number=1]",
    });
    expect(group).toBeInTheDocument();
  });

  // ─── T-S34: Step-level save button removed ─────────────────────────────

  it("does not render a step-level save button", () => {
    renderStep();

    expect(
      screen.queryByText("expedition.phase4.accommodation.save")
    ).not.toBeInTheDocument();
  });

  // ─── Required asterisks ───────────────────────────────────────────────

  it("shows required asterisks on mandatory fields", () => {
    const { container } = renderStep();

    const asterisks = container.querySelectorAll(".text-destructive");
    expect(asterisks.length).toBeGreaterThan(0);
  });

  // ─── FIX #4: Date validation with trip boundaries ─────────────────────

  describe("date validation", () => {
    const TRIP_START = "2026-06-01T00:00:00.000Z";
    const TRIP_END = "2026-06-10T00:00:00.000Z";

    it("sets min and max on check-in input when tripStartDate and tripEndDate are provided", () => {
      renderStep({ tripStartDate: TRIP_START, tripEndDate: TRIP_END });

      const checkInInput = screen.getByLabelText(/checkIn/);
      expect(checkInInput).toHaveAttribute("min", "2026-06-01");
      expect(checkInInput).toHaveAttribute("max", "2026-06-10");
    });

    it("sets min and max on check-out input when tripStartDate and tripEndDate are provided", () => {
      renderStep({ tripStartDate: TRIP_START, tripEndDate: TRIP_END });

      const checkOutInput = screen.getByLabelText(/checkOut/);
      expect(checkOutInput).toHaveAttribute("min", "2026-06-01");
      expect(checkOutInput).toHaveAttribute("max", "2026-06-10");
    });

    it("does not set min/max when tripStartDate and tripEndDate are null", () => {
      renderStep({ tripStartDate: null, tripEndDate: null });

      const checkInInput = screen.getByLabelText(/checkIn/);
      expect(checkInInput).not.toHaveAttribute("min");
      expect(checkInInput).not.toHaveAttribute("max");
    });

    it("shows error when check-in is before trip start date", () => {
      renderStep({ tripStartDate: TRIP_START, tripEndDate: TRIP_END });

      const checkInInput = screen.getByLabelText(/checkIn/);
      fireEvent.change(checkInInput, { target: { value: "2026-05-20" } });

      expect(screen.getByTestId("date-error-0")).toBeInTheDocument();
      expect(screen.getByText(/checkInBeforeTripStart/)).toBeInTheDocument();
    });

    it("shows error when check-out is after trip end date", () => {
      renderStep({ tripStartDate: TRIP_START, tripEndDate: TRIP_END });

      // First set a valid check-in
      const checkInInput = screen.getByLabelText(/checkIn/);
      fireEvent.change(checkInInput, { target: { value: "2026-06-01" } });

      const checkOutInput = screen.getByLabelText(/checkOut/);
      fireEvent.change(checkOutInput, { target: { value: "2026-06-15" } });

      expect(screen.getByTestId("date-error-0")).toBeInTheDocument();
      expect(screen.getByText(/checkOutAfterTripEnd/)).toBeInTheDocument();
    });

    it("clears error when dates are corrected to valid range", () => {
      renderStep({ tripStartDate: TRIP_START, tripEndDate: TRIP_END });

      // Set invalid check-in
      const checkInInput = screen.getByLabelText(/checkIn/);
      fireEvent.change(checkInInput, { target: { value: "2026-05-20" } });
      expect(screen.getByTestId("date-error-0")).toBeInTheDocument();

      // Correct to valid date
      fireEvent.change(checkInInput, { target: { value: "2026-06-02" } });
      expect(screen.queryByTestId("date-error-0")).not.toBeInTheDocument();
    });

    it("pre-fills check-in and check-out with trip dates for new entries", () => {
      renderStep({ tripStartDate: TRIP_START, tripEndDate: TRIP_END });

      const checkInInput = screen.getByLabelText(/checkIn/) as HTMLInputElement;
      const checkOutInput = screen.getByLabelText(/checkOut/) as HTMLInputElement;

      expect(checkInInput.value).toBe("2026-06-01");
      expect(checkOutInput.value).toBe("2026-06-10");
    });
  });
});
