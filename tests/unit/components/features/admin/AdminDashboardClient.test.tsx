/**
 * Component tests for AdminDashboardClient.
 *
 * Tests cover:
 * - KPI card rendering (user + financial)
 * - Margin alert banners (yellow, red, none)
 * - Period filter buttons
 * - User profit table rendering
 * - Empty state for user table
 * - CSV export button
 * - Sort headers
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type {
  EnhancedKPIs,
  RevenueDataPoint,
  AiCallDataPoint,
  LevelDistributionRow,
  TopDestinationRow,
  PaginatedPerUserProfit,
  MarginAlert,
} from "@/server/services/admin-dashboard.service";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      let result = `${ns}.${key}`;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return `${ns}.${key}`;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

// Import after mocks
import { AdminDashboardClient } from "@/app/[locale]/(app)/admin/dashboard/AdminDashboardClient";

// ─── Test Data ──────────────────────────────────────────────────────────────

function makeKPIs(overrides?: Partial<EnhancedKPIs>): EnhancedKPIs {
  return {
    totalRevenueCents: 100000,
    estimatedAiCostCents: 5000,
    marginCents: 95000,
    activeUsers: 50,
    totalUsers: 100,
    paInCirculation: 25000,
    totalPurchases: 30,
    payingUsers: 20,
    freeUsers: 80,
    arpu: 5000,
    conversionRate: 20,
    paEmitted: 50000,
    paConsumed: 25000,
    grossMarginPercent: 95,
    ...overrides,
  };
}

function makeUserProfit(users?: PaginatedPerUserProfit["users"]): PaginatedPerUserProfit {
  return {
    users: users ?? [
      {
        id: "u1",
        name: "Alice",
        email: "alice@test.com",
        role: "user",
        totalPoints: 500,
        availablePoints: 300,
        currentRank: "desbravador",
        badgeCount: 2,
        tripCount: 3,
        expeditionCount: 3,
        totalPurchasedCents: 4480,
        aiSpendPA: 80,
        estimatedAiCostCents: 80,
        profitCents: 4400,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  };
}

const defaultRevenue: RevenueDataPoint[] = [
  { date: "2026-03-20", revenueCents: 5000, purchaseCount: 2 },
];

const defaultAiCalls: AiCallDataPoint[] = [
  { date: "2026-03-20", checklist: 5, guide: 3, itinerary: 2, total: 10 },
];

const defaultLevelDist: LevelDistributionRow[] = [
  { rank: "novato", count: 50 },
  { rank: "desbravador", count: 20 },
];

const defaultTopDest: TopDestinationRow[] = [
  { destination: "Paris, France", count: 15 },
  { destination: "Tokyo, Japan", count: 10 },
];

const noAlert: MarginAlert = { level: "none", message: "", marginPercent: 95 };
const yellowAlert: MarginAlert = { level: "yellow", message: "Warning", marginPercent: 72 };
const redAlert: MarginAlert = { level: "red", message: "Critical", marginPercent: 40 };

function renderDashboard(overrides?: {
  kpis?: EnhancedKPIs;
  marginAlert?: MarginAlert;
  userProfit?: PaginatedPerUserProfit;
}) {
  return render(
    <AdminDashboardClient
      kpis={overrides?.kpis ?? makeKPIs()}
      revenueData={defaultRevenue}
      aiCallsData={defaultAiCalls}
      levelDistribution={defaultLevelDist}
      topDestinations={defaultTopDest}
      initialUserProfit={overrides?.userProfit ?? makeUserProfit()}
      marginAlert={overrides?.marginAlert ?? noAlert}
    />
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AdminDashboardClient", () => {
  describe("KPI Cards", () => {
    it("renders user KPI section", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.kpi.userKpis")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.kpi.totalUsers")).toBeInTheDocument();
    });

    it("renders financial KPI section", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.kpi.financialKpis")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.totalRevenue")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.estimatedAiCost")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.kpi.grossMargin")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.kpi.arpu")).toBeInTheDocument();
    });

    it("renders paying/free user breakdown", () => {
      renderDashboard();

      // The subtitle contains "80 free / 20 paying"
      expect(screen.getByText(/80.*admin\.dashboard\.kpi\.freeUsers.*20.*admin\.dashboard\.kpi\.payingUsers/)).toBeInTheDocument();
    });

    it("renders conversion rate", () => {
      renderDashboard();

      expect(screen.getByText("20%")).toBeInTheDocument();
    });

    it("renders PA emitted and consumed", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.kpi.paEmitted")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.kpi.paConsumed")).toBeInTheDocument();
    });
  });

  describe("Margin Alerts", () => {
    it("does not show alert when margin is healthy", () => {
      renderDashboard({ marginAlert: noAlert });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows yellow alert when margin < 80%", () => {
      renderDashboard({ marginAlert: yellowAlert });

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("admin.dashboard.alerts.marginWarning");
    });

    it("shows red alert when margin < 50%", () => {
      renderDashboard({ marginAlert: redAlert });

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("admin.dashboard.alerts.marginCritical");
    });
  });

  describe("Period Filter", () => {
    it("renders period filter buttons", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.period.7d")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.period.30d")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.period.90d")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.period.1y")).toBeInTheDocument();
    });

    it("30d button is active by default", () => {
      renderDashboard();

      const btn30d = screen.getByText("admin.dashboard.period.30d");
      expect(btn30d).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("User Profit Table", () => {
    it("renders table with user data", () => {
      renderDashboard();

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
      // "desbravador" appears in both level distribution chart and user table
      expect(screen.getAllByText("desbravador").length).toBeGreaterThanOrEqual(1);
    });

    it("renders search input", () => {
      renderDashboard();

      expect(screen.getByPlaceholderText("admin.dashboard.table.search")).toBeInTheDocument();
    });

    it("renders export CSV button", () => {
      renderDashboard();

      expect(
        screen.getByRole("button", { name: "admin.dashboard.export.exportCsv" })
      ).toBeInTheDocument();
    });

    it("shows no results message when user list is empty", () => {
      renderDashboard({
        userProfit: makeUserProfit([]),
      });

      expect(screen.getByText("admin.dashboard.table.noResults")).toBeInTheDocument();
    });

    it("shows profit in green for positive values", () => {
      renderDashboard();

      // Profit column should have green text class
      const profitCells = document.querySelectorAll(".text-green-600");
      expect(profitCells.length).toBeGreaterThan(0);
    });

    it("shows profit in red for negative values", () => {
      const negativeProfitUser = makeUserProfit([
        {
          id: "u2",
          name: "Bob",
          email: "bob@test.com",
          role: "user",
          totalPoints: 0,
          availablePoints: 0,
          currentRank: "novato",
          badgeCount: 0,
          tripCount: 0,
          expeditionCount: 0,
          totalPurchasedCents: 0,
          aiSpendPA: 200,
          estimatedAiCostCents: 200,
          profitCents: -200,
        },
      ]);

      renderDashboard({ userProfit: negativeProfitUser });

      const redCells = document.querySelectorAll(".text-red-600");
      expect(redCells.length).toBeGreaterThan(0);
    });

    it("renders sortable column headers", () => {
      renderDashboard();

      expect(screen.getByRole("button", { name: "admin.dashboard.table.revenue" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "admin.dashboard.table.aiCost" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "admin.dashboard.table.profit" })).toBeInTheDocument();
    });
  });

  describe("Charts", () => {
    it("renders AI calls chart section", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.charts.aiCalls")).toBeInTheDocument();
    });

    it("renders level distribution section", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.charts.levelDistribution")).toBeInTheDocument();
      // "novato" may appear in other contexts, use getAllByText
      expect(screen.getAllByText("novato").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("desbravador").length).toBeGreaterThanOrEqual(1);
    });

    it("renders top destinations section", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.charts.topDestinations")).toBeInTheDocument();
      expect(screen.getByText("Paris, France")).toBeInTheDocument();
      expect(screen.getByText("Tokyo, Japan")).toBeInTheDocument();
    });

    it("renders chart legend for AI calls", () => {
      renderDashboard();

      expect(screen.getByText("admin.dashboard.charts.checklist")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.charts.guide")).toBeInTheDocument();
      expect(screen.getByText("admin.dashboard.charts.itinerary")).toBeInTheDocument();
    });
  });
});
