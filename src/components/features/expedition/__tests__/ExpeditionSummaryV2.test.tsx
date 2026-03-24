import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpeditionSummaryV2 } from "../ExpeditionSummaryV2";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";
import type { TripReadinessResult } from "@/server/services/trip-readiness.service";

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
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("../PointsAnimation", () => ({
  PointsAnimation: () => <div data-testid="points-animation">Animation</div>,
}));

vi.mock("../TripCountdown", () => ({
  TripCountdown: () => <div data-testid="trip-countdown">Countdown</div>,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ──────────────────────────────────────────────────────────────────────────── */

const mockSummary: ExpeditionSummaryData = {
  phase1: {
    destination: "Paris, France",
    startDate: "2026-06-01",
    endDate: "2026-06-14",
    tripType: "international",
    origin: "Sao Paulo",
  },
  phase2: {
    travelerType: "couple",
    accommodationStyle: "hotel",
  },
  phase3: {
    done: 3,
    total: 5,
    items: [],
  },
  phase4: {
    transportSegments: [{ type: "flight" }],
    accommodations: [{ type: "hotel" }],
    mobility: ["metro"],
  },
  phase5: {
    generatedAt: "2026-03-20",
  },
  phase6: {
    dayCount: 7,
  },
  completionPercentage: 85,
  pendingItems: [
    { phase: 3, key: "passport", severity: "required" },
    { phase: 4, key: "car_rental", severity: "recommended" },
  ],
} as unknown as ExpeditionSummaryData;

const mockReadiness: TripReadinessResult = {
  readinessPercent: 70,
  phases: [
    { phase: 1, status: "complete" as const, items: [] },
    { phase: 2, status: "complete" as const, items: [] },
    { phase: 3, status: "partial" as const, items: [] },
    { phase: 4, status: "complete" as const, items: [] },
    { phase: 5, status: "complete" as const, items: [] },
    { phase: 6, status: "not_started" as const, items: [] },
  ],
} as unknown as TripReadinessResult;

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("ExpeditionSummaryV2", () => {
  const defaultProps = {
    tripId: "trip-1",
    summary: mockSummary,
    readiness: mockReadiness,
    nextSteps: [],
    startDate: "2026-06-01",
    endDate: "2026-06-14",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary hero with destination", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("summary-hero-v2")).toBeInTheDocument();
    // Destination appears in hero and phase 1 data summary
    const destinationTexts = screen.getAllByText("Paris, France");
    expect(destinationTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders completion indicator", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("completion-indicator-v2")).toBeInTheDocument();
    expect(screen.getByTestId("completion-percentage-v2")).toHaveTextContent("85%");
  });

  it("renders readiness indicator", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("readiness-indicator-v2")).toBeInTheDocument();
  });

  it("renders phase cards", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-cards-v2")).toBeInTheDocument();
    // All 6 phase cards
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`phase-card-v2-${i}`)).toBeInTheDocument();
    }
  });

  it("renders pending items section", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("pending-items-section-v2")).toBeInTheDocument();
    expect(screen.getByTestId("pending-required-v2")).toBeInTheDocument();
    expect(screen.getByTestId("pending-recommended-v2")).toBeInTheDocument();
  });

  it("renders trip countdown", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("trip-countdown")).toBeInTheDocument();
  });

  it("shows celebration animation when celebration prop provided", () => {
    render(
      <ExpeditionSummaryV2
        {...defaultProps}
        celebration={{ pointsEarned: 100, badgeAwarded: null }}
      />,
    );
    expect(screen.getByTestId("points-animation")).toBeInTheDocument();
  });

  it("renders edit buttons for each phase", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`edit-phase-v2-${i}`)).toBeInTheDocument();
    }
  });

  it("renders phase data summaries for completed phases", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    // Phase 1 destination
    const destinationTexts = screen.getAllByText("Paris, France");
    expect(destinationTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders not-started placeholder for incomplete phases", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-placeholder-v2-6")).toBeInTheDocument();
  });

  it("renders view dashboard button", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(
      screen.getByText("expedition.summary.viewDashboard"),
    ).toBeInTheDocument();
  });
});
