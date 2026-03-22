import { AdminDashboardClient } from "./AdminDashboardClient";
import { AdminDashboardService } from "@/server/services/admin-dashboard.service";

export default async function AdminDashboardPage() {
  const [kpis, revenue, userMetrics] = await Promise.all([
    AdminDashboardService.getKPIs(),
    AdminDashboardService.getRevenueTimeSeries("daily", 30),
    AdminDashboardService.getUserMetrics(1, undefined, "recent"),
  ]);

  return (
    <AdminDashboardClient
      kpis={kpis}
      revenueData={revenue}
      initialUserMetrics={userMetrics}
    />
  );
}
