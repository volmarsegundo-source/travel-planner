# Sprint 15 — Review Consolidado

**Data**: 2026-03-09
**Branch**: `feat/sprint-15`
**Commits**: 5 (S15-001 a S15-005)
**Escopo**: Phase 6 Wizard — geração de itinerário com IA no fluxo de expedição Atlas
**Arquivos alterados**: 27 (+1375 / -124 linhas)

---

## Resumo de Veredictos

| Agente | Veredicto | Bloqueio? |
|---|---|---|
| **architect** | APPROVED WITH NOTES | Não |
| **security-specialist** | APPROVED WITH NOTES | Não |
| **devops-engineer** | BLOCKED | Sim — type errors |
| **tech-lead** | BLOCKED | Sim — type errors + code issues |
| **release-manager** | APPROVED WITH NOTES | Não (com notas críticas) |
| **finops-engineer** | APPROVED WITH NOTES | Não |

**Status geral: BLOCKED** — resolver itens obrigatórios antes do merge.

---

## Itens Obrigatórios (Merge Blockers)

### 1. TypeScript Compilation Errors (CRITICAL)
- `tsc --noEmit` falha — bloqueia CI pipeline
- Causas prováveis: Prisma client desatualizado, tipos de `expeditionContext`, props de página Next.js 15
- **Ação**: Rodar `npx prisma generate`, corrigir erros restantes
- **Reportado por**: devops-engineer, tech-lead

### 2. `window.location.reload()` hack (DEBT-S15-001)
- `Phase6Wizard.tsx:73-76` — `router.refresh()` + `setTimeout(() => window.location.reload(), 500)`
- Hard refresh destrói estado do cliente, causa flash visual, timeout arbitrário
- **Ação**: Remover `setTimeout` + `reload()`, testar com `router.refresh()` apenas
- **Reportado por**: tech-lead, architect

---

## Itens Recomendados (Strong)

### 3. Categoria de pontos incorreta (DEBT-S15-006)
- `ai.actions.ts:147` — usa `"purchase"` para geração de itinerário
- **Ação**: Alterar para categoria semanticamente correta (`"creation"` ou `"generation"`)
- **Reportado por**: tech-lead

### 4. Fetch duplicado de Phase 2 metadata (DEBT-S15-002)
- Dados buscados no `phase-6/page.tsx` E em `ItineraryPlanService.getExpeditionContext()`
- **Ação**: Eliminar duplicação — passar dados do page ou confiar no service
- **Reportado por**: tech-lead

### 5. Cap de gerações por trip (OPT-S15-001)
- Sem limite máximo de regenerações por trip (rate limit permite até 240/dia/user)
- **Ação**: Implementar `MAX_GENERATIONS_PER_TRIP = 5` no Sprint 16
- **Reportado por**: finops-engineer

### 6. Dívida de CHANGELOG (RISK-017)
- CHANGELOG.md desatualizado — 6 sprints sem entrada (Sprints 10-14 + regression)
- `package.json` ainda em 0.9.0
- **Ação**: Backfill de entradas retroativas, bump para 0.15.0
- **Reportado por**: release-manager

---

## Architect Review

**Veredicto: APPROVED WITH NOTES**

### Design Decisions
- ItineraryPlan como modelo 1:1 com Trip: correto, padrão consistente
- Service layer com BOLA guards: bem implementado
- Expedition context enrichment: boa personalização sem acoplamento

### Dívida Técnica Identificada
- **DT-S15-001**: `window.location.reload()` hack em Phase6Wizard
- **DT-S15-002**: Fetch duplicado de Phase 2 metadata
- **DT-S15-003**: Budget defaults hardcoded (3000 USD)
- **DT-S15-004**: Phase routing verboso (poderia ser lookup table)
- **DT-S15-005**: Silent error swallowing em `recordGeneration` (mais importante)

---

## Security Review

**Veredicto: APPROVED WITH NOTES**

### Authentication & Authorization: PASS
- BOLA guards em todos os pontos de entrada (page, service, action)
- Age guard aplicado, rate limiting configurado (10 req/hora/user)

### Input Validation: PASS
- `travelNotes` trimmed + truncado a 500 chars
- AI response validada por Zod schemas estritos

### AI/Prompt Security: PASS
- Expedition context vem de dados estruturados do banco
- Output validation via Zod previne injeção de prompt

### Security Scan Triage: Todos 13 flags são FALSE POSITIVES
| Arquivo | Conteúdo flagado | Veredicto |
|---|---|---|
| `checklist-rules.ts` | Keys como `"passport"`, `"visa_check"` | Identificadores de checklist |
| `phase-config.ts` | Keys como `"first_step"`, `"navigator"` | Nomes de ranks/badges |
| `OnboardingWizard.tsx` | Constantes `"ADVENTURE"`, `"CULTURE"` | Valores de enum UI |
| `ProfileAccordion.tsx` | Keys como `"birthDate"`, `"phone"` | Metadata de campos |

