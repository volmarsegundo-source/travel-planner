"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";

const LOCALES = [
  { code: "pt-BR", label: "PT" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // next-intl routing: for defaultLocale (pt-BR) the prefix is hidden
    // For non-default locales, prefix is added (/en/...)
    // Since routing is set to localePrefix "as-needed", we just navigate
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" aria-label="Selecionar idioma">
      <Globe className="h-4 w-4 text-gray-400" aria-hidden="true" />
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          aria-pressed={locale === code}
          aria-label={`Mudar para ${label}`}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            locale === code
              ? "bg-orange-100 text-orange-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
