---
spec-id: SPEC-INFRA-003
title: Sprint 32 Infrastructure Review
version: 1.0.0
status: Draft
author: devops-engineer
sprint: 32
reviewers: [tech-lead]
---

# SPEC-INFRA-003 — Sprint 32 Infrastructure Review

## Contexto

O Sprint 32 e um sprint de estabilizacao focado na correcao de bugs P0 identificados na v0.26.0. Nenhuma infraestrutura nova e necessaria.

## Deployment

Pipeline de deployment Vercel existente permanece inalterado. Nenhuma alteracao de configuracao necessaria. O mesmo fluxo `feat/sprint-32 -> master -> Vercel auto-deploy` sera utilizado.

## Database

Nenhuma migracao de schema necessaria. Todas as correcoes sao a nivel de logica (services, engines, components) e nao afetam o data model Prisma. Tabelas existentes (`Trip`, `ExpeditionPhase`, `UserProgress`, etc.) permanecem inalteradas.

## Redis

Patterns existentes de cache e lock permanecem inalterados:
- Rate limiting (Lua script atomico)
- Cache de autocomplete Nominatim/Mapbox
- Session locks

Nenhum novo pattern de cache ou lock foi introduzido neste sprint.

## Monitoring

**Recomendacao**: Adicionar alertas no Vercel Function Logs para erros de transicao de fase. Isso permitira detectar regressoes dos bugs P0-001 (transicao fase 2->3) e P0-006 (transicao fase 5->6) de forma proativa.

Filtros sugeridos:
- `phase-engine` + `error` level
- `PhaseTransitionError` exception class
- HTTP 500 em rotas `/api/expedition/*/phase`

## Environment

Nenhuma nova variavel de ambiente necessaria. O `.env.local` existente permanece valido sem alteracoes.

## Veredicto

**APPROVED** — Nenhum bloqueio de infraestrutura identificado. O sprint pode prosseguir sem alteracoes de infra.
