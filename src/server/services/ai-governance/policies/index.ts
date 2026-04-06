import { PolicyEngine } from "../policy-engine";
import { killSwitchPolicy } from "./kill-switch.policy";
import { rateLimitPolicy } from "./rate-limit.policy";
import { costBudgetPolicy } from "./cost-budget.policy";

// Register policies in priority order:
// 1. Kill switch (instant block, no side effects)
// 2. Rate limit (per-user throttle)
// 3. Cost budget (global spend guard)
PolicyEngine.register(killSwitchPolicy);
PolicyEngine.register(rateLimitPolicy);
PolicyEngine.register(costBudgetPolicy);

export { killSwitchPolicy } from "./kill-switch.policy";
export { rateLimitPolicy } from "./rate-limit.policy";
export { costBudgetPolicy } from "./cost-budget.policy";
export { _clearKillSwitchCache } from "./kill-switch.policy";
export { _clearCostBudgetCache } from "./cost-budget.policy";
