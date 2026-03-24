/**
 * Tests for PhaseShellV2 component.
 *
 * Covers: phase progress rendering, breadcrumb, phase header,
 * edit mode banner, content slot, wizard footer integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (params) {
      let result = fullKey;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return fullKey;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/expedition/test-trip/phase-1",
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PhaseShellV2 } from "@/components/features/expedition/PhaseShellV2";

// ─── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  tripId: "test-trip-id",
  viewingPhase: 1,
  tripCurrentPhase: 1,
  completedPhases: [] as number[],
  phaseTitle: "A Inspiracao",
  phaseSubtitle: "Onde tudo comeca",
};

describe("PhaseShellV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with data-testid phase-shell-v2", () => {
    render(<PhaseShellV2 {...defaultProps}>Content</PhaseShellV2>);

    expect(screen.getByTestId("phase-shell-v2")).toBeInTheDocument();
  });

  it("renders phase title as h1 with atlas headline font", () => {
    render(<PhaseShellV2 {...defaultProps}>Content</PhaseShellV2>);

    const heading = screen.getByTestId("phase-label");
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveTextContent("A Inspiracao");
    expect(heading.className).toContain("font-atlas-headline");
  });

  it("renders phase subtitle when provided", () => {
    render(<PhaseShellV2 {...defaultProps}>Content</PhaseShellV2>);

    expect(screen.getByText("Onde tudo comeca")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    const props = { ...defaultProps, phaseSubtitle: undefined };
    render(<PhaseShellV2 {...props}>Content</PhaseShellV2>);

    expect(screen.queryByText("Onde tudo comeca")).not.toBeInTheDocument();
  });

  it("renders breadcrumb navigation in both layouts", () => {
    render(<PhaseShellV2 {...defaultProps}>Content</PhaseShellV2>);

    // Breadcrumb renders in desktop sidebar AND mobile top bar
    const breadcrumbs = screen.getAllByRole("navigation", { name: "phaseShellV2.breadcrumb.label" });
    expect(breadcrumbs.length).toBe(2);
    expect(screen.getAllByText("phaseShellV2.breadcrumb.expeditions").length).toBe(2);
  });

  it("renders AtlasPhaseProgress with wizard layout on desktop", () => {
    render(<PhaseShellV2 {...defaultProps}>Content</PhaseShellV2>);

    // Phase progress renders with role="list" for wizard layout
    const phaseLists = screen.getAllByRole("list");
    expect(phaseLists.length).toBeGreaterThanOrEqual(1);
  });

  it("renders edit mode banner when isEditMode=true", () => {
    render(
      <PhaseShellV2 {...defaultProps} isEditMode>
        Content
      </PhaseShellV2>
    );

    expect(screen.getByTestId("edit-mode-banner")).toBeInTheDocument();
  });

  it("does not render edit mode banner when isEditMode=false", () => {
    render(<PhaseShellV2 {...defaultProps}>Content</PhaseShellV2>);

    expect(screen.queryByTestId("edit-mode-banner")).not.toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <PhaseShellV2 {...defaultProps}>
        <div data-testid="test-content">Test content</div>
      </PhaseShellV2>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
  });

  it("renders step progress indicator for multi-step phases", () => {
    render(
      <PhaseShellV2 {...defaultProps} currentStep={2} totalSteps={4}>
        Content
      </PhaseShellV2>
    );

    expect(screen.getByTestId("step-progress-indicator")).toBeInTheDocument();
  });

  it("does not render step indicator when totalSteps is 1", () => {
    render(
      <PhaseShellV2 {...defaultProps} currentStep={1} totalSteps={1}>
        Content
      </PhaseShellV2>
    );

    expect(screen.queryByTestId("step-progress-indicator")).not.toBeInTheDocument();
  });

  it("uses atlas info tokens for edit banner", () => {
    render(
      <PhaseShellV2 {...defaultProps} isEditMode>
        Content
      </PhaseShellV2>
    );

    const banner = screen.getByTestId("edit-mode-banner");
    expect(banner.className).toContain("bg-atlas-info-container");
    expect(banner.className).toContain("border-atlas-info");
  });
});
