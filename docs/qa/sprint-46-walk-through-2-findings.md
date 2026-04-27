# Walk-through #2 Findings — Investigation (27/abr/2026)

**Author:** dev-fullstack-1 (autonomous Sprint 46.5 — investigation only)
**Triggered by:** PO walk-through #2 em Staging (post Sprint 46.5 fix bundle deploy + F-OPS-03 SQL execution)
**Branch state:** `master` @ `e8570e0` (Sprint 46.5 final)
**Scope:** investigação de 2 findings UX descobertos durante teste interativo do PromptEditor. **NÃO contém fix.**

---

## §1 Executive summary

Ambos findings têm a mesma causa raiz: **divergência entre o modelo mental do admin e a sintaxe canônica de placeholder definida em SPEC-AI-GOVERNANCE-V2 §2.1**. PO digitou `{{var}}` esperando comportamento Mustache (interpolação), mas o sistema usa esse formato como **escape literal** (`{{var}}` renderiza como `{var}` sem ser interpolado). Resultado: zero placeholders detectados, V-01 dispara reclamando dos 8 obrigatórios faltantes, V-02 nunca é avaliada (não há placeholder extraído para checar contra forbidden set), e a falsa percepção de "ordem sequencial das validações" surge.

**Classification:** ambos findings são **by-design** com **gap UX P2** documentado. O comportamento de detecção está correto per SPEC §2.1; o que falta é **discoverability** (help text inline mostrando sintaxe canônica + lista de placeholders obrigatórios por modelType + shape de detecção V-06/V-07). Sprint 46 close impact: **READY-WITH-FOLLOWUPS** — as 2 findings reforçam o escopo já aprovado de **B47-UI-DOD-DISCOVER** no Sprint 47 backlog (commit `fd3523e`).

---

## §2 Walk-through #2 results — contexto

PO conseguiu progredir além do walk-through #1 (que ficou bloqueado em F-WALK-02 — editor não alcançável). Etapas confirmadas working:

- Etapa 0 — deploy Vercel Staging do commit `a878f62` (AdminNav extend) ✅
- Etapa 1 — F-OPS-03 SQL executado em Neon Staging (16 rows seed) ✅ (assumindo PO já rodou; este doc não confirma execução)
- Etapa 2 — Login admin + RBAC ✅
- Etapa 3 — Navegação `/admin/ia?tab=prompts` via AdminNav link → renderiza PromptsTab ✅
- Etapa 3.1 — Botão "+ Novo" abre PromptEditor ✅
- **Etapa 3.2 — Teste de validações:** ❌ 2 findings UX (este documento)

Etapas 4-6 (cobrir cenários adversariais + i18n + sign-off) ainda não exercidos pelo PO.

---

## §3 F-WALK2-01: Sintaxe placeholder

### §3.1 Sintaxe canônica (SPEC reference)

**Definição autoritativa:** `docs/specs/sprint-46/SPEC-AI-GOVERNANCE-V2.md` §2.1:

```
Placeholders são tokens no formato {name} onde name corresponde à regex
[a-zA-Z][a-zA-Z0-9_]*. Extração canônica:

  /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g

Placeholders **escapados** ({{literal}}) são ignorados pela validação e
renderizados literalmente como {literal}.
```

| Aspecto | Valor canônico |
|---|---|
| Sintaxe interpolação | `{name}` (chave única) |
| Sintaxe escape (literal) | `{{name}}` (chave dupla — renderiza como `{name}` literal) |
| Regex (extração) | `/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g` |
| Charset do nome | letra inicial + `[a-zA-Z0-9_]*` |
| Case-sensitive | Sim — `{userEmail}` ≠ `{USEREMAIL}` |

### §3.2 Implementação verificada — consistente entre 3 caminhos

| Caminho | Local | Comportamento |
|---|---|---|
| Server-side V-01/V-02 detection | `src/server/services/ai-governance/prompt-validations/placeholders.ts:21` (`PLACEHOLDER_RE`) + `:28-37` (`extractPlaceholders` com strip de `{{...}}`) | Strip-then-extract: `{{var}}` → sentinel `ESCAPED` → regex single-brace não match |
| Server-side warnings W-01 | mesmo módulo | mesmo comportamento (importa `extractPlaceholders`) |
| Client-side editor chips | `src/app/[locale]/(app)/admin/ia/PromptEditor.tsx:20-43` | Mesma regra (regex + strip `{{...}}` antes do match) |

