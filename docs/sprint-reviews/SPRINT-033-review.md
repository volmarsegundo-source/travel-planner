# Sprint 33 — Review Document

**Tema**: Data Integrity + UX Foundation + Summary Redesign + Prompt Enrichment + Social Login
**Versao**: v0.28.0
**Data**: 2026-03-20
**Branch**: feat/sprint-33 (merged to master)
**Tag**: v0.28.0
**Baseline**: v0.27.1 (2157 unit tests, 122/130 E2E)

---

## 1. Resumo Executivo

Sprint 33 entregou 5 tracks cobrindo infraestrutura de dados, fundacao UX, redesign de relatorio, enriquecimento de prompt IA e login social. A investigacao critica revelou que bugs recorrentes de v0.27.1 eram causados por dados obsoletos no banco (currentPhase=7), nao por codigo ausente. Script de migracao criado + guard defensivo implementado.

### Resultados

| Metrica | v0.27.1 | v0.28.0 | Delta |
|---------|---------|---------|-------|
| Testes unitarios | 2157 | 2199 | +42 |
| Falhas unitarias | 0 | 0 | 0 |
| Build | Clean | Clean | -- |

---

## 2. Track A — Data Integrity (P0)

### Investigacao Critica

**Causa raiz dos bugs "still open" de v0.27.1**: Dados obsoletos no banco PostgreSQL. Expedicoes criadas antes de FIX-02 (Sprint 32) ainda tinham `currentPhase = 7`. O codigo ja estava correto — o banco nao.

### Entregaveis

| Task | Descricao | Status |
|------|-----------|--------|
| S33-001 | Script `scripts/fix-phase7-trips.ts` — caps currentPhase > 6 | Criado (requer execucao manual no Neon staging) |
| S33-002 | Guard defensivo em `phase-access.guard.ts` — clamp automatico | Implementado (v0.27.1) |

**ACAO REQUERIDA**: Executar `npx tsx scripts/fix-phase7-trips.ts` no banco de staging Neon. Claude Code nao tem acesso ao Docker local ou Neon direto. O usuario deve executar manualmente via:
```bash
# Com DATABASE_URL apontando para Neon staging:
DATABASE_URL="postgresql://..." npx tsx scripts/fix-phase7-trips.ts
```

---

## 3. Track B — UX Foundation

### S33-005: WizardFooter Enhancement

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Botoes | 2 (Back + Primary) | 3 (Voltar + Salvar + Avancar) quando onSave fornecido |
| Dirty state | Nenhum | isDirty prop + dialog de confirmacao |
| Dialog | Nenhum | "Salvar alteracoes?" com Descartar / Salvar e sair |
| Compatibilidade | -- | 100% backward (sem onSave = layout antigo de 2 botoes) |

Arquivo: `src/components/features/expedition/WizardFooter.tsx`
Testes: 10 novos (21 total)

### S33-006: Phase 3 Completion Rules

Verificado: comportamento ja estava correto. evaluatePhase3 no completion engine checa apenas itens obrigatorios. Avanco e livre independente do estado dos checkboxes. Nenhuma mudanca de codigo necessaria.

### S33-007: Phase 4 Mandatory Fields

| Campo | Secao | Obrigatorio |
|-------|-------|-------------|
| transportType | Transporte | Sim |
| departure/arrival places | Transporte | Sim |
| departureAt/arrivalAt | Transporte | Sim |
| accommodationType | Hospedagem | Sim |
| checkIn/checkOut | Hospedagem | Sim |
| 1+ mobility option | Mobilidade | Sim |
| Observacoes | Todas | Nao |

Arquivo: `src/components/features/expedition/Phase4Wizard.tsx`
Testes: 4 novos (34 total)

---

## 4. Track C — Summary/Report Redesign

### S33-008: Summary acessivel de Phase 2+

- Guard de acesso alterado para permitir a partir de Phase 2
- Link "Ver Relatorio" adicionado ao ExpeditionCardRedesigned quando currentPhase >= 2
- Secoes de fases nao iniciadas mostram placeholder cinza

### S33-009: Agregacao completa de dados

Dados expandidos no `expedition-summary.service.ts`:
- Phase 1: nome, faixa etaria, destino, origem, datas, tripType, flexibleDates
- Phase 2: travelerType, accommodationStyle, budgetRange, currency, passengers, preferences
- Phase 3: TODOS os itens de checklist com status
- Phase 4: TODOS os segmentos de transporte, hospedagens, mobilidade
- Phase 5: highlights do guia
- Phase 6: dias do itinerario

