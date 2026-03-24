/**
 * Tests for PhaseShell DesignBranch integration.
 *
 * Verifies that PhaseShell delegates to V1 (default) or V2 based on feature flag.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockIsDesignV2 } = vi.hoisted(() => ({
  mockIsDesignV2: vi.fn(() => false),
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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/expedition/test/phase-1",
}));

vi.mock("@/hooks/useDesignV2", () => ({
  useDesignV2: mockIsDesignV2,
}));

vi.mock("@/lib/feature-flags", () => ({
  isDesignV2Enabled: mockIsDesignV2,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PhaseShell } from "@/components/features/expedition/PhaseShell";

// ─── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  tripId: "test-trip-id",
  viewingPhase: 1,
  tripCurrentPhase: 1,
  completedPhases: [] as number[],
  phaseTitle: "Test Phase",
};

describe("PhaseShell DesignBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders V1 when feature flag is off", () => {
    mockIsDesignV2.mockReturnValue(false);

    render(<PhaseShell {...defaultProps}>Content</PhaseShell>);

    // V1 renders with data-testid="phase-shell"
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("phase-shell-v2")).not.toBeInTheDocument();
  });

  it("renders V2 when feature flag is on", () => {
    mockIsDesignV2.mockReturnValue(true);

    render(<PhaseShell {...defaultProps}>Content</PhaseShell>);

    // V2 renders with data-testid="phase-shell-v2"
    expect(screen.getByTestId("phase-shell-v2")).toBeInTheDocument();
    expect(screen.queryByTestId("phase-shell")).not.toBeInTheDocument();
  });
});
