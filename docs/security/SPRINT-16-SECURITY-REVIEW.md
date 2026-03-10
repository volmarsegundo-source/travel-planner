# Revisao de Seguranca — Sprint 16

**Revisor:** security-specialist
**Data:** 2026-03-09
**Branch:** `feat/sprint-16`
**Escopo:** T-S16-004 (Injection Guard), T-S16-005 (PII Masker), T-S16-006 (Guard Integration)

---

## 1. Escopo e Metodologia

### Arquivos revisados
| Arquivo | Linhas | Tipo |
|---|---|---|
| `src/lib/prompts/injection-guard.ts` | 195 | Implementacao |
| `src/lib/prompts/pii-masker.ts` | 123 | Implementacao |
| `src/server/actions/ai.actions.ts` | 248 | Integracao |
| `src/server/actions/expedition.actions.ts` | 576 | Integracao |
| `src/server/services/ai.service.ts` | 515 | Servico AI (trace de fluxo) |
| `src/server/services/itinerary-plan.service.ts` | 120+ | Contexto expediction (trace) |
| `tests/unit/lib/prompts/injection-guard.test.ts` | 487 | Testes unitarios |
| `tests/unit/lib/prompts/pii-masker.test.ts` | 280 | Testes unitarios |
| `tests/unit/server/ai.actions.test.ts` | 295 | Testes unitarios |
| `tests/integration/prompts/sanitization-flow.test.ts` | 698 | Testes integracao |

### Metodologia
1. Analise estatica de codigo (regex, logica de fluxo, tratamento de erros)
2. Trace completo de dados: input do usuario -> action -> guard -> masker -> AI service -> provider
3. Analise de bypass vectors (Unicode, encoding, cross-field, truncation, homoglyphs)
4. Validacao de cenarios de ameaca especificos (7 cenarios)
5. Verificacao de cobertura LGPD (PII nunca atinge API externa)

---

## 2. Resultado por Task

### T-S16-004: Injection Guard — PASS (com observacoes)

**Pontos positivos:**
- Normalizacao NFKD aplicada ANTES de todos os pattern matches (linha 129)
- Remocao de combining marks (U+0300-U+036F) apos NFKD — permite regex ASCII-only para pt-BR
- Padroes pt-BR bem documentados com comentarios explicativos
- Refinamento do `system:` para exigir keyword de injecao apos os dois pontos — elimina false positive "transit system: Tokyo Metro"
- Classificacao high vs medium adequada: `disregard`, `override`, `pretend` sao legitimamente usaveis em contexto de viagem
- 48+ testes com boa cobertura de edge cases (vazio, whitespace, emojis, fullwidth, pt-BR)

**Observacoes:**
- Ver SEC-S16-001 a SEC-S16-004 abaixo

### T-S16-005: PII Masker — PASS (com observacoes)

**Pontos positivos:**
- Reset de `lastIndex` em regex globais antes de `test()` e `replace()` — correto e necessario
- Ordem de patterns: credit card antes de phone (evita phone regex capturar digitos de cartao)
- Replacements diferenciados por tipo (`[CPF-REDACTED]`, `[EMAIL-REDACTED]`, etc.) — util para auditoria sem expor PII
- Logging registra apenas tipo e quantidade de PII, nunca o conteudo real — LGPD compliant
- Idempotencia validada nos testes (texto ja mascarado nao e re-processado)
- 37+ testes com cobertura de CPF (3 formatos), email, telefone BR, cartao, passaporte

**Observacoes:**
- Ver SEC-S16-005 a SEC-S16-007 abaixo

### T-S16-006: Guard Integration — PASS (com uma finding HIGH)

**Pontos positivos:**
- Pipeline corretamente ordenado: `sanitizeForPrompt()` -> `maskPII()` -> AI service
- Injection check ANTES de PII masking — correto (injecao com PII nao vaza dados)
- Tratamento de erro AppError com codigo `PROMPT_INJECTION_DETECTED` retorna erro seguro ao cliente
- Erro generico `errors.invalidInput` nao revela detalhes da deteccao (nao vaza system prompt)
- Todos os 3 paths de AI (plan, checklist, guide) tem guards aplicados
- Testes de integracao sem mock dos guards (pipeline real testado)

**Finding critica:**
- Ver SEC-S16-008 abaixo (destination nao sanitizado em generateTravelPlanAction)

---

## 3. Findings

