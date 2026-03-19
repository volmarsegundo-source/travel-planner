/**
 * Unit tests for Phase2Wizard revisit guard (TASK-S32-002).
 *
 * When accessMode === "revisit" and phase 2 is already completed,
 * handleSubmit should navigate directly without calling completePhase2Action.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Global polyfills ────────────────────────────────────────────────────────

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

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
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}));

vi.mock("server-only", () => ({}));

const mockCompletePhase2 = vi.fn();
vi.mock("@/server/actions/expedition.actions", () => ({
  completePhase2Action: (...args: unknown[]) => mockCompletePhase2(...args),
}));

vi.mock("@/server/actions/profile.actions", () => ({
  savePreferencesAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/utils/currency", () => ({
  getDefaultCurrency: () => "USD",
  formatCurrency: (amount: number, currency: string) =>
    `${currency} ${amount}`,
}));

vi.mock("@/components/features/expedition/PhaseShell", () => ({
  PhaseShell: ({
    children,
    phaseTitle,
    footerProps,
    showFooter,
  }: {
    children: React.ReactNode;
    phaseTitle?: string;
    footerProps?: {
      onBack?: () => void;
      onPrimary: () => void;
      primaryLabel: string;
      isLoading?: boolean;
      isDisabled?: boolean;
    };
    showFooter?: boolean;
    [key: string]: unknown;
  }) => (
    <div data-testid="phase-shell">
      {phaseTitle && <h1>{phaseTitle}</h1>}
      {children}
      {showFooter && footerProps && (
        <div data-testid="wizard-footer">
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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase2Wizard } from "@/components/features/expedition/Phase2Wizard";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAVED_DATA = {
  travelerType: "solo",
  accommodationStyle: "comfort",
  travelPace: 7,
  budget: 5000,
  currency: "EUR",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase2Wizard — revisit guard (TASK-S32-002)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates directly without calling completePhase2Action when revisiting completed phase", async () => {
    render(
      <Phase2Wizard
        tripId="trip-guard-1"
        savedData={SAVED_DATA}
        accessMode="revisit"
        completedPhases={[1, 2]}
      />
    );

    // Navigate through all steps to confirmation
    // Step 1: travelerType (pre-selected as solo)
    fireEvent.click(screen.getByText("common.next"));
    // Step 2: accommodation (pre-selected as comfort)
    fireEvent.click(screen.getByText("common.next"));
    // Step 3: pace
    fireEvent.click(screen.getByText("common.next"));
    // Step 4: budget
    fireEvent.click(screen.getByText("common.next"));
    // Step 5: preferences
    fireEvent.click(screen.getByText("common.next"));
    // Step 6: confirmation -- click submit (primary button)
    fireEvent.click(screen.getByTestId("wizard-primary"));

    // Should navigate directly
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-guard-1/phase-3");
    // Should NOT call the server action
    expect(mockCompletePhase2).not.toHaveBeenCalled();
  });

  it("calls completePhase2Action on first visit even with completed phases", async () => {
    mockCompletePhase2.mockResolvedValue({
      success: true,
      data: { phaseNumber: 2, pointsEarned: 150 },
    });

    render(
      <Phase2Wizard
        tripId="trip-guard-2"
        savedData={SAVED_DATA}
        accessMode="first_visit"
        completedPhases={[1]}
      />
    );

    // Navigate to confirmation
    fireEvent.click(screen.getByText("common.next")); // accommodation
    fireEvent.click(screen.getByText("common.next")); // pace
    fireEvent.click(screen.getByText("common.next")); // budget
    fireEvent.click(screen.getByText("common.next")); // preferences
    fireEvent.click(screen.getByText("common.next")); // confirmation
    fireEvent.click(screen.getByTestId("wizard-primary"));

    // Should call the server action
    expect(mockCompletePhase2).toHaveBeenCalledWith("trip-guard-2", expect.any(Object));
  });

  it("does not trigger revisit guard when phase 2 is not in completedPhases", async () => {
    mockCompletePhase2.mockResolvedValue({
      success: true,
      data: { phaseNumber: 2, pointsEarned: 150 },
    });

    render(
      <Phase2Wizard
        tripId="trip-guard-3"
        savedData={SAVED_DATA}
        accessMode="revisit"
        completedPhases={[1]} // phase 2 not completed
      />
    );

    // Navigate to confirmation
    fireEvent.click(screen.getByText("common.next")); // accommodation
    fireEvent.click(screen.getByText("common.next")); // pace
    fireEvent.click(screen.getByText("common.next")); // budget
    fireEvent.click(screen.getByText("common.next")); // preferences
    fireEvent.click(screen.getByText("common.next")); // confirmation
    fireEvent.click(screen.getByTestId("wizard-primary"));

    // Should call the server action because phase 2 is not in completedPhases
    expect(mockCompletePhase2).toHaveBeenCalled();
  });
});
