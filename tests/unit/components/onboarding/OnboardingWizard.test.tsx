/**
 * Behavior tests for OnboardingWizard.
 *
 * Tests cover: initial step rendering, step progression, skip navigation,
 * step 2 form with validation, step 3 travel style selection,
 * and progress indicator presence.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRouterPush, mockCreateTrip, mockGeneratePlan, mockSaveOnboardingStep } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockCreateTrip: vi.fn(),
  mockGeneratePlan: vi.fn(),
  mockSaveOnboardingStep: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string, params?: Record<string, string | number>) => {
      let result = `${namespace}.${key}`;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
      }
      return result;
    };
  },
}));

vi.mock("@/server/actions/trip.actions", () => ({
  createTripAction: mockCreateTrip,
}));

vi.mock("@/server/actions/ai.actions", () => ({
  generateTravelPlanAction: mockGeneratePlan,
}));

vi.mock("@/server/actions/onboarding.actions", () => ({
  saveOnboardingStepAction: mockSaveOnboardingStep,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWizard() {
  return render(<OnboardingWizard userName="Alice" locale="en" />);
}

async function goToStep2() {
  await userEvent.click(
    screen.getByRole("button", { name: "onboarding.step1.cta" })
  );
}

async function fillStep2Form() {
  await userEvent.type(
    screen.getByLabelText("onboarding.step2.destination"),
    "Paris"
  );

  const startDateInput = screen.getByLabelText("onboarding.step2.startDate");
  await userEvent.clear(startDateInput);
  await userEvent.type(startDateInput, "2026-07-01");

  const endDateInput = screen.getByLabelText("onboarding.step2.endDate");
  await userEvent.clear(endDateInput);
  await userEvent.type(endDateInput, "2026-07-10");
}

async function submitStep2() {
  await userEvent.click(
    screen.getByRole("button", { name: "onboarding.step2.cta" })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 1, onboardingData: {}, onboardingCompletedAt: null },
    });
    mockCreateTrip.mockResolvedValue({
      success: true,
      data: { id: "trip-123" },
    });
    mockGeneratePlan.mockResolvedValue({
      success: true,
      data: { days: [], tips: [] },
    });
  });

  it("renders step 1 title heading", () => {
    renderWizard();

    expect(
      screen.getByRole("heading", { name: "onboarding.step1.title" })
    ).toBeInTheDocument();
  });

  it("renders step 1 subtitle and CTA button", () => {
    renderWizard();

    expect(screen.getByText("onboarding.step1.subtitle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "onboarding.step1.cta" })
    ).toBeInTheDocument();
  });

  it("renders skip button on step 1", () => {
    renderWizard();

    expect(
      screen.getByRole("button", { name: "onboarding.skip" })
    ).toBeInTheDocument();
  });

  it("advances to step 2 when CTA is clicked on step 1", async () => {
    renderWizard();
    await goToStep2();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "onboarding.step2.title" })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText("onboarding.step1.subtitle")
    ).not.toBeInTheDocument();
  });

  it("shows step 2 form fields after advancing", async () => {
    renderWizard();
    await goToStep2();

    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("onboarding.step2.startDate")).toBeInTheDocument();
    expect(screen.getByLabelText("onboarding.step2.endDate")).toBeInTheDocument();
    expect(screen.getByLabelText("onboarding.step2.travelers")).toBeInTheDocument();
  });

  it("shows validation error when submitting step 2 without destination", async () => {
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    await submitStep2();

    expect(
      screen.getByText("onboarding.step2.errors.destinationRequired")
    ).toBeInTheDocument();
  });

  it("advances to step 3 when step 2 form is valid", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 2, onboardingData: {}, onboardingCompletedAt: null },
    });
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    await fillStep2Form();
    await submitStep2();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "onboarding.step3.title" })
      ).toBeInTheDocument();
    });
  });

  it("shows travel style cards on step 3", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 2, onboardingData: {}, onboardingCompletedAt: null },
    });
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    await fillStep2Form();
    await submitStep2();

    await waitFor(() => {
      // Check for the 4 travel style radio buttons
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBe(4);
    });
  });

  it("redirects to /trips?from=onboarding when skip is clicked", async () => {
    renderWizard();

    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.skip" })
    );

    expect(mockRouterPush).toHaveBeenCalledWith("/trips?from=onboarding");
  });

  it("shows progress indicator", () => {
    renderWizard();

    expect(screen.getByText(/onboarding\.progress/)).toBeInTheDocument();
  });

  it("renders skip button on step 2 as well", async () => {
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "onboarding.skip" })
    ).toBeInTheDocument();
  });

  it("renders progress dots for all steps", () => {
    renderWizard();

    const dots = screen.getAllByRole("listitem");
    expect(dots).toHaveLength(3);
  });

  it("calls createTripAction and generateTravelPlanAction on step 3 submit", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 3, onboardingData: {}, onboardingCompletedAt: new Date() },
    });
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    await fillStep2Form();
    await submitStep2();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "onboarding.step3.cta" })).toBeInTheDocument();
    });

    // Click generate on step 3
    const generateButton = screen.getByRole("button", {
      name: "onboarding.step3.cta",
    });
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(mockCreateTrip).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockGeneratePlan).toHaveBeenCalledTimes(1);
    });
  });

  it("redirects to itinerary page after successful generation", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 3, onboardingData: {}, onboardingCompletedAt: new Date() },
    });
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    await fillStep2Form();
    await submitStep2();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "onboarding.step3.cta" })).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.step3.cta" })
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/trips/trip-123/itinerary");
    });
  });

  it("allows selecting different travel styles", async () => {
    mockSaveOnboardingStep.mockResolvedValue({
      success: true,
      data: { onboardingStep: 2, onboardingData: {}, onboardingCompletedAt: null },
    });
    renderWizard();
    await goToStep2();
    await waitFor(() => {
      expect(screen.getByLabelText("onboarding.step2.destination")).toBeInTheDocument();
    });
    await fillStep2Form();
    await submitStep2();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /onboarding\.step3\.styleAdventure/ })).toBeInTheDocument();
    });

    const adventureRadio = screen.getByRole("radio", {
      name: /onboarding\.step3\.styleAdventure/,
    });
    await userEvent.click(adventureRadio);

    expect(adventureRadio).toHaveAttribute("aria-checked", "true");
  });
});
