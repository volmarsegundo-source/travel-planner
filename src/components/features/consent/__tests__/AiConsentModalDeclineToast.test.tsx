import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useTranslations } from "next-intl";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRecordAiConsent, mockToastInfo } = vi.hoisted(() => ({
  mockRecordAiConsent: vi.fn(),
  mockToastInfo: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/server/actions/consent.actions", () => ({
  recordAiConsentAction: mockRecordAiConsent,
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    info: mockToastInfo,
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { AiConsentModal } from "../AiConsentModal";
import { toast } from "@/lib/toast";

// Minimal caller that mirrors the real wiring in DestinationGuideV2 /
// Phase6ItineraryV2: on decline, fire toast.info(t("declinedToast")).
function DeclineWiringHarness() {
  const tConsent = useTranslations("consent.modal");
  return (
    <AiConsentModal
      open
      onAccepted={() => {}}
      onDeclined={() => {
        toast.info(tConsent("declinedToast"));
      }}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiConsentModal decline → toast wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAiConsent.mockResolvedValue({ success: true, data: { ok: true } });
  });

  it("clicking decline fires toast.info with the i18n declinedToast key", async () => {
    render(<DeclineWiringHarness />);

    const declineBtn = screen.getByText("consent.modal.declineButton");
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(mockRecordAiConsent).toHaveBeenCalledWith("refused");
      expect(mockToastInfo).toHaveBeenCalledTimes(1);
      expect(mockToastInfo).toHaveBeenCalledWith("consent.modal.declinedToast");
    });
  });

  it("does not fire toast when user accepts", async () => {
    render(<DeclineWiringHarness />);

    const acceptBtn = screen.getByText("consent.modal.acceptButton");
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockRecordAiConsent).toHaveBeenCalledWith("accepted");
    });
    expect(mockToastInfo).not.toHaveBeenCalled();
  });
});
