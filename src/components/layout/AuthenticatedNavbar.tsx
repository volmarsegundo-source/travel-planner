"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

interface AuthenticatedNavbarProps {
  userName: string;
  userImage: string | null;
  userEmail: string;
}

export function AuthenticatedNavbar({ userName, userImage, userEmail }: AuthenticatedNavbarProps) {
  const t = useTranslations();
  const tNav = useTranslations("navigation");
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const isDashboardActive = pathname === "/dashboard" || pathname.startsWith("/expedition");
  const isTripsActive = pathname === "/trips" || pathname.startsWith("/trips/");
  const isProfileActive = pathname === "/profile";

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <span aria-hidden="true">🧭</span>
          <span className="font-heading text-atlas-gold-light">{t("common.appName")}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isDashboardActive
                ? "bg-atlas-gold/10 font-semibold text-atlas-gold"
                : "text-foreground hover:bg-accent"
            }`}
            aria-current={isDashboardActive ? "page" : undefined}
          >
            {tNav("myAtlas")}
          </Link>
          <Link
            href="/trips"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isTripsActive
                ? "bg-atlas-gold/10 font-semibold text-atlas-gold"
                : "text-foreground hover:bg-accent"
            }`}
            aria-current={isTripsActive ? "page" : undefined}
          >
            {tNav("myTrips")}
          </Link>
          <Link
            href="/profile"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isProfileActive
                ? "bg-atlas-gold/10 font-semibold text-atlas-gold"
                : "text-foreground hover:bg-accent"
            }`}
            aria-current={isProfileActive ? "page" : undefined}
          >
            {tNav("myProfile")}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu
            userName={userName}
            userImage={userImage}
            userEmail={userEmail}
          />
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? tNav("closeMenu") : tNav("toggleMenu")}
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
        <div
          id="mobile-menu"
          className="border-t border-border/40 bg-background px-4 pb-4 pt-2 md:hidden"
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isDashboardActive
                  ? "bg-atlas-gold/10 font-semibold text-atlas-gold"
                  : "text-foreground hover:bg-accent"
              }`}
              aria-current={isDashboardActive ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {tNav("myAtlas")}
            </Link>
            <Link
              href="/trips"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isTripsActive
                  ? "bg-atlas-gold/10 font-semibold text-atlas-gold"
                  : "text-foreground hover:bg-accent"
              }`}
              aria-current={isTripsActive ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {tNav("myTrips")}
            </Link>
            <Link
              href="/profile"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isProfileActive
                  ? "bg-atlas-gold/10 font-semibold text-atlas-gold"
                  : "text-foreground hover:bg-accent"
              }`}
              aria-current={isProfileActive ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {tNav("myProfile")}
            </Link>
            <div className="border-t border-border/40 pt-2">
              <ThemeToggle />
            </div>
            <div className="border-t border-border/40 pt-2">
              <LanguageSwitcher />
            </div>
            <div className="border-t border-border/40 pt-2">
              <UserMenu
                userName={userName}
                userImage={userImage}
                userEmail={userEmail}
                inline
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
