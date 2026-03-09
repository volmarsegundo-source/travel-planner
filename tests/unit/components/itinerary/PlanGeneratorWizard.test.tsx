/**
 * Unit tests for PlanGeneratorWizard.
 *
 * Tests cover: step navigation, editable fields in step 1, travel style
 * selection (9 styles), travel notes textarea, budget slider + numeric input,
 * and form submission flow.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRouterPush, mockGeneratePlan, mockUpdateTrip } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockGeneratePlan: vi.fn(),
  mockUpdateTrip: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/server/actions/ai.actions", () => ({
  generateTravelPlanAction: mockGeneratePlan,
}));

vi.mock("@/server/actions/trip.actions", () => ({
  updateTripAction: mockUpdateTrip,
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
    ...props
  }: {
    value: number[];
    onValueChange: (v: number[]) => void;
    min: number;
    max: number;
    step: number;
  }) => (
    <input
      type="range"
      data-testid="budget-slider"
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange([parseInt(e.target.value, 10)])}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./LoadingPlanAnimation", () => ({
  LoadingPlanAnimation: () => <div data-testid="loading-animation">Loading...</div>,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { PlanGeneratorWizard } from "@/components/features/itinerary/PlanGeneratorWizard";
import type { Trip } from "@/types/trip.types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_TRIP: Trip = {
  id: "trip-1",
  userId: "user-1",
  title: "Paris Trip",
  destination: "Paris, France",
  description: null,
  startDate: new Date("2026-06-01"),
  endDate: new Date("2026-06-05"),
  coverGradient: "sunset",
  coverEmoji: "✈️",
  status: "PLANNING",
  visibility: "PRIVATE",
  expeditionMode: false,
  currentPhase: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PlanGeneratorWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTrip.mockResolvedValue({ success: true });
    mockGeneratePlan.mockResolvedValue({ success: true, data: {} });
  });

  it("renders step 1 with editable trip fields", () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    expect(screen.getByLabelText("tripTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("editDestination")).toBeInTheDocument();
    expect(screen.getByLabelText("editStartDate")).toBeInTheDocument();
    expect(screen.getByLabelText("editEndDate")).toBeInTheDocument();
    expect(screen.getByLabelText("travelers")).toBeInTheDocument();
  });

  it("pre-fills trip title and destination from trip prop", () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    const titleInput = screen.getByLabelText("tripTitle") as HTMLInputElement;
    const destInput = screen.getByLabelText("editDestination") as HTMLInputElement;

    expect(titleInput.value).toBe("Paris Trip");
    expect(destInput.value).toBe("Paris, France");
  });

  it("disables Next button when destination or title is empty", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    const titleInput = screen.getByLabelText("tripTitle");
    const nextButton = screen.getByText("next");

    await userEvent.clear(titleInput);
    expect(nextButton).toBeDisabled();
  });

  it("calls updateTripAction when advancing from step 1", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    fireEvent.click(screen.getByText("next"));

    await waitFor(() => {
      expect(mockUpdateTrip).toHaveBeenCalledWith("trip-1", expect.objectContaining({
        title: "Paris Trip",
        destination: "Paris, France",
      }));
    });
  });

  it("navigates to step 2 after successful trip update", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    fireEvent.click(screen.getByText("next"));

    await waitFor(() => {
      expect(screen.getByText("stepStyle")).toBeInTheDocument();
    });
  });

  it("renders all 9 travel styles in step 2", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // Navigate to step 2
    fireEvent.click(screen.getByText("next"));
    await waitFor(() => {
      expect(screen.getByText("stepStyle")).toBeInTheDocument();
    });

    const radioButtons = screen.getAllByRole("radio");
    expect(radioButtons).toHaveLength(9);

    // Verify style labels exist
    expect(screen.getByText("styleAdventure")).toBeInTheDocument();
    expect(screen.getByText("styleCulture")).toBeInTheDocument();
    expect(screen.getByText("styleRelaxation")).toBeInTheDocument();
    expect(screen.getByText("styleGastronomy")).toBeInTheDocument();
    expect(screen.getByText("styleRomantic")).toBeInTheDocument();
    expect(screen.getByText("styleFamily")).toBeInTheDocument();
    expect(screen.getByText("styleBusiness")).toBeInTheDocument();
    expect(screen.getByText("styleBackpacker")).toBeInTheDocument();
    expect(screen.getByText("styleLuxury")).toBeInTheDocument();
  });

  it("allows selecting a travel style", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    fireEvent.click(screen.getByText("next"));
    await waitFor(() => {
      expect(screen.getByText("stepStyle")).toBeInTheDocument();
    });

    const adventureBtn = screen.getByText("styleAdventure").closest("button")!;
    fireEvent.click(adventureBtn);

    expect(adventureBtn).toHaveAttribute("aria-checked", "true");
  });

  it("renders travel notes textarea in step 2", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    fireEvent.click(screen.getByText("next"));
    await waitFor(() => {
      expect(screen.getByLabelText("travelNotes")).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText("travelNotes") as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(500);
  });

  it("shows character counter for travel notes", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    fireEvent.click(screen.getByText("next"));
    await waitFor(() => {
      expect(screen.getByText("travelNotesCounter")).toBeInTheDocument();
    });
  });

  it("navigates to step 3 from step 2", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // Step 1 → Step 2
    fireEvent.click(screen.getByText("next"));
    await waitFor(() => {
      expect(screen.getByText("stepStyle")).toBeInTheDocument();
    });

    // Step 2 → Step 3
    fireEvent.click(screen.getByText("next"));

    expect(screen.getByText("stepBudget")).toBeInTheDocument();
  });

  it("renders budget numeric input in step 3", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // Navigate to step 3
    fireEvent.click(screen.getByText("next"));
    await waitFor(() => expect(screen.getByText("stepStyle")).toBeInTheDocument());
    fireEvent.click(screen.getByText("next"));

    const budgetInput = screen.getByLabelText("budgetInput") as HTMLInputElement;
    expect(budgetInput).toBeInTheDocument();
    expect(budgetInput.type).toBe("number");
    expect(parseInt(budgetInput.value, 10)).toBe(3000); // DEFAULT_BUDGET
  });

  it("displays budget max of 100000", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // Navigate to step 3
    fireEvent.click(screen.getByText("next"));
    await waitFor(() => expect(screen.getByText("stepStyle")).toBeInTheDocument());
    fireEvent.click(screen.getByText("next"));

    // Budget max is rendered via toLocaleString()
    const maxLabel = (100_000).toLocaleString();
    expect(screen.getByText(maxLabel)).toBeInTheDocument();
  });

  it("calls generateTravelPlanAction on generate", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // Navigate to step 3
    fireEvent.click(screen.getByText("next"));
    await waitFor(() => expect(screen.getByText("stepStyle")).toBeInTheDocument());
    fireEvent.click(screen.getByText("next"));

    // Click generate
    fireEvent.click(screen.getByText("generatePlan"));

    await waitFor(() => {
      expect(mockGeneratePlan).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({
          destination: "Paris, France",
          travelStyle: "CULTURE",
          budgetTotal: 3000,
          language: "en",
        })
      );
    });
  });

  it("navigates back from step 2 to step 1", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    fireEvent.click(screen.getByText("next"));
    await waitFor(() => expect(screen.getByText("stepStyle")).toBeInTheDocument());

    fireEvent.click(screen.getByText("back"));
    expect(screen.getByText("confirmDetails")).toBeInTheDocument();
  });

  it("navigates back from step 3 to step 2", async () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // Step 1 → 2 → 3
    fireEvent.click(screen.getByText("next"));
    await waitFor(() => expect(screen.getByText("stepStyle")).toBeInTheDocument());
    fireEvent.click(screen.getByText("next"));
    expect(screen.getByText("stepBudget")).toBeInTheDocument();

    // Step 3 → 2
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByText("stepStyle")).toBeInTheDocument();
  });

  it("shows step indicator text", () => {
    render(<PlanGeneratorWizard trip={MOCK_TRIP} locale="en" />);

    // The mock t function returns "step" (the key) since the template
    // params {current}/{total} are not in the key itself
    expect(screen.getByText("step")).toBeInTheDocument();
  });
});
