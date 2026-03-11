"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Locale prefixes that must be stripped from the raw Next.js pathname */
const LOCALE_PREFIXES = routing.locales.map((l) => `/${l}`);

export function LanguageSwitcher() {
  const locale = useLocale();
  // Use Next.js native usePathname to guarantee the full path with dynamic
  // segments is always preserved (next-intl's usePathname can lose them on
  // routes like /expedition/[tripId]/phase-3 under localePrefix: 'as-needed').
  const rawPathname = usePathname();
  const searchParams = useSearchParams();

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

  return (
    <div className="flex items-center gap-1 text-sm">
      <Link
        href={href}
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
        href={href}
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
