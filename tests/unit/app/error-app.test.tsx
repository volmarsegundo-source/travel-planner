import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => `${namespace}.${key}`;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, asChild, ...props }: any) => {
    if (asChild) {
      // Render the child directly for asChild pattern
      return children;
    }
    return <button onClick={onClick} {...props}>{children}</button>;
  },
}));

import AppError from "@/app/[locale]/(app)/error";

describe("AppError", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Test error");

  beforeEach(() => {
    mockReset.mockClear();
  });

  it("renders AlertCircle icon", () => {
    render(<AppError error={mockError} reset={mockReset} />);
    // The icon is aria-hidden, so check by container
    const container = document.querySelector(".bg-destructive\\/10");
    expect(container).toBeInTheDocument();
  });

  it("renders title with role=alert", () => {
    render(<AppError error={mockError} reset={mockReset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.boundary.title");
  });

  it("renders description", () => {
    render(<AppError error={mockError} reset={mockReset} />);
    expect(screen.getByText("errors.boundary.description")).toBeInTheDocument();
  });

  it("calls reset when Try Again is clicked", async () => {
    const user = userEvent.setup();
    render(<AppError error={mockError} reset={mockReset} />);
    await user.click(screen.getByText("errors.boundary.tryAgain"));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("renders Go Back link pointing to /trips", () => {
    render(<AppError error={mockError} reset={mockReset} />);
    const link = screen.getByText("errors.boundary.goBack");
    expect(link.closest("a")).toHaveAttribute("href", "/trips");
  });
});
