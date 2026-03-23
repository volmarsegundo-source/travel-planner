import { AdminDashboardClient } from "./AdminDashboardClient";
import { AdminDashboardService } from "@/server/services/admin-dashboard.service";

export default async function AdminDashboardPage() {
  const [kpis, revenue, aiCalls, levelDist, topDest, userProfit, marginAlert] =
    await Promise.all([
      AdminDashboardService.getEnhancedKPIs(),
      AdminDashboardService.getRevenueTimeSeries("daily", 30),
      AdminDashboardService.getAiCallsPerPeriod(30, "day"),
      AdminDashboardService.getUserLevelDistribution(),
      AdminDashboardService.getTopDestinations(10),
      AdminDashboardService.getPerUserProfit(1, 25),
      AdminDashboardService.getMarginAlerts(),
    ]);

  return (
    <AdminDashboardClient
      kpis={kpis}
      revenueData={revenue}
      aiCallsData={aiCalls}
      levelDistribution={levelDist}
      topDestinations={topDest}
      initialUserProfit={userProfit}
      marginAlert={marginAlert}
    />
  );
}
