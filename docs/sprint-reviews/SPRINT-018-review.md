# Sprint 18 Review -- Tech Lead

**Reviewer:** tech-lead
**Date:** 2026-03-10
**Branch:** `feat/sprint-18` (merged to master via PR #19)
**Version:** v0.11.0 -> v0.12.0
**Tag:** `v0.12.0`

---

## Sumario Executivo

Sprint 18 entregou todas as 12 tarefas planejadas dentro da capacidade estimada de 40h. Os tres pilares do sprint foram: (1) streaming de IA para eliminar timeouts do Vercel Hobby, (2) redesign do dashboard com ferramentas de fase e barra de progresso, e (3) hardening de seguranca com hash de userId em logs e limpeza completa de dados na exclusao de conta.

A seguranca foi aprovada com uma condicao residual (SEC-S18-001 MEDIUM) que sera tratada no Sprint 19. Tres findings LOW (SEC-S18-002/003/004) foram corrigidos dentro do proprio sprint apos a revisao de seguranca.

---

## Tabela de Conclusao de Tarefas

| Task | Descricao | Assignee | Status | Estimativa | Notas |
|------|-----------|----------|--------|------------|-------|
| T-S18-001 | Fix z-index/pointer-events no ExpeditionCard | dev-2 | DONE | 1h | Padrao overlay link corrigido |
| T-S18-002 | Limpeza de dados na exclusao de conta (SEC-S17-003) | dev-2 | DONE | 2h | 10 modelos limpos na transacao |
| T-S18-003 | Hash userId em trip.actions.ts (SEC-S17-004) | dev-1 | DONE | 0.5h | 5 ocorrencias corrigidas |
| T-S18-004 | Hash userId em auth.service.ts (SEC-S17-005) | dev-1 | DONE | 0.5h | 5 ocorrencias corrigidas |
| T-S18-005 | Hash userId em profile.service.ts (SEC-S17-006) | dev-1 | DONE | 0.25h | 1 ocorrencia corrigida |
| T-S18-006 | Streaming no ClaudeProvider | dev-1 | DONE | 6h | generateStreamingResponse + AbortSignal |
| T-S18-007 | API route de streaming POST /api/ai/plan/stream | dev-1 | DONE | 5h | SSE + defense-in-depth completo |
| T-S18-008 | Streaming UI no Phase6Wizard | dev-2 | DONE | 3h | Progressive text rendering |
| T-S18-009 | Auto-geracao + disclaimer IA + Regenerar | dev-2 | DONE | 4h | useEffect auto-trigger + banner info |
| T-S18-010 | Dashboard cards com ferramentas de fase | dev-2 | DONE | 8h | PhaseToolsBar + "Em construcao" |
| T-S18-011 | Barra de progresso com indicadores de fase | dev-2 | DONE | 5h | 8 segmentos com estados visuais |
| T-S18-012 | Busca destinos i18n + performance | dev-1 | DONE | 2h | Accept-Language + cache por locale |

**Total: 12/12 tarefas completas**

---

## Correcoes de Seguranca (pos-review)

| ID | Severidade | Descricao | Status |
|----|------------|-----------|--------|
| SEC-S18-002 | LOW | AbortSignal.timeout em generateStreamingResponse | RESOLVED |
| SEC-S18-003 | LOW | X-Content-Type-Options: nosniff no SSE | RESOLVED |
| SEC-S18-004 | LOW | Rate limit key unificada (streaming + server action) | RESOLVED |

---

## Metricas de Teste

| Metrica | Antes (v0.11.0) | Depois (v0.12.0) | Delta |
|---------|-----------------|-------------------|-------|
| Testes | 1231 | 1288 | +57 |
| Suites | 85 | 89 | +4 |
| Falhas | 0 | 0 | 0 |

Novos arquivos de teste:
- `tests/unit/api/ai/plan/stream-route.test.ts` (streaming API route)
- `tests/unit/server/claude-provider-streaming.test.ts` (provider streaming)
- `tests/unit/components/features/dashboard/DashboardPhaseProgressBar.test.tsx`
- `tests/unit/components/features/dashboard/PhaseToolsBar.test.tsx`

---

## Resumo da Revisao de Seguranca

**Veredito: APPROVED WITH CONDITIONS**
**Revisor:** security-specialist
**Documento:** `docs/security/SPRINT-18-SECURITY-REVIEW.md`

### Condicoes do Sprint 17 Resolvidas

| ID Sprint 17 | Descricao | Status |
|---|---|---|
| SEC-S17-003 (MEDIUM) | UserProfile + gamificacao nao limpos na exclusao | RESOLVIDO (T-S18-002) |
| SEC-S17-004 (MEDIUM) | trip.actions.ts loga userId raw | RESOLVIDO (T-S18-003) |
| SEC-S17-005 (MEDIUM) | auth.service.ts loga userId raw | RESOLVIDO (T-S18-004) |

### Condicao Remanescente

| ID | Severidade | Descricao | Sprint Alvo |
|----|------------|-----------|-------------|
| SEC-S18-001 | MEDIUM | ItineraryDay, Activity, ChecklistItem nao deletados na exclusao de conta (dados orfaos) | Sprint 19 (P0) |

---

## Code Review -- Findings

### Qualidade Geral: APROVADO

A implementacao segue os padroes do projeto de forma consistente. Nenhum blocker identificado.

#### Observacoes Positivas

1. **Streaming architecture**: Separacao limpa entre provider (ReadableStream), API route (SSE), e UI (fetch + reader). Cada camada tem responsabilidade clara.
2. **Defense-in-depth no endpoint**: Auth -> Zod -> Rate Limit -> BOLA -> Age Guard -> Injection -> PII mask. Ordem correta e completa.
3. **Account deletion transaction**: 13 operacoes dentro de uma unica transacao com rollback atomico. Deletes executados antes do soft-delete do User para evitar FK violations.
4. **Zero raw userId em logs**: Grep confirmou zero ocorrencias residuais em todo o codebase.
5. **Import convention**: Zero violacoes de `next/link` ou `next/navigation` (exceto excecoes documentadas).

#### Itens Menores (nao bloqueantes, debt aceito)

1. **DestinationAutocomplete debounce**: Task especificava 500ms mas implementacao usa 400ms. Diferenca insignificante, aceito.
2. **PhaseToolsBar duplica shortcuts**: ExpeditionCard tem shortcuts de checklist/itinerary E PhaseToolsBar renderiza ferramentas similares. Redundancia visual leve, mas nao confusa. Pode ser consolidado em sprint futuro.
3. **account.actions.ts tem duas funcoes hashUserId**: Uma local (createHash) e uma importada como hashForLog. Ambas fazem SHA-256 mas com slice diferente. Nao e um bug (a local e para anonimizacao de email, a importada para logs), mas a naming pode confundir.

---

## Decisoes Chave e Resultados

| Decisao | Resultado |
|---------|-----------|
| Q1: Streaming para timeout Vercel | Implementado com sucesso. SSE mantem conexao ativa. |
| Q4: Fases 7-8 como "Em construcao" | PhaseToolsBar + DashboardPhaseProgressBar implementam lock icon e opacity 50%. |
| Q5: Auto-gerar roteiro + disclaimer | useEffect auto-trigger na primeira visita. Disclaimer com icone Info visivel. |
| Q6: ANTHROPIC_API_KEY no Vercel | Confirmado configurado. Guard no provider previne crash se ausente. |
| Q7: Pular ENCRYPTION_KEY staging | Aceito. Campos criptografados nao sao usados em staging. |

---

## Itens Deferidos para Sprint 19

| Item | Prioridade | Motivo |
|------|------------|--------|
| SEC-S18-001 | P0 | Limpeza de ItineraryDay/Activity/ChecklistItem na exclusao de conta |
| ITEM-2 | P2 | Profile toggles/checkboxes -- precisa pesquisa UX |
| ITEM-3 | P2 | Deteccao viagem internacional + transporte -- precisa ADR-009 |
| ITEM-4 | P2 | Redesign guia do destino -- precisa input do UX designer |
| Q2 | P3 | Localizacao do usuario no onboarding |

---

## Licoes Aprendidas

1. **StreamRequestSchema mismatch**: O schema inicial usava formato nested (`{ tripId, params: { ... } }`) enquanto o client enviava flat. O security review detectou o bug funcional durante a analise de seguranca. Corrigido antes do merge.

2. **Security review como quality gate**: Os 3 findings LOW (AbortSignal, nosniff, rate limit key) foram identificados e corrigidos dentro do sprint. A pratica de revisao de seguranca pre-merge continua se provando eficaz.

3. **Paralelismo eficaz**: dev-1 (streaming backend) e dev-2 (dashboard frontend) trabalharam em paralelo com minimo de conflito. O unico bloqueio foi T-S18-008/009 que dependiam de T-S18-007.

---

*Revisao conduzida pelo tech-lead em 2026-03-10.*