### SEC-S16-008: `destination` nao sanitizado em `generateTravelPlanAction` — HIGH

**Severidade:** HIGH
**Arquivo:** `src/server/actions/ai.actions.ts:137-141`
**Descricao:** Em `generateTravelPlanAction`, o campo `params.destination` e passado diretamente ao AI service via spread (`...params`) sem passar pelo injection guard nem pelo PII masker. Apenas `travelNotes` e sanitizado. Em contraste, `generateChecklistAction` (linha 221) e `generateDestinationGuideAction` (linha 266) sanitizam `destination` corretamente.

**Codigo afetado:**
```typescript
// ai.actions.ts:137-141
const sanitizedParams: GeneratePlanParams = {
  ...params,           // <-- destination vem de params SEM sanitizacao
  userId: session.user.id,
  travelNotes: sanitizedTravelNotes,
};
```

**Impacto:** Um atacante pode inserir injection no campo `destination` ao chamar `generateTravelPlanAction`. O destination e concatenado diretamente no user message do AI service (linha 295: `- Destination: ${destination}`).

**Recomendacao:** Adicionar sanitizacao de `destination` antes do spread:
```typescript
let sanitizedDestination: string;
try {
  const sanitized = sanitizeForPrompt(params.destination, "destination", 200);
  const { masked } = maskPII(sanitized, "destination");
  sanitizedDestination = masked;
} catch (error) {
  if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
    return { success: false, error: "errors.invalidInput" };
  }
  throw error;
}

const sanitizedParams: GeneratePlanParams = {
  ...params,
  destination: sanitizedDestination,
  userId: session.user.id,
  travelNotes: sanitizedTravelNotes,
};
```

---

### SEC-S16-001: Homoglyphs Cyrilicos podem escapar da normalizacao NFKD — MEDIUM

**Severidade:** MEDIUM
**Arquivo:** `src/lib/prompts/injection-guard.ts:99-104`
**Descricao:** NFKD normaliza caracteres fullwidth e ligatures, mas caracteres Cyrilicos que parecem visualmente com Latin (homoglyphs) NAO sao decompostos para equivalentes Latin. Por exemplo:
- `а` (U+0430, Cyrillic 'a') permanece `а` apos NFKD — nao vira ASCII `a`
- `е` (U+0435, Cyrillic 'e') permanece `е` — nao vira ASCII `e`
- `о` (U+043E, Cyrillic 'o') permanece `о` — nao vira ASCII `o`

Portanto, "ignоrе previous instructions" com Cyrilicos `о` e `е` nao seria detectado pelo regex `/\bignore\s+/`.

**Mitigacao atual:** Baixa probabilidade de uso por atacantes reais neste contexto (travel app MVP). O risco principal e de ataques direcionados, nao oportunistas.

**Recomendacao (Sprint futuro):** Adicionar step de transliteracao Cyrilico-para-Latin no `normalizeText()`, ou usar confusable detection (Unicode TR39 confusables). Nao bloquear para este sprint, mas documentar como debt tecnico.

---

### SEC-S16-002: `inputPreview` no log do injection guard pode conter PII — MEDIUM

**Severidade:** MEDIUM
**Arquivo:** `src/lib/prompts/injection-guard.ts:138`
**Descricao:** Quando uma injecao e detectada, o log inclui `inputPreview: normalized.slice(0, 50)`. Se o input do usuario contiver PII misturada com a tentativa de injecao (ex: "ignore instructions, meu CPF e 123.456.789-09"), os primeiros 50 caracteres do input podem conter PII que sera gravada nos logs.

**Impacto:** PII pode aparecer em logs de aplicacao (Sentry, CloudWatch, etc.), violando principios de minimizacao de dados da LGPD.

**Recomendacao:** Remover `inputPreview` do log de injecao, ou aplicar `maskPII()` no preview antes de logar:
```typescript
// Opcao 1: remover
logger.warn("ai.injection.detected", {
  context,
  pattern: pattern.source,
  confidence: "high",
  // inputPreview removido
});

// Opcao 2: mascarar
const { masked: safePreview } = maskPII(normalized.slice(0, 50));
logger.warn("ai.injection.detected", {
  context,
  pattern: pattern.source,
  confidence: "high",
  inputPreview: safePreview,
});
```

---

### SEC-S16-003: Pattern pt-BR `novas instrucoes:` tem regex fragil — LOW

