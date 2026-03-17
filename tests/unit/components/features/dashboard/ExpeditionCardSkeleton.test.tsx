/**
 * Unit tests for ExpeditionCardSkeleton component.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpeditionCardSkeleton } from "@/components/features/dashboard/ExpeditionCardSkeleton";

describe("ExpeditionCardSkeleton", () => {
  it("renders with data-testid", () => {
    render(<ExpeditionCardSkeleton />);
    expect(screen.getByTestId("expedition-card-skeleton")).toBeInTheDocument();
  });

  it("is hidden from screen readers", () => {
    render(<ExpeditionCardSkeleton />);
    expect(screen.getByTestId("expedition-card-skeleton")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("has role='listitem'", () => {
    render(<ExpeditionCardSkeleton />);
    expect(screen.getByTestId("expedition-card-skeleton")).toHaveAttribute(
      "role",
      "listitem"
    );
  });

  it("contains pulse animation elements (motion-safe)", () => {
    render(<ExpeditionCardSkeleton />);
    const skeleton = screen.getByTestId("expedition-card-skeleton");
    const pulseElements = skeleton.querySelectorAll(".motion-safe\\:animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
