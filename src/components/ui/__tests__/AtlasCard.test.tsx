import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AtlasCard } from "../AtlasCard";

describe("AtlasCard", () => {
  // ─── Renders without error ──────────────────────────────────────────────────
  it("renders children content", () => {
    render(<AtlasCard>Card body content</AtlasCard>);
    expect(screen.getByText("Card body content")).toBeInTheDocument();
  });

  // ─── All 4 variants ────────────────────────────────────────────────────────
  it.each(["base", "elevated", "dark", "interactive"] as const)(
    "renders variant=%s",
    (variant) => {
      render(<AtlasCard variant={variant}>Content</AtlasCard>);
      const card = screen.getByText("Content").closest("[data-slot='atlas-card']");
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute("data-variant", variant);
    },
  );

  // ─── Header slot ───────────────────────────────────────────────────────────
  it("renders header when provided", () => {
    render(
      <AtlasCard header={<h2>Card Title</h2>}>Body</AtlasCard>,
    );
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  // ─── Footer slot ───────────────────────────────────────────────────────────
  it("renders footer when provided", () => {
    render(
      <AtlasCard footer={<button>Action</button>}>Body</AtlasCard>,
    );
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  // ─── No header/footer when not provided ─────────────────────────────────────
  it("does not render header/footer slots when not provided", () => {
    const { container } = render(<AtlasCard>Body only</AtlasCard>);
    expect(container.querySelector("[data-slot='atlas-card-header']")).not.toBeInTheDocument();
    expect(container.querySelector("[data-slot='atlas-card-footer']")).not.toBeInTheDocument();
  });

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  it("renders skeleton when loading=true", () => {
    const { container } = render(<AtlasCard loading>Should not appear</AtlasCard>);
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
    // Skeleton has aria-hidden
    const skeleton = container.querySelector("[aria-hidden='true']");
    expect(skeleton).toBeInTheDocument();
  });

  // ─── Renders body content, not skeleton, when loading=false ─────────────────
  it("renders content when loading=false", () => {
    render(<AtlasCard loading={false}>Visible content</AtlasCard>);
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  // ─── Additional className merges ───────────────────────────────────────────
  it("merges custom className", () => {
    render(<AtlasCard className="my-custom-class">Content</AtlasCard>);
    const card = screen.getByText("Content").closest("[data-slot='atlas-card']");
    expect(card?.className).toContain("my-custom-class");
  });

  // ─── data-slot attribute ───────────────────────────────────────────────────
  it("has data-slot=atlas-card", () => {
    render(<AtlasCard>Content</AtlasCard>);
    const card = screen.getByText("Content").closest("[data-slot='atlas-card']");
    expect(card).toHaveAttribute("data-slot", "atlas-card");
  });
});
