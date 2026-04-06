import { AiGovernanceDashboardService } from "@/server/services/ai-governance-dashboard.service";
import { AiGovernanceClient } from "./AiGovernanceClient";

const PERIOD_DAYS = 30;

export default async function AiGovernancePage() {
  const [overview, planDetail, checklistDetail, guideDetail] =
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
    ]);

  return (
    <AiGovernanceClient
      overview={overview}
      phases={{
        plan: planDetail,
        checklist: checklistDetail,
        guide: guideDetail,
      }}
    />
  );
}
