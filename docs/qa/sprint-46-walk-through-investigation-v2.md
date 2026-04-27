# Walk-through Investigation Report v2 — 27/abr/2026

**Author:** dev-fullstack-1 (autonomous re-investigation mode)
**Trigger:** PO verificação manual em Vercel + Neon Console invalidou inferências da v1 (`docs/qa/sprint-46-walk-through-investigation.md` @ commit `9717506`).
**Branch state:** `master` @ `9717506`
**Supersedes:** v1 (não substitui — evolui; ambos commits permanecem para audit trail).

---

## §1 Executive summary

Re-investigação com dados confirmados pelo PO + análise técnica adicional revela o seguinte:

1. **A verificação do PO usou queries SQL com case-mismatch:** procurou tabelas pelos nomes Prisma PascalCase (`PromptTemplate`, `ModelAssignment`, etc.), mas as tabelas reais em Postgres são snake_case (`prompt_templates`, `model_assignments`, etc.) via `@@map(...)` em `prisma/schema.prisma`. A query retornou 0 rows não porque as tabelas não existem, mas porque os nomes não correspondem.
2. **Evidência forte que migration B-W1-002 RODOU em Staging:** `/api/health/ai-config` retornou status 200 com `degraded + fallback`. Esse caminho só é alcançado quando `db.modelAssignment.findMany()` SUCCEEDS e retorna 0 rows. Se a tabela `model_assignments` não existisse, Prisma lançaria e o handler retornaria 503 (catch path). PO observou 200, não 503 → **table exists, just empty**.
3. **Confirmado: env var `AI_GOVERNANCE_V2` não está em Vercel Staging** — diferente de "OFF default". Quando a env var é absent, o schema (`@t3-oss/env-nextjs`) aplica o default `"false"`. Funcionalmente equivalente ao OFF, mas semanticamente pior: o flag nunca foi explicitamente configurado, sem auditoria de "decidido OFF" vs "esquecido".
4. **Confirmado: Vercel build NÃO roda `prisma migrate deploy`.** O script `prebuild` é só `prisma generate` (client codegen). Migrations precisam ser executadas manualmente — historicamente isso aconteceu para Staging via algum mecanismo não documentado neste repo (provavelmente CLI manual). Esta é a causa sistêmica raiz dos 3 findings da v1.

**Recomendação:** Sprint 46.5 fix bundle de 8 itens (~3-5h Claude Code + 30-60 min PO actions) destrava walk-through e Sprint 46 close. Tensão BLOCKED vs P2 reconcilia via Interpretação A (caso específico vs padrão sistêmico).

---

## §2 Inferências corrigidas vs investigation v1

| v1 afirmou | v2 corrige | Implicação |
|---|---|---|
| "Migration B-W1-002 rodou em Staging" (correta!) | **MANTÉM**. Evidência reforçada: health endpoint retorna 200 degraded, não 503. PO query case-mismatch foi a fonte de confusão. | v1 estava certa; explicação precisava ser mais clara. |
| "Seed B-W1-003 não rodou" (correta!) | **MANTÉM**. `model_assignments.length === 0` consistente com seed não executado. | v1 estava certa. |
| "Flag OFF (default false)" | **PRECISÃO**: env var **ausente** em Vercel; aplicação cai no default `"false"` do schema Zod. | Implicação prática igual; processualmente pior — sem decisão explícita registrada. |
| "Health degraded é por design quando tabela vazia" | **MANTÉM**. Confirmado pelo código `health/ai-config/route.ts:55`. | v1 estava certa. |
| "PO no `/admin/prompts` legacy mostra 50 PromptTemplate rows" | **CORREÇÃO**: 50 vem de `ai_interaction_logs` (AiInteractionLog) via `getAiInteractionsAction({limit:50})`. NÃO são PromptTemplate rows. | v1 errou o nome da tabela legacy; conclusão (PO em página errada) ainda válida. |

### §2.1 PO query case-sensitivity foi o artefato chave

