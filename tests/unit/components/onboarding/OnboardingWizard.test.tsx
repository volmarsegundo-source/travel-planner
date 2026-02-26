/**
 * Behavior tests for OnboardingWizard.
 *
 * Tests cover: initial step rendering, step progression, skip navigation,
 * step 2 redirect to /trips/new, step 3 redirect to /trips,
 * and progress indicator presence.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRouterPush } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string, params?: Record<string, string | number>) => {
      // Build the raw key string: "namespace.key"
      let result = `${namespace}.${key}`;
      // Replace any {param} placeholders in the string
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
      }
      return result;
    };
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 title heading", () => {
    render(<OnboardingWizard userName="Alice" />);

    // The mock renders "onboarding.step1.title" (no {name} in key string itself)
    expect(
      screen.getByRole("heading", { name: "onboarding.step1.title" })
    ).toBeInTheDocument();
  });

  it("renders step 1 subtitle and CTA button", () => {
    render(<OnboardingWizard userName="Alice" />);

    expect(screen.getByText("onboarding.step1.subtitle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "onboarding.step1.cta" })
    ).toBeInTheDocument();
  });

  it("renders skip button on step 1", () => {
    render(<OnboardingWizard userName="Alice" />);

    // Skip button uses onboarding.skip key
    expect(
      screen.getByRole("button", { name: "onboarding.skip" })
    ).toBeInTheDocument();
  });

  it("advances to step 2 when CTA is clicked on step 1", async () => {
    render(<OnboardingWizard userName="Alice" />);

    const ctaButton = screen.getByRole("button", {
      name: "onboarding.step1.cta",
    });
    await userEvent.click(ctaButton);

    expect(
      screen.getByRole("heading", { name: "onboarding.step2.title" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("onboarding.step1.subtitle")
    ).not.toBeInTheDocument();
  });

  it("shows step 2 CTA and subtitle after advancing", async () => {
    render(<OnboardingWizard userName="Alice" />);

    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.step1.cta" })
    );

    expect(screen.getByText("onboarding.step2.subtitle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "onboarding.step2.cta" })
    ).toBeInTheDocument();
  });

  it("redirects to /trips/new when CTA is clicked on step 2", async () => {
    render(<OnboardingWizard userName="Alice" />);

    // Advance to step 2
    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.step1.cta" })
    );

    // Click step 2 CTA
    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.step2.cta" })
    );

    expect(mockRouterPush).toHaveBeenCalledWith("/trips/new");
  });

  it("redirects to /trips when skip is clicked", async () => {
    render(<OnboardingWizard userName="Alice" />);

    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.skip" })
    );

    expect(mockRouterPush).toHaveBeenCalledWith("/trips");
  });

  it("shows progress indicator", () => {
    render(<OnboardingWizard userName="Alice" />);

    // ProgressIndicator renders a text with the progress key
    expect(screen.getByText(/onboarding\.progress/)).toBeInTheDocument();
  });

  it("renders skip button on step 2 as well", async () => {
    render(<OnboardingWizard userName="Alice" />);

    await userEvent.click(
      screen.getByRole("button", { name: "onboarding.step1.cta" })
    );

    expect(
      screen.getByRole("button", { name: "onboarding.skip" })
    ).toBeInTheDocument();
  });

  it("renders progress dots for all steps", () => {
    render(<OnboardingWizard userName="Alice" />);

    const dots = screen.getAllByRole("listitem");
    expect(dots).toHaveLength(3);
  });
});
