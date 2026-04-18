import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgeRestrictionBanner } from "../AgeRestrictionBanner";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const translate = (key: string) => `${ns}.${key}`;
    return translate;
  },
}));

describe("AgeRestrictionBanner", () => {
  it("renders the profile banner when isMinor is true", () => {
    render(<AgeRestrictionBanner isMinor variant="profile" />);

    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("ageRestriction.profileBanner");
  });

  it("renders the registration banner when variant is registration", () => {
    render(<AgeRestrictionBanner isMinor variant="registration" />);

    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("ageRestriction.registrationBanner");
  });

  it("does not render when isMinor is false", () => {
    render(<AgeRestrictionBanner isMinor={false} variant="profile" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has accessible aria-live attribute on profile variant", () => {
    render(<AgeRestrictionBanner isMinor variant="profile" />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("has aria-live assertive on registration variant", () => {
    render(<AgeRestrictionBanner isMinor variant="registration" />);

    const banner = screen.getByRole("alert");
    expect(banner).toHaveAttribute("aria-live", "assertive");
  });

  it("renders info icon alongside text", () => {
    render(<AgeRestrictionBanner isMinor variant="profile" />);

    const icon = screen.getByTestId("age-restriction-icon");
    expect(icon).toBeInTheDocument();
  });
});
