/**
 * Mock AI provider for Promptfoo eval suite.
 *
 * Returns deterministic fixtures for guide / plan / checklist outputs without
 * calling any real LLM API. Uses `context.vars` to inject destination, language,
 * emergency numbers, currency etc. so graders see plausible, grader-valid data
 * under the happy path.
 *
 * Expected interface (Promptfoo custom JS provider):
 *   - callApi(prompt, context, options) returns { output, tokenUsage, ... }
 *
 * Detects prompt type by keywords in the rendered prompt string:
 *   - "destination guide"  -> guide fixture
 *   - "travel itinerary"   -> plan fixture
 *   - "pre-trip checklist" -> checklist fixture
 *
 * See: tests/evals/promptfooconfig.yaml, docs/specs/SPEC-EVALS-V1.md
 */

/** Pick default currency symbol / ISO code map. */
const CURRENCY_ISO = {
  BRL: { code: "BRL", symbol: "R$" },
  EUR: { code: "EUR", symbol: "EUR" },
  USD: { code: "USD", symbol: "USD" },
  JPY: { code: "JPY", symbol: "JPY" },
};

function pickLocale(vars) {
  return (vars && vars.language) || "pt-BR";
}

function pickEmergency(vars) {
  if (vars && Array.isArray(vars.expectedEmergency) && vars.expectedEmergency.length > 0) {
    return vars.expectedEmergency.slice();
  }
  return ["190", "192", "193"];
}

function pickCurrency(vars) {
  const iso = (vars && vars.expectedCurrency) || "BRL";
  return CURRENCY_ISO[iso] || CURRENCY_ISO.BRL;
}

function buildGuide(vars) {
  const lang = pickLocale(vars);
  const destination = (vars && vars.destination) || "Unknown";
  const emergency = pickEmergency(vars);
  const currency = pickCurrency(vars);
  const isPt = lang.startsWith("pt");
  return {
    destination,
    language: lang,
    summary: isPt
      ? `Guia de destino para ${destination}. Conteúdo gerado por provedor mock para avaliação.`
      : `Destination guide for ${destination}. Mock-provider content for eval.`,
    sections: [
      {
        title: isPt ? "Visão geral" : "Overview",
        content: isPt
          ? `${destination} é um destino com atrativos culturais e naturais.`
          : `${destination} offers cultural and natural attractions.`,
      },
      {
        title: isPt ? "Como chegar" : "Getting there",
        content: isPt
          ? "Aeroporto mais próximo e rodovias principais."
          : "Nearest airport and main highways.",
      },
    ],
    safety: {
      emergency,
      tips: isPt
        ? ["Mantenha documentos seguros", "Use transporte oficial"]
        : ["Keep documents safe", "Use official transport"],
    },
    currency: currency.code,
    locale: lang,
  };
}

function buildPlan(vars) {
  const lang = pickLocale(vars);
  const destination = (vars && vars.destination) || "Unknown";
  const days = (vars && Number(vars.days)) || 3;
  const emergency = pickEmergency(vars);
  const currency = pickCurrency(vars);
  const budget = (vars && Number(vars.budget)) || 1500;
  const isPt = lang.startsWith("pt");

  const itinerary = [];
  for (let d = 1; d <= days; d += 1) {
    itinerary.push({
      day: d,
      date: null,
      activities: [
        {
          time: "09:00",
          title: isPt ? `Manhã dia ${d}` : `Morning day ${d}`,
          description: isPt ? "Atividade matinal." : "Morning activity.",
          location: destination,
          estimatedCost: Math.round(budget / (days * 3)),
        },
        {
          time: "13:00",
          title: isPt ? `Almoço dia ${d}` : `Lunch day ${d}`,
          description: isPt ? "Almoço local." : "Local lunch.",
          location: destination,
          estimatedCost: Math.round(budget / (days * 4)),
        },
        {
          time: "19:00",
          title: isPt ? `Noite dia ${d}` : `Evening day ${d}`,
          description: isPt ? "Jantar e descanso." : "Dinner and rest.",
          location: destination,
          estimatedCost: Math.round(budget / (days * 5)),
        },
      ],
    });
  }

  return {
    destination,
    language: lang,
    days,
    itinerary,
    budget: {
      currency: currency.code,
      total: budget,
      perDay: Math.round(budget / days),
    },
    safety: {
      emergency,
      notes: isPt ? "Números de emergência locais." : "Local emergency numbers.",
    },
    currency: currency.code,
    locale: lang,
  };
}

