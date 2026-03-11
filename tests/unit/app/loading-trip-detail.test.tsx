import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

import TripDetailLoading from "@/app/[locale]/(app)/trips/[id]/loading";

describe("TripDetailLoading", () => {
  it("renders with role=status", () => {
    render(<TripDetailLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-busy attribute for loading state", () => {
    render(<TripDetailLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders breadcrumb, header and content skeletons", () => {
    render(<TripDetailLoading />);
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});
