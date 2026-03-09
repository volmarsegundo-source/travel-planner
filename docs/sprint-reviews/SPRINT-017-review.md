# Revisao do Sprint 17 -- Tech Lead

**Revisor:** tech-lead
**Data:** 2026-03-09
**Branch:** `feat/sprint-17` (merged via PR #18)
**Tag:** v0.11.0
**Tema:** Hardening & Production Readiness

---

## Resumo Executivo

Sprint 17 foi um sprint de hardening puro -- zero novas features, foco total em eliminar divida tecnica P0 acumulada desde o Sprint 2. Todas as 9 tasks P0 foram entregues, revisadas e aprovadas. A revisao de seguranca foi conduzida pelo security-specialist e resultou em aprovacao com 3 condicoes MEDIUM rastreadas para o Sprint 18.

---

## Tasks Completadas

| Task | Descricao | Dev | Revisao Seg. | Status |
|---|---|---|---|---|
| T-S17-001 | Protecao contra mass assignment com allowlists explicitas | dev-1 | PASS | Concluida |
| T-S17-002 | Limpeza de contas OAuth na exclusao de usuario | dev-1 | PASS | Concluida |
| T-S17-003 | Correcao de imports de navegacao (TripCard) | dev-2 | N/A | Concluida |
| T-S17-004 | Hash de userId em logs de server actions (LGPD) | dev-2 | PASS (conditions) | Concluida |
| T-S17-005 | Validacao Zod server-side para parametros de IA | dev-1 | PASS | Concluida |
| T-S17-006 | calculateEstimatedCost para logging de tokens (FinOps) | dev-2 | N/A | Concluida |
| T-S17-007 | Paginas de termos, privacidade e suporte | dev-2 | N/A | Concluida |
| T-S17-008 | Transliteracao de homoglifos cirilicos no injection guard | dev-1 | PASS | Concluida |
| T-S17-009 | Guard contra apiKey vazia do Anthropic | dev-1 | PASS | Concluida |

---

## Metricas de Testes

| Metrica | Antes (Sprint 16) | Depois (Sprint 17) | Delta |
|---|---|---|---|
| Total de testes | 1142 | 1231 | +89 |
| Suites de teste | ~75 | 85 | +10 |
| Falhas | 0 | 0 | 0 |
| TypeScript errors | 0 | 0 | 0 |

### Novos arquivos de teste
- `tests/unit/server/mass-assignment.test.ts` (7 testes)
- `tests/unit/lib/validations/ai.schema.test.ts` (22 testes -- validacao Zod)
- `tests/unit/server/ai-validation.test.ts` (9 testes -- integracao)
- `tests/unit/server/claude-provider-apikey.test.ts` (5 testes)
- `tests/unit/lib/hash.test.ts` (5 testes)
- `tests/unit/lib/cost-calculator.test.ts` (10 testes)
- `tests/unit/app/legal-pages.test.tsx` (testes de paginas legais)
- `tests/unit/lib/prompts/injection-guard.test.ts` (+8 testes de homoglifos cirilicos)

---

## Revisao de Seguranca

**Status:** APPROVED WITH CONDITIONS
**Relatorio completo:** `docs/security/SPRINT-17-SECURITY-REVIEW.md`

### Findings resolvidos neste sprint
- DT-004 (15+ sprints pendente): Mass assignment em TripService.updateTrip -- CORRIGIDO
- SEC-S7-001: OAuth tokens orfaos apos exclusao de conta -- CORRIGIDO
- SEC-S16-001: Bypass de injection guard via homoglifos cirilicos -- CORRIGIDO
- FIND-S8-M-001: Parametros de IA sem validacao Zod server-side -- CORRIGIDO
- FIND-S8-M-003: apiKey vazia aceita pelo singleton Anthropic -- CORRIGIDO
- RISK-013/BUG-S7-001: userId em texto claro em logs -- PARCIALMENTE CORRIGIDO

### Condicoes para Sprint 18
| ID | Severidade | Descricao | Arquivo |
|---|---|---|---|
| SEC-S17-003 | MEDIUM | Gamificacao e UserProfile nao limpos na exclusao | account.actions.ts |
| SEC-S17-004 | MEDIUM | trip.actions.ts com 5 logger calls userId raw | trip.actions.ts |
| SEC-S17-005 | MEDIUM | auth.service.ts com 5 logger calls userId raw | auth.service.ts |

Detalhes completos em `docs/sprints/SPRINT-18-BACKLOG-SEEDS.md`.

---

## Verificacoes de Conformidade (Definition of Done)

- [x] Todas as 9 tasks P0 concluidas
- [x] Code review aprovado pelo tech-lead
- [x] Security review aprovado (with conditions) pelo security-specialist
- [x] Cobertura >= 80% em arquivos modificados
- [x] Zero testes quebrados (regressao zero)
- [x] +89 novos testes (1231 total, acima da meta de 1170)
- [x] `grep 'from "next/link"' src/components/` -- zero resultados
- [x] `grep 'from "next/navigation"' src/components/` -- apenas LoginForm (excecao aceita)
- [x] Merged via PR #18 para master
- [x] Version bump para v0.11.0
- [x] Tag v0.11.0 criada e pushada

---

## Observacoes do Code Review

### Qualidade Geral
O codigo entregue e consistente com os padroes do projeto. Todas as tasks seguem o padrao de defense-in-depth: validacao Zod na action layer + whitelist no service layer.

### Pontos positivos
1. **Mass assignment (T-S17-001):** Implementacao com Record<string, unknown> e verificacao campo a campo -- padrao solido de defense-in-depth
2. **Cyrillic transliteration (T-S17-008):** ReadonlyMap com 23 homoglifos, aplicado na ordem correta (NFKD -> strip marks -> transliterate). Testes incluem tanto deteccao de injection quanto ausencia de false positives
3. **Zod AI schemas (T-S17-005):** Cobertura ampla com 22 testes unitarios + 9 de integracao
4. **Hash utility (T-S17-004):** Modulo compartilhado em `@/lib/hash` -- nao duplicado entre actions

### Observacoes menores (nao bloqueantes)
1. `account.actions.ts` tem dois hashUserId distintos: local (16 hex, para email anonimizado) e importado `hashForLog` (12 hex, para logs). Intencional mas levemente inconsistente -- documentar
2. `cost-calculator.ts` usa precos reais do Anthropic (Haiku $0.80/$4.00) em vez dos precos do spec ($0.25/$1.25). A implementacao esta correta -- o spec tinha dados aproximados
3. Paginas legais (terms/privacy/support) estao fora do route group `(app)` -- renderizam com Header/Footer proprios. Aceitavel para paginas publicas

---

## Licoes Aprendidas

1. **Divida tecnica envelhece mal.** DT-004 (mass assignment) ficou pendente por 15+ sprints. Sprints de hardening periodicos sao essenciais para evitar acumulacao.

2. **Escopo de tasks de logging deve ser verificado por grep.** T-S17-004 nao cobriu `trip.actions.ts` apesar de estar listado no escopo. Verificacao automatizada com grep no CI ajudaria.

3. **Cache pricing diverge entre documentacao e realidade.** Os precos de cache da Anthropic mudam -- o cost-calculator deve ser atualizado quando precos forem revisados.

4. **Paginas legais podem ser tratadas como conteudo estatico.** Server Components com `getTranslations` sao suficientes -- sem necessidade de client-side interatividade.

---

*Revisao conduzida pelo tech-lead em 2026-03-09.*
