# Walk-through Investigation Report — 27/abr/2026

**Author:** dev-fullstack-1 (autonomous investigation mode)
**Trigger:** PO walk-through Staging Wave 1 + Wave 2 em 27/abr/2026
**Scope:** Investigação de 3 findings (F-WALK-01, F-WALK-02, F-WALK-03). NÃO contém fix.
**Branch state:** `master` @ `9fd8487` (Wave 2 close)

---

## §1 Executive summary

Os 3 findings têm **causa raiz comum**: o deploy Staging do commit `9fd8487` carregou o código Wave 2 corretamente, mas **a configuração operacional do ambiente não foi atualizada** para tornar Wave 2 utilizável. Especificamente:

1. **F-WALK-01** — `/admin/ia` retorna 404 porque a env var `AI_GOVERNANCE_V2` não foi setada (default `false` faz `notFound()`); URL canônica real é `/{locale}/admin/ia?tab=prompts`. Locale prefix é obrigatório em todas as rotas autenticadas. **Severidade P2.**
2. **F-WALK-02** — Editor não editável porque PO está na **página errada**: `/admin/prompts` é o **legacy PromptViewer** (Sprint 7-8) que mostra AI interaction logs read-only, **não** o Wave 2 editor. A nav admin (`AdminNav.tsx`) NÃO tem link para `/admin/ia` — isso foi declarado como gap conhecido em B-W1-006 honesty flag #4 e Wave 2 não fechou. Hipótese A (deferred wiring) **CONFIRMADA**. **Severidade P1 para Sprint 46 close.**
3. **F-WALK-03** — Health endpoint retorna `degraded` porque a tabela `ModelAssignment` está vazia em Staging; o seed `seedAiGovernanceV2Defaults` (B-W1-003) não foi executado contra o banco Staging. Migration B-W1-002 rodou (caso contrário health daria 503, não 200). **Severidade P2.**

**Recomendação Prod:** TECHNICALLY SAFE com flag OFF (Wave 2 fica como dead code dormante; mesma estratégia de Wave 1 deploy). F-02 fix se beneficia de Prod ASAP (fecha janela de exposição). PROD PROMOTION VIABLE com plano de ativação em 2 fases.

**Recomendação Sprint 46 close:** READY-WITH-FOLLOWUPS. 3 ações de baixo esforço (1 commit + 2 mudanças em Vercel/seed) destravam walk-through e permitem fechamento.

---

## §2 F-WALK-01 — URLs divergence

### §2.1 Findings

| Esperado pelo plano | Real em Staging | Causa |
|---|---|---|
| `/admin/ia` shell V2 | **404** | Feature flag `AI_GOVERNANCE_V2` OFF (default false) → `notFound()` |
| `/admin/ia/prompts` | **404** (mesma razão) | (idem) — além disso, a URL real é `/admin/ia?tab=prompts` (query, não path) |
| `/admin` raiz | redireciona `/admin/dashboard` ✅ | `src/app/[locale]/(app)/admin/page.tsx` faz `redirect("/admin/dashboard")` |
| `/en/admin/prompts` | renderiza ✅ | É a **legacy PromptViewer** (Sprint 7-8), NÃO o Wave 2 editor |

### §2.2 Root cause

**Três fatores combinados:**

1. **Feature flag default OFF.** Em `src/lib/env.ts`:
   ```ts
   AI_GOVERNANCE_V2: z.enum(["true", "false"]).default("false").transform(v => v === "true")
   ```
   Vercel Staging env não tem `AI_GOVERNANCE_V2=true` → flag `false` → `src/app/[locale]/(app)/admin/ia/page.tsx:25` chama `notFound()`. **Comportamento por design** (B-W1-001).

2. **Locale prefix obrigatório.** O middleware `next-intl` (`src/middleware.ts:29`) força prefixo de locale em todas as rotas. URL canônica real é `/{locale}/admin/ia?tab=prompts`. Quando PO digita `/admin/ia` no navegador, o middleware deveria redirecionar para `/en/admin/ia` ou `/pt-BR/admin/ia` — mas com flag OFF, o destino retorna 404 de qualquer forma.

3. **Confusão semântica de "prompts":**
   - `/{locale}/admin/prompts` = **legacy PromptViewer** (AI interaction logs, read-only, populated por traffic real)
   - `/{locale}/admin/ia?tab=prompts` = **Wave 2 editor** (PromptTemplate CRUD)
   - Mesma palavra, dois UIs completamente diferentes. Sem sinalização visual no admin nav.

