/**
 * Unit tests for Phase3Wizard component.
 *
 * Tests cover: rendering checklist items, required vs recommended sections,
 * progress bar, toggle interaction, complete button state, and animations.
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
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: Record<string, unknown>) =>
    <a {...props}>{children as React.ReactNode}</a>,
}));

const mockToggleAction = vi.fn();
const mockCompleteAction = vi.fn();

vi.mock("@/server/actions/expedition.actions", () => ({
  togglePhase3ItemAction: (...args: unknown[]) => mockToggleAction(...args),
  completePhase3Action: (...args: unknown[]) => mockCompleteAction(...args),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase3Wizard } from "@/components/features/expedition/Phase3Wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_ITEMS = [
  {
    id: "item-1",
    itemKey: "passport_valid_6m",
    required: true,
    completed: false,
    deadline: "2026-03-15T00:00:00Z",
    pointsValue: 15,
  },
  {
    id: "item-2",
    itemKey: "emergency_contacts",
    required: true,
    completed: false,
    deadline: "2026-06-01T00:00:00Z",
    pointsValue: 15,
  },
  {
    id: "item-3",
    itemKey: "travel_insurance",
    required: true,
    completed: true,
    deadline: "2026-05-15T00:00:00Z",
    pointsValue: 15,
  },
  {
    id: "item-4",
    itemKey: "yellow_fever_vaccine",
    required: false,
    completed: false,
    deadline: "2026-04-15T00:00:00Z",
    pointsValue: 8,
  },
];

function renderWizard(itemsOverride?: typeof MOCK_ITEMS) {
  return render(
    <Phase3Wizard
      tripId="trip-001"
      items={itemsOverride ?? MOCK_ITEMS}
      tripType="international"
      destination="Paris, France"
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockToggleAction.mockResolvedValue({
    success: true,
    data: { completed: true, pointsAwarded: 15 },
  });
  mockCompleteAction.mockResolvedValue({
    success: true,
    data: {
      phaseNumber: 3,
      pointsEarned: 75,
      badgeAwarded: "navigator",
      newRank: null,
      nextPhaseUnlocked: 4,
    },
  });
});

describe("Phase3Wizard", () => {
  it("renders title and subtitle", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase3.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase3.subtitle")
    ).toBeInTheDocument();
  });

  it("renders destination and trip type", () => {
    renderWizard();

    expect(
      screen.getByText(/Paris, France/)
    ).toBeInTheDocument();
  });

  it("renders required section with correct items", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase3.requiredSection")
    ).toBeInTheDocument();

    expect(
      screen.getByText("expedition.phase3.items.passport_valid_6m")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase3.items.emergency_contacts")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase3.items.travel_insurance")
    ).toBeInTheDocument();
  });

  it("renders recommended section with correct items", () => {
    renderWizard();

    expect(
      screen.getByText("expedition.phase3.recommendedSection")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase3.items.yellow_fever_vaccine")
    ).toBeInTheDocument();
  });

  it("shows progress count for required items", () => {
    renderWizard();

    // Mock outputs: expedition.phase3.progress[1,3]
    expect(screen.getByText(/progress\[1,3\]/)).toBeInTheDocument();
  });

  it("disables complete button when required items are incomplete", () => {
    renderWizard();

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase3\.ctaDisabled/,
    });
    expect(completeButton).toBeDisabled();
  });

  it("enables complete button when all required items are complete", () => {
    const allDone = MOCK_ITEMS.map((item) => ({
      ...item,
      completed: item.required ? true : item.completed,
    }));
    renderWizard(allDone);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase3\.cta/,
    });
    expect(completeButton).not.toBeDisabled();
  });

  it("calls togglePhase3ItemAction when clicking an item", async () => {
    renderWizard();

    const passportButton = screen.getByRole("button", {
      name: "expedition.phase3.items.passport_valid_6m",
    });
    fireEvent.click(passportButton);

    await waitFor(() => {
      expect(mockToggleAction).toHaveBeenCalledWith(
        "trip-001",
        "passport_valid_6m"
      );
    });
  });

  it("updates item state after successful toggle", async () => {
    renderWizard();

    const passportButton = screen.getByRole("button", {
      name: "expedition.phase3.items.passport_valid_6m",
    });
    fireEvent.click(passportButton);

    await waitFor(() => {
      // After toggle, progress should update: expedition.phase3.progress[2,3]
      expect(screen.getByText(/progress\[2,3\]/)).toBeInTheDocument();
    });
  });

  it("shows points values on checklist items", () => {
    renderWizard();

    const pointsBadges = screen.getAllByText("+15");
    expect(pointsBadges.length).toBeGreaterThanOrEqual(3);

    expect(screen.getByText("+8")).toBeInTheDocument();
  });

  it("calls completePhase3Action when clicking complete", async () => {
    const allDone = MOCK_ITEMS.map((item) => ({
      ...item,
      completed: item.required ? true : item.completed,
    }));
    renderWizard(allDone);

    const completeButton = screen.getByRole("button", {
      name: /expedition\.phase3\.cta/,
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteAction).toHaveBeenCalledWith("trip-001");
    });
  });

  it("shows error message when toggle fails", async () => {
    mockToggleAction.mockResolvedValue({
      success: false,
      error: "errors.generic",
    });

    renderWizard();

    const passportButton = screen.getByRole("button", {
      name: "expedition.phase3.items.passport_valid_6m",
    });
    fireEvent.click(passportButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("renders deadlines for items that have them", () => {
    renderWizard();

    // All 4 items have deadlines, so there should be "expedition.phase3.deadline" texts
    const deadlines = screen.getAllByText(/expedition\.phase3\.deadline/);
    expect(deadlines.length).toBeGreaterThanOrEqual(1);
  });

  it("hides recommended section when no recommended items exist", () => {
    const requiredOnly = MOCK_ITEMS.filter((i) => i.required);
    renderWizard(requiredOnly);

    expect(
      screen.queryByText("expedition.phase3.recommendedSection")
    ).not.toBeInTheDocument();
  });
});
