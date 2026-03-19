/**
 * Unit tests for ExpeditionsList component.
 * SPEC-ARCH-004: Navigation restructure — expeditions page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
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

vi.mock("@/components/features/dashboard/ExpeditionCard", () => ({
  ExpeditionCard: ({ destination }: { destination: string }) => (
    <div data-testid="expedition-card">{destination}</div>
  ),
}));

import { ExpeditionsList } from "@/components/features/dashboard/ExpeditionsList";

describe("ExpeditionsList", () => {
  const sampleExpedition = {
    id: "trip-1",
    destination: "Tokyo",
    currentPhase: 2,
    completedPhases: [1],
    totalPhases: 6,
    coverEmoji: "🗼",
    checklistRequired: 5,
    checklistRequiredDone: 3,
    checklistRecommendedPending: 2,
    hasItineraryPlan: false,
  };

  it("renders empty state when no expeditions", () => {
    render(<ExpeditionsList expeditions={[]} />);
    expect(screen.getByTestId("expeditions-empty")).toBeInTheDocument();
    expect(screen.getByText("dashboard.emptyState.title")).toBeInTheDocument();
  });

  it("renders expedition cards when expeditions exist", () => {
    render(<ExpeditionsList expeditions={[sampleExpedition]} />);
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByTestId("expedition-card")).toBeInTheDocument();
  });

  it("renders multiple expedition cards", () => {
    const expeditions = [
      sampleExpedition,
      { ...sampleExpedition, id: "trip-2", destination: "Paris" },
    ];
    render(<ExpeditionsList expeditions={expeditions} />);
    expect(screen.getAllByTestId("expedition-card")).toHaveLength(2);
  });

  it("shows new expedition button when expeditions exist", () => {
    render(<ExpeditionsList expeditions={[sampleExpedition]} />);
    expect(screen.getByText("dashboard.newExpedition")).toBeInTheDocument();
  });

  it("links to /expedition/new in empty state", () => {
    render(<ExpeditionsList expeditions={[]} />);
    const link = screen.getByText("dashboard.emptyState.cta").closest("a");
    expect(link).toHaveAttribute("href", "/expedition/new");
  });

  it("renders title header with expeditions", () => {
    render(<ExpeditionsList expeditions={[sampleExpedition]} />);
    expect(screen.getByText("dashboard.title")).toBeInTheDocument();
  });
});
