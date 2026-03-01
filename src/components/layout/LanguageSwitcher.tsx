"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 text-sm">
      <Link
        href={pathname}
        locale="en"
        className={`rounded px-2 py-1 transition-colors ${
          locale === "en"
            ? "bg-primary/10 font-semibold text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </Link>
      <span className="text-muted-foreground">|</span>
      <Link
        href={pathname}
        locale="pt-BR"
        className={`rounded px-2 py-1 transition-colors ${
          locale === "pt-BR"
            ? "bg-primary/10 font-semibold text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        PT
      </Link>
    </div>
  );
}
