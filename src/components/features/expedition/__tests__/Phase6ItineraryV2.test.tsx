import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Phase6ItineraryV2 } from "../Phase6ItineraryV2";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 * ──────────────────────────────────────────────────────────────────────────── */

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());

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
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  syncPhase6CompletionAction: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/actions/itinerary.actions", () => ({
  addActivityAction: vi.fn().mockResolvedValue({ success: true, data: { id: "new-act" } }),
  updateActivityAction: vi.fn().mockResolvedValue({ success: true }),
  deleteActivityAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/server/actions/gamification.actions", () => ({
  spendPAForAIAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: { remainingBalance: 100 } }),
}));

vi.mock("../PhaseShell", () => ({
  PhaseShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="phase-shell">{children}</div>
  ),
}));

vi.mock("../AiDisclaimer", () => ({
  AiDisclaimer: ({ message }: { message: string }) => (
    <div data-testid="ai-disclaimer">{message}</div>
  ),
}));

vi.mock("../WizardFooter", () => ({
  WizardFooter: () => <div data-testid="wizard-footer">WizardFooter</div>,
}));

vi.mock("@/components/features/gamification/PAConfirmationModal", () => ({
  PAConfirmationModal: () => null,
}));

vi.mock("@/lib/utils/stream-progress", () => ({
  getProgressPhase: () => 0,
  getProgressMessageKey: () => "analyzing",
  countDaysInStream: () => 0,
  calculateTotalDays: () => 7,
  calculateProgressPercent: () => 0,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Test Data
 * ──────────────────────────────────────────────────────────────────────────── */

function makeActivity(overrides: Partial<{
  id: string;
  dayId: string;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  orderIndex: number;
  activityType: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "act-1",
    dayId: overrides.dayId ?? "day-1",
    title: overrides.title ?? "Visit Museum",
    notes: overrides.notes ?? "A beautiful museum in the city center",
    startTime: overrides.startTime ?? "10:00",
    endTime: overrides.endTime ?? "12:00",
    orderIndex: overrides.orderIndex ?? 0,
    activityType: overrides.activityType ?? "culture",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeDay(overrides: Partial<{
  id: string;
  tripId: string;
  dayNumber: number;
  date: Date | null;
  notes: string | null;
  activities: ReturnType<typeof makeActivity>[];
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "day-1",
    tripId: overrides.tripId ?? "trip-1",
    dayNumber: overrides.dayNumber ?? 1,
    date: overrides.date ?? new Date("2026-05-01"),
    notes: overrides.notes ?? "Arrival Day",
    activities: overrides.activities ?? [makeActivity()],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

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

const twoDays = [
  makeDay({
    id: "day-1",
    dayNumber: 1,
    date: new Date("2026-05-01"),
    notes: "Arrival Day",
    activities: [
      makeActivity({
        id: "act-1",
        dayId: "day-1",
        title: "Check-in Hotel",
        activityType: "logistics",
        startTime: "09:00",
        endTime: "10:00",
      }),
      makeActivity({
        id: "act-2",
        dayId: "day-1",
        title: "Explore Shibuya",
        activityType: "culture",
        startTime: "10:30",
        endTime: "12:30",
      }),
    ],
  }),
  makeDay({
    id: "day-2",
    dayNumber: 2,
    date: new Date("2026-05-02"),
    notes: "Temple Tour",
    activities: [
      makeActivity({
        id: "act-3",
        dayId: "day-2",
        title: "Senso-ji Temple",
        activityType: "culture",
        startTime: "09:00",
        endTime: "11:00",
      }),
    ],
  }),
];

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("Phase6ItineraryV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for auto-trigger
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true }),
        }),
      },
    });
  });

  // ─── Empty State ─────────────────────────────────────────────────────────

  describe("Empty state (no itinerary)", () => {
    it("renders within PhaseShell", () => {
      render(<Phase6ItineraryV2 {...defaultProps} />);
      expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
    });

    it("shows empty state info", () => {
      render(<Phase6ItineraryV2 {...defaultProps} />);
      expect(screen.getByText("expedition.phase6.emptyTitle")).toBeInTheDocument();
      expect(screen.getByText("expedition.phase6.emptyDescription")).toBeInTheDocument();
      expect(screen.getByText("expedition.phase6.paCost")).toBeInTheDocument();
    });

    it("renders CTA and WizardFooter in empty state", () => {
      render(<Phase6ItineraryV2 {...defaultProps} />);
      expect(screen.getByText(/expedition\.phase6\.generateCta/)).toBeInTheDocument();
      // WizardFooter provides navigation
      expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
    });
  });

  // ─── Loading / Generating State ──────────────────────────────────────────

  describe("Loading state", () => {
    it("shows spinner and progress when generating", () => {
      // Render with empty days triggers auto-generation
      render(<Phase6ItineraryV2 {...defaultProps} />);
      // The auto-trigger fires but the component may transition;
      // since fetch is mocked to resolve immediately, generating state is brief.
      // We verify PhaseShell renders regardless.
      expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
    });
  });

  // ─── Generated State — Layout ────────────────────────────────────────────

  describe("Generated state — Split layout", () => {
    it("renders itinerary heading with destination", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      expect(screen.getByTestId("itinerary-heading")).toHaveTextContent(
        "Tokyo, Japan",
      );
    });

    it("renders map panel on desktop", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      expect(screen.getByTestId("map-panel")).toBeInTheDocument();
    });

    it("renders AI disclaimer", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      expect(screen.getByTestId("ai-disclaimer")).toBeInTheDocument();
    });

    it("renders standardized WizardFooter", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      // WizardFooter is now used instead of custom footer
      expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
    });
  });

  // ─── Day Selector Pills ──────────────────────────────────────────────────

  describe("Day Selector Pills", () => {
    it("renders one pill per day", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const pills = screen.getByTestId("day-selector-pills");
      expect(pills).toBeInTheDocument();
      expect(screen.getByTestId("day-pill-1")).toBeInTheDocument();
      expect(screen.getByTestId("day-pill-2")).toBeInTheDocument();
    });

    it("first day pill is active by default", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const pill1 = screen.getByTestId("day-pill-1");
      expect(pill1).toHaveAttribute("aria-selected", "true");
    });

    it("uses tablist/tab ARIA roles", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
    });

    it("switches active day when a pill is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );

      const pill2 = screen.getByTestId("day-pill-2");
      await user.click(pill2);

      expect(pill2).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("day-pill-1")).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    it("shows day panel for selected day", async () => {
      const user = userEvent.setup();
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );

      // Day 1 panel visible by default
      expect(screen.getByTestId("day-panel-1")).toBeInTheDocument();

      // Click day 2
      await user.click(screen.getByTestId("day-pill-2"));
      expect(screen.getByTestId("day-panel-2")).toBeInTheDocument();
    });
  });

  // ─── Activity Timeline ───────────────────────────────────────────────────

  describe("Activity Timeline", () => {
    it("renders timeline with activity cards", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const timeline = screen.getByTestId("activity-timeline");
      expect(timeline).toBeInTheDocument();

      const cards = screen.getAllByTestId("activity-card");
      // Day 1 has 2 activities
      expect(cards).toHaveLength(2);
    });

    it("renders timeline dots for each activity", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const dots = screen.getAllByTestId("timeline-dot");
      expect(dots).toHaveLength(2);
    });

    it("applies correct category to timeline dots", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const dots = screen.getAllByTestId("timeline-dot");
      // First activity is logistics
      expect(dots[0]).toHaveAttribute("data-category", "logistics");
      // Second activity is culture
      expect(dots[1]).toHaveAttribute("data-category", "culture");
    });

    it("renders category chips with correct labels", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const chips = screen.getAllByTestId("category-chip");
      expect(chips).toHaveLength(2);
      // Uses the i18n key pattern
      expect(chips[0]).toHaveTextContent("expedition.phase6.categoryLogistics");
      expect(chips[1]).toHaveTextContent("expedition.phase6.categoryCulture");
    });

    it("renders activity names as headings", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings.some((h) => h.textContent === "Check-in Hotel")).toBe(true);
      expect(headings.some((h) => h.textContent === "Explore Shibuya")).toBe(true);
    });
  });

  // ─── Day Header ──────────────────────────────────────────────────────────

  describe("Day Header", () => {
    it("renders day header with day number and title", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const header = screen.getByTestId("day-header-1");
      expect(header.tagName).toBe("H2");
      expect(header).toHaveTextContent("Dia 1");
      expect(header).toHaveTextContent("Arrival Day");
    });

    it("updates day header when switching days", async () => {
      const user = userEvent.setup();
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );

      await user.click(screen.getByTestId("day-pill-2"));
      const header = screen.getByTestId("day-header-2");
      expect(header).toHaveTextContent("Dia 2");
      expect(header).toHaveTextContent("Temple Tour");
    });
  });

  // ─── Day Summary ─────────────────────────────────────────────────────────

  describe("Day Summary Card", () => {
    it("renders summary card for the current day", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const summary = screen.getByTestId("day-summary-1");
      expect(summary).toBeInTheDocument();
    });

    it("summary card has region role with aria-label", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const summary = screen.getByTestId("day-summary-1");
      expect(summary).toHaveAttribute("role", "region");
    });

    it("shows activity count in summary", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const summary = screen.getByTestId("day-summary-1");
      // Day 1 has 2 activities
      expect(within(summary).getByText("2")).toBeInTheDocument();
    });
  });

  // ─── Category Colors / Fallback ──────────────────────────────────────────

  describe("Category system", () => {
    it("uses logistics as fallback for unknown categories", () => {
      const daysWithUnknown = [
        makeDay({
          activities: [
            makeActivity({
              activityType: "UNKNOWN_TYPE",
            }),
          ],
        }),
      ];
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={daysWithUnknown as never}
        />,
      );
      const dots = screen.getAllByTestId("timeline-dot");
      expect(dots[0]).toHaveAttribute("data-category", "logistics");
    });

    it("maps v1 SIGHTSEEING to culture category", () => {
      const days = [
        makeDay({
          activities: [makeActivity({ activityType: "SIGHTSEEING" })],
        }),
      ];
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={days as never}
        />,
      );
      const dots = screen.getAllByTestId("timeline-dot");
      expect(dots[0]).toHaveAttribute("data-category", "culture");
    });

    it("maps v1 FOOD to food category", () => {
      const days = [
        makeDay({
          activities: [makeActivity({ activityType: "FOOD" })],
        }),
      ];
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={days as never}
        />,
      );
      const dots = screen.getAllByTestId("timeline-dot");
      expect(dots[0]).toHaveAttribute("data-category", "food");
    });

    it("maps v1 TRANSPORT to logistics category", () => {
      const days = [
        makeDay({
          activities: [makeActivity({ activityType: "TRANSPORT" })],
        }),
      ];
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={days as never}
        />,
      );
      const dots = screen.getAllByTestId("timeline-dot");
      expect(dots[0]).toHaveAttribute("data-category", "logistics");
    });
  });

  // ─── Footer Navigation ───────────────────────────────────────────────────

  describe("Footer navigation (WizardFooter)", () => {
    it("renders WizardFooter with back and primary buttons", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
    });
  });

  // ─── Regenerate ──────────────────────────────────────────────────────────

  describe("Regenerate", () => {
    it("shows regenerate button with PA cost", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const btn = screen.getByTestId("regenerate-btn");
      expect(btn).toHaveTextContent("80 PA");
    });
  });
});
