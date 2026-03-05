"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// Inline SVG lock icon — no external dependency, WCAG-safe aria-hidden
function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function TrustSignals() {
  const t = useTranslations("trustSignals");

  return (
    <div className="mt-6 flex flex-col items-center gap-2 text-center">
      {/* Security badge */}
      <div className="flex items-center gap-1.5">
        <LockIcon />
        <span className="text-sm font-medium text-gray-500">{t("badge")}</span>
      </div>

      {/* Privacy statement */}
      <p className="text-sm text-gray-500">{t("privacy")}</p>

      {/* Delete account link */}
      <Link
        href="/account/delete"
        className="text-sm text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
      >
        {t("deleteAccount")}
      </Link>
    </div>
  );
}