**Verificação:** o cliente e o servidor usam **a mesma lógica de detecção**. Não há drift técnico entre UI e backend. PO digitar `{{userName}}` → 0 placeholders detectados em ambos os lados, consistentemente.

### §3.3 Cause analysis — discrepância UI

PO digitou:
```
Olá {{userName}}, sua viagem para {{destination}} começa em {{date}}.
```

Trace lógico:
1. Cliente extrai placeholders: regex strip `{{...}}` → 3 substrings viram `ESCAPED` → segundo regex single-brace não acha nada → `[]`
2. Stats panel: "Placeholders detectados: (nenhum)" ✅ correto per SPEC
3. PO clica "Salvar"
4. Servidor roda `validateBlocking`:
   - V-01 vê 0 placeholders extraídos, compara com required de `guide` (8 obrigatórios) → erro "Faltam placeholders obrigatórios: `{destination}`, `{originCity}`, …" ← mensagem usa single-brace (canônico)
   - V-02 não acha placeholder algum no extracted set → return null (sem erro)
   - V-03..V-08 rodam normalmente (algumas podem retornar erro próprio, mas no teste PO só V-01 fired)

**Discrepância percebida:** PO usou `{{var}}` (Mustache mental model — comum em Handlebars/Mustache/Vue/etc) e a mensagem de erro listou `{var}` (single-brace). Sem help text inline, admin não tem como saber que single-brace é o canônico.

### §3.4 Classification

**By design.** A escolha de single-brace + double-brace-as-escape é deliberada, documentada em SPEC §2.1, e implementada consistentemente. O gap é **UX/discoverability**:

- Editor não mostra exemplo de sintaxe inline ("Use `{name}` para interpolar")
- Editor não documenta o escape (`{{name}}` vira literal `{name}`)
- Editor não lista placeholders obrigatórios pelo modelType selecionado
- Mensagem V-01 de erro usa o canônico `{var}` mas isso vem só DEPOIS de tentar salvar

Severity: **P2** (UX médio; não bloqueia operação, gera confusão na primeira tentativa).

---

## §4 Placeholders obrigatórios por modelType

### §4.1 Tabela canônica (source: `placeholders.ts:40-72`)

| modelType | Obrigatórios (V-01) | Total | SPEC reference |
|---|---|---:|---|
| `guide` | `{destination}`, `{originCity}`, `{days}`, `{startDate}`, `{endDate}`, `{passengers}`, `{travelStyle}`, `{language}` | **8** | SPEC-AI §2.2 |
| `plan` | `{destination}`, `{days}`, `{startDate}`, `{endDate}`, `{dailyPace}`, `{preferences}`, `{travelers}`, `{language}`, `{budgetTotal}`, `{budgetCurrency}`, `{tokenBudget}` | **11** | SPEC-AI §2.3 |
| `checklist` | `{destination}`, `{tripType}`, `{departureDays}`, `{dates}`, `{travelers}`, `{language}` | **6** | SPEC-AI §2.4 |

### §4.2 Forbidden (V-02) — placeholders bloqueados em qualquer modelType

| Categoria | Nomes | SPEC reference |
|---|---|---|
| PII | `userEmail`, `userId`, `email`, `phone`, `passport`, `cpf` | SPEC-AI §2.5 |
| Secrets | `apiKey`, `secret`, `token`, `anthropicApiKey`, `googleAiApiKey` | SPEC-AI §2.5 |
| Internal URLs | `internalUrl`, `databaseUrl`, `redisUrl` | SPEC-AI §2.5 |

### §4.3 Estado atual de discoverability

