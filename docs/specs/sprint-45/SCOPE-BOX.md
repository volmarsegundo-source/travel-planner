# SPEC-SPRINT-45-FASE-1 — Scope Box: Saneamento Técnico

**Date:** 2026-04-20
**Owner:** qa-engineer (impersonated)
**Related specs:** SPEC-TECHDEBT-CI-001, SPEC-AUTH-FORGOTPW-003, SPEC-SEC-XFF-001 (proposed), SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001 (proposed)
**Phase:** 1 (Diagnóstico) — **Fase 2 (Execução) pendente de aprovação explícita do PO**

---

## 🎯 TL;DR (PO-facing, 6 linhas)

1. **Total atual de erros: 712** (TS 497 + Lint 164 + Vitest 51 testes em 9 arquivos) — dentro da faixa segura [500, 1000]. **Sem STOP.**
2. **Uma única mudança fixa 485/497 erros de TypeScript** — migrar `tests/setup.ts` de `@testing-library/jest-dom` para `@testing-library/jest-dom/vitest`. **Maior ROI do saneamento.**
3. **Wave 1 (segurança):** ~5h. Inclui fix XFF (2 sites bugados, 35 min), fail-closed opt-in para 7 rotas sensíveis (45 min), 1 teste flaky (app-shell-layout timeout).
4. **Wave 2 (qualidade):** ~16h. 485 TS errors (1 fix), 51 testes quebrados em 9 arquivos (mocks V2 drift), 24 unused-vars downgradados.
5. **Wave 3 (cosmético):** ~12h. 135 warnings de `atlas-design/no-raw-tailwind-colors` (tokens do design system).
6. **Total estimado Fase 2:** ~33 horas de Claude Code (3.5 dias úteis a 10h/dia, ou 1 sprint curto). **Sem novas features, sem deploys.**

---

## 1. Números brutos (baseline 2026-04-20)

| Ferramenta | Comando | Sem allowlist | Com allowlist atual |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | **497 errors** em 28 arquivos | 0 (tsconfig.techdebt exclui `**/__tests__/**`) |
| ESLint | `npx next lint` | **164 warnings** em ~40 arquivos | 154 warnings (10 unused-vars eram erro, agora warn) |
| Vitest | `npx vitest run` | **51 testes falhando em 9 arquivos** | 1 failure (flaky timeout) |
| **Total** | | **712** | 155 (tolerados) |

### Distribuição TypeScript (497)
- `TS2339 (485)` — Property does not exist on type. **485 delas** são matchers do `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveAttribute`, `toHaveTextContent`, `toBeDisabled`). **Root cause único.**
- `TS2741 (5)` — Property missing in type (fixture drift).
- `TS2540 (3)` — Cannot assign to readonly property (test mutation of constants).
- `TS2493 (3)` — Tuple out of bounds (resend-sender test).
- `TS2578 (1)` — Unused `@ts-expect-error`.

### Distribuição ESLint (164)
- `atlas-design/no-raw-tailwind-colors (135)` — cores raw em vez de tokens (design system).
- `@typescript-eslint/no-unused-vars (24)` — imports/variáveis não usados (10 allowlisted como warn, outros 14 já são warn).
- `@next/next (3)`, `@sentry/nextjs (2)`, `@next/codemod (1)` — avisos de configuração/SDK.

### Distribuição Vitest (51 testes / 9 arquivos)
| Arquivo | Tests quebrados | Causa provável |
|---|---|---|
| `tests/unit/components/features/expedition/Phase1Wizard.test.tsx` | ~20 | Mock drift (V2 refactor) |
| `tests/unit/components/landing/LanguageSwitcher.test.tsx` | ~10 | Mock drift (`@/i18n/navigation`) |
| `src/components/ui/__tests__/AtlasPhaseProgress.test.tsx` | 4 | Component API changed |
| `tests/unit/server/actions/auth.actions.test.ts` | ~6 | Rate-limit signature changed (dual-layer) |
| `tests/unit/components/features/expedition/Phase1WizardV2.test.tsx` | ~5 | i18n key `"common.next"` not found |
| `tests/unit/components/features/expedition/Phase1WizardRevisit.test.tsx` | ~3 | Same as Phase1Wizard |
| `tests/unit/components/itinerary/PlanGeneratorWizard.test.tsx` | ~2 | File-level load error |
| `tests/unit/lib/prompts/system-prompts.test.ts` | 1 | Output constraint mismatch |
| `tests/unit/server/preferences.actions.test.ts` | ~1 | File-level load error |

