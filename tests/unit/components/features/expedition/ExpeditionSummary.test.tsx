/**
 * Unit tests for ExpeditionSummary component.
 *
 * Tests cover: card-based layout, readiness indicator, countdown,
 * next steps, phase status badges, edit/continue/start CTAs,
 * celebration animation, view dashboard navigation.
 *
 * [SPEC-PROD-007, SPEC-ARCH-005, SPEC-UX-016]
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
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionSummary } from "@/components/features/expedition/ExpeditionSummary";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";
import type { TripReadinessResult } from "@/server/services/trip-readiness.service";
import type { NextStep } from "@/lib/engines/next-steps-engine";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FULL_SUMMARY: ExpeditionSummaryData = {
  tripId: "trip-1",
  currentPhase: 6,
  phase1: {
    destination: "Paris, France",
    origin: "Sao Paulo, Brazil",
    destinationLat: 48.8566,
    destinationLon: 2.3522,
    startDate: "2026-06-01",
    endDate: "2026-06-10",
    tripType: "international",
    flexibleDates: false,
    name: "Test User",
    ageRange: "25-34",
  },
  phase2: {
    travelerType: "family",
    accommodationStyle: "comfort",
    travelPace: 50,
    budget: 5000,
    currency: "USD",
    passengers: { adults: 2, children: 1, infants: 0, seniors: 0 },
    budgetRange: null,
    preferences: null,
  },
  phase3: { done: 5, total: 8, items: [
    { itemKey: "passport", completed: true, required: true },
    { itemKey: "visa", completed: true, required: true },
    { itemKey: "insurance", completed: true, required: false },
    { itemKey: "vaccinations", completed: true, required: true },
    { itemKey: "currency", completed: true, required: false },
    { itemKey: "packing", completed: false, required: false },
    { itemKey: "documents", completed: false, required: true },
    { itemKey: "contacts", completed: false, required: false },
  ] },
  phase4: {
    transportSegments: [
      { type: "flight", departurePlace: "GRU", arrivalPlace: "CDG", departureAt: null, arrivalAt: null, provider: null, maskedBookingCode: "BOOK-****-123" },
    ],
    accommodations: [
      { type: "hotel", name: "Hotel Paris", checkIn: null, checkOut: null, maskedBookingCode: "BOOK-****-456" },
    ],
    mobility: ["public_transit", "walking"],
  },
  phase5: { generatedAt: "2026-05-15", highlights: ["UTC+1", "EUR", "French"] },
  phase6: { dayCount: 10, totalActivities: 35 },
  pendingItems: [
    { phase: 3, key: "documents", severity: "required" },
  ],
  completionPercentage: 85,
};

const FULL_READINESS: TripReadinessResult = {
  readinessPercent: 85,
  phases: [
    { phase: 1, name: "The Calling", status: "complete", dataSnapshot: {} },
    { phase: 2, name: "The Explorer", status: "complete", dataSnapshot: {} },
    { phase: 3, name: "The Preparation", status: "partial", dataSnapshot: { done: 5, total: 8 } },
    { phase: 4, name: "The Logistics", status: "complete", dataSnapshot: {} },
    { phase: 5, name: "The Day Map", status: "complete", dataSnapshot: {} },
    { phase: 6, name: "The Treasure", status: "complete", dataSnapshot: {} },
  ],
};

const NEXT_STEPS: NextStep[] = [
  { labelKey: "expedition.nextSteps.completeChecklist", labelValues: { done: 5, total: 8 }, targetUrl: "/expedition/trip-1/phase-3", priority: 3 },
  { labelKey: "expedition.nextSteps.startPhase", labelValues: { phase: "The Treasure" }, targetUrl: "/expedition/trip-1/phase-6", priority: 6 },
];

const EMPTY_SUMMARY: ExpeditionSummaryData = {
  tripId: "trip-2",
  currentPhase: 1,
  phase1: { destination: "Berlin", origin: null, destinationLat: null, destinationLon: null, startDate: null, endDate: null, tripType: "international", flexibleDates: false, name: null, ageRange: null },
  phase2: null, phase3: null, phase4: null, phase5: null, phase6: null,
  pendingItems: [],
  completionPercentage: 4,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpeditionSummary", () => {
  it("renders summary hero with title and destination", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    expect(screen.getByTestId("summary-hero")).toBeInTheDocument();
    expect(screen.getByText("expedition.summary.title")).toBeInTheDocument();
    expect(screen.getAllByText("Paris, France").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 6 phase cards", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    expect(screen.getByTestId("phase-cards")).toBeInTheDocument();
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`phase-card-${i}`)).toBeInTheDocument();
    }
  });

  it("renders readiness indicator with percentage", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    const indicator = screen.getByTestId("readiness-indicator");
    expect(indicator).toBeInTheDocument();
    // Both completion and readiness are 85%, so scope within readiness-indicator
    // eslint-disable-next-line testing-library/no-node-access
    const percentText = indicator.querySelector(".font-bold");
    expect(percentText).toHaveTextContent("85%");
  });

  it("renders readiness progress bar with correct ARIA", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    const indicator = screen.getByTestId("readiness-indicator");
    // Two progressbars exist (completion + readiness); scope within readiness-indicator
    // eslint-disable-next-line testing-library/no-node-access
    const progressbar = indicator.querySelector("[role='progressbar']") as HTMLElement;
    expect(progressbar).toHaveAttribute("aria-valuenow", "85");
  });

  it("renders trip countdown", () => {
    render(
      <ExpeditionSummary
        tripId="trip-1"
        summary={FULL_SUMMARY}
        readiness={FULL_READINESS}
        startDate="2026-06-01"
        endDate="2026-06-10"
      />
    );
    expect(screen.getByTestId("trip-countdown")).toBeInTheDocument();
  });

  it("renders next steps when readiness < 100%", () => {
    render(
      <ExpeditionSummary
        tripId="trip-1"
        summary={FULL_SUMMARY}
        readiness={FULL_READINESS}
        nextSteps={NEXT_STEPS}
      />
    );
    expect(screen.getByTestId("next-steps-section")).toBeInTheDocument();
    expect(screen.getByTestId("next-step-0")).toBeInTheDocument();
    expect(screen.getByTestId("next-step-1")).toBeInTheDocument();
  });

  it("does not render next steps when readiness is 100%", () => {
    const fullReadiness: TripReadinessResult = {
      readinessPercent: 100,
      phases: FULL_READINESS.phases.map((p) => ({ ...p, status: "complete" as const })),
    };
    render(
      <ExpeditionSummary
        tripId="trip-1"
        summary={FULL_SUMMARY}
        readiness={fullReadiness}
        nextSteps={[{ labelKey: "expedition.nextSteps.allDone", targetUrl: "/summary", priority: 1 }]}
      />
    );
    expect(screen.queryByTestId("next-steps-section")).not.toBeInTheDocument();
  });

  it("renders status badges for each phase", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    const badges = screen.getAllByTestId("status-badge");
    expect(badges.length).toBe(6);
  });

  it("shows edit/continue/start CTAs based on phase status", () => {
    // Use a readiness fixture where phase 6 is not_started to test all 3 CTA variants
    const readinessWithPhase6NotStarted: TripReadinessResult = {
      readinessPercent: 85,
      phases: [
        ...FULL_READINESS.phases.slice(0, 5),
        { phase: 6, name: "The Treasure", status: "not_started", dataSnapshot: {} },
      ],
    };
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={readinessWithPhase6NotStarted} />);
    // Phase 1 is complete → Edit
    expect(screen.getByTestId("edit-phase-1")).toHaveTextContent("expedition.summary.editPhase");
    // Phase 3 is partial → Continue
    expect(screen.getByTestId("edit-phase-3")).toHaveTextContent("expedition.summary.continuePhase");
    // Phase 6 is not_started → Start
    expect(screen.getByTestId("edit-phase-6")).toHaveTextContent("expedition.summary.startPhase");
  });

  it("renders edit links to correct phase URLs", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    const editPhase1 = screen.getByTestId("edit-phase-1").closest("a");
    expect(editPhase1).toHaveAttribute("href", "/expedition/trip-1/phase-1");
    const editPhase3 = screen.getByTestId("edit-phase-3").closest("a");
    expect(editPhase3).toHaveAttribute("href", "/expedition/trip-1/phase-3");
  });

  it("renders phase 1 data in card", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    // Paris, France appears in hero AND in phase card
    expect(screen.getAllByText("Paris, France").length).toBeGreaterThanOrEqual(2);
  });

  it("renders checklist progress for phase 3", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    expect(screen.getByText("expedition.summary.checklistProgress[5,8]")).toBeInTheDocument();
  });

  it("renders itinerary stats for phase 6", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    expect(screen.getByText("expedition.summary.itineraryDays[10]")).toBeInTheDocument();
  });

  it("renders View Dashboard button navigating to /expeditions", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    const btn = screen.getByText("expedition.summary.viewDashboard");
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith("/expeditions");
  });

  it("renders gamification celebration when provided", async () => {
    vi.useFakeTimers();
    render(
      <ExpeditionSummary
        tripId="trip-1"
        summary={FULL_SUMMARY}
        celebration={{ pointsEarned: 500, badgeAwarded: "treasurer" }}
      />
    );
    expect(screen.getByText(/expedition\.animation\.pointsEarned/)).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2900); });
    expect(screen.getByText("expedition.summary.title")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders phases overview heading", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    expect(screen.getByText("expedition.summary.phasesOverview")).toBeInTheDocument();
  });

  it("falls back gracefully without readiness data", () => {
    render(<ExpeditionSummary tripId="trip-2" summary={EMPTY_SUMMARY} />);
    expect(screen.getByTestId("phase-cards")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("has proper heading hierarchy", () => {
    render(<ExpeditionSummary tripId="trip-1" summary={FULL_SUMMARY} readiness={FULL_READINESS} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("expedition.summary.title");
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBeGreaterThanOrEqual(1);
  });
});
