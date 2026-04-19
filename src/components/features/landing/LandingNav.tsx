"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui";
import { Compass } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface LandingNavProps {
  isAuthenticated?: boolean;
}

const NAV_HEIGHT_PX = 64;

// SPEC-LANDING-HEADER-001: anonymous landing nav contains only logo +
// language switch + Login + Register. The previous "Explorar / Minhas
// Viagens / Planejador" dead-link menus were removed so PT and EN render
// the same, useful set of controls.
export function LandingNav({ isAuthenticated = false }: LandingNavProps) {
  const t = useTranslations("landingV2.nav");

  return (
    <header
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm"
      style={{ height: NAV_HEIGHT_PX }}
    >
      <nav
        className="flex items-center justify-between px-6 h-16 max-w-screen-2xl mx-auto"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight text-atlas-primary font-atlas-headline"
        >
          <Compass className="size-6" aria-hidden="true" />
          {t("logo")}
        </Link>

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
        </div>
      </nav>
    </header>
  );
}