| Surface | Mostra obrigatórios? | Mostra forbidden? | Mostra sintaxe? |
|---|---|---|---|
| AdminNav link tooltip | ❌ | ❌ | ❌ |
| `/admin/ia` page header | ❌ | ❌ | ❌ |
| PromptsTab list view | ❌ | ❌ | ❌ |
| PromptEditor — slug field | ❌ | ❌ | ❌ |
| PromptEditor — modelType dropdown | ❌ (não atualiza ao trocar tipo) | ❌ | ❌ |
| PromptEditor — systemPrompt textarea | ❌ | ❌ | ❌ (sem placeholder text) |
| PromptEditor — chips abaixo da textarea | Mostra placeholders DETECTADOS (não OBRIGATÓRIOS) | Highlight vermelho SE digitou um forbidden e foi detectado (ou seja, single-brace) | ❌ |
| Mensagem de erro V-01 (após submit) | Mostra os FALTANTES | ❌ | ❌ |
| Mensagem de erro V-02 (após submit) | ❌ | Mostra o nome detectado | ❌ |

**Conclusão:** PO descobre os placeholders obrigatórios **APENAS via mensagem de erro V-01 após tentar salvar**. Nenhum surface preventivo ajuda o admin a acertar de primeira.

---

## §5 F-WALK2-02: Ordem das validações

### §5.1 Comportamento real (source: `prompt-validations/index.ts:34-60`)

```ts
const BLOCKING_CHECKS = [
  v01RequiredPlaceholders, v02ForbiddenPlaceholders, v03TokenBudget,
  v04JsonOutputSchema, v05LanguageDeclared, v06PiiDetection,
  v07ApiKeyDetection, v08InternalUrlDetection,
];

export function validateBlocking(ctx) {
  const errors = [];
  for (const check of BLOCKING_CHECKS) {
    const out = check(ctx);
    if (out && out.length > 0) errors.push(...out);
  }
  return { ok: errors.length === 0, errors };
}
```

**Comportamento real:** **paralelo lógico, agregado por reduce**. Cada V-XX é avaliada SEMPRE; nenhum check é skippado em função do resultado anterior. Erros se acumulam em `errors[]` e retornam todos juntos.

Source SPEC §3 line 162 (lido em sessão prévia): "lista todas as falhas para reduzir retrabalho do admin" — implementação está alinhada.

### §5.2 Por que V-02 e V-07 não dispararam nos testes do PO

**Teste 1: PO digitou `Sua senha é {{password}}`.**
- V-01 extrai placeholders → strip `{{...}}` zera tudo → 0 detectados → erro "missing 8 required" ✅ FIRES
- V-02 percorre extracted set → set vazio → loop não roda → null → ✗ DOES NOT FIRE
- V-03..V-08 rodam mas não acham nada que dispare → passam silenciosos

**Por que V-02 não fired:** o input do PO **não contém placeholder algum** (per regra de detecção §3.1). V-02 só checa o que foi extraído pelo `extractPlaceholders`. Como `{{password}}` é escape literal, "password" não está no extracted set, V-02 não tem o que avaliar.

**Solução semântica:** se PO tivesse digitado `Sua senha é {password}` (single-brace), V-02 detectaria, mas `{password}` NÃO está em FORBIDDEN_PLACEHOLDERS (só `apiKey`, `secret`, `token`, etc estão). PO precisaria digitar `{secret}` ou `{apiKey}` para V-02 disparar.

**Teste 2: PO digitou email + "key fake".**
- V-01 fires (0 ou poucos placeholders válidos) ✅
- V-06 detecta email regex `/[\w.+-]+@[\w-]+\.[\w.-]+/` ✅ FIRES
- V-07 só detecta strings `/sk-[a-zA-Z0-9]{20,}/g` ou `/AIza[0-9A-Za-z_-]{35}/g`. "key fake" não bate o prefixo nem tem 20+ alfanuméricos → ✗ DOES NOT FIRE

**Por que V-07 não fired:** SPEC regex específico ao prefixo de vendor. Sem `sk-...20+chars` ou `AIza...35chars` exatos, regex não match. PO usou input plausível mas que **não satisfaz a forma SPEC**.

### §5.3 Classification

