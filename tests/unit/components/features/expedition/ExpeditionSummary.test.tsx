/**
 * Unit tests for ExpeditionSummary component.
 *
 * Tests cover: all 6 phase sections render, "Edit" links navigate correctly,
 * "Not completed" for missing phases, masked booking codes display,
 * gamification celebration renders.
 *
 * [SPEC-PROD-005]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

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

const mockPush = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionSummary } from "@/components/features/expedition/ExpeditionSummary";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FULL_SUMMARY: ExpeditionSummaryData = {
  tripId: "trip-1",
  phase1: {
    destination: "Paris, France",
    origin: "Sao Paulo, Brazil",
    startDate: "2026-06-01",
    endDate: "2026-06-10",
    tripType: "international",
  },
  phase2: {
    travelerType: "family",
    accommodationStyle: "comfort",
    travelPace: 50,
    budget: 5000,
    currency: "USD",
    passengers: {
      adults: 2,
      children: 1,
      infants: 0,
      seniors: 0,
    },
  },
  phase3: {
    done: 5,
    total: 8,
  },
  phase4: {
    transportSegments: [
      {
        type: "flight",
        departurePlace: "GRU",
        arrivalPlace: "CDG",
        maskedBookingCode: "BOOK-****-123",
      },
    ],
    accommodations: [
      {
        type: "hotel",
        name: "Hotel Paris",
        maskedBookingCode: "BOOK-****-456",
      },
    ],
    mobility: ["public_transit", "walking"],
  },
  phase5: {
    generatedAt: "2026-05-15",
    highlights: ["UTC+1", "EUR", "French"],
  },
  phase6: {
    dayCount: 10,
    totalActivities: 35,
  },
};

const EMPTY_SUMMARY: ExpeditionSummaryData = {
  tripId: "trip-2",
  phase1: {
    destination: "Berlin",
    origin: null,
    startDate: null,
    endDate: null,
    tripType: "international",
  },
  phase2: null,
  phase3: null,
  phase4: null,
  phase5: null,
  phase6: null,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpeditionSummary", () => {
  it("renders all 6 phase sections", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    expect(screen.getByText("expedition.summary.phase1Title")).toBeInTheDocument();
    expect(screen.getByText("expedition.summary.phase2Title")).toBeInTheDocument();
    expect(screen.getByText("expedition.summary.phase3Title")).toBeInTheDocument();
    expect(screen.getByText("expedition.summary.phase4Title")).toBeInTheDocument();
    expect(screen.getByText("expedition.summary.phase5Title")).toBeInTheDocument();
    expect(screen.getByText("expedition.summary.phase6Title")).toBeInTheDocument();
  });

  it("renders phase 1 data correctly", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    expect(screen.getByText("Paris, France")).toBeInTheDocument();
    expect(screen.getByText("Sao Paulo, Brazil")).toBeInTheDocument();
  });

  it("renders phase 2 data correctly", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    expect(screen.getByText(/family/)).toBeInTheDocument();
    expect(screen.getByText(/comfort/)).toBeInTheDocument();
  });

  it("renders 'Edit' links that navigate to each phase", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    // Click edit for phase 1
    fireEvent.click(screen.getByTestId("edit-phase-1"));
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-1");

    // Click edit for phase 3
    fireEvent.click(screen.getByTestId("edit-phase-3"));
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-3");

    // Click edit for phase 6
    fireEvent.click(screen.getByTestId("edit-phase-6"));
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-6");
  });

  it("shows 'Not completed' for missing phases", () => {
    render(
      <ExpeditionSummary tripId="trip-2" summary={EMPTY_SUMMARY} />
    );

    // Phase 1 should still show data
    expect(screen.getByText("Berlin")).toBeInTheDocument();

    // Phases 2-6 should show "Not completed"
    expect(screen.getByTestId("phase2-not-completed")).toHaveTextContent(
      "expedition.summary.notCompleted"
    );
    expect(screen.getByTestId("phase3-not-completed")).toHaveTextContent(
      "expedition.summary.notCompleted"
    );
    expect(screen.getByTestId("phase4-not-completed")).toHaveTextContent(
      "expedition.summary.notCompleted"
    );
    expect(screen.getByTestId("phase5-not-completed")).toHaveTextContent(
      "expedition.summary.notCompleted"
    );
    expect(screen.getByTestId("phase6-not-completed")).toHaveTextContent(
      "expedition.summary.notCompleted"
    );
  });

  it("displays masked booking codes", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    // Transport booking code
    expect(screen.getByText(/BOOK-\*\*\*\*-123/)).toBeInTheDocument();
    // Accommodation booking code
    expect(screen.getByText(/BOOK-\*\*\*\*-456/)).toBeInTheDocument();
  });

  it("renders gamification celebration when provided", async () => {
    vi.useFakeTimers();

    render(
      <ExpeditionSummary
        tripId="trip-1"
        summary={FULL_SUMMARY}
        celebration={{
          pointsEarned: 500,
          badgeAwarded: "treasurer",
        }}
      />
    );

    // PointsAnimation should show initially
    expect(
      screen.getByText(/expedition\.animation\.pointsEarned/)
    ).toBeInTheDocument();

    // After auto-dismiss (2500ms + 300ms fade)
    await act(async () => {
      vi.advanceTimersByTime(2900);
    });

    // Summary should now be visible
    expect(screen.getByText("expedition.summary.title")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders checklist progress for phase 3", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    expect(
      screen.getByText("expedition.summary.checklistProgress[5,8]")
    ).toBeInTheDocument();
  });

  it("renders itinerary stats for phase 6", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    expect(
      screen.getByText("expedition.summary.itineraryDays[10]")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.summary.totalActivities[35]")
    ).toBeInTheDocument();
  });

  it("renders View Dashboard button", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    const dashboardBtn = screen.getByText("expedition.summary.viewDashboard");
    fireEvent.click(dashboardBtn);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("has proper heading hierarchy", () => {
    render(
      <ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} />
    );

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("expedition.summary.title");

    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBe(6);
  });
});
