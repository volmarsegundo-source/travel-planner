"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = ["dashboard", "prompts", "modelos", "outputs"] as const;
type TabId = (typeof TABS)[number];

interface AdminIaTabsProps {
  activeTab: TabId;
}

/**
 * 4-tab nav for /admin/ia. Wave 1 skeleton — Wave 2+ wires content.
 * Active tab is communicated via ?tab= search param (server-rendered).
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §3 Wave 1 + §UX (4 tabs decided in INC-08).
 */
export function AdminIaTabs({ activeTab }: AdminIaTabsProps) {
  const t = useTranslations("admin.ia.tabs");
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label={t("ariaLabel")}
      className="flex gap-1 border-b border-atlas-outline-variant/20"
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Link
            key={tab}
            id={`tab-${tab}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab}`}
            href={`${pathname}?tab=${tab}` as never}
            className={cn(
              "min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2 text-sm font-atlas-body font-bold",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
              "rounded-t-atlas-md",
              isActive
                ? "border-b-2 border-atlas-primary text-atlas-primary"
                : "text-atlas-on-surface-variant hover:text-atlas-on-surface hover:bg-atlas-surface-container-low",
            )}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