```sql
-- PO query (case-sensitive em Postgres):
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('PromptTemplate', 'PromptVersion', 'ModelAssignment', 'AiRuntimeConfig', 'AuditLog');
-- → 0 rows (tabelas não existem com esses nomes)

-- Query correta:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prompt_templates', 'prompt_versions', 'model_assignments', 'ai_runtime_configs', 'audit_logs');
-- → expected: 5 rows (todas as 5 tabelas)
```

Postgres folds unquoted identifiers to lowercase; PO usou aspas duplas `"ModelAssignment"` que preservam case → erro `relation does not exist`. Os nomes reais vêm de `@@map(...)` em cada model:

```prisma
model PromptTemplate { ... @@map("prompt_templates") }
model PromptVersion  { ... @@map("prompt_versions") }
model ModelAssignment { ... @@map("model_assignments") }
model AiRuntimeConfig { ... @@map("ai_runtime_configs") }
model AuditLog { ... @@map("audit_logs") }
```

**Recomendação imediata:** PO re-roda Query A com nomes lowercase para confirmar definitivamente.

---

## §3 Root cause real (transversal)

**Sprint 46 entregou código Wave 2 corretamente, mas o pipeline operacional para tornar Wave 2 utilizável em ambientes (Staging/Prod) tem 3 lacunas independentes:**

1. **Migration deploy é manual** — `package.json` não tem `vercel-build` que invoque `prisma migrate deploy`; script `prebuild` faz apenas `prisma generate`. Não há `vercel.json` configurando override.
2. **Env var management é manual** — `.env.example` deveria documentar `AI_GOVERNANCE_V2`; não vi isso confirmado e Vercel Staging não tem a var setada.
3. **Seed deploy é manual** — `db:seed` só roda quando alguém executa explicitamente; não há hook automático.

Tudo isso é **decisão de arquitetura defensível** (ops humanos auditados são mais seguros que automation), MAS exige **checklist explícito por Wave** para que devs/PO não esqueçam. Esse checklist não existia, e foi onde o gap apareceu.

---

## §4 Por que migration B-W1-002 não foi automaticamente aplicada em Staging

### §4.1 Vercel build command analysis

`package.json` scripts relevantes:
```json
{
  "prebuild": "prisma generate",
  "build": "cross-env NODE_OPTIONS=--max-old-space-size=3072 next build",
  "db:migrate:deploy": "prisma migrate deploy"
}
```

- `prebuild` faz apenas `prisma generate` (codegen do Prisma Client) — **não toca o banco**.
- `db:migrate:deploy` existe mas **não está no pipeline de build**.
- Não há `vercel.json` (verificado: arquivo não existe).
- Não há `postinstall` hook.

### §4.2 Implicação

Quando Vercel deploy roda em Staging:
1. `npm install` (instala deps)
2. `prisma generate` (gera client)
3. `next build` (compila código)
4. **Banco NUNCA é tocado por este pipeline.**

Para que a migration efetivamente rode em Staging, alguém precisa fazer manualmente uma das opções:
- **Opção A**: Conectar localmente com `DATABASE_URL=<staging>` e rodar `npx prisma migrate deploy`.
- **Opção B**: Conectar via Neon Console / SQL Editor e executar o conteúdo de `prisma/migrations/20260424120000_ai_governance_v2/migration.sql` manualmente.
- **Opção C**: Adicionar ao `vercel-build` ou `build` (decisão arquitetural — convém esperar Sprint 47).

### §4.3 Mas health endpoint sugere migration RODOU

Como reconciliar §4.1 (sem hook automático) com §1 (evidência que migration rodou)?

**Provável**: alguém (devops ou dev) rodou `prisma migrate deploy` manualmente contra Staging em algum momento entre B-W1-002 (commit `452ec7d`, Day 2) e o walk-through. Sem documentação no repo, mas o efeito está lá.

**Inconcluído**: confirmar quem/quando. Ação recomendada: adicionar ao runbook que toda migration tem que ser registrada em `docs/devops/staging-migration-log.md` quando aplicada.

### §4.4 Gap identificado

**Não há processo formal para aplicar migrations em Staging/Prod.** Aconteceu desta vez por iniciativa manual; pode não acontecer da próxima. Sprint 46.5 deve estabelecer **pelo menos uma das**:
- Runbook documentado: "para deploy de feature que envolve migration, fazer X antes de merge".
- Hook automático (`vercel-build`): trade-off entre conveniência e risco de migration não-revertida.
- CI step: GitHub Actions roda migrate em Staging após merge passar.

