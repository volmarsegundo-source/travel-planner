/**
 * i18n grader — validates currency code / symbol consistency, locale tag
 * consistency, and language fingerprint (pt-BR diacritics vs. en heuristic).
 *
 * Contract (Promptfoo JS assertion):
 *   module.exports = (output, context) => ({ pass, score, reason })
 *
 * Weight in composite: 10%.
 *
 * See: docs/specs/SPEC-EVALS-V1.md §3.3, docs/testing/UX-VALIDATION-REPORT.md
 */

const CURRENCY_HINTS = {
  BRL: ["BRL", "R$"],
  EUR: ["EUR", "€"],
  USD: ["USD", "US$", "$"],
  JPY: ["JPY", "¥", "円"],
};

const PT_MARKERS = [
  "ã", "õ", "ç", "á", "é", "í", "ó", "ú", "â", "ê", "ô",
  " de ", " do ", " da ", " para ", " com ", "Olá",
];
const EN_COMMON = [" the ", " and ", " for ", " with ", " of ", " to "];

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

function looksPortuguese(text) {
  let hits = 0;
  for (const m of PT_MARKERS) {
    if (text.includes(m)) hits += 1;
  }
  return hits >= 2;
}

function looksEnglish(text) {
  const lower = " " + text.toLowerCase() + " ";
  let hits = 0;
  for (const m of EN_COMMON) {
    if (lower.includes(m)) hits += 1;
  }
  return hits >= 3;
}

module.exports = (output, context) => {
  const vars = (context && context.vars) || (context && context.test && context.test.vars) || {};
  const parsed = tryParse(output);
  const text = toText(output);
  const reasons = [];
  let score = 1.0;

  const expectedCurrency = vars.expectedCurrency || null;
  const expectedLang = vars.language || null;

  // Currency code check (structured).
  if (expectedCurrency) {
    const hints = CURRENCY_HINTS[expectedCurrency] || [expectedCurrency];
    const structured =
      parsed && (parsed.currency || (parsed.budget && parsed.budget.currency));
    if (structured) {
      if (String(structured).toUpperCase() !== String(expectedCurrency).toUpperCase()) {
        score -= 0.4;
        reasons.push(
          `Currency mismatch (expected ${expectedCurrency}, got ${structured})`,
        );
      }
    } else {
      // Fallback: must at least mention any hint in the text.
      const mentioned = hints.some((h) => text.includes(h));
      if (!mentioned) {
        score -= 0.3;
        reasons.push(`Currency ${expectedCurrency} not mentioned`);
      }
    }
  }

  // Language check.
  if (expectedLang) {
    const wantsPt = expectedLang.toLowerCase().startsWith("pt");
    const wantsEn = expectedLang.toLowerCase().startsWith("en");
    if (wantsPt) {
      if (!looksPortuguese(text)) {
        score -= 0.3;
        reasons.push("Expected pt-BR content but no Portuguese markers found");
      }
      if (looksEnglish(text) && !looksPortuguese(text)) {
        score -= 0.2;
        reasons.push("Content appears English despite pt-BR request");
      }
    } else if (wantsEn) {
      if (!looksEnglish(text)) {
        score -= 0.3;
        reasons.push("Expected English content but no English markers found");
      }
    }
    // Locale tag consistency (soft).
    const tag = parsed && (parsed.locale || parsed.language);
    if (tag) {
      const a = String(tag).toLowerCase().slice(0, 2);
      const b = String(expectedLang).toLowerCase().slice(0, 2);
      if (a !== b) {
        score -= 0.15;
        reasons.push(`Locale tag mismatch (${tag} vs. ${expectedLang})`);
      }
    }
  }

  score = Math.max(0, Math.min(1, score));
  const pass = score >= 0.8;
  return {
    pass,
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : "i18n checks passed",
    component: "i18n",
  };
};
