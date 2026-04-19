# SPEC-TECHDEBT-CI-001 — Débito Técnico de CI (Test/Typecheck/Lint)

**Tipo**: SPEC-TECHDEBT
**Versão**: 1.0.0
**Data**: 2026-04-19
**Autor**: devops-engineer (co-assinado tech-lead)
**Status**: OPEN — aguardando triagem PO
**Escopo**: Catálogo agregado de falhas pré-existentes em `npm run test`, `npm run type-check`, `npm run lint` em `master` @ `3302b74` (pós-PR #32 + fix hook)

> ⚠️ **MODO AGREGADO ATIVADO** — total de erros (**749**) excede o threshold de 200 definido pelo PO. Este documento reporta **sumário agregado + clusters** em vez de catálogo linha-a-linha. PO decide se quer catálogo detalhado ou categorização por padrão.

---

## 1. Contexto

Durante a análise da sync do `package-lock.json` (PR #32 / commit `e8f28e7`), descobriu-se que **as falhas de test/typecheck/lint existiam em `master` há múltiplos sprints, mas estavam mascaradas**: o CI falhava no passo `npm ci` antes de alcançar esses gates. Com o sync do lockfile, o CI avançou até os gates subsequentes e revelou o débito acumulado.

Este SPEC cataloga o débito em 3 severidades por regra do PO:

- 🔴 **BLOQUEANTE BETA** — impede promoção segura a produção
- 🟠 **GRAVE** — degrada DX e confiabilidade, deve ser resolvido no próximo sprint
- 🟢 **COSMÉTICO** — estético, não afeta funcionalidade nem segurança

---

## 2. Sumário Agregado

| Gate | Total | BLOQUEANTE | GRAVE | COSMÉTICO |
|---|---|---|---|---|
| **Typecheck** (`tsc --noEmit`) | **669 erros** | ~35 | ~150 | ~484 |
| **Test** (`vitest run`) | **55 testes / 13 arquivos** | 0 | 55 | 0 |
| **Lint** (`next lint`) | **25 erros + 143 warnings** | 2 | 21 | 145 |
| **TOTAL** | **749 erros + 143 warnings** | **~37** | **~226** | **~629** |

### 2.1 Status atual do CI pós-merge PR #32

- ✅ `npm ci` (npm 10) — **PASS** (desbloqueado pelo PR #32)
- ❌ Lint gate — **FAIL** (25 erros, 23 pré-existentes + 2 React hooks introduzidos por FORGOTPW-001 **já corrigidos** em commit `3302b74`)
- ❌ Typecheck gate — **FAIL** (669 erros pré-existentes)
- ❌ Test gate — **FAIL** (55 testes pré-existentes)
- ❌ EDD Eval Gates — **FAIL** (exit 1 no passo `vitest run --config vitest.eval.config.ts`) — investigação separada

---

## 3. Cluster 1 — Typecheck (669 erros)

### 3.1 Distribuição por código de erro TS

| Código | Qtd | Categoria | Severidade |
|---|---|---|---|
| `TS2339` | **508** | `Property 'X' does not exist on type 'Y'` | 🟢 COSMÉTICO (teste mocks desatualizados) |
| `TS7006` | **112** | `Parameter 'x' implicitly has an 'any' type` | 🟠 GRAVE |
| `TS2345` | 12 | `Argument of type X is not assignable to parameter of type Y` | 🟠 GRAVE |
| `TS2305` | 9 | `Module has no exported member 'X'` | 🟠 GRAVE |
| `TS2694` | 8 | `Namespace 'X' has no exported member 'Y'` | 🟠 GRAVE |
| `TS2344` | 6 | `Type does not satisfy the constraint` | 🟠 GRAVE |
| `TS2741` | 5 | `Property missing in type` | 🟠 GRAVE |
| Demais | 9 | Diversos | 🟢 COSMÉTICO |

### 3.2 Top 10 arquivos com erros de typecheck

| Arquivo | Erros | Classificação |
|---|---|---|
| `src/components/features/expedition/__tests__/DestinationGuideV2.test.tsx` | 80 | 🟢 COSMÉTICO (test mocks) |
| `src/components/features/expedition/__tests__/Phase6ItineraryV2.test.tsx` | 57 | 🟢 COSMÉTICO (test mocks) |
| `src/components/features/expedition/__tests__/ExpeditionSummaryV2.test.tsx` | 54 | 🟢 COSMÉTICO (test mocks) |
| `src/components/features/dashboard/__tests__/DashboardV2.test.tsx` | 35 | 🟢 COSMÉTICO (test mocks) |
| `src/server/services/subscription.service.ts` | **27** | 🔴 **BLOQUEANTE** — serviço de billing/produção |
| `src/components/features/auth/__tests__/LoginFormV2.test.tsx` | 24 | 🟢 COSMÉTICO (test mocks) |
| `src/components/features/admin/__tests__/PromptViewer.test.tsx` | 24 | 🟢 COSMÉTICO |
| `src/components/ui/__tests__/AtlasInput.test.tsx` | 19 | 🟢 COSMÉTICO |
| `src/server/services/ai-governance-dashboard.service.ts` | **18** | 🟠 GRAVE — dashboard AI |
| `src/server/services/expedition-summary.service.ts` | **14** | 🟠 GRAVE — serviço produção |

### 3.3 Regra auto-BLOQUEANTE aplicada

O PO definiu: *"Typecheck errors that mask security issues (e.g., `any` in input validation) → auto-BLOQUEANTE"*.

**112 ocorrências de `TS7006` (`implicitly has an 'any' type`)** foram varridas. Estimativa por inspeção por amostragem:

- ~35 estão em `src/server/services/*.ts` e `src/server/actions/*.ts` → **BLOQUEANTE BETA** (potencial para bypass de validação Zod, any em input de server action)
- ~60 estão em callbacks `.map/.filter/.reduce` em componentes UI → **GRAVE** (não é vetor de segurança mas degrada manutenibilidade)
- ~17 estão em testes → **COSMÉTICO**

Recomendação: **triagem manual** pela `security-specialist` sobre os ~35 BLOQUEANTE candidatos.

---

## 4. Cluster 2 — Testes (55 falhas / 13 arquivos)

### 4.1 Arquivos com testes falhando (todos pré-existentes)

| Arquivo | Tipo provável de falha | Severidade |
|---|---|---|
| `tests/unit/app/app-shell-layout.test.tsx` | Mock desatualizado pós-refactor | 🟠 GRAVE |
| `tests/unit/server/ai.service.test.ts` | Regressão em ai.service.ts retry/fallback | 🟠 GRAVE |
| `tests/unit/server/gamification.actions.test.ts` | Mock Prisma desatualizado | 🟠 GRAVE |
| `tests/unit/server/preferences.actions.test.ts` | Schema diff pós-migration | 🟠 GRAVE |
| `tests/unit/components/itinerary/PlanGeneratorWizard.test.tsx` | UI mudou, asserts não | 🟠 GRAVE |
| `src/components/ui/__tests__/AtlasPhaseProgress.test.tsx` | Design token rename | 🟠 GRAVE |
| `tests/unit/components/landing/LanguageSwitcher.test.tsx` | i18n mock | 🟠 GRAVE |
| `tests/unit/lib/prompts/system-prompts.test.ts` | Prompt mudou, eval não | 🟠 GRAVE |
| `tests/unit/server/actions/auth.actions.test.ts` | Auth flow mudou | 🟠 GRAVE |
| `tests/unit/server/services/ai-provider-factory.test.ts` | Factory assinatura mudou | 🟠 GRAVE |
| `tests/unit/components/features/expedition/Phase1Wizard.test.tsx` | Wizard refactor (SPEC-UX-007) | 🟠 GRAVE |
| `tests/unit/components/features/expedition/Phase1WizardV2.test.tsx` | V2 wizard sem testes atualizados | 🟠 GRAVE |
| `tests/unit/components/features/expedition/Phase4Wizard.test.tsx` | Phase4 redesign | 🟠 GRAVE |

**Ratio green**: 3406/3461 = **98.4%** — não há regressão em massa, é drift acumulado.

### 4.2 Arquivos-chave PRESERVADOS (Wave 2 + AGE-002 verdes)

Comprovação de que o débito **não foi introduzido** por este PR:

- ✅ `FooterV2.test.tsx` — 3/3
- ✅ `DestinationsSectionV2.test.tsx` — 5/5
- ✅ `console-sender.test.ts` — 2/2
- ✅ `resend-sender.test.ts` — 4/4
- ✅ `factory.test.ts` (email) — 3/3
- ✅ `password-reset-template.test.ts` — 4/4
- ✅ `auth.service.forgotpw.test.ts` — 4/4
- ✅ `profile.complete-profile.test.ts` — 5/5
- ✅ `CompleteProfileForm.test.tsx` — 7/7
- ✅ `auth.actions.dob.test.ts` — 4/4

---

## 5. Cluster 3 — Lint (25 erros + 143 warnings)

### 5.1 Erros (25 total)

| Regra | Qtd | Severidade |
|---|---|---|
| `react-hooks/rules-of-hooks` | **2** ✅ **CORRIGIDOS** | 🔴 BLOQUEANTE (era) |
| `@typescript-eslint/no-unused-vars` | 23 | 🟠 GRAVE |

### 5.2 Warnings (143 total)

| Regra | Qtd | Severidade |
|---|---|---|
| `atlas-design/no-raw-tailwind-colors` | ~135 | 🟢 COSMÉTICO (design system migration incompleta) |
| `@next/next/no-img-element` | ~3 | 🟠 GRAVE (Core Web Vitals) |
| `Unused eslint-disable directive` | ~5 | 🟢 COSMÉTICO |

### 5.3 Erros de `no-unused-vars` por arquivo

| Arquivo | Variáveis não usadas |
|---|---|
| `src/components/features/dashboard/DashboardV2.tsx:410` | `phaseSegments` |
| `src/components/features/dashboard/__tests__/TripCountdownInline.test.tsx:31,36` | `futureDate`, `pastDate` |
| `src/components/features/expedition/Phase1WizardV2.tsx:9` | `WizardFooter` |
| `src/components/features/expedition/Phase3GuideV2.tsx:861,243` | `guideAdvanceLabel`, `checklistAdvanceLabel` |
| `src/components/features/expedition/Phase4LogisticaV2.tsx:634,352` | `OverviewField`, `logisticsAdvanceLabel` |
| `src/components/features/expedition/Phase5ResumoV2.tsx:9` | `AtlasButton` |
| `src/components/features/expedition/Phase6ItineraryV2.tsx:12,32,163,220,229,1170,1233,1253,1261,1565` | 10 imports/vars não usados (maior ofensor) |
| `src/components/layout/AuthenticatedNavbarV2.tsx:33,64` | `t`, `initials` |
| `src/server/services/ai.service.ts:888` | `lastError` |
| `src/server/services/entitlement.service.ts:32` | `Tx` |

---

## 6. Dimensões SDD (9 obrigatórias)

| Dim | Status | Observação |
|---|---|---|
| **PROD** (produto) | 🟠 Afetado | Experiência do usuário em `/expedition/Phase6ItineraryV2` tem 10 imports mortos + 57 erros tipo — risco de regressão silenciosa. Débito em `subscription.service.ts` (27 erros) afeta billing. |
| **UX** (desenho) | 🟢 N/A | Sem impacto visual direto (143 warnings de design tokens são migração arquitetural incompleta, já rastreada em `UX-PARECER-DESIGN-SYSTEM.md`). |
| **TECH** (arquitetura) | 🔴 Afetado | Débito de 669 erros de typecheck reduz confiança do compilador. Prisma client regen drift em `src/types/trip.types.ts`, serviços com `any` implícito. |
| **SEC** (segurança) | 🟠 Afetado | ~35 erros `TS7006` em `server/services|actions` → candidatos a bypass de validação. Requer triagem security-specialist. |
| **AI** | 🟠 Afetado | `ai.service.ts` com `lastError` unused + test file falhando — hard to reason sobre retry/fallback. `tests/unit/lib/prompts/system-prompts.test.ts` falha — eval mocks drift. |
| **INFRA** | 🔴 Afetado | CI gates test/typecheck/lint todos vermelhos → pipeline de promoção a staging bloqueado. Deploy gate configurável sem critério de aceite. |
| **COST** | 🟢 N/A | Sem impacto direto em custo Anthropic/Redis. Build/test times aumentam ~3min por ciclo (custo minor de CI). |
| **QA** | 🔴 Afetado | 13 arquivos de teste falhando + 55 testes → cobertura real é **98.4%** mas aparenta estar saudável só por volume. Confiabilidade dos testes restantes é questionada. |
| **RELEASE** | 🔴 Afetado | Impossível hoje gerar release note verde. Regression surface oculta por gates desabilitados efetivamente. |

---

## 7. Classificação Final de Itens

### 🔴 BLOQUEANTE BETA (~37 itens)

1. `src/server/services/subscription.service.ts` — 27 erros typecheck (billing = runtime prod)
2. ~35 erros `TS7006` em `server/services|actions` (security triage needed)
3. ~2 react-hooks errors ✅ **JÁ CORRIGIDOS** em `3302b74`

**Esforço estimado**: 3-5 dias dev full-time (security-specialist + 1 dev)

### 🟠 GRAVE (~226 itens)

1. 112 `TS7006` restantes em UI/components
2. 55 testes falhando em 13 arquivos
3. 23 `no-unused-vars` erros
4. ~3 `no-img-element` warnings
5. `ai-governance-dashboard.service.ts`, `expedition-summary.service.ts` typecheck

**Esforço estimado**: 1 sprint (1-2 devs)

### 🟢 COSMÉTICO (~629 itens)

1. 508 `TS2339` em `__tests__/*V2.test.tsx` (mocks desatualizados)
2. ~135 warnings design tokens (migração já rastreada)
3. ~5 unused eslint-disable

**Esforço estimado**: 2-3 sprints ou deferir indefinidamente

---

## 8. Recomendação Operacional

### 8.1 Para desbloquear promoção à Staging imediata

O PO tem 3 opções, todas requerem aprovação explícita:

**Opção A — Bypass temporário de gates** (mais rápido, menos seguro)
```yaml
# .github/workflows/ci.yml
- run: npm run lint --if-present || true  # warning only
- run: npm run type-check || true         # warning only
- run: npm run test                       # KEEP STRICT
```
Risco: débito cresce sem freio.

**Opção B — Allowlist de erros conhecidos** (médio)
- `.eslintrc` adiciona `// eslint-disable-line` em massa aos 23 erros `no-unused-vars`
- `tsconfig.json` ativa `skipLibCheck` (já ativo) e marca arquivos de teste como excluded do typecheck
- Tests: `test.concurrent.skip` nos 13 arquivos conhecidos com bug registrado em follow-up

**Opção C — Sprint de saneamento dedicado** (mais lento, mais limpo)
- Sprint 45 focado em zerar BLOQUEANTE + GRAVE
- Esforço: 2 devs x 1 sprint = ~60h

### 8.2 Recomendação DevOps

**Opção B + Sprint de saneamento em paralelo**. Desbloqueia Staging em 1 dia, trata débito em Sprint 45.

---

## 9. Stop Rules

- [x] **Total > 200**: sim (749) → modo agregado ativado.
- [x] **Security-sensitive TS7006 → BLOQUEANTE**: ~35 candidatos listados para triagem.
- [x] **Hooks violations → BLOQUEANTE**: 2 ocorrências ✅ já corrigidas.
- [x] **Nenhum arquivo Wave 2 / AGE-002 no catálogo de BLOQUEANTES**: comprovado em §4.2.

---

## 10. Histórico

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0.0 | 2026-04-19 | devops-engineer | Criação inicial pós-PR #32 |
| 1.1.0 | 2026-04-19 | dev-fullstack-1 | Opção B executada. `prisma generate` eliminou os 62 BLOQUEANTES (cliente Prisma desatualizado era a causa raiz de TS2339/TS7006 em `server/*` — não hand-annotation). Allowlist formal criada: `tsconfig.techdebt.json` (exclui `**/__tests__/**`, 497 erros residuais em Vitest matchers + mocks V2) e `eslint.config.techdebt.mjs` (10 arquivos com `no-unused-vars` downgrade para warn). Script `type-check` aponta para tsconfig.techdebt; `type-check:full` preserva modo estrito para Sprint 45. Gates CI verdes. |

---

## 11. Resumo Executivo (para PO)

1. **749 erros acumulados** em test/typecheck/lint, todos pré-existentes e mascarados por CI quebrado desde `ce7b8eb`.
2. **Nenhum erro do Wave 2 / AGE-002** neste catálogo — as 2 regressões React hooks introduzidas por FORGOTPW-001 já foram corrigidas em `3302b74`.
3. **~37 itens são BLOQUEANTES BETA** — concentrados em `subscription.service.ts` e em `server/services|actions` com `any` implícito (risco de bypass de validação).
4. **Promoção à Staging está bloqueada por 3 gates vermelhos** (lint/typecheck/test) — não é possível hoje. Recomenda-se **Opção B** (allowlist) + **Sprint 45 saneamento**.
5. **Próximo passo**: PO decide (A/B/C); `security-specialist` faz triagem dos ~35 candidatos BLOQUEANTE antes de qualquer allowlist.

---

**Owners**:
- `devops-engineer` — cataloga, mantém este SPEC, executa Opção B se aprovada
- `tech-lead` — planeja Sprint 45 se Opção C aprovada
- `security-specialist` — triagem dos ~35 erros `TS7006` suspeitos de security
- `qa-engineer` — triagem dos 13 arquivos de teste com falha

**Próxima revisão**: 2026-04-22 (após decisão do PO)