### Notas para backlog
- **SEC-S15-001**: Sanitizar `trip.destination` antes de interpolação no prompt (pré-existente)
- **SEC-S15-002**: `ForbiddenError` vs 404 — inconsistência menor no service (sem leak real)

---

## DevOps Review

**Veredicto: BLOCKED** (type errors)

### Database Migration: SAFE
- Migration `20260309010315_itinerary_plan_phase6` — apenas `CREATE TABLE`, aditiva
- Rollback: `DROP TABLE itinerary_plans`
- FK com CASCADE consistente com padrões existentes

### Environment Variables: Nenhuma nova
### CI/CD: Sem alterações em pipelines
### Environment Parity: Mantida

### Pré-existente
- `ENCRYPTION_KEY` ausente no CI workflow (gap do Sprint 11)
- `deploy.yml` steps ainda são `echo` placeholders

---

## Tech Lead Review

**Veredicto: BLOCKED** (type errors + code issues)

### Code Quality: Sólido
- Service segue padrões estabelecidos (static methods, server-only, explicit selects)
- Phase6Wizard segue mesmo padrão do DestinationGuideWizard
- Graceful degradation em operações auxiliares (points, recordGeneration)

### Test Coverage: Adequada
- `itinerary-plan.service.test.ts`: 8 test cases (BOLA, idempotency, context)
- `Phase6Wizard.test.tsx`: 11 test cases (states, errors, params)
- Gap pré-existente: sem integration tests para server component pages

### Convention Compliance: PASS
- `useRouter`/`Link` de `@/i18n/navigation` ✓
- Conventional Commits ✓
- Explicit Prisma selects ✓

### Required before merge
1. Corrigir type errors
2. Remover `window.location.reload()` hack
3. Corrigir categoria de pontos `"purchase"`
4. Remover fetch duplicado de Phase 2

---

## Release Manager Review

**Veredicto: APPROVED WITH NOTES**

### Versão Recomendada: 0.15.0 (MINOR)
- Todas as alterações são aditivas/backward-compatible
- `/trips` redirect (302) não é breaking change
- `expeditionContext` opcional no `GeneratePlanParams`

### Breaking Changes: NENHUM
- `/trips` continua respondendo (redirect 302 → `/dashboard`)
- Nenhuma Server Action signature alterada de forma incompatível
- Novo modelo ItineraryPlan é puramente aditivo

### Dívida de Changelog: CRÍTICA (RISK-017)
- 6 sprints sem entradas (10-14 + regression)
- `package.json` preso em 0.9.0

### Migration: Segura
- Nova tabela apenas, sem alteração de dados existentes
- Rollback simples: `DROP TABLE itinerary_plans`

---

## FinOps Review

**Veredicto: APPROVED WITH NOTES**

### AI Cost Impact: Baixo
- Phase 6 reutiliza pipeline existente de geração — sem novo tipo de chamada API
- Expedition context enriquecido adiciona ~100-250 tokens de input (<1% do custo)
- Estimativa: ~$0.05-0.09 por geração

### Projeção de Custo
| Cenário | Req/mês | Custo API/mês |
|---|---|---|
| 100 users, 20% adoção | 40 | ~$2-4 |
| 100 users, 50% adoção | 100 | ~$5-9 |
| 1000 users, 50% adoção | 1000 | ~$50-90 |

### Rate Limiting: Adequado (10 req/hora/user)
### Free Tier: Dentro dos limites em todos os serviços
### COST-LOG.md: Precisa atualização com entrada do Sprint 15

### Otimizações Recomendadas
| ID | Otimização | Prioridade | Sprint |
|---|---|---|---|
| OPT-S15-001 | Cap de gerações por trip (MAX=5) | HIGH | 16 |
| OPT-S15-002 | Cooldown client-side no Regenerar (30s) | MEDIUM | 16 |
| OPT-S15-003 | Log de token usage (pendente desde Sprint 8) | HIGH | 16 |
| OPT-S15-004 | Prompt caching (Anthropic cache_control) | HIGH | 16 |

---

## Checklist de Sprint Review

- [x] `architect` review completo e documentado
- [x] `security-specialist` review completo e documentado
- [x] `devops-engineer` review completo e documentado
- [x] `tech-lead` review completo e documentado
- [x] `release-manager` review completo e documentado
- [x] `finops-engineer` review completo (COST-LOG.md pendente atualização)
- [ ] Bloqueios levantados resolvidos — **PENDENTE: type errors, reload hack**
- [ ] Documento commitado no repositório

---

## Próximos Passos

1. **Corrigir type errors** (`npx prisma generate` + fix remaining)
2. **Remover `window.location.reload()` hack** em Phase6Wizard
3. **Corrigir categoria de pontos** `"purchase"` → `"creation"`
4. **Eliminar fetch duplicado** de Phase 2 metadata
5. Rodar `tsc --noEmit` até passar limpo
6. Re-rodar `npm run sprint:review 15` para confirmar CRITICAL = 0
7. Backfill CHANGELOG (Sprints 10-14) + bump version para 0.15.0
8. Atualizar COST-LOG.md com entrada do Sprint 15