---

## §5 Por que `AI_GOVERNANCE_V2` não está em Vercel

### §5.1 Process gap

Adicionado ao schema em B-W1-001 (`29bd1a4`, Sprint 46 Day 2). Release notes B-W1-001 menciona setup mas não confirma execução em Vercel.

`.env.example` não foi verificado nesta sessão; recomendação: confirmar que documenta `AI_GOVERNANCE_V2` e adicionar nota explícita "Set in Vercel for each environment as deploy gating step".

**Lição:** adicionar uma flag ao schema é necessário mas insuficiente — env vars em Vercel são manuais, e PR/release-notes não disparam ação ops.

---

## §6 50 prompts anomalia — confirmado legacy

### §6.1 Source confirmed

Trace técnico:
- PO acessou `/en/admin/prompts`
- Renderiza `src/app/[locale]/(app)/admin/prompts/page.tsx`
- Page chama `getAiInteractionsAction({ limit: 50 })` em `src/server/actions/admin.actions.ts`
- Action faz `db.aiInteractionLog.findMany(...)` — table `ai_interaction_logs` (legacy, criada em sprints anteriores)
- Componente renderiza `<PromptViewer>` que mostra log read-only com botões "Copy"

**Os "50 prompts" são logs de interação AI (uma row por chamada AI feita pelo sistema)**, não rows de `prompt_templates`. Naming confuso, mas tecnicamente corretas: cada AiInteractionLog inclui `templateSystemPrompt` e `templateUserPrompt` snapshotados na hora da chamada.

### §6.2 Recomendação

- **Curto prazo (Sprint 46.5)**: Atualizar B-W2-006 release notes documentando explicitamente: `/admin/prompts` é viewer read-only de AI logs (legacy, Sprint 7-8); `/admin/ia?tab=prompts` é o editor V2.
- **Médio prazo (Sprint 47)**: Renomear página legacy para `/admin/ai-logs` ou `/admin/interactions` para eliminar ambiguidade. Manter redirect 301 de `/admin/prompts` por 1 sprint para compat.
- **Longo prazo (Wave 4)**: Curadoria de outputs (Wave 4 V2) substitui o uso atual; legacy `/admin/prompts` pode ser deprecated.

---

## §7 Sprint 46.5 fix bundle ajustado (8 itens)

### F-OPS-01 — Configurar `AI_GOVERNANCE_V2` em Vercel Staging
- **Owner:** PO (Vercel dashboard) ou devops
- **Esforço:** ~5 min
- **Action:** Vercel → travel-planner-staging → Settings → Environment Variables → Add
  - Name: `AI_GOVERNANCE_V2`
  - Value: `true`
  - Environment: `Preview` (Staging usa Preview branch)
- **Pós-action:** próxima request lê o valor; sem deploy necessário (next-intl + env barrel re-leem em runtime).

