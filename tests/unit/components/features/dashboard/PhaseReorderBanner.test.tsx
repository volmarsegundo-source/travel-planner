/**
 * Unit tests for PhaseReorderBanner component.
 *
 * Tests cover: render when flag ON, hidden when flag OFF,
 * hidden when already dismissed, dismiss persists to localStorage,
 * ARIA attributes, keyboard accessibility.
 *
 * Spec ref: SPEC-UX-REORDER-PHASES §9.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockIsPhaseReorderEnabled = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/flags/phase-reorder", () => ({
  isPhaseReorderEnabled: mockIsPhaseReorderEnabled,
}));

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) => {
      const map: Record<string, string> = {
        "phaseReorderBanner.message":
          "We reorganized the phases. Your progress is preserved.",
        "phaseReorderBanner.dismiss": "Got it",
        "phaseReorderBanner.dismissAriaLabel":
          "Got it, close the phase reorganization notice",
        "phaseReorderBanner.learnMore": "See what changed",
        "phaseReorderBanner.learnMoreHref": "/help/phase-reorder",
      };
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return map[fullKey] ?? fullKey;
    },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { PhaseReorderBanner } from "@/components/features/dashboard/PhaseReorderBanner";

const DISMISS_KEY = "atlas_phase_reorder_banner_dismissed";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PhaseReorderBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders nothing when flag is OFF", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(false);
    const { container } = render(<PhaseReorderBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner when flag is ON and not dismissed", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    render(<PhaseReorderBanner />);
    expect(screen.getByTestId("phase-reorder-banner")).toBeInTheDocument();
    expect(screen.getByTestId("phase-reorder-banner-message")).toBeInTheDocument();
  });

  it("renders nothing when flag is ON but already dismissed", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    localStorage.setItem(DISMISS_KEY, "1");
    const { container } = render(<PhaseReorderBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("dismisses the banner on button click and persists to localStorage", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    render(<PhaseReorderBanner />);
    const dismissBtn = screen.getByTestId("phase-reorder-banner-dismiss");
    fireEvent.click(dismissBtn);
    expect(screen.queryByTestId("phase-reorder-banner")).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISS_KEY)).toBe("1");
  });

  it("has role=status and aria-live=polite", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    render(<PhaseReorderBanner />);
    const banner = screen.getByTestId("phase-reorder-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("dismiss button has correct aria-label", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    render(<PhaseReorderBanner />);
    const dismissBtn = screen.getByTestId("phase-reorder-banner-dismiss");
    expect(dismissBtn).toHaveAttribute(
      "aria-label",
      "Got it, close the phase reorganization notice"
    );
  });

  it("renders learn-more link with correct href", () => {
    mockIsPhaseReorderEnabled.mockReturnValue(true);
    render(<PhaseReorderBanner />);
    const link = screen.getByTestId("phase-reorder-banner-learn-more");
    expect(link).toHaveAttribute("href", "/help/phase-reorder");
  });
});
