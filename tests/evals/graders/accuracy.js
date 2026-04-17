/**
 * Accuracy grader — validates JSON schema conformance and required fields per
 * output type (guide / plan / checklist).
 *
 * Contract (Promptfoo JS assertion):
 *   module.exports = (output, context) => ({ pass, score, reason })
 *
 * Weight in composite: 25%.
 *
 * Note: LLM-as-judge factual verification is out of scope for the mock path.
 * This grader focuses on structural correctness and parameter echo (destination
 * in the output matches the request, expected currency echoed, etc.).
 *
 * See: docs/specs/SPEC-EVALS-V1.md §3.3
 */

function tryParse(output) {
  if (output == null) return null;
  if (typeof output === "object") return output;
  try {
    return JSON.parse(String(output));
  } catch {
    return null;
  }
}

function detectKind(vars, obj) {
  if (vars && typeof vars.days !== "undefined") return "plan";
  if (vars && typeof vars.profile !== "undefined") return "checklist";
  if (vars && typeof vars.tripType !== "undefined" && !vars.days) {
    if (obj && Array.isArray(obj.categories)) return "checklist";
    if (obj && Array.isArray(obj.itinerary)) return "plan";
    return "guide";
  }
  if (obj && Array.isArray(obj.itinerary)) return "plan";
  if (obj && Array.isArray(obj.categories)) return "checklist";
  return "guide";
}

const REQUIRED = {
  guide: ["destination", "summary", "sections", "safety"],
  plan: ["destination", "days", "itinerary", "budget", "safety"],
  checklist: ["destination", "categories", "safety"],
};

module.exports = (output, context) => {
  const parsed = tryParse(output);
  const vars = (context && context.vars) || (context && context.test && context.test.vars) || {};
  const reasons = [];
  let score = 1.0;

  if (!parsed || typeof parsed !== "object") {
    return {
      pass: false,
      score: 0,
      reason: "Output is not valid JSON",
      component: "accuracy",
    };
  }

  const kind = detectKind(vars, parsed);
  const required = REQUIRED[kind] || REQUIRED.guide;
  const missing = required.filter((k) => typeof parsed[k] === "undefined" || parsed[k] === null);
  if (missing.length > 0) {
    score -= 0.15 * missing.length;
    reasons.push(`Missing required fields (${kind}): ${missing.join(", ")}`);
  }

  // Destination echo check.
  if (vars.destination && parsed.destination) {
    const a = String(vars.destination).toLowerCase();
    const b = String(parsed.destination).toLowerCase();
    const firstToken = a.split(/[,\s\->]+/).filter(Boolean)[0] || "";
    if (firstToken && !b.includes(firstToken)) {
      score -= 0.15;
      reasons.push(`Destination mismatch (expected ~"${vars.destination}", got "${parsed.destination}")`);
    }
  }

  // Plan-specific: days length + itinerary structure.
  if (kind === "plan" && Array.isArray(parsed.itinerary)) {
    const expectedDays = Number(vars.days);
    if (expectedDays && parsed.itinerary.length !== expectedDays) {
      score -= 0.2;
      reasons.push(`Plan day count mismatch (expected ${expectedDays}, got ${parsed.itinerary.length})`);
    }
    const badDay = parsed.itinerary.find((d) => !d || !Array.isArray(d.activities) || d.activities.length === 0);
    if (badDay) {
      score -= 0.15;
      reasons.push("Plan has a day without activities");
    }
  }

  // Checklist-specific: at least one category with items.
  if (kind === "checklist" && Array.isArray(parsed.categories)) {
    const totalItems = parsed.categories.reduce(
      (n, c) => n + ((c && Array.isArray(c.items) ? c.items.length : 0)),
      0,
    );
    if (totalItems === 0) {
      score -= 0.3;
      reasons.push("Checklist has no items");
    }
  }

  score = Math.max(0, Math.min(1, score));
  const pass = score >= 0.8;
  return {
    pass,
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : `Accuracy checks passed (${kind})`,
    component: "accuracy",
  };
};
