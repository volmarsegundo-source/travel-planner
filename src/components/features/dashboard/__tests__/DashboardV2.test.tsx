import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardV2 } from "../DashboardV2";
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

vi.mock("@/hooks/useDesignV2", () => ({
  useDesignV2: () => true,
}));

vi.mock("@/lib/expedition-filters", () => ({
  filterAndSortExpeditions: (
    exps: ExpeditionDTO[],
    _filter: string,
    _sort: string,
  ) => exps,
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

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("DashboardV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no expeditions", () => {
    render(<DashboardV2 expeditions={[]} />);
    expect(screen.getByTestId("dashboard-v2-empty")).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.expeditions.emptyTitle"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.expeditions.emptySubtitle"),
    ).toBeInTheDocument();
  });

  it("renders loading state with skeleton cards", () => {
    render(<DashboardV2 expeditions={[]} isLoading />);
    expect(screen.getByTestId("dashboard-v2-loading")).toBeInTheDocument();
  });

  it("renders expedition cards in grid", () => {
    const expeditions = [
      makeExpedition({ id: "t1", destination: "Tokyo" }),
      makeExpedition({ id: "t2", destination: "Paris" }),
    ];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByTestId("dashboard-v2")).toBeInTheDocument();
    expect(screen.getByTestId("expeditions-grid-v2")).toBeInTheDocument();
    const cards = screen.getAllByTestId("expedition-card-v2");
    expect(cards).toHaveLength(2);
  });

  it("renders filter chips", () => {
    const expeditions = [makeExpedition()];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByTestId("filter-chips-v2")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-v2-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-v2-active")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-v2-completed")).toBeInTheDocument();
  });

  it("renders sort dropdown", () => {
    const expeditions = [makeExpedition()];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByTestId("sort-dropdown-v2")).toBeInTheDocument();
  });

  it("renders new expedition button on desktop", () => {
    const expeditions = [makeExpedition()];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByTestId("new-expedition-btn-v2")).toBeInTheDocument();
  });

  it("renders mobile FAB", () => {
    const expeditions = [makeExpedition()];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByTestId("fab-new-expedition-v2")).toBeInTheDocument();
  });

  it("renders expedition card with destination and status badge", () => {
    const expeditions = [makeExpedition({ destination: "Berlin, Germany" })];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
  });

  it("renders dates on expedition card", () => {
    const expeditions = [
      makeExpedition({ startDate: "2026-05-01", endDate: "2026-05-14" }),
    ];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByText("2026-05-01 \u2013 2026-05-14")).toBeInTheDocument();
  });

  it("renders no dates message when dates not set", () => {
    const expeditions = [
      makeExpedition({ startDate: null, endDate: null }),
    ];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByText("dashboard.expeditions.noDates")).toBeInTheDocument();
  });

  it("has live region for accessibility", () => {
    const expeditions = [makeExpedition()];
    render(<DashboardV2 expeditions={expeditions} />);

    expect(screen.getByTestId("live-region-v2")).toBeInTheDocument();
  });
});
