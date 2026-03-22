"use client";

import { useTranslations } from "next-intl";
import type {
  DashboardKPIs,
  RevenueDataPoint,
  PaginatedUserMetrics,
} from "@/server/services/admin-dashboard.service";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminDashboardClientProps {
  kpis: DashboardKPIs;
  revenueData: RevenueDataPoint[];
  initialUserMetrics: PaginatedUserMetrics;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminDashboardClient({
  kpis,
  revenueData,
  initialUserMetrics,
}: AdminDashboardClientProps) {
  const t = useTranslations("admin.dashboard");

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const maxRevenue = Math.max(
    ...revenueData.map((d) => d.revenueCents),
    1
  );

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <section aria-labelledby="kpis-heading">
        <h2 id="kpis-heading" className="sr-only">
          {t("kpisTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label={t("totalRevenue")}
            value={formatCurrency(kpis.totalRevenueCents)}
          />
          <KPICard
            label={t("estimatedAiCost")}
            value={formatCurrency(kpis.estimatedAiCostCents)}
          />
          <KPICard
            label={t("margin")}
            value={formatCurrency(kpis.marginCents)}
            highlight={kpis.marginCents > 0}
          />
          <KPICard
            label={t("activeUsers")}
            value={`${kpis.activeUsers} / ${kpis.totalUsers}`}
          />
          <KPICard
            label={t("paInCirculation")}
            value={kpis.paInCirculation.toLocaleString()}
          />
          <KPICard
            label={t("totalPurchases")}
            value={kpis.totalPurchases.toString()}
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

      {/* User Table */}
      <section aria-labelledby="users-heading">
        <h2 id="users-heading" className="mb-4 text-lg font-semibold">
          {t("userTable")}
        </h2>
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
                <th className="px-4 py-2 text-right font-medium">
                  {t("columnPoints")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("columnRevenue")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("columnTrips")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("columnRank")}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialUserMetrics.users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{user.name ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {user.totalPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(user.purchaseTotal)}
                  </td>
                  <td className="px-4 py-2 text-right">{user.tripCount}</td>
                  <td className="px-4 py-2 capitalize">{user.rank}</td>
                </tr>
              ))}
              {initialUserMetrics.users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("noUsers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {initialUserMetrics.totalPages > 1 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("pageInfo", {
              page: initialUserMetrics.page,
              totalPages: initialUserMetrics.totalPages,
            })}
          </p>
        )}
      </section>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-green-600 dark:text-green-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
