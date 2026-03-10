/**
 * Unit tests for MobilityStep component.
 *
 * Tests cover: rendering all options, toggle on/off, save with selected items,
 * initial values, and accessibility (aria-pressed).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${key}[${suffix}]`;
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

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
    expect(screen.getByText("hint")).toBeInTheDocument();
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

  it("calls onSave with selected items", async () => {
    renderMobilityStep();

    fireEvent.click(
      screen.getByRole("button", { name: /options\.public_transit/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /options\.walking/ })
    );

    const saveButton = screen.getByRole("button", { name: "save" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(["public_transit", "walking"]);
    });
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

  it("shows saving state when saving prop is true", () => {
    renderMobilityStep({ saving: true });

    const saveButton = screen.getByRole("button", { name: "saving" });
    expect(saveButton).toBeDisabled();
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
});
