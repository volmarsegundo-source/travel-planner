/**
 * Unit tests for ErrorBoundaryCard component.
 *
 * Covers: rendering, try again click, back link, custom backHref.
 * [TASK-29-014 — tech debt cleanup]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ErrorBoundaryCard } from "@/components/features/error/ErrorBoundaryCard";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ErrorBoundaryCard", () => {
  let mockReset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReset = vi.fn();
  });

  it("renders error title and description", () => {
    render(<ErrorBoundaryCard reset={mockReset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.boundary.title");
    expect(screen.getByText("errors.boundary.description")).toBeInTheDocument();
  });

  it("calls reset when Try Again is clicked", () => {
    render(<ErrorBoundaryCard reset={mockReset} />);
    fireEvent.click(screen.getByText("errors.boundary.tryAgain"));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders back link to /expeditions by default", () => {
    render(<ErrorBoundaryCard reset={mockReset} />);
    const link = screen.getByText("errors.boundary.goBack").closest("a");
    expect(link).toHaveAttribute("href", "/expeditions");
  });

  it("renders back link with custom backHref", () => {
    render(<ErrorBoundaryCard reset={mockReset} backHref="/custom" />);
    const link = screen.getByText("errors.boundary.goBack").closest("a");
    expect(link).toHaveAttribute("href", "/custom");
  });
});
