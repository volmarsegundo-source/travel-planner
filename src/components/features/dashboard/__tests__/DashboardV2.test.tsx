import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardV2 } from "../DashboardV2";
import type {
  DashboardV2Props,
  BadgeDTO,
  GamificationData,
} from "../DashboardV2";
import type { ExpeditionDTO } from "@/types/expedition.types";

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

vi.mock("@/lib/gamification/rank-calculator", () => ({
  getNextRankProgress: (totalPoints: number) => ({
    currentRank: "novato",
    nextRank: "desbravador",
    pointsToNext: 300 - totalPoints,
  }),
  RANK_THRESHOLDS: [
    { rank: "lendario", minPoints: 7000 },
    { rank: "aventureiro", minPoints: 3500 },
    { rank: "capitao", minPoints: 1500 },
    { rank: "navegador", minPoints: 700 },
    { rank: "desbravador", minPoints: 300 },
    { rank: "novato", minPoints: 0 },
  ],
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ──────────────────────────────────────────────────────────────────────────── */

function makeExpedition(overrides: Partial<ExpeditionDTO> = {}): ExpeditionDTO {
  return {
    id: "trip-1",
    destination: "Tokyo, Japan",
    currentPhase: 3,
    completedPhases: [1, 2],
    totalPhases: 8,
    coverEmoji: "\uD83C\uDDEF\uD83C\uDDF5",
    startDate: "2026-05-01",
    endDate: "2026-05-14",
    status: "active",
    tripType: "international",
    destinationLat: 35.68,
    destinationLon: 139.69,
    checklistRequired: 5,
    checklistRequiredDone: 3,
    checklistRecommendedPending: 2,
    hasItineraryPlan: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    hasChecklist: true,
    hasGuide: false,
    hasLogistics: false,
    ...overrides,
  };
}

function makeBadge(overrides: Partial<BadgeDTO> = {}): BadgeDTO {
  return {
    badgeKey: "primeira_viagem",
    earnedAt: "2026-03-01T00:00:00.000Z",
    icon: "\uD83C\uDF0D",
    nameKey: "gamification.badges.primeira_viagem.name",
    ...overrides,
  };
}

function makeGamification(overrides: Partial<GamificationData> = {}): GamificationData {
  return {
    totalPoints: 180,
    availablePoints: 100,
    currentRank: "novato",
    ...overrides,
  };
}

function makeProps(overrides: Partial<DashboardV2Props> = {}): DashboardV2Props {
  return {
    userName: "Marco",
    gamification: makeGamification(),
    expeditions: [makeExpedition()],
    recentBadges: [],
    ...overrides,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("DashboardV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading State ─────────────────────────────────────────────────────

  it("renders loading state with skeleton", () => {
    render(<DashboardV2 {...makeProps({ isLoading: true })} />);
    expect(screen.getByTestId("dashboard-v2-loading")).toBeInTheDocument();
  });

  // ─── Section 2: Greeting ──────────────────────────────────────────────

  it("renders personalized greeting with user name", () => {
    render(<DashboardV2 {...makeProps({ userName: "Marco" })} />);
    expect(screen.getByTestId("dashboard-greeting")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-greeting").textContent).toContain("greeting");
  });

  it("renders subtitle text", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByText(/dashboardV2\.subtitle/)).toBeInTheDocument();
  });

  // ─── Section 3: Next Stop (Active Trip) ───────────────────────────────

  it("renders featured trip card with destination name", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("featured-destination")).toHaveTextContent(
      "Tokyo, Japan",
    );
  });

  it("renders continue planning button for active trip", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("continue-planning-btn")).toBeInTheDocument();
  });

  it("renders view details link for active trip", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("view-details-link")).toBeInTheDocument();
    expect(screen.getByTestId("view-details-link")).toHaveAttribute("href", "/expedition/trip-1");
  });

  it("renders days until trip when start date is in the future", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split("T")[0]!;

    render(
      <DashboardV2
        {...makeProps({
          expeditions: [makeExpedition({ startDate: dateStr })],
        })}
      />,
    );
    expect(screen.getByText(/dashboardV2\.daysUntil/)).toBeInTheDocument();
  });

  it("renders empty trip state when no expeditions", () => {
    render(<DashboardV2 {...makeProps({ expeditions: [] })} />);
    expect(screen.getByTestId("no-active-trip")).toBeInTheDocument();
    expect(screen.getByTestId("start-expedition-btn")).toBeInTheDocument();
  });

  // ─── Section 4: Active Route Status (Phase Progress) ─────────────────

  it("renders active trip status section with phase info", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("trip-status-section")).toBeInTheDocument();
    expect(screen.getByTestId("phase-progress-bar")).toBeInTheDocument();
  });

  it("does not render trip status section when no expeditions", () => {
    render(<DashboardV2 {...makeProps({ expeditions: [] })} />);
    expect(screen.queryByTestId("trip-status-section")).not.toBeInTheDocument();
  });

  it("renders 8 phase progress segments for active trip", () => {
    render(<DashboardV2 {...makeProps()} />);
    const progressBar = screen.getByTestId("phase-progress-bar");
    expect(progressBar.children).toHaveLength(8);
  });

  it("renders completed phases count", () => {
    render(<DashboardV2 {...makeProps()} />);
    // "X de 8 etapas concluidas" via i18n mock — key is rendered
    expect(screen.getByText(/dashboardV2\.phasesCompleted/)).toBeInTheDocument();
  });

  // ─── Section 5: My Expeditions ───────────────────────────────────────

  it("renders my expeditions section", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("my-expeditions-section")).toBeInTheDocument();
  });

  it("renders trip cards for expeditions (excluding hero)", () => {
    const expeditions = [
      makeExpedition(), // active → hero
      makeExpedition({ id: "trip-2", destination: "Paris", status: "planned", completedPhases: [] }),
    ];
    render(<DashboardV2 {...makeProps({ expeditions })} />);
    const tripCards = screen.getAllByTestId("trip-card");
    expect(tripCards.length).toBeGreaterThanOrEqual(1);
    // The hero expedition should NOT appear in the grid
    expect(tripCards[0]!.textContent).toContain("Paris");
  });

  it("renders new destination card", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("new-destination-card")).toBeInTheDocument();
  });

  it("renders new destination card even with 0 expeditions", () => {
    render(<DashboardV2 {...makeProps({ expeditions: [] })} />);
    expect(screen.getByTestId("new-destination-card")).toBeInTheDocument();
  });

  it("new destination card links to /expedition/new", () => {
    render(<DashboardV2 {...makeProps()} />);
    const card = screen.getByTestId("new-destination-card");
    expect(card).toHaveAttribute("href", "/expedition/new");
  });

  it("renders view all button when more than 3 expeditions", () => {
    const expeditions = Array.from({ length: 5 }, (_, i) =>
      makeExpedition({
        id: `trip-${i}`,
        destination: `City ${i}`,
        createdAt: `2026-03-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    render(<DashboardV2 {...makeProps({ expeditions })} />);
    expect(screen.getByTestId("view-all-expeditions-link")).toBeInTheDocument();
  });

  it("does not render view all button when 3 or fewer expeditions", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.queryByTestId("view-all-expeditions-link")).not.toBeInTheDocument();
  });

  it("renders + Nova Expedicao button in section header", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("new-expedition-header-btn")).toBeInTheDocument();
  });

  // ─── Section 6: Level & Points ───────────────────────────────────────

  it("renders XP bar card with level and rank", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("xp-bar-card")).toBeInTheDocument();
  });

  it("renders total points display", () => {
    render(
      <DashboardV2
        {...makeProps({ gamification: makeGamification({ totalPoints: 3250 }) })}
      />,
    );
    expect(screen.getByText(/pointsLabel/)).toBeInTheDocument();
  });

  it("renders XP progress bar", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("xp-progress-bar")).toBeInTheDocument();
  });

  it("renders next rank info when not max rank", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByText(/dashboardV2\.nextRankLabel/)).toBeInTheDocument();
    expect(screen.getByText(/dashboardV2\.pointsToNext/)).toBeInTheDocument();
  });

  it("uses 'Level' format (not 'Lvl') in level label", () => {
    render(<DashboardV2 {...makeProps()} />);
    // The i18n mock returns the key "dashboardV2.levelLabel" with param substitution
    // The key is now "Level {level} - {rank}" / "Nivel {level} - {rank}"
    // In the mock, it renders "dashboardV2.levelLabel" with params substituted
    const xpCard = screen.getByTestId("xp-bar-card");
    expect(xpCard.textContent).toContain("levelLabel");
    // Verify that "Lvl" is NOT present in the rendered content
    expect(xpCard.textContent).not.toContain("Lvl");
  });

  // ─── Section 7: Recent Badges ────────────────────────────────────────

  it("renders recent badges when present", () => {
    const badges = [
      makeBadge({ badgeKey: "primeira_viagem", icon: "\uD83C\uDF0D" }),
      makeBadge({ badgeKey: "detalhista", icon: "\uD83D\uDD0D" }),
    ];
    render(<DashboardV2 {...makeProps({ recentBadges: badges })} />);
    expect(screen.getByTestId("recent-badges-section")).toBeInTheDocument();
    const badgeCards = screen.getAllByTestId("badge-card");
    expect(badgeCards).toHaveLength(2);
  });

  it("renders no-badges state when empty", () => {
    render(<DashboardV2 {...makeProps({ recentBadges: [] })} />);
    expect(screen.getByTestId("no-badges")).toBeInTheDocument();
  });

  // ─── Section 8: Quick Actions ────────────────────────────────────────

  it("renders quick action cards (only 2)", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("quick-actions-section")).toBeInTheDocument();
    expect(screen.getByTestId("action-new-expedition")).toBeInTheDocument();
    expect(screen.getByTestId("action-buy-pa")).toBeInTheDocument();
  });

  it("new expedition action links to /expedition/new", () => {
    render(<DashboardV2 {...makeProps()} />);
    const link = screen.getByTestId("action-new-expedition").closest("a");
    expect(link).toHaveAttribute("href", "/expedition/new");
  });

  it("buy PA action links to /meu-atlas/comprar-pa", () => {
    render(<DashboardV2 {...makeProps()} />);
    const link = screen.getByTestId("action-buy-pa").closest("a");
    expect(link).toHaveAttribute("href", "/meu-atlas/comprar-pa");
  });

  // ─── Removed sections ────────────────────────────────────────────────

  it("does NOT render expert tip card", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.queryByTestId("expert-tip-card")).not.toBeInTheDocument();
  });

  // ─── Edge cases ──────────────────────────────────────────────────────

  it("selects most recent non-completed trip as active", () => {
    const expeditions = [
      makeExpedition({
        id: "old",
        destination: "Paris",
        completedPhases: [1, 2, 3, 4, 5, 6, 7, 8],
        createdAt: "2026-02-01T00:00:00.000Z",
      }),
      makeExpedition({
        id: "new",
        destination: "Rome",
        completedPhases: [1],
        currentPhase: 2,
        createdAt: "2026-03-15T00:00:00.000Z",
      }),
    ];
    render(<DashboardV2 {...makeProps({ expeditions })} />);
    expect(screen.getByTestId("featured-destination")).toHaveTextContent("Rome");
  });

  it("sorts expedition cards by status priority: active > planned > completed", () => {
    const expeditions = [
      makeExpedition({
        id: "completed-1",
        destination: "Paris",
        status: "completed",
        completedPhases: [1, 2, 3, 4, 5, 6, 7, 8],
        createdAt: "2026-03-20T00:00:00.000Z",
      }),
      makeExpedition({
        id: "active-1",
        destination: "Tokyo",
        status: "active",
        completedPhases: [1, 2],
        createdAt: "2026-03-10T00:00:00.000Z",
      }),
      makeExpedition({
        id: "planned-1",
        destination: "Rome",
        status: "planned",
        completedPhases: [],
        createdAt: "2026-03-15T00:00:00.000Z",
      }),
    ];
    render(<DashboardV2 {...makeProps({ expeditions })} />);
    const tripCards = screen.getAllByTestId("trip-card");
    // Hero = most recently created non-completed = Rome (Mar 15)
    // Grid excludes hero, shows: active Tokyo (priority 0) → completed Paris (priority 2)
    expect(tripCards[0]!.textContent).toContain("Tokyo");
    expect(tripCards[1]!.textContent).toContain("Paris");
    expect(tripCards.length).toBe(2);
  });
});
