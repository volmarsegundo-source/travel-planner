# Sprint 45 — Coverage Branches Residual Debt

**Date:** 2026-04-20
**Owner:** dev-fullstack-1 (impersonated)
**Decision:** PO (Volmar, 2026-04-20) — aceitar gap, manter threshold 78, documentar.
**Follow-up:** SPEC-TESTS-BRANCHES-80-001 (a criar para Sprint 46 ou pós-Beta)
**Related:** `docs/specs/sprint-45/SCOPE-BOX.md` (Wave 2.8b), `vitest.config.ts:17-21`

---

## Sumário executivo

1. **Medição final de Sprint 45:** branches coverage = **78.99%** (1546 / 1957).
2. **Target original da Wave 2.8b:** 80% (exigia +1.88pp).
3. **Resultado real:** +0.87pp (78.12 → 78.99). **Gap residual: −1.01pp = +20 branches não cobertos.**
4. **Decisão PO:** manter `vitest.config.ts` em `branches: 78`. **Não bloquear Sprint 45.** Documentar como débito conhecido e tratar em Sprint 46+.
5. **Commit do Sprint 45 mantém o threshold de 78** — inclusive o comentário em `vitest.config.ts` foi atualizado para referenciar este documento.

---

## 1. Números finais

| Métrica | Alvo vitest.config | Real | Status |
|---|---:|---:|---|
| Statements | 80% | 88.08% | ✅ |
| **Branches** | **78%** | **78.99%** | ⚠️ gap de 1.01pp vs target estratégico 80% |
| Functions | 80% | 88.52% | ✅ |
| Lines | 80% | 88.52% | ✅ |

**Threshold `branches: 78` mantido.** O real (78.99%) está acima do threshold, então o gate passa. Mas 78 não é o target estratégico — é temporário.

---

## 2. Diagnóstico da Wave 2.8b

A Wave 2.8b escreveu **35 testes** em 3 arquivos (`profile.service.test.ts`, `itinerary-plan.service.test.ts`, `ai.service.test.ts`), com metas explícitas em cada header.

| Arquivo | Meta (header) | Real final | Delta |
|---|---:|---:|---|
| `profile.service.ts` | 54 → ~90% | **95.83%** | ✅ excedeu |
| `itinerary-plan.service.ts` | 59 → ~90% | **85.71%** | ⚠️ próximo, não atingiu 90 |
| `ai.service.ts` | 59 → ~80% | **56.96%** | ❌ **regrediu** |

**`ai.service.ts` é o principal ofensor residual** — a Wave 2.8b previa atacar especificamente as linhas 787 (Redis cache error), 816 (Redis cache error), 886 (guide retry loop) e 896 (Redis cache error), mas os 9 testes implementados cobriram caminhos já cobertos (happy path). **68 branches permanecem descobertos**, incluindo os 4 focus-points do header.

---

## 3. Top ofensores que puxam o agregado pra baixo

| Arquivo | Branch % | Missing | Motivo |
|---|---:|---:|---|
| `src/components/features/auth/RegisterFormV2.tsx` | **0%** | 43 | V2 form implementado sem testes na Sprint 42 |
| `src/server/services/report-generation.service.ts` | **0%** | 32 | Serviço interno sem cobertura desde início |
| `src/server/services/ai.service.ts` | 57% | **68** | Wave 2.8b falhou em pegar os focus-points |
| `src/server/services/providers/claude.provider.ts` | 61% | 16 | Retry paths + timeout branches |
| `src/server/services/expedition-summary.service.ts` | 75% | 38 | Edge cases da consolidação Phase 1-6 |
| `src/server/services/admin-dashboard.service.ts` | 76% | 25 | Filtros admin não cobertos |
| `src/server/services/nominatim.provider.ts` | 65% | 11 | Error paths + cache-miss branches |

**Soma das missing branches nos 7 piores: 233 / 411 totais (57%).** Atacar esses 7 fecha o gap com folga.

---

## 4. Caminhos para fechar em Sprint 46

| Opção | Esforço | Ganho projetado |
|---|---|---|
| **B** — Reescrever `ai.service.test.ts` atingindo linhas 787/816/886/896 | ~1–2h | +30 branches → ~80.5% ✅ |
| **A** — `preferences.service.ts` (4) + `claude.provider.ts` (16) | ~2h | +20 branches → ~80.0% ✅ |
| **C** — `RegisterFormV2.tsx` (testes UI V2) | ~3–4h | +43 branches → ~81.2% ✅✅ |
| **D** — Portfolio completo (ataque nos top 7 ofensores) | ~10h | ~85% branches (estourando target) |

**Recomendação para SPEC-TESTS-BRANCHES-80-001:** Opção B + A combinadas (~3–4h). Garante 80% com margem e resolve o débito da Wave 2.8b que não cumpriu sua promessa original.

---

## 5. Justificativa de por que não bloquear Sprint 45

**Argumento técnico:**
- Branches threshold `78` já existia pré-Sprint 45 (foi reduzido em 2026-04-19 por SPEC-TECHDEBT-CI-001 quando a allowlist foi criada).
- O real medido (78.99) está **acima do threshold** — CI passa.
- Statements, functions e lines estão todos confortavelmente ≥88%.
- Sprint 45 entregou **+0.87pp em branches** e **removeu toda a allowlist** (tsconfig.techdebt.json, eslint.config.techdebt.mjs, exclusões do vitest.config) — ganho estrutural muito maior que o gap residual.

**Argumento de prioridade:**
- Beta lançamento é P0. Sprint 45 é pré-requisito do Beta.
- Subir branches de 79 para 80 custa ~2h mas não desbloqueia nenhum usuário.
- Débito residual é quantificável, rastreável (este doc + SPEC-TESTS-BRANCHES-80-001) e não gera risco de segurança.

**Argumento de transparência:**
- O comentário em `vitest.config.ts:17-21` referencia este documento diretamente.
- SPEC-TECHDEBT-CI-001 §5 pode ser atualizado com a nota "branches resolvido parcialmente em Sprint 45 — complemento rastreado em SPEC-TESTS-BRANCHES-80-001".

---

## 6. Ação imediata tomada

- ✅ `vitest.config.ts:17-21` — comentário atualizado para refletir número real (78.99%) e apontar para este documento.
- ✅ Este documento criado e linkado nos commits de Sprint 45.
- ⏳ SPEC-TESTS-BRANCHES-80-001 será criado quando o backlog do Sprint 46 começar.

---

## 7. Audit trail

- **Coverage run:** 2026-04-20 23:27–23:39 (735s wall)
- **Comando:**
  ```
  npx vitest run --coverage --testTimeout=30000 \
    --exclude='tests/unit/server/services/ai-provider-factory.test.ts' \
    --exclude='tests/unit/app/app-shell-layout.test.tsx'
  ```
- **Arquivos excluídos:** 2 (coverage-mode flaky — ver `FLAKY-TESTS-COVERAGE-MODE-2026-04-20.md`)
- **Testes executados:** 255 files / 3618 tests / 0 falhas
- **Report persistido:** `coverage/coverage-summary.json` + `coverage-sprint45-final.txt`

---

**Fim do documento. Débito residual aceito. Sprint 45 não bloqueado.**
