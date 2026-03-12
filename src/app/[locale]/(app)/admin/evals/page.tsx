import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { loadEvalHistory, getTrendData } from "@/lib/evals/history";
import type { TrustScoreBreakdown } from "@/lib/evals/types";
import type { EvalAlert } from "@/lib/evals/alerts";

// ─── Constants ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@travel.dev";
const HISTORY_DISPLAY_LIMIT = 10;
const DIMENSIONS = ["safety", "accuracy", "performance", "ux", "i18n"] as const;
const PERCENT_MULTIPLIER = 100;
const BAR_MAX_WIDTH = 100;

// ─── Helper Components ──────────────────────────────────────────────────────────

function DimensionBar({ name, score }: { name: string; score: number }) {
  const percent = Math.round(score * PERCENT_MULTIPLIER);
  const barColor =
    percent >= 80
      ? "bg-green-500"
      : percent >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize font-medium">{name}</span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className={`h-3 rounded-full ${barColor}`}
          style={{ width: `${Math.min(percent, BAR_MAX_WIDTH)}%` }}
        />
      </div>
    </div>
  );
}

function TrendChart({
  data,
}: {
  data: Array<{ timestamp: string; score: number }>;
}) {
  if (data.length === 0) return null;

  const maxBarHeight = 120;
  const barWidth = 40;

  return (
    <div
      className="flex items-end gap-2 overflow-x-auto pb-2"
      role="img"
      aria-label="Composite score trend chart"
    >
      {data.map((point, idx) => {
        const percent = Math.round(point.score * PERCENT_MULTIPLIER);
        const height = Math.max(4, (point.score * maxBarHeight));
        const barColor =
          percent >= 80
            ? "bg-green-500"
            : percent >= 60
              ? "bg-yellow-500"
              : "bg-red-500";
        const dateLabel = new Date(point.timestamp).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={`trend-${idx}`}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-xs text-muted-foreground">{percent}%</span>
            <div
              className={`rounded-t ${barColor}`}
              style={{ width: barWidth, height }}
            />
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function AlertsList({ alerts }: { alerts: EvalAlert[] }) {
  const severityStyles: Record<string, string> = {
    critical: "border-red-500 bg-red-50 text-red-900",
    warning: "border-yellow-500 bg-yellow-50 text-yellow-900",
    info: "border-blue-500 bg-blue-50 text-blue-900",
  };

  const severityLabels: Record<string, string> = {
    critical: "CRITICAL",
    warning: "WARNING",
    info: "INFO",
  };

  return (
    <div className="rounded-lg border bg-card p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div
            key={`alert-${idx}`}
            className={`rounded border-l-4 p-3 ${severityStyles[alert.severity] ?? severityStyles.info}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase">
                {severityLabels[alert.severity] ?? "INFO"}
              </span>
              {alert.dimension && (
                <span className="text-xs capitalize">({alert.dimension})</span>
              )}
            </div>
            <p className="text-sm">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvalResultsTable({
  results,
}: {
  results: Array<{ evalId: string; score: number; pass: boolean }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Eval Results</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Eval ID</th>
              <th className="pb-2 font-medium">Score</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, idx) => (
              <tr key={`result-${idx}`} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs">{result.evalId}</td>
                <td className="py-2">
                  {(result.score * PERCENT_MULTIPLIER).toFixed(1)}%
                </td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      result.pass
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {result.pass ? "PASS" : "FAIL"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default async function EvalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  // Simple admin check -- admin user email
  const isAdmin = session.user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    redirect({ href: "/expeditions", locale });
    return null;
  }

  const history = loadEvalHistory(HISTORY_DISPLAY_LIMIT);
  const latest = history[0] ?? null;
  const trends = history.length > 0 ? getTrendData(history) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">EDD Eval Dashboard</h1>

      {/* Trust Score Card */}
      {latest && (
        <div className="rounded-lg border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Trust Score</h2>
          <div className="flex items-center gap-4 mb-4">
            <span
              className={`text-4xl font-bold ${
                latest.trustScore.pass ? "text-green-600" : "text-red-600"
              }`}
            >
              {(latest.trustScore.composite * PERCENT_MULTIPLIER).toFixed(0)}%
            </span>
            <span
              className={`px-2 py-1 text-sm rounded ${
                latest.trustScore.pass
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {latest.trustScore.pass ? "PASS" : "FAIL"}
            </span>
            <span className="text-sm text-muted-foreground ml-auto">
              {new Date(latest.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Per-dimension bars */}
          {DIMENSIONS.map((dim) => (
            <DimensionBar
              key={dim}
              name={dim}
              score={
                latest.trustScore[dim as keyof TrustScoreBreakdown] as number
              }
            />
          ))}
        </div>
      )}

      {/* Trend over last 10 builds */}
      {trends && trends.compositeScores.length > 0 && (
        <div className="rounded-lg border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Trend (Last {trends.compositeScores.length} Builds)
          </h2>
          <TrendChart data={trends.compositeScores} />
          <p className="text-sm text-muted-foreground mt-2">
            Pass rate: {(trends.passRate * PERCENT_MULTIPLIER).toFixed(0)}% |
            Average:{" "}
            {(trends.averageComposite * PERCENT_MULTIPLIER).toFixed(0)}%
          </p>
        </div>
      )}

      {/* Recent Alerts */}
      {latest && latest.alerts.length > 0 && (
        <AlertsList alerts={latest.alerts} />
      )}

      {/* Eval Results Table */}
      {latest && latest.evalResults.length > 0 && (
        <EvalResultsTable results={latest.evalResults} />
      )}

      {/* Empty state */}
      {!latest && (
        <div className="text-center text-muted-foreground py-16">
          <p>No eval history found.</p>
          <p className="text-sm mt-2">
            Run{" "}
            <code className="rounded bg-muted px-2 py-1 text-sm">
              npm run eval:scheduled
            </code>{" "}
            to generate the first report.
          </p>
        </div>
      )}
    </div>
  );
}
