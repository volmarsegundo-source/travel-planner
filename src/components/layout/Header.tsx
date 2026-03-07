"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header() {
  const t = useTranslations();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span aria-hidden="true">🧭</span>
          <span className="font-heading text-atlas-gold-light">{t("common.appName")}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          <Link
            href="/auth/login"
            className="rounded-md px-4 py-2 font-mono text-xs font-medium uppercase tracking-widest text-foreground transition-colors hover:bg-accent"
          >
            {t("auth.signIn")}
          </Link>
          <Link
            href="/auth/register"
            className="rounded-md border border-atlas-gold/60 px-4 py-2 font-mono text-xs font-medium uppercase tracking-widest text-atlas-gold transition-colors hover:bg-atlas-gold/10"
          >
            {t("auth.signUp")}
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              href="/auth/login"
              className="rounded-md px-4 py-2 font-mono text-xs font-medium uppercase tracking-widest text-foreground transition-colors hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("auth.signIn")}
            </Link>
            <Link
              href="/auth/register"
              className="rounded-md border border-atlas-gold/60 px-4 py-2 text-center font-mono text-xs font-medium uppercase tracking-widest text-atlas-gold transition-colors hover:bg-atlas-gold/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("auth.signUp")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
