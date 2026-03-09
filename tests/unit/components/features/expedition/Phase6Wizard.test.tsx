/**
 * Unit tests for Phase6Wizard component.
 *
 * Tests cover:
 * - Empty state: renders generate CTA
 * - Generating state: shows loading skeleton
 * - Generated state: renders ItineraryEditor
 * - Error handling
 * - Regenerate button
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGeneratePlan, mockPush, mockRefresh } = vi.hoisted(() => ({
  mockGeneratePlan: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/server/actions/ai.actions", () => ({
  generateTravelPlanAction: mockGeneratePlan,
}));

// Mock ItineraryEditor to avoid DnD complexity
vi.mock("@/components/features/itinerary/ItineraryEditor", () => ({
  ItineraryEditor: ({
    tripId,
    initialDays,
  }: {
    tripId: string;
    initialDays: unknown[];
  }) => (
    <div data-testid="itinerary-editor" data-trip-id={tripId}>
      {initialDays.length} days
    </div>
  ),
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { Phase6Wizard } from "@/components/features/expedition/Phase6Wizard";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_PROPS = {
  tripId: "trip-1",
  destination: "Paris, France",
  locale: "en",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
  initialDays: [],
};

const DAYS_WITH_ACTIVITIES = [
  {
    id: "day-1",
    tripId: "trip-1",
    dayNumber: 1,
    date: new Date("2026-06-01"),
    notes: "Arrival",
    createdAt: new Date(),
    updatedAt: new Date(),
    activities: [
      {
        id: "act-1",
        dayId: "day-1",
        title: "Visit Eiffel Tower",
        notes: "Morning visit",
        startTime: "10:00",
        endTime: "12:00",
        orderIndex: 0,
        activityType: "SIGHTSEEING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase6Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state (no itinerary)", () => {
    it("renders title and subtitle", () => {
      render(<Phase6Wizard {...BASE_PROPS} />);

      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("subtitle")).toBeInTheDocument();
    });

    it("renders generate CTA button", () => {
      render(<Phase6Wizard {...BASE_PROPS} />);

      const button = screen.getByRole("button", { name: "generateCta" });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it("renders generate hint text", () => {
      render(<Phase6Wizard {...BASE_PROPS} />);

      expect(screen.getByText("generateHint")).toBeInTheDocument();
    });

    it("does not render ItineraryEditor", () => {
      render(<Phase6Wizard {...BASE_PROPS} />);

      expect(screen.queryByTestId("itinerary-editor")).not.toBeInTheDocument();
    });
  });

  describe("Generating state", () => {
    it("shows loading skeleton when generating", async () => {
      // Make the action hang to keep isPending true
      mockGeneratePlan.mockReturnValue(new Promise(() => {}));

      render(<Phase6Wizard {...BASE_PROPS} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("generating")).toBeInTheDocument();
    });
  });

  describe("Generated state (has itinerary)", () => {
    it("renders ItineraryEditor with initial days", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      const editor = screen.getByTestId("itinerary-editor");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute("data-trip-id", "trip-1");
      expect(editor).toHaveTextContent("1 days");
    });

    it("renders title and destination", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("Paris, France")).toBeInTheDocument();
    });

    it("renders regenerate button", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(
        screen.getByRole("button", { name: "regenerateCta" })
      ).toBeInTheDocument();
    });

    it("does not render empty state CTA", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(
        screen.queryByRole("button", { name: "generateCta" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Error handling", () => {
    it("shows error message on generation failure", async () => {
      mockGeneratePlan.mockResolvedValue({
        success: false,
        error: "errors.timeout",
      });

      render(<Phase6Wizard {...BASE_PROPS} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorTimeout");
      });
    });

    it("shows generic error for unknown error key", async () => {
      mockGeneratePlan.mockResolvedValue({
        success: false,
        error: "some.unknown.error",
      });

      render(<Phase6Wizard {...BASE_PROPS} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorGenerate");
      });
    });

    it("shows rate limit error", async () => {
      mockGeneratePlan.mockResolvedValue({
        success: false,
        error: "errors.rateLimitExceeded",
      });

      render(<Phase6Wizard {...BASE_PROPS} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorRateLimit");
      });
    });
  });

  describe("Generate action", () => {
    it("calls generateTravelPlanAction with correct params", async () => {
      mockGeneratePlan.mockReturnValue(new Promise(() => {}));

      render(<Phase6Wizard {...BASE_PROPS} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      expect(mockGeneratePlan).toHaveBeenCalledWith("trip-1", {
        destination: "Paris, France",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE",
        budgetTotal: 3000,
        budgetCurrency: "USD",
        travelers: 1,
        language: "en",
      });
    });

    it("uses Phase 2 budget and style when provided", async () => {
      mockGeneratePlan.mockReturnValue(new Promise(() => {}));

      render(
        <Phase6Wizard
          {...BASE_PROPS}
          travelStyle="ADVENTURE"
          budgetTotal={5000}
          budgetCurrency="EUR"
          travelers={2}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      expect(mockGeneratePlan).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({
          travelStyle: "ADVENTURE",
          budgetTotal: 5000,
          budgetCurrency: "EUR",
          travelers: 2,
        })
      );
    });

    it("uses pt-BR language when locale is pt-BR", async () => {
      mockGeneratePlan.mockReturnValue(new Promise(() => {}));

      render(<Phase6Wizard {...BASE_PROPS} locale="pt-BR" />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      expect(mockGeneratePlan).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({ language: "pt-BR" })
      );
    });

    it("uses fallback dates when startDate/endDate are null", async () => {
      mockGeneratePlan.mockReturnValue(new Promise(() => {}));

      render(
        <Phase6Wizard {...BASE_PROPS} startDate={null} endDate={null} />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "generateCta" }));
      });

      // Should use today's date as fallback
      const today = new Date().toISOString().split("T")[0];
      expect(mockGeneratePlan).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({
          startDate: today,
          endDate: today,
        })
      );
    });
  });
});
