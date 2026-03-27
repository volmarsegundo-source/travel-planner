"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Compass } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
// ThemeToggle removed — light mode forced for beta (dark mode redesign post-beta)
import { UserMenu } from "@/components/layout/UserMenu";
import { AtlasBadge } from "@/components/ui";

interface AuthenticatedNavbarV2Props {
  userName: string;
  userImage: string | null;
  userEmail: string;
  gamification?: {
    totalPoints: number;
    availablePoints: number;
    currentLevel: number;
    phaseName: string;
    rank: "novato" | "desbravador" | "navegador" | "capitao" | "aventureiro" | "lendario";
  };
}

export function AuthenticatedNavbarV2({
  userName,
  userImage,
  userEmail,
  gamification,
}: AuthenticatedNavbarV2Props) {
  const t = useTranslations();
  const tNav = useTranslations("navV2");
  const tNavLegacy = useTranslations("navigation");
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

  const isExpeditionsActive =
    pathname === "/expeditions" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/expedition");
  const isAtlasActive = pathname === "/atlas";

  function navLinkClass(active: boolean) {
    return `rounded-lg px-3 py-2 text-sm font-atlas-body font-medium transition-colors duration-200 motion-reduce:transition-none ${
      active
        ? "bg-atlas-secondary-container/10 font-bold text-atlas-primary"
        : "text-atlas-on-surface-variant hover:bg-atlas-surface-container-low hover:text-atlas-on-surface"
    }`;
  }

  // Derive user initials for avatar
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 h-16 border-b border-atlas-outline-variant/20 bg-atlas-surface-container-lowest/95 dark:bg-atlas-primary-container/95 backdrop-blur supports-[backdrop-filter]:bg-atlas-surface-container-lowest/80 dark:supports-[backdrop-filter]:bg-atlas-primary-container/80"
      data-testid="navbar-v2"
    >
      <nav
        aria-label={tNav("mainNavigation")}
        className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <Link
          href="/expeditions"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 rounded-lg"
        >
          <Compass className="size-5 text-atlas-primary" aria-hidden="true" />
          <span
            className="font-atlas-headline text-lg font-bold text-atlas-primary"
            aria-hidden="true"
          >
            Atlas
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/expeditions"
            className={navLinkClass(isExpeditionsActive)}
            aria-current={isExpeditionsActive ? "page" : undefined}
          >
            {tNavLegacy("expeditions")}
          </Link>
          <Link
            href="/atlas"
            className={navLinkClass(isAtlasActive)}
            aria-current={isAtlasActive ? "page" : undefined}
          >
            {tNavLegacy("myAtlas")}
          </Link>

          <div className="mx-1 h-6 w-px bg-atlas-outline-variant/20" aria-hidden="true" />

          {/* ThemeToggle removed — light mode forced for beta */}
          <LanguageSwitcher />

          {gamification && (
            <span data-testid="pa-counter">
              <AtlasBadge
                variant="pa"
                points={gamification.availablePoints}
                size="md"
              />
            </span>
          )}

          <UserMenu
            userName={userName}
            userImage={userImage}
            userEmail={userEmail}
          />
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-atlas-on-surface-variant md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 transition-colors duration-200 motion-reduce:transition-none hover:bg-atlas-surface-container-low"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu-v2"
          aria-label={mobileMenuOpen ? tNavLegacy("closeMenu") : tNavLegacy("toggleMenu")}
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-v2"
          className="border-t border-atlas-outline-variant/20 bg-atlas-surface-container-lowest px-4 pb-4 pt-2 md:hidden"
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/expeditions"
              className={navLinkClass(isExpeditionsActive)}
              aria-current={isExpeditionsActive ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {tNavLegacy("expeditions")}
            </Link>
            <Link
              href="/atlas"
              className={navLinkClass(isAtlasActive)}
              aria-current={isAtlasActive ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {tNavLegacy("myAtlas")}
            </Link>
            {gamification && (
              <div className="border-t border-atlas-outline-variant/20 pt-2" data-testid="pa-counter-mobile">
                <AtlasBadge
                  variant="pa"
                  points={gamification.availablePoints}
                  size="md"
                />
              </div>
            )}
            <div className="border-t border-atlas-outline-variant/20 pt-2 flex gap-2">
              {/* ThemeToggle removed — light mode forced for beta */}
              <LanguageSwitcher />
            </div>
            <div className="border-t border-atlas-outline-variant/20 pt-2">
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
