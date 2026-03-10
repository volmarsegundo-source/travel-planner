"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  Building2,
  CheckSquare,
  History,
  Lock,
  Map,
  Navigation,
  Users,
  Wallet,
} from "lucide-react";
import type { PhaseTool } from "@/lib/engines/phase-config";

// ─── Icon Map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Building2,
  CheckSquare,
  History,
  Map,
  Navigation,
  Users,
  Wallet,
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhaseToolsBarProps {
  tools: PhaseTool[];
  tripId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PhaseToolsBar({ tools, tripId }: PhaseToolsBarProps) {
  const t = useTranslations();

  if (tools.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid="phase-tools-bar">
      {tools.map((tool) => {
        const Icon = ICON_MAP[tool.iconName];
        const label = t(tool.labelKey);

        if (tool.status === "coming_soon") {
          return (
            <span
              key={tool.key}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground opacity-60"
              title={t("dashboard.tools.comingSoon")}
              aria-label={`${label} — ${t("dashboard.tools.comingSoon")}`}
            >
              {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
              {label}
              <Lock className="h-3 w-3" aria-hidden="true" />
            </span>
          );
        }

        return (
          <Link
            key={tool.key}
            href={tool.href(tripId)}
            className="pointer-events-auto relative z-20 inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
            {label}
          </Link>
        );
      })}
    </div>
  );
}
