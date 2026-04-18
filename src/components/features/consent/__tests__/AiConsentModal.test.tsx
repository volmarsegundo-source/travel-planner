import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRecordAiConsent, mockRouterPush } = vi.hoisted(() => ({
  mockRecordAiConsent: vi.fn(),
  mockRouterPush: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
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

// ─── Import after mocks ───────────────────────────────────────────────────────

import { AiConsentModal } from "../AiConsentModal";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiConsentModal", () => {
  const defaultProps = {
    open: true,
    onAccepted: vi.fn(),
    onDeclined: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAiConsent.mockResolvedValue({ success: true, data: { ok: true } });
  });

  it("renders title, body, privacy link, and two buttons", () => {
    render(<AiConsentModal {...defaultProps} />);

    expect(screen.getByText("consent.modal.title")).toBeInTheDocument();
    expect(screen.getByText("consent.modal.body")).toBeInTheDocument();
    expect(screen.getByText("consent.modal.privacyLink")).toBeInTheDocument();
    expect(screen.getByText("consent.modal.acceptButton")).toBeInTheDocument();
    expect(screen.getByText("consent.modal.declineButton")).toBeInTheDocument();
  });

  it("renders with role=alertdialog and correct aria attributes", () => {
    render(<AiConsentModal {...defaultProps} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "consent-title");
    expect(dialog).toHaveAttribute("aria-describedby", "consent-body");
  });

  it("accept button calls recordAiConsentAction with 'accepted' then invokes onAccepted", async () => {
    render(<AiConsentModal {...defaultProps} />);

    const acceptBtn = screen.getByText("consent.modal.acceptButton");
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockRecordAiConsent).toHaveBeenCalledWith("accepted");
      expect(defaultProps.onAccepted).toHaveBeenCalled();
    });
  });

  it("decline button calls recordAiConsentAction with 'refused' then invokes onDeclined", async () => {
    render(<AiConsentModal {...defaultProps} />);

    const declineBtn = screen.getByText("consent.modal.declineButton");
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(mockRecordAiConsent).toHaveBeenCalledWith("refused");
      expect(defaultProps.onDeclined).toHaveBeenCalled();
    });
  });

  it("does not dismiss on ESC key", () => {
    render(<AiConsentModal {...defaultProps} />);

    fireEvent.keyDown(document, { key: "Escape" });

    // Modal should still be visible
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(defaultProps.onAccepted).not.toHaveBeenCalled();
    expect(defaultProps.onDeclined).not.toHaveBeenCalled();
  });

  it("does not dismiss on click outside", () => {
    render(<AiConsentModal {...defaultProps} />);

    // Click on the backdrop overlay (aria-hidden div)
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) fireEvent.click(backdrop);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(defaultProps.onAccepted).not.toHaveBeenCalled();
    expect(defaultProps.onDeclined).not.toHaveBeenCalled();
  });

  it("privacy link points to /privacy", () => {
    render(<AiConsentModal {...defaultProps} />);

    const link = screen.getByText("consent.modal.privacyLink");
    expect(link.closest("a")).toHaveAttribute("href", "/privacy");
  });

  it("disables both buttons during in-flight action", async () => {
    // Make the action hang to simulate in-flight
    let resolveAction: () => void;
    mockRecordAiConsent.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveAction = resolve;
      })
    );

    render(<AiConsentModal {...defaultProps} />);

    const acceptBtn = screen.getByText("consent.modal.acceptButton");
    fireEvent.click(acceptBtn);

    // Both buttons should be disabled during submission
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      buttons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    // Resolve the action
    resolveAction!();
  });

  it("does not render when open is false", () => {
    render(<AiConsentModal {...defaultProps} open={false} />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("i18n renders translated strings via useTranslations", () => {
    render(<AiConsentModal {...defaultProps} />);

    // The mock returns `namespace.key` format
    expect(screen.getByText("consent.modal.title")).toBeInTheDocument();
  });
});
