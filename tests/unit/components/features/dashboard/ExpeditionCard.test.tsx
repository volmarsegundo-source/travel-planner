/**
 * Unit tests for ExpeditionCard component.
 *
 * Tests cover: rendering, progress bar, checklist badge visibility,
 * absence of duplicate shortcut buttons (DEBT-S18-001),
 * and removal of PhaseToolsBar (SPEC-PROD-002).
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
  hasItineraryPlan?: boolean;
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
      hasItineraryPlan={opts.hasItineraryPlan}
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

  it("renders phase progress bar", () => {
    renderCard();

    const progressBar = screen.getByTestId("dashboard-phase-progress-bar");
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

  it("does not render duplicate checklist shortcut button (DEBT-S18-001)", () => {
    renderCard({ currentPhase: 5 });

    // The old viewChecklist shortcut link should no longer exist
    expect(
      screen.queryByText("dashboard.viewChecklist")
    ).not.toBeInTheDocument();
  });

  it("does not render duplicate itinerary shortcut button (DEBT-S18-001)", () => {
    renderCard({ currentPhase: 6, hasItineraryPlan: true });

    // The old viewItinerary shortcut link should no longer exist
    expect(
      screen.queryByText("dashboard.viewItinerary")
    ).not.toBeInTheDocument();
  });

  it("does not render PhaseToolsBar (SPEC-PROD-002)", () => {
    renderCard({ currentPhase: 5 });

    // PhaseToolsBar should be completely removed from trip cards
    expect(screen.queryByTestId("phase-tools-bar")).not.toBeInTheDocument();
  });

  it("links to expedition hub", () => {
    renderCard();

    const links = screen.getAllByRole("link");
    const mainLink = links.find((l) =>
      l.getAttribute("href")?.includes("/expedition/trip-001")
    );
    expect(mainLink).toBeDefined();
  });

  it("content wrapper has pointer-events-none to allow card link clicks", () => {
    renderCard();

    // The main link should be present at z-0
    const mainLink = screen.getByRole("link", {
      name: /dashboard\.viewExpedition/,
    });
    expect(mainLink).toHaveClass("absolute", "inset-0", "z-0");

    // The content wrapper at z-10 should have pointer-events-none
    const contentWrapper = mainLink.nextElementSibling;
    expect(contentWrapper).toHaveClass("pointer-events-none");
  });
});
