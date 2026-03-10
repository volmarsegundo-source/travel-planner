# Sprint 20 -- Release Manager Review

**Reviewer:** release-manager
**Data:** 2026-03-10
**Branch:** feat/sprint-20
**Versao atual:** 0.13.0
**Versao recomendada:** 0.14.0

---

# Change Impact Assessment: Sprint 20 -- Preferences, Passengers, Transport Data Model

**Assessment ID**: CIA-006
**Related Spec / PR**: Sprint 20 (feat/sprint-20)
**Analyst**: release-manager
**Date**: 2026-03-10
**Verdict**: Non-Breaking -- todas as mudancas sao aditivas

---

## 1. Change Summary

Sprint 20 adiciona modelo de dados de preferencias do viajante (10 categorias com chip selectors), passageiros (JSON flat no Trip), e modelos de transporte/acomodacao (TransportSegment, Accommodation). Tambem corrige renderizacao de guias de destino com dados pre-Sprint 19, aplica hash SHA-256 no userId em todos os logs de gamificacao (resolucao de SEC-S19-001), reordena passos do Phase1Wizard (info pessoal antes de trip info), e remove botoes duplicados do ExpeditionCard.

Nenhuma mudanca quebra contratos existentes. Todas as alteracoes de schema sao aditivas (colunas nullable, tabelas novas, campo JSON nullable). Nenhum endpoint publico foi alterado. Nenhuma Server Action teve sua assinatura modificada.

---

## 2. Breaking Change Classification

### API Contract Changes

| Tipo | Mudanca | Breaking? | Razao |
|---|---|---|---|
| Server Action adicionada | `savePreferencesAction`, `getPreferencesAction` | Nao | Aditiva -- nenhum consumidor existente afetado |
| Server Action adicionada | `updateProfileFieldAction` (expandida) | Nao | Assinatura mantida, logica interna estendida |
| Server Action modificada | `deleteUserAccountAction` (cascade transport/accommodation) | Nao | Comportamento externo identico -- apenas garante limpeza completa |
| Comportamento modificado | `PointsEngine` / `PhaseEngine` logs usam `userIdHash` em vez de `userId` | Nao | Formato de log e interno, nao e contrato publico |

### Database Schema Changes

| Mudanca | Breaking? | Migration Necessaria? | Migration |
|---|---|---|---|
| `user_profiles.preferences` (JSONB, nullable, default '{}') | Nao | Sim -- aplicada | `20260310120000_add_user_preferences` |
| `trips.passengers` (JSONB, nullable) | Nao | Sim -- aplicada | `20260310140000_add_passengers_to_trip` |
| `trips.origin` (VARCHAR 150, nullable) | Nao | Sim -- aplicada | `20260310130000_add_transport_and_accommodation` |
| `trips.localMobility` (TEXT[], default []) | Nao | Sim -- aplicada | `20260310130000_add_transport_and_accommodation` |
| Tabela `transport_segments` (nova) | Nao | Sim -- aplicada | `20260310130000_add_transport_and_accommodation` |
| Tabela `accommodations` (nova) | Nao | Sim -- aplicada | `20260310130000_add_transport_and_accommodation` |

Todas as colunas adicionadas sao nullable ou possuem defaults. Nenhuma coluna existente foi removida, renomeada ou teve tipo alterado. Nenhuma constraint NOT NULL foi adicionada a dados existentes.

---

## 3. Affected Consumers

| Consumidor | Tipo | Impacto | Acao Necessaria |
|---|---|---|---|
| `dev-fullstack-1` (Phase1Wizard) | Interno | Reordenacao de passos + skip de info pessoal se perfil preenchido | Nenhuma -- ja implementado |
| `dev-fullstack-2` (PreferencesSection) | Interno | Novo componente UI para preferencias | Nenhuma -- ja implementado |
| `dev-fullstack-1` (Phase2Wizard) | Interno | Novo seletor de passageiros | Nenhuma -- ja implementado |
| `deleteUserAccountAction` | Interno | Cascade expandido para TransportSegment + Accommodation | Nenhuma -- ja implementado |
| Consumidores de logs (observabilidade) | Interno | Campo `userId` renomeado para `userIdHash` em logs de gamificacao | Atualizar queries/dashboards de log se existirem |
| Consumidores externos | N/A | Nenhum -- sistema em Bootstrap Phase, zero usuarios em producao | Nenhuma |

---

## 4. Risk Level

**Overall Risk**: Minimal

**Rationale**:
- Zero usuarios em producao (Bootstrap Phase)
- Todas as mudancas de schema sao aditivas (nullable + defaults + tabelas novas)
- Nenhum endpoint publico alterado
- Nenhuma assinatura de Server Action modificada
- Testes adicionados cobrem todos os novos componentes e schemas
- Migrations sao forward-only, sem transformacao de dados existentes

