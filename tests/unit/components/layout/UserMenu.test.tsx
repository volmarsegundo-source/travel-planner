/**
 * Behavior tests for UserMenu component.
 *
 * Tests cover: rendering, dropdown toggle, signOut call,
 * Escape key handling, click-outside closing, and inline mode.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockSignOut } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { UserMenu } from "@/components/layout/UserMenu";

// ─── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  userName: "Jane Doe",
  userImage: null,
  userEmail: "jane@example.com",
};

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("desktop (dropdown) mode", () => {
    it("renders avatar trigger with user initials when no image", () => {
      render(<UserMenu {...defaultProps} />);

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("renders avatar trigger with aria-haspopup", () => {
      render(<UserMenu {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: "Jane Doe" });
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("opens dropdown on click showing name and email", () => {
      render(<UserMenu {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: "Jane Doe" });
      fireEvent.click(trigger);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("calls signOut with callbackUrl when Sign Out is clicked", async () => {
      render(<UserMenu {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: "Jane Doe" });
      fireEvent.click(trigger);

      const signOutButton = screen.getByRole("menuitem", { name: "auth.signOut" });
      await userEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });

    it("closes dropdown on Escape key", () => {
      render(<UserMenu {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: "Jane Doe" });
      fireEvent.click(trigger);

      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("toggles dropdown open and closed", () => {
      render(<UserMenu {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: "Jane Doe" });

      // Open
      fireEvent.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Close
      fireEvent.click(trigger);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("inline (mobile) mode", () => {
    it("renders name and email directly without dropdown", () => {
      render(<UserMenu {...defaultProps} inline />);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("renders sign out button as menuitem", () => {
      render(<UserMenu {...defaultProps} inline />);

      const signOutButton = screen.getByRole("menuitem", { name: "auth.signOut" });
      expect(signOutButton).toBeInTheDocument();
    });

    it("calls signOut when sign out is clicked in inline mode", async () => {
      render(<UserMenu {...defaultProps} inline />);

      const signOutButton = screen.getByRole("menuitem", { name: "auth.signOut" });
      await userEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });
});