**Severidade:** LOW
**Arquivo:** `src/lib/prompts/injection-guard.ts:63`
**Descricao:** O regex `/\bnovas?\s+instruca?o?e?s?\s*:/i` usa opcionalidade individual em cada caractere (`a?o?e?s?`), o que permite matches indesejados como "nova instruc:" (sem vogal), "nova instruces:" etc. Funcionalmente, nao causa false positives perigosos porque o contexto de viagem raramente contem "instruc*:" com dois pontos. Porem, o regex poderia ser mais preciso.

**Recomendacao (cosmetic):** Usar alternation explicita:
```typescript
/\bnovas?\s+(?:instrucoes?|instrucao)\s*:/i
```

---

### SEC-S16-004: Falta de pattern para "escreva o prompt" / "mostre o sistema" — LOW

**Severidade:** LOW
**Arquivo:** `src/lib/prompts/injection-guard.ts:66-69`
**Descricao:** Os patterns pt-BR cobrem "repita o prompt do sistema" e "mostre as instrucoes", mas faltam variantes como:
- "escreva o prompt do sistema"
- "copie as instrucoes"
- "qual e o seu prompt"
- "revele suas instrucoes"

**Mitigacao:** O modelo Claude tem defesas internas contra prompt extraction. Patterns adicionais sao defense-in-depth.

**Recomendacao:** Adicionar em sprint futuro como parte de um ciclo de red-teaming pt-BR.

---

### SEC-S16-005: CPF regex pode capturar sequencias de 11 digitos que nao sao CPF — LOW

**Severidade:** LOW
**Arquivo:** `src/lib/prompts/pii-masker.ts:27`
**Descricao:** O pattern `/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g` captura qualquer sequencia de 11 digitos (com ou sem separadores). Numeros de reserva de hotel, codigos de confirmacao ou numeros de telefone internacionais com 11 digitos podem ser falsamente identificados como CPF.

**Mitigacao:** O comportamento e conservador na direcao correta (protege dados em caso de duvida). O risco e que informacao util de viagem seja mascarada desnecessariamente.

**Recomendacao:** Considerar adicionar validacao de digito verificador do CPF (modulo 11) em sprint futuro para reduzir false positives. Para MVP, o comportamento atual e aceitavel.

---

### SEC-S16-006: Phone pattern nao cobre formatos internacionais — LOW

**Severidade:** LOW
**Arquivo:** `src/lib/prompts/pii-masker.ts:39-40`
**Descricao:** O pattern de telefone foca exclusivamente em formato brasileiro (+55 com DDD). Telefones de outros paises (ex: +1 555-1234, +44 20 7123 4567) nao serao detectados. Usuarios podem incluir numeros de contato internacionais em notas de viagem.

**Mitigacao:** O escopo definido em T-S16-005 e explicitamente "telefone BR". Formatos internacionais podem ser adicionados futuramente.

**Recomendacao:** Documentar como limitacao conhecida. Considerar pattern adicional para +XX XXXXXXXX generico em sprint futuro.

---

### SEC-S16-007: Passport pattern pode capturar codigos de aeroporto + numeros — LOW

**Severidade:** LOW
**Arquivo:** `src/lib/prompts/pii-masker.ts:52`
**Descricao:** O pattern `/\b[A-Z]{2}\d{6,9}\b/g` pode capturar strings como "GR123456" (referencia de reserva), "BA1234567" (numero de voo British Airways com muitos digitos, improvavel mas possivel), ou codigos internos de sistemas de viagem.

**Mitigacao:** Numeros de voo tipicos tem 3-4 digitos (BA1234), nao 6+. Codigos de reserva (PNR) sao 6 caracteres alfanumericos mistos. O risco de false positive e baixo.

**Recomendacao:** Aceitar para MVP. Monitorar logs de `ai.pii.detected` com tipo `passport` para verificar taxa de false positives em producao.

---

### SEC-S16-009: `expeditionContext` nao passa pelo pipeline de sanitizacao — INFO

**Severidade:** INFO
**Arquivo:** `src/server/actions/ai.actions.ts:145-151` + `src/server/services/ai.service.ts:267-290`
**Descricao:** Os dados de `expeditionContext` (vindos de Phase 2 metadata e Phase 5 guide) sao injetados diretamente no prompt sem passar por injection guard ou PII masker. Os campos incluidos sao:
- `tripType` — enum, sem risco
- `travelerType` — enum (Zod validated), sem risco
- `accommodationStyle` — enum (Zod validated), sem risco
- `travelPace` — numero, sem risco
- `budget` — numero, sem risco
- `destinationGuideContext` — string livre derivada de AI-generated content (Phase 5 guide summaries)

