/**
 * Unit tests for ExpeditionCard component.
 *
 * Tests cover: rendering, progress bar, checklist badge visibility
 * based on currentPhase threshold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionCard } from "@/components/features/dashboard/ExpeditionCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RenderOptions {
  currentPhase?: number;
  checklistRequired?: number;
  checklistRequiredDone?: number;
  checklistRecommendedPending?: number;
}

function renderCard(opts: RenderOptions = {}) {
  return render(
    <ExpeditionCard
      tripId="trip-001"
      destination="Paris, France"
      currentPhase={opts.currentPhase ?? 3}
      completedPhases={2}
      totalPhases={8}
      coverEmoji="🗼"
      checklistRequired={opts.checklistRequired ?? 5}
      checklistRequiredDone={opts.checklistRequiredDone ?? 2}
      checklistRecommendedPending={opts.checklistRecommendedPending ?? 1}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExpeditionCard", () => {
  it("renders destination and phase info", () => {
    renderCard();

    expect(screen.getByText("Paris, France")).toBeInTheDocument();
    expect(
      screen.getByText(/dashboard\.currentPhase/)
    ).toBeInTheDocument();
  });

  it("renders progress bar", () => {
    renderCard();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("shows checklist badge when currentPhase >= 3", () => {
    renderCard({ currentPhase: 3, checklistRequired: 5, checklistRequiredDone: 2 });

    expect(
      screen.getByText(/dashboard\.checklist\.items/)
    ).toBeInTheDocument();
  });

  it("shows checklist badge when currentPhase is 5 (past phase 3)", () => {
    renderCard({ currentPhase: 5, checklistRequired: 5, checklistRequiredDone: 5 });

    expect(
      screen.getByText(/dashboard\.checklist\.items/)
    ).toBeInTheDocument();
  });

  it("hides checklist badge when currentPhase < 3", () => {
    renderCard({ currentPhase: 2, checklistRequired: 5 });

    expect(
      screen.queryByText(/dashboard\.checklist\.items/)
    ).not.toBeInTheDocument();
  });

  it("hides checklist badge when checklistRequired is 0", () => {
    renderCard({ currentPhase: 3, checklistRequired: 0 });

    expect(
      screen.queryByText(/dashboard\.checklist\.items/)
    ).not.toBeInTheDocument();
  });

  it("shows itinerary badge when hasItineraryPlan is true", () => {
    render(
      <ExpeditionCard
        tripId="trip-001"
        destination="Paris, France"
        currentPhase={6}
        completedPhases={5}
        totalPhases={8}
        coverEmoji="🗼"
        checklistRequired={5}
        checklistRequiredDone={5}
        checklistRecommendedPending={0}
        hasItineraryPlan={true}
      />
    );

    expect(
      screen.getByText("dashboard.itineraryGenerated")
    ).toBeInTheDocument();
  });

  it("hides itinerary badge when hasItineraryPlan is false", () => {
    renderCard();

    expect(
      screen.queryByText("dashboard.itineraryGenerated")
    ).not.toBeInTheDocument();
  });

  it("links to expedition hub", () => {
    renderCard();

    const links = screen.getAllByRole("link");
    const mainLink = links.find((l) =>
      l.getAttribute("href")?.includes("/expedition/trip-001")
    );
    expect(mainLink).toBeDefined();
  });
});
