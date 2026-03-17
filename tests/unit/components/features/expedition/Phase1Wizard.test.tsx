/**
 * Unit tests for Phase1Wizard component.
 *
 * Tests cover: step reorder (T-S20-004), profile persistence (T-S20-005),
 * bio display in confirmation step, step navigation, and form submission.
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
  updatePhase1Action: vi.fn(),
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

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue(null),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPLETE_PROFILE = {
  birthDate: "1990-05-15",
  phone: "+5511999998888",
  country: "Brazil",
  city: "Sao Paulo",
  bio: "Adventure traveler",
};

const INCOMPLETE_PROFILE = {
  birthDate: "1990-05-15",
  phone: "+5511999998888",
  // missing country and city
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill mandatory Step 1 fields (name + birthDate) so validation passes. */
function fillMandatoryStep1Fields() {
  const nameInput = screen.getByLabelText(/expedition\.phase1\.step1\.name/);
  fireEvent.change(nameInput, { target: { value: "Test User" } });
  const birthDateInput = screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/);
  fireEvent.change(birthDateInput, { target: { value: "1990-01-01" } });
}

/**
 * Navigate from Step 1 (About You) through Step 2 (Destination) and Step 3 (Dates)
 * to Step 4 (Confirmation) with a bio filled.
 */
function navigateToStep4WithBio(bio: string) {
  render(<Phase1Wizard />);

  // Step 1: fill mandatory fields (name and birthDate) + bio
  const nameInput = screen.getByLabelText(/expedition\.phase1\.step1\.name/);
  fireEvent.change(nameInput, { target: { value: "Test User" } });
  const birthDateInput = screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/);
  fireEvent.change(birthDateInput, { target: { value: "1990-01-01" } });
  const bioTextarea = screen.getByLabelText("expedition.phase1.step1.bio");
  fireEvent.change(bioTextarea, { target: { value: bio } });
  fireEvent.click(screen.getByText("common.next"));

  // Step 2: enter destination
  const destinationInput = screen.getByPlaceholderText("expedition.phase1.step2.placeholder");
  fireEvent.change(destinationInput, { target: { value: "Paris, France" } });
  fireEvent.click(screen.getByText("common.next"));

  // Step 3: skip dates, click next
  fireEvent.click(screen.getByText("common.next"));
}

/**
 * Navigate from Step 1 (summary card) to Step 4 when profile is complete.
 */
