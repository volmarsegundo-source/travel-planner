/**
 * Unit tests for PhaseToolsBar component.
 *
 * Tests cover: rendering available/coming_soon tools, empty state,
 * correct links, lock icon, and aria-labels.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string) =>
      key,
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

import { PhaseToolsBar } from "@/components/features/dashboard/PhaseToolsBar";
import type { PhaseTool } from "@/lib/engines/phase-config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const availableTool: PhaseTool = {
  key: "checklist",
  iconName: "CheckSquare",
  href: (tripId) => `/expedition/${tripId}/phase-3`,
  status: "available",
  labelKey: "dashboard.tools.checklist",
};

const comingSoonTool: PhaseTool = {
  key: "accommodation",
  iconName: "Building2",
  href: () => "#",
  status: "coming_soon",
  labelKey: "dashboard.tools.accommodation",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PhaseToolsBar", () => {
  it("renders nothing when tools array is empty", () => {
    const { container } = render(
      <PhaseToolsBar tools={[]} tripId="trip-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders available tool as a link with correct href", () => {
    render(
      <PhaseToolsBar tools={[availableTool]} tripId="trip-123" />
    );

    const link = screen.getByRole("link", {
      name: /dashboard\.tools\.checklist/,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/expedition/trip-123/phase-3");
  });

  it("renders coming_soon tool as a span (not a link)", () => {
    render(
      <PhaseToolsBar tools={[comingSoonTool]} tripId="trip-1" />
    );

    // Should not be a link
    expect(
      screen.queryByRole("link", { name: /dashboard\.tools\.accommodation/ })
    ).not.toBeInTheDocument();

    // Should render as span with coming soon label
    const badge = screen.getByLabelText(
      /dashboard\.tools\.accommodation.*dashboard\.tools\.comingSoon/
    );
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("opacity-60");
  });

  it("renders multiple tools", () => {
    render(
      <PhaseToolsBar
        tools={[availableTool, comingSoonTool]}
        tripId="trip-1"
      />
    );

    expect(screen.getByText("dashboard.tools.checklist")).toBeInTheDocument();
    expect(screen.getByText("dashboard.tools.accommodation")).toBeInTheDocument();
  });

  it("available tool has pointer-events-auto class", () => {
    render(
      <PhaseToolsBar tools={[availableTool]} tripId="trip-1" />
    );

    const link = screen.getByRole("link", {
      name: /dashboard\.tools\.checklist/,
    });
    expect(link).toHaveClass("pointer-events-auto");
  });

  it("renders the tools bar container with data-testid", () => {
    render(
      <PhaseToolsBar tools={[availableTool]} tripId="trip-1" />
    );

    expect(screen.getByTestId("phase-tools-bar")).toBeInTheDocument();
  });
});
