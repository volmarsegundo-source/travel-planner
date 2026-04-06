"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AtlasCard, AtlasButton, AtlasBadge } from "@/components/ui";
import { toggleKillSwitchAction } from "@/server/actions/ai-governance.actions";
import type {
  AiGovernanceOverview,
  AiPhaseDetail,
} from "@/server/services/ai-governance-dashboard.service";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AiGovernanceClientProps {
  overview: AiGovernanceOverview;
  phases: {
    plan: AiPhaseDetail;
    checklist: AiPhaseDetail;
    guide: AiPhaseDetail;
  };
}

type TabKey = "overview" | "plan" | "checklist" | "guide";

const PHASE_TABS: { key: TabKey; i18nKey: string }[] = [
  { key: "overview", i18nKey: "overview" },
  { key: "plan", i18nKey: "plan" },
  { key: "checklist", i18nKey: "checklist" },
  { key: "guide", i18nKey: "guide" },
];

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <AtlasCard>
      <p className="text-sm text-atlas-on-surface-variant font-atlas-body">
        {label}
      </p>
      <p className="mt-1 text-2xl font-atlas-headline font-bold text-atlas-on-surface">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-atlas-on-surface-variant">
            {unit}
          </span>
        )}
      </p>
    </AtlasCard>
  );
}

// ─── Kill Switch Card ───────────────────────────────────────────────────────

