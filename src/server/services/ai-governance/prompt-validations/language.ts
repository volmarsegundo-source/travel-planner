/**
 * V-05: declared primary language matches an nGram heuristic with confidence
 * ≥ 0.7.
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 V-05.
 *
 * **Heuristic scope (B-W2-003).** The SPEC calls for an nGram detector that
 * distinguishes "pt-BR" vs "en". Without a training corpus or library
 * dependency at this size, we ship a bigram-frequency heuristic that
 * scores Portuguese-distinctive vs English-distinctive bigrams in the
 * combined text. Confidence = max(score) / sum(scores). If the declared
 * language matches the higher-scoring class with confidence ≥ 0.7, V-05
 * passes; otherwise it fails with a hint to set `allowMixedLang=true`
 * (Open Question §11.9 in SPEC-AI).
 *
 * **Soft floor.** When `metadata.language` is absent, V-05 SKIPS — the
 * blocking declaration requirement is deferred to a metadata-schema
 * promotion follow-up. The complementary W-03 warning (no language
 * instruction in system section) covers the missing-declaration path.
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";
import type { ValidationCheck } from "./types";

const PT_BIGRAMS = [
  "ão",
  "ço",
  "ção",
  "nh",
  "lh",
  "rr",
  "ss",
  "ei",
  "ou",
  "qu",
  "ã ",
  "ç",
  "ente",
  "mente",
  "ade",
];

const EN_BIGRAMS = [
  "the",
  "ing",
  "tion",
  "and",
  "th",
  "wh",
  "sh",
  "ch",
  "ou",
  "ea",
  "or",
  "er",
  "ly",
  "es ",
  "ed ",
];

function scoreBigrams(text: string, bigrams: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const bg of bigrams) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(bg, from);
      if (idx === -1) break;
      count++;
      from = idx + bg.length;
    }
  }
  return count;
}

export interface LanguageDetectionResult {
  declared: "pt-BR" | "en";
  detected: "pt-BR" | "en";
  confidence: number;
}

/** Exported for unit testing; pure function. */
export function detectLanguage(text: string): {
  detected: "pt-BR" | "en";
  confidence: number;
} {
  const ptScore = scoreBigrams(text, PT_BIGRAMS);
  const enScore = scoreBigrams(text, EN_BIGRAMS);
  const total = ptScore + enScore;
  if (total === 0) {
    // No signal — treat as ambiguous, low confidence on either side.
    return { detected: "en", confidence: 0 };
  }
  const detected: "pt-BR" | "en" =
    ptScore >= enScore ? "pt-BR" : "en";
  const confidence = Math.max(ptScore, enScore) / total;
  return { detected, confidence };
}

export const v05LanguageDeclared: ValidationCheck<"V-05"> = (ctx) => {
  const declared = ctx.metadata?.language;
  if (!declared) return null; // soft floor — see file header

  const combined = `${ctx.systemPrompt}\n\n${ctx.userTemplate}`;
  const { detected, confidence } = detectLanguage(combined);
  if (detected === declared && confidence >= 0.7) return null;
  return [
    {
      code: "V-05",
      field: "metadata",
      message: `Linguagem declarada \`${declared}\` mas heurística sugere \`${detected}\` (confiança ${(
        confidence * 100
      ).toFixed(0)}%). Corrija o conteúdo OU defina \`allowMixedLang=true\` em metadata se for um prompt bilíngue intencional`,
    },
  ];
};
