import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

vi.mock("@/lib/utils/destination-images", () => ({
  getDestinationImage: (dest: string) =>
    dest.includes("Paris") ? "https://example.com/paris.jpg" : null,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ──────────────────────────────────────────────────────────────────────────── */

const mockSummary: ExpeditionSummaryData = {
  tripId: "trip-1",
  tripTitle: "Aventura em Paris 2026",
  currentPhase: 5,
  phase1: {
    destination: "Paris, France",
    startDate: "2026-06-01",
    endDate: "2026-06-14",
    tripType: "international",
    origin: "Sao Paulo",
    destinationLat: 48.8566,
    destinationLon: 2.3522,
    flexibleDates: false,
    name: "Test User",
    ageRange: "25-34",
  },
  phase2: {
    travelerType: "couple",
    accommodationStyle: "hotel",
    travelPace: 3,
    budget: 15000,
    currency: "BRL",
    passengers: { adults: 2, children: 1, infants: 0, seniors: 0 },
    budgetRange: "moderate",
    preferences: {
      interests: ["beaches", "gastronomy"],
      foodPreferences: ["vegetarian"],
      travelPace: "moderate",
      budgetStyle: "moderate",
      socialPreference: [],
      accommodationStyle: [],
      fitnessLevel: "moderate",
      photographyInterest: null,
      wakePreference: null,
      connectivityNeeds: null,
    },
  },
  phase3: {
    done: 3,
    total: 5,
    items: [
      { itemKey: "passport", completed: true, required: true },
      { itemKey: "visa", completed: true, required: true },
      { itemKey: "insurance", completed: false, required: true },
      { itemKey: "packing_list", completed: true, required: false },
      { itemKey: "guidebook", completed: false, required: false },
    ],
  },
  phase4: {
    transportSegments: [
      { type: "flight", departurePlace: "GRU", arrivalPlace: "CDG", departureAt: "2026-06-01T10:00:00Z", arrivalAt: "2026-06-01T22:00:00Z", provider: "LATAM", maskedBookingCode: "BOOK-****-X7Z" },
    ],
    accommodations: [
      { type: "Hotel", name: "Hotel Paris Plaza", checkIn: "2026-06-01", checkOut: "2026-06-14", maskedBookingCode: "BOOK-****-A3B" },
    ],
    mobility: ["metro", "walking"],
  },
  phase5: {
    generatedAt: "2026-03-20",
    highlights: ["Paris, France", "moderate", "Euro (EUR)"],
    safetyLevel: "safe",
    keyFacts: [
      { label: "Clima", value: "18-25C" },
      { label: "Moeda", value: "Euro (EUR)" },
    ],
    topAttractions: [
      { name: "Torre Eiffel", description: "Icone de Paris" },
      { name: "Louvre", description: "Maior museu do mundo" },
      { name: "Montmartre", description: "Bairro boemio" },
    ],
  },
  phase6: {
    dayCount: 14,
    totalActivities: 42,
  },
  pendingItems: [
    { phase: 3, key: "insurance", severity: "required" },
  ],
  completionPercentage: 85,
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
    startDate: "2026-06-01",
    endDate: "2026-06-14",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Hero Header ──────────────────────────────────────────────────────────

  it("renders hero with trip title as H1 (P0 #1)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const hero = screen.getByTestId("summary-hero-v2");
    const heading = hero.querySelector("h1");
    // P0 #1: trip title should be used, not destination
    expect(heading).toHaveTextContent("Aventura em Paris 2026");
  });

  it("falls back to destination when tripTitle is empty", () => {
    const noTitleSummary = {
      ...mockSummary,
      tripTitle: "",
    } as unknown as ExpeditionSummaryData;
    render(<ExpeditionSummaryV2 {...defaultProps} summary={noTitleSummary} />);
    const heading = screen.getByTestId("hero-title");
    expect(heading).toHaveTextContent("Paris, France");
  });

  it("renders cover image when destination matches", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const cover = screen.getByTestId("hero-cover");
    const img = cover.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/paris.jpg");
  });

  it("renders hero placeholder when no destination image match", () => {
    const noImageSummary = {
      ...mockSummary,
      phase1: { ...mockSummary.phase1!, destination: "Timbuktu" },
    } as unknown as ExpeditionSummaryData;
    render(<ExpeditionSummaryV2 {...defaultProps} summary={noImageSummary} />);
    const cover = screen.getByTestId("hero-cover");
    expect(cover.querySelector("img")).toBeNull();
  });

  it("renders origin-to-destination route in hero", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("hero-route")).toBeInTheDocument();
  });

  it("renders date range and duration badge in hero", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByText(/heroDuration/)).toBeInTheDocument();
  });

  it("renders traveler count badge in hero when passengers exist", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("hero-travelers")).toBeInTheDocument();
  });

  it("renders trip countdown", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("trip-countdown")).toBeInTheDocument();
  });

  it("renders fallback text when phase1 is null", () => {
    const noPhase1Summary = {
      ...mockSummary,
      tripTitle: "",
      phase1: null,
    } as unknown as ExpeditionSummaryData;
    render(<ExpeditionSummaryV2 {...defaultProps} summary={noPhase1Summary} />);
    expect(screen.getByText("expedition.summaryV2.heroDestinationFallback")).toBeInTheDocument();
  });

  // ─── Overview Card ────────────────────────────────────────────────────────

  it("renders trip overview card with key fields", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const card = screen.getByTestId("overview-card");
    expect(card).toBeInTheDocument();
    expect(within(card).getByText("expedition.summaryV2.overviewTitle")).toBeInTheDocument();
    expect(within(card).getByText("Sao Paulo")).toBeInTheDocument();
  });

  it("renders travel style chips in overview", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const card = screen.getByTestId("overview-card");
    expect(within(card).getByText("couple")).toBeInTheDocument();
    expect(within(card).getByText("hotel")).toBeInTheDocument();
  });

  it("shows phase 1 CTA when phase1 is null", () => {
    const noPhase1 = {
      ...mockSummary,
      phase1: null,
    } as unknown as ExpeditionSummaryData;
    render(<ExpeditionSummaryV2 {...defaultProps} summary={noPhase1} />);
    expect(screen.getByText("expedition.summaryV2.overviewComplete1")).toBeInTheDocument();
  });

  // ─── Phase Progress Bar ───────────────────────────────────────────────────

  it("renders 6-segment progress bar", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const bar = screen.getByTestId("phase-progress-bar");
    expect(bar).toBeInTheDocument();
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`progress-circle-${i}`)).toBeInTheDocument();
    }
  });

  it("renders visible progress count label", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("progress-count-label")).toBeInTheDocument();
  });

  it("marks completed phases with check icon and partial with number", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const circle3 = screen.getByTestId("progress-circle-3");
    expect(circle3).toHaveTextContent("3");
    const circle6 = screen.getByTestId("progress-circle-6");
    expect(circle6).toHaveTextContent("6");
  });

  // ─── Phase Cards ──────────────────────────────────────────────────────────

  it("renders all 6 phase cards", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-cards-v2")).toBeInTheDocument();
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`phase-card-v2-${i}`)).toBeInTheDocument();
    }
  });

  it("renders edit/continue/start buttons for each phase", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`edit-phase-v2-${i}`)).toBeInTheDocument();
    }
  });

  it("shows not-started placeholder for incomplete phases", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-placeholder-v2-6")).toBeInTheDocument();
  });

  it("renders phase 1 content with origin and destination", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-content-1")).toBeInTheDocument();
  });

  // ─── Phase 2: P0 #2 — shows ALL preferences ──────────────────────────────

  it("renders phase 2 content with traveler chips", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-content-2")).toBeInTheDocument();
  });

  it("renders phase 2 interest chips from preferences (P0 #2)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-2");
    expect(within(content).getByTestId("phase2-interests")).toBeInTheDocument();
    expect(within(content).getByText("beaches")).toBeInTheDocument();
    expect(within(content).getByText("gastronomy")).toBeInTheDocument();
  });

  it("renders phase 2 dietary chips from preferences (P0 #2)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-2");
    expect(within(content).getByTestId("phase2-dietary")).toBeInTheDocument();
    expect(within(content).getByText("vegetarian")).toBeInTheDocument();
  });

  it("renders phase 2 fitness level from preferences (P0 #2)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-2");
    expect(within(content).getByTestId("phase2-fitness")).toBeInTheDocument();
    expect(within(content).getByText(/moderate/)).toBeInTheDocument();
  });

  it("omits preference sections when preferences are null", () => {
    const noPrefs = {
      ...mockSummary,
      phase2: { ...mockSummary.phase2!, preferences: null },
    } as unknown as ExpeditionSummaryData;
    render(<ExpeditionSummaryV2 {...defaultProps} summary={noPrefs} />);
    const content = screen.getByTestId("phase-content-2");
    expect(within(content).queryByTestId("phase2-interests")).not.toBeInTheDocument();
    expect(within(content).queryByTestId("phase2-dietary")).not.toBeInTheDocument();
    expect(within(content).queryByTestId("phase2-fitness")).not.toBeInTheDocument();
  });

  // ─── Phase 3 ──────────────────────────────────────────────────────────────

  it("renders phase 3 with checklist progress bar", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-3");
    expect(content).toBeInTheDocument();
    const progressBar = within(content).getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("renders phase 3 pending items", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-3");
    expect(within(content).getByText("insurance")).toBeInTheDocument();
  });

  // ─── Phase 4 ──────────────────────────────────────────────────────────────

  it("renders phase 4 with transport and accommodation details", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-4");
    expect(content).toBeInTheDocument();
    expect(within(content).getByText(/GRU.*CDG/)).toBeInTheDocument();
    expect(within(content).getByText(/Hotel Paris Plaza/)).toBeInTheDocument();
  });

  it("renders phase 4 mobility chips", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-4");
    expect(within(content).getByText("metro")).toBeInTheDocument();
    expect(within(content).getByText("walking")).toBeInTheDocument();
  });

  // ─── Phase 5: P0 #3 — dramatic dark card ─────────────────────────────────

  it("renders phase 5 as dark card spanning 2 columns (P0 #3)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const card = screen.getByTestId("phase-card-v2-5");
    expect(card).toBeInTheDocument();
    expect(card.className).toContain("md:col-span-2");
    expect(card.className).toContain("bg-[#040d1b]");
  });

  it("renders phase 5 safety level badge (P0 #3)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("phase5-safety")).toBeInTheDocument();
  });

  it("renders phase 5 key facts as stat boxes (P0 #3)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const stats = screen.getByTestId("phase5-stats");
    const facts = within(stats).getAllByTestId("phase5-fact");
    expect(facts.length).toBe(2);
    expect(within(stats).getByText("Euro (EUR)")).toBeInTheDocument();
  });

  it("renders phase 5 top attractions as sub-cards (P0 #3)", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const attractions = screen.getByTestId("phase5-attractions");
    const cards = within(attractions).getAllByTestId("phase5-attraction-card");
    expect(cards.length).toBe(3);
    expect(within(attractions).getByText("Torre Eiffel")).toBeInTheDocument();
    expect(within(attractions).getByText("Louvre")).toBeInTheDocument();
    expect(within(attractions).getByText("Montmartre")).toBeInTheDocument();
  });

  it("renders phase 5 AI badge", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const content = screen.getByTestId("phase-content-5");
    expect(within(content).getByText("AI")).toBeInTheDocument();
  });

  it("falls back to highlight bullets when no top attractions", () => {
    const noAttractions = {
      ...mockSummary,
      phase5: { ...mockSummary.phase5!, topAttractions: [], keyFacts: [], safetyLevel: null, highlights: ["Fuso: UTC+1"] },
    } as unknown as ExpeditionSummaryData;
    render(<ExpeditionSummaryV2 {...defaultProps} summary={noAttractions} />);
    const content = screen.getByTestId("phase-content-5");
    expect(within(content).getByText("Fuso: UTC+1")).toBeInTheDocument();
    expect(screen.queryByTestId("phase5-attractions")).not.toBeInTheDocument();
  });

  // ─── Phase 6 ──────────────────────────────────────────────────────────────

  it("renders phase 6 with day count and activities when phase is complete", () => {
    const completeReadiness: TripReadinessResult = {
      ...mockReadiness,
      phases: mockReadiness.phases.map((p) =>
        p.phase === 6 ? { ...p, status: "complete" as const } : p,
      ),
    } as unknown as TripReadinessResult;
    render(<ExpeditionSummaryV2 {...defaultProps} readiness={completeReadiness} />);
    const content = screen.getByTestId("phase-content-6");
    expect(content).toBeInTheDocument();
  });

  // ─── Phase card border accents ────────────────────────────────────────────

  it("applies success border to completed phase cards", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const card1 = screen.getByTestId("phase-card-v2-1");
    expect(card1.className).toContain("border-l-atlas-success");
  });

  it("applies amber border to partial phase cards", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const card3 = screen.getByTestId("phase-card-v2-3");
    expect(card3.className).toContain("border-l-atlas-secondary-container");
  });

  it("applies opacity to not-started phase cards", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const card6 = screen.getByTestId("phase-card-v2-6");
    expect(card6.className).toContain("opacity-60");
  });

  // ─── Actions Bar ──────────────────────────────────────────────────────────

  it("renders actions bar with back to dashboard button", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.getByTestId("actions-bar")).toBeInTheDocument();
    expect(screen.getByTestId("back-to-dashboard")).toBeInTheDocument();
  });

  it("renders disabled export PDF and share buttons", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const exportBtn = screen.getByTestId("export-pdf-btn");
    const shareBtn = screen.getByTestId("share-btn");
    expect(exportBtn).toBeDisabled();
    expect(shareBtn).toBeDisabled();
  });

  // ─── Celebration ──────────────────────────────────────────────────────────

  it("shows celebration animation when celebration prop provided", () => {
    render(
      <ExpeditionSummaryV2
        {...defaultProps}
        celebration={{ pointsEarned: 100, badgeAwarded: null }}
      />,
    );
    expect(screen.getByTestId("points-animation")).toBeInTheDocument();
  });

  // ─── Gamification Card ────────────────────────────────────────────────────

  it("renders gamification card when data provided", () => {
    render(
      <ExpeditionSummaryV2
        {...defaultProps}
        gamification={{
          totalPA: 350,
          rank: "explorador",
          rankLabel: "Explorador",
          badgesEarned: 2,
          phasesCompleted: 4,
          pointsToNextRank: 150,
          nextRankLabel: "Desbravador",
          progressPercent: 70,
        }}
      />,
    );
    expect(screen.getByTestId("gamification-card")).toBeInTheDocument();
  });

  it("hides gamification card when no data", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    expect(screen.queryByTestId("gamification-card")).not.toBeInTheDocument();
  });

  // ─── Container width ─────────────────────────────────────────────────────

  it("uses max-w-4xl container", () => {
    render(<ExpeditionSummaryV2 {...defaultProps} />);
    const container = screen.getByTestId("summary-v2");
    expect(container.className).toContain("max-w-4xl");
  });
});
