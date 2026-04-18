/**
 * Unit tests for OnboardingWizard component (BUG F3).
 *
 * Covers: per-step persistence, resume from saved step, pre-fill from saved data,
 * error handling when save fails, step navigation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockPush, mockSaveOnboardingStep, mockCreateTrip, mockGeneratePlan } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockSaveOnboardingStep: vi.fn(),
    mockCreateTrip: vi.fn(),
    mockGeneratePlan: vi.fn(),
  }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      const suffix = Object.values(values).join(",");
      return `${key}[${suffix}]`;
    },
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}));

vi.mock("@/server/actions/onboarding.actions", () => ({
  saveOnboardingStepAction: mockSaveOnboardingStep,
}));

vi.mock("@/server/actions/trip.actions", () => ({
  createTripAction: mockCreateTrip,
}));

vi.mock("@/server/actions/ai.actions", () => ({
  generateTravelPlanAction: mockGeneratePlan,
}));

vi.mock("@/components/features/itinerary/LoadingPlanAnimation", () => ({
  LoadingPlanAnimation: () => <div data-testid="loading-animation">Loading...</div>,
}));

vi.mock("@/components/features/onboarding/ProgressIndicator", () => ({
  ProgressIndicator: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
    <div data-testid="progress-indicator">
      Step {currentStep}/{totalSteps}
    </div>
  ),
}));

vi.mock("@/lib/utils/currency", () => ({
  getDefaultCurrency: () => "USD",
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  userName: "Alice",
  locale: "en",
};

function renderWizard(overrides: Partial<Parameters<typeof OnboardingWizard>[0]> = {}) {
  return render(<OnboardingWizard {...DEFAULT_PROPS} {...overrides} />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 1, onboardingData: {}, onboardingCompletedAt: null },
    });
  });

  // ─── Step 1 persistence ─────────────────────────────────────────────

  it("calls saveOnboardingStepAction(1) when clicking the CTA on step 1", async () => {
    renderWizard();

    // Step 1 should be visible
    expect(screen.getByText("step1.cta")).toBeInTheDocument();

    fireEvent.click(screen.getByText("step1.cta"));

    await waitFor(() => {
      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(1, {});
    });
  });

  it("advances to step 2 after saving step 1", async () => {
    renderWizard();

    fireEvent.click(screen.getByText("step1.cta"));

    await waitFor(() => {
      expect(screen.getByText("step2.title")).toBeInTheDocument();
    });
  });

  it("shows error and does NOT advance when step 1 save fails", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: false,
      error: "onboarding.errors.saveFailed",
    });

    renderWizard();
    fireEvent.click(screen.getByText("step1.cta"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // Should still be on step 1
    expect(screen.getByText("step1.cta")).toBeInTheDocument();
  });

  // ─── Step 2 persistence ─────────────────────────────────────────────

  it("calls saveOnboardingStepAction(2) with trip data on step 2 submit", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 2, onboardingData: {}, onboardingCompletedAt: null },
    });

    renderWizard({ initialStep: 2 });

    // Fill in step 2 form
    fireEvent.change(screen.getByLabelText("step2.destination"), {
      target: { value: "Paris" },
    });
    fireEvent.change(screen.getByLabelText("step2.startDate"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("step2.endDate"), {
      target: { value: "2026-06-10" },
    });

    // Submit the form
    fireEvent.click(screen.getByText("step2.cta"));

    await waitFor(() => {
      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(2, {
        destination: "Paris",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
        travelers: 1,
      });
    });
  });

  it("does NOT call save when step 2 validation fails", async () => {
    renderWizard({ initialStep: 2 });

    // Submit empty form
    fireEvent.click(screen.getByText("step2.cta"));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(mockSaveOnboardingStep).not.toHaveBeenCalled();
  });

  // ─── Step 3 persistence ─────────────────────────────────────────────

  it("calls saveOnboardingStepAction(3) before creating trip on step 3", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: {
        onboardingStep: 3,
        onboardingData: {},
        onboardingCompletedAt: new Date(),
      },
    });
    mockCreateTrip.mockResolvedValue({
      success: true,
      data: { id: "trip-1" },
    });
    mockGeneratePlan.mockResolvedValue({ success: true });

    renderWizard({
      initialStep: 3,
      initialData: {
        step2: {
          destination: "Tokyo",
          startDate: "2026-07-01",
          endDate: "2026-07-10",
          travelers: 2,
        },
      },
    });

    fireEvent.click(screen.getByText("step3.cta"));

    await waitFor(() => {
      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(3, {
        travelStyle: "CULTURE",
        budget: 1000,
        currency: "USD",
      });
    });
  });

  it("does NOT create trip when step 3 save fails", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: false,
      error: "onboarding.errors.saveFailed",
    });

    renderWizard({
      initialStep: 3,
      initialData: {
        step2: {
          destination: "Tokyo",
          startDate: "2026-07-01",
          endDate: "2026-07-10",
          travelers: 2,
        },
      },
    });

    fireEvent.click(screen.getByText("step3.cta"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockCreateTrip).not.toHaveBeenCalled();
  });

  // ─── Resume from saved state ───────────────────────────────────────

  it("starts on step 2 when initialStep=2 is provided", () => {
    renderWizard({ initialStep: 2 });

    expect(screen.getByText("step2.title")).toBeInTheDocument();
    expect(screen.queryByText("step1.cta")).not.toBeInTheDocument();
  });

  it("starts on step 3 when initialStep=3 is provided", () => {
    renderWizard({ initialStep: 3 });

    expect(screen.getByText("step3.title")).toBeInTheDocument();
    expect(screen.queryByText("step2.title")).not.toBeInTheDocument();
  });

  it("pre-fills step 2 fields from initialData", () => {
    renderWizard({
      initialStep: 2,
      initialData: {
        step2: {
          destination: "Rome",
          startDate: "2026-08-01",
          endDate: "2026-08-15",
          travelers: 3,
        },
      },
    });

    const destInput = screen.getByLabelText("step2.destination") as HTMLInputElement;
    expect(destInput.value).toBe("Rome");

    const startInput = screen.getByLabelText("step2.startDate") as HTMLInputElement;
    expect(startInput.value).toBe("2026-08-01");

    const travelersInput = screen.getByLabelText("step2.travelers") as HTMLInputElement;
    expect(travelersInput.value).toBe("3");
  });

  it("pre-fills step 3 fields from initialData", () => {
    renderWizard({
      initialStep: 3,
      initialData: {
        step3: {
          travelStyle: "ADVENTURE",
          budget: 5000,
          currency: "EUR",
        },
      },
    });

    // Check travel style is selected
    const adventureRadio = screen.getByRole("radio", { name: /step3\.styleAdventure/i });
    expect(adventureRadio).toHaveAttribute("aria-checked", "true");
  });

  // ─── Progress indicator ─────────────────────────────────────────────

  it("shows progress indicator with correct step", () => {
    renderWizard({ initialStep: 2 });
    expect(screen.getByTestId("progress-indicator")).toHaveTextContent("Step 2/3");
  });

  // ─── Skip button ───────────────────────────────────────────────────

  it("skip button navigates to /trips", () => {
    renderWizard();
    fireEvent.click(screen.getByText("skip"));
    expect(mockPush).toHaveBeenCalledWith("/trips?from=onboarding");
  });

  // ─── Network error handling ─────────────────────────────────────────

  it("handles network error on step save gracefully", async () => {
    mockSaveOnboardingStep.mockRejectedValue(new Error("Network error"));

    renderWizard();
    fireEvent.click(screen.getByText("step1.cta"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // Should remain on step 1
    expect(screen.getByText("step1.cta")).toBeInTheDocument();
  });
});
