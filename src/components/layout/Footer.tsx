"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-border bg-muted/50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("landing.footer.copyright")}
        </p>

        <div className="flex items-center gap-6">
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
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