**Analise:** Todos os campos exceto `destinationGuideContext` sao enums ou numeros validados por Zod. O `destinationGuideContext` e construido a partir de conteudo gerado pela propria IA (summaries do guide). O risco de injecao e muito baixo porque o atacante teria que primeiro contaminar o output da IA no Phase 5 e esperar que isso seja re-injetado no Phase 6.

**Recomendacao:** Nao requer acao imediata. Se no futuro campos free-text do usuario forem adicionados ao expeditionContext, aplicar sanitizacao.

---

## 4. Analise de Vetores de Bypass

### 4.1 Normalizacao Unicode
| Vetor | Resultado | Status |
|---|---|---|
| Fullwidth characters (U+FF00+) | BLOQUEADO — NFKD decompoe para ASCII | OK |
| Combining marks (acentos decompostos) | BLOQUEADO — strip de U+0300-U+036F | OK |
| Cyrillic homoglyphs (U+0400+) | **NAO BLOQUEADO** — NFKD nao translittera | SEC-S16-001 |
| Ligatures (fi, fl) | BLOQUEADO — NFKD decompoe | OK |
| Math bold/italic (U+1D400+) | BLOQUEADO — NFKD decompoe para ASCII | OK |

### 4.2 Encoding tricks
| Vetor | Resultado | Status |
|---|---|---|
| Base64 encoded injection | NAO DETECTADO — aceitavel (AI nao decodifica base64 como instrucao) | Risco aceito |
| URL encoding (%69%67%6E) | NAO DETECTADO — aceitavel (texto plano no input, nao URL) | N/A |
| HTML entities (&amp;gt;) | NAO DETECTADO — texto plano, nao HTML rendering | N/A |
| Zero-width characters (U+200B) | NAO BLOQUEADO — poderia quebrar regex word boundaries | Risco aceito (MVP) |

### 4.3 Cross-field concatenation
| Vetor | Resultado | Status |
|---|---|---|
| Injection split: "ignore" em destination + "previous instructions" em travelNotes | NAO DETECTADO — cada campo e verificado isoladamente | Risco inerente (aceitavel) |
| PII em destination + injection em travelNotes | Injection detectada antes de PII masking | OK |

### 4.4 Truncation exploitation
| Vetor | Resultado | Status |
|---|---|---|
| Injection apos 500 chars (truncada) | Testado e confirmado: injection removida pela truncacao | OK |
| Injection dentro dos 500 chars | Detectada e bloqueada | OK |
| PII apos 500 chars | Truncada (nao atinge AI) | OK |

### 4.5 Acesso direto ao AI service
| Vetor | Resultado | Status |
|---|---|---|
| Importar AiService diretamente (bypass de actions) | `import "server-only"` impede importacao em client code | OK |
| API route direta para AI | Nao existe API route publica para AI — apenas server actions | OK |

---

## 5. Cenarios de Ameaca

| # | Cenario | Resultado Esperado | Resultado Real | Status |
|---|---|---|---|---|
| 1 | "ignore instrucoes anteriores" em travelNotes | BLOQUEADO | BLOQUEADO (high-confidence, linha 57) | PASS |
| 2 | "Meu CPF e 123.456.789-00" em travelNotes | MASCARADO | MASCARADO para [CPF-REDACTED] | PASS |
| 3 | Fullwidth "ignore previous instructions" | BLOQUEADO apos NFKD | BLOQUEADO | PASS |
| 4 | "transit system: Tokyo Metro is great" | PERMITIDO (false positive fix) | PERMITIDO (regex refinado, linha 33) | PASS |
| 5 | Injection em destination field (checklist/guide) | BLOQUEADO | BLOQUEADO (linhas 221, 266) | PASS |
| 6 | PII em destination field | MASCARADO | MASCARADO | PASS |
| 7 | Reconstrucao de system prompt via mensagens de erro | NAO VAZA | Erro retorna apenas "errors.invalidInput" | PASS |
| 8 | Injection em destination field (plan) | BLOQUEADO | **NAO BLOQUEADO** — destination nao sanitizado | **FAIL** (SEC-S16-008) |

---

## 6. Verificacao LGPD