function buildChecklist(vars) {
  const lang = pickLocale(vars);
  const destination = (vars && vars.destination) || "Unknown";
  const tripType = (vars && vars.tripType) || "domestic";
  const emergency = pickEmergency(vars);
  const currency = pickCurrency(vars);
  const isPt = lang.startsWith("pt");
  const isInternational = tripType === "international";

  const items = [
    { id: "docs-id", label: isPt ? "Documento de identidade" : "ID document", category: "documents", required: true },
    { id: "health-kit", label: isPt ? "Kit de saúde básico" : "Basic health kit", category: "health", required: true },
    { id: "clothing", label: isPt ? "Roupas apropriadas" : "Appropriate clothing", category: "clothing", required: true },
  ];
  if (isInternational) {
    items.push({ id: "passport", label: isPt ? "Passaporte válido" : "Valid passport", category: "documents", required: true });
    items.push({ id: "adapter", label: isPt ? "Adaptador de tomada" : "Power adapter", category: "electronics", required: true });
    items.push({ id: "visa", label: isPt ? "Visto (se necessário)" : "Visa (if required)", category: "documents", required: false });
  }

  return {
    destination,
    language: lang,
    tripType,
    categories: [
      {
        name: isPt ? "Documentos" : "Documents",
        items: items.filter((i) => i.category === "documents"),
      },
      {
        name: isPt ? "Saúde" : "Health",
        items: items.filter((i) => i.category === "health"),
      },
      {
        name: isPt ? "Roupas" : "Clothing",
        items: items.filter((i) => i.category === "clothing"),
      },
      {
        name: isPt ? "Eletrônicos" : "Electronics",
        items: items.filter((i) => i.category === "electronics"),
      },
    ].filter((c) => c.items.length > 0),
    safety: {
      emergency,
      notes: isPt ? "Números de emergência locais." : "Local emergency numbers.",
    },
    currency: currency.code,
    locale: lang,
  };
}

function detectKind(prompt) {
  const p = String(prompt || "").toLowerCase();
  if (p.includes("checklist")) return "checklist";
  if (p.includes("itinerary") || p.includes("roteiro")) return "plan";
  if (p.includes("guide") || p.includes("guia")) return "guide";
  return "guide";
}

class MockAtlasProvider {
  constructor(options) {
    options = options || {};
    this.providerId = options.id || "mock-atlas";
    this.config = options.config || {};
    this.label = options.label || this.providerId;
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const start = Date.now();
    const vars = (context && context.vars) || {};
    const kind = detectKind(prompt);

    let payload;
    if (kind === "plan") payload = buildPlan(vars);
    else if (kind === "checklist") payload = buildChecklist(vars);
    else payload = buildGuide(vars);

    const output = JSON.stringify(payload);
    const latency = Date.now() - start;
    const outputTokens = Math.ceil(output.length / 4);
    const inputTokens = Math.ceil(String(prompt || "").length / 4);

    return {
      output,
      tokenUsage: {
        prompt: inputTokens,
        completion: outputTokens,
        total: inputTokens + outputTokens,
      },
      latencyMs: latency,
      metadata: { kind, mock: true, locale: pickLocale(vars) },
    };
  }
}

module.exports = MockAtlasProvider;
module.exports.default = MockAtlasProvider;
module.exports.MockAtlasProvider = MockAtlasProvider;