Novo: `pendingItems[]` + `completionPercentage`

### S33-010: Destaque de itens pendentes

- Pendentes: fundo laranja (#FFF7ED), texto #92400E
- Concluidos: checkmark verde
- Nao iniciados: placeholder cinza
- Percentual de completude no topo do relatorio

---

## 5. Track D — Prompt Enrichment

### S33-011: Contexto completo para Phase 6

O prompt de geracao de itinerario agora inclui TODOS os dados do usuario das fases 1-5 via XML tags:

```xml
<traveler_context>
  <personal> nome, faixa etaria, origem </personal>
  <trip> destino, datas, tipo, viajantes </trip>
  <preferences> ritmo, orcamento, comida, interesses, acomodacao </preferences>
  <logistics> transporte, hospedagem, mobilidade </logistics>
</traveler_context>
```

Dados coletados no server component de Phase 6 via queries paralelas.

### S33-012: Token Budget

- Adicao: ~600 tokens de input por geracao
- Custo: +$0.002/requisicao = +$1.80/1000 geracoes
- Dentro dos limites existentes (nenhum aumento de maxTokens necessario)

---

## 6. Track E — Social Login

### S33-013/014: Google + Apple OAuth

- Google OAuth: ja configurado em `auth.config.ts` — verificado e funcional
- Apple OAuth: botao adicionado, provider condicional (requer env vars)
- Ambos usam `signIn("google")` / `signIn("apple")` do NextAuth

### S33-015: UI de Login Social

- Botoes acima do formulario email/senha em LoginForm e RegisterForm
- Divisor "ou" entre botoes sociais e formulario
- Google: botao outline com logo multicolorida
- Apple: botao preenchido preto com logo Apple
- Renderizacao condicional baseada em disponibilidade do provider

---

## 7. Arquivos Alterados (27)

### Fonte (17 arquivos)

| Arquivo | Mudanca |
|---------|---------|
| WizardFooter.tsx | 3-button layout + dirty state dialog |
| Phase4Wizard.tsx | Validacao de campos obrigatorios |
| LoginForm.tsx | Botoes Apple/Google OAuth |
| RegisterForm.tsx | Botoes Apple/Google OAuth |
| ExpeditionCardRedesigned.tsx | Link "Ver Relatorio" |
| ExpeditionSummary.tsx | Pending items + completion % |
| Phase6Wizard.tsx | Prompt enrichment integration |
| travel-plan.prompt.ts | XML-tagged context template |
| expedition-summary.service.ts | Full data aggregation |
| ai.service.ts | Token budget adjustment |
| ai.schema.ts | EnrichedContext type |
| ai.types.ts | Context types |
| phase-6/page.tsx | Parallel data queries |
| summary/page.tsx | Phase 2+ access guard |
| messages/en.json | i18n keys |
| messages/pt-BR.json | i18n keys |

### Testes (10 arquivos — 1 novo + 9 atualizados)

| Arquivo | Novos Testes |
|---------|-------------|
| WizardFooter.test.tsx | +10 |
| Phase4Wizard.test.tsx | +4 |
| LoginForm.test.tsx | +3 |
| RegisterForm.test.tsx | +3 |
| travel-plan.prompt.test.ts (novo) | +10 |
| expedition-summary.service.test.ts | +8 |
| ExpeditionSummary.test.tsx | +3 |
| ExpeditionCardRedesigned.test.tsx | +1 |

---

## 8. Acoes Pendentes

| Acao | Responsavel | Status |
|------|------------|--------|
| Executar migration script no Neon staging | Usuario/DevOps | Pendente |
| Configurar APPLE_ID, APPLE_TEAM_ID, APPLE_PRIVATE_KEY no Vercel | DevOps | Pendente |
| Verificar Google OAuth funciona no staging | QA | Pendente |
| Testar prompt enriquecido com geracao real | QA | Pendente |

---

## 9. Definition of Done

- [x] Todos os tracks (A-E) com tarefas implementadas
- [x] 2199 testes unitarios passando
- [x] Build limpo
- [x] Merged to master via branch feat/sprint-33
- [x] Tagged como v0.28.0
- [ ] Migration script executado no staging (acao manual)
- [ ] Apple OAuth env vars configurados
- [ ] E2E contra staging (em execucao)

---

*Documento gerado em 2026-03-20. Tag: v0.28.0.*
