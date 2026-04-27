"use client";

/**
 * PromptPreview — substitute placeholders with synthetic mock values and
 * render the resolved text. NEVER calls the real AI provider.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1 (versioning + preview); SPEC-AI-GOVERNANCE-V2
 * §3 V-01 (placeholder schema is the source of truth for the mock set).
 *
 * Per-type mock values match the SPEC §2.2-2.4 schemas verbatim. Unknown
 * placeholders fall back to a literal "[mock:NAME]" so the admin can see
 * which token will reach the model unfilled.
 *
 * B-W2-008 — Sprint 46 Wave 2 task 8/9.
 */
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { estimateCombinedTokens } from "@/lib/ai/token-count";

const PLACEHOLDER_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

type ModelType = "guide" | "plan" | "checklist";

/** Synthetic mock values per SPEC §2.2-2.4. */
const MOCK_VALUES: Record<ModelType, Record<string, string>> = {
  guide: {
    destination: "Paris, France",
    originCity: "Sao Paulo, BR",
    days: "7",
    startDate: "2026-09-12",
    endDate: "2026-09-19",
    passengers: '{"adults":2,"children":0,"infants":0}',
    travelStyle: "balanced",
    language: "pt-BR",
    budgetTotal: "5000",
    budgetCurrency: "USD",
    travelerType: "couple",
    travelPace: "5",
    interests: '["museums","gastronomy","architecture"]',
    personalNotes: "Wedding anniversary trip",
    siblingCities: '["Rouen","Reims"]',
  },
  plan: {
    destination: "Lisbon, Portugal",
    days: "5",
    startDate: "2026-10-01",
    endDate: "2026-10-06",
    dailyPace: "moderate",
    preferences:
      '{"interests":["history","seafood"],"food":["pescatarian"],"accommodation":["boutique"]}',
    travelers: "2",
    language: "pt-BR",
    budgetTotal: "3500",
    budgetCurrency: "EUR",
    guideDigest:
      "Lisbon: Mediterranean climate, Type-F plug, EUR currency, low risk.",
    destinations: '["Lisbon","Sintra"]',
    personalNotes: "First time in Portugal",
    tokenBudget: "1800",
  },
  checklist: {
    destination: "Buenos Aires, AR",
    tripType: "international",
    departureDays: "30",
    dates: "2026-11-10 to 2026-11-17",
    travelers: "3",
    language: "pt-BR",
    destinationFactsFromGuide:
      '{"climate":"temperate","plugType":"C/I","currency":"ARS","safetyLevel":"medium","vaccines":["yellow-fever-recommended"]}',
    itineraryHighlightsFromRoteiro:
      '{"activityTypes":["food-tour","tango"],"hasBeachDay":false}',
    logisticsFromPhase5:
      '{"transport":["flight"],"accommodation":["hotel"],"mobility":["taxi","subte"]}',
    userPrefs:
      '{"dietary":["pescatarian"],"allergies":["nuts"],"regularMedication":[]}',
  },
};

const ESC_OPEN = "ESCO";
const ESC_CLOSE = "ESCC";

/**
 * Replace each `{name}` token with its mock value, leaving escaped
 * `{{literal}}` untouched. Unknown placeholders render as `[mock:NAME]`
 * so the admin can see the gap.
 */
export function substitutePlaceholders(
  template: string,
  modelType: ModelType
): string {
  const dictionary = MOCK_VALUES[modelType] ?? {};
  const escaped = template.replace(
    /\{\{([^{}]*)\}\}/g,
    (_m, inner: string) => `${ESC_OPEN}${inner}${ESC_CLOSE}`
  );
  const resolved = escaped.replace(PLACEHOLDER_RE, (_match, name: string) => {
    const v = dictionary[name];
    return v !== undefined ? v : `[mock:${name}]`;
  });
  return resolved.split(ESC_OPEN).join("{").split(ESC_CLOSE).join("}");
}

interface PromptPreviewProps {
  systemPrompt: string;
  userTemplate: string;
  modelType: ModelType;
}

export function PromptPreview({
  systemPrompt,
  userTemplate,
  modelType,
}: PromptPreviewProps) {
  const t = useTranslations("admin.ia.preview");

  const resolved = useMemo(
    () => ({
      system: substitutePlaceholders(systemPrompt, modelType),
      user: substitutePlaceholders(userTemplate, modelType),
    }),
    [systemPrompt, userTemplate, modelType]
  );

  const tokens = useMemo(
    () => estimateCombinedTokens(resolved.system, resolved.user),
    [resolved]
  );

  const unfilled = useMemo(() => {
    const all: string[] = [];
    for (const text of [resolved.system, resolved.user]) {
      for (const m of text.matchAll(/\[mock:([a-zA-Z][a-zA-Z0-9_]*)\]/g)) {
        all.push(m[1]!);
      }
    }
    return [...new Set(all)];
  }, [resolved]);

  return (
    <section
      data-testid="admin-ia-preview"
      aria-labelledby="preview-heading"
      className="flex flex-col gap-3 rounded-atlas-md border border-atlas-outline-variant/40 p-4"
    >
      <header className="flex items-baseline justify-between">
        <h3 id="preview-heading" className="text-lg font-semibold">
          {t("title")}
        </h3>
        <p
          className="text-xs text-atlas-on-surface-variant"
          data-testid="admin-ia-preview-token-count"
        >
          {t("tokenCount", { total: tokens.total })}
        </p>
      </header>
      <p className="text-xs italic text-atlas-on-surface-variant">
        {t("disclaimer")}
      </p>
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-atlas-on-surface-variant">
            {t("systemHeading")}
          </h4>
          <pre
            className="mt-1 whitespace-pre-wrap rounded bg-atlas-surface-container-low p-3 font-mono text-xs"
            data-testid="admin-ia-preview-system"
          >
            {resolved.system || t("emptyField")}
          </pre>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-atlas-on-surface-variant">
            {t("userHeading")}
          </h4>
          <pre
            className="mt-1 whitespace-pre-wrap rounded bg-atlas-surface-container-low p-3 font-mono text-xs"
            data-testid="admin-ia-preview-user"
          >
            {resolved.user || t("emptyField")}
          </pre>
        </div>
      </div>
      {unfilled.length > 0 && (
        <p
          role="status"
          className="text-sm text-atlas-warning"
          data-testid="admin-ia-preview-unfilled"
        >
          {t("unfilledNotice", { names: unfilled.join(", ") })}
        </p>
      )}
    </section>
  );
}
