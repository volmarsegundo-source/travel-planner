"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface FooterProps {
  variant?: "public" | "authenticated";
}

export function Footer({ variant = "public" }: FooterProps) {
  const t = useTranslations();

  return (
    <footer className="border-t border-atlas-line bg-muted/50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-heading text-atlas-gold" aria-hidden="true">🧭 ATLAS</span>
          <p className="font-mono text-xs text-muted-foreground">
            {t("landing.footer.copyright")}
          </p>
        </div>

        <div className="flex items-center gap-6">
          {variant === "authenticated" ? (
            <>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("landing.footer.terms")}
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("landing.footer.privacy")}
              </Link>
              <Link
                href="/support"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("landing.footer.support")}
              </Link>
              <Link
                href="/como-funciona"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("gamification.howItWorks.title")}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("auth.signIn")}
              </Link>
              <Link
                href="/auth/register"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("auth.signUp")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