### F-OPS-02 — Verificar (não re-rodar) migration B-W1-002 em Staging
- **Owner:** PO (Neon Console) ou Claude Code se receber `DATABASE_URL` Staging
- **Esforço:** ~10 min
- **Action:** PO roda no Neon SQL Editor:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('prompt_versions', 'model_assignments', 'ai_runtime_configs', 'audit_logs');
  ```
- **Resultado esperado:** 4 rows (V2 created tables; `prompt_templates` já existia antes da V2 mas tem alterações).
- **Se 0 rows:** rodar `npx prisma migrate deploy` manualmente contra Staging.
- **Se 4 rows:** seguir para F-OPS-03.

### F-OPS-03 — Rodar seed `seedAiGovernanceV2Defaults` em Staging
- **Owner:** PO ou devops
- **Esforço:** ~10 min
- **Action:**
  ```bash
  DATABASE_URL=<staging-connection-string> npx prisma db seed
  ```
- **Risco:** seed atual (`prisma/seed.ts`) também cria/upserta usuário test (`test@test.com`). Aceitável em Staging? Confirmar.
- **Mitigação opcional:** criar `npm run seed:v2-only` que rode apenas `seedAiGovernanceV2Defaults`. Faz parte de F-OPS-04 abaixo.
- **Pós-action:** health endpoint deve retornar `{"status":"ok", "source":"database", phases:[...3 entries]}`.

### F-OPS-04 — Criar script `seed:v2-only` idempotente (opcional, mas recomendado)
- **Owner:** dev-fullstack-1 (Claude Code)
- **Esforço:** ~30 min
- **Files:**
  - `prisma/seed-v2-only.ts` — invoca apenas `seedAiGovernanceV2Defaults(db)`
  - `package.json` — `"seed:v2-only": "node --experimental-strip-types prisma/seed-v2-only.ts"`
- **Justificativa:** Prod seed precisa ser cirúrgico (não criar test user em Prod). Wave 3 também vai precisar disso.

### F-FIX-05 — Estender `AdminNav.tsx` com link para `/admin/ia`
- **Owner:** dev-fullstack-1 ou 2 (Claude Code)
- **Esforço:** ~1h (governança full)
- **Files:**
  - `src/app/[locale]/(app)/admin/AdminNav.tsx` — adicionar entry, gear por `isAiGovernanceV2Enabled()` (link só aparece com flag ON)
  - `messages/en.json` + `messages/pt-BR.json` — `navAi` key
  - `src/app/[locale]/(app)/admin/__tests__/AdminNav.test.tsx` (se existir; senão criar) — testar link visível com flag ON e oculto com OFF
- **Honesty flag #4 de B-W1-006 será fechada formalmente**.

### F-OPS-06 — Wave Close → Staging Ready checklist (NEW PROCESS)
- **Owner:** dev-fullstack-1 + PO review
- **Esforço:** ~45 min
- **File:** `docs/qa/wave-close-staging-readiness.md`
- **Conteúdo:**
  ```markdown
  # Wave Close → Staging Ready Checklist
  
  Toda Wave de qualquer release que envolva mudanças em DB ou flags
  novos DEVE passar este checklist ANTES de declarar close formal.
  
  ## Pre-merge
  - [ ] Migration commitada em prisma/migrations/
  - [ ] Seed (se necessário) commitado em prisma/seed*.ts
  - [ ] Env vars novas documentadas em .env.example
  - [ ] Release notes listam env vars que precisam ser configuradas
  
  ## Pre-walk-through
  - [ ] Migration aplicada em Staging via `npx prisma migrate deploy`
  - [ ] Seed (ou `seed:v2-only`) executado contra Staging
  - [ ] Env vars setadas no Vercel Staging (Preview environment)
  - [ ] AdminNav (ou nav equivalente) atualizada com link para nova feature
  - [ ] Smoke test manual: rota acessível pelo URL, com feature flag ON, retorna conteúdo
  
  ## Walk-through gate
  - [ ] PO consegue navegar do dashboard admin até a nova feature sem precisar saber URL
  - [ ] Feature renderiza com flag ON; some com flag OFF
  - [ ] Mudanças saem na próxima request (não exigem redeploy)
  
  ## Pre-prod
  - [ ] Walk-through OK em Staging
  - [ ] Migration aplicada em Prod (mesma sequência)
  - [ ] Env vars setadas em Vercel Production
  - [ ] Seed-v2-only executado em Prod (NÃO seed dev — não criar test user)
  - [ ] Smoke test em Prod com flag OFF: nada quebra
  - [ ] Smoke test em Prod com flag ON (apenas para admin sem usuários reais): renderiza
  ```

### F-RETRO-07 — Adicionar padrão "shipping vapor" à retrospectiva Sprint 46
- **Owner:** PO (durante retrospective)
- **Esforço:** ~15 min
- **File:** `docs/sprint-reviews/sprint-46-retrospective.md` (a ser criado pelo PO no close)
- **Item Stop:** "Stop declaring Wave close based only on commits/tests passing; require Staging walk-through proof per `wave-close-staging-readiness.md`."

### F-S47-08 — Sprint 47 backlog: 2 process items
- **Owner:** PO + tech-lead
- **Esforço:** ~20 min adicionar ao backlog
- **Items:**
  - `B47-FLAGS-REGISTRY` (S) — criar `docs/qa/honesty-flags-registry.md` consolidando todas as flags publicadas em release notes Sprint 46+ com colunas: ID, severity, source, owner, target sprint
  - `B47-UI-DOD-DISCOVER` (S) — adicionar "discoverability" como Definition of Done de UI items: feature deve ter pelo menos 1 entry-point em production navigation OU ser explicitamente documentada como direct-URL-only com rationale

### Total Sprint 46.5

| Categoria | Itens | Esforço |
|---|---|---|
| Ops manuais (PO/devops) | F-OPS-01, F-OPS-02, F-OPS-03 | ~25 min |
| Code (Claude Code) | F-OPS-04, F-FIX-05 | ~1.5h |
| Process docs | F-OPS-06, F-RETRO-07, F-S47-08 | ~1h |
| **Total** | **8 itens** | **~3h Claude Code + ~25 min PO** |

---

## §8 Reconciliação tensão BLOCKED vs P2

PO declarou:
- **Sprint 46 close: BLOCKED** (severo, específico)
- **Padrão "shipping vapor": P2** (médio, sistêmico)

### §8.1 Análise de consistência

À primeira vista parece inconsistente — se o caso é severo (BLOCKED), por que o padrão seria médio?

### §8.2 Interpretação A (proposta canônica)

**As duas decisões operam em camadas diferentes e são internamente consistentes:**

| Camada | Severidade | Justificativa |
|---|---|---|
| **Caso atual** (Wave 1+2 não funcional em Staging) | BLOCKED | Concreto, sem ambiguidade — ou Wave 2 funciona em Staging com walk-through OK, ou não fechamos. Gate binário. |
| **Padrão sistêmico** (deploy ops gap) | P2 | Não justifica freeze de novas features Sprint 47+. Resolvível via processo (checklist + retrospective + backlog items) sem código adicional crítico. |

A interpretação é: **resolva ESTE caso para fechar Sprint 46, e em paralelo evolua o processo para que o próximo Wave Close não repita o problema**. Sprint 47 features podem prosseguir normalmente — o checklist de F-OPS-06 vira pré-requisito DELES também, mas não bloqueia o início.

### §8.3 Interpretação B (alternativa)

Inconsistência genuína. PO escolhe um:
- **Tudo P1**: Sprint 47 abre com Bloco zero "deploy/ops gap full remediation" + freeze de novas features até processo automático.
- **Tudo P2**: close mesmo com BLOCKED-flag declarativo + Sprint 47 absorve casos específicos como tickets normais.

Claude Code não consegue determinar entre A e B sem PO.

### §8.4 Recomendação

**Adotar Interpretação A como canônica.** Razões:
1. Permite Sprint 46 fechar quando o caso específico estiver resolvido (sem espera por overhaul de processo).
2. Trata a dívida de processo no Sprint 47 com items proporcionais (B47-FLAGS-REGISTRY + B47-UI-DOD-DISCOVER + check-list adoption).
3. Não desperdiça o aprendizado: retrospective documenta + checklist evita recorrência.

PO confirma A ou prefere B?

---

## §9 Sprint 46 close status revisado

### §9.1 Veredicto: **BLOCKED**

Critérios explícitos para unblock:
- [ ] **Migration verificada** em Staging via query lowercase (F-OPS-02). Se faltando, aplicar.
- [ ] **Env var `AI_GOVERNANCE_V2=true`** setada em Vercel Staging Preview (F-OPS-01).
- [ ] **Seed V2 executado** em Staging — `model_assignments` com 3 rows + `ai_runtime_configs` com 13 rows (F-OPS-03).
- [ ] **AdminNav extendida** — link `/admin/ia` visível em `/{locale}/admin/dashboard` para admin role (F-FIX-05).
- [ ] **Walk-through #2** — PO navega do admin shell até `/admin/ia`, abre tab Prompts, vê PromptsTab + PromptEditor, cria um template draft, edita, salva, vê audit log no DB (manual SQL); valida V-XX gate com prompt inválido.
- [ ] **Health endpoint volta** a `{"status":"ok","source":"database",...}` (F-OPS-03 confirmation).
- [ ] **`docs/qa/wave-close-staging-readiness.md` commitado** (F-OPS-06).
- [ ] **Sprint 47 backlog atualizado** com B47-FLAGS-REGISTRY + B47-UI-DOD-DISCOVER (F-S47-08).

Quando todos checked → Sprint 46 close formal libera.

### §9.2 Sprint 46.5 = fechamento operacional, não novo sprint

Posicionar Sprint 46.5 como **continuation** de Sprint 46, não Sprint próprio:
- Mesma branch, mesmos owners, mesmos itens trackeados
- Sprint 47 só abre quando Sprint 46.5 fechar
- Métrica de Sprint 46 ajustada: "started 2026-04-24, originally targeted close 2026-04-26, actual close pending Sprint 46.5 fix bundle (estimate 2026-04-28)."

### §9.3 Decisões PO necessárias

Antes de Sprint 46.5 começar:
1. Confirmar Interpretação A (§8.4)
2. Aprovar Sprint 46.5 fix bundle (8 itens, ~3h+25min)
3. Decidir se F-OPS-04 (`seed:v2-only`) é Sprint 46.5 ou Sprint 47
4. Decidir owner de F-OPS-02 (PO via Neon ou Claude Code via CLI com connection string passada)

---

## §10 Plano Prod promotion revisado

A v1 propôs "Fase 1 promover Prod com flag OFF" assumindo que código Wave 2 ficaria dormante e tudo bem. Com dados v2, o plano precisa ajuste:

### §10.1 Por que v1 não funciona

V2 migration **adicionou colunas a `prompt_templates`** (status, activeVersionId, createdById, approvedById, approvedAt). Se Prod **não rodou** a V2 migration, então:
- Prisma Client gerado a partir do schema atual ESPERA essas colunas
- `db.promptTemplate.findMany()` (sem `select` específico) gera SELECT que inclui essas colunas
- Se as colunas não existem em Prod, **todas** as queries em PromptTemplate quebram em runtime — **inclusive o legacy `/admin/ai-governance`** que usa `AiGovernanceDashboardService.getPromptTemplates()`.

Portanto, **promover Prod sem aplicar a migration primeiro pode quebrar a página admin existente em Prod**, mesmo com flag OFF.

### §10.2 Plano revisado — 4 fases

**Fase 0 (NOVA, OBRIGATÓRIA)** — Estabelecer processo de migration deploy em Prod:
- Verificar estado real do schema Prod via Neon Console (mesma query lowercase de F-OPS-02 mas contra Prod branch)
- Se V2 migration não aplicada em Prod → aplicar manualmente OU adicionar ao build hook
- Se V2 migration aplicada → confirmar e seguir
- Documentar processo em `docs/devops/prod-migration-runbook.md`

**Fase 1** — Sprint 46.5 completo em Staging (§9 critérios todos checked).

**Fase 2** — Walk-through #2 PO em Staging com sign-off.

**Fase 3** — Prod promotion controlada:
- Aplicar V2 migration em Prod (Fase 0 prereq satisfeito)
- Setar env vars em Vercel Prod: `AI_GOVERNANCE_V2=false` ou `=true` (PO decide; recomendação: `false` inicialmente, ativar depois de mais validação)
- Seed V2 em Prod (apenas `seedAiGovernanceV2Defaults`, nunca `prisma/seed.ts` completo)
- Push de todos 17+ commits acumulados
- Smoke test em Prod com flag OFF: tudo continua funcionando (admin existente, AI streaming, etc.)
- Em janela controlada (off-peak): flip flag para `true` em Prod, verificar admin nav extension renderiza, walk-through Prod (1 admin user), depois decidir se mantém ON ou volta para OFF.

### §10.3 Beneficio do plano revisado

- **F-02 fix vai a Prod assim que Fase 0+3 acontecerem** — janela de exposição fecha (currently ~9 dias).
- **BUG-C iter 7/7.1/8** também vai a Prod (corrige bug ativo).
- **Wave 1+2 código** vai a Prod com flag estado controlado.
- Risco residual: queryability surgir bug em Prod com V2 columns presentes; mitigado por smoke test pré-flip.

---

## §11 Self-honesty observations

### §11.1 Inferências erradas da v1

A v1 chegou a conclusões *direcionalmente* corretas mas com **base de evidência mais fraca do que precisava**. Especificamente:
- v1 não conferiu o `@@map(...)` em cada model — assumi nomes Prisma seriam usados. Quando PO trouxe a verificação manual com queries em PascalCase retornando vazio, tive a oportunidade de questionar a query mas inicialmente aceitei "não rodou". **A descoberta correta foi acionada pela re-investigação.**
- v1 disse "flag OFF" sem checar Vercel diretamente. Não distinguir entre "configurado OFF" e "ausente" perdeu nuance importante para o processo.

### §11.2 Valor da PO verificação factual

A PO **não aceitou** a investigação v1 cegamente — fez sua própria verificação, encontrou achados que aparentavam contradição, e exigiu re-investigação. Isso é **exatamente o protocolo certo** quando a investigação é canônica para decisão de release.

Na v1 escrevi (§9.2): "4 known blind spots documented... all inferable from observed behavior but not confirmed via direct introspection." A PO transformou esses blind spots em luz, e a v2 está mais sólida. Recomendo manter esse padrão: **investigações que precedem decisões de release devem ter PO factual verification step antes de serem considerados final**.

### §11.3 Padrões emergentes (refinamento dos da v1)

Confirmados/refinados:

1. **Cross-Wave honesty flag tracking sem owner ativo** (idem v1): B-W1-006 honesty flag #4 ainda ressoa como cause-célèbre.
2. **DoD UI omite discoverability** (idem v1): mantido.
3. **Staging readiness é tarefa fantasma** (idem v1): mantido.
4. **(NOVO) Verificação factual antes de release decisions é essencial**: investigações inferenciais sobre estado de ambiente são sujeitas a artefatos (case-sensitivity SQL, env var ausente vs default, etc.).
5. **(NOVO) Ops gap = code shipping ≠ feature shipping**: Sprint 46 entregou código Wave 2 100%, mas feature Wave 2 não chegou a usuário (nem mesmo admin/PO). Métricas Sprint precisam separar "code merged" de "feature usable in environment".

### §11.4 Algo que ainda não consegui investigar

- **Estado real do Vercel Production env vars** — só investiguei via prints PO em Staging.
- **Estado real do schema Prod DB** — depende de PO acessar Neon Production branch.
- **Quem rodou a migration em Staging** (se rodou) — sem audit trail no repo, é uma incógnita histórica não recuperável sem checagem do Neon migration log.

Recomendo PO incluir essas checagens nas mesmas sessões de Sprint 46.5.

---

## §12 Recommendations for next steps

Em ordem de prioridade:

1. **(NOW)** PO confirma Interpretação A da §8 (caso BLOCKED + padrão P2) ou pede B.
2. **(NOW)** PO re-roda Query A no Neon Staging com nomes lowercase para confirmar tables exist (F-OPS-02 verification).
3. **(BLOCKING Sprint 46 close)** Sprint 46.5 fix bundle execution — ordem sugerida:
   1. F-OPS-01 (5 min) — destrava §9 walk-through
   2. F-OPS-02 verification (10 min) — confirma estado migration
   3. F-OPS-03 (10 min) — popula seed V2
   4. F-FIX-05 (1h) — adiciona AdminNav link, commit + push
   5. F-OPS-04 (30 min, opcional) — `seed:v2-only` script
   6. F-OPS-06 (45 min) — checklist documento
   7. PO walk-through #2
   8. F-S47-08 (20 min) — Sprint 47 backlog
   9. F-RETRO-07 — durante retrospective (futuro)
4. **(POST Sprint 46 close)** Plano Prod promotion 4 fases — requer Fase 0 manual (estado Prod migration), depois execução controlada.
5. **(Sprint 47)** Process improvements: B47-FLAGS-REGISTRY + B47-UI-DOD-DISCOVER + adoption do checklist por padrão.

---

**Final state.** Branch `master` @ `9717506` (v1 commit). Esta v2 não modifica código. Recomendo PO ler, confirmar Interpretação A, e autorizar Sprint 46.5 fix bundle.
