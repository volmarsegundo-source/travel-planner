/**
 * Tests for LanguageSwitcher with unsaved-changes dialog (D2)
 * and explanatory tooltip (D1).
 *
 * TDD: tests written before implementation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockUseLocale = vi.fn().mockReturnValue("pt-BR");
const mockUseTranslations = vi.fn(
  (namespace?: string) => (key: string) => (namespace ? `${namespace}.${key}` : key),
);

vi.mock("next-intl", () => ({
  useLocale: () => mockUseLocale(),
  useTranslations: (ns?: string) => mockUseTranslations(ns),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/expedition/123/phase-1",
  useSearchParams: () => ({
    toString: () => "",
  }),
}));

const mockRouterPush = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    locale,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale: string;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }) => (
    <a
      href={`/${locale}${href}`}
      data-locale={locale}
      onClick={onClick}
      {...props}
    >
      {children}
    </a>
  ),
  useRouter: () => ({ push: mockRouterPush }),
}));

import React from "react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { WizardDirtyProvider, useWizardDirty } from "@/contexts/WizardDirtyContext";

// ─── Helper: registers dirty state in context ──────────────────────────────

function DirtyRegistrar({
  dirty,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
}) {
  const { register } = useWizardDirty();

  React.useEffect(() => {
    register({ isDirty: dirty, save: onSave, discard: onDiscard });
  }, [dirty, onSave, onDiscard, register]);

  return null;
}

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocale.mockReturnValue("pt-BR");
  });

  // ─── Basic rendering ─────────────────────────────────────────────────────

  it("renders EN and PT links", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("PT")).toBeInTheDocument();
  });

  // ─── Direct switch without context ────────────────────────────────────────

  it("switches locale directly when not inside a WizardDirtyProvider", () => {
    render(<LanguageSwitcher />);

    const enLink = screen.getByText("EN");
    fireEvent.click(enLink);

    // No dialog should appear — link navigates normally
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Direct switch when dirty=false ───────────────────────────────────────

  it("switches locale directly when wizard is not dirty", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={false} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    const enLink = screen.getByText("EN");
    fireEvent.click(enLink);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Shows dialog when dirty=true ─────────────────────────────────────────

  it("shows unsaved changes dialog when wizard is dirty", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    const enLink = screen.getByText("EN");
    fireEvent.click(enLink);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("languageSwitcher.unsavedDialog.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("languageSwitcher.unsavedDialog.body"),
    ).toBeInTheDocument();
  });

  // ─── Save and switch ─────────────────────────────────────────────────────

  it("calls save then navigates when 'save and switch' is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    fireEvent.click(screen.getByText("EN"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("lang-dialog-save-switch"));
    });

    expect(onSave).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ─── Discard and switch ───────────────────────────────────────────────────

  it("calls discard then navigates when 'discard and switch' is clicked", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    fireEvent.click(screen.getByText("EN"));
    fireEvent.click(screen.getByTestId("lang-dialog-discard-switch"));

    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Cancel / Escape ──────────────────────────────────────────────────────

  it("dismisses dialog on Escape key and stays on current locale", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    fireEvent.click(screen.getByText("EN"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId("lang-dialog-overlay"), {
      key: "Escape",
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("dismisses dialog on overlay click", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    fireEvent.click(screen.getByText("EN"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("lang-dialog-overlay"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Clicking active locale does not trigger dialog ───────────────────────

  it("does not show dialog when clicking the already-active locale", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    mockUseLocale.mockReturnValue("pt-BR");

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <LanguageSwitcher />
      </WizardDirtyProvider>,
    );

    // PT is the active locale; clicking it should not show dialog
    fireEvent.click(screen.getByText("PT"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Tooltip (D1) ────────────────────────────────────────────────────────

  it("shows tooltip on hover with i18n text", async () => {
    render(<LanguageSwitcher />);

    const wrapper = screen.getByTestId("language-switcher");
    fireEvent.mouseEnter(wrapper);

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(
        screen.getByText("languageSwitcher.tooltip"),
      ).toBeInTheDocument();
    });
  });

  it("shows tooltip on focus", async () => {
    render(<LanguageSwitcher />);

    const wrapper = screen.getByTestId("language-switcher");
    fireEvent.focus(wrapper);

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });
  });
});
