/**
 * B-W2-004 — W-01..W-04 unit tests.
 *
 * Mirrors the SPEC §10.1 discipline (≥3 pass + ≥3 fail per W-XX) where
 * applicable. W-04 is metadata-driven so the "skip" path is its own
 * canonical pass case.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  validateWarnings,
  w01UnknownPlaceholders,
  w02OutputFormat,
  w03LanguageInstruction,
  w04Temperature,
  type PromptValidationContext,
} from "@/server/services/ai-governance/prompt-validations";

function makeCtx(
  overrides: Partial<PromptValidationContext> = {}
): PromptValidationContext {
  return {
    modelType: "guide",
    systemPrompt:
      "You are a helpful travel guide. Plan {destination} from {originCity} for {days} days starting {startDate} ending {endDate} for {passengers} in {travelStyle} style. Respond in {language}. Return JSON with fields: quickFacts, safety.",
    userTemplate: "Generate the guide.",
    ...overrides,
  };
}

describe("W-01 unknown optional placeholders", () => {
  it("PASS — only required + known optional placeholders", () => {
    expect(w01UnknownPlaceholders(makeCtx())).toBeNull();
  });

  it("PASS — known optional {budgetTotal} for guide", () => {
    expect(
      w01UnknownPlaceholders(
        makeCtx({ userTemplate: "Generate {budgetTotal}" })
      )
    ).toBeNull();
  });

  it("PASS — forbidden placeholder is V-02 territory, not double-reported here", () => {
    expect(
      w01UnknownPlaceholders(
        makeCtx({ userTemplate: "Use {userEmail}" })
      )
    ).toBeNull();
  });

  it("FAIL — unknown placeholder {foo}", () => {
    const out = w01UnknownPlaceholders(
      makeCtx({ userTemplate: "Generate {foo}" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("W-01");
  });

  it("FAIL — multiple unknown placeholders", () => {
    const out = w01UnknownPlaceholders(
      makeCtx({ userTemplate: "{foo} {bar} {baz}" })
    );
    expect(out!.length).toBe(3);
  });

  it("FAIL — checklist with placeholder for plan {guideDigest}", () => {
    const out = w01UnknownPlaceholders(
      makeCtx({
        modelType: "checklist",
        systemPrompt:
          "{destination} {tripType} {departureDays} {dates} {travelers} {language} {guideDigest}",
        userTemplate: "Generate.",
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.message).toMatch(/guideDigest/);
  });
});

describe("W-02 output format instruction", () => {
  it("PASS — explicit 'Return JSON with fields:'", () => {
    expect(
      w02OutputFormat(
        makeCtx({ systemPrompt: "Return JSON with fields: a, b, c" })
      )
    ).toBeNull();
  });

  it("PASS — Portuguese 'Retorne em markdown'", () => {
    expect(
      w02OutputFormat(makeCtx({ systemPrompt: "Retorne em markdown" }))
    ).toBeNull();
  });

  it("PASS — 'format: json' compact form", () => {
    expect(
      w02OutputFormat(makeCtx({ systemPrompt: "format: json" }))
    ).toBeNull();
  });

  it("FAIL — no format hint anywhere", () => {
    const out = w02OutputFormat(
      makeCtx({
        systemPrompt: "Be helpful and detailed",
        userTemplate: "Generate the guide",
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("W-02");
  });

  it("FAIL — vague instruction", () => {
    expect(
      w02OutputFormat(
        makeCtx({
          systemPrompt: "Be detailed and creative",
          userTemplate: "Reply",
        })
      )
    ).not.toBeNull();
  });

  it("FAIL — empty templates", () => {
    expect(
      w02OutputFormat(makeCtx({ systemPrompt: "", userTemplate: "" }))
    ).not.toBeNull();
  });
});

describe("W-03 language instruction in system", () => {
  it("PASS — 'Respond in {language}'", () => {
    expect(w03LanguageInstruction(makeCtx())).toBeNull();
  });

  it("PASS — 'in Portuguese'", () => {
    expect(
      w03LanguageInstruction(
        makeCtx({ systemPrompt: "Respond in Portuguese always" })
      )
    ).toBeNull();
  });

  it("PASS — 'idioma: pt-BR'", () => {
    expect(
      w03LanguageInstruction(makeCtx({ systemPrompt: "idioma: pt-BR" }))
    ).toBeNull();
  });

  it("FAIL — no language hint in system", () => {
    const out = w03LanguageInstruction(
      makeCtx({ systemPrompt: "Be helpful" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("W-03");
  });

  it("FAIL — language hint in userTemplate doesn't satisfy W-03", () => {
    expect(
      w03LanguageInstruction(
        makeCtx({
          systemPrompt: "Be helpful",
          userTemplate: "Respond in English",
        })
      )
    ).not.toBeNull();
  });

  it("FAIL — empty system", () => {
    expect(
      w03LanguageInstruction(
        makeCtx({ systemPrompt: "", userTemplate: "Respond in {language}" })
      )
    ).not.toBeNull();
  });
});

describe("W-04 temperature on deterministic prompts", () => {
  it("PASS — no metadata.temperature skips", () => {
    expect(w04Temperature(makeCtx())).toBeNull();
  });

  it("PASS — temperature 0.7 in guide is fine", () => {
    expect(
      w04Temperature(makeCtx({ metadata: { temperature: 0.7 } as never }))
    ).toBeNull();
  });

  it("PASS — temperature 1.5 in plan (NOT deterministic)", () => {
    expect(
      w04Temperature(
        makeCtx({
          modelType: "plan",
          metadata: { temperature: 1.5 } as never,
        })
      )
    ).toBeNull();
  });

  it("FAIL — temperature 1.2 in guide", () => {
    const out = w04Temperature(
      makeCtx({ metadata: { temperature: 1.2 } as never })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("W-04");
    expect(out![0]!.message).toMatch(/1\.2/);
  });

  it("FAIL — temperature 2.0 in checklist", () => {
    expect(
      w04Temperature(
        makeCtx({
          modelType: "checklist",
          systemPrompt:
            "{destination} {tripType} {departureDays} {dates} {travelers} {language}",
          metadata: { temperature: 2 } as never,
        })
      )
    ).not.toBeNull();
  });

  it("FAIL — temperature exactly 1.01 still warns (boundary)", () => {
    expect(
      w04Temperature(makeCtx({ metadata: { temperature: 1.01 } as never }))
    ).not.toBeNull();
  });
});

describe("validateWarnings orchestrator", () => {
  it("returns ok=true with no warnings when content is clean", () => {
    const out = validateWarnings(makeCtx());
    expect(out.ok).toBe(true);
    expect(out.errors).toEqual([]);
  });

  it("aggregates W-01 + W-02 + W-03 simultaneously (no short-circuit)", () => {
    const out = validateWarnings(
      makeCtx({
        // Has unknown placeholder, no format, no language hint.
        systemPrompt: "Be detailed",
        userTemplate:
          "{destination}{originCity}{days}{startDate}{endDate}{passengers}{travelStyle}{language}{foo}",
      })
    );
    expect(out.ok).toBe(false);
    const codes = out.errors.map((e) => e.code);
    expect(codes).toContain("W-01");
    expect(codes).toContain("W-02");
    expect(codes).toContain("W-03");
  });
});
