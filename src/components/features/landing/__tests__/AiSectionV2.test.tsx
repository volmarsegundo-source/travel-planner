import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiSectionV2 } from "../AiSectionV2";

// SPEC-LANDING-LAYOUT-001: AI section must not ship fake mockup, Lisbon
// balloon, or dead "Learn how it works" CTA.

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

describe("AiSectionV2 — SPEC-LANDING-LAYOUT-001", () => {
  it("does NOT render the literal 'AI Preview' placeholder", () => {
    render(<AiSectionV2 />);
    expect(screen.queryByText("AI Preview")).not.toBeInTheDocument();
  });

  it("does NOT render the floating Lisbon prompt balloon", () => {
    render(<AiSectionV2 />);
    expect(
      screen.queryByText(/landingV2\.ai\.promptExample/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does NOT render a dead CTA button", () => {
    const { container } = render(<AiSectionV2 />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(0);
    expect(
      screen.queryByText(/landingV2\.ai\.cta$/),
    ).not.toBeInTheDocument();
  });

  it("still renders the title, description, and feature checklist", () => {
    render(<AiSectionV2 />);
    expect(screen.getByText("landingV2.ai.title")).toBeInTheDocument();
    expect(screen.getByText("landingV2.ai.description")).toBeInTheDocument();
    expect(screen.getByText("landingV2.ai.feature1")).toBeInTheDocument();
    expect(screen.getByText("landingV2.ai.feature2")).toBeInTheDocument();
    expect(screen.getByText("landingV2.ai.feature3")).toBeInTheDocument();
  });
});