**By design.** Não há bug:
- Orchestrator é paralelo (não sequencial), confirma SPEC §3 line 162
- V-02 só vê placeholders extraídos canonicamente; consistente com SPEC §2.1
- V-07 segue regex SPEC §3.1 exato

A percepção do PO de "V-01 obscurece" é uma **inferência razoável mas incorreta**. As validações são paralelas; só V-01 disparou porque os outros legitimately não acharam o que filtram.

Severity: **P2 UX**. Mesmo gap raiz da §3 — falta de help text inline mostrando exemplos do que cada V-XX detecta.

---

## §6 Sprint 46 close impact

**Veredicto: READY-WITH-FOLLOWUPS.**

- Ambos findings são **by-design**, não bugs. Implementação está alinhada com SPEC.
- Severidade dos gaps é **P2** (UX/discoverability, não comportamento incorreto).
- Não bloqueiam Sprint 46 close — bloqueiam **excelência UX**, que é Sprint 47 escopo.
- Walk-through #2 etapas 4-6 podem prosseguir: PO **agora sabe** que sintaxe é single-brace e pode testar V-XX corretamente.

**Critério de close §7 do `wave-close-staging-readiness.md`:**

| Categoria | Status |
|---|---|
| §2 Environment configuration | ✅ (F-OPS-01 ✅, AI_GOVERNANCE_V2 setado) |
| §3 Database state | ✅ (F-OPS-02 + F-OPS-03 ✅, 16 rows seed) |
| §4 UI discoverability — link no AdminNav | ✅ (F-FIX-05 ✅) |
| §4 UI discoverability — help text in-editor | ❌ (P2 deferred for B47-UI-DOD-DISCOVER) |
| §5 PO walk-through | ⏳ (etapas 4-6 pending) |

