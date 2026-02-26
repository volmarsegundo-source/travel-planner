/**
 * Behavior tests for TrustSignals.
 *
 * Tests cover: rendering of badge, privacy text, and delete account link.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { TrustSignals } from "@/components/features/auth/TrustSignals";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TrustSignals", () => {
  it("renders the security badge text", () => {
    render(<TrustSignals />);

    expect(screen.getByText("trustSignals.badge")).toBeInTheDocument();
  });

  it("renders the privacy statement", () => {
    render(<TrustSignals />);

    expect(screen.getByText("trustSignals.privacy")).toBeInTheDocument();
  });

  it("renders the delete account link pointing to /account/delete", () => {
    render(<TrustSignals />);

    const link = screen.getByRole("link", { name: "trustSignals.deleteAccount" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/account/delete");
  });

  it("renders the lock icon as decorative (aria-hidden)", () => {
    render(<TrustSignals />);

    // The SVG icon should be aria-hidden to avoid redundant announcements
    const svgIcon = document.querySelector("svg[aria-hidden='true']");
    expect(svgIcon).toBeInTheDocument();
  });
});
