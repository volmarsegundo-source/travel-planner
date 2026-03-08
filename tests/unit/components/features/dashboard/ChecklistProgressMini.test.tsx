/**
 * Unit tests for ChecklistProgressMini component.
 *
 * Tests cover: rendering, color states (0%/partial/100%),
 * navigation link, tooltip, and progress bar width.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

const mockPush = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ChecklistProgressMini } from "@/components/features/dashboard/ChecklistProgressMini";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RenderOptions {
  requiredTotal?: number;
  requiredDone?: number;
  recommendedPending?: number;
}

function renderMini(opts: RenderOptions = {}) {
  return render(
    <ChecklistProgressMini
      tripId="trip-001"
      requiredTotal={opts.requiredTotal ?? 5}
      requiredDone={opts.requiredDone ?? 0}
      recommendedPending={opts.recommendedPending ?? 2}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChecklistProgressMini", () => {
  it("renders items count text", () => {
    renderMini({ requiredTotal: 5, requiredDone: 3 });

    expect(
      screen.getByText(/dashboard\.checklist\.items\[3,5\]/)
    ).toBeInTheDocument();
  });

  it("navigates to phase-3 on click", async () => {
    renderMini();

    const button = screen.getByRole("button");
    button.click();

    expect(mockPush).toHaveBeenCalledWith(
      "/expedition/trip-001/phase-3"
    );
  });

  it("stores phase-3 href in data attribute", () => {
    renderMini();

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "data-href",
      "/expedition/trip-001/phase-3"
    );
  });

  it("shows tooltip with breakdown", () => {
    renderMini({ requiredTotal: 5, requiredDone: 2, recommendedPending: 3 });

    const button = screen.getByRole("button");
    // tooltip: "3 required · 3 recommended pending"
    expect(button).toHaveAttribute(
      "title",
      expect.stringContaining("dashboard.checklist.tooltip")
    );
  });

  it("has aria-label with progress info", () => {
    renderMini({ requiredTotal: 5, requiredDone: 2 });

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      expect.stringContaining("dashboard.checklist.ariaLabel")
    );
  });

  it("uses dimmed style when 0% done", () => {
    const { container } = renderMini({ requiredTotal: 5, requiredDone: 0 });

    // Progress bar should have 0% width
    const progressBar = container.querySelector("[style]");
    expect(progressBar).toHaveStyle({ width: "0%" });
  });

  it("uses amber style for partial progress", () => {
    const { container } = renderMini({ requiredTotal: 4, requiredDone: 2 });

    // Progress bar should have 50% width
    const progressBar = container.querySelector("[style]");
    expect(progressBar).toHaveStyle({ width: "50%" });

    // Should have amber class
    expect(progressBar?.className).toContain("bg-amber-500");
  });

  it("uses teal style when all required items done", () => {
    const { container } = renderMini({ requiredTotal: 5, requiredDone: 5 });

    // Progress bar should have 100% width
    const progressBar = container.querySelector("[style]");
    expect(progressBar).toHaveStyle({ width: "100%" });

    // Should have teal class
    expect(progressBar?.className).toContain("bg-atlas-teal");
  });

  it("shows check mark emoji when all done", () => {
    renderMini({ requiredTotal: 3, requiredDone: 3 });

    // The green check mark
    expect(screen.getByText("\u2705")).toBeInTheDocument();
  });

  it("shows checkbox emoji when not all done", () => {
    renderMini({ requiredTotal: 3, requiredDone: 1 });

    expect(screen.getByText("\u2611\uFE0F")).toBeInTheDocument();
  });
});
