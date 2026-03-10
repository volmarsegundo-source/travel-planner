# Changelog -- v0.14.0

**Release Date:** 2026-03-10
**Sprint:** 20
**Branch:** feat/sprint-20

---

## Highlights

- Sistema de preferencias do viajante com 10 categorias estruturadas e UI de chip selectors, integrado ao sistema de gamificacao (badge "Preference Pro" + pontos)
- Modelo de dados de passageiros (adultos, criancas, idosos, bebes) com seletor visual no Phase2Wizard
- Modelos de transporte (TransportSegment) e acomodacao (Accommodation) para a Phase 4 -- Logistics (schema-only, UI no Sprint 21)
- Profile persistence: Phase1Wizard pula info pessoal se o perfil ja estiver preenchido, reordenado para info pessoal antes de trip info
- Resolucao de SEC-S19-001: userId agora e hash SHA-256 em todos os logs de gamificacao

---

## Added

- **Preferencias do viajante** (`preferences.service.ts`, `preferences.schema.ts`): 10 categorias de preferencia (cuisine, activities, accommodation, transport, pace, budget, climate, culture, accessibility, dietary) com validacao Zod e persistencia em JSON no UserProfile
- **PreferencesSection UI** (`PreferencesSection.tsx`, `PreferenceCategory.tsx`, `PreferenceChip.tsx`, `PreferenceProgressBar.tsx`): interface de chip selectors com barra de progresso, salvar automatico via Server Action `savePreferencesAction`
- **Gamificacao de preferencias** (T-S20-008): preencher pelo menos 3 categorias concede badge "Preference Pro" + pontos de gamificacao
- **Passenger data model** (T-S20-009): campo `passengers` (JSON) no Trip para estrutura `{ adults, children, seniors, infants }`
- **Passenger UI** (T-S20-010): seletor estilo companhia aerea no Phase2Wizard com botoes +/- para cada tipo de passageiro
- **TransportSegment model** (T-S20-011): modelo Prisma para segmentos de transporte (voo, onibus, trem, carro, ferry) com criptografia de booking code, custo estimado, e flag ida/volta
- **Accommodation model** (T-S20-011): modelo Prisma para acomodacoes (hotel, hostel, airbnb, casa de amigos, camping) com criptografia de booking code e custo estimado
- **Trip.origin** (T-S20-011): campo opcional para cidade/pais de origem da viagem
- **Trip.localMobility** (T-S20-011): array de meios de transporte local planejados (metro, uber, aluguel, etc.)
- **Validacao Zod de transporte** (`transport.schema.ts`): schemas para TransportSegment e Accommodation com validacao de tipos e datas
- **Validacao Zod de passageiros** (`trip.schema.ts`): schema `passengersSchema` com limites por tipo e validacao de total
- **Cascade de exclusao** (account.actions.ts): TransportSegment e Accommodation agora incluidos na cascata de exclusao de conta (LGPD)

## Changed

- **Phase1Wizard reordenado** (T-S20-004): passos reordenados -- info pessoal (nome, email, data nascimento) agora vem antes de info da viagem (destino, datas)
- **Profile persistence skip** (T-S20-005): se o usuario ja tem perfil preenchido, Phase1Wizard pula automaticamente o passo de info pessoal
- **Phase config**: Phase 4 renomeada internamente de "preparation" para "logistics" para refletir o novo escopo de transporte e acomodacao
- **Traducoes expandidas** (messages/en.json, messages/pt-BR.json): +189 chaves em ingles e +188 chaves em portugues para preferencias, passageiros, transporte e acomodacao

## Fixed

- **Guide rendering** (T-S20-001): corrigido crash no `DestinationGuideWizard` quando `sections` e `undefined` ou quando guias pre-Sprint 19 (formato de 6 secoes) sao carregados. Guard `Array.isArray(sections)` adicionado com fallback gracioso
- **userId hash nos logs** (T-S20-003, SEC-S19-001): todas as 11 ocorrencias de `userId` em cleartext nos logs de `PointsEngine` (7) e `PhaseEngine` (4) agora usam `hashUserId()` com SHA-256. Campo renomeado de `userId` para `userIdHash`

## Security

- **SEC-S19-001 resolvido**: informacao de identificacao pessoal (userId) removida de logs de gamificacao. Substituida por hash SHA-256 unidirecional. Severidade: LOW (apenas logs internos, sem exposicao externa)

## Deprecated

- Nenhuma deprecacao neste release

## Removed

- **Botoes duplicados no ExpeditionCard** (T-S20-002, DEBT-S18-001): removidos botoes de atalho "Checklist" e "Roteiro/Itinerario" que duplicavam funcionalidade ja presente no PhaseToolsBar

---

## Database Migrations

| Migration | Descricao |
|---|---|
| `20260310120000_add_user_preferences` | Adiciona coluna `preferences` (JSONB, default '{}') na tabela `user_profiles` |
| `20260310130000_add_transport_and_accommodation` | Adiciona colunas `origin`, `localMobility` na tabela `trips`; cria tabelas `transport_segments` e `accommodations` com indexes e FKs cascade |
| `20260310140000_add_passengers_to_trip` | Adiciona coluna `passengers` (JSONB, nullable) na tabela `trips` |

**Instrucao de deploy**: `npx prisma migrate deploy` antes de iniciar a aplicacao.

---

## Breaking Changes

Nenhuma breaking change neste release. Todas as mudancas de schema sao aditivas (colunas nullable, defaults, tabelas novas).

---

## Migration Notes

- **Prisma**: executar `npx prisma migrate deploy` para aplicar as 3 novas migrations
- **Variaveis de ambiente**: nenhuma nova variavel necessaria
- **Dependencias npm**: nenhuma nova dependencia adicionada
- **Rollback**: todas as migrations sao reversiveis via DROP TABLE/COLUMN (ver CIA-006 Section 8)

---

## Commit Log

| Hash | Mensagem |
|---|---|
| `44b5cfe` | docs(sprint-20): planning -- backlog, tasks, architecture, UX specs |
| `0426c09` | fix(sprint-20): T-S20-001 -- guard undefined sections in DestinationGuideWizard |
| `c5b8f1a` | feat(sprint-20): T-S20-002 -- remove duplicate checklist/itinerary shortcut buttons from ExpeditionCard |
| `c72feb6` | fix(sprint-20): T-S20-003 -- hash userId in gamification engine log calls |
| `d71179f` | feat(sprint-20): T-S20-006 -- preferences schema with 10 categories, Zod validation, service |
| `17eaea9` | feat(sprint-20): T-S20-008 -- preferences gamification with points and badge |
| `4bd2ae4` | feat(sprint-20): T-S20-007 -- preferences UI with chip-based selectors |
| `b779a28` | feat(sprint-20): T-S20-011 -- transport and accommodation data models |
| `726e905` | feat: reorder Phase 1 wizard steps -- personal info before trip info (T-S20-004) |
| `1082ea1` | feat: profile persistence -- skip personal info if already filled (T-S20-005) |
| `2cd4276` | feat: passenger data model -- flat JSON field on Trip (T-S20-009) |
| `8d6a9a6` | fix(sprint-20): T-S20-012 -- fix test regressions from Phase 4 rename and transport cascade |
| `164a175` | feat: passenger UI -- airline-style selector in Phase2Wizard (T-S20-010) |
| `9844e58` | docs: mark dev-fullstack-1 Sprint 20 tasks as complete |
| `a616edf` | docs(sprint-20): security review -- APPROVED + dev memory updates |
