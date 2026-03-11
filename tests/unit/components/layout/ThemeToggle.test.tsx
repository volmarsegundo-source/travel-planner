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

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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

    const button = screen.getByRole("button", { name: /theme\.switchToLight/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("shows translated switchToLight aria-label when in dark mode", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "theme.switchToLight" })
    ).toBeInTheDocument();
  });

  it("shows translated switchToDark aria-label when in light mode", () => {
    mockTheme.current = "light";
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "theme.switchToDark" })
    ).toBeInTheDocument();
  });

  it("calls setTheme('light') when clicking in dark mode", () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /theme\.switchToLight/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when clicking in light mode", () => {
    mockTheme.current = "light";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /theme\.switchToDark/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
