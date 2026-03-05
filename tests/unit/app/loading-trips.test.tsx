import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

import TripsLoading from "@/app/[locale]/(app)/trips/loading";

describe("TripsLoading", () => {
  it("renders with role=status", () => {
    render(<TripsLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-label Loading", () => {
    render(<TripsLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("renders 6 trip card skeleton groups", () => {
    render(<TripsLoading />);
    // The grid has 6 card containers, each with 3 skeletons = 18 + header skeletons
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(18);
  });
});
