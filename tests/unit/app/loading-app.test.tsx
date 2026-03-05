import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

import AppLoading from "@/app/[locale]/(app)/loading";

describe("AppLoading", () => {
  it("renders with role=status", () => {
    render(<AppLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-label Loading", () => {
    render(<AppLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("renders skeleton placeholders", () => {
    render(<AppLoading />);
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
