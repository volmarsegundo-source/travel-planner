/**
 * Performance grader — validates latency and token usage against budgets.
 *
 * Contract (Promptfoo JS assertion):
 *   module.exports = (output, context) => ({ pass, score, reason })
 *
 * Weight in composite: 20%.
 *
 * Budgets (total tokens; tuned to production prompt chain):
 *   - guide:     4096 tokens, 10s latency
 *   - plan:      8192 tokens, 30s latency (matches GEMINI_TIMEOUT_MS)
 *   - checklist: 2048 tokens, 8s latency
 *
 * See: docs/specs/SPEC-EVALS-V1.md §3.3, fix(sprint-44): bump GEMINI_TIMEOUT_MS to 30s
 */

const BUDGETS = {
  guide: { tokens: 4096, latencyMs: 10_000 },
  plan: { tokens: 8192, latencyMs: 30_000 },
  checklist: { tokens: 2048, latencyMs: 8_000 },
};

function detectKind(vars, output) {
  if (vars && typeof vars.days !== "undefined") return "plan";
  if (vars && typeof vars.profile !== "undefined") return "checklist";
  if (typeof output === "string") {
    const lower = output.toLowerCase();
    if (lower.includes("itinerary")) return "plan";
    if (lower.includes("categories")) return "checklist";
  }
  return "guide";
}

function readTokens(context) {
  const u =
    (context && context.tokenUsage) ||
    (context && context.response && context.response.tokenUsage) ||
    null;
  if (!u) return null;
  if (typeof u.total === "number") return u.total;
  const p = Number(u.prompt || 0);
  const c = Number(u.completion || 0);
  return p + c || null;
}

function readLatency(context) {
  if (context && typeof context.latencyMs === "number") return context.latencyMs;
  if (context && context.response && typeof context.response.latencyMs === "number") {
    return context.response.latencyMs;
  }
  return null;
}

module.exports = (output, context) => {
  const vars = (context && context.vars) || (context && context.test && context.test.vars) || {};
  const kind = detectKind(vars, output);
  const budget = BUDGETS[kind] || BUDGETS.guide;

  const tokens = readTokens(context);
  const latency = readLatency(context);

  const reasons = [];
  let score = 1.0;

  if (tokens !== null) {
    if (tokens > budget.tokens) {
      const over = tokens / budget.tokens;
      const penalty = Math.min(0.6, 0.3 * (over - 1) + 0.3);
      score -= penalty;
      reasons.push(`Token usage ${tokens} exceeds budget ${budget.tokens} (${kind})`);
    }
  } else {
    reasons.push("Token usage unavailable");
  }

  if (latency !== null) {
    if (latency > budget.latencyMs) {
      const over = latency / budget.latencyMs;
      const penalty = Math.min(0.5, 0.25 * (over - 1) + 0.25);
      score -= penalty;
      reasons.push(`Latency ${latency}ms exceeds budget ${budget.latencyMs}ms (${kind})`);
    }
  } else {
    reasons.push("Latency unavailable");
  }

  score = Math.max(0, Math.min(1, score));
  const pass = score >= 0.8;
  return {
    pass,
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : `Performance within budget (${kind})`,
    component: "performance",
  };
};
