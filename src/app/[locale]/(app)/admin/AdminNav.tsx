"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface AdminLinkDef {
  href: string;
  i18nKey: string;
}

const BASE_ADMIN_LINKS: ReadonlyArray<AdminLinkDef> = [
  { href: "/admin/dashboard", i18nKey: "navDashboard" },
  { href: "/admin/feedback", i18nKey: "navFeedback" },
  { href: "/admin/ai-governance", i18nKey: "navAiGovernance" },
  { href: "/admin/analytics", i18nKey: "navAnalytics" },
  { href: "/admin/errors", i18nKey: "navErrors" },
  { href: "/admin/prompts", i18nKey: "navPrompts" },
];

// F-FIX-05 — Sprint 46.5. Closes B-W1-006 honesty flag #4. The link is
// gated by the AI_GOVERNANCE_V2 feature flag (read in the parent server
// layout and passed in as `aiGovernanceV2Enabled`) so this client
// component never imports the server-only flag helper.
const V2_GOVERNANCE_LINK: AdminLinkDef = {
  href: "/admin/ia",
  i18nKey: "navAi",
};

interface AdminNavProps {
  /**
   * When `true`, expose the link to the V2 AI Governance Central
   * (`/admin/ia`). Provided by the parent admin layout (server component)
   * which reads `isAiGovernanceV2Enabled()` from `src/lib/flags/ai-governance.ts`.
   */
  aiGovernanceV2Enabled: boolean;
}

export function AdminNav({ aiGovernanceV2Enabled }: AdminNavProps) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const links: AdminLinkDef[] = aiGovernanceV2Enabled
    ? [...BASE_ADMIN_LINKS, V2_GOVERNANCE_LINK]
    : [...BASE_ADMIN_LINKS];

  return (
    <nav
      aria-label="Admin navigation"
      className="mb-6 flex gap-1 border-b border-atlas-outline-variant/20"
    >
      {links.map((link) => {
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
