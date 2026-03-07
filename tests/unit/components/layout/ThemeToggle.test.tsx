/**
 * Behavior tests for ThemeToggle component.
 *
 * Tests cover: rendering, toggle behavior, aria-label, mounted guard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockSetTheme, mockTheme } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
  mockTheme: { current: "dark" as string },
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    setTheme: mockSetTheme,
  }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ThemeToggle } from "@/components/layout/ThemeToggle";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme.current = "dark";
  });

  it("renders a toggle button after mounting", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("shows 'Switch to light mode' aria-label when in dark mode", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Switch to light mode" })
    ).toBeInTheDocument();
  });

  it("shows 'Switch to dark mode' aria-label when in light mode", () => {
    mockTheme.current = "light";
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Switch to dark mode" })
    ).toBeInTheDocument();
  });

  it("calls setTheme('light') when clicking in dark mode", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when clicking in light mode", () => {
    mockTheme.current = "light";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
