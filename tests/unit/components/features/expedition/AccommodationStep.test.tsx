/**
 * Unit tests for AccommodationStep component.
 *
 * Tests cover: add/remove entries, max 5 cap, type selection,
 * save with valid data, initial values, and accessibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${key}[${suffix}]`;
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

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("renders one default entry on mount", () => {
    renderStep();

    // Should see entry header "entry[number=1]"
    expect(screen.getByText("entry[number=1]")).toBeInTheDocument();
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

    expect(screen.getByText("entry[number=1]")).toBeInTheDocument();
    expect(screen.getByText("entry[number=2]")).toBeInTheDocument();
  });

  it("removes an entry when remove button is clicked", () => {
    renderStep();

    // Add a second entry
    fireEvent.click(screen.getByRole("button", { name: /addEntry/ }));
    expect(screen.getByText("entry[number=2]")).toBeInTheDocument();

    // Remove the first entry
    const removeButtons = screen.getAllByRole("button", {
      name: /removeEntry/,
    });
    fireEvent.click(removeButtons[0]);

    // Should have only 1 entry now
    expect(screen.queryByText("entry[number=2]")).not.toBeInTheDocument();
    expect(screen.getByText("entry[number=1]")).toBeInTheDocument();
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
    expect(screen.getByText("entry[number=5]")).toBeInTheDocument();

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

  it("calls onSave with entries on save", async () => {
    renderStep();

    const saveButton = screen.getByRole("button", { name: "save" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      const savedData = mockOnSave.mock.calls[0][0];
      expect(savedData).toHaveLength(1);
      expect(savedData[0].accommodationType).toBe("hotel");
    });
  });

  it("shows saving state when saving prop is true", () => {
    renderStep({ saving: true });

    const saveButton = screen.getByRole("button", { name: "saving" });
    expect(saveButton).toBeDisabled();
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

    expect(screen.getByText("entry[number=1]")).toBeInTheDocument();
    expect(screen.getByText("entry[number=2]")).toBeInTheDocument();
  });

  it("has accessible labels on all form inputs", () => {
    renderStep();

    // All input fields should have associated labels
    expect(screen.getByLabelText("name")).toBeInTheDocument();
    expect(screen.getByLabelText("address")).toBeInTheDocument();
    expect(screen.getByLabelText("bookingCode")).toBeInTheDocument();
    expect(screen.getByLabelText("checkIn")).toBeInTheDocument();
    expect(screen.getByLabelText("checkOut")).toBeInTheDocument();
    expect(screen.getByLabelText("estimatedCost")).toBeInTheDocument();
    expect(screen.getByLabelText("currency")).toBeInTheDocument();
    expect(screen.getByLabelText("notes")).toBeInTheDocument();
  });

  it("entry groups have aria-label", () => {
    renderStep();

    const group = screen.getByRole("group", {
      name: "entry[number=1]",
    });
    expect(group).toBeInTheDocument();
  });
});
