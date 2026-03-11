import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

import AccountLoading from "@/app/[locale]/(app)/account/loading";

describe("AccountLoading", () => {
  it("renders with role=status", () => {
    render(<AccountLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-busy attribute for loading state", () => {
    render(<AccountLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders avatar and field skeletons", () => {
    render(<AccountLoading />);
    const skeletons = screen.getAllByTestId("skeleton");
    // Should have avatar circle + multiple field skeletons
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});
