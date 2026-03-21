/**
 * Unit tests for PAConfirmationModal component.
 * Sprint 35: PA cost confirmation before AI generation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockRouterPush = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        return `${fullKey} ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(" ")}`;
      }
      return fullKey;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => "/",
}));

import { PAConfirmationModal } from "@/components/features/gamification/PAConfirmationModal";

describe("PAConfirmationModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    featureName: "Destination Guide",
    paCost: 50,
    currentBalance: 200,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sufficient balance", () => {
    it("renders modal with cost message", () => {
      render(<PAConfirmationModal {...defaultProps} />);
      expect(screen.getByTestId("pa-confirmation-modal")).toBeInTheDocument();
      // Title should show confirm title
      expect(screen.getByText("gamification.confirmModal.title")).toBeInTheDocument();
    });

    it("shows cost, current balance, and balance after", () => {
      render(<PAConfirmationModal {...defaultProps} />);
      const modal = screen.getByTestId("pa-confirmation-modal");
      // Check that cost, balance, and after-balance messages are rendered
      expect(modal.textContent).toContain("cost=50");
      expect(modal.textContent).toContain("balance=200");
      expect(modal.textContent).toContain("balance=150"); // 200 - 50
    });

    it("shows Generate and Cancel buttons", () => {
      render(<PAConfirmationModal {...defaultProps} />);
      expect(
        screen.getByText("gamification.confirmModal.generate")
      ).toBeInTheDocument();
      expect(
        screen.getByText("gamification.confirmModal.cancel")
      ).toBeInTheDocument();
    });

    it("calls onConfirm when Generate is clicked", () => {
      render(<PAConfirmationModal {...defaultProps} />);
      fireEvent.click(screen.getByText("gamification.confirmModal.generate"));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Cancel is clicked", () => {
      render(<PAConfirmationModal {...defaultProps} />);
      fireEvent.click(screen.getByText("gamification.confirmModal.cancel"));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("disables buttons when loading", () => {
      render(<PAConfirmationModal {...defaultProps} isLoading={true} />);
      const generateBtn = screen.getByText("gamification.confirmModal.generate").closest("button");
      const cancelBtn = screen.getByText("gamification.confirmModal.cancel").closest("button");
      expect(generateBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
    });
  });

  describe("insufficient balance", () => {
    const insufficientProps = {
      ...defaultProps,
      currentBalance: 20,
      paCost: 50,
    };

    it("renders insufficient balance title", () => {
      render(<PAConfirmationModal {...insufficientProps} />);
      expect(
        screen.getByText("gamification.confirmModal.insufficientTitle")
      ).toBeInTheDocument();
    });

    it("shows missing amount", () => {
      render(<PAConfirmationModal {...insufficientProps} />);
      const modal = screen.getByTestId("pa-confirmation-modal");
      expect(modal.textContent).toContain("amount=30"); // 50 - 20 = 30
    });

    it("shows Earn More and Close buttons (not Generate)", () => {
      render(<PAConfirmationModal {...insufficientProps} />);
      expect(
        screen.getByText("gamification.confirmModal.earnMore")
      ).toBeInTheDocument();
      expect(
        screen.getByText("gamification.confirmModal.close")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("gamification.confirmModal.generate")
      ).not.toBeInTheDocument();
    });

    it("Earn More links to como-funciona", () => {
      render(<PAConfirmationModal {...insufficientProps} />);
      const earnMoreLink = screen.getByText("gamification.confirmModal.earnMore").closest("a");
      expect(earnMoreLink).toHaveAttribute("href", "/como-funciona");
    });

    it("calls onClose when Close is clicked", () => {
      render(<PAConfirmationModal {...insufficientProps} />);
      fireEvent.click(screen.getByText("gamification.confirmModal.close"));
      expect(insufficientProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("does not render when isOpen is false", () => {
    render(<PAConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("pa-confirmation-modal")).not.toBeInTheDocument();
  });
});
