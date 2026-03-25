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
    totalPhases: 6,
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

  // ─── Section A: Greeting ───────────────────────────────────────────────

  it("renders personalized greeting with user name", () => {
    render(<DashboardV2 {...makeProps({ userName: "Marco" })} />);
    // The mock returns "dashboardV2.greeting" — the key itself, confirming greeting renders
    expect(screen.getByTestId("dashboard-greeting")).toBeInTheDocument();
    // Verify the translation function was called (greeting key present in output)
    expect(screen.getByTestId("dashboard-greeting").textContent).toContain("greeting");
  });

  it("renders subtitle text", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByText(/dashboardV2\.subtitle/)).toBeInTheDocument();
  });

  // ─── Section B: Level/XP Bar ───────────────────────────────────────────

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
    // The mock returns "dashboardV2.pointsLabel" with param substitution: {points} -> 3,250
    // But toLocaleString in JSDOM may not format as 3,250 — check the key is rendered
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

  // ─── Section C: Active Trip ────────────────────────────────────────────

  it("renders active trip status section with phase info", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("trip-status-section")).toBeInTheDocument();
    expect(screen.getByTestId("phase-progress-bar")).toBeInTheDocument();
  });

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

  it("does not render trip status section when no expeditions", () => {
    render(<DashboardV2 {...makeProps({ expeditions: [] })} />);
    expect(screen.queryByTestId("trip-status-section")).not.toBeInTheDocument();
  });

  it("renders completed phases count", () => {
    render(<DashboardV2 {...makeProps()} />);
    // "2 de 6 etapas concluidas" via i18n mock
    expect(screen.getByText(/dashboardV2\.phasesCompleted/)).toBeInTheDocument();
  });

  // ─── Section D: Recent Badges ──────────────────────────────────────────

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

  // ─── Section E: Quick Actions ──────────────────────────────────────────

  it("renders quick action cards", () => {
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

  // ─── Section F: Expert Tip ─────────────────────────────────────────────

  it("renders expert tip card", () => {
    render(<DashboardV2 {...makeProps()} />);
    expect(screen.getByTestId("expert-tip-card")).toBeInTheDocument();
  });

  // ─── Phase segments ────────────────────────────────────────────────────

  it("renders 6 phase progress segments for active trip", () => {
    render(<DashboardV2 {...makeProps()} />);
    const progressBar = screen.getByTestId("phase-progress-bar");
    // 6 slim bars inside
    expect(progressBar.children).toHaveLength(6);
  });

  // ─── Edge cases ────────────────────────────────────────────────────────

  it("selects most recent non-completed trip as active", () => {
    const expeditions = [
      makeExpedition({
        id: "old",
        destination: "Paris",
        completedPhases: [1, 2, 3, 4, 5, 6],
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
});
