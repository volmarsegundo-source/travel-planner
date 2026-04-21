import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Phase4WizardV2 } from "../Phase4WizardV2";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 * ──────────────────────────────────────────────────────────────────────────── */

const mockRouterPush = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const translate = (key: string, params?: Record<string, string | number>) => {
      let result = `${ns}.${key}`;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    };
    return translate;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/hooks/useFormDirty", () => ({
  useFormDirty: () => ({ isDirty: false, markClean: vi.fn() }),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  advanceFromPhaseAction: vi.fn(),
}));

vi.mock("@/server/actions/transport.actions", () => ({
  saveTransportSegmentsAction: vi.fn(),
  getTransportSegmentsAction: vi.fn().mockResolvedValue({ success: true, data: { segments: [] } }),
  saveAccommodationsAction: vi.fn(),
  getAccommodationsAction: vi.fn().mockResolvedValue({ success: true, data: { accommodations: [] } }),
  saveLocalMobilityAction: vi.fn(),
  getLocalMobilityAction: vi.fn().mockResolvedValue({ success: true, data: { mobility: [] } }),
}));

vi.mock("../TransportStep", () => ({
  TransportStep: () => <div data-testid="transport-step-mock">TransportStep</div>,
}));

vi.mock("../AccommodationStep", () => ({
  AccommodationStep: () => <div data-testid="accommodation-step-mock">AccommodationStep</div>,
}));

vi.mock("../MobilityStep", () => ({
  MobilityStep: () => <div data-testid="mobility-step-mock">MobilityStep</div>,
}));

vi.mock("../PhaseShell", () => ({
  PhaseShell: ({ children }: { children: React.ReactNode }) => <div data-testid="phase-shell">{children}</div>,
}));

vi.mock("../WizardFooter", () => ({
  WizardFooter: () => <div data-testid="wizard-footer">WizardFooter</div>,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("Phase4WizardV2", () => {
  const defaultProps = {
    tripId: "trip-1",
    tripType: "international",
    origin: "Sao Paulo",
    destination: "Tokyo",
    startDate: "2026-05-01",
    endDate: "2026-05-10",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders within PhaseShell", async () => {
    render(<Phase4WizardV2 {...defaultProps} />);
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  it("renders V2 step indicator chips", async () => {
    render(<Phase4WizardV2 {...defaultProps} />);
    expect(screen.getByTestId("phase4-v2-steps")).toBeInTheDocument();
  });

  it("renders destination and trip type", async () => {
    render(<Phase4WizardV2 {...defaultProps} />);
    expect(
      screen.getByText(/Tokyo.*expedition\.phase4\.tripTypes\.international/),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton initially then transport step", async () => {
    render(<Phase4WizardV2 {...defaultProps} />);
    // After data loads, transport step appears
    expect(
      await screen.findByTestId("transport-step-mock"),
    ).toBeInTheDocument();
  });

  it("renders wizard footer", async () => {
    render(<Phase4WizardV2 {...defaultProps} />);
    expect(
      await screen.findByTestId("wizard-footer"),
    ).toBeInTheDocument();
  });
});
