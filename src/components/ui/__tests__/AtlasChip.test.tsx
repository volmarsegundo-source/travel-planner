import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AtlasChip } from "../AtlasChip";

describe("AtlasChip", () => {
  // ─── Renders without error ──────────────────────────────────────────────────
  it("renders chip with text", () => {
    render(<AtlasChip mode="selectable">Beach</AtlasChip>);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("Beach")).toBeInTheDocument();
  });

  // ─── Selectable mode — toggle ──────────────────────────────────────────────
  it("calls onSelectionChange when clicked in selectable mode", () => {
    const onSelect = vi.fn();
    render(
      <AtlasChip mode="selectable" selected={false} onSelectionChange={onSelect}>
        Culture
      </AtlasChip>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  // ─── Selected state shows checkmark ────────────────────────────────────────
  it("shows checkmark icon when selected", () => {
    const { container } = render(
      <AtlasChip mode="selectable" selected>Adventure</AtlasChip>,
    );
    // Check icon SVG should be present
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  // ─── Unselected state ──────────────────────────────────────────────────────
  it("does not show checkmark when not selected", () => {
    render(<AtlasChip mode="selectable" selected={false}>Nature</AtlasChip>);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  });

  // ─── All 5 colors ──────────────────────────────────────────────────────────
  it.each(["default", "primary", "success", "warning", "danger"] as const)(
    "renders color=%s",
    (color) => {
      render(<AtlasChip mode="selectable" color={color}>Chip</AtlasChip>);
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    },
  );

  // ─── Removable mode ────────────────────────────────────────────────────────
  it("shows remove button in removable mode", () => {
    const onRemove = vi.fn();
    render(
      <AtlasChip mode="removable" onRemove={onRemove}>
        Tag
      </AtlasChip>,
    );
    const removeBtn = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // ─── Disabled state ────────────────────────────────────────────────────────
  it("disables the chip and prevents interaction", () => {
    const onSelect = vi.fn();
    render(
      <AtlasChip mode="selectable" disabled onSelectionChange={onSelect}>
        Disabled
      </AtlasChip>,
    );
    const chip = screen.getByRole("checkbox");
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    expect(onSelect).not.toHaveBeenCalled();
  });

  // ─── Keyboard: Enter toggles ───────────────────────────────────────────────
  it("toggles on Enter key in selectable mode", () => {
    const onSelect = vi.fn();
    render(
      <AtlasChip mode="selectable" selected={false} onSelectionChange={onSelect}>
        KeyChip
      </AtlasChip>,
    );
    const chip = screen.getByRole("checkbox");
    fireEvent.keyDown(chip, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  // ─── Keyboard: Space toggles ──────────────────────────────────────────────
  it("toggles on Space key in selectable mode", () => {
    const onSelect = vi.fn();
    render(
      <AtlasChip mode="selectable" selected={true} onSelectionChange={onSelect}>
        SpaceChip
      </AtlasChip>,
    );
    fireEvent.keyDown(screen.getByRole("checkbox"), { key: " " });
    expect(onSelect).toHaveBeenCalledWith(false);
  });

  // ─── aria attributes ──────────────────────────────────────────────────────
  it("has correct aria attributes for selectable", () => {
    render(<AtlasChip mode="selectable" selected>Aria</AtlasChip>);
    const chip = screen.getByRole("checkbox");
    expect(chip).toHaveAttribute("aria-checked", "true");
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  // ─── Size variants ─────────────────────────────────────────────────────────
  it.each(["sm", "md"] as const)("renders size=%s", (size) => {
    render(<AtlasChip mode="selectable" size={size}>Sized</AtlasChip>);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });
});
