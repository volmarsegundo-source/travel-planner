/**
 * Unit tests for AiDisclaimer component.
 *
 * Tests cover: default rendering, custom message, accessibility attributes,
 * Info icon presence, data-testid.
 *
 * Spec ref: SPEC-PROD-016 (AI content transparency)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (values && "fallback" in values) return fullKey;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { AiDisclaimer } from "@/components/features/expedition/AiDisclaimer";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiDisclaimer", () => {
  it("renders with default translation key", () => {
    render(<AiDisclaimer />);

    const disclaimer = screen.getByTestId("ai-disclaimer");
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveTextContent("expedition.aiDisclaimer");
  });

  it("renders with custom message when provided", () => {
    render(<AiDisclaimer message="Custom AI disclaimer text" />);

    const disclaimer = screen.getByTestId("ai-disclaimer");
    expect(disclaimer).toHaveTextContent("Custom AI disclaimer text");
  });

  it("has role=note for accessibility", () => {
    render(<AiDisclaimer />);

    const disclaimer = screen.getByRole("note");
    expect(disclaimer).toBeInTheDocument();
  });

  it("renders Info icon as decorative (aria-hidden)", () => {
    render(<AiDisclaimer />);

    const disclaimer = screen.getByTestId("ai-disclaimer");
    const svg = disclaimer.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies blue info styling", () => {
    render(<AiDisclaimer />);

    const disclaimer = screen.getByTestId("ai-disclaimer");
    expect(disclaimer.className).toContain("border-atlas-info-container");
    expect(disclaimer.className).toContain("bg-atlas-info-container");
  });
});