### §2.3 Severity

**P2** — não é bug funcional (URLs existem, código está correto), mas é **gap de descoberta** que bloqueia o walk-through. Sem fix, PO não consegue validar Wave 2 mesmo se tudo funcionasse.

### §2.4 Fix scope (proposed)

Três ações independentes:

1. **Setar `AI_GOVERNANCE_V2=true` em Vercel Staging env** — Vercel dashboard, sem deploy necessário (next request lê o novo valor). 5 min.
2. **Adicionar link `/admin/ia` no `AdminNav.tsx`** — entry novo no array `ADMIN_LINKS`, com i18n key `navAi` ou similar. ~10 min código + 5 min PR. Precisa também i18n keys em `messages/{en,pt-BR}.json`.
3. **(Opcional) Documentar URL canônica nas release notes Wave 1+2** — referência para futuros walk-throughs. ~5 min.

**Esforço total: ~30 min.** Trivial.

---

## §3 F-WALK-02 — Editor non-editable (CRITICAL)

### §3.1 Findings

PO em Staging:
- Acessou `/en/admin/prompts` esperando o Wave 2 editor
- Viu uma lista de **50 itens** read-only com botões "Copy"
- Clicou em um item, viu o conteúdo do prompt em modal/expansão
- **Sem botão "Novo / Criar / Editar / Salvar"**
- Sistema "ignora" mudanças porque os campos são display-only

### §3.2 Root cause — Hipótese A CONFIRMADA + nuance E

**A página que PO acessou NÃO É o Wave 2 editor.** É o **legacy PromptViewer** (Sprint 7-8), implementado em:

- `src/app/[locale]/(app)/admin/prompts/page.tsx` — Server component que chama `getAiInteractionsAction({ limit: 50 })`
- `src/components/features/admin/PromptViewer.tsx` — Client component read-only com botão "Copy"
- Os "50 prompts" são **`AiInteractionLog` rows** (histórico de chamadas AI feitas pelos usuários reais), NÃO `PromptTemplate` rows.

**Wave 2 editor real** (B-W2-006) está em:
- `src/app/[locale]/(app)/admin/ia/PromptsTab.tsx` — UI de lista + editor wired
- `src/app/[locale]/(app)/admin/ia/PromptEditor.tsx` — formulário com chips, token count, validação inline
- Ativação: `/{locale}/admin/ia?tab=prompts` **com flag `AI_GOVERNANCE_V2=true`**
- **Inacessível em Staging atual** porque (1) flag OFF e (2) AdminNav não linka para `/admin/ia`.

**A causa raiz mais profunda** está documentada — em `docs/releases/b-w1-006-admin-ui-shell.md` honesty flag #4:

> "**AdminNav not extended.** The existing `AdminNav.tsx` does NOT yet show a link to `/admin/ia`. Users access via direct URL or future Wave 2 nav update. Intentional — keeps coupling minimal during Wave 1."

Wave 2 (B-W2-006) **NÃO fechou esse gap**. O release note de B-W2-006 não menciona AdminNav. **Esse é o link que faltou.**

**Confirmação de hipóteses:**

| Hipótese PO | Status | Evidência |
|---|---|---|
| **A** Funcionalidade incompleta (editor não embebido) | **CONFIRMADA parcialmente** | PromptEditor está implementado e wired internamente em PromptsTab; o que falta é o entry-point (link no AdminNav). |
| **B** Wiring POST/PATCH não conectado | **DISCONFIRMADA** | B-W2-001 (APIs) e B-W2-006 (UI) ambos passam tests; service tests provam create + update funcionam. |
| **C** RBAC role mismatch | **DISCONFIRMADA** | `withAiGovernanceAccess` aceita `admin` (PO tem essa role); 5/5 compliance tests verde. Não é um problema de permissão. |
| **D** Bug runtime | **DISCONFIRMADA** | 223/223 tests verde, incluindo integration cross-cuts. PO simplesmente nunca chegou na página certa. |
| **E** Outra causa | **CONFIRMADA específica** | "Página errada" — PO em legacy `/admin/prompts` (PromptViewer) em vez de `/admin/ia?tab=prompts` (Wave 2). |