**Nota:** `tests/unit/scripts/project-bootstrap.test.ts` está no allowlist mas **não quebra mais** — candidato a sair da exclusion list.

### Comparação com baseline SPEC-TECHDEBT-CI-001 (2026-04-19)
- Baseline: 749 erros catalogados → Hoje: 712 erros.
- Delta: **-37 erros** em 1 dia (maioria de correções de i18n em 9466913).

---

## 2. Classificação em 3 ondas

### Wave 1 — Segurança (MANDATÓRIO Fase 2)

| Item | Fonte | Classificação | Esforço |
|---|---|---|---|
| **XFF fix** — criar `src/lib/http/get-client-ip.ts`, migrar 4 call sites | XFF audit (doc separado) | BLOQUEANTE | 35 min |
| **Fail-closed opt-in** — `checkRateLimit` + migrar 7 sites sensíveis | Fail-open audit (doc separado) | BLOQUEANTE (depende endorso security) | 45 min |
| **Testes novos** — `get-client-ip.test.ts` + `rate-limit.test.ts` fail-closed branch | Cobertura | BLOQUEANTE | 30 min |
| **Restaurar Redis Staging** — (devops-engineer, não qa) | Probe-1 de 2026-04-20 | P0 externo | externa |
| **Re-executar Phase 2 probe** — pós-Redis + pós-fix | SPEC-TEST-FORGOTPW-RATE-LIMIT-001 | BLOQUEANTE | 20 min |
| **Triage flaky test** — `tests/unit/app/app-shell-layout.test.tsx` timeout | Novo este diagnóstico | GRAVE | 30 min |
| **Validar**: 0 sites com XFF cru, 0 rotas sensíveis sem fail-closed | QA check-in | BLOQUEANTE | 10 min |
| **Subtotal Wave 1** | | | **~3h código + 2h coordenação** |

**Critério de saída Wave 1:** 0 vulnerabilidades XFF/fail-open em rotas sensíveis. `eval:gate` ≥ 0.90 na camada de IP. Smoke test `forgot-password-rate-limit` cenário DIAGNÓSTICO inverte polaridade (bloqueia 6ª).

---

### Wave 2 — Qualidade (ALTO IMPACTO Fase 2)

| Item | Volume | Esforço |
|---|---|---|
| **Migrar `tests/setup.ts`** → `import "@testing-library/jest-dom/vitest"` | 1 linha | 5 min (fixa 485 TS) |
| **Remover `tsconfig.techdebt.json` exclusion de `**/__tests__/**`** | 1 entrada | 5 min |
| **Revisar 12 TS2339 residuais** (não matchers — fixtures drift, assertions em `never`) | ~12 errors em 2 arquivos (`resend-sender.test.ts`) | 45 min |
| **Corrigir 5 TS2741, 3 TS2540, 3 TS2493, 1 TS2578** | 12 errors | 1h |
| **Corrigir 51 testes falhando em 9 arquivos** (mocks V2 drift, i18n keys ausentes, API changes) | 9 arquivos, média ~1h/arquivo | 9h |
| **Remover `vitest.config.ts` exclude list** (10 arquivos → 9 após fix) | 10 entradas | 5 min |
| **Corrigir 14 no-unused-vars não-allowlisted** (underline `_` ou deletar) | 14 errors | 45 min |
| **Remover `eslint.config.techdebt.mjs`** (10 arquivos downgradados) | Remover import em `eslint.config.mjs` | 30 min (após sanear os 10 arquivos) |
| **Restaurar coverage branches 78 → 80** (vitest.config.ts) | 1 linha | 5 min (após testes passarem) |
| **Subtotal Wave 2** | | **~14h código + 2h reviews** |

