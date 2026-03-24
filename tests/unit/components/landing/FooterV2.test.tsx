/**
 * Tests for FooterV2 component.
 *
 * Covers: LGPD compliance text, correct background token usage,
 * copyright with dynamic year, newsletter simulation, and link rendering.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { FooterV2 } from "@/components/features/landing/FooterV2";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FooterV2", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the LGPD compliance text", () => {
    render(<FooterV2 />);

    expect(screen.getByText("landingV2.footer.lgpd")).toBeInTheDocument();
  });

  it("renders copyright with dynamic year", () => {
    const { container } = render(<FooterV2 />);

    const currentYear = new Date().getFullYear();
    // Find the specific <p> with copyright text — it contains both the year and the copyright key
    const copyrightEl = Array.from(container.querySelectorAll("p")).find(
      (p) =>
        p.textContent?.includes(`${currentYear}`) &&
        p.textContent?.includes("landingV2.footer.copyright"),
    );
    expect(copyrightEl).toBeTruthy();
  });

  it("has bg-atlas-primary background on footer element", () => {
    const { container } = render(<FooterV2 />);

    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("bg-atlas-primary");
    // Must NOT use atlas-primary-container as background
    expect(footer?.className).not.toMatch(/\bbg-atlas-primary-container\b/);
  });

  it("renders the Atlas logo text", () => {
    render(<FooterV2 />);

    expect(screen.getByText("Atlas")).toBeInTheDocument();
  });

  it("renders explore section links", () => {
    render(<FooterV2 />);

    expect(screen.getByText("landingV2.footer.destinationGuides")).toBeInTheDocument();
    expect(screen.getByText("landingV2.footer.travelInsurance")).toBeInTheDocument();
    expect(screen.getByText("landingV2.footer.blog")).toBeInTheDocument();
  });

  it("renders company section links", () => {
    render(<FooterV2 />);

    expect(screen.getByText("landingV2.footer.about")).toBeInTheDocument();
    expect(screen.getByText("landingV2.footer.contact")).toBeInTheDocument();
    expect(screen.getByText("landingV2.footer.privacy")).toBeInTheDocument();
  });

  it("renders newsletter input with sr-only label", () => {
    render(<FooterV2 />);

    const input = screen.getByLabelText("landingV2.footer.emailLabel");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
  });

  it("shows success message after newsletter submit", async () => {
    render(<FooterV2 />);

    const input = screen.getByLabelText("landingV2.footer.emailLabel");
    const submitButton = screen.getByRole("button", { name: "landingV2.footer.send" });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    // Advance past simulated 500ms delay
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("landingV2.footer.newsletterSuccess")).toBeInTheDocument();
  });

  it("hides success message after 5 seconds", async () => {
    render(<FooterV2 />);

    const input = screen.getByLabelText("landingV2.footer.emailLabel");
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "landingV2.footer.send" }));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("landingV2.footer.newsletterSuccess")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("landingV2.footer.newsletterSuccess")).not.toBeInTheDocument();
  });

  it("clears the email input after successful submit", async () => {
    render(<FooterV2 />);

    const input = screen.getByLabelText("landingV2.footer.emailLabel") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "landingV2.footer.send" }));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(input.value).toBe("");
  });

  it("has border-t with atlas-primary-container color", () => {
    const { container } = render(<FooterV2 />);

    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("border-atlas-primary-container");
  });

  it("newsletter success message has aria-live polite", async () => {
    render(<FooterV2 />);

    const input = screen.getByLabelText("landingV2.footer.emailLabel");
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "landingV2.footer.send" }));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const successMsg = screen.getByText("landingV2.footer.newsletterSuccess");
    expect(successMsg).toHaveAttribute("aria-live", "polite");
  });
});