---

## 5. Migration Plan

Nao aplicavel -- nenhuma breaking change identificada.

---

## 6. Recommended Version Bump

**Current version**: 0.13.0
**Recommended**: MINOR -> 0.14.0

**SemVer rationale**:
- MINOR: novas funcionalidades backward-compatible (preferencias, passageiros, transporte/acomodacao data model, profile persistence skip, Phase 1 reorder)
- Inclui bug fixes (guide rendering, userId hash) que sozinhos seriam PATCH, mas as novas features justificam MINOR
- Pre-1.0: MINOR e o bump padrao para novas funcionalidades

---

## 7. Migration Guide

Nao aplicavel -- nenhuma breaking change.

**Nota para deploy**: Executar `npx prisma migrate deploy` para aplicar as 3 novas migrations antes de iniciar a aplicacao. Nao ha novas variaveis de ambiente. Nao ha novas dependencias npm.

---

## 8. Rollback Plan

Em caso de problema pos-deploy:

1. **Rollback de codigo**: reverter para o commit anterior no master (0.13.0)
2. **Rollback de schema**: as 3 migrations adicionam colunas nullable e tabelas novas. Para rollback completo:
   - `DROP TABLE accommodations;`
   - `DROP TABLE transport_segments;`
   - `ALTER TABLE trips DROP COLUMN passengers, DROP COLUMN origin, DROP COLUMN "localMobility";`
   - `ALTER TABLE user_profiles DROP COLUMN preferences;`
   - Atualizar tabela `_prisma_migrations` removendo as 3 entradas
3. **Dados**: nenhum dado existente e transformado, portanto rollback nao causa perda de dados pre-existentes

---

## 9. Riscos Identificados (Sprint 20)

| Risk ID | Severidade | Categoria | Descricao | Status | Owner |
|---|---|---|---|---|---|
| RISK-013 | FECHADO | PII/Logging | userId logado em cleartext no gamification engine | Fechado | dev-fullstack-1 |

**RISK-013 resolvido**: SEC-S19-001 (userId em cleartext nos logs de gamificacao) foi corrigido neste sprint. Todos os `logger.info()` em `PointsEngine` e `PhaseEngine` agora usam `hashUserId(userId)` em vez do userId raw. 7 ocorrencias corrigidas no PointsEngine, 4 no PhaseEngine.

### Riscos nao resolvidos neste sprint (herdados)

Os seguintes riscos permanecem abertos de sprints anteriores:
- RISK-003 ALTO: `avatarUrl` removido sem verificar dados existentes (Sprint 2)
- RISK-004 ALTO: Health check 503 -- monitors nao atualizados (Sprint 2)
- RISK-005 ALTO: `deploy.yml` placeholder (Sprint 2)
- RISK-006 ALTO: GitHub Actions secrets nao confirmados (Sprint 2)
- RISK-007 MEDIO: `next-auth` pinned em beta (Sprint 2)
- RISK-008 MEDIO: Schema diagram desatualizado em architecture.md (Sprint 2, agravado Sprint 20: TransportSegment, Accommodation, passengers, origin, localMobility, preferences ausentes)
- RISK-009 BAIXO: `typedRoutes` desabilitado (Sprint 2)
- RISK-010 MEDIO: `/api/*` sem security headers (Sprint 6)
- RISK-011 BAIXO: CSP nonce nao propagado ao HTML (Sprint 6)
- RISK-014 BAIXO: "Portugues (Brasil)" sem acento (Sprint 7)
- RISK-015 MEDIO: Footer links 404 (Sprint 7)
- RISK-016 BAIXO: aria-label="Loading" hardcoded ingles (Sprint 7)

**Nota**: RISK-008 agravou-se novamente com Sprint 20. O diagrama de schema em `docs/architecture.md` agora esta ainda mais desatualizado com 2 novos modelos (TransportSegment, Accommodation) e 4 novas colunas em Trip + 1 nova coluna em UserProfile.

---

## 10. Checklist de Release

- [x] Todas as mudancas de schema sao aditivas (nullable/defaults/novas tabelas)
- [x] Nenhuma breaking change identificada
- [x] Nenhuma nova dependencia npm
- [x] Nenhuma nova variavel de ambiente
- [x] 3 migrations aplicaveis via `prisma migrate deploy`
- [x] SEC-S19-001 resolvido (userId hash)
- [x] Cascade de exclusao de conta atualizado para novos modelos
- [x] Testes adicionados para novos componentes e schemas
- [ ] Version bump de 0.13.0 para 0.14.0 em `package.json` (pendente)
- [ ] CHANGELOG-v0.14.0.md gerado (pendente -- sera criado nesta sessao)

---

> Non-Breaking, version bump: MINOR (0.13.0 -> 0.14.0)