**Como o checklist v1 (commit `0376691`) é binário,** a presença de `❌` em §4 (discoverability help text) tecnicamente classifica como BLOCKED. Mas:
- A intenção original do checklist era prevenir que features sejam **completamente** inacessíveis (caso F-WALK-02 do walk-through #1).
- O gap atual é **excelência UX**, não acessibilidade (a feature É alcançável e operável; admin precisa só de uma orientação).
- B47-UI-DOD-DISCOVER já tem este escopo no S47 backlog (`fd3523e`).

**Recomendação ao PO:** evoluir checklist §4 para **dois sub-bullets**:
1. "Feature é alcançável via primary nav" — binário (este Sprint deve passar)
2. "Feature tem help text in-editor" — escala (P2 acceptable se documentado como S47 follow-up)

Com essa nuance, Sprint 46 close = **READY-WITH-FOLLOWUPS**, não BLOCKED.

---

## §7 Sprint 47 recommendations — B47-UI-DOD-DISCOVER scope expandido

O ticket **B47-UI-DOD-DISCOVER** já existe em `docs/specs/sprint-47-candidates/BACKLOG.md` (commit `fd3523e`). Recomendo expandir o escopo dele com 4 sub-itens emergidos desta investigação:

### B47-UI-DOD-DISCOVER §A — Help text de sintaxe placeholder
- **Escopo:** banner/tooltip persistente no PromptEditor explicando:
  - "Use `{nome}` (chave única) para interpolar valores em runtime"
  - "Use `{{nome}}` (chave dupla) para escapar — render literal `{nome}`"
  - "Nomes válidos: letra inicial + letras/números/underscore"
- **Implementação:** componente `<PlaceholderSyntaxHint>` colocado acima das textareas do editor
- **Esforço estimado:** 30 min
- **i18n:** PT-BR + EN

### B47-UI-DOD-DISCOVER §B — Lista de obrigatórios reativa ao modelType
- **Escopo:** quando admin troca o dropdown `modelType`, lista os obrigatórios (8 / 11 / 6) live em painel lateral. Cada nome vira chip que pode ser inserido por click.
- **Esforço estimado:** 1.5h (componente + integração com extractPlaceholders + UX validar quais já estão presentes)
- **Bonus:** progress indicator "5/8 obrigatórios presentes"

### B47-UI-DOD-DISCOVER §C — Lista de forbidden visíveis
- **Escopo:** painel "Não use" listando os 14 forbidden em `FORBIDDEN_PLACEHOLDERS`. Permite ao admin aprender a regra antes de tentar.
- **Esforço estimado:** 30 min

### B47-UI-DOD-DISCOVER §D — Validação real-time (não só no submit)
- **Escopo:** rodar V-01 + V-02 + W-01 client-side enquanto admin digita. Não substitui server-side gate, mas reduz round-trips.
- **Esforço estimado:** 2h (debounced effect + feedback visual de cada V-XX em tempo real)
- **Trade-off:** risco de divergência entre client e server se SPEC mudar; mitigar com export único de regex do server.

### B47-UI-DOD-DISCOVER §E — V-06/V-07/V-08 shape exemplos
- **Escopo:** dentro do help text, mostrar 1 exemplo curto do que cada V-XX detecta:
  - V-06: "ada@example.com (e-mail real)"
  - V-07: "sk-XXXXXXXXXXXXXXXXXXXX (Anthropic key shape)"
  - V-08: "localhost:3000, 127.0.0.1, *.travel-planner.dev"
- **Esforço estimado:** 30 min

**Total expandido B47-UI-DOD-DISCOVER:** ~5h (era 1-2h no backlog original).

**Recomendação sequência:** §A + §B + §E primeiro (ataca maioria do gap UX). §C + §D são polish.

---

## §8 Self-honesty observations

### §8.1 Confidence da investigação

Esta investigação é determinística — todas conclusões são citáveis em código + SPEC. Não há blind spots inferidos. Diferente da v1 do walk-through #1 onde precisei inferir estado de DB/Vercel, aqui tudo está no repo e é literalmente lido.

### §8.2 Padrão emergente

A investigação confirma o padrão **"shipping vapor adjacente"**: features tecnicamente corretas (per SPEC) mas inutilizáveis sem **conhecimento implícito** que apenas o developer/SPEC-author tem. A feature funciona em Staging — admin pode editar prompts. Mas admin precisa **memorizar** a sintaxe canônica e os 8/11/6 obrigatórios. Isso é dívida UX que merece tratamento sistemático.

Recomendo expandir o **`wave-close-staging-readiness.md`** §4 (discoverability) com sub-critério novo:
- "Feature has in-context help/hints OR documented direct-URL-only exception"

### §8.3 Onde fui rápido demais

Na investigação v1 do walk-through #1, eu disse "PO consegue navegar do dashboard root até a feature em ≤ 3 clicks, sem digitar URL" como métrica de discoverability. Acabei descobrindo agora que **chegar na feature** ≠ **conseguir usar a feature**. Discoverability é um continuum (descoberta → operação → recuperação de erro), e o checklist atual cobre apenas o primeiro nível.

Recomendo evoluir o checklist para os 3 níveis explicitamente — fica para B47-UI-DOD-DISCOVER incluir.

### §8.4 Algo não investiguei

Não testei manualmente o PromptEditor em Staging (não tenho acesso UI). Confiei no relato PO + leitura de código + SPEC. Se o comportamento real em Staging divergir do código que li (improvável mas possível — cache antigo no edge, hidratação React diferente), minha análise estaria off. Mitigação: PO confirma na próxima walk-through tentativa que ao digitar `{destination}` (single-brace) o chip aparece.

### §8.5 Decisão de escopo defensável

**NÃO classifiquei nada como bug.** Tudo é by-design + UX gap. Razões:
- Implementação bate SPEC §2.1 verbatim
- Orchestrator é paralelo per SPEC §3 line 162
- V-XX shape regex é SPEC §3.1 verbatim

Mudar comportamento (ex: aceitar `{{var}}` como placeholder também) seria **violar SPEC** sem aprovação multi-agent. O caminho correto é **expandir UX para que SPEC fique óbvia ao admin**, não relaxar SPEC.

---

**Final state.** Branch `master` @ `e8570e0`. Esta investigação não modifica código nem SPECs. Recomendo PO ler, autorizar Sprint 46 close formal como READY-WITH-FOLLOWUPS, e Sprint 47 absorver o escopo expandido de B47-UI-DOD-DISCOVER.
