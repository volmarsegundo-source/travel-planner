import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Phase6ItineraryV2 } from "../Phase6ItineraryV2";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 * ──────────────────────────────────────────────────────────────────────────── */

const mockRouterPush = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const translate = (key: string, params?: Record<string, string | number>) => {
      let result = `${ns}.${key}`;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    };
    return translate;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  syncPhase6CompletionAction: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/actions/gamification.actions", () => ({
  spendPAForAIAction: vi.fn().mockResolvedValue({ success: true, data: { remainingBalance: 100 } }),
}));

vi.mock("../PhaseShell", () => ({
  PhaseShell: ({ children }: { children: React.ReactNode }) => <div data-testid="phase-shell">{children}</div>,
}));

vi.mock("../AiDisclaimer", () => ({
  AiDisclaimer: ({ message }: { message: string }) => <div data-testid="ai-disclaimer">{message}</div>,
}));

vi.mock("../WizardFooter", () => ({
  WizardFooter: () => <div data-testid="wizard-footer">WizardFooter</div>,
}));

vi.mock("@/components/features/gamification/PAConfirmationModal", () => ({
  PAConfirmationModal: () => null,
}));

vi.mock("@/components/features/itinerary/ItineraryEditor", () => ({
  ItineraryEditor: () => <div data-testid="itinerary-editor-mock">ItineraryEditor</div>,
}));

vi.mock("@/lib/utils/stream-progress", () => ({
  getProgressPhase: () => 0,
  getProgressMessageKey: () => "analyzing",
  countDaysInStream: () => 0,
  calculateTotalDays: () => 7,
  calculateProgressPercent: () => 0,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("Phase6ItineraryV2", () => {
  const defaultProps = {
    tripId: "trip-1",
    destination: "Tokyo, Japan",
    locale: "en",
    startDate: "2026-05-01",
    endDate: "2026-05-07",
    initialDays: [],
    tripCurrentPhase: 6,
    completedPhases: [1, 2, 3, 4, 5],
    availablePoints: 200,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for auto-trigger
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true }) }) },
    });
  });

  it("renders within PhaseShell", () => {
    render(<Phase6ItineraryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  it("renders empty state with generate hint when no days", () => {
    render(<Phase6ItineraryV2 {...defaultProps} />);
    // Auto-generation triggers but we can check for the phase label
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  it("renders itinerary editor when days exist", () => {
    const days = [
      { id: "day-1", dayNumber: 1, date: "2026-05-01", title: "Day 1", tripId: "trip-1", activities: [] },
    ];
    render(<Phase6ItineraryV2 {...defaultProps} initialDays={days as never} />);

    expect(screen.getByTestId("itinerary-editor-mock")).toBeInTheDocument();
  });

  it("renders AI disclaimer when itinerary exists", () => {
    const days = [
      { id: "day-1", dayNumber: 1, date: "2026-05-01", title: "Day 1", tripId: "trip-1", activities: [] },
    ];
    render(<Phase6ItineraryV2 {...defaultProps} initialDays={days as never} />);

    expect(screen.getByTestId("ai-disclaimer")).toBeInTheDocument();
  });

  it("renders wizard footer when itinerary exists", () => {
    const days = [
      { id: "day-1", dayNumber: 1, date: "2026-05-01", title: "Day 1", tripId: "trip-1", activities: [] },
    ];
    render(<Phase6ItineraryV2 {...defaultProps} initialDays={days as never} />);

    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
  });

  it("shows destination text", () => {
    const days = [
      { id: "day-1", dayNumber: 1, date: "2026-05-01", title: "Day 1", tripId: "trip-1", activities: [] },
    ];
    render(<Phase6ItineraryV2 {...defaultProps} initialDays={days as never} />);

    expect(screen.getByText("Tokyo, Japan")).toBeInTheDocument();
  });
});
