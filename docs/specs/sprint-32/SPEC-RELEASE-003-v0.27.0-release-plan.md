---
spec-id: SPEC-RELEASE-003
title: v0.27.0 Release Plan
version: 1.0.0
status: Draft
author: release-manager
sprint: 32
reviewers: [tech-lead]
---

# SPEC-RELEASE-003 — v0.27.0 Release Plan

## Release Info

| Campo | Valor |
|-------|-------|
| Versao | v0.27.0 |
| Branch | `feat/sprint-32` (merge to `master`) |
| Sprint | 32 (Stabilization) |
| Tag anterior | v0.26.0 |

## Changelog

### Bug Fixes

- **fix(phase-transition):** resolve P0-001/P0-006 — corrige erros de transicao fase 2->3 e fase 5->6 [SPEC-PROD-025]
- **fix(completion-engine):** resolve P0-002/P0-003/P0-007 — tracking preciso de status de fase e conclusao [SPEC-PROD-026]
- **fix(phase6):** auto-geracao de itinerario na primeira visita [SPEC-PROD-026, UX-006]
- **fix(report):** traducao i18n para todos os valores enum e agregacao completa de dados [SPEC-PROD-027]

### Features

- **feat(ux):** autocomplete side-by-side, preferencias 4+3, nomes de fase na barra de progresso [SPEC-PROD-028]

## Breaking Changes

**NENHUM.** Todas as correcoes sao ajustes comportamentais que corrigem bugs existentes. Nao ha alteracoes de API, schema ou contratos.

## Migration

**NENHUMA.** Nao ha migracoes Prisma neste sprint. Todas as correcoes sao a nivel de logica.

## Rollback Plan

Em caso de regressao critica em producao:
1. Reverter para a tag `v0.26.0`
2. `git revert` do merge commit em `master`
3. Redeploy via Vercel

## Post-Deploy Validation

1. Executar suite E2E completa contra staging (`tests/e2e/phase-completion.spec.ts`)
2. Validar transicoes de fase 2->3 e 5->6 manualmente
3. Verificar geracao automatica de itinerario na fase 6
4. Confirmar traducoes i18n no relatorio (PT e EN)
5. Testar autocomplete side-by-side em tela desktop e mobile

## Release Checklist

- [ ] Todos os testes unitarios passando (`npm run test`)
- [ ] Suite E2E passando (`npm run test:e2e`)
- [ ] Build limpo sem erros (`npm run build`)
- [ ] Sem erros no console do browser
- [ ] Lint passando (`npm run lint`)
- [ ] CHANGELOG.md atualizado
- [ ] Tag `v0.27.0` criada
- [ ] Sprint review documentado em `docs/sprint-reviews/SPRINT-32-review.md`
