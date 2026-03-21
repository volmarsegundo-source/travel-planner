---
spec-id: SPEC-RELEASE-004
title: v0.28.0 Release Plan
version: 1.0.0
status: Draft
author: release-manager
sprint: 33
reviewers: [tech-lead]
---

# SPEC-RELEASE-004 — v0.28.0 Release Plan

## Release Info

| Campo | Valor |
|-------|-------|
| Versao | v0.28.0 |
| Branch | `feat/sprint-33` (merge to `master`) |
| Sprint | 33 |
| Tag anterior | v0.27.0 |

## Changelog

### Bug Fixes

- **fix(data):** migracao de trips com Phase 7 inconsistente via `scripts/fix-phase7-trips.ts`

### Features

- **feat(footer):** rodape padronizado de navegacao em todos os wizards [SPEC-PROD-029]
- **feat(phase3):** regras de conclusao da Fase 3 — O Preparo sem bloqueio indevido [SPEC-PROD-030]
- **feat(phase4):** campos obrigatorios da Fase 4 — A Logistica com bloqueio de avanco [SPEC-PROD-031]
- **feat(summary):** redesenho do sumario/relatorio da expedicao com acesso a partir da Fase 2 [SPEC-PROD-032]
- **feat(ai):** enriquecimento do prompt da Fase 6 com dados das fases 1-5 [SPEC-PROD-033]
- **feat(auth):** login social Google e Apple com account linking [SPEC-PROD-034]

## Breaking Changes

**WizardFooter API change**: O componente `WizardFooter` recebe novas props para suportar acoes de save e discard. Codigo que utiliza `WizardFooter` diretamente precisa ser atualizado para passar as novas props.

Props adicionadas:
- `onSave?: () => void` — callback para salvar rascunho
- `onDiscard?: () => void` — callback para descartar alteracoes
- `showSaveDiscard?: boolean` — flag para exibir botoes de save/discard

Componentes afetados: todos os wizards de fase (Phase1Wizard a Phase5Wizard).

## Pre-Deploy

1. Configurar variaveis de ambiente no Vercel (ver SPEC-INFRA-004):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_PRIVATE_KEY`
2. Executar script de migracao de dados:
   ```bash
   npx tsx scripts/fix-phase7-trips.ts
   ```

## Post-Deploy Validation

1. Verificar botoes de login social (Google e Apple) na pagina de login
2. Testar fluxo completo de login via Google OAuth
3. Testar fluxo completo de login via Apple Sign-In
4. Verificar account linking (usuario existente faz login social)
5. Testar geracao de itinerario na Fase 6 com prompt enriquecido (dados de fases 1-5 presentes)
6. Validar rodape padronizado em todos os wizards de fase
7. Confirmar regras de conclusao da Fase 3 e Fase 4
8. Acessar sumario/relatorio a partir da Fase 2

## Rollback Plan

Em caso de regressao critica em producao:
1. Reverter para a tag `v0.27.0`
2. `git revert` do merge commit em `master`
3. Redeploy via Vercel
4. **Nota**: A migracao de dados (`fix-phase7-trips.ts`) e idempotente e nao precisa de rollback

## Release Checklist

- [ ] Todos os testes unitarios passando (`npm run test`)
- [ ] Build limpo sem erros (`npm run build`)
- [ ] Lint passando (`npm run lint`)
- [ ] Sem erros no console do browser
- [ ] Variaveis de ambiente configuradas no Vercel
- [ ] Script de migracao executado com sucesso
- [ ] CHANGELOG.md atualizado
- [ ] Tag `v0.28.0` criada
- [ ] Sprint review documentado em `docs/sprint-reviews/SPRINT-33-review.md`
