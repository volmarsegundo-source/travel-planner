import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExpeditionLoading from "@/app/[locale]/(app)/expedition/[tripId]/loading";

describe("ExpeditionLoading", () => {
  it("renders with role=status", () => {
    render(<ExpeditionLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders 8 progress bar segments", () => {
    const { container } = render(<ExpeditionLoading />);
    const segments = container.querySelectorAll(".rounded-full");
    expect(segments.length).toBe(8);
  });

  it("renders content skeleton blocks", () => {
    const { container } = render(<ExpeditionLoading />);
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});
