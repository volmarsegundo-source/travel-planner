import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AtlasStepperInput } from "../AtlasStepperInput";

describe("AtlasStepperInput", () => {
  const defaultProps = {
    value: 2,
    onChange: vi.fn(),
    min: 0,
    max: 10,
    label: "Adults",
  };

  // ─── Renders without error ──────────────────────────────────────────────────
  it("renders with label and value", () => {
    render(<AtlasStepperInput {...defaultProps} />);
    expect(screen.getByText("Adults")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  // ─── spinbutton role ───────────────────────────────────────────────────────
  it("has role=spinbutton with aria attributes", () => {
    render(
      <AtlasStepperInput
        {...defaultProps}
        ariaValueText="2 adults"
      />,
    );
    const spinbutton = screen.getByRole("spinbutton");
    expect(spinbutton).toHaveAttribute("aria-valuenow", "2");
    expect(spinbutton).toHaveAttribute("aria-valuemin", "0");
    expect(spinbutton).toHaveAttribute("aria-valuemax", "10");
    expect(spinbutton).toHaveAttribute("aria-valuetext", "2 adults");
    expect(spinbutton).toHaveAttribute("aria-label", "Adults");
  });

  // ─── Increment ─────────────────────────────────────────────────────────────
  it("increments value when + button is clicked", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole("button", { name: "Increase" }));
    fireEvent.mouseUp(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  // ─── Decrement ─────────────────────────────────────────────────────────────
  it("decrements value when - button is clicked", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole("button", { name: "Decrease" }));
    fireEvent.mouseUp(screen.getByRole("button", { name: "Decrease" }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  // ─── Clamp at min ──────────────────────────────────────────────────────────
  it("disables decrease button at min value", () => {
    render(<AtlasStepperInput {...defaultProps} value={0} />);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });

  // ─── Clamp at max ──────────────────────────────────────────────────────────
  it("disables increase button at max value", () => {
    render(<AtlasStepperInput {...defaultProps} value={10} />);
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
  });

  // ─── Keyboard: ArrowUp increments ──────────────────────────────────────────
  it("increments on ArrowUp key", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  // ─── Keyboard: ArrowDown decrements ────────────────────────────────────────
  it("decrements on ArrowDown key", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  // ─── Keyboard: Home sets min ───────────────────────────────────────────────
  it("sets min value on Home key", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Home" });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  // ─── Keyboard: End sets max ────────────────────────────────────────────────
  it("sets max value on End key", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "End" });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  // ─── Disabled state ────────────────────────────────────────────────────────
  it("disables all interactions when disabled", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} onChange={onChange} disabled />);
    const spinbutton = screen.getByRole("spinbutton");
    expect(spinbutton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    // Keyboard should not work
    fireEvent.keyDown(spinbutton, { key: "ArrowUp" });
    expect(onChange).not.toHaveBeenCalled();
  });

  // ─── Custom step size ──────────────────────────────────────────────────────
  it("uses custom step size", () => {
    const onChange = vi.fn();
    render(<AtlasStepperInput {...defaultProps} step={5} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  // ─── Zero-padded display ───────────────────────────────────────────────────
  it("displays zero-padded value", () => {
    render(<AtlasStepperInput {...defaultProps} value={3} />);
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});
