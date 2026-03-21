/**
 * Unit tests for ExpeditionCardRedesigned component.
 *
 * Tests cover: status badge rendering, CTA text, CTA href,
 * date display, destination truncation, progress bar, skeleton respect,
 * keyboard navigation, accessibility, quick-access links.
 * Updated Sprint 31: Card uses overlay pattern (div root, Link overlay).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionCardRedesigned } from "@/components/features/dashboard/ExpeditionCardRedesigned";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExpedition(overrides: Partial<ExpeditionDTO> = {}): ExpeditionDTO {
  return {
    id: "trip-1",
    destination: "Paris, France",
    currentPhase: 3,
    completedPhases: [1, 2],
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
    hasChecklist: false,
    hasGuide: false,
    hasLogistics: false,
    ...overrides,
  };
}

function renderCard(overrides: Partial<ExpeditionDTO> = {}) {
  return render(
    <ExpeditionCardRedesigned expedition={makeExpedition(overrides)} />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExpeditionCardRedesigned", () => {
  // ─── Basic Rendering ─────────────────────────────────────────────────

  it("renders destination name", () => {
    renderCard();
    expect(screen.getByTestId("card-destination")).toHaveTextContent(
      "Paris, France"
    );
  });

  it("renders cover emoji", () => {
    renderCard();
    expect(screen.getByText("\u{1F5FC}")).toBeInTheDocument();
  });

  // ─── Status Badge ───────────────────────────────────────────────────

  it("shows 'Active' badge for active trip", () => {
    renderCard({ currentPhase: 3, completedPhases: [1, 2] });
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("statusActive");
  });

  it("shows 'Completed' badge for completed trip", () => {
    renderCard({ currentPhase: 6, completedPhases: [1, 2, 3, 4, 5, 6] });
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("statusCompleted");
  });

  it("shows 'Planned' badge for phase-1 trip", () => {
    renderCard({ currentPhase: 1, completedPhases: [], startDate: null });
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("statusPlanned");
  });

  it("shows 'Overdue' badge for past-start-date trip", () => {
    renderCard({
      currentPhase: 2,
      completedPhases: [1],
      startDate: "2020-01-01",
      endDate: "2020-01-10",
    });
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("statusOverdue");
  });

  // ─── CTA Labels ────────────────────────────────────────────────────

  it("shows 'Continue' CTA for active trip", () => {
    renderCard({ currentPhase: 3, completedPhases: [1, 2] });
    expect(screen.getByTestId("card-cta")).toHaveTextContent("ctaContinue");
  });

  it("shows 'Start' CTA for planned trip", () => {
    renderCard({ currentPhase: 1, completedPhases: [], startDate: null });
    expect(screen.getByTestId("card-cta")).toHaveTextContent("ctaStart");
  });

  it("shows 'View Summary' CTA for completed trip", () => {
    renderCard({ currentPhase: 6, completedPhases: [1, 2, 3, 4, 5, 6] });
    expect(screen.getByTestId("card-cta")).toHaveTextContent("ctaViewSummary");
  });

  // ─── CTA Href ──────────────────────────────────────────────────────

  it("overlay link targets expedition hub for active trip", () => {
    renderCard({ currentPhase: 3, completedPhases: [1, 2] });
    const card = screen.getByTestId("expedition-card");
    const link = card.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1");
  });

  it("overlay link targets summary for completed trip", () => {
    renderCard({ currentPhase: 6, completedPhases: [1, 2, 3, 4, 5, 6] });
    const card = screen.getByTestId("expedition-card");
    const link = card.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1/summary");
  });

  // ─── Dates ─────────────────────────────────────────────────────────

  it("renders formatted dates when provided", () => {
    renderCard({ startDate: "2026-06-15", endDate: "2026-06-25" });
    expect(screen.getByTestId("card-dates")).toBeInTheDocument();
    expect(screen.getByTestId("card-dates")).toHaveTextContent("2026-06-15");
    expect(screen.getByTestId("card-dates")).toHaveTextContent("2026-06-25");
  });

  it("shows 'Dates not set' when no dates", () => {
    renderCard({ startDate: null, endDate: null });
    expect(screen.getByTestId("card-no-dates")).toBeInTheDocument();
    expect(screen.getByTestId("card-no-dates")).toHaveTextContent("noDates");
  });

  // ─── Phase Label ───────────────────────────────────────────────────

  it("renders phase label", () => {
    renderCard({ currentPhase: 4 });
    const label = screen.getByTestId("card-phase-label");
    expect(label).toHaveTextContent("phaseLabel");
  });

  // ─── Countdown ─────────────────────────────────────────────────────

  it("shows countdown when startDate is present", () => {
    renderCard({ startDate: "2027-01-01" });
    expect(screen.getByTestId("trip-countdown-inline")).toBeInTheDocument();
  });

  it("hides countdown when startDate is null", () => {
    renderCard({ startDate: null });
    expect(
      screen.queryByTestId("trip-countdown-inline")
    ).not.toBeInTheDocument();
  });

  // ─── Progress Bar ──────────────────────────────────────────────────

  it("renders phase progress bar", () => {
    renderCard();
    expect(
      screen.getByTestId("dashboard-phase-progress-bar")
    ).toBeInTheDocument();
  });

  // ─── Accessibility ─────────────────────────────────────────────────

  it("overlay link has aria-label with destination and status", () => {
    renderCard();
    const card = screen.getByTestId("expedition-card");
    const link = card.querySelector("a") as HTMLAnchorElement;
    expect(link).toHaveAttribute("aria-label");
    const label = link.getAttribute("aria-label")!;
    expect(label).toContain("Paris, France");
  });

  it("cover emoji is hidden from screen readers", () => {
    renderCard();
    const emoji = screen.getByText("\u{1F5FC}");
    expect(emoji).toHaveAttribute("aria-hidden", "true");
  });

  // ─── Left Border Accent ────────────────────────────────────────────

  it("active card has blue left border", () => {
    renderCard({ currentPhase: 3, completedPhases: [1, 2] });
    const card = screen.getByTestId("expedition-card");
    expect(card.className).toContain("border-l-blue-500");
  });

  it("completed card has green left border", () => {
    renderCard({ currentPhase: 6, completedPhases: [1, 2, 3, 4, 5, 6] });
    const card = screen.getByTestId("expedition-card");
    expect(card.className).toContain("border-l-green-500");
  });

  it("planned card has gray left border", () => {
    renderCard({ currentPhase: 1, completedPhases: [], startDate: null });
    const card = screen.getByTestId("expedition-card");
    expect(card.className).toContain("border-l-gray-400");
  });

  // ─── Card structure (Sprint 31 overlay pattern) ───────────────────

  it("card root is a DIV element (not a link)", () => {
    renderCard();
    const card = screen.getByTestId("expedition-card");
    expect(card.tagName).toBe("DIV");
  });

  // ─── Quick-access links ───────────────────────────────────────────

  it("shows no quick-access row when all flags are false and phase < 2", () => {
    renderCard({ hasChecklist: false, hasGuide: false, hasLogistics: false, hasItineraryPlan: false, currentPhase: 1, completedPhases: [] });
    expect(screen.queryByTestId("quick-access-row")).not.toBeInTheDocument();
  });

  it("shows summary quick-access link when currentPhase >= 2", () => {
    renderCard({ hasChecklist: false, hasGuide: false, hasLogistics: false, hasItineraryPlan: false, currentPhase: 2 });
    expect(screen.getByTestId("quick-access-summary")).toBeInTheDocument();
    const link = screen.getByTestId("quick-access-summary") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1/summary");
  });

  it("shows checklist quick-access link when hasChecklist is true", () => {
    renderCard({ hasChecklist: true });
    expect(screen.getByTestId("quick-access-checklist")).toBeInTheDocument();
    const link = screen.getByTestId("quick-access-checklist") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1/phase-3");
  });

  it("shows guide quick-access link when hasGuide is true", () => {
    renderCard({ hasGuide: true });
    expect(screen.getByTestId("quick-access-guide")).toBeInTheDocument();
    const link = screen.getByTestId("quick-access-guide") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1/phase-5");
  });

  it("shows itinerary quick-access link when hasItineraryPlan is true", () => {
    renderCard({ hasItineraryPlan: true });
    expect(screen.getByTestId("quick-access-itinerary")).toBeInTheDocument();
    const link = screen.getByTestId("quick-access-itinerary") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1/phase-6");
  });

  it("shows report link only when all three content flags are true", () => {
    renderCard({ hasChecklist: true, hasGuide: true, hasItineraryPlan: true });
    expect(screen.getByTestId("quick-access-report")).toBeInTheDocument();
    const link = screen.getByTestId("quick-access-report") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/expedition/trip-1/report");
  });

  it("does NOT show report link when only two content flags are true", () => {
    renderCard({ hasChecklist: true, hasGuide: true, hasItineraryPlan: false });
    expect(screen.queryByTestId("quick-access-report")).not.toBeInTheDocument();
  });

  it("quick-access nav has aria-label with destination", () => {
    renderCard({ hasChecklist: true });
    const nav = screen.getByTestId("quick-access-row");
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveAttribute("aria-label");
    const label = nav.getAttribute("aria-label")!;
    expect(label).toContain("Paris, France");
  });
});