**Critério de saída Wave 2:** `npm run type-check:full` = 0 erros. `npm test` = 0 failures com `vitest.config.ts` sem exclusions. `npm run lint` = 0 no-unused-vars errors. `tsconfig.techdebt.json` e `eslint.config.techdebt.mjs` podem ser deletados.

---

### Wave 3 — Cosmético (BAIXO IMPACTO Fase 2, opcional)

| Item | Volume | Esforço |
|---|---|---|
| **Migrar 135 raw Tailwind colors → atlas-* tokens** | 135 warnings em ~25 arquivos | ~10h (média 5 min/token, mas alguns requerem criar novo token) |
| **Validar visualmente no Storybook/Playwright** | – | 2h |
| **Subtotal Wave 3** | | **~12h código + 2h visual QA** |

**Critério de saída Wave 3:** `npm run lint` = 0 warnings. `atlas-design/no-raw-tailwind-colors` = 0.

**Recomendação:** Wave 3 pode ser empurrada para Sprint 46 ou feita incrementalmente por feature. Não bloqueia release Beta.

---

## 3. Esforço total estimado

| Wave | Esforço código | Esforço coord/review | Total | Prioridade |
|---|---:|---:|---:|---|
| Wave 1 (segurança) | 3h | 2h | **5h** | P0 — mandatório |
| Wave 2 (qualidade) | 14h | 2h | **16h** | P1 — alto ROI |
| Wave 3 (cosmético) | 12h | 2h | **14h** | P2 — opcional |
| **Total Fase 2** | **29h** | **6h** | **~35h** | |

**Em dias úteis:** 3.5 dias de Claude Code a 10h/dia OU 1 sprint curto de 4 dias com 1-2 devs.

---

## 4. Proposta de allowlist (candidatos a continuar/sair)

### Critérios obrigatórios para manter no allowlist
1. Fix não-trivial (> 2h esforço).
2. Não afeta segurança.
3. Documentado em SPEC-TECHDEBT-CI-001.
4. Tem responsável nomeado.
5. Tem data de saída definida (máximo Sprint 46).

### Tabela de decisão

| Item atual no allowlist | Critério atendido? | Ação Fase 2 |
|---|---|---|
| `tsconfig.techdebt.json` exclui `**/__tests__/**` | ❌ Fix é 1 linha (import `/vitest`) | **REMOVER** em Wave 2 |
| `vitest.config.ts` exclui 10 arquivos | ❌ Maioria são mock drift corrigíveis; 1 (project-bootstrap) já passa | **REMOVER** em Wave 2 (fix 9, liberar project-bootstrap imediato) |
| `eslint.config.techdebt.mjs` downgrade 10 arquivos | ❌ São 24 unused-vars corrigíveis em 1h | **REMOVER** em Wave 2 |
| `vitest.config.ts` `branches: 78` (era 80) | ❌ Só temporário | **RESTAURAR 80** em final de Wave 2 |

### Novos candidatos ao allowlist

**Nenhum.** Wave 1 e 2 visam zero allowlist. Se algo NÃO couber em Fase 2, abrir SPEC-TECHDEBT-CI-002 com justificativa, não expandir allowlist atual.

---

## 5. Riscos e incógnitas

