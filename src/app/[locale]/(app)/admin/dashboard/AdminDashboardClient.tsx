"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type {
  EnhancedKPIs,
  RevenueDataPoint,
  AiCallDataPoint,
  LevelDistributionRow,
  TopDestinationRow,
  PaginatedPerUserProfit,
  MarginAlert,
} from "@/server/services/admin-dashboard.service";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminDashboardClientProps {
  kpis: EnhancedKPIs;
  revenueData: RevenueDataPoint[];
  aiCallsData: AiCallDataPoint[];
  levelDistribution: LevelDistributionRow[];
  topDestinations: TopDestinationRow[];
  initialUserProfit: PaginatedPerUserProfit;
  marginAlert: MarginAlert;
}

type PeriodKey = "7d" | "30d" | "90d" | "1y";
type SortKey = "revenue" | "aiCost" | "profit" | "rank";

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminDashboardClient({
  kpis,
  revenueData,
  aiCallsData,
  levelDistribution,
  topDestinations,
  initialUserProfit,
  marginAlert,
}: AdminDashboardClientProps) {
  const t = useTranslations("admin.dashboard");

  // Period filter
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("30d");

  // User table state
  const [userProfit, setUserProfit] = useState(initialUserProfit);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // Fetch user profit table (client-side)
  const fetchUserProfit = useCallback(
    async (page: number, search: string, sort: SortKey) => {
      setIsLoadingTable(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "25",
          sort,
        });
        if (search) params.set("search", search);

        const res = await fetch(`/api/admin/users-profit?${params}`);
        if (res.ok) {
          const data = await res.json();
          setUserProfit(data);
        }
      } finally {
        setIsLoadingTable(false);
      }
    },
    []
  );

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setCurrentPage(1);
        fetchUserProfit(1, value, sortBy);
      }, 400);
    },
    [sortBy, fetchUserProfit]
  );

  // Sort change
  const handleSortChange = useCallback(
    (newSort: SortKey) => {
      setSortBy(newSort);
      setCurrentPage(1);
      fetchUserProfit(1, searchTerm, newSort);
    },
    [searchTerm, fetchUserProfit]
  );

  // Pagination
  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      fetchUserProfit(newPage, searchTerm, sortBy);
    },
    [searchTerm, sortBy, fetchUserProfit]
  );

  // CSV export
  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ sort: sortBy });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/export-csv?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  }, [sortBy, searchTerm]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const maxAiCalls = Math.max(...aiCallsData.map((d) => d.total), 1);
  const maxLevelCount = Math.max(...levelDistribution.map((d) => d.count), 1);
  const maxDestCount = Math.max(...topDestinations.map((d) => d.count), 1);
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenueCents), 1);

  const periods: PeriodKey[] = ["7d", "30d", "90d", "1y"];

  return (
    <div className="space-y-8">
      {/* Margin Alerts */}
      {marginAlert.level === "red" && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
        >
          <p className="font-semibold">
            {t("alerts.marginCritical", { percent: marginAlert.marginPercent })}
          </p>
        </div>
      )}
      {marginAlert.level === "yellow" && (
        <div
          role="alert"
          className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200"
        >
          <p className="font-semibold">
            {t("alerts.marginWarning", { percent: marginAlert.marginPercent })}
          </p>
        </div>
      )}

      {/* Period Filter */}
      <div className="flex items-center gap-2" role="group" aria-label={t("period.label")}>
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activePeriod === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            aria-pressed={activePeriod === p}
          >
            {t(`period.${p}`)}
          </button>
        ))}
      </div>

      {/* User KPI Cards */}
      <section aria-labelledby="user-kpis-heading">
        <h2 id="user-kpis-heading" className="mb-3 text-lg font-semibold">
          {t("kpi.userKpis")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label={t("kpi.totalUsers")}
            value={kpis.totalUsers.toLocaleString()}
            subtitle={`${kpis.freeUsers} ${t("kpi.freeUsers")} / ${kpis.payingUsers} ${t("kpi.payingUsers")}`}
            tooltip={t("kpi.tooltipTotalUsers")}
          />
          <KPICard
            label={t("kpi.payingUsers")}
            value={kpis.payingUsers.toLocaleString()}
            tooltip={t("kpi.tooltipPayingUsers")}
          />
          <KPICard
            label={t("kpi.conversionRate")}
            value={`${kpis.conversionRate}%`}
            tooltip={t("kpi.tooltipConversionRate")}
          />
          <KPICard
            label={t("activeUsers")}
            value={kpis.activeUsers.toLocaleString()}
            tooltip={t("kpi.tooltipActiveUsers")}
          />
        </div>
      </section>

      {/* Financial KPI Cards */}
      <section aria-labelledby="financial-kpis-heading">
        <h2 id="financial-kpis-heading" className="mb-3 text-lg font-semibold">
          {t("kpi.financialKpis")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label={t("totalRevenue")}
            value={formatCurrency(kpis.totalRevenueCents)}
            tooltip={t("kpi.tooltipTotalRevenue")}
          />
          <KPICard
            label={t("estimatedAiCost")}
            value={formatCurrency(kpis.estimatedAiCostCents)}
            tooltip={t("kpi.tooltipEstimatedAiCost")}
          />
          <KPICard
            label={t("kpi.grossMargin")}
            value={`${kpis.grossMarginPercent}%`}
            highlight={kpis.grossMarginPercent >= 80}
            warning={kpis.grossMarginPercent < 50}
            tooltip={t("kpi.tooltipGrossMargin")}
          />
          <KPICard
            label={t("kpi.arpu")}
            value={formatCurrency(kpis.arpu)}
            tooltip={t("kpi.tooltipArpu")}
          />
          <KPICard
            label={t("kpi.paEmitted")}
            value={kpis.paEmitted.toLocaleString()}
            tooltip={t("kpi.tooltipPaEmitted")}
          />
          <KPICard
            label={t("kpi.paConsumed")}
            value={kpis.paConsumed.toLocaleString()}
            tooltip={t("kpi.tooltipPaConsumed")}
          />
          <KPICard
            label={t("paInCirculation")}
            value={kpis.paInCirculation.toLocaleString()}
            tooltip={t("kpi.tooltipPaInCirculation")}
          />
          <KPICard
            label={t("totalPurchases")}
            value={kpis.totalPurchases.toString()}
            tooltip={t("kpi.tooltipTotalPurchases")}
          />
        </div>
      </section>

      {/* Revenue Chart */}
      <section aria-labelledby="revenue-heading">
        <h2 id="revenue-heading" className="mb-4 text-lg font-semibold">
          {t("revenueChart")}
        </h2>
        {revenueData.length === 0 ? (
          <p className="text-muted-foreground">{t("noRevenueData")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border p-4">
            <div
              className="flex items-end gap-1"
              style={{ minHeight: "200px" }}
              role="img"
              aria-label={t("revenueChartLabel")}
            >
              {revenueData.map((point) => {
                const height = Math.max(
                  4,
                  (point.revenueCents / maxRevenue) * 180
                );
                return (
                  <div
                    key={point.date}
                    className="flex flex-1 flex-col items-center"
                  >
                    <div
                      className="w-full max-w-8 rounded-t bg-atlas-gold transition-all hover:bg-atlas-gold/80"
                      style={{ height: `${height}px` }}
                      title={`${point.date}: ${formatCurrency(point.revenueCents)} (${point.purchaseCount})`}
                    />
                    <span className="mt-1 max-w-12 truncate text-[10px] text-muted-foreground">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* AI Calls Chart */}
      <section aria-labelledby="ai-calls-heading">
        <h2 id="ai-calls-heading" className="mb-4 text-lg font-semibold">
          {t("charts.aiCalls")}
        </h2>
        {aiCallsData.length === 0 ? (
          <p className="text-muted-foreground">{t("charts.noData")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-blue-500" />
                {t("charts.checklist")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-green-500" />
                {t("charts.guide")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-orange-500" />
                {t("charts.itinerary")}
              </span>
            </div>
            <div
              className="flex items-end gap-1"
              style={{ minHeight: "180px" }}
              role="img"
              aria-label={t("charts.aiCallsLabel")}
            >
              {aiCallsData.map((point) => {
                const totalHeight = Math.max(4, (point.total / maxAiCalls) * 160);
                const checklistPct = point.total > 0 ? point.checklist / point.total : 0;
                const guidePct = point.total > 0 ? point.guide / point.total : 0;
                return (
                  <div
                    key={point.date}
                    className="flex flex-1 flex-col items-center"
                  >
                    <div
                      className="flex w-full max-w-8 flex-col overflow-hidden rounded-t"
                      style={{ height: `${totalHeight}px` }}
                      title={`${point.date}: ${point.total} (C:${point.checklist} G:${point.guide} I:${point.itinerary})`}
                    >
                      <div
                        className="w-full bg-blue-500"
                        style={{ height: `${checklistPct * 100}%` }}
                      />
                      <div
                        className="w-full bg-green-500"
                        style={{ height: `${guidePct * 100}%` }}
                      />
                      <div className="w-full flex-1 bg-orange-500" />
                    </div>
                    <span className="mt-1 max-w-12 truncate text-[10px] text-muted-foreground">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Level Distribution */}
      <section aria-labelledby="level-dist-heading">
        <h2 id="level-dist-heading" className="mb-4 text-lg font-semibold">
          {t("charts.levelDistribution")}
        </h2>
        {levelDistribution.length === 0 ? (
          <p className="text-muted-foreground">{t("charts.noData")}</p>
        ) : (
          <div className="space-y-2 rounded-lg border p-4">
            {levelDistribution.map((row) => (
              <div key={row.rank} className="flex items-center gap-3">
                <span className="w-24 text-sm capitalize">{row.rank}</span>
                <div className="flex-1">
                  <div
                    className="h-6 rounded bg-primary/70 transition-all"
                    style={{
                      width: `${Math.max(2, (row.count / maxLevelCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-medium">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top Destinations */}
      <section aria-labelledby="top-dest-heading">
        <h2 id="top-dest-heading" className="mb-4 text-lg font-semibold">
          {t("charts.topDestinations")}
        </h2>
        {topDestinations.length === 0 ? (
          <p className="text-muted-foreground">{t("charts.noData")}</p>
        ) : (
          <div className="space-y-2 rounded-lg border p-4">
            {topDestinations.map((row) => (
              <div key={row.destination} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm" title={row.destination}>
                  {row.destination}
                </span>
                <div className="flex-1">
                  <div
                    className="h-6 rounded bg-atlas-gold/70 transition-all"
                    style={{
                      width: `${Math.max(2, (row.count / maxDestCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-medium">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Per-User Profit Table */}
      <section aria-labelledby="user-profit-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="user-profit-heading" className="text-lg font-semibold">
            {t("userTable")}
          </h2>
          <div className="flex items-center gap-3">
            <label htmlFor="user-search" className="sr-only">
              {t("table.search")}
            </label>
            <input
              id="user-search"
              type="search"
              placeholder={t("table.search")}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              aria-label={t("export.exportCsv")}
            >
              {isExporting ? t("export.exporting") : t("export.exportCsv")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">
                  {t("columnUser")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("columnEmail")}
                </th>
                <SortableHeader
                  label={t("columnPoints")}
                  active={false}
                  align="right"
                />
                <th className="px-4 py-2 text-right font-medium">
                  {t("table.balance")}
                </th>
                <SortableHeader
                  label={t("columnRank")}
                  active={sortBy === "rank"}
                  align="left"
                  onClick={() => handleSortChange("rank")}
                />
                <th className="px-4 py-2 text-right font-medium">
                  {t("columnTrips")}
                </th>
                <SortableHeader
                  label={t("table.revenue")}
                  active={sortBy === "revenue"}
                  align="right"
                  onClick={() => handleSortChange("revenue")}
                />
                <SortableHeader
                  label={t("table.aiCost")}
                  active={sortBy === "aiCost"}
                  align="right"
                  onClick={() => handleSortChange("aiCost")}
                />
                <SortableHeader
                  label={t("table.profit")}
                  active={sortBy === "profit"}
                  align="right"
                  onClick={() => handleSortChange("profit")}
                />
              </tr>
            </thead>
            <tbody className={isLoadingTable ? "opacity-50" : ""}>
              {userProfit.users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{user.name ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {user.totalPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {user.availablePoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 capitalize">{user.currentRank}</td>
                  <td className="px-4 py-2 text-right">{user.tripCount}</td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(user.totalPurchasedCents)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(user.estimatedAiCostCents)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      user.profitCents >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(user.profitCents)}
                  </td>
                </tr>
              ))}
              {userProfit.users.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("table.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {userProfit.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("pageInfo", {
                page: userProfit.page,
                totalPages: userProfit.totalPages,
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                aria-label={t("table.prevPage")}
              >
                {t("table.prev")}
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= userProfit.totalPages}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                aria-label={t("table.nextPage")}
              >
                {t("table.next")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  subtitle,
  highlight = false,
  warning = false,
  tooltip,
}: {
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
  warning?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm" title={tooltip}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          warning
            ? "text-red-600 dark:text-red-400"
            : highlight
              ? "text-green-600 dark:text-green-400"
              : ""
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Sortable Header ─────────────────────────────────────────────────────────

function SortableHeader({
  label,
  active,
  align = "left",
  onClick,
}: {
  label: string;
  active: boolean;
  align?: "left" | "right";
  onClick?: () => void;
}) {
  const alignClass = align === "right" ? "text-right" : "text-left";

  if (!onClick) {
    return (
      <th className={`px-4 py-2 font-medium ${alignClass}`}>{label}</th>
    );
  }

  return (
    <th className={`px-4 py-2 font-medium ${alignClass}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${
          active ? "text-primary underline" : ""
        }`}
        aria-label={label}
      >
        {label}
        {active && <span aria-hidden="true">&darr;</span>}
      </button>
    </th>
  );
}
