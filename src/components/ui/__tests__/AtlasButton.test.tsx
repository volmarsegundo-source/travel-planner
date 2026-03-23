import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AtlasButton } from "../AtlasButton";

describe("AtlasButton", () => {
  // ─── Renders without error ──────────────────────────────────────────────────
  it("renders children text", () => {
    render(<AtlasButton>Click me</AtlasButton>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  // ─── All 7 variants render ─────────────────────────────────────────────────
  it.each([
    "primary",
    "primary-dark",
    "secondary",
    "ghost",
    "glass",
    "icon-only",
    "danger",
  ] as const)("renders variant=%s without error", (variant) => {
    render(<AtlasButton variant={variant}>Label</AtlasButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-variant", variant);
  });

  // ─── All 3 sizes render ────────────────────────────────────────────────────
  it.each(["sm", "md", "lg"] as const)("renders size=%s", (size) => {
    render(<AtlasButton size={size}>Label</AtlasButton>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", size);
  });

  // ─── Disabled state ────────────────────────────────────────────────────────
  it("applies disabled state correctly", () => {
    render(<AtlasButton disabled>Label</AtlasButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  // ─── Loading state ─────────────────────────────────────────────────────────
  it("shows spinner and hides children when loading", () => {
    render(<AtlasButton loading>Submit</AtlasButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toHaveAttribute("data-loading", "true");
    // Children text should not be visible
    expect(btn).not.toHaveTextContent("Submit");
    // SVG spinner should be present
    expect(btn.querySelector("svg")).toBeInTheDocument();
  });

  // ─── Click handler fires ───────────────────────────────────────────────────
  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<AtlasButton onClick={handleClick}>Click</AtlasButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // ─── Click handler does NOT fire when disabled ─────────────────────────────
  it("does not fire onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<AtlasButton disabled onClick={handleClick}>Click</AtlasButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ─── Focus ring (keyboard accessibility) ───────────────────────────────────
  it("is focusable via keyboard", () => {
    render(<AtlasButton>Focus me</AtlasButton>);
    const btn = screen.getByRole("button");
    btn.focus();
    expect(btn).toHaveFocus();
  });

  // ─── Left and right icons ──────────────────────────────────────────────────
  it("renders left and right icons", () => {
    render(
      <AtlasButton
        leftIcon={<span data-testid="left-icon" />}
        rightIcon={<span data-testid="right-icon" />}
      >
        Label
      </AtlasButton>,
    );
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  // ─── fullWidth prop ────────────────────────────────────────────────────────
  it("applies full width class when fullWidth=true", () => {
    render(<AtlasButton fullWidth>Label</AtlasButton>);
    expect(screen.getByRole("button").className).toContain("w-full");
  });

  // ─── data-slot attribute ───────────────────────────────────────────────────
  it("has data-slot=atlas-button", () => {
    render(<AtlasButton>Label</AtlasButton>);
    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "atlas-button");
  });
});
