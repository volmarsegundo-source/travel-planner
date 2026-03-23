import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AtlasInput } from "../AtlasInput";

describe("AtlasInput", () => {
  // ─── Renders without error ──────────────────────────────────────────────────
  it("renders with label", () => {
    render(<AtlasInput label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  // ─── All input types ───────────────────────────────────────────────────────
  it.each(["text", "email", "password", "search", "tel"] as const)(
    "renders type=%s",
    (type) => {
      render(<AtlasInput label={`Field ${type}`} type={type} />);
      const input = screen.getByLabelText(`Field ${type}`);
      // Password with toggle will show as text when toggled, but initially password
      if (type === "password") {
        expect(input).toHaveAttribute("type", "password");
      } else {
        expect(input).toHaveAttribute("type", type);
      }
    },
  );

  // ─── Required state ────────────────────────────────────────────────────────
  it("shows required indicator and sets aria-required", () => {
    render(<AtlasInput label="Name" required />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toBeRequired();
  });

  // ─── Error state ───────────────────────────────────────────────────────────
  it("shows error message and sets aria-invalid", () => {
    render(<AtlasInput label="Email" error="Invalid email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
    // aria-describedby should point to error element
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).toHaveTextContent("Invalid email");
  });

  // ─── Helper text ───────────────────────────────────────────────────────────
  it("shows helper text when no error", () => {
    render(<AtlasInput label="Name" helperText="Your full name" />);
    expect(screen.getByText("Your full name")).toBeInTheDocument();
  });

  it("hides helper text when error is present", () => {
    render(<AtlasInput label="Name" helperText="Your full name" error="Required" />);
    expect(screen.queryByText("Your full name")).not.toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  // ─── Disabled state ────────────────────────────────────────────────────────
  it("disables the input", () => {
    render(<AtlasInput label="Name" disabled />);
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  // ─── Password toggle ──────────────────────────────────────────────────────
  it("toggles password visibility", () => {
    render(<AtlasInput label="Password" type="password" />);
    const input = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });

    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  // ─── Change handler fires ──────────────────────────────────────────────────
  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<AtlasInput label="Name" onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "John" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  // ─── Keyboard accessibility ────────────────────────────────────────────────
  it("is focusable", () => {
    render(<AtlasInput label="Name" />);
    const input = screen.getByLabelText("Name");
    input.focus();
    expect(input).toHaveFocus();
  });

  // ─── Left icon ─────────────────────────────────────────────────────────────
  it("renders left icon", () => {
    render(<AtlasInput label="Search" leftIcon={<span data-testid="search-icon" />} />);
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  // ─── data-slot attribute ───────────────────────────────────────────────────
  it("has data-slot=atlas-input", () => {
    render(<AtlasInput label="Name" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("data-slot", "atlas-input");
  });
});
