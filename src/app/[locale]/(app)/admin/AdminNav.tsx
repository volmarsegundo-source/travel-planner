"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", i18nKey: "navDashboard" },
  { href: "/admin/feedback", i18nKey: "navFeedback" },
  { href: "/admin/ai-governance", i18nKey: "navAiGovernance" },
  { href: "/admin/analytics", i18nKey: "navAnalytics" },
  { href: "/admin/errors", i18nKey: "navErrors" },
  { href: "/admin/prompts", i18nKey: "navPrompts" },
] as const;

export function AdminNav() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="mb-6 flex gap-1 border-b border-atlas-outline-variant/20"
    >
      {ADMIN_LINKS.map((link) => {
        const isActive = pathname.includes(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2 text-sm font-atlas-body font-bold",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
              "rounded-t-atlas-md",
              isActive
                ? "border-b-2 border-atlas-primary text-atlas-primary"
                : "text-atlas-on-surface-variant hover:text-atlas-on-surface hover:bg-atlas-surface-container-low",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {t(link.i18nKey as Parameters<typeof t>[0])}
          </Link>
        );
      })}
    </nav>
  );
}
