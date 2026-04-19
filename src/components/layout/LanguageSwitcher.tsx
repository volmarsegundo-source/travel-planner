"use client";

import { useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";
import { useWizardDirty } from "@/contexts/WizardDirtyContext";
import { Button } from "@/components/ui/button";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Locale prefixes that must be stripped from the raw Next.js pathname */
const LOCALE_PREFIXES = routing.locales.map((l) => `/${l}`);

/** Tooltip show delay in ms */
const TOOLTIP_DELAY_MS = 300;

// ─── Component ──────────────────────────────────────────────────────────────

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("languageSwitcher");

  // Use Next.js native usePathname to guarantee the full path with dynamic
  // segments is always preserved (next-intl's usePathname can lose them on
  // routes like /expedition/[tripId]/phase-3 under localePrefix: 'as-needed').
  const rawPathname = usePathname();
  const searchParams = useSearchParams();

  // Dirty state from wizard context (safe no-op defaults when outside provider)
  const { isDirty, save, discard } = useWizardDirty();

  // Dialog state: which locale the user wants to switch to
  const [pendingLocale, setPendingLocale] = useState<string | null>(null);

  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tooltipId = "language-switcher-tooltip";

  // Strip locale prefix so next-intl's Link can re-apply the correct one
  let pathname = rawPathname ?? "/";
  for (const prefix of LOCALE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      pathname = pathname.slice(prefix.length) || "/";
      break;
    }
  }

  // Build href with search params preserved
  const search = searchParams?.toString() ?? "";
  const href = search ? `${pathname}?${search}` : pathname;

  // ─── Tooltip handlers ───────────────────────────────────────────────────

  function showTooltip() {
    tooltipTimeoutRef.current = setTimeout(
      () => setTooltipVisible(true),
      TOOLTIP_DELAY_MS,
    );
  }

  function hideTooltip() {
    clearTimeout(tooltipTimeoutRef.current);
    setTooltipVisible(false);
  }

  // ─── Locale switch interception ─────────────────────────────────────────

  function handleLocaleClick(
    e: React.MouseEvent,
    targetLocale: string,
  ) {
    // Clicking the already-active locale is a no-op
    if (targetLocale === locale) return;

    // If wizard has unsaved changes, intercept and show dialog
    if (isDirty) {
      e.preventDefault();
      setPendingLocale(targetLocale);
    }
    // Otherwise, let the Link navigate normally
  }

  // ─── Dialog actions ─────────────────────────────────────────────────────

  function handleCancel() {
    setPendingLocale(null);
  }

  async function handleSaveAndSwitch() {
    await save();
    setPendingLocale(null);
    // Navigate by clicking the hidden link programmatically
    navigateToLocale();
  }

  function handleDiscardAndSwitch() {
    discard();
    setPendingLocale(null);
    navigateToLocale();
  }

  function navigateToLocale() {
    // Use window.location for cross-locale navigation after dialog
    if (pendingLocale) {
      const localePrefix =
        pendingLocale === routing.defaultLocale ? "" : `/${pendingLocale}`;
      const target = `${localePrefix}${pathname}${search ? `?${search}` : ""}`;
      window.location.href = target;
    }
  }

  // ─── Link class helper ─────────────────────────────────────────────────

  function linkClass(targetLocale: string) {
    return `rounded px-2 py-1 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors focus-visible:ring-2 ring-atlas-focus-ring ${
      locale === targetLocale
        ? "bg-atlas-primary/10 font-semibold text-atlas-primary"
        : "text-atlas-on-surface-variant hover:text-atlas-on-surface"
    }`;
  }

  return (
    <>
      <div
        className="relative inline-block"
        data-testid="language-switcher"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <div
          className="flex items-center gap-1 text-sm"
          aria-describedby={tooltipVisible ? tooltipId : undefined}
        >
          <Link
            href={href}
            locale="en"
            className={linkClass("en")}
            onClick={(e: React.MouseEvent) => handleLocaleClick(e, "en")}
          >
            EN
          </Link>
          <span className="text-atlas-on-surface-variant" aria-hidden="true">
            |
          </span>
          <Link
            href={href}
            locale="pt-BR"
            className={linkClass("pt-BR")}
            onClick={(e: React.MouseEvent) => handleLocaleClick(e, "pt-BR")}
          >
            PT
          </Link>
        </div>

        {/* Tooltip (D1) */}
        {tooltipVisible && (
          <div
            id={tooltipId}
            role="tooltip"
            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 text-xs font-atlas-body text-white bg-gray-900 rounded-lg shadow-lg max-w-[250px] text-center whitespace-normal pointer-events-none motion-reduce:transition-none"
          >
            {t("tooltip")}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Unsaved changes dialog (D2) */}
      {pendingLocale !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="lang-dialog-overlay"
          onClick={handleCancel}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lang-unsaved-dialog-title"
            className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3
              id="lang-unsaved-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              {t("unsavedDialog.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("unsavedDialog.body")}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscardAndSwitch}
                data-testid="lang-dialog-discard-switch"
                className="min-h-[44px]"
              >
                {t("unsavedDialog.discardAndSwitch")}
              </Button>
              <Button
                type="button"
                onClick={handleSaveAndSwitch}
                className="bg-atlas-teal text-white hover:bg-atlas-teal/90 min-h-[44px]"
                data-testid="lang-dialog-save-switch"
              >
                {t("unsavedDialog.saveAndSwitch")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
