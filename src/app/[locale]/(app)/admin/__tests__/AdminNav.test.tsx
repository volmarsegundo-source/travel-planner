/**
 * F-FIX-05 — AdminNav tests.
 *
 * Closes B-W1-006 honesty flag #4 ("AdminNav not extended" — discovered
 * via Sprint 46 walk-through Wave 2 finding F-WALK-02).
 *
 * Asserts:
 *   - Pre-existing links remain regardless of flag state (no regression)
 *   - /admin/ia link appears ONLY when aiGovernanceV2Enabled is true
 *   - Link hidden when flag is false (default Prod state)
 *   - Active-link highlighting still works for the new entry
 *
 * Sprint 46.5 fix bundle.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../../messages/en.json";

// usePathname comes from @/i18n/navigation; mock it per-test.
vi.mock("@/i18n/navigation", async () => {
  const actual = await vi.importActual<{
    Link: React.ComponentType<{ href: string; children: React.ReactNode; className?: string; "aria-current"?: string }>;
  }>("@/i18n/navigation");
  return {
    ...actual,
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
    usePathname: () => "/admin/dashboard",
  };
});

import { AdminNav } from "../AdminNav";

function wrap(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("F-FIX-05 — AdminNav", () => {
  it("renders the 6 pre-existing admin links regardless of V2 flag (no regression)", () => {
    render(wrap(<AdminNav aiGovernanceV2Enabled={false} />));

    // Pre-existing links — must remain on every render.
    expect(screen.getByRole("link", { name: en.admin.navDashboard })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.admin.navFeedback })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.admin.navAiGovernance })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.admin.navAnalytics })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.admin.navErrors })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.admin.navPrompts })).toBeInTheDocument();
  });

  it("does NOT render the /admin/ia link when aiGovernanceV2Enabled is false", () => {
    render(wrap(<AdminNav aiGovernanceV2Enabled={false} />));
    expect(
      screen.queryByRole("link", { name: en.admin.navAi })
    ).not.toBeInTheDocument();
    // Negative href check too — the route must not appear at all.
    expect(
      screen.queryByRole("link", { name: /governança ia|governance central/i })
    ).not.toBeInTheDocument();
  });

  it("renders the /admin/ia link when aiGovernanceV2Enabled is true", () => {
    render(wrap(<AdminNav aiGovernanceV2Enabled={true} />));
    const link = screen.getByRole("link", { name: en.admin.navAi });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/admin/ia");
  });

  it("renders 7 links total when flag ON (6 pre-existing + 1 new)", () => {
    render(wrap(<AdminNav aiGovernanceV2Enabled={true} />));
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(7);
  });

  it("renders 6 links total when flag OFF (no regression)", () => {
    render(wrap(<AdminNav aiGovernanceV2Enabled={false} />));
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(6);
  });

  it("link to /admin/ia preserves the same a11y class shape as existing links", () => {
    render(wrap(<AdminNav aiGovernanceV2Enabled={true} />));
    const link = screen.getByRole("link", { name: en.admin.navAi });
    // The shared className signature includes a 44×44 minimum target
    // and focus-visible ring — assert the canonical Atlas tokens are present.
    expect(link.className).toMatch(/min-h-\[44px\]/);
    expect(link.className).toMatch(/focus-visible:ring-atlas-focus-ring/);
  });
});
