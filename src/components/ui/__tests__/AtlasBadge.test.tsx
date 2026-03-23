import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AtlasBadge } from "../AtlasBadge";

describe("AtlasBadge", () => {
  // ─── Status variant ─────────────────────────────────────────────────────────
  it("renders status badge with role=status", () => {
    render(<AtlasBadge variant="status" color="success">Active</AtlasBadge>);
    expect(screen.getByRole("status")).toHaveTextContent("Active");
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "status");
  });

  it.each(["success", "warning", "error", "info"] as const)(
    "renders status color=%s",
    (color) => {
      render(<AtlasBadge variant="status" color={color}>Label</AtlasBadge>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    },
  );

  // ─── Rank variant ──────────────────────────────────────────────────────────
  it("renders rank badge with rank-specific styling", () => {
    render(<AtlasBadge variant="rank" rankKey="explorador">Explorer</AtlasBadge>);
    const badge = screen.getByText("Explorer");
    expect(badge).toHaveAttribute("data-variant", "rank");
  });

  it("falls back to novato style for unknown rank", () => {
    render(<AtlasBadge variant="rank" rankKey="unknown">Unknown</AtlasBadge>);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  // ─── PA variant ────────────────────────────────────────────────────────────
  it("renders PA badge with points and sparkle icon", () => {
    render(<AtlasBadge variant="pa" points={180} />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "180 PA");
    expect(badge).toHaveTextContent("180 PA");
    // Has SVG sparkle icon
    expect(badge.querySelector("svg")).toBeInTheDocument();
  });

  // ─── Category overline variant ─────────────────────────────────────────────
  it("renders category overline badge", () => {
    render(<AtlasBadge variant="category-overline">STATUS DO ROTEIRO</AtlasBadge>);
    expect(screen.getByText("STATUS DO ROTEIRO")).toBeInTheDocument();
  });

  // ─── Counter variant ───────────────────────────────────────────────────────
  it("renders counter badge with number", () => {
    render(<AtlasBadge variant="counter" count={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("caps counter at 99+", () => {
    render(<AtlasBadge variant="counter" count={150} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  // ─── AI tip variant ────────────────────────────────────────────────────────
  it("renders AI tip badge with icon", () => {
    const { container } = render(<AtlasBadge variant="ai-tip">DICA DO ATLAS</AtlasBadge>);
    expect(screen.getByText("DICA DO ATLAS")).toBeInTheDocument();
    // Has AI icon SVG
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  // ─── Notification variant (dot) ────────────────────────────────────────────
  it("renders notification dot when count=0", () => {
    render(<AtlasBadge variant="notification" count={0} />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "New notification");
    // Dot should not have text content
    expect(badge.textContent).toBe("");
  });

  // ─── Notification variant (number) ─────────────────────────────────────────
  it("renders notification badge with count", () => {
    render(<AtlasBadge variant="notification" count={5} />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "5 notifications");
    expect(badge).toHaveTextContent("5");
  });

  it("caps notification at 99+", () => {
    render(<AtlasBadge variant="notification" count={200} />);
    expect(screen.getByRole("status")).toHaveTextContent("99+");
  });

  // ─── Size variants ─────────────────────────────────────────────────────────
  it.each(["sm", "md"] as const)("renders size=%s", (size) => {
    render(<AtlasBadge variant="status" color="info" size={size}>Sized</AtlasBadge>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