| # | Risco | Mitigação | Owner |
|---|---|---|---|
| R1 | **Redis Staging continua down** → não há como validar Wave 1 no ambiente real | Bloquear Fase 2 até devops restaurar Redis + Probe-1 verde | devops-engineer |
| R2 | **Fail-closed quebra UX** em falha transitória de Redis | Feature flag `RATE_LIMIT_FAIL_CLOSED_ENABLED`, rollout gradual, monitoring Sentry | tech-lead + security |
| R3 | **Wave 2 vitest fixes expõe bugs reais** (não só mocks drift) em Phase1Wizard | Budget extra 4h para investigar; se > 20% for bug real, escalar | qa-engineer |
| R4 | **Wave 3 quebra visual** em páginas não cobertas por Playwright visual | Rodar `test:visual` + screenshot review pré-merge | ux-designer |
| R5 | **Test flaky `app-shell-layout.test.tsx`** é sintoma de bug real no layout | Investigar antes de descartar como flake | dev-fullstack-1 |
| R6 | **`tests/unit/scripts/project-bootstrap.test.ts`** passa hoje mas é flaky cross-platform (Windows/Linux CI) | Rodar 10x na pipeline antes de remover do allowlist | devops |
| R7 | **Classificação fail-closed vs fail-open** não validada por security-specialist | Bloqueio Fase 2 até endorso (agent doesn't exist, delegar a `architect`) | architect |
| R8 | **Matcher import mudança** pode introduzir novos erros de tipo em matchers customizados do jest-dom | Rodar tsc full após mudança; reverter se > 0 novos erros | qa-engineer |

---

## 6. Incógnitas e questões para o PO

1. **Wave 3 entra em Fase 2 ou vira Sprint 46?** Recomendação: Sprint 46, não bloqueia Beta.
2. **Agent `security-specialist` não existe no registry** — delegação para `architect` é aceitável?
3. **Fail-closed em prod** requer nova feature flag ou pode ir direto? Recomendação: flag por 1 sprint, depois default true.
4. **Prioridade da restauração do Redis Staging** (P1 externo) em relação ao Wave 1 técnico?
5. **Deletar arquivos temporários** (`scripts/sprint-45-parse-errors.cjs`, `tmp-*.log`) após aprovação — ok?

---

## 7. Deliverables desta Fase 1

- [x] `docs/specs/sprint-45/SCOPE-BOX.md` (este arquivo)
- [x] `docs/specs/sprint-45/raw-errors-2026-04-20.json` (estruturado, machine-readable)
- [x] `docs/specs/sprint-45/XFF-AUDIT-2026-04-20.md` (audit completo + fix proposto)
- [x] `docs/specs/sprint-45/FAIL-CLOSED-PROPOSAL-2026-04-20.md` (classificação + design)
- [x] `scripts/sprint-45-parse-errors.cjs` (reproduzível — para re-rodar pós-fix)
- [ ] ~~Nenhum código de produção modificado~~ — aguardando aprovação Fase 2

---

## 8. Regra de STOP aplicada

> "Se total > 1000 OU total < 500 → reportar ao PO"
> "Se Wave 1 > 100 erros → STOP"
> "Se XFF audit > 20 sites sem helper → STOP"
> "Se outras rotas sensíveis em fail-open → reportar"

Verificação:
- Total 712 ∈ [500, 1000] → **OK**
- Wave 1 < 10 itens → **OK**
- XFF audit: 2 sites bugados (threshold 20) → **OK**
- Outras rotas sensíveis em fail-open: **7 encontradas** (auth × 4 + admin + purchase + governance) → **REPORTADO** (seção 2 Wave 1 + doc FAIL-CLOSED-PROPOSAL)

**Nenhum STOP crítico acionado. Pronto para Fase 2 mediante aprovação do PO.**

---

## 9. Aprovação PO — próximos passos

- [ ] PO lê este SCOPE-BOX + os 2 docs anexos.
- [ ] PO aprova/ajusta o escopo de Wave 1/2/3.
- [ ] PO autoriza ou não a inclusão de Wave 3 em Fase 2.
- [ ] PO alinha com devops-engineer sobre Redis Staging (bloqueio externo).
- [ ] PO assina `docs/specs/sprint-45/APPROVAL-LOG.md` (a criar) com decisões.
- [ ] Fase 2 começa **apenas** após esta assinatura.

---

**Fim do Scope Box. Aguardando aprovação do PO.**
