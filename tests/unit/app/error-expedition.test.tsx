import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: Record<string, unknown>) =>
    <a {...props}>{children as React.ReactNode}</a>,
}));

vi.mock("lucide-react", () => ({
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
}));

import ExpeditionError from "@/app/[locale]/(app)/expedition/[tripId]/error";

describe("ExpeditionError", () => {
  it("renders error title with role=alert", () => {
    const reset = vi.fn();
    render(<ExpeditionError error={new Error("test")} reset={reset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("errors.boundary.title")).toBeInTheDocument();
  });

  it("renders try again and go back buttons", () => {
    const reset = vi.fn();
    render(<ExpeditionError error={new Error("test")} reset={reset} />);

    expect(screen.getByText("errors.boundary.tryAgain")).toBeInTheDocument();
    expect(screen.getByText("errors.boundary.goBack")).toBeInTheDocument();
  });

  it("calls reset when try again is clicked", () => {
    const reset = vi.fn();
    render(<ExpeditionError error={new Error("test")} reset={reset} />);

    fireEvent.click(screen.getByText("errors.boundary.tryAgain"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("links go back to dashboard", () => {
    const reset = vi.fn();
    render(<ExpeditionError error={new Error("test")} reset={reset} />);

    const link = screen.getByText("errors.boundary.goBack").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