### §3.3 Severity

**P1 para Sprint 46 close.** Walk-through gate **não pode passar** sem isso. PO sign-off impossível enquanto Wave 2 features estiverem inalcançáveis em UI real.

**P2/P3 para Prod** isoladamente — Wave 2 em Prod pode ficar dormante atrás do flag OFF (mesma estratégia de Wave 1 deploy); usuários não serão impactados. Mas isso não é desejável: gasta-se 9 commits sem trazer valor para Prod.

### §3.4 Fix scope (proposed)

**Mudança mínima de código (1 commit):**

1. **`src/app/[locale]/(app)/admin/AdminNav.tsx`** — adicionar entry no array:
   ```ts
   { href: "/admin/ia", i18nKey: "navAi" },
   ```
   E gate por feature flag (importar `isAiGovernanceV2Enabled`) — se OFF, esconder o link. Esse é exatamente o "future Wave 2 nav update" antecipado pelo release note Wave 1.

2. **`messages/en.json` + `messages/pt-BR.json`** — adicionar key:
   ```json
   "navAi": "AI Governance Central"
   "navAi": "Central Governança IA"
   ```

3. **(Opcional) Atualizar B-W2-006 release notes** — incluir clarificação de URL canônica + diferença vs `/admin/prompts` legacy.

**Mudanças de configuração Staging (sem código):**

4. Vercel Staging env: `AI_GOVERNANCE_V2=true`.
5. Rodar `npx prisma db seed` contra Staging DB (também resolve F-WALK-03).

### §3.5 Effort estimate

| Item | Esforço | Dependência |
|---|---|---|
| AdminNav extend + i18n keys | 30 min | nenhuma |
| Tests para nav (link visível com flag ON; oculto com OFF) | 30 min | item 1 |
| Vercel Staging flag | 5 min (config-only) | item 1 deployed |
| Run seed Staging | 10 min (manual SQL `npx prisma db seed`) | nenhuma |
| Atualização release notes B-W2-006 | 15 min | item 1 commit |
| **Total** | **~1.5h** | sequencial |

Pode ser feito em uma única sessão de Sprint 46.5 (mid-week patch).

---

## §4 F-WALK-03 — Health endpoint `degraded`

### §4.1 Findings

```
GET /api/health/ai-config
→ 200 { "status": "degraded", "source": "fallback", "phases": [...HARDCODED_FALLBACK] }
```

### §4.2 Root cause

**`ModelAssignment` table está vazia em Staging.** Health endpoint (`src/app/api/health/ai-config/route.ts:55`) tem este branch:

```ts
if (assignments.length === 0) {
  // Migration applied but seed not yet run — degraded but recoverable.
  logger.warn("ai.config.health.empty", { checkedAt });
  return NextResponse.json({ status: "degraded", source: "fallback", ... }, { status: 200 });
}
```

Isso significa:
- ✅ Migration B-W1-002 rodou (a tabela existe; senão `findMany` lançaria e o handler retornaria 503)
- ❌ Seed B-W1-003 (`seedAiGovernanceV2Defaults`) NÃO rodou em Staging — `ModelAssignment` vazio
- O health endpoint está respondendo **conforme o design**: detecta "schema OK + dados vazios" e devolve fallback hardcoded como degradação aceitável até o seed rodar.

**Por que o seed não rodou:** Vercel deployments automáticos rodam `prisma migrate deploy` no build (via `vercel-build` ou similar), mas **não** rodam `prisma db seed`. O seed é um comando manual / dev-time. Não há vercel-build script atual que invoque o seed.

**Os 50 prompts que PO viu** vêm da tabela `AiInteractionLog` (logs de chamadas AI reais ao longo do tempo), populada por traffic dos usuários — **não** da tabela `PromptTemplate` ou `PromptVersion`. Existência dos 50 logs é compatível com `ModelAssignment` vazio: são tabelas independentes.

### §4.3 Severity

**P2.** O sistema **não está quebrado** — está usando os fallbacks hardcoded por design. Mas:
- Wave 3 (real-time model config) precisa do seed rodado para ser validável em Staging
- O sinal "degraded" pode preocupar uma equipe de SRE que confia em monitoramento de health endpoints
- A label "degraded" é tecnicamente correta mas pode soar mais alarmante do que é

### §4.4 Recommendation

