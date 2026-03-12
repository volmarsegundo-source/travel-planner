/**
 * Unit tests for ExpeditionCard component.
 *
 * Tests cover: rendering, progress bar, checklist badge visibility,
 * travel dates, phase count text, completed badge, keyboard navigation,
 * and removal of PhaseToolsBar (SPEC-PROD-002).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
  completedPhases?: number;
  checklistRequired?: number;
  checklistRequiredDone?: number;
  checklistRecommendedPending?: number;
  hasItineraryPlan?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  destinationLat?: number | null;
  destinationLon?: number | null;
}

function renderCard(opts: RenderOptions = {}) {
  return render(
    <ExpeditionCard
      tripId="trip-001"
      destination="Paris, France"
      currentPhase={opts.currentPhase ?? 3}
      completedPhases={opts.completedPhases ?? 2}
      totalPhases={8}
      coverEmoji="🗼"
      checklistRequired={opts.checklistRequired ?? 5}
      checklistRequiredDone={opts.checklistRequiredDone ?? 2}
      checklistRecommendedPending={opts.checklistRecommendedPending ?? 1}
      hasItineraryPlan={opts.hasItineraryPlan}
      startDate={opts.startDate ?? null}
      endDate={opts.endDate ?? null}
      destinationLat={opts.destinationLat ?? null}
      destinationLon={opts.destinationLon ?? null}
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
    expect(screen.getByTestId("phase-count-text")).toBeInTheDocument();
  });

  it("renders phase progress bar", () => {
    renderCard();

    const progressBar = screen.getByTestId("dashboard-phase-progress-bar");
    expect(progressBar).toBeInTheDocument();
  });

  // ─── Travel dates ───────────────────────────────────────────────────────

  it("displays travel dates when provided", () => {
    renderCard({ startDate: "2026-04-10", endDate: "2026-04-20" });

    const dates = screen.getByTestId("travel-dates");
    expect(dates).toBeInTheDocument();
    expect(dates.textContent).toContain("2026-04-10");
    expect(dates.textContent).toContain("2026-04-20");
  });

  it("does not display travel dates when not provided", () => {
    renderCard({ startDate: null, endDate: null });

    expect(screen.queryByTestId("travel-dates")).not.toBeInTheDocument();
  });

  // ─── Phase count text ──────────────────────────────────────────────────

  it("displays phase count text with current phase and completed count", () => {
    renderCard({ currentPhase: 4, completedPhases: 3 });

    const phaseText = screen.getByTestId("phase-count-text");
    expect(phaseText).toBeInTheDocument();
    // Mock translation: dashboard.phasesCompleted[4,8,3]
    expect(phaseText.textContent).toContain("phasesCompleted");
  });

  // ─── Completed badge ──────────────────────────────────────────────────

  it("shows Completed badge when all phases are completed", () => {
    renderCard({ currentPhase: 8, completedPhases: 8 });

    const badge = screen.getByTestId("completed-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("dashboard.completed");
  });

  it("does not show Completed badge when expedition is in progress", () => {
    renderCard({ currentPhase: 3, completedPhases: 2 });

    expect(screen.queryByTestId("completed-badge")).not.toBeInTheDocument();
  });

  // ─── Keyboard navigation ──────────────────────────────────────────────

  it("card has tabIndex for keyboard focus", () => {
    renderCard();

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("tabindex", "0");
  });

  it("Enter key on card triggers link click", () => {
    renderCard();

    const article = screen.getByRole("article");
    const link = article.querySelector("a");
    const clickSpy = vi.spyOn(link!, "click");

    fireEvent.keyDown(article, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();
  });

  // ─── Checklist badge ──────────────────────────────────────────────────

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

  // ─── Removed features ────────────────────────────────────────────────

  it("does not render duplicate checklist shortcut button (DEBT-S18-001)", () => {
    renderCard({ currentPhase: 5 });

    expect(
      screen.queryByText("dashboard.viewChecklist")
    ).not.toBeInTheDocument();
  });

  it("does not render duplicate itinerary shortcut button (DEBT-S18-001)", () => {
    renderCard({ currentPhase: 6, hasItineraryPlan: true });

    expect(
      screen.queryByText("dashboard.viewItinerary")
    ).not.toBeInTheDocument();
  });

  it("does not render PhaseToolsBar (SPEC-PROD-002)", () => {
    renderCard({ currentPhase: 5 });

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

  // ─── Map pin ───────────────────────────────────────────────────────

  it("shows map pin when coordinates are present", () => {
    renderCard({ destinationLat: 48.8566, destinationLon: 2.3522 });
    expect(screen.getByTestId("map-pin")).toBeInTheDocument();
  });

  it("hides map pin when coordinates are null", () => {
    renderCard({ destinationLat: null, destinationLon: null });
    expect(screen.queryByTestId("map-pin")).not.toBeInTheDocument();
  });

  it("hides map pin when only lat is present", () => {
    renderCard({ destinationLat: 48.8566, destinationLon: null });
    expect(screen.queryByTestId("map-pin")).not.toBeInTheDocument();
  });

  // ─── Countdown inline ─────────────────────────────────────────────

  it("shows trip countdown when startDate is present", () => {
    renderCard({ startDate: "2026-06-01" });
    expect(screen.getByTestId("trip-countdown-inline")).toBeInTheDocument();
  });

  it("hides trip countdown when startDate is null", () => {
    renderCard({ startDate: null });
    expect(screen.queryByTestId("trip-countdown-inline")).not.toBeInTheDocument();
  });

  // ─── Card link ─────────────────────────────────────────────────────

  it("content wrapper has pointer-events-none to allow card link clicks", () => {
    renderCard();

    const mainLink = screen.getByRole("link", {
      name: /dashboard\.viewExpedition/,
    });
    expect(mainLink).toHaveClass("absolute", "inset-0", "z-0");

    const contentWrapper = mainLink.nextElementSibling;
    expect(contentWrapper).toHaveClass("pointer-events-none");
  });
});
