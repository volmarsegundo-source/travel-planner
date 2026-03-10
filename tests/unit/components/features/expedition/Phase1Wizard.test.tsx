/**
 * Unit tests for Phase1Wizard component.
 *
 * Tests cover: step reorder (T-S20-004), bio display in confirmation step,
 * step navigation, and form submission.
 *
 * New step order: Step 1=About You, Step 2=Destination, Step 3=Dates, Step 4=Confirmation.
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

vi.mock("@/server/actions/expedition.actions", () => ({
  createExpeditionAction: vi.fn(),
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue(null),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate from Step 1 (About You) through Step 2 (Destination) and Step 3 (Dates)
 * to Step 4 (Confirmation) with a bio filled.
 */
function navigateToStep4WithBio(bio: string) {
  render(<Phase1Wizard />);

  // Step 1: enter bio (About You)
  const bioTextarea = screen.getByLabelText("expedition.phase1.step1.bio");
  fireEvent.change(bioTextarea, { target: { value: bio } });
  fireEvent.click(screen.getByText("common.next"));

  // Step 2: enter destination
  const destinationInput = screen.getByRole("combobox");
  fireEvent.change(destinationInput, { target: { value: "Paris, France" } });
  fireEvent.click(screen.getByText("common.next"));

  // Step 3: skip dates, click next
  fireEvent.click(screen.getByText("common.next"));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase1Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step order (T-S20-004)", () => {
    it("renders About You as step 1 on initial load", () => {
      render(<Phase1Wizard />);

      // Step 1 should show the About You title
      expect(screen.getByText("expedition.phase1.step1.title")).toBeInTheDocument();
      // Profile fields should be visible
      expect(screen.getByLabelText("expedition.phase1.step1.birthDate")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step1.phone")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step1.bio")).toBeInTheDocument();
    });

    it("navigates from About You (step 1) to Destination (step 2)", () => {
      render(<Phase1Wizard />);

      // Step 1: click next
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: should show destination input
      expect(screen.getByText("expedition.phase1.step2.title")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("navigates from Destination (step 2) to Dates (step 3)", () => {
      render(<Phase1Wizard />);

      // Step 1: next
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination and next
      const destinationInput = screen.getByRole("combobox");
      fireEvent.change(destinationInput, { target: { value: "Tokyo" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: should show date fields
      expect(screen.getByText("expedition.phase1.step3.title")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step3.startDate")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step3.endDate")).toBeInTheDocument();
    });

    it("validates destination is required on step 2", () => {
      render(<Phase1Wizard />);

      // Step 1: next (no validation needed)
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: try to proceed without destination
      fireEvent.click(screen.getByText("common.next"));

      // Should show error
      expect(screen.getByRole("alert")).toHaveTextContent(
        "expedition.phase1.errors.destinationRequired"
      );
    });

    it("step 1 has no back button (first step)", () => {
      render(<Phase1Wizard />);

      // The back arrow should not exist on step 1
      expect(screen.queryByText("\u2190")).not.toBeInTheDocument();
    });

    it("step 2 back button returns to step 1", () => {
      render(<Phase1Wizard />);

      // Go to step 2
      fireEvent.click(screen.getByText("common.next"));
      expect(screen.getByText("expedition.phase1.step2.title")).toBeInTheDocument();

      // Click back
      fireEvent.click(screen.getByText("\u2190"));

      // Should be back on step 1
      expect(screen.getByText("expedition.phase1.step1.title")).toBeInTheDocument();
    });
  });

  describe("Step 4 confirmation — bio display", () => {
    it("shows bio in confirmation when bio is filled", () => {
      navigateToStep4WithBio("I love exploring new cities.");

      // Bio label should be visible
      expect(screen.getByText("expedition.phase1.step4.bio")).toBeInTheDocument();
      // Bio content should be visible
      expect(screen.getByText("I love exploring new cities.")).toBeInTheDocument();
    });

    it("does not show bio section when bio is empty", () => {
      render(<Phase1Wizard />);

      // Step 1: skip all fields, click next
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination
      const destinationInput = screen.getByRole("combobox");
      fireEvent.change(destinationInput, { target: { value: "Paris" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: skip dates, click next
      fireEvent.click(screen.getByText("common.next"));

      // Bio label should NOT be visible (no profile section since nothing filled)
      expect(screen.queryByText("expedition.phase1.step4.bio")).not.toBeInTheDocument();
    });

    it("truncates bio to 100 characters with ellipsis when longer", () => {
      const longBio = "A".repeat(120);
      navigateToStep4WithBio(longBio);

      // Should show truncated version
      const expectedTruncated = "A".repeat(100) + "...";
      expect(screen.getByText(expectedTruncated)).toBeInTheDocument();
    });

    it("shows bio alongside other profile fields when both are filled", () => {
      render(<Phase1Wizard />);

      // Step 1: fill phone and bio
      const phoneInput = screen.getByLabelText("expedition.phase1.step1.phone");
      fireEvent.change(phoneInput, { target: { value: "+5511999999999" } });
      const bioTextarea = screen.getByLabelText("expedition.phase1.step1.bio");
      fireEvent.change(bioTextarea, { target: { value: "Travel enthusiast" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination
      const destinationInput = screen.getByRole("combobox");
      fireEvent.change(destinationInput, { target: { value: "Tokyo" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: next
      fireEvent.click(screen.getByText("common.next"));

      // Both should be visible
      expect(screen.getByText("expedition.phase1.step4.profileSummary")).toBeInTheDocument();
      expect(screen.getByText("+5511999999999")).toBeInTheDocument();
      expect(screen.getByText("Travel enthusiast")).toBeInTheDocument();
    });

    it("shows profile section when only bio is filled", () => {
      navigateToStep4WithBio("Just bio, nothing else.");

      // Profile summary header should be visible since bio triggers the section
      expect(screen.getByText("expedition.phase1.step4.profileSummary")).toBeInTheDocument();
      expect(screen.getByText("Just bio, nothing else.")).toBeInTheDocument();
    });
  });
});
