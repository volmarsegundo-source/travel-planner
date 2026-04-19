import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageSwitcher } from "../LanguageSwitcher";

// SPEC-LANDING-LANGTOOLTIP-001: tooltip must flip BELOW the switcher so it
// remains visible under a sticky top-0 landing header.

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
  useTranslations: (_ns: string) => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "pt-BR"],
    defaultLocale: "pt-BR",
  },
}));

vi.mock("@/contexts/WizardDirtyContext", () => ({
  useWizardDirty: () => ({
    isDirty: false,
    save: vi.fn(),
    discard: vi.fn(),
  }),
}));

describe("LanguageSwitcher tooltip position — SPEC-LANDING-LANGTOOLTIP-001", () => {
  it("renders tooltip BELOW the switcher (top-full + mt-2), not above", async () => {
    vi.useFakeTimers();
    render(<LanguageSwitcher />);
    const container = screen.getByTestId("language-switcher");

    fireEvent.mouseEnter(container);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("top-full");
    expect(tooltip.className).toContain("mt-2");
    expect(tooltip.className).not.toContain("bottom-full");
    expect(tooltip.className).not.toContain("mb-2");

    vi.useRealTimers();
  });

  it("arrow points UP (border-b-gray-900 at bottom-full of tooltip)", async () => {
    vi.useFakeTimers();
    render(<LanguageSwitcher />);
    const container = screen.getByTestId("language-switcher");

    fireEvent.mouseEnter(container);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    const tooltip = screen.getByRole("tooltip");
    const arrow = tooltip.querySelector('[aria-hidden="true"]');
    expect(arrow).not.toBeNull();
    expect(arrow!.className).toContain("bottom-full");
    expect(arrow!.className).toContain("border-b-gray-900");
    expect(arrow!.className).not.toContain("top-full");
    expect(arrow!.className).not.toContain("border-t-gray-900");

    vi.useRealTimers();
  });
});