function navigateToStep4WithCompleteProfile() {
  render(<Phase1Wizard userProfile={COMPLETE_PROFILE} userName="Test User" />);

  // Step 1: shows summary card, click next
  fireEvent.click(screen.getByText("common.next"));

  // Step 2: enter destination
  const destinationInput = screen.getByPlaceholderText("expedition.phase1.step2.placeholder");
  fireEvent.change(destinationInput, { target: { value: "Tokyo, Japan" } });
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
      // Profile fields should be visible (no profile = form mode)
      expect(screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/)).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step1.phone")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step1.bio")).toBeInTheDocument();
    });

    it("navigates from About You (step 1) to Destination (step 2)", () => {
      render(<Phase1Wizard />);

      // Step 1: fill mandatory fields and click next
      fillMandatoryStep1Fields();
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: should show destination input
      expect(screen.getByText("expedition.phase1.step2.title")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("expedition.phase1.step2.placeholder")).toBeInTheDocument();
    });

    it("navigates from Destination (step 2) to Dates (step 3)", () => {
      render(<Phase1Wizard />);

      // Step 1: fill mandatory and next
      fillMandatoryStep1Fields();
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination and next
      const destinationInput = screen.getByPlaceholderText("expedition.phase1.step2.placeholder");
      fireEvent.change(destinationInput, { target: { value: "Tokyo" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: should show date fields
      expect(screen.getByText("expedition.phase1.step3.title")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step3.startDate")).toBeInTheDocument();
      expect(screen.getByLabelText("expedition.phase1.step3.endDate")).toBeInTheDocument();
    });

    it("validates destination is required on step 2", () => {
      render(<Phase1Wizard />);

      // Step 1: fill mandatory and next
      fillMandatoryStep1Fields();
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: try to proceed without destination
      fireEvent.click(screen.getByText("common.next"));

      // Should show error
      expect(screen.getByRole("alert")).toHaveTextContent(
        "expedition.phase1.errors.destinationRequired"
      );
    });

    it("validates name is required on step 1 (TASK-27-014)", () => {
      render(<Phase1Wizard />);

      // Try to proceed without filling name
      fireEvent.click(screen.getByText("common.next"));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "expedition.phase1.errors.nameRequired"
      );
    });

    it("validates birthDate is required on step 1 (TASK-27-014)", () => {
      render(<Phase1Wizard />);

      // Fill name but not birthDate
      const nameInput = screen.getByLabelText(/expedition\.phase1\.step1\.name/);
      fireEvent.change(nameInput, { target: { value: "Test" } });
      fireEvent.click(screen.getByText("common.next"));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "expedition.phase1.errors.birthDateRequired"
      );
    });

    it("step 1 has no back button (first step)", () => {
      render(<Phase1Wizard />);

      // The WizardFooter back button should not exist on step 1
      expect(screen.queryByTestId("wizard-back")).not.toBeInTheDocument();
    });

    it("step 2 back button returns to step 1", () => {
      render(<Phase1Wizard />);

      // Go to step 2
      fillMandatoryStep1Fields();
      fireEvent.click(screen.getByText("common.next"));
      expect(screen.getByText("expedition.phase1.step2.title")).toBeInTheDocument();

      // Click WizardFooter back button
      fireEvent.click(screen.getByTestId("wizard-back"));

      // Should be back on step 1
      expect(screen.getByText("expedition.phase1.step1.title")).toBeInTheDocument();
    });
  });

  describe("Profile persistence — T-S20-005", () => {
    it("shows summary card when profile is complete (birthDate + country + city)", () => {
      render(<Phase1Wizard userProfile={COMPLETE_PROFILE} />);

      // Should show the saved profile title
      expect(
        screen.getByText("expedition.phase1.step1.savedProfileTitle")
      ).toBeInTheDocument();
      // Should show the Edit button
      expect(screen.getByTestId("edit-profile-btn")).toBeInTheDocument();
      // Should show profile data in summary
      expect(screen.getByText("1990-05-15")).toBeInTheDocument();
      expect(screen.getByText("+5511999998888")).toBeInTheDocument();
      // Country + city combined
      expect(screen.getByText("Sao Paulo, Brazil")).toBeInTheDocument();
      // Form fields should NOT be visible (summary mode)
      expect(screen.queryByLabelText(/expedition\.phase1\.step1\.birthDate/)).not.toBeInTheDocument();
    });

    it("shows editable form when profile is incomplete", () => {
      render(<Phase1Wizard userProfile={INCOMPLETE_PROFILE} />);

      // Should show form fields, not summary card
      expect(screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/)).toBeInTheDocument();
      expect(
        screen.queryByText("expedition.phase1.step1.savedProfileTitle")
      ).not.toBeInTheDocument();
    });

    it("shows editable form when no profile is provided", () => {
      render(<Phase1Wizard />);

      // Should show form fields
      expect(screen.getByLabelText(/expedition\.phase1\.step1\.birthDate/)).toBeInTheDocument();
      expect(
        screen.queryByText("expedition.phase1.step1.savedProfileTitle")
      ).not.toBeInTheDocument();
    });

    it("reveals pre-populated form when Edit button is clicked", () => {
      render(<Phase1Wizard userProfile={COMPLETE_PROFILE} />);

      // Click Edit
      fireEvent.click(screen.getByTestId("edit-profile-btn"));

      // Form fields should now be visible with pre-populated values
      const birthDateInput = screen.getByLabelText(
        /expedition\.phase1\.step1\.birthDate/
      ) as HTMLInputElement;
      expect(birthDateInput.value).toBe("1990-05-15");

      const phoneInput = screen.getByLabelText(
        "expedition.phase1.step1.phone"
      ) as HTMLInputElement;
      expect(phoneInput.value).toBe("+5511999998888");

      const countryInput = screen.getByLabelText(
        "expedition.phase1.step1.country"
      ) as HTMLInputElement;
      expect(countryInput.value).toBe("Brazil");

      const cityInput = screen.getByLabelText(
        "expedition.phase1.step1.city"
      ) as HTMLInputElement;
      expect(cityInput.value).toBe("Sao Paulo");
    });

    it("pre-populates form fields from incomplete profile", () => {
      render(<Phase1Wizard userProfile={INCOMPLETE_PROFILE} />);

      // Form is shown (not summary), but fields are pre-populated
      const birthDateInput = screen.getByLabelText(
        /expedition\.phase1\.step1\.birthDate/
      ) as HTMLInputElement;
      expect(birthDateInput.value).toBe("1990-05-15");

      const phoneInput = screen.getByLabelText(
        "expedition.phase1.step1.phone"
      ) as HTMLInputElement;
      expect(phoneInput.value).toBe("+5511999998888");
    });

    it("carries profile data to confirmation step (step 4)", () => {
      navigateToStep4WithCompleteProfile();

      // Confirmation should show profile data
      expect(screen.getByText("expedition.phase1.step4.profileSummary")).toBeInTheDocument();
      expect(screen.getByText("1990-05-15")).toBeInTheDocument();
      expect(screen.getByText("+5511999998888")).toBeInTheDocument();
    });

    it("summary card allows direct navigation to step 2", () => {
      render(<Phase1Wizard userProfile={COMPLETE_PROFILE} userName="Test User" />);

      // Click next from summary card
      fireEvent.click(screen.getByText("common.next"));

      // Should be on step 2 (destination)
      expect(screen.getByText("expedition.phase1.step2.title")).toBeInTheDocument();
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

    it("shows 'Not provided' for optional fields in confirmation (SPEC-PROD-002 AC-012)", () => {
      render(<Phase1Wizard />);

      // Step 1: fill only mandatory fields (name + birthDate), skip optional
      fillMandatoryStep1Fields();
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination
      const destinationInput = screen.getByPlaceholderText("expedition.phase1.step2.placeholder");
      fireEvent.change(destinationInput, { target: { value: "Paris" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: skip dates, click next
      fireEvent.click(screen.getByText("common.next"));

      // Profile section should always be visible
      expect(screen.getByText("expedition.phase1.step4.profileSummary")).toBeInTheDocument();
      // Bio label should be visible with "Not provided"
      expect(screen.getByText("expedition.phase1.step4.bio")).toBeInTheDocument();
      // Optional empty fields should show "Not provided" (phone, location, bio, origin)
      const notProvidedElements = screen.getAllByText("common.notProvided");
      expect(notProvidedElements.length).toBeGreaterThanOrEqual(3);
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

      // Step 1: fill mandatory + optional fields
      fillMandatoryStep1Fields();
      const phoneInput = screen.getByLabelText("expedition.phase1.step1.phone");
      fireEvent.change(phoneInput, { target: { value: "+5511999999999" } });
      const bioTextarea = screen.getByLabelText("expedition.phase1.step1.bio");
      fireEvent.change(bioTextarea, { target: { value: "Travel enthusiast" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: enter destination
      const destinationInput = screen.getByPlaceholderText("expedition.phase1.step2.placeholder");
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
