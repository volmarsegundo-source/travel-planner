import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";
import { AiGovernanceClient } from "./AiGovernanceClient";

const PERIOD_DAYS = 30;

export default async function AiGovernancePage() {
  const [overview, planDetail, checklistDetail, guideDetail, recentInteractions, promptTemplates, costAnalytics] =
    await Promise.all([
      AiGovernanceDashboardService.getOverview(PERIOD_DAYS),
      AiGovernanceDashboardService.getPhaseDetail("plan", PERIOD_DAYS),
      AiGovernanceDashboardService.getPhaseDetail(
        "checklist",
        PERIOD_DAYS,
      ),
      AiGovernanceDashboardService.getPhaseDetail(
        "guide",
        PERIOD_DAYS,
      ),
      AiGovernanceDashboardService.getRecentInteractions(20),
      AiGovernanceDashboardService.getPromptTemplates(),
      AiGovernanceDashboardService.getCostAnalytics(PERIOD_DAYS),
    ]);

  // Serialize dates for client component, include provider
  const serializedInteractions = recentInteractions.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
  }));

  const serializedTemplates = promptTemplates.map((pt) => ({
    ...pt,
    updatedAt: pt.updatedAt.toISOString(),
  }));

  return (
    <AiGovernanceClient
      overview={overview}
      phases={{
        plan: planDetail,
        checklist: checklistDetail,
        guide: guideDetail,
      }}
      recentInteractions={serializedInteractions}
      promptTemplates={serializedTemplates}
      costAnalytics={costAnalytics}
    />
  );
}