Fix é trivial (mesmo seed que destrava F-WALK-02 fix #5):

```bash
DATABASE_URL=<staging> npx prisma db seed
```

Esse comando executa `prisma/seed.ts` que:
1. Cria/upserta usuário test (idempotente)
2. Cria/upserta 3 PromptTemplate rows
3. Cria 3 KillSwitch rows
4. Chama `seedAiGovernanceV2Defaults(db)` → 3 ModelAssignment + 13 AiRuntimeConfig

**Após seed:** health endpoint volta a retornar `{"status":"ok", "source":"database", ...}`.

**Polishing recomendado para Sprint 47:** adicionar um `vercel-build` script que invoque um seed idempotente automático em Staging (mas NÃO em Prod sem aprovação). Ou criar um `npm run seed:idempotent-only` que rode apenas `seedAiGovernanceV2Defaults` (sem upsertar usuário test) e wirar no pipeline de Staging.

---

## §5 Cross-finding analysis

### §5.1 Causa comum

**Os 3 findings convergem em uma única lacuna: configuração operacional do ambiente Staging não foi alinhada com o estado de código pós-Wave 2.** O deploy do commit `9fd8487` foi sucesso técnico (build verde, código presente), mas o ambiente runtime carrega Wave 2 **dormente**:

- Flag OFF (F-WALK-01)
- Sem entry no AdminNav (F-WALK-02)
- Banco V2 sem seed (F-WALK-03)

### §5.2 Por que não foi pegado antes

O Sprint 46 close report (§9 da minha análise anterior) mencionou "PO walk-through Staging" como pendente, mas tratou-o como ação futura — sem antecipar que a configuração do ambiente exigia 3 ações adicionais de Ops.

A retrospectiva Sprint 45 St-01 (avoid governance shortcuts) avisou explicitamente: o release note de Wave 1 (B-W1-006) já tinha a honesty flag #4 ("AdminNav not extended") — Wave 2 deveria ter fechado, e não fechou. **Esse é o tipo de cross-Wave gap que escapa quando cada item é commitado isoladamente.** Honesty flags acumuladas sem follow-up são exatamente isso: dívida visível mas sem owner.

### §5.3 Locale prefix afeta tudo

Sim — todas as rotas autenticadas exigem prefixo `/{locale}/`. PO digitou `/admin/ia` sem prefixo; o middleware deveria ter redirecionado mas com flag OFF o destino retorna 404 mesmo após o redirect. Isso é correto: `/admin` legacy também precisa de `/en/admin/...`. PO simplesmente foi sortudo com `/en/admin/prompts`.

---

## §6 Prod promotion impact

### §6.1 Veredicto: **PARTIAL VIABLE com plano de 2 fases**

Análise por categoria de commit acumulado (`cb7df47..9fd8487`, 17 commits):

| Categoria | Commits | Prod safe? | Justificativa |
|---|---|---|---|
| BUG-C iter 7/7.1/8 | `cb7df47..5aa5afb` (3) | ✅ SAFE | Auth/age-gate fixes; corrigem bug em Prod hoje |
| F-02 fix | `777c660` | ✅ **DESEJÁVEL** | Fecha exposure window MEDIUM (8 dias e contando). **Prod ASAP recomendado.** |
| C-02 EDD gates | `9ff08b5` | ✅ SAFE | Fix de exit code em CI; sem impacto runtime |
| ADR-0036 Gemini timeout | `ce223f4` | ✅ SAFE | Bridge env-override; melhora reliability AI |
| C-04 + tech debt | `f188686` | ✅ SAFE | CI hygiene |
| Wave 1 entirety | `29bd1a4..bfa2643` (8) | ✅ SAFE | Flag OFF; código dormante; zero impacto user |
| B47-MW + RBAC-CONVENTION | `8a3c486..26233e8` | ✅ SAFE | Refactor + nova convention; Wave 2 handlers existem mas não acessíveis sem flag |
| Wave 2 entirety | `732f7ac..9fd8487` (9) | ✅ SAFE em código | Mesma estratégia: flag OFF mantém Wave 2 dormante. RBAC + flag = 2 camadas de gate. |

### §6.2 Plano de 2 fases recomendado

**Fase 1 — Prod promotion AGORA (sem fix dos walk-through findings):**
- Push de todos 17 commits para Prod com flag `AI_GOVERNANCE_V2=false` (default).
- Benefício: F-02 fix fecha em Prod ASAP (vital).
- Risk surface: zero — Wave 2 fica dormante atrás de 2 gates (flag + RBAC). Nenhum usuário Prod tem `admin-ai` role.
- Pré-requisito: confirmar com finops que +9 commits de código não-acionado custam zero.

**Fase 2 — Ativação Wave 2 em Prod (depois de Sprint 46.5 fix + Staging walk-through OK):**
- Mergear fix dos 3 findings (commit AdminNav extend + i18n keys).
- Setar flag ON em Staging.
- Rodar seed em Staging.
- PO walk-through Staging completo + sign-off.
- Repetir o mesmo checklist em Prod (flag + seed).
- Wave 2 vai ao ar.

### §6.3 Por que NÃO bloquear Prod

Bloquear Prod até Wave 2 estar 100% pronta para PO em Staging significa **prolongar a janela de exposição F-02** desnecessariamente. F-02 é um fix de segurança que impacta usuários reais (under-18 sem birthDate acessando AI streaming endpoints). Os 8 dias atuais já são problema; cada dia adicional é exposição evitável.

Wave 2 dormante em Prod é tecnicamente equivalente a Wave 2 não-deployada — porque 2 gates (flag + RBAC + ausência de admin-ai users) garantem que zero usuários Prod alcançam o código.

---

## §7 Sprint 46 close impact

### §7.1 Veredicto: **READY-WITH-FOLLOWUPS**

Os 9 itens Wave 2 (B-W2-001..009) estão **funcionalmente completos** — código mergeado, tests verdes, governança per item documentada. O que falta para o close formal é:

1. **PO walk-through completo em Staging** — bloqueado pelos 3 findings; destravado por ~1.5h de fix
2. **Update da matriz de Sprint 46 status** com os 3 fixes adicionais (P1 emergente)

### §7.2 Itens a adicionar antes do close

**Bloco F (novo — emergente do walk-through):**

| ID | Item | Esforço | Owner |
|---|---|---|---|
| F-WALK-01-FIX | Setar `AI_GOVERNANCE_V2=true` em Vercel Staging + atualizar `.env.example` documentando o flag | 15 min | devops |
| F-WALK-02-FIX | Estender `AdminNav.tsx` com link `/admin/ia` (gated por flag) + i18n keys + tests | 1h | dev-fullstack-1 ou 2 |
| F-WALK-03-FIX | Rodar `npx prisma db seed` contra Staging DB; opcional: criar `npm run seed:v2-only` idempotente | 30 min | devops + dev |
| F-WALK-04-FIX (proativo) | Adicionar vercel-build step que rode `seedAiGovernanceV2Defaults` em deploys Staging (não Prod) | 1h | devops |

**Total adicional: ~3h.** Fácil em uma sessão de Sprint 46.5.

### §7.3 Sequência sugerida

```
Day 1 (Sprint 46.5):
  - F-WALK-02-FIX commit + push
  - F-WALK-01-FIX (Vercel env)
  - F-WALK-03-FIX (manual seed)
  - PO Staging walk-through #2 (completo desta vez)

Day 2:
  - Sign-off PO
  - Sprint 46 close formal
  - Prod promotion Fase 1 (todos 17 commits com flag OFF)

Day 3+:
  - Sprint 47 kickoff
  - Prod promotion Fase 2 quando PO confirmar Staging Wave 2 estável
```

---

## §8 Recommended next actions

Em ordem estrita de prioridade:

1. **(P1 — bloqueia close)** Implementar F-WALK-02-FIX: PR adicionando link em AdminNav + i18n keys + tests. Também é trivial gear por flag para que Prod com flag OFF não mostre link confuso até ativação.
2. **(P1 — segurança)** Aprovar Prod promotion Fase 1 (17 commits, flag OFF). F-02 fica em Prod ASAP fechando janela de exposição. Wave 2 fica dormante.
3. **(P2 — destrava walk-through)** Setar `AI_GOVERNANCE_V2=true` em Vercel Staging env.
4. **(P2 — destrava walk-through)** Rodar `npx prisma db seed` em Staging.
5. **(P2 — repetível)** Criar `npm run seed:v2-only` idempotente para automação futura.
6. **(P3 — polish)** Atualizar release notes B-W2-006 com URL canônica explícita + diferença vs `/admin/prompts` legacy.
7. **(P3 — Sprint 47 follow-up)** Adicionar vercel-build step que rode seed automaticamente em Staging.
8. **(P3 — retrospective)** Adicionar à retrospectiva Sprint 46: "honesty flag #4 de B-W1-006 ('AdminNav not extended') deveria ter sido fechada por Wave 2 e não foi" — exemplo de gap cross-Wave que merece protocolo de tracking de honesty flags entre Waves.

---

## §9 Self-honesty observations

### §9.1 Investigação foi suficiente?

**Sim.** As 3 root causes são deterministicamente identificáveis pelo código presente no repo + release notes pré-existentes. Nenhuma especulação foi necessária — toda evidência é citável.

### §9.2 Pontos cegos conhecidos

1. **Não confirmei diretamente o estado real do banco Staging.** Inferí da resposta do health endpoint (`degraded + fallback`) que `ModelAssignment` está vazio. Se o problema fosse outro (ex: connection string Staging para um banco diferente), o health responderia 503, não 200 — então confio na inferência. Mas confirmar via `psql` direto seria a evidência mais forte.

2. **Não verifiquei o estado real da env var `AI_GOVERNANCE_V2`** em Vercel Staging. Inferí "default false" porque `/admin/ia` retorna 404 e o código `notFound()` só é chamado quando a flag é false. Se a flag estivesse true mas a página retornasse 404 por outro motivo, minha análise estaria errada — mas o release note B-W1-006 é explícito: "Default OFF (AI_GOVERNANCE_V2 unset on Staging/Prod)".

3. **Não testei manualmente a UI Wave 2 com flag ON.** Os tests RTL provam que componentes funcionam com mocks; tests integração provam serviço funciona com mock DB; compliance test prova handlers usam HOF correto. Mas um teste manual com flag ON + DB real ainda não foi feito por ninguém. Isso é exatamente o que o walk-through pós-fix vai validar.

4. **Não verifiquei se a migration B-W1-002 RODOU em Staging.** Inferí que sim porque o health endpoint não retornou 503 (`db.modelAssignment.findMany` não lançou). Migration `prisma migrate deploy` é parte do pipeline padrão Vercel; é razoável assumir que rodou. Mas confirmar via `prisma migrate status` seria a evidência mais forte.

### §9.3 Algum padrão emergiu?

**Sim — três padrões:**

1. **Cross-Wave honesty flag tracking é zero.** B-W1-006 release note publicou honesty flag #4 ("AdminNav not extended") — a flag ficou em Markdown sem ticket, sem dono, sem deadline. Wave 2 foi planejada e fechada sem reviewer cruzando Wave 1's flags. Isso é exatamente o tipo de governança que a retrospectiva Sprint 45 St-01 prometeu evitar.

2. **Definition of Done de UI features omite "discoverability".** Tests RTL provam que componentes renderizam quando montados; não provam que existe path no UX para usuário chegar até eles. Recomendo expandir DoD: "feature must have at least one entry-point in production navigation OR be explicitly documented as direct-URL-only with rationale".

3. **Staging environment readiness é tarefa fantasma.** Há lista clara de itens Wave 2 (B-W2-001..009), mas não há checklist correspondente de "Staging deve ter flag ON, seed rodado, nav extendido". Recomendo criar uma "Wave deployment checklist" template que vire pré-requisito de qualquer "Wave close" futuro.

### §9.4 Recomendação para o PO

Antes de Sprint 47 kickoff, dedicar 30 minutos para criar:

- **Honesty Flags Registry** — arquivo `docs/qa/honesty-flags-registry.md` que coleta TODAS as honesty flags publicadas em release notes Sprint 46 (~50 flags estimadas), com colunas: ID, severity, source release-note, owner proposto, target Sprint para fechamento. Sem isso, flags continuam sendo informação publicada mas não acionável.

- **Wave deployment checklist** — template para Wave 3+ que liste explicitamente as 4-5 ações operacionais fora do código (env flags, seeds, nav links, monitoring) que precisam acontecer entre "all items merged" e "PO can walk through".

Isso fecha a categoria de bug que F-WALK-01/02/03 representam.

---

**Final state.** Branch master @ `9fd8487`. Nenhum commit feito por esta investigação. Recomendo PO ler o documento, decidir Prod Fase 1, e autorizar Sprint 46.5 fixes.
