/**
 * B-W2-003 — V-01..V-08 unit tests.
 *
 * SPEC-AI-GOVERNANCE-V2 §10.1: ≥3 positivos AND ≥3 negativos por regra.
 *
 * Each describe block exercises one V-XX with both pass and fail cases,
 * including the orchestrator at the bottom that asserts aggregation
 * (no short-circuit).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  validateBlocking,
  v01RequiredPlaceholders,
  v02ForbiddenPlaceholders,
  v03TokenBudget,
  v04JsonOutputSchema,
  v05LanguageDeclared,
  v06PiiDetection,
  v07ApiKeyDetection,
  v08InternalUrlDetection,
  extractPlaceholders,
  REQUIRED_PLACEHOLDERS,
  FORBIDDEN_PLACEHOLDERS,
  TOKEN_BUDGET_MAX,
  detectLanguage,
  type PromptValidationContext,
} from "@/server/services/ai-governance/prompt-validations";

function makeCtx(
  overrides: Partial<PromptValidationContext> = {}
): PromptValidationContext {
  return {
    modelType: "guide",
    systemPrompt:
      "You are a helpful travel guide for {destination} from {originCity}.\n" +
      "Plan {days} days starting {startDate} ending {endDate} for {passengers} " +
      "in {travelStyle} style. Respond in {language}.",
    userTemplate: "Generate a guide.",
    ...overrides,
  };
}

describe("extractPlaceholders", () => {
  it("returns canonical placeholders, ignores escaped {{ ... }}", () => {
    const out = extractPlaceholders("Hello {name}, see {{literal}} {city}.");
    expect(out.sort()).toEqual(["city", "name"]);
  });

  it("returns empty array on no placeholders", () => {
    expect(extractPlaceholders("plain text")).toEqual([]);
  });

  it("dedupes repeated placeholders", () => {
    expect(extractPlaceholders("{a} {a} {b}").sort()).toEqual(["a", "b"]);
  });
});

describe("V-01 required placeholders", () => {
  it("PASS — all required placeholders present in systemPrompt", () => {
    expect(v01RequiredPlaceholders(makeCtx())).toBeNull();
  });

  it("PASS — required placeholders split across systemPrompt + userTemplate", () => {
    expect(
      v01RequiredPlaceholders(
        makeCtx({
          systemPrompt: "{destination} {originCity} {days} {startDate}",
          userTemplate: "{endDate} {passengers} {travelStyle} {language}",
        })
      )
    ).toBeNull();
  });

  it("PASS — works for checklist (smaller required set)", () => {
    expect(
      v01RequiredPlaceholders(
        makeCtx({
          modelType: "checklist",
          systemPrompt:
            "{destination} {tripType} {departureDays} {dates} {travelers} {language}",
          userTemplate: "Generate a checklist.",
        })
      )
    ).toBeNull();
  });

  it("FAIL — missing required placeholders", () => {
    const out = v01RequiredPlaceholders(
      makeCtx({
        systemPrompt: "Plan a trip to {destination}",
        userTemplate: "Generate.",
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-01");
    expect(out![0]!.message).toMatch(/originCity/);
  });

  it("FAIL — empty templates", () => {
    const out = v01RequiredPlaceholders(
      makeCtx({ systemPrompt: "", userTemplate: "" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-01");
  });

  it("FAIL — unknown modelType (defensive)", () => {
    const out = v01RequiredPlaceholders({
      systemPrompt: "x",
      userTemplate: "y",
      modelType: "unknown" as never,
    });
    expect(out).not.toBeNull();
    expect(out![0]!.message).toMatch(/unknown modelType/);
  });
});

describe("V-02 forbidden placeholders", () => {
  it("PASS — clean template with required placeholders only", () => {
    expect(v02ForbiddenPlaceholders(makeCtx())).toBeNull();
  });

  it("PASS — escaped {{userEmail}} is allowed (not interpolated)", () => {
    expect(
      v02ForbiddenPlaceholders(
        makeCtx({ userTemplate: "literal {{userEmail}} string" })
      )
    ).toBeNull();
  });

  it("PASS — case-sensitive — {USEREMAIL} is not in the forbidden set", () => {
    expect(
      v02ForbiddenPlaceholders(
        makeCtx({ userTemplate: "Has {USEREMAIL} which is custom" })
      )
    ).toBeNull();
  });

  it("FAIL — {userEmail} in systemPrompt", () => {
    const out = v02ForbiddenPlaceholders(
      makeCtx({ systemPrompt: "Send to {userEmail}" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-02");
    expect(out![0]!.field).toBe("systemPrompt");
  });

  it("FAIL — {apiKey} in userTemplate", () => {
    const out = v02ForbiddenPlaceholders(
      makeCtx({ userTemplate: "Use {apiKey}" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-02");
    expect(out![0]!.field).toBe("userTemplate");
  });

  it("FAIL — multiple forbidden placeholders surface as multiple errors", () => {
    const out = v02ForbiddenPlaceholders(
      makeCtx({
        systemPrompt: "{userEmail} {apiKey}",
        userTemplate: "{databaseUrl}",
      })
    );
    expect(out).not.toBeNull();
    expect(out!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("V-03 token budget", () => {
  it("PASS — small template under budget", () => {
    expect(v03TokenBudget(makeCtx())).toBeNull();
  });

  it("PASS — exactly at budget", () => {
    // 3.5 chars per token → TOKEN_BUDGET_MAX tokens ≈ 14000 chars combined.
    const halfBudget = "x".repeat(Math.floor(TOKEN_BUDGET_MAX * 1.75));
    expect(
      v03TokenBudget(
        makeCtx({ systemPrompt: halfBudget, userTemplate: halfBudget })
      )
    ).toBeNull();
  });

  it("PASS — empty templates count as zero tokens", () => {
    expect(
      v03TokenBudget(makeCtx({ systemPrompt: "", userTemplate: "" }))
    ).toBeNull();
  });

  it("FAIL — combined size exceeds budget", () => {
    const huge = "x".repeat(20000); // ~5714 tokens alone
    const out = v03TokenBudget(
      makeCtx({ systemPrompt: huge, userTemplate: "" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-03");
    expect(out![0]!.message).toMatch(/orçamento/);
  });

  it("FAIL — both fields together push past budget", () => {
    const big = "x".repeat(8000); // ~2286 tokens × 2 = ~4572
    const out = v03TokenBudget(
      makeCtx({ systemPrompt: big, userTemplate: big })
    );
    expect(out).not.toBeNull();
  });

  it("FAIL — error message names both system and user counts", () => {
    const out = v03TokenBudget(
      makeCtx({
        systemPrompt: "x".repeat(20000),
        userTemplate: "y".repeat(2000),
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.message).toMatch(/system/);
    expect(out![0]!.message).toMatch(/user/);
  });
});

describe("V-04 JSON output schema (metadata-driven, soft floor)", () => {
  it("PASS — no metadata at all", () => {
    expect(v04JsonOutputSchema(makeCtx())).toBeNull();
  });

  it("PASS — outputFormat=markdown skips the check", () => {
    expect(
      v04JsonOutputSchema(makeCtx({ metadata: { outputFormat: "markdown" } }))
    ).toBeNull();
  });

  it("PASS — outputFormat=json with valid jsonSchema", () => {
    expect(
      v04JsonOutputSchema(
        makeCtx({
          metadata: {
            outputFormat: "json",
            jsonSchema: { type: "object", properties: { a: { type: "string" } } },
          },
        })
      )
    ).toBeNull();
  });

  it("FAIL — outputFormat=json with no jsonSchema", () => {
    const out = v04JsonOutputSchema(
      makeCtx({ metadata: { outputFormat: "json" } })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-04");
  });

  it("FAIL — outputFormat=json with empty jsonSchema {}", () => {
    const out = v04JsonOutputSchema(
      makeCtx({ metadata: { outputFormat: "json", jsonSchema: {} } })
    );
    expect(out).not.toBeNull();
  });

  it("FAIL — outputFormat=json with primitive jsonSchema", () => {
    const out = v04JsonOutputSchema(
      makeCtx({
        metadata: { outputFormat: "json", jsonSchema: "not an object" as unknown },
      })
    );
    expect(out).not.toBeNull();
  });
});

describe("V-05 language detected (metadata-driven, soft floor)", () => {
  it("PASS — no declared language skips the check", () => {
    expect(v05LanguageDeclared(makeCtx())).toBeNull();
  });

  it("PASS — declared pt-BR, content is Portuguese", () => {
    expect(
      v05LanguageDeclared(
        makeCtx({
          metadata: { language: "pt-BR" },
          systemPrompt:
            "Você é um assistente de viagem que responde sempre em português brasileiro. " +
            "A geração de roteiros sempre requer informações como destinação e datas relevantes. " +
            "Atenção: não invente atrações, mantenha somente fatos verificáveis na resposta. " +
            "Recomendações sobre viagens internacionais devem mencionar passaporte e visto quando aplicável.",
          userTemplate:
            "Gere um guia detalhado para a viagem solicitada incluindo opções de transporte, hospedagem e alimentação.",
        })
      )
    ).toBeNull();
  });

  it("PASS — declared en, content is English", () => {
    expect(
      v05LanguageDeclared(
        makeCtx({
          metadata: { language: "en" },
          systemPrompt:
            "You are a helpful travel assistant. Generate the requested information.",
          userTemplate: "Generate a guide for the trip.",
        })
      )
    ).toBeNull();
  });

  it("FAIL — declared pt-BR but content clearly English", () => {
    const out = v05LanguageDeclared(
      makeCtx({
        metadata: { language: "pt-BR" },
        systemPrompt:
          "You are the helpful travel assistant. The thing about the journey is " +
          "that travelling makes everything fascinating.",
        userTemplate: "Just answer the questions about the wonderful trip.",
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-05");
  });

  it("detectLanguage returns 0 confidence on empty signal", () => {
    expect(detectLanguage("12345").confidence).toBe(0);
  });
});

describe("V-06 PII detection", () => {
  it("PASS — no PII", () => {
    expect(v06PiiDetection(makeCtx())).toBeNull();
  });

  it("PASS — synthetic placeholder syntax doesn't match PII regex", () => {
    expect(
      v06PiiDetection(
        makeCtx({ userTemplate: "see {email} and {phone} in placeholders" })
      )
    ).toBeNull();
  });

  it("PASS — forbidden-looking text without real format", () => {
    expect(v06PiiDetection(makeCtx({ userTemplate: "user@" }))).toBeNull();
  });

  it("FAIL — real e-mail in systemPrompt", () => {
    const out = v06PiiDetection(
      makeCtx({ systemPrompt: "Reply to ada@example.com to confirm." })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-06");
    expect(out![0]!.message).toMatch(/e-mail/);
  });

  it("FAIL — Brazilian CPF format", () => {
    const out = v06PiiDetection(
      makeCtx({ userTemplate: "Documento 123.456.789-00 deve ser usado" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.message).toMatch(/CPF/);
  });

  it("FAIL — multiple PII variants surface as multiple errors", () => {
    const out = v06PiiDetection(
      makeCtx({
        systemPrompt: "Email ada@example.com phone +55 11 1234-5678",
        userTemplate: "card 1234 5678 9012",
      })
    );
    expect(out).not.toBeNull();
    expect(out!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("V-07 API key detection", () => {
  it("PASS — no API keys", () => {
    expect(v07ApiKeyDetection(makeCtx())).toBeNull();
  });

  it("PASS — short sk- prefix doesn't match", () => {
    expect(v07ApiKeyDetection(makeCtx({ userTemplate: "sk-short" }))).toBeNull();
  });

  it("PASS — placeholder {apiKey} is checked by V-02, not regex match here", () => {
    expect(
      v07ApiKeyDetection(makeCtx({ userTemplate: "Use {apiKey} value" }))
    ).toBeNull();
  });

  it("FAIL — Anthropic-shaped key (SPEC regex /sk-[a-zA-Z0-9]{20,}/)", () => {
    const out = v07ApiKeyDetection(
      makeCtx({
        // SPEC regex is alphanumeric-only after sk- (no hyphens). Real Anthropic
        // keys include hyphens, so the SPEC regex is intentionally a tighter
        // canary — this synthetic example matches it. Tracked as a Wave 5
        // expansion for hyphen-containing variants.
        systemPrompt: "Use sk-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890 to call",
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-07");
    expect(out![0]!.message).toMatch(/Anthropic/);
  });

  it("FAIL — Google AI-shaped key", () => {
    const out = v07ApiKeyDetection(
      makeCtx({
        userTemplate: "key=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567",
      })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.message).toMatch(/Google AI/);
  });

  it("FAIL — both vendors detected", () => {
    const out = v07ApiKeyDetection(
      makeCtx({
        systemPrompt: "anthropic=sk-AbCdEfGhIjKlMnOpQrStUvWx12345",
        userTemplate: "google=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567",
      })
    );
    expect(out).not.toBeNull();
    expect(out!.length).toBe(2);
  });
});

describe("V-08 internal URL detection", () => {
  it("PASS — public URL", () => {
    expect(
      v08InternalUrlDetection(
        makeCtx({ userTemplate: "see https://example.com/path" })
      )
    ).toBeNull();
  });

  it("PASS — no URL at all", () => {
    expect(v08InternalUrlDetection(makeCtx())).toBeNull();
  });

  it("PASS — placeholder {internalUrl} is checked by V-02, not here", () => {
    expect(
      v08InternalUrlDetection(makeCtx({ userTemplate: "see {internalUrl}" }))
    ).toBeNull();
  });

  it("FAIL — localhost URL", () => {
    const out = v08InternalUrlDetection(
      makeCtx({ userTemplate: "see localhost:3000/api/admin" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.code).toBe("V-08");
    expect(out![0]!.message).toMatch(/localhost/);
  });

  it("FAIL — 127.0.0.1", () => {
    const out = v08InternalUrlDetection(
      makeCtx({ systemPrompt: "127.0.0.1:5432 is the DB" })
    );
    expect(out).not.toBeNull();
  });

  it("FAIL — .travel-planner.dev domain", () => {
    const out = v08InternalUrlDetection(
      makeCtx({ userTemplate: "staging.travel-planner.dev/api" })
    );
    expect(out).not.toBeNull();
    expect(out![0]!.message).toMatch(/travel-planner\.dev/);
  });
});

describe("validateBlocking orchestrator", () => {
  it("returns ok=true when every check passes", () => {
    const out = validateBlocking(makeCtx());
    expect(out).toEqual({ ok: true, errors: [] });
  });

  it("aggregates failures across multiple V-XX (no short-circuit)", () => {
    const out = validateBlocking(
      makeCtx({
        systemPrompt: "{userEmail} ada@example.com sk-1234567890123456789012345",
        userTemplate: "see localhost:3000",
      })
    );
    expect(out.ok).toBe(false);
    const codes = out.errors.map((e) => e.code);
    // V-01 (missing required placeholders), V-02, V-06, V-07, V-08 all fire.
    expect(codes).toContain("V-01");
    expect(codes).toContain("V-02");
    expect(codes).toContain("V-06");
    expect(codes).toContain("V-07");
    expect(codes).toContain("V-08");
  });

  it("includes line numbers in PII errors when extractable", () => {
    const out = validateBlocking(
      makeCtx({
        systemPrompt: "line 1\nline 2 contains ada@example.com",
        userTemplate: "{destination}{originCity}{days}{startDate}{endDate}{passengers}{travelStyle}{language}",
      })
    );
    const piiErr = out.errors.find((e) => e.code === "V-06");
    expect(piiErr?.line).toBe(2);
  });
});

describe("REQUIRED_PLACEHOLDERS + FORBIDDEN_PLACEHOLDERS exports", () => {
  it("guide requires {destination}", () => {
    expect(REQUIRED_PLACEHOLDERS.guide).toContain("destination");
  });

  it("forbidden set blocks userEmail and apiKey", () => {
    expect(FORBIDDEN_PLACEHOLDERS.has("userEmail")).toBe(true);
    expect(FORBIDDEN_PLACEHOLDERS.has("apiKey")).toBe(true);
  });
});
