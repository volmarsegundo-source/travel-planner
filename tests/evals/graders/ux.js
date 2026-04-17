/**
 * UX grader — validates structural completeness and surface UX hygiene of
 * generated output: non-empty sections, correct language tag, text length
 * reasonable, and presence of human-facing fields (title, description, tips).
 *
 * Contract (Promptfoo JS assertion):
 *   module.exports = (output, context) => ({ pass, score, reason })
 *
 * Weight in composite: 15%.
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

function toText(output) {
  if (output == null) return "";
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

function detectKind(vars, obj) {
  if (vars && typeof vars.days !== "undefined") return "plan";
  if (vars && typeof vars.profile !== "undefined") return "checklist";
  if (obj && Array.isArray(obj.itinerary)) return "plan";
  if (obj && Array.isArray(obj.categories)) return "checklist";
  return "guide";
}

module.exports = (output, context) => {
  const vars = (context && context.vars) || (context && context.test && context.test.vars) || {};
  const parsed = tryParse(output);
  const text = toText(output);
  const reasons = [];
  let score = 1.0;

  if (!parsed || typeof parsed !== "object") {
    return {
      pass: false,
      score: 0,
      reason: "Output not structured (UX cannot inspect)",
      component: "ux",
    };
  }

  const kind = detectKind(vars, parsed);

  // Non-trivial payload — very short outputs fail UX basic bar.
  if (text.length < 200) {
    score -= 0.3;
    reasons.push(`Output too short (${text.length} chars)`);
  }

  // Language tag presence + match.
  const expectedLang = vars.language ? String(vars.language) : null;
  const actualLang = parsed.language || parsed.locale || null;
  if (expectedLang && actualLang) {
    const a = expectedLang.toLowerCase().slice(0, 2);
    const b = String(actualLang).toLowerCase().slice(0, 2);
    if (a !== b) {
      score -= 0.25;
      reasons.push(`Language mismatch (expected ${expectedLang}, got ${actualLang})`);
    }
  } else if (expectedLang && !actualLang) {
    score -= 0.1;
    reasons.push("No language tag in output");
  }

  if (kind === "guide") {
    if (!parsed.summary || String(parsed.summary).length < 30) {
      score -= 0.15;
      reasons.push("Guide summary missing or too short");
    }
    if (!Array.isArray(parsed.sections) || parsed.sections.length < 2) {
      score -= 0.2;
      reasons.push("Guide needs >= 2 sections");
    } else {
      const weakSection = parsed.sections.find(
        (s) => !s || !s.title || !s.content || String(s.content).length < 20,
      );
      if (weakSection) {
        score -= 0.1;
        reasons.push("Guide has incomplete section (missing title or content)");
      }
    }
  }

  if (kind === "plan") {
    if (!Array.isArray(parsed.itinerary) || parsed.itinerary.length === 0) {
      score -= 0.3;
      reasons.push("Plan itinerary missing");
    } else {
      const weakDay = parsed.itinerary.find(
        (d) => !d || !Array.isArray(d.activities) || d.activities.length < 2,
      );
      if (weakDay) {
        score -= 0.15;
        reasons.push(`Plan day ${weakDay && weakDay.day} has fewer than 2 activities`);
      }
    }
  }

  if (kind === "checklist") {
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      score -= 0.3;
      reasons.push("Checklist missing categories");
    }
  }

  score = Math.max(0, Math.min(1, score));
  const pass = score >= 0.8;
  return {
    pass,
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : `UX structure OK (${kind})`,
    component: "ux",
  };
};
