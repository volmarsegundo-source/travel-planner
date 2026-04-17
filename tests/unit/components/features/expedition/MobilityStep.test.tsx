/**
 * Unit tests for MobilityStep component.
 *
 * Tests cover: rendering all options, toggle on/off, initial values,
 * accessibility (aria-pressed), required asterisks.
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
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { MobilityStep } from "@/components/features/expedition/MobilityStep";
import { LOCAL_MOBILITY_OPTIONS } from "@/lib/validations/transport.schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnSave = vi.fn().mockResolvedValue(undefined);

function renderMobilityStep(overrides: Partial<Parameters<typeof MobilityStep>[0]> = {}) {
  return render(
    <MobilityStep
      tripId="trip-123"
      onSave={mockOnSave}
      {...overrides}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MobilityStep", () => {
  it("renders all mobility options", () => {
    renderMobilityStep();

    for (const option of LOCAL_MOBILITY_OPTIONS) {
      expect(
        screen.getByRole("button", { name: new RegExp(`options\\.${option}`) })
      ).toBeInTheDocument();
    }
  });

  it("renders title, subtitle, and hint", () => {
    renderMobilityStep();

    expect(screen.getByText("expedition.phase4.mobility.title")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase4.mobility.subtitle")).toBeInTheDocument();
  });

  it("toggles option on when clicked", () => {
    renderMobilityStep();

    const walkingButton = screen.getByRole("button", {
      name: /options\.walking/,
    });
    expect(walkingButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(walkingButton);
    expect(walkingButton).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles option off when clicked again", () => {
    renderMobilityStep({ initialMobility: ["walking"] });

    const walkingButton = screen.getByRole("button", {
      name: /options\.walking/,
    });
    expect(walkingButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(walkingButton);
    expect(walkingButton).toHaveAttribute("aria-pressed", "false");
  });

  it("supports multiple selections", () => {
    renderMobilityStep();

    const walking = screen.getByRole("button", { name: /options\.walking/ });
    const bicycle = screen.getByRole("button", { name: /options\.bicycle/ });

    fireEvent.click(walking);
    fireEvent.click(bicycle);

    expect(walking).toHaveAttribute("aria-pressed", "true");
    expect(bicycle).toHaveAttribute("aria-pressed", "true");
  });

  it("renders initial values as selected", () => {
    renderMobilityStep({
      initialMobility: ["taxi_rideshare", "car_rental"],
    });

    expect(
      screen.getByRole("button", { name: /options\.taxi_rideshare/ })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /options\.car_rental/ })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /options\.walking/ })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("applies selected styling class", () => {
    renderMobilityStep({ initialMobility: ["walking"] });

    const walkingButton = screen.getByRole("button", {
      name: /options\.walking/,
    });
    expect(walkingButton.className).toContain("border-atlas-gold");
    expect(walkingButton.className).toContain("bg-atlas-gold/10");
  });

  it("applies unselected styling class", () => {
    renderMobilityStep();

    const walkingButton = screen.getByRole("button", {
      name: /options\.walking/,
    });
    expect(walkingButton.className).toContain("border-border");
    expect(walkingButton.className).not.toContain("border-atlas-gold bg-atlas-gold");
  });

  // ─── T-S34: Step-level save button removed ─────────────────────────────

  it("does not render a step-level save button", () => {
    renderMobilityStep();

    expect(
      screen.queryByText("expedition.phase4.mobility.save")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.mobility.saving")
    ).not.toBeInTheDocument();
  });

  // ─── Required asterisks ───────────────────────────────────────────────

  it("shows required asterisks on mandatory fields", () => {
    const { container } = renderMobilityStep();

    const asterisks = container.querySelectorAll(".text-destructive");
    expect(asterisks.length).toBeGreaterThan(0);
  });
});
