import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => `${namespace}.${key}`;
  },
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

import { ChecklistGeneratingSkeleton } from "@/components/features/checklist/ChecklistGeneratingSkeleton";

describe("ChecklistGeneratingSkeleton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with role=status", () => {
    render(<ChecklistGeneratingSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders spinner element", () => {
    render(<ChecklistGeneratingSkeleton />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows first message initially", () => {
    render(<ChecklistGeneratingSkeleton />);
    expect(screen.getByText("checklist.generatingMessages.analyzing")).toBeInTheDocument();
  });

  it("rotates messages after interval", () => {
    render(<ChecklistGeneratingSkeleton />);
    expect(screen.getByText("checklist.generatingMessages.analyzing")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("checklist.generatingMessages.building")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("checklist.generatingMessages.finalizing")).toBeInTheDocument();
  });

  it("renders 3 skeleton category placeholders", () => {
    render(<ChecklistGeneratingSkeleton />);
    const skeletons = screen.getAllByTestId("skeleton");
    // 3 categories × 4 skeletons each (1 title + 3 lines) = 12
    expect(skeletons.length).toBe(12);
  });
});
