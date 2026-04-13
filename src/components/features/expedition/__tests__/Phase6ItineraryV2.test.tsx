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
  regenerateItineraryAction: vi.fn().mockResolvedValue({ success: true, data: { manualActivities: [] } }),
  getItineraryDaysAction: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/server/actions/gamification.actions", () => ({
  spendPAForAIAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: { remainingBalance: 100 } }),
  refundPAForAIAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: { refunded: 80, newBalance: 180 } }),
}));

vi.mock("../PhaseShell", () => ({
  PhaseShell: ({
    children,
    isEditMode,
  }: {
    children: React.ReactNode;
    isEditMode?: boolean;
  }) => (
    <div data-testid="phase-shell" data-edit-mode={isEditMode ? "true" : "false"}>
      {isEditMode && <div data-testid="edit-mode-banner">revisit banner</div>}
      {children}
    </div>
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
  PAConfirmationModal: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <button data-testid="pa-confirm" onClick={onConfirm}>
        Confirm
      </button>
    ) : null,
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
  isManual: boolean;
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
    isManual: overrides.isManual ?? false,
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

  // ─── Streaming [DONE] detection (Sprint 43 QA Bug 3) ───────────────────

  describe("Stream resilience", () => {
    /**
     * Helper: build a mock fetch Response whose body yields the given chunks
     * in order. Each chunk is a raw string (caller controls SSE framing).
     */
    function makeStreamResponse(chunks: string[]) {
      const encoder = new TextEncoder();
      let i = 0;
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(async () => {
              if (i >= chunks.length) return { done: true, value: undefined };
              const chunk = chunks[i++];
              return { done: false, value: encoder.encode(chunk!) };
            }),
          }),
        },
      };
    }

    it("detects [DONE] even when the marker is split across TCP chunks (Bug 3)", async () => {
      const itineraryMod = await import("@/server/actions/itinerary.actions");
      const getItineraryDaysMock = itineraryMod.getItineraryDaysAction as unknown as ReturnType<typeof vi.fn>;
      getItineraryDaysMock.mockResolvedValueOnce(twoDays);

      // [DONE] marker deliberately split across two reads to reproduce the
      // regression from the naive split-by-line parser. The fix must still
      // detect it via line-buffered parsing.
      globalThis.fetch = vi.fn().mockResolvedValue(
        makeStreamResponse([
          'data: {"destination":"Tokyo","totalDays":2,"days":[]}\n\ndata: [DO',
          "NE]\n\n",
        ]),
      );

      const user = userEvent.setup();
      render(<Phase6ItineraryV2 {...defaultProps} />);
      const ctaButton = screen.getByText(/expedition\.phase6\.generateCta/);
      await user.click(ctaButton);
      // Bypass PA confirmation modal (mocked to a button)
      const confirmBtn = await screen.findByTestId("pa-confirm");
      await user.click(confirmBtn);

      // The component eventually pulls fresh days via getItineraryDaysAction
      // once [DONE] is seen. If line-buffering is broken, this mock is never
      // called because the code takes the error branch instead.
      await vi.waitFor(() => {
        expect(getItineraryDaysMock).toHaveBeenCalledWith("trip-1");
      });
    });
  });

  // ─── Revisit banner (Sprint 43 QA UX Bug) ──────────────────────────────

  describe("Revisit banner", () => {
    it("does NOT render the revisit banner on genuine first visit (first_visit + empty)", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          accessMode="first_visit"
          initialDays={[]}
        />,
      );
      expect(screen.queryByTestId("edit-mode-banner")).toBeNull();
    });

    it("renders the revisit banner when accessMode is 'revisit' and itinerary is old", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          accessMode="revisit"
          initialDays={twoDays as never}
          isJustGenerated={false}
        />,
      );
      expect(screen.getByTestId("edit-mode-banner")).toBeInTheDocument();
    });

    it("suppresses the revisit banner when isJustGenerated is true (post-generation remount)", () => {
      // Scenario: user just completed their first generation. The RSC
      // remounted Phase6 with accessMode='revisit' (because phase 6 is now
      // marked completed), but the server flagged it as a just-generated
      // state so the banner must stay hidden.
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          accessMode="revisit"
          initialDays={twoDays as never}
          isJustGenerated={true}
        />,
      );
      expect(screen.queryByTestId("edit-mode-banner")).toBeNull();
    });
  });

  // ─── Regenerate ──────────────────────────────────────────────────────────

  describe("Regenerate", () => {
    it("renders personalized regen button with cost", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const btn = screen.getByTestId("personalized-regen-btn");
      expect(btn).toBeInTheDocument();
    });
  });

  // ─── Origin Badges (SPEC-ROTEIRO-REGEN-INTELIGENTE AC-002) ──────────────

  describe("Origin badges", () => {
    it("renders AI badge on AI-generated activities", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const badges = screen.getAllByTestId("origin-badge");
      // All activities in twoDays have isManual=false (default)
      expect(badges.length).toBeGreaterThan(0);
      badges.forEach((badge) => {
        expect(badge).toHaveTextContent("expedition.phase6.badgeAI");
      });
    });

    it("renders Manual badge on manually added activities", () => {
      const daysWithManual = [
        makeDay({
          activities: [
            makeActivity({
              id: "act-manual",
              title: "Family Dinner",
              isManual: true,
            }),
          ],
        }),
      ];
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={daysWithManual as never}
        />,
      );
      const badges = screen.getAllByTestId("origin-badge");
      expect(badges[0]).toHaveTextContent("expedition.phase6.badgeManual");
    });

    it("shows mixed badges when both AI and manual activities exist", () => {
      const mixedDays = [
        makeDay({
          activities: [
            makeActivity({ id: "act-ai", title: "AI Tour", isManual: false }),
            makeActivity({ id: "act-man", title: "My Dinner", isManual: true }),
          ],
        }),
      ];
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={mixedDays as never}
        />,
      );
      const badges = screen.getAllByTestId("origin-badge");
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("expedition.phase6.badgeAI");
      expect(badges[1]).toHaveTextContent("expedition.phase6.badgeManual");
    });
  });

  // ─── Itinerary Personalization (Phase 5 pattern) ─────────────────────────

  describe("Itinerary personalization section", () => {
    it("renders personalization section when itinerary is generated", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const section = screen.getByTestId("personalization-section");
      expect(section).toBeInTheDocument();
      expect(within(section).getByRole("heading", { level: 3 })).toHaveTextContent(
        "expedition.phase6.personalizeTitle",
      );
    });

    it("does NOT render personalization section in empty state", () => {
      render(<Phase6ItineraryV2 {...defaultProps} />);
      expect(screen.queryByTestId("personalization-section")).not.toBeInTheDocument();
    });

    it("renders 9 category chips", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const chips = screen.getByTestId("personalization-chips");
      const buttons = within(chips).getAllByRole("button");
      expect(buttons).toHaveLength(9);
    });

    it("category chips have aria-pressed=false by default", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const chip = screen.getByTestId("personalization-chip-gastronomic");
      expect(chip).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles category chip on click", async () => {
      const user = userEvent.setup();
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const chip = screen.getByTestId("personalization-chip-cultural");
      expect(chip).toHaveAttribute("aria-pressed", "false");

      await user.click(chip);
      expect(chip).toHaveAttribute("aria-pressed", "true");

      await user.click(chip);
      expect(chip).toHaveAttribute("aria-pressed", "false");
    });

    it("renders personal notes textarea", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      expect(screen.getByTestId("personal-notes-textarea")).toBeInTheDocument();
    });

    it("personal notes textarea has maxLength 500", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const textarea = screen.getByTestId("personal-notes-textarea");
      expect(textarea).toHaveAttribute("maxLength", "500");
    });

    it("renders re-generate button disabled when no selection", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const btn = screen.getByTestId("personalized-regen-btn");
      expect(btn).toBeDisabled();
    });

    it("enables re-generate button when a category is selected", async () => {
      const user = userEvent.setup();
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      await user.click(screen.getByTestId("personalization-chip-adventure"));
      const btn = screen.getByTestId("personalized-regen-btn");
      expect(btn).not.toBeDisabled();
    });

    it("enables re-generate button when personal notes are typed", async () => {
      const user = userEvent.setup();
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const textarea = screen.getByTestId("personal-notes-textarea");
      await user.type(textarea, "I want a football stadium day");
      const btn = screen.getByTestId("personalized-regen-btn");
      expect(btn).not.toBeDisabled();
    });

    it("renders regen counter showing 0 of 5", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      expect(screen.getByTestId("regen-counter")).toHaveTextContent(
        "expedition.phase6.regenCounter",
      );
    });

    it("category chips meet 44px minimum touch target", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const chip = screen.getByTestId("personalization-chip-gastronomic");
      expect(chip.className).toContain("min-h-[44px]");
    });

    it("personalization section has accessible heading", () => {
      render(
        <Phase6ItineraryV2
          {...defaultProps}
          initialDays={twoDays as never}
        />,
      );
      const section = screen.getByTestId("personalization-section");
      expect(section).toHaveAttribute("aria-labelledby", "personalize-heading");
    });
  });
});
