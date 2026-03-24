"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface LandingNavProps {
  isAuthenticated?: boolean;
}

const NAV_HEIGHT_PX = 64;

export function LandingNav({ isAuthenticated = false }: LandingNavProps) {
  const t = useTranslations("landingV2.nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm"
      style={{ height: NAV_HEIGHT_PX }}
    >
      <nav
        className="flex items-center justify-between px-6 h-16 max-w-screen-2xl mx-auto"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-atlas-primary font-atlas-headline"
          >
            {t("logo")}
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-6">
            <a
              href="#"
              className="text-atlas-primary font-semibold border-b-2 border-atlas-secondary-container pb-1"
            >
              {t("explore")}
            </a>
            <a
              href="#"
              className="text-atlas-on-surface-variant hover:text-atlas-on-surface transition-colors duration-150"
            >
              {t("myTrips")}
            </a>
            <a
              href="#"
              className="text-atlas-on-surface-variant hover:text-atlas-on-surface transition-colors duration-150"
            >
              {t("planner")}
            </a>
          </div>
        </div>

        {/* Right side — Language + CTA buttons */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {!isAuthenticated ? (
            <>
              <Link href="/auth/login" className="hidden sm:block">
                <AtlasButton variant="ghost" size="sm">
                  {t("login")}
                </AtlasButton>
              </Link>
              <Link href="/auth/register" className="hidden sm:block">
                <AtlasButton variant="primary" size="sm">
                  {t("getStarted")}
                </AtlasButton>
              </Link>
              {/* Mobile: only "Entrar" button */}
              <Link href="/auth/login" className="sm:hidden">
                <AtlasButton variant="primary" size="sm">
                  {t("login")}
                </AtlasButton>
              </Link>
            </>
          ) : (
            <div className="h-8 w-8 rounded-full bg-atlas-surface-container border border-atlas-outline-variant/20" />
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden p-2 text-atlas-on-surface-variant hover:bg-atlas-surface-container-low rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-xl shadow-md border-t border-atlas-outline-variant/10 z-40">
          <div className="flex flex-col gap-2 px-6 py-4">
            <a
              href="#"
              className="py-2 text-atlas-primary font-semibold"
            >
              {t("explore")}
            </a>
            <a
              href="#"
              className="py-2 text-atlas-on-surface-variant hover:text-atlas-on-surface transition-colors"
            >
              {t("myTrips")}
            </a>
            <a
              href="#"
              className="py-2 text-atlas-on-surface-variant hover:text-atlas-on-surface transition-colors"
            >
              {t("planner")}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
