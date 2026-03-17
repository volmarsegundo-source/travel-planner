/**
 * Unit tests for ExpeditionsDashboard component.
 *
 * Tests cover: empty state, loading state, filter chips, sort dropdown,
 * filtered empty state, grid rendering, mobile FAB, expedition limit,
 * accessibility (radiogroup, aria-live).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ExpeditionDTO } from "@/types/expedition.types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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

vi.mock("@/components/features/dashboard/ExpeditionCardRedesigned", () => ({
  ExpeditionCardRedesigned: ({ expedition }: { expedition: ExpeditionDTO }) => (
    <div data-testid="expedition-card-redesigned">{expedition.destination}</div>
  ),
}));

vi.mock("@/components/features/dashboard/ExpeditionCardSkeleton", () => ({
  ExpeditionCardSkeleton: () => (
    <div data-testid="expedition-card-skeleton" />
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionsDashboard } from "@/components/features/dashboard/ExpeditionsDashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExpedition(overrides: Partial<ExpeditionDTO> = {}): ExpeditionDTO {
  return {
    id: "trip-1",
    destination: "Paris, France",
    currentPhase: 3,
    completedPhases: 2,
    totalPhases: 6,
    coverEmoji: "\u{1F5FC}",
    startDate: "2026-06-15",
    endDate: "2026-06-25",
    status: "PLANNING",
    tripType: "international",
    destinationLat: 48.8566,
    destinationLon: 2.3522,
    checklistRequired: 5,
    checklistRequiredDone: 3,
    checklistRecommendedPending: 2,
    hasItineraryPlan: false,
    createdAt: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

const activeTrip = makeExpedition({
  id: "active-1",
  destination: "Tokyo, Japan",
  currentPhase: 3,
  completedPhases: 2,
});

const completedTrip = makeExpedition({
  id: "completed-1",
  destination: "London, UK",
  currentPhase: 6,
  completedPhases: 6,
});

const plannedTrip = makeExpedition({
  id: "planned-1",
  destination: "Buenos Aires",
  currentPhase: 1,
  completedPhases: 0,
  startDate: null,
  endDate: null,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExpeditionsDashboard", () => {
  // ─── Empty State ─────────────────────────────────────────────────────

  it("renders empty state when no expeditions", () => {
    render(<ExpeditionsDashboard expeditions={[]} />);
    expect(screen.getByTestId("expeditions-empty")).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.expeditions.emptyTitle")
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.expeditions.emptySubtitle")
    ).toBeInTheDocument();
  });

  it("empty state has CTA linking to /expedition/new", () => {
    render(<ExpeditionsDashboard expeditions={[]} />);
    const cta = screen.getByText("dashboard.expeditions.newExpedition");
    const link = cta.closest("a");
    expect(link).toHaveAttribute("href", "/expedition/new");
  });

  // ─── Loading State ───────────────────────────────────────────────────

  it("renders skeleton cards when loading", () => {
    render(<ExpeditionsDashboard expeditions={[]} isLoading />);
    expect(screen.getByTestId("expeditions-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("expedition-card-skeleton")).toHaveLength(3);
  });

  it("does not render empty state when loading", () => {
    render(<ExpeditionsDashboard expeditions={[]} isLoading />);
    expect(screen.queryByTestId("expeditions-empty")).not.toBeInTheDocument();
  });

  // ─── Grid Rendering ─────────────────────────────────────────────────

  it("renders expedition cards in a grid", () => {
    render(
      <ExpeditionsDashboard
        expeditions={[activeTrip, completedTrip, plannedTrip]}
      />
    );
    expect(screen.getByTestId("expeditions-grid")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("expedition-card-redesigned")
    ).toHaveLength(3);
  });

  it("grid has role='list' and aria-label", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const grid = screen.getByTestId("expeditions-grid");
    expect(grid).toHaveAttribute("role", "list");
    expect(grid).toHaveAttribute("aria-label");
  });

  it("each card is wrapped in a listitem role", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const listitems = screen.getAllByRole("listitem");
    expect(listitems.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Filter Chips ───────────────────────────────────────────────────

  it("renders filter chips with counts", () => {
    render(
      <ExpeditionsDashboard
        expeditions={[activeTrip, completedTrip, plannedTrip]}
      />
    );

    expect(screen.getByTestId("filter-chip-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-active")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-completed")).toBeInTheDocument();
  });

  it("filter chips have radiogroup role", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const group = screen.getByTestId("filter-chips");
    expect(group).toHaveAttribute("role", "radiogroup");
  });

  it("'all' filter is active by default", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const allChip = screen.getByTestId("filter-chip-all");
    expect(allChip).toHaveAttribute("aria-checked", "true");
  });

  it("clicking 'completed' filter shows only completed trips", () => {
    render(
      <ExpeditionsDashboard
        expeditions={[activeTrip, completedTrip, plannedTrip]}
      />
    );

    fireEvent.click(screen.getByTestId("filter-chip-completed"));

    const cards = screen.getAllByTestId("expedition-card-redesigned");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("London, UK");
  });

  it("clicking 'active' filter hides completed trips", () => {
    render(
      <ExpeditionsDashboard
        expeditions={[activeTrip, completedTrip, plannedTrip]}
      />
    );

    fireEvent.click(screen.getByTestId("filter-chip-active"));

    const cards = screen.getAllByTestId("expedition-card-redesigned");
    expect(cards).toHaveLength(2);
    expect(
      cards.find((c) => c.textContent?.includes("London, UK"))
    ).toBeUndefined();
  });

  // ─── Filtered Empty State ──────────────────────────────────────────

  it("shows filtered empty state when filter matches nothing", () => {
    const onlyActive = [activeTrip];
    render(<ExpeditionsDashboard expeditions={onlyActive} />);

    fireEvent.click(screen.getByTestId("filter-chip-completed"));

    expect(screen.getByTestId("filtered-empty")).toBeInTheDocument();
    expect(screen.getByTestId("clear-filter-btn")).toBeInTheDocument();
  });

  it("clear filter button resets to 'all'", () => {
    const onlyActive = [activeTrip];
    render(<ExpeditionsDashboard expeditions={onlyActive} />);

    fireEvent.click(screen.getByTestId("filter-chip-completed"));
    expect(screen.getByTestId("filtered-empty")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("clear-filter-btn"));
    expect(screen.queryByTestId("filtered-empty")).not.toBeInTheDocument();
    expect(
      screen.getAllByTestId("expedition-card-redesigned")
    ).toHaveLength(1);
  });

  // ─── Sort Dropdown ──────────────────────────────────────────────────

  it("renders sort dropdown with default 'newest'", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const select = screen.getByTestId("sort-dropdown") as HTMLSelectElement;
    expect(select.value).toBe("newest");
  });

  it("sort has an associated label", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const label = screen.getByLabelText(/sortLabel/i);
    expect(label).toBeInTheDocument();
  });

  it("changing sort to 'destination' reorders cards alphabetically", () => {
    render(
      <ExpeditionsDashboard
        expeditions={[activeTrip, completedTrip, plannedTrip]}
      />
    );

    const select = screen.getByTestId("sort-dropdown");
    fireEvent.change(select, { target: { value: "destination" } });

    const cards = screen.getAllByTestId("expedition-card-redesigned");
    expect(cards[0]).toHaveTextContent("Buenos Aires");
    expect(cards[1]).toHaveTextContent("London, UK");
    expect(cards[2]).toHaveTextContent("Tokyo, Japan");
  });

  it("changing sort to 'departure' orders by startDate", () => {
    const tripA = makeExpedition({
      id: "a",
      destination: "A",
      startDate: "2026-08-01",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const tripB = makeExpedition({
      id: "b",
      destination: "B",
      startDate: "2026-04-01",
      createdAt: "2026-03-01T00:00:00.000Z",
    });
    render(<ExpeditionsDashboard expeditions={[tripA, tripB]} />);

    const select = screen.getByTestId("sort-dropdown");
    fireEvent.change(select, { target: { value: "departure" } });

    const cards = screen.getAllByTestId("expedition-card-redesigned");
    expect(cards[0]).toHaveTextContent("B");
    expect(cards[1]).toHaveTextContent("A");
  });

  // ─── Live Region ──────────────────────────────────────────────────

  it("has an aria-live region announcing trip count", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const liveRegion = screen.getByTestId("live-region");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  // ─── New Expedition Button ─────────────────────────────────────────

  it("shows 'New Expedition' button on desktop", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    expect(screen.getByTestId("new-expedition-btn")).toBeInTheDocument();
  });

  it("shows FAB for mobile", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    expect(screen.getByTestId("fab-new-expedition")).toBeInTheDocument();
  });

  it("FAB has aria-label", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    const fab = screen.getByTestId("fab-new-expedition");
    expect(fab).toHaveAttribute("aria-label");
  });

  // ─── Expedition Limit ──────────────────────────────────────────────

  it("disables new expedition button when at 20 active limit", () => {
    // Create 20 active (non-completed) expeditions
    const twentyTrips = Array.from({ length: 20 }, (_, i) =>
      makeExpedition({
        id: `trip-${i}`,
        destination: `City ${i}`,
        currentPhase: 2,
        completedPhases: 1,
        createdAt: `2026-03-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      })
    );

    render(<ExpeditionsDashboard expeditions={twentyTrips} />);
    const btn = screen.getByTestId("new-expedition-btn");
    expect(btn).toBeDisabled();
  });

  it("does not count completed trips toward the 20 limit", () => {
    const trips = [
      ...Array.from({ length: 19 }, (_, i) =>
        makeExpedition({
          id: `trip-${i}`,
          destination: `City ${i}`,
          currentPhase: 2,
          completedPhases: 1,
          createdAt: `2026-03-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
        })
      ),
      makeExpedition({
        id: "completed-extra",
        destination: "Done City",
        currentPhase: 6,
        completedPhases: 6,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ];

    render(<ExpeditionsDashboard expeditions={trips} />);
    const btn = screen.getByTestId("new-expedition-btn");
    // 19 active + 1 completed = should NOT be disabled
    expect(btn).not.toBeDisabled();
  });

  // ─── Page Title ────────────────────────────────────────────────────

  it("renders page title", () => {
    render(<ExpeditionsDashboard expeditions={[activeTrip]} />);
    expect(
      screen.getByText("dashboard.expeditions.pageTitle")
    ).toBeInTheDocument();
  });
});
