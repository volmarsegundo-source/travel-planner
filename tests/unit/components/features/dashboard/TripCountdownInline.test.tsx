/**
 * Unit tests for TripCountdownInline component.
 *
 * Tests: future trip, in-progress trip, completed trip, urgent trip (<=7 days).
 * [TASK-29-011, SPEC-PROD-007 AC-001/002]
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { TripCountdownInline } from "@/components/features/dashboard/TripCountdownInline";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TripCountdownInline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows days until trip for future trip", () => {
    render(<TripCountdownInline startDate="2026-04-01" />);
    const el = screen.getByTestId("trip-countdown-inline");
    expect(el.textContent).toMatch(/expedition\.countdown\.daysUntil\[\d+\]/);
    expect(el.className).toContain("text-atlas-teal");
  });

  it("shows in progress for current trip", () => {
    render(
      <TripCountdownInline startDate="2026-03-10" endDate="2026-03-20" />
    );
    const el = screen.getByTestId("trip-countdown-inline");
    expect(el).toHaveTextContent("expedition.countdown.inProgress");
    expect(el.className).toContain("text-atlas-gold");
  });

  it("shows completed for past trip", () => {
    render(
      <TripCountdownInline startDate="2026-02-01" endDate="2026-02-10" />
    );
    const el = screen.getByTestId("trip-countdown-inline");
    expect(el).toHaveTextContent("expedition.countdown.completed");
    expect(el.className).toContain("text-muted-foreground");
  });

  it("shows urgent color for trip within 7 days", () => {
    render(<TripCountdownInline startDate="2026-03-15" />);
    const el = screen.getByTestId("trip-countdown-inline");
    expect(el.textContent).toMatch(/expedition\.countdown\.daysUntil\[\d+\]/);
    expect(el.className).toContain("text-atlas-rust");
  });

  it("renders without endDate for future trip", () => {
    render(<TripCountdownInline startDate="2026-06-01" />);
    expect(screen.getByTestId("trip-countdown-inline")).toBeInTheDocument();
  });
});