function KillSwitchCard({
  phase,
  isEnabled,
  reason,
  t,
}: {
  phase: string;
  isEnabled: boolean;
  reason: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const [isPending, startTransition] = useTransition();
  const phaseLabel =
    t.has(phase as Parameters<typeof t>[0])
      ? t(phase as Parameters<typeof t>[0])
      : phase;

  const handleToggle = () => {
    const newEnabled = !isEnabled;
    const promptMessage = newEnabled
      ? `Enable kill switch for ${phase}? Enter reason:`
      : `Disable kill switch for ${phase}? Enter reason:`;

    const userReason = window.prompt(promptMessage);
    if (!userReason) return;

    startTransition(async () => {
      await toggleKillSwitchAction(phase, newEnabled, userReason);
      // Page will be re-rendered by Next.js on next navigation
      window.location.reload();
    });
  };

  return (
    <AtlasCard>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-atlas-body font-bold text-atlas-on-surface">
            {phaseLabel}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <AtlasBadge
              variant="status"
              color={isEnabled ? "error" : "success"}
              size="sm"
            >
              {isEnabled ? t("enabled") : t("disabled")}
            </AtlasBadge>
            {reason && (
              <span className="text-xs text-atlas-on-surface-variant truncate">
                {reason}
              </span>
            )}
          </div>
        </div>
        <AtlasButton
          variant={isEnabled ? "secondary" : "danger"}
          size="sm"
          onClick={handleToggle}
          loading={isPending}
          aria-label={`${t("toggle")} ${phaseLabel}`}
        >
          {t("toggle")}
        </AtlasButton>
      </div>
    </AtlasCard>
  );
}

// ─── Phase Detail Panel ─────────────────────────────────────────────────────

function PhaseDetailPanel({
  detail,
  t,
}: {
  detail: AiPhaseDetail;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-6">
      {/* Phase KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label={t("totalCalls")} value={detail.totalCalls} />
        <KpiCard
          label={t("totalCost")}
          value={`$${detail.totalCostUsd.toFixed(2)}`}
        />
        <KpiCard
          label={t("errorRate")}
          value={detail.errorRate}
          unit="%"
        />
        <KpiCard
          label={t("cacheHitRate")}
          value={detail.cacheHitRate}
          unit="%"
        />
        <KpiCard
          label={t("avgLatency")}
          value={detail.avgLatencyMs}
          unit="ms"
        />
      </div>

      {/* Top Errors */}
      {detail.topErrors.length > 0 && (
        <AtlasCard>
          <h3 className="mb-3 font-atlas-headline font-bold text-atlas-on-surface">
            {t("topErrors")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-atlas-body">
              <thead>
                <tr className="border-b border-atlas-outline-variant/20">
                  <th className="pb-2 font-bold text-atlas-on-surface-variant">
                    {t("errorCode")}
                  </th>
                  <th className="pb-2 text-right font-bold text-atlas-on-surface-variant">
                    {t("count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.topErrors.map((err) => (
                  <tr
                    key={err.errorCode}
                    className="border-b border-atlas-outline-variant/10"
                  >
                    <td className="py-2 text-atlas-on-surface">
                      <code className="text-xs">{err.errorCode}</code>
                    </td>
                    <td className="py-2 text-right text-atlas-on-surface">
                      {err.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AtlasCard>
      )}

      {detail.totalCalls === 0 && (
        <p className="text-center text-sm text-atlas-on-surface-variant py-8">
          {t("noData")}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AiGovernanceClient({
  overview,
  phases,
}: AiGovernanceClientProps) {
  const t = useTranslations("admin.aiGovernance");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-atlas-headline font-bold text-atlas-on-surface">
          {t("title")}
        </h2>
        <p className="text-sm text-atlas-on-surface-variant font-atlas-body">
          {t("period")}
        </p>
      </div>

      {/* Tab Navigation */}
      <nav
        role="tablist"
        aria-label={t("title")}
        className="flex gap-1 border-b border-atlas-outline-variant/20"
      >
        {PHASE_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-atlas-body font-bold",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
              "rounded-t-atlas-md",
              activeTab === tab.key
                ? "border-b-2 border-atlas-primary text-atlas-primary"
                : "text-atlas-on-surface-variant hover:text-atlas-on-surface hover:bg-atlas-surface-container-low",
            ].join(" ")}
          >
            {t(tab.i18nKey as Parameters<typeof t>[0])}
          </button>
        ))}
      </nav>

      {/* Overview Panel */}
      {activeTab === "overview" && (
        <div id="panel-overview" role="tabpanel" className="space-y-6">
          {/* 6 KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label={t("totalCalls")}
              value={overview.totalCalls}
            />
            <KpiCard
              label={t("totalCost")}
              value={`$${overview.totalCostUsd.toFixed(2)}`}
            />
            <KpiCard
              label={t("errorRate")}
              value={overview.errorRate}
              unit="%"
            />
            <KpiCard
              label={t("cacheHitRate")}
              value={overview.cacheHitRate}
              unit="%"
            />
            <KpiCard
              label={t("blockedCalls")}
              value={overview.blockedCalls}
            />
            <KpiCard
              label={t("avgLatency")}
              value={overview.avgLatencyMs}
              unit="ms"
            />
          </div>

          {/* Calls by Phase Table */}
          {overview.callsByPhase.length > 0 && (
            <AtlasCard>
              <h3 className="mb-3 font-atlas-headline font-bold text-atlas-on-surface">
                {t("callsByPhase")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-atlas-body">
                  <thead>
                    <tr className="border-b border-atlas-outline-variant/20">
                      <th className="pb-2 font-bold text-atlas-on-surface-variant">
                        {t("phase")}
                      </th>
                      <th className="pb-2 text-right font-bold text-atlas-on-surface-variant">
                        {t("calls")}
                      </th>
                      <th className="pb-2 text-right font-bold text-atlas-on-surface-variant">
                        {t("cost")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.callsByPhase.map((row) => (
                      <tr
                        key={row.phase}
                        className="border-b border-atlas-outline-variant/10"
                      >
                        <td className="py-2 text-atlas-on-surface">
                          {t.has(row.phase as Parameters<typeof t>[0])
                            ? t(row.phase as Parameters<typeof t>[0])
                            : row.phase}
                        </td>
                        <td className="py-2 text-right text-atlas-on-surface">
                          {row.count}
                        </td>
                        <td className="py-2 text-right text-atlas-on-surface">
                          ${row.costUsd.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AtlasCard>
          )}

          {/* Kill Switch Status */}
          <div>
            <h3 className="mb-3 font-atlas-headline font-bold text-atlas-on-surface">
              {t("killSwitch")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {overview.killSwitchStatus.map((ks) => (
                <KillSwitchCard
                  key={ks.phase}
                  phase={ks.phase}
                  isEnabled={ks.isEnabled}
                  reason={ks.reason}
                  t={t}
                />
              ))}
              {overview.killSwitchStatus.length === 0 && (
                <p className="text-sm text-atlas-on-surface-variant col-span-full py-4">
                  {t("noData")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Per-Phase Panels */}
      {activeTab === "plan" && (
        <div id="panel-plan" role="tabpanel">
          <PhaseDetailPanel detail={phases.plan} t={t} />
        </div>
      )}
      {activeTab === "checklist" && (
        <div id="panel-checklist" role="tabpanel">
          <PhaseDetailPanel detail={phases.checklist} t={t} />
        </div>
      )}
      {activeTab === "guide" && (
        <div id="panel-guide" role="tabpanel">
          <PhaseDetailPanel detail={phases.guide} t={t} />
        </div>
      )}
    </div>
  );
}