| Criterio | Status | Observacao |
|---|---|---|
| PII nunca atinge Anthropic API | PASS (com excecao SEC-S16-008) | destination em plan pode conter PII nao mascarada |
| PII nao aparece em logs | PARTIAL | `inputPreview` pode conter PII (SEC-S16-002) |
| Mascaramento irreversivel | PASS | Substituicao por `[TYPE-REDACTED]` — nao reversivel |
| Consentimento informado | N/A | Fora do escopo desta revisao |
| Minimizacao de dados no log | PASS | Apenas tipo e contagem de PII logados, nao conteudo |

---

## 7. Veredito

### APPROVED WITH CONDITIONS

As implementacoes de T-S16-004 e T-S16-005 estao solidas e bem testadas. A integracao em T-S16-006 cobre os 3 paths de AI corretamente para `travelNotes` e `destination` em checklist/guide, mas tem uma lacuna importante:

**Condicao obrigatoria para merge:**

1. **SEC-S16-008 (HIGH):** Adicionar `sanitizeForPrompt()` + `maskPII()` no campo `destination` dentro de `generateTravelPlanAction`, seguindo o mesmo padrao ja implementado em `generateChecklistAction` e `generateDestinationGuideAction`. Sem este fix, um atacante pode injetar comandos via destination name no fluxo de geracao de itinerario.

**Recomendacoes para sprints futuros (nao bloqueiam merge):**

2. **SEC-S16-002 (MEDIUM):** Remover ou mascarar `inputPreview` no log de injection detection para evitar PII nos logs.
3. **SEC-S16-001 (MEDIUM):** Adicionar transliteracao de homoglyphs Cyrilicos em ciclo de red-teaming futuro.
4. **SEC-S16-003 a SEC-S16-007 (LOW):** Refinamentos de regex e cobertura de patterns adicionais — backlog de seguranca.

---

## 8. Checklist de Seguranca Sprint 16

- [x] Nenhum credential hardcoded nos arquivos revisados
- [x] Injection guard ativo em todas as actions que chamam AI
- [x] destination sanitizado em generateTravelPlanAction (SEC-S16-008 — RESOLVED)
- [x] PII masker integrado antes de chamadas AI
- [x] Token usage logado sem PII (userId apenas, sem travelNotes/email)
- [x] Erros de injection nao vazam detalhes do system prompt
- [x] Testes de integracao sem mock dos guards (pipeline real)
- [x] NFKD normalizacao aplicada antes de pattern matching
- [x] Regex globais com reset de lastIndex correto
- [x] inputPreview em logs de injecao mascarado via maskPII() (SEC-S16-002 — RESOLVED)

---

## 9. Re-Review de Findings Corrigidos

### SEC-S16-008 — RESOLVED (2026-03-09)

**Fix verificado em:** `src/server/actions/ai.actions.ts:122-155`
**Correcao:** `destination` agora passa por `sanitizeForPrompt(params.destination, "destination", 200)` seguido de `maskPII(sanitized, "destination")` antes de ser incluido nos `sanitizedParams`. O campo sanitizado sobrescreve explicitamente o valor raw do spread. O tratamento de `PROMPT_INJECTION_DETECTED` retorna `errors.invalidInput` ao cliente.
**Testes adicionados:** 2 testes diretos em `ai.actions.test.ts` — injection bloqueada + PII mascarada no destination. Mais 1 teste negativo confirmando que sem travelNotes, apenas 1 chamada a sanitizeForPrompt/maskPII (para destination).
**Veredito:** Correcao completa e consistente com o padrao de `generateChecklistAction` e `generateDestinationGuideAction`.

### SEC-S16-002 — RESOLVED (2026-03-09)

**Fix verificado em:** `src/lib/prompts/injection-guard.ts:139`
**Correcao:** `inputPreview` agora usa `maskPII(normalized.slice(0, 50)).masked` em vez do `normalized.slice(0, 50)` raw. A logica de deteccao de injecao permanece inalterada.
**Testes adicionados:** 3 testes em `injection-guard.test.ts` — email mascarado, CPF mascarado, preview sem PII inalterado.
**Veredito:** Correcao correta. PII nao aparece mais em logs de deteccao de injecao. LGPD compliance restaurado para este ponto.

---

*Revisao inicial realizada por security-specialist em 2026-03-09.*
*Re-review de SEC-S16-008 e SEC-S16-002 realizada por security-specialist em 2026-03-09.*
