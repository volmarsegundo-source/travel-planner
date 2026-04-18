/**
 * Unit tests for PasswordStrengthChecklist (B1/B4).
 *
 * Verifies: all 4 criteria render, each changes state correctly,
 * aria-live is set, and icon transitions match password changes.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `passwordStrength.${key}`,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PasswordStrengthChecklist } from "@/components/features/auth/PasswordStrengthChecklist";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PasswordStrengthChecklist", () => {
  it("renders all 4 criteria", () => {
    render(<PasswordStrengthChecklist password="" />);

    expect(screen.getByTestId("criterion-minLength")).toBeInTheDocument();
    expect(screen.getByTestId("criterion-uppercase")).toBeInTheDocument();
    expect(screen.getByTestId("criterion-number")).toBeInTheDocument();
    expect(screen.getByTestId("criterion-special")).toBeInTheDocument();
  });

  it("has aria-live=polite on the container", () => {
    render(<PasswordStrengthChecklist password="" />);

    const list = screen.getByTestId("password-strength-checklist");
    expect(list).toHaveAttribute("aria-live", "polite");
  });

  it("marks minLength as met when password >= 8 chars", () => {
    const { rerender } = render(
      <PasswordStrengthChecklist password="short" />
    );
    expect(screen.getByTestId("criterion-minLength")).toHaveClass(
      "text-muted-foreground"
    );

    rerender(<PasswordStrengthChecklist password="longenough" />);
    expect(screen.getByTestId("criterion-minLength")).toHaveClass(
      "text-green-600"
    );
  });

  it("marks uppercase as met when password has A-Z", () => {
    const { rerender } = render(
      <PasswordStrengthChecklist password="lowercase" />
    );
    expect(screen.getByTestId("criterion-uppercase")).toHaveClass(
      "text-muted-foreground"
    );

    rerender(<PasswordStrengthChecklist password="Uppercase" />);
    expect(screen.getByTestId("criterion-uppercase")).toHaveClass(
      "text-green-600"
    );
  });

  it("marks number as met when password has 0-9", () => {
    const { rerender } = render(
      <PasswordStrengthChecklist password="nodigits" />
    );
    expect(screen.getByTestId("criterion-number")).toHaveClass(
      "text-muted-foreground"
    );

    rerender(<PasswordStrengthChecklist password="has1digit" />);
    expect(screen.getByTestId("criterion-number")).toHaveClass(
      "text-green-600"
    );
  });

  it("marks special as met when password has non-alphanumeric char", () => {
    const { rerender } = render(
      <PasswordStrengthChecklist password="nospecial" />
    );
    expect(screen.getByTestId("criterion-special")).toHaveClass(
      "text-muted-foreground"
    );

    rerender(<PasswordStrengthChecklist password="has@special" />);
    expect(screen.getByTestId("criterion-special")).toHaveClass(
      "text-green-600"
    );
  });

  it("all criteria are met for a strong password", () => {
    render(<PasswordStrengthChecklist password="Strong1!" />);

    expect(screen.getByTestId("criterion-minLength")).toHaveClass("text-green-600");
    expect(screen.getByTestId("criterion-uppercase")).toHaveClass("text-green-600");
    expect(screen.getByTestId("criterion-number")).toHaveClass("text-green-600");
    expect(screen.getByTestId("criterion-special")).toHaveClass("text-green-600");
  });

  it("no criteria are met for an empty password", () => {
    render(<PasswordStrengthChecklist password="" />);

    expect(screen.getByTestId("criterion-minLength")).toHaveClass("text-muted-foreground");
    expect(screen.getByTestId("criterion-uppercase")).toHaveClass("text-muted-foreground");
    expect(screen.getByTestId("criterion-number")).toHaveClass("text-muted-foreground");
    expect(screen.getByTestId("criterion-special")).toHaveClass("text-muted-foreground");
  });

  it("renders i18n labels for each criterion", () => {
    render(<PasswordStrengthChecklist password="" />);

    expect(screen.getByText("passwordStrength.minLength")).toBeInTheDocument();
    expect(screen.getByText("passwordStrength.uppercase")).toBeInTheDocument();
    expect(screen.getByText("passwordStrength.number")).toBeInTheDocument();
    expect(screen.getByText("passwordStrength.special")).toBeInTheDocument();
  });
});
