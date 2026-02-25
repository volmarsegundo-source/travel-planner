"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

export function TrustSignals() {
  const t = useTranslations("auth.register");

  return (
    <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-3 space-y-1">
      <div className="flex items-center gap-2">
        <ShieldCheck
          className="h-4 w-4 flex-shrink-0 text-green-600"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-green-700">
          {t("trustBadge")}
        </span>
      </div>
      <p className="text-xs text-gray-600 pl-6">{t("privacyNote")}</p>
      <a
        href="/privacy"
        className="block text-xs text-green-700 underline underline-offset-2 pl-6 hover:text-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
      >
        {t("deleteAccountLink")}
      </a>
    </div>
  );
}
