/**
 * Unit tests for Phase1Wizard revisit behavior (TASK-29-005).
 *
 * Tests cover: pre-population of destination, origin, dates from saved trip data
 * when a user revisits Phase 1 of an existing expedition.
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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  createExpeditionAction: vi.fn(),
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue(null),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAVED_TRIP_DATA = {
  savedDestination: "Paris, France",
  savedOrigin: "Sao Paulo, Brazil",
  savedStartDate: "2026-07-01",
  savedEndDate: "2026-07-15",
  tripId: "trip-revisit-1",
};

const COMPLETE_PROFILE = {
  birthDate: "1990-05-15",
  phone: "+5511999998888",
  country: "Brazil",
  city: "Sao Paulo",
  bio: "Adventure traveler",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase1Wizard — revisit pre-population (TASK-29-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Destination pre-population", () => {
    it("pre-populates destination field from saved trip data on step 2", () => {
      render(
        <Phase1Wizard
          userProfile={COMPLETE_PROFILE}
          userName="Test User"
          {...SAVED_TRIP_DATA}
        />
      );

      // Step 1: summary card shown, click next
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: destination should be pre-filled
      const destinationInput = screen.getByPlaceholderText(
        "expedition.phase1.step2.placeholder"
      ) as HTMLInputElement;
      expect(destinationInput.value).toBe("Paris, France");
    });

    it("pre-populates origin field from saved trip data on step 2", () => {
      render(
        <Phase1Wizard
          userProfile={COMPLETE_PROFILE}
          userName="Test User"
          {...SAVED_TRIP_DATA}
        />
      );

      // Step 1: next
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: origin should be pre-filled with saved origin (not profile city/country)
      const originInput = screen.getByPlaceholderText(
        "expedition.phase1.step2.originPlaceholder"
      ) as HTMLInputElement;
      expect(originInput.value).toBe("Sao Paulo, Brazil");
    });
  });

  describe("Dates pre-population", () => {
    it("pre-populates start and end dates from saved trip data on step 3", () => {
      render(
        <Phase1Wizard
          userProfile={COMPLETE_PROFILE}
          userName="Test User"
          {...SAVED_TRIP_DATA}
        />
      );

      // Navigate to step 3
      fireEvent.click(screen.getByText("common.next")); // step 1 -> 2
      fireEvent.click(screen.getByText("common.next")); // step 2 -> 3

      const startDateInput = screen.getByLabelText(
        "expedition.phase1.step3.startDate"
      ) as HTMLInputElement;
      const endDateInput = screen.getByLabelText(
        "expedition.phase1.step3.endDate"
      ) as HTMLInputElement;

      expect(startDateInput.value).toBe("2026-07-01");
      expect(endDateInput.value).toBe("2026-07-15");
    });
  });

  describe("Empty state without saved data", () => {
    it("shows empty destination when no saved data is provided", () => {
      render(<Phase1Wizard />);

      // Fill step 1 mandatory fields
      const nameInput = screen.getByLabelText(/expedition\.phase1\.step1\.name/);
      fireEvent.change(nameInput, { target: { value: "Test User" } });
      const birthDateInput = screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/);
      fireEvent.change(birthDateInput, { target: { value: "1990-01-01" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: destination should be empty
      const destinationInput = screen.getByPlaceholderText(
        "expedition.phase1.step2.placeholder"
      ) as HTMLInputElement;
      expect(destinationInput.value).toBe("");
    });

    it("shows empty dates when no saved data is provided", () => {
      render(<Phase1Wizard />);

      // Fill step 1 mandatory fields
      const nameInput = screen.getByLabelText(/expedition\.phase1\.step1\.name/);
      fireEvent.change(nameInput, { target: { value: "Test User" } });
      const birthDateInput = screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/);
      fireEvent.change(birthDateInput, { target: { value: "1990-01-01" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination to proceed
      const destinationInput = screen.getByPlaceholderText(
        "expedition.phase1.step2.placeholder"
      );
      fireEvent.change(destinationInput, { target: { value: "Tokyo" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: dates should be empty
      const startDateInput = screen.getByLabelText(
        "expedition.phase1.step3.startDate"
      ) as HTMLInputElement;
      const endDateInput = screen.getByLabelText(
        "expedition.phase1.step3.endDate"
      ) as HTMLInputElement;

      expect(startDateInput.value).toBe("");
      expect(endDateInput.value).toBe("");
    });
  });

  describe("Saved data in confirmation step", () => {
    it("shows saved destination and dates in confirmation summary", () => {
      render(
        <Phase1Wizard
          userProfile={COMPLETE_PROFILE}
          userName="Test User"
          {...SAVED_TRIP_DATA}
        />
      );

      // Navigate to step 4 (confirmation)
      fireEvent.click(screen.getByText("common.next")); // step 1 -> 2
      fireEvent.click(screen.getByText("common.next")); // step 2 -> 3
      fireEvent.click(screen.getByText("common.next")); // step 3 -> 4

      // Confirmation should show saved data
      expect(screen.getByText("Paris, France")).toBeInTheDocument();
      // "Sao Paulo, Brazil" appears in both origin and profile location
      const saoPauloElements = screen.getAllByText("Sao Paulo, Brazil");
      expect(saoPauloElements.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/2026-07-01.*2026-07-15/)
      ).toBeInTheDocument();
    });
  });

  describe("Origin fallback", () => {
    it("uses profile city/country for origin when no saved origin is provided", () => {
      render(
        <Phase1Wizard
          userProfile={COMPLETE_PROFILE}
          userName="Test User"
          tripId="trip-1"
          savedDestination="Tokyo, Japan"
        />
      );

      // Step 1: next
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: origin should fallback to profile city, country
      const originInput = screen.getByPlaceholderText(
        "expedition.phase1.step2.originPlaceholder"
      ) as HTMLInputElement;
      expect(originInput.value).toBe("Sao Paulo, Brazil");
    });
  });
});
