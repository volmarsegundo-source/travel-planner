# Travel Planner — Backlog & Tarefas

**Versão**: 1.0.0
**Atualizado em**: 2026-02-23
**Responsável**: product-owner
**Sprint atual**: 1

---

## Matriz de Pontuacao de Features

> Formula de pontuacao: `User Value x2 + Business Value x2 + Effort + Risk + Dependency`
>
> Effort e Risk sao pontuados de forma inversa (1 = alto esforco/risco, 5 = baixo esforco/risco).
> Dependency: quanto maior, mais features dependem desta para existir.

| Feature | User Value (x2) | Business Value (x2) | Effort inv. | Risk inv. | Dependency | Total Score |
|---|---|---|---|---|---|---|
| Criacao e gestao de viagens | 5 | 5 | 4 | 4 | 5 | **33** |
| Construtor de itinerario | 5 | 4 | 3 | 3 | 4 | **28** |
| Busca e descoberta de destinos | 4 | 3 | 3 | 3 | 3 | **23** |
| Planejamento colaborativo | 4 | 4 | 2 | 2 | 2 | **22** |
| Controle de orcamento | 3 | 3 | 4 | 4 | 2 | **22** |
| Integracao com reservas | 4 | 5 | 1 | 1 | 1 | **21** |
| Gerenciador de lista de malas | 2 | 2 | 5 | 5 | 1 | **19** |

### Justificativa da Pontuacao

**Criacao e gestao de viagens (33 pontos)** lidera com margem significativa porque:
- E o objeto central do dominio: sem uma `Trip`, nenhuma outra feature existe (Dependency = 5)
- Entrega valor imediato ao viajante no primeiro uso — o produto literalmente nao funciona sem ela
- Esforco moderado-baixo: CRUD autenticado bem definido, sem dependencias externas ou complexidade de tempo real
- Risco baixo: padrao estabelecido, schema ja definido na arquitetura, sem integracao de terceiros
- A arquitetura ja previu a estrutura: `trips/`, `trips/new/`, `trips/[id]/`, `TripService`, `trip.actions.ts`

**Construtor de itinerario (28 pontos)** e o segundo mais importante mas dependente diretamente de US-001.

**Busca de destinos (23 pontos)** e valiosa mas requer dados de destinos pre-populados e integracao Mapbox — complexidade adicional que justifica adiamento para Sprint 2.

**Integracao com reservas (21 pontos)** tem alto Business Value mas Effort e Risk extremamente baixos na pontuacao (alto esforco/risco real): escopo de PCI-DSS, integracao GDS/NDC — inadequado para MVP com 2 devs.

---

## Em Andamento

### US-001: Criacao e Gestao de Viagens

**Tipo**: Must Have
**Prioridade**: P0
**Status**: In Progress
**Sprint**: 1
**Spec**: SPEC-001 — aprovado
**Security**: SEC-SPEC-001 — CLEARED WITH CONDITIONS
**QA**: QA-SPEC-001 — aprovado
**Release**: CIA-001 — v0.1.0
**Task Breakdown**: ver [Sprint 1 — Task Breakdown](#sprint-1--task-breakdown-spec-001) abaixo

---

#### User Story

As a leisure traveler or business traveler,
I want to create a trip with a title, destination, date range, and optional description,
So that I have a central place to organize all information about my upcoming journey and can manage my trips in one dashboard.

---

#### Personas

- **Primaria** — `@leisure-solo` e `@leisure-family`: viajante que planeja uma viagem com antecedencia, quer registrar datas, destino e detalhes basicos antes de comecar a montar o roteiro. Frequentemente acessa pelo celular.
- **Secundaria** — `@business-traveler`: profissional que precisa registrar viagens corporativas rapidamente, com datas precisas e destino definido, para depois adicionar atividades ao itinerario.

---

#### Contexto do Viajante

- **Dor atual**: viajantes usam planilhas, notas de celular, ou grupos de WhatsApp para registrar os dados basicos de uma viagem — informacoes ficam fragmentadas, sem um "ponto central de verdade".
- **Solucao atual (workaround)**: Google Sheets, Notion, Apple Notes, Google Docs. Nenhuma dessas ferramentas foi projetada para viagens — faltam campos especificos (datas de ida/volta, destino, status da viagem).
- **Frequencia da dor**: ocorre a cada nova viagem planejada. Pesquisa Amadeus Travel Trends 2024 indica que viajantes de lazer planejam em media 2,4 viagens internacionais por ano; viajantes corporativos, 8+ por ano.

---

#### Criterios de Aceite

**Autenticacao e acesso**
- [ ] AC-001: Dado que um usuario nao autenticado tenta acessar `/trips`, quando a pagina carrega, entao ele e redirecionado para a pagina de login com o parametro `callbackUrl=/trips`.
- [ ] AC-002: Dado que um usuario autenticado acessa `/trips`, quando a pagina carrega, entao ele ve apenas suas proprias viagens (isolamento por `userId`).

**Criacao de viagem**
- [ ] AC-003: Dado que um usuario autenticado esta em `/trips/new`, quando preenche titulo (obrigatorio, max 100 chars), destino (obrigatorio), data de inicio e data de fim, e clica em "Criar viagem", entao a viagem e criada e o usuario e redirecionado para `/trips/[id]`.
- [ ] AC-004: Dado que o usuario submete o formulario com data de fim anterior a data de inicio, quando o formulario e validado, entao uma mensagem de erro e exibida no campo de data de fim: "A data de retorno deve ser posterior a data de partida".
- [ ] AC-005: Dado que o usuario submete o formulario com campos obrigatorios em branco, quando o formulario e validado, entao cada campo invalido exibe sua mensagem de erro especifica sem recarregar a pagina.
- [ ] AC-006: Dado que o usuario cria uma viagem com sucesso, quando redirecionado para `/trips/[id]`, entao a pagina exibe o titulo, destino, periodo e status "Planejando" como padrao.
- [ ] AC-007: Dado que um usuario tenta criar mais de 20 viagens ativas, quando submete o formulario, entao recebe a mensagem "Limite de 20 viagens ativas atingido. Arquive ou exclua uma viagem para continuar." (limite de negocio MVP).

**Listagem de viagens**
- [ ] AC-008: Dado que o usuario tem viagens criadas, quando acessa `/trips`, entao ve a lista ordenada por data de inicio (proximas primeiro), com titulo, destino, periodo e status de cada viagem.
- [ ] AC-009: Dado que o usuario nao tem viagens, quando acessa `/trips`, entao ve um estado vazio com chamada para acao "Criar minha primeira viagem".
- [ ] AC-010: Dado que o usuario tem mais de 20 viagens, quando acessa `/trips`, entao a listagem e paginada com 20 itens por pagina, com controles de navegacao.

**Edicao de viagem**
- [ ] AC-011: Dado que o usuario acessa `/trips/[id]/edit`, quando edita qualquer campo e salva, entao as alteracoes sao persistidas e o usuario e redirecionado para `/trips/[id]` com os dados atualizados.
- [ ] AC-012: Dado que um usuario tenta acessar `/trips/[id]/edit` de uma viagem que nao lhe pertence, quando a pagina e carregada, entao recebe resposta 403 e mensagem "Voce nao tem permissao para editar esta viagem".

**Exclusao / arquivamento**
- [ ] AC-013: Dado que o usuario clica em "Arquivar viagem", quando confirma na caixa de dialogo, entao o campo `status` da viagem muda para `ARCHIVED` e ela sai da listagem principal (soft delete nao aplicado — viagem permanece acessivel via filtro "Arquivadas").
- [ ] AC-014: Dado que o usuario clica em "Excluir viagem", quando confirma na caixa de dialogo de confirmacao (com campo de digitacao do titulo), entao `deletedAt` e preenchido (soft delete) e a viagem desaparece de todas as listagens.

**Performance e acessibilidade**
- [ ] AC-015: Dado que o usuario acessa `/trips` com conexao 4G media, quando a pagina carrega, entao o First Contentful Paint ocorre em menos de 1,5 segundos (medido com Lighthouse em ambiente de producao).
- [ ] AC-016: O formulario de criacao de viagem deve ser completamente operavel via teclado e compativel com leitores de tela (WCAG 2.1 AA). Todos os campos devem ter `label` associado e mensagens de erro vinculadas via `aria-describedby`.
- [ ] AC-017: Dado que o usuario esta em dispositivo movel (viewport 375px), quando acessa `/trips` ou `/trips/new`, entao todos os elementos sao visiveis e interagiveis sem scroll horizontal.

---

#### Campos do Formulario de Criacao

| Campo | Tipo | Obrigatorio | Validacao |
|---|---|---|---|
| Titulo da viagem | Texto (input) | Sim | Min 3 chars, max 100 chars |
| Destino principal | Texto (input) + autocomplete futuro | Sim | Min 2 chars, max 150 chars |
| Data de partida | Date picker | Sim | Nao pode ser no passado para novas viagens |
| Data de retorno | Date picker | Sim | Deve ser >= data de partida |
| Descricao / notas | Textarea | Nao | Max 500 chars |
| Imagem de capa | Upload ou URL | Nao | Fora do escopo v1 — campo reservado no schema |

---

#### Fora do Escopo (v1)

- Upload de imagem de capa — o schema reserva `coverImageUrl` mas a UI de upload sera implementada em Sprint 2
- Autocomplete de destino via Mapbox Geocoding API — campo de texto livre no v1
- Compartilhamento de viagem com outros usuarios (feature de planejamento colaborativo — US-004)
- Convite de co-viajantes na criacao
- Templates de viagem (ex: "viagem de negocios padrao")
- Integracao com calendario externo (Google Calendar, Outlook)
- Duplicar viagem existente
- Exportar viagem em PDF

---

#### Metricas de Sucesso

- Taxa de conclusao do formulario de criacao >= 85% (usuarios que iniciam o formulario e completam com sucesso)
- Abandono na tela `/trips/new` <= 15%
- Tempo medio para criar uma viagem (do clique em "Nova viagem" ate o redirect para `/trips/[id]`) <= 60 segundos
- Zero erros 500 em fluxos de criacao/edicao/exclusao nas primeiras 2 semanas apos deploy
- NPS da feature medido via micro-survey in-app apos criacao (meta: score >= 40 para MVP)

---

#### Justificativa de Priorizacao

**US-001 recebeu a maior pontuacao na matriz (33 pontos)** por tres razoes estruturais:

1. **Dependencia total**: O objeto `Trip` e a entidade central do dominio. O construtor de itinerario (US-002), a busca de destinos vinculada a uma viagem (US-003), o controle de orcamento (US-005) e o planejamento colaborativo (US-004) sao todos dependentes da existencia de uma `Trip`. Sem US-001, nenhuma outra feature do MVP pode ser desenvolvida ou testada com dados reais de usuario.

2. **Primeiro valor entregue ao viajante**: Um usuario novo que faz cadastro e nao consegue criar uma viagem imediatamente abandona o produto. A criacao de viagem e o "aha moment" da aplicacao — o instante em que o produto se torna concreto para o viajante.

3. **Risco e esforco justificados para Sprint 1**: A complexidade tecnica e bem delimitada (CRUD autenticado, validacao Zod, Server Actions, Prisma), sem dependencia de APIs externas pagas ou integracoes de terceiros. A equipe de 2 desenvolvedores pode entregar esta feature com qualidade e cobertura de testes em um unico sprint.

---

## Backlog

### Must Have — P0

- [ ] US-001: Criacao e gestao de viagens — criar, listar, editar e arquivar viagens com datas e destino (**Em andamento — Sprint 1**)
- [ ] US-002: Construtor de itinerario — adicionar dias e atividades a uma viagem existente, com ordenacao e horarios
- [ ] US-003: Autenticacao de usuarios — cadastro, login com email/senha e OAuth (Google), logout, sessao persistente

> Nota: US-003 e tecnicamente pre-requisito para US-001, mas como a arquitetura de autenticacao (Auth.js v5) esta definida no ADR-001, a implementacao de auth sera desenvolvida em paralelo na Sprint 1 pelo segundo desenvolvedor.

---

### Should Have — P1

- [ ] US-004: Busca e descoberta de destinos — pesquisa full-text de destinos com filtros (regiao, tipo), cache Redis, exibicao em mapa Mapbox
- [ ] US-005: Salvar destinos favoritos (Bookmarks) — salvar e remover destinos da lista de favoritos, acessivel em `/bookmarks`
- [ ] US-006: Perfil e configuracoes do usuario — editar nome, avatar, preferencias de notificacao, deletar conta (GDPR)

---

### Could Have — P2

- [ ] US-007: Controle de orcamento por viagem — registrar gastos planejados vs realizados, categorias (hospedagem, transporte, alimentacao), total consolidado
- [ ] US-008: Gerenciador de lista de malas — checklist de itens por viagem, com categorias e status de empacotamento
- [ ] US-009: Compartilhamento de itinerario (somente leitura) — gerar link publico para visualizacao do itinerario sem login
- [ ] US-010: Imagem de capa da viagem — upload de imagem ou selecao de foto do destino via Unsplash API

---

### Won't Have (v1)

- Planejamento colaborativo em tempo real (convite de co-editores) — complexidade de permissoes e sincronizacao em tempo real (WebSocket/CRDT) inadequada para MVP com equipe de 2 devs; avaliar para v2
- Integracao com reservas (voos, hoteis) — escopo PCI-DSS, integracao GDS/NDC; requer security-specialist dedicado e arquitetura de pagamentos; roadmap v2+
- Aplicativo mobile nativo (iOS/Android) — responsive web cobre o MVP; app nativo requer decisao de BFF pattern e stack mobile; roadmap v3
- Notificacoes por email (lembretes de viagem) — requer escolha de provider (Resend/SendGrid) e pipeline de eventos; backlog v2
- Importacao de reservas via email (parsing de confirmacoes) — alto esforco de ML/NLP; roadmap v3
- Multi-tenancy / contas de agencias de viagem — requer camada `Organization` no schema antes da primeira migration; decisao arquitetural pendente (ver Open Questions em architecture.md)
- Suporte offline / PWA — Service Worker + estrategia de sync local; avaliar para v2 com base em metricas de uso mobile

---

## Concluido

_Nenhuma feature concluida ainda — projeto em fase de bootstrap._

---

## Historico de Revisoes

| Versao | Data | Autor | Alteracoes |
|---|---|---|---|
| 1.0.0 | 2026-02-23 | product-owner | Versao inicial — matriz de pontuacao, US-001, backlog MVP completo |
| 1.1.0 | 2026-02-23 | tech-lead | Adicao do Sprint 1 Task Breakdown (SPEC-001); atualizacao de status de US-001 |

---

## Sprint 1 — Task Breakdown (SPEC-001)

**Sprint goal**: Entregar US-001 Trip Creation & Management ao ambiente de staging, aprovando todos os quality gates de QA e seguranca definidos em QA-SPEC-001 e SEC-SPEC-001.
**Start date**: 2026-02-23
**Target**: Phase 3 ready — staging deploy, QA sign-off, security clearance verificada

---

### Parallelization Map

```
Day 1:
  dev-fullstack-1: [TASK-001] Read all specs + setup branch
  dev-fullstack-2: [TASK-002] Read all specs + setup branch

Day 2 (parallel):
  dev-fullstack-1: [TASK-003] Prisma schema + migration + soft-delete extension (Prisma 7 db.$extends)
  dev-fullstack-2: [TASK-004] US-003 prerequisite: confirmar tabela users existe + shared types + error classes

Day 3 (parallel):
  dev-fullstack-1: [TASK-005] Zod validation schemas + unit tests (trip.schema.test.ts)
  dev-fullstack-2: [TASK-006] UI primitive components: StatusBadge, TripCounter, CoverPicker, EmojiPicker

Day 4 (parallel):
  dev-fullstack-1: [TASK-007] TripService: createTrip + getTripById + listTrips + unit tests
  dev-fullstack-2: [TASK-008] TripCard + TripGrid + TripHero + TripInfoHeader (com mock data)

Day 5 (parallel):
  dev-fullstack-1: [TASK-009] TripService: updateTrip + archiveTrip + deleteTrip + unit tests
  dev-fullstack-2: [TASK-010] TripForm Client Component (sem action conectada ainda)

Day 6 (parallel):
  dev-fullstack-1: [TASK-011] Server Actions: createTrip + updateTrip + archiveTrip + deleteTrip
  dev-fullstack-2: [TASK-012] ConfirmArchiveDialog + ConfirmDeleteDialog + cache/keys.ts

Day 7 (parallel):
  dev-fullstack-1: [TASK-013] Redis cache integration no TripService + invalidation
  dev-fullstack-2: [TASK-014] Paginas Server Components: /trips, /trips/new, /trips/[id], /trips/[id]/edit

Day 8 (sequential — depende de TASK-011, TASK-013, TASK-014):
  dev-fullstack-1: [TASK-015] Integration tests: trip.service.integration.test.ts
  dev-fullstack-2: [TASK-016] E2E tests: trip-creation.spec.ts + trip-management.spec.ts + trip-security.spec.ts

Day 9 (sequential — depende de TASK-015, TASK-016):
  dev-fullstack-1 + dev-fullstack-2: [TASK-017] Accessibility + mobile viewport tests + a11y scan
  dev-fullstack-1: [TASK-018] Security tasks: FIND-M-001 + FIND-M-002 verification (durante implementacao)

Day 10:
  dev-fullstack-1: [TASK-019] PR preparation + code review self-checklist
  dev-fullstack-2: [TASK-019] PR preparation + code review self-checklist
```

**Dependencias criticas**:
- TASK-003 (migration) depende de TASK-004 (users table confirmada) — CIA-001 ordering constraint
- TASK-007 e TASK-009 (TripService) dependem de TASK-003 (schema Prisma gerado)
- TASK-011 (Server Actions) depende de TASK-007 + TASK-009 (TripService completo) e TASK-005 (schemas Zod)
- TASK-013 (Redis cache) depende de TASK-007 + TASK-009 (TripService metodos existem)
- TASK-014 (paginas) depende de TASK-008 (componentes UI), TASK-010 (TripForm), TASK-012 (dialogs)
- TASK-015 + TASK-016 (testes) dependem de TASK-011 + TASK-013 + TASK-014 (feature completa)

---

### dev-fullstack-1 Tasks

#### TASK-001: Read all specs + setup branch (Day 1)

**Assigned to**: dev-fullstack-1
**Depends on**: nothing
**Parallel with**: TASK-002
**Estimated**: 2h
**Branch**: `feat/trip-creation-dev1`

**Description**: Ler os seguintes documentos na integra antes de escrever qualquer linha de codigo:
- `docs/SPEC-001.md` — spec tecnico completo (prestar atencao especial nas secoes 3.2, 4.1, 7, 11.4)
- `docs/QA-SPEC-001.md` — estrategia de testes e definition of done
- `docs/SEC-SPEC-001.md` — achados de seguranca: FIND-M-001 e FIND-M-002 sao obrigatorios
- `docs/CIA-001.md` — prerequisitos de deployment e ordering constraint (users table antes da trips migration)
- `docs/architecture.md` — convencoes, estrutura de pastas, padroes de servidor

Anotar: (1) o padrao correto do redirect fora do try/catch (SPEC-001 secao 11.4 x secao 4.1), (2) que `db.$use` esta deprecated no Prisma 7 e deve usar `db.$extends`.

**Done when**: Branch criada a partir de `main`; desenvolvedor consegue articular os dois achados de seguranca FIND-M-001 e FIND-M-002 em comentario no PR de abertura.

---

#### TASK-003: Prisma schema + migration + soft-delete extension (Day 2)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-001 (specs lidas), TASK-004 (confirmacao que users table existe)
**Parallel with**: TASK-004
**Estimated**: 4h
**Spec ref**: SPEC-001 §3.1 (Prisma Schema), §3.2 (Migration + Soft Delete), CIA-001 §Database Changes

**Description**: Implementar o modelo `Trip` no `prisma/schema.prisma`, gerar a migration e implementar o middleware de soft delete usando a API correta do Prisma 7.

Arquivos a criar/modificar:
- `prisma/schema.prisma` — adicionar enums `TripStatus`, `TripVisibility` e modelo `Trip` conforme SPEC-001 §3.1
- Executar `npx prisma migrate dev --name create_trips_table` para gerar a migration SQL
- `src/server/db/client.ts` — adicionar soft-delete extension usando `db.$extends` (NAO `db.$use` — FIND-M-002)
- `npx prisma generate` para regenerar o client TypeScript

Verificar antes de commitar:
- A foreign key `trips_userId_fkey` so pode ser criada se a tabela `users` ja existir (CIA-001 ordering constraint). Se a tabela nao existir ainda, coordenar com dev-fullstack-2 (TASK-004) antes de rodar a migration.
- A implementacao do soft delete usa `db.$extends` — confirmar na documentacao do Prisma 7 qual e a API exata de query extension para interceptar `findMany`, `findFirst`, `findUnique`.

**Done when**:
- `npx prisma migrate dev` roda sem erro
- `npx prisma generate` completa sem erro
- `src/server/db/client.ts` usa `db.$extends` (nao `db.$use`)
- O client TypeScript reconhece o modelo `Trip` com todos os campos e enums
- Todos os 3 indexes compostos estao presentes no schema (`userId+deletedAt`, `userId+status+deletedAt`, `userId+startDate+deletedAt`)

---

#### TASK-005: Zod validation schemas + unit tests (Day 3)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-001 (specs lidas)
**Parallel with**: TASK-006
**Estimated**: 4h
**Spec ref**: SPEC-001 §3.3 (Validation Rules), §4.1 (Zod schemas), SEC-SPEC-001 SR-006, SR-007

**Description**: Criar o arquivo de schemas Zod e os testes unitarios correspondentes.

Arquivos a criar:
- `src/lib/validations/trip.schema.ts` — implementar `TripCreateSchema`, `TripUpdateSchema`, `TripArchiveSchema`, `TripDeleteSchema` conforme SPEC-001 §4.1
- `tests/unit/lib/validations/trip.schema.test.ts` — todos os casos UV-001 a UV-037 definidos em QA-SPEC-001 §3

Requisitos de seguranca obrigatorios (SEC-SPEC-001):
- SR-006: `coverEmoji` deve usar regex Unicode ou enum explicito — `z.string().max(10)` sozinho nao e suficiente. Implementar validacao conforme FIND-L-001.
- SR-007: `confirmationTitle` em `TripDeleteSchema` deve ter `.max(100)`.
- Mass assignment: confirmar que nenhum schema aceita `id`, `userId`, `status`, `deletedAt`, `visibility` do input do usuario.

**Done when**:
- Todos os testes UV-001 a UV-037 passam
- Cobertura de `src/lib/validations/trip.schema.ts` >= 80%
- `coverEmoji` rejeita `\x00` e U+202E (SEC-T-016, SEC-T-017)
- `confirmationTitle` rejeita strings > 100 chars (UV-035)
- Schemas nao aceitam campos desconhecidos (`id`, `userId`, `status`, `deletedAt` sao stripados — UV-026 a UV-029)

---

#### TASK-007: TripService — createTrip, getTripById, listTrips + unit tests (Day 4)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-003 (schema e client Prisma prontos), TASK-005 (schemas Zod prontos)
**Parallel with**: TASK-008
**Estimated**: 6h
**Spec ref**: SPEC-001 §6.2 (Trip Limit), §6.3 (Soft Delete Policy), §7.1 (Authorization Model), §7.3 (Mass Assignment Prevention), §9.2 (Cache Keys)

**Description**: Implementar os metodos de leitura e criacao do TripService.

Arquivos a criar:
- `src/server/services/trip.service.ts` — metodos: `createTrip`, `getTripById`, `listTrips`
- `src/server/cache/keys.ts` — `CacheKeys.tripsList`, `CacheKeys.tripsCount`, `CacheKeys.tripDetail`
- `src/lib/constants.ts` — `MAX_ACTIVE_TRIPS = 20`
- `src/types/trip.types.ts` — `TripCardData`, `TripDetailData` (subsets seguros do modelo)
- `tests/unit/server/services/trip.service.test.ts` — testes UT-001 a UT-013, UT-029 a UT-033 (QA-SPEC-001 §3)

Padroes obrigatorios (SEC-SPEC-001):
- SR-005: TODOS os `db.trip.findFirst`, `db.trip.findMany`, `db.trip.create` devem ter `select` explicito — nunca retornar o modelo Prisma completo.
- Ownership: TODA query deve incluir `userId` no `where` junto com `deletedAt: null`. Nunca buscar por `id` isolado (BOLA mitigation — UT-013).
- `NotFoundError` quando trip nao encontrada ou de outro usuario — nunca `ForbiddenError` (evita enumeracao — UT-010).
- `assertTripLimitNotReached` deve ser a primeira operacao antes de qualquer `db.trip.create` (UT-003).
- Mapeamento explicito de campos no `db.trip.create` — sem spread do input do usuario (UT-008).
- OQ-003 resolvido: `listTrips` aceita parametro `status` com default `["PLANNING", "ACTIVE", "COMPLETED"]`; passar `["ARCHIVED"]` para tab de arquivadas.

**Done when**:
- Testes UT-001 a UT-013 e UT-029 a UT-033 passam
- Nenhuma chamada Prisma omite clausula `select`
- Nenhuma chamada Prisma usa `db.trip.findUnique` sem `userId` no where
- `src/lib/constants.ts` exporta `MAX_ACTIVE_TRIPS = 20`

---

#### TASK-009: TripService — updateTrip, archiveTrip, deleteTrip + unit tests (Day 5)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-007 (estrutura do TripService estabelecida)
**Parallel with**: TASK-010
**Estimated**: 5h
**Spec ref**: SPEC-001 §6.1 (Status Machine), §6.3 (Soft Delete Policy), §8 (Error Handling)

**Description**: Implementar os metodos de mutacao do TripService e a maquina de estados.

Adicionar ao arquivo `src/server/services/trip.service.ts`:
- `updateTrip(userId, tripId, data)` — atualiza apenas campos fornecidos; rejeita `status` do input (UT-016)
- `archiveTrip(userId, tripId)` — muda `status` para `ARCHIVED`; NAO seta `deletedAt` (UT-020); valida transicao de estado (UT-022)
- `deleteTrip(userId, tripId, confirmationTitle)` — seta `deletedAt`; valida `confirmationTitle === trip.title` case-sensitive (UT-027, UT-028); NUNCA chama `db.trip.delete()` (UT-024)
- `isValidStatusTransition(from, to)` — maquina de estados conforme SPEC-001 §6.1
- `VALID_STATUS_TRANSITIONS` map

Adicionar ao arquivo `src/lib/errors.ts`:
- `TripErrorCodes` object com: `TRIP_NOT_FOUND`, `TRIP_LIMIT_REACHED`, `INVALID_STATUS_TRANSITION`, `INVALID_CONFIRMATION_TITLE`

Adicionar ao arquivo `tests/unit/server/services/trip.service.test.ts`:
- Testes UT-014 a UT-028 e UT-034 a UT-043 (QA-SPEC-001 §3)

**Done when**:
- Testes UT-014 a UT-043 passam
- `db.trip.delete()` nunca e chamado em nenhum caminho de codigo (UT-024)
- `archiveTrip` nao seta `deletedAt` (UT-020)
- `deleteTrip` valida `confirmationTitle` antes de qualquer operacao de escrita (UT-027)
- `isValidStatusTransition` cobre todas as transicoes validas e invalidas (UT-034 a UT-043)

---

#### TASK-011: Server Actions — createTrip, updateTrip, archiveTrip, deleteTrip (Day 6)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-007 (TripService metodos de leitura/criacao), TASK-009 (TripService metodos de mutacao), TASK-005 (schemas Zod)
**Parallel with**: TASK-012
**Estimated**: 5h
**Spec ref**: SPEC-001 §4.1 (Server Actions), SEC-SPEC-001 SR-001, SR-003, SR-004

**Description**: Implementar as quatro Server Actions no arquivo `src/server/actions/trip.actions.ts`.

ATENCAO CRITICA — FIND-M-001 (SEC-SPEC-001): O codigo de exemplo em SPEC-001 §4.1 para `createTrip` esta ERRADO — `redirect()` esta dentro do try/catch. Usar EXCLUSIVAMENTE o padrao correto documentado em SPEC-001 §11.4:

```typescript
// CORRETO — redirect() FORA do try/catch
let tripId: string;
try {
  const trip = await TripService.createTrip(session.user.id, parsed.data);
  tripId = trip.id;
} catch (error) { ... return error; }
revalidatePath("/trips");
redirect(`/trips/${tripId!}`);
```

SR-003 — cada uma das quatro Server Actions DEVE:
1. Chamar `await auth()` como PRIMEIRA instrucao absoluta
2. Fazer parse do input com o schema Zod correspondente antes de qualquer chamada ao service
3. Passar `session.user.id` (NUNCA userId do input) ao TripService
4. Chamar `redirect()` FORA de qualquer bloco try/catch
5. Retornar o shape de erro padronizado em caso de falha

SR-004: A funcao `track()` para analytics DEVE verificar `hasAnalyticsConsent()` como primeira operacao antes de despachar qualquer evento.

Arquivos a criar:
- `src/server/actions/trip.actions.ts` — quatro actions: `createTrip`, `updateTrip`, `archiveTrip`, `deleteTrip`

**Done when**:
- Nenhum `redirect()` esta dentro de um bloco `try` ou `catch` em nenhuma action
- `await auth()` e a primeira linha de cada action
- `userId` vem exclusivamente de `session.user.id` — nunca do FormData
- Cada action importa `"use server"` e `"server-only"`
- Testes SEC-T-007, SEC-T-008, SEC-T-009 passam (auth enforcement)
- Testes SEC-T-001, SEC-T-002 passam (redirect pattern)

---

#### TASK-013: Redis cache integration + invalidation (Day 7)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-007 + TASK-009 (TripService completo), TASK-012 (cache/keys.ts)
**Parallel with**: TASK-014
**Estimated**: 3h
**Spec ref**: SPEC-001 §9.2 (Caching Strategy), SEC-SPEC-001 FIND-L-003

**Description**: Integrar as cache keys Redis ao TripService e implementar invalidation apos cada mutacao.

Modificar `src/server/services/trip.service.ts`:
- Apos `createTrip`: invalidar `CacheKeys.tripsList(userId)` e `CacheKeys.tripsCount(userId)`
- Apos `updateTrip`: invalidar `CacheKeys.tripDetail(tripId)`, `CacheKeys.tripsList(userId)`, `CacheKeys.tripsCount(userId)`
- Apos `archiveTrip`: invalidar os mesmos tres keys
- Apos `deleteTrip`: invalidar os mesmos tres keys
- Usar `Promise.all([...])` para invalidation em paralelo — nunca sequencial

Modificar `src/server/cache/redis.ts` (ou criar se nao existir) — Redis client singleton (Upstash).

Nota FIND-L-003 (SEC-SPEC-001): `trips:detail:{tripId}` nao e escopada por `userId`. Documentar em `src/server/cache/keys.ts` que entradas `tripDetail` so devem ser lidas APOS verificacao de propriedade ter sido feita no service — nunca antes.

**Done when**:
- Invalidation ocorre apos cada mutacao (`Promise.all` com os tres keys afetados)
- O comentario de seguranca sobre `tripDetail` esta presente em `src/server/cache/keys.ts`
- Testes de integracao IT-003, IT-004 confirmam que cache e invalidado corretamente

---

#### TASK-015: Integration tests (Day 8)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-011 (Server Actions completas), TASK-013 (Redis cache integrado), TASK-014 (paginas prontas)
**Parallel with**: TASK-016
**Estimated**: 5h
**Spec ref**: QA-SPEC-001 §4 (Integration Tests), SEC-SPEC-001 CR-003

**Description**: Implementar os testes de integracao contra PostgreSQL real via Docker.

Arquivo a criar: `tests/integration/trip.service.integration.test.ts`

Cenarios obrigatorios (QA-SPEC-001 §4):
- IT-001: `createTrip` persiste no banco e retorna objeto com `id` CUID2 valido
- IT-002: `getTripById` nao retorna trips de outro usuario (isolamento real no banco)
- IT-003: `deleteTrip` seta `deletedAt`; trip desaparece de queries subsequentes
- IT-004: `archiveTrip` muda `status` mas NAO seta `deletedAt`
- IT-005: Limit enforcement — 20 trips criadas, 21a lanca `TRIP_LIMIT_REACHED`
- IT-006: Trips arquivadas nao contam para o limite de 20
- IT-007: Soft-delete middleware — trip com `deletedAt != null` nunca aparece em `findMany` (CR-003 obrigatorio)
- IT-008: Cascade delete — deletar User hard-deleta todos os trips (GDPR erasure)
- EC-017: Concorrencia — 5 calls paralelos com usuario em 19 trips; no maximo 1 deve ter sucesso

Fixtures a criar:
- `tests/fixtures/users.ts` — `testUsers.userA`, `testUsers.userB` conforme QA-SPEC-001 §11
- `tests/fixtures/trips.ts` — `tripFixtures.validCreate`, `tripFixtures.minimalCreate`
- `tests/helpers/seed.ts` — `seedTripsForUser`, `seedArchivedTripsForUser`, `cleanupUser`

Estrategia: cada teste roda dentro de uma transaction que e revertida em `afterEach` — sem poluicao de estado entre testes.

**Done when**:
- IT-001 a IT-008 e EC-017 passam contra PostgreSQL real (nao mockado)
- IT-007 passa especificamente com a implementacao `db.$extends` (nao `db.$use`) — isso e o acceptance criterion de CR-003
- Nenhum teste depende de estado deixado por outro teste
- `DATABASE_URL_TEST` e usado — banco de teste separado do banco de desenvolvimento

---

#### TASK-018: Security verification tasks (durante Days 4-8, nao um dia isolado)

**Assigned to**: dev-fullstack-1
**Depends on**: Cada tarefa relevante (TASK-003, TASK-011)
**Parallel with**: todas as demais tasks
**Estimated**: distribuido — aproximadamente 1h por tarefa verificada

**Description**: Verificacoes de seguranca obrigatorias do SEC-SPEC-001 que devem ser feitas durante a implementacao, nao deixadas para o final.

Verificacoes especificas:

**TASK-SEC-001 — FIND-M-001: redirect fora do try/catch**
- Durante TASK-011: verificar manualmente que NENHUM `redirect()` em nenhuma das quatro Server Actions esta dentro de um bloco `try` ou `catch`
- Confirmar no comentario de PR: "Confirmado: redirect() esta fora de try/catch em todas as actions"
- Testes SEC-T-001, SEC-T-002, SEC-T-003 devem passar

**TASK-SEC-002 — FIND-M-002: Prisma 7 db.$extends**
- Durante TASK-003: confirmar que a implementacao usa `db.$extends` — documentar a versao exata do Prisma sendo usada e a referencia da documentacao consultada
- O integration test IT-007 (CR-003) e o acceptance criterion final desta verificacao
- Confirmar no comentario de PR: "Confirmado: usando db.$extends, testado em IT-007 contra Prisma [versao]"
- Teste SEC-T-006 deve ser verificado em code review

**TASK-SEC-003 — SR-005: select explicito em todas as queries**
- Durante TASK-007 e TASK-009: verificar que todos os `findFirst`, `findMany`, `findUnique`, `create`, `update` tem clausula `select` explicita
- Nenhum resultado retorna o modelo Prisma completo com `deletedAt`, `userId` internos (SEC-T-013, SEC-T-014)

**TASK-SEC-004 — SR-004: Consent gate no track()**
- Durante TASK-011: verificar que a funcao `track()` usada nas Server Actions inclui `hasAnalyticsConsent()` como primeira verificacao (CR-002)

**Done when**: Cada verificacao acima esta documentada em comentario no PR com confirmacao explicita.

---

#### TASK-019: PR preparation + self-review checklist (Day 10)

**Assigned to**: dev-fullstack-1
**Depends on**: TASK-015 (integration tests), TASK-018 (security verification)
**Estimated**: 2h

**Description**: Preparar o PR com a checklist completa de revisao preenchida.

O PR deve incluir no corpo:
1. Link para SPEC-001, QA-SPEC-001, SEC-SPEC-001, CIA-001
2. Confirmacao: "redirect() fora de try/catch em todas as actions" (FIND-M-001)
3. Confirmacao: "db.$extends usado em client.ts, testado em IT-007" (FIND-M-002)
4. Confirmacao: "select explicito em todos as queries Prisma" (SR-005)
5. Confirmacao: "auth() e a primeira instrucao em todas as Server Actions" (SR-003)
6. Resultado de cobertura de testes (meta: >= 80% em `trip.service.ts` e `trip.schema.ts`)
7. Checklist de seguranca de `docs/architecture.md` §8 preenchida

**Done when**: PR aberto, todos os CI gates passando, checklist preenchida.

---

### dev-fullstack-2 Tasks

#### TASK-002: Read all specs + setup branch (Day 1)

**Assigned to**: dev-fullstack-2
**Depends on**: nothing
**Parallel with**: TASK-001
**Estimated**: 2h
**Branch**: `feat/trip-creation-dev2`

**Description**: Ler os seguintes documentos na integra antes de escrever qualquer linha de codigo:
- `docs/SPEC-001.md` — prestar atencao especial nas secoes 5 (Component Architecture), 5.2 (Interactive Components), 10 (Testing)
- `docs/QA-SPEC-001.md` — E2E test flows E2E-001 a E2E-010 e accessibility tests A11Y-001 a A11Y-015
- `docs/SEC-SPEC-001.md` — FIND-M-001 e FIND-M-002 (entender os problemas mesmo sendo do lado backend)
- `docs/CIA-001.md` — entender o ordering constraint US-003 users table
- `docs/architecture.md` — convencoes de componentes, folder structure

Anotar: componentes que sao Client Components vs Server Components conforme SPEC-001 §5.1 e §5.2; a acessibilidade obrigatoria em CoverPicker (role="radiogroup", arrow keys).

**Done when**: Branch criada a partir de `main`; desenvolvedor consegue listar todos os Client Components e Server Components desta feature em comentario no PR de abertura.

---

#### TASK-004: US-003 prerequisite — confirmar users table + shared types + error classes (Day 2)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-002 (specs lidas)
**Parallel with**: TASK-003
**Estimated**: 3h
**Spec ref**: CIA-001 §Database Changes (migration dependency note), SPEC-001 §3.1 (User model reference)

**Description**: Esta task e critica para o ordering constraint da CIA-001. A foreign key `trips_userId_fkey` exige que a tabela `users` exista antes da migration de trips rodar.

Acoes:
1. Verificar se a migration de US-003 (users table) ja foi aplicada no banco de desenvolvimento local e no banco de staging. Se a tabela `users` nao existir, coordenar com o devops-engineer para criar a tabela (US-003 deve ser implementado em paralelo).
2. Se a tabela `users` nao existir ainda: criar uma migration temporaria apenas com o modelo `User` referenciado em SPEC-001 §3.1 para desbloquear o dev de backend. Documentar claramente que esta e uma migration de bootstrapping que sera substituida pela migration completa de US-003.
3. Criar `src/lib/errors.ts` se nao existir — com as classes base: `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError` conforme `docs/architecture.md` §4 (Error Handling Pattern).
4. Criar `src/lib/env.ts` se nao existir — validacao de env vars conforme `docs/architecture.md` §3.
5. Sinalizar para dev-fullstack-1 (TASK-003) quando a tabela `users` estiver confirmada no banco.

**Done when**:
- Tabela `users` existe no banco de desenvolvimento (verificar com `npx prisma db pull` ou `psql`)
- `src/lib/errors.ts` existe com `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`
- `src/lib/env.ts` existe com validacao de `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`
- dev-fullstack-1 foi notificado e pode prosseguir com TASK-003

---

#### TASK-006: UI primitive components — StatusBadge, TripCounter, CoverPicker (Day 3)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-002 (specs lidas)
**Parallel with**: TASK-005
**Estimated**: 4h
**Spec ref**: SPEC-001 §5.2 (Interactive Components), QA-SPEC-001 §10 (A11Y-008, A11Y-010, A11Y-011)

**Description**: Implementar os componentes primitivos de UI da feature de trips.

Arquivos a criar:
- `src/components/features/trips/cover-picker.tsx` — Client Component com `role="radiogroup"`, cada opcao `role="radio"`, navegacao por arrow keys (A11Y-011). Props: `{ value: CoverGradient; onChange: (value: CoverGradient) => void }`. Os 8 gradientes: sunset, ocean, forest, desert, aurora, city, sakura, alpine.
- `src/components/features/trips/trip-counter.tsx` — mostra "X de 20 viagens ativas". Quando X = 20, exibir em cor de erro. `aria-live="polite"` para atualizacoes dinamicas (A11Y-010). Props: `{ activeCount: number; limit: number }`.
- `src/components/ui/status-badge.tsx` — badge de status com texto e cor correspondente ao `TripStatus`. Deve comunicar status por TEXTO, nao apenas por cor (A11Y-008). Props: `{ status: TripStatus }`.

Estilos: usar Tailwind CSS 4 + CSS variables de design tokens. Seguir convencoes do shadcn/ui para composicao de classes.

**Done when**:
- `CoverPicker` aceita navegacao por arrow keys e seleciona com Space/Enter (E2E-010 step 9)
- `CoverPicker` tem `role="radiogroup"` e cada opcao tem `role="radio"` com `aria-checked`
- `StatusBadge` mostra o texto do status (nao apenas cor) — acessivel para leitores de tela
- `TripCounter` tem `aria-live="polite"`
- Componentes renderizam corretamente em viewport 375px (sem overflow horizontal)

---

#### TASK-008: TripCard, TripGrid, TripHero, TripInfoHeader (Day 4)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-006 (StatusBadge, TripCounter prontos)
**Parallel with**: TASK-007
**Estimated**: 5h
**Spec ref**: SPEC-001 §5.2 (TripCard, TripGrid), §5.3 (Component Tree), QA-SPEC-001 §10 (A11Y-007, A11Y-012)

**Description**: Implementar os componentes de exibicao de trips com mock data.

Arquivos a criar:
- `src/components/features/trips/trip-card.tsx` — Client Component. Props: `{ trip: TripCardData; onArchive: (tripId: string) => void; onDelete: (tripId: string, title: string) => void }`. Renderiza: capa com gradiente e emoji, `StatusBadge`, titulo, destino, periodo, menu de contexto "...". Acessibilidade: `role="article"` ou `role="listitem"`, `aria-label` com detalhes da viagem (A11Y-007); botao "..." com `aria-label` descrevendo a viagem e `aria-haspopup="menu"` (A11Y-012).
- `src/components/features/trips/trip-grid.tsx` — Server Component. Recebe lista de trips e renderiza grid de `TripCard`. Inclui `EmptyState` quando lista vazia (AC-009: texto "Criar minha primeira viagem").
- `src/components/features/trips/trip-hero.tsx` — hero da pagina de detalhe com gradiente, emoji, titulo, `StatusBadge`. Props: `{ trip: TripDetailData }`.
- `src/components/features/trips/trip-info-header.tsx` — exibe destino, periodo, contador de dias. Props: `{ destination: string; startDate: Date; endDate: Date }`.
- `src/components/features/trips/itinerary-placeholder.tsx` — placeholder simples para US-002.

Usar mock data para desenvolvimento isolado — o componente sera conectado ao service quando as paginas Server Component forem criadas (TASK-014).

**Done when**:
- `TripCard` renderiza com dados mock sem erros
- `TripCard` exibe menu de contexto funcional (abre/fecha)
- `TripGrid` exibe `EmptyState` quando lista e vazia
- Todos os componentes renderizam em viewport 375px sem scroll horizontal (AC-017)
- `TripCard` tem `role="article"` e `aria-label` (A11Y-007)

---

#### TASK-010: TripForm Client Component (Day 5)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-006 (CoverPicker pronto), TASK-005 (schemas Zod prontos — pode ser parallel com TASK-005 se schemas basicos estiverem disponíveis)
**Parallel with**: TASK-009
**Estimated**: 6h
**Spec ref**: SPEC-001 §5.2 (TripForm), QA-SPEC-001 §10 (A11Y-002, A11Y-013 a A11Y-015), SPEC-001 §11.4 pitfall #2

**Description**: Implementar o componente de formulario de criacao/edicao de trip.

Arquivo a criar: `src/components/features/trips/trip-form.tsx`

Props:
```typescript
interface TripFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<TripCreateInput>;
  tripId?: string; // obrigatorio no modo "edit"
}
```

Implementacao:
- `"use client"` no topo
- `useActionState(action, initialState)` — React 19 (NAO `useFormState` de experimental — SPEC-001 §11.4 pitfall #2)
- `react-hook-form` + `zodResolver(TripCreateSchema | TripUpdateSchema)` conforme o modo
- Validacao inline: erros exibidos abaixo de cada campo sem recarregar a pagina (AC-005)
- Foco move para o primeiro campo com erro apos submit falhado (E2E-002 step 1, A11Y-009)
- Submit: desabilita botoes e exibe spinner durante envio (E2E-001 step 7)
- Campos: titulo (com contador de caracteres `aria-live="polite"`), destino, startDate, endDate, description, `CoverPicker`, preview da capa em tempo real

Acessibilidade obrigatoria (QA-SPEC-001 §10):
- Cada `<input>` tem `<label>` associada via `htmlFor`/`id` (A11Y-013)
- Campos obrigatorios tem `aria-required="true"` (A11Y-014)
- Campos com erro tem `aria-invalid="true"` e mensagem de erro linkada via `aria-describedby` (A11Y-015, A11Y-009)

A action sera conectada nas paginas Server Component (TASK-014). Nesta task o formulario pode usar uma action mock/vazia para testes de UI isolada.

**Done when**:
- Formulario renderiza em modo "create" e "edit" (modo edit pre-preenche defaultValues)
- Erros inline aparecem em cada campo sem reload (UV-003 a UV-019 verificaveis visualmente)
- Foco move para primeiro campo com erro
- Submit button mostra estado de loading
- `aria-required`, `aria-invalid`, `aria-describedby` presentes em todos os campos (A11Y-013 a A11Y-015)
- Formulario operavel completamente via teclado (Tab para navegar, Space/Enter para CoverPicker)

---

#### TASK-012: ConfirmArchiveDialog + ConfirmDeleteDialog + cache keys (Day 6)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-002 (specs lidas)
**Parallel with**: TASK-011
**Estimated**: 4h
**Spec ref**: SPEC-001 §5.2 (ConfirmArchiveDialog, ConfirmDeleteDialog), QA-SPEC-001 §10 (A11Y-005, A11Y-006)

**Description**: Implementar os dialogs de confirmacao e completar as cache keys.

Arquivos a criar:
- `src/components/features/trips/confirm-archive-dialog.tsx` — Client Component. Props: `{ tripId: string; tripTitle: string; open: boolean; onClose: () => void }`. Usa `archiveTrip` Server Action. Acessibilidade: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` (A11Y-005); focus trap ativo quando aberto; Escape fecha sem arquivar.
- `src/components/features/trips/confirm-delete-dialog.tsx` — Client Component. Props: `{ tripId: string; tripTitle: string; open: boolean; onClose: () => void }`. Botao "Excluir permanentemente" so fica habilitado quando campo de confirmacao == `tripTitle` (case-sensitive — E2E-005). Usa `deleteTrip` Server Action. Acessibilidade: `role="dialog"`, focus trap (A11Y-006).
- `src/server/cache/keys.ts` — implementar `CacheKeys.tripsList`, `CacheKeys.tripsCount`, `CacheKeys.tripDetail` conforme SPEC-001 §9.2

Nota sobre `confirmDeleteDialog`: a validacao de `confirmationTitle === trip.title` deve ser feita TANTO no client (para UX — habilitar/desabilitar botao) QUANTO no server via `TripService.deleteTrip` (para seguranca — a verificacao client-side nao e garantia de seguranca).

**Done when**:
- `ConfirmArchiveDialog` fecha com Escape sem executar a action (E2E-010)
- `ConfirmDeleteDialog` mantem o botao desabilitado ate o campo de texto corresponder exatamente ao titulo (E2E-005 steps 4-5)
- Ambos os dialogs tem focus trap ativo (A11Y-005, A11Y-006)
- `CacheKeys` exporta as tres funcoes de cache key

---

#### TASK-014: Paginas Server Components — /trips, /trips/new, /trips/[id], /trips/[id]/edit (Day 7)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-008 (TripCard, TripGrid prontos), TASK-010 (TripForm pronto), TASK-012 (dialogs prontos), TASK-011 (Server Actions prontas — necessario para conectar TripForm)
**Parallel with**: TASK-013
**Estimated**: 6h
**Spec ref**: SPEC-001 §5.1 (Page Components), §5.3 (Component Tree), SPEC-001 §8 (Error Handling)

**Description**: Implementar as quatro paginas Server Component da feature.

Arquivos a criar:

`src/app/(auth)/trips/page.tsx`:
- Recebe `searchParams: { page?: string; status?: TripStatus }`
- Chama `TripService.listTrips(userId, { page, status })` diretamente no server
- Renderiza: `PageHeader` com `TripCounter` e botao "Nova viagem", `TabBar` de filtro, `TripGrid`, `Pagination`
- Auth: middleware garante redirect se nao autenticado (AC-001)

`src/app/(auth)/trips/new/page.tsx`:
- Busca contagem de trips ativas para verificar limite antes de renderizar
- Se limite atingido (>= 20): exibir `Alert` com link "Ver minhas viagens" e `Submit` desabilitado (AC-007, E2E-006)
- Renderiza `TripForm` com `action={createTrip}` e `mode="create"`

`src/app/(auth)/trips/[id]/page.tsx`:
- Recebe `params: { id: string }`
- Chama `TripService.getTripById(userId, params.id)` — lancara `NotFoundError` se nao encontrada ou de outro usuario
- Renderiza: `TripHero`, `TripInfoHeader`, botoes de acao, `ConfirmArchiveDialog`, `ConfirmDeleteDialog`, `ItineraryPlaceholder`, `TripDescription`
- Error boundary: `not-found.tsx` para NotFoundError com "Esta viagem nao existe ou foi excluida" + link "Voltar para Minhas Viagens"

`src/app/(auth)/trips/[id]/edit/page.tsx`:
- Chama `TripService.getTripById(userId, params.id)` com mesma verificacao de propriedade
- Renderiza `TripForm` com `mode="edit"`, `defaultValues` pre-preenchidos, `action={updateTrip}`, `tripId`

Criar tambem:
- `src/app/(auth)/trips/not-found.tsx` — pagina 404 para trips nao encontradas
- `src/app/(auth)/trips/error.tsx` — pagina de erro para erros inesperados

**Done when**:
- Todas as quatro paginas renderizam sem erros com dados reais do banco
- `/trips` com 0 trips exibe `EmptyState` (AC-009)
- `/trips/new` com usuario em 20 trips exibe alerta de limite (AC-007)
- `/trips/[id]` com tripId de outro usuario exibe pagina 404 (E2E-009)
- Todas as paginas tem middleware de auth ativo — redirect para `/login?callbackUrl=...` se nao autenticado (AC-001)

---

#### TASK-016: E2E tests (Day 8)

**Assigned to**: dev-fullstack-2
**Depends on**: TASK-011 (Server Actions completas), TASK-013 (Redis cache integrado), TASK-014 (paginas prontas)
**Parallel with**: TASK-015
**Estimated**: 6h
**Spec ref**: QA-SPEC-001 §5 (E2E Tests), §8 (Edge Cases), §10 (Accessibility, Mobile Viewport)

**Description**: Implementar os testes E2E Playwright cobrindo os 10 critical flows.

Arquivos a criar:
- `tests/e2e/trips/trip-creation.spec.ts` — E2E-001 (happy path), E2E-002 (form validation), E2E-003 (edit trip)
- `tests/e2e/trips/trip-management.spec.ts` — E2E-004 (archive), E2E-005 (delete com nome), E2E-006 (trip limit), E2E-007 (pagination)
- `tests/e2e/trips/trip-security.spec.ts` — E2E-008 (auth enforcement), E2E-009 (ownership isolation BOLA)
- `tests/e2e/accessibility/trips-a11y.spec.ts` — E2E-010 (keyboard accessibility), A11Y-001 a A11Y-015 via `@axe-core/playwright`
- `tests/e2e/responsive/mobile-viewport.spec.ts` — AC-017: viewport 375px sem scroll horizontal
- `tests/e2e/fixtures/auth.ts` — fixture de sessao autenticada (sem OAuth flow real)
- `tests/e2e/fixtures/trips.ts` — fixture de trips pre-criadas para testes que precisam de dados existentes

Estrategia para date pickers (QA-SPEC-001 §13 — risco de flakiness):
- Usar `page.fill()` com string ISO ("2026-09-01") em vez de interagir com o calendario visual
- Adicionar `data-testid` aos inputs de data para selecao estavel

**Done when**:
- Todos os 10 E2E flows (E2E-001 a E2E-010) passam no Chromium
- E2E-009 (ownership isolation) passa — P0 security test
- axe-core retorna zero violacoes WCAG 2.1 AA em todas as 4 paginas (A11Y-001 a A11Y-004)
- Viewport 375px: scrollWidth <= clientWidth em `/trips` e `/trips/new` (AC-017)
- Auth fixture nao usa credenciais reais — usa sessao sintetica

---

### Shared / Sequential Tasks

#### TASK-017: Final accessibility + mobile validation + performance check (Day 9)

**Assigned to**: dev-fullstack-1 e dev-fullstack-2 (colaborativo)
**Depends on**: TASK-015 (integration tests), TASK-016 (E2E tests)
**Estimated**: 3h total (1.5h cada)
**Spec ref**: QA-SPEC-001 §7 (Performance Targets), §8 (Accessibility), AC-015, AC-016, AC-017

**Description**: Validacoes finais de acessibilidade, viewport mobile e performance.

dev-fullstack-2:
- Rodar axe-core scan em todas as 4 paginas e corrigir quaisquer violacoes restantes
- Verificar tab order em `/trips` (header -> tabs -> cards -> pagination) e em `/trips/new` (todos os campos -> CoverPicker -> botao submit)
- Testar focus trap em ambos os dialogs (archive e delete) — Escape deve fechar sem executar action
- Verificar viewport 375px nas 4 paginas — sem scroll horizontal

dev-fullstack-1:
- Rodar `EXPLAIN ANALYZE` no PostgreSQL para as queries de `listTrips` e `getTripById` — confirmar que os indexes estao sendo usados (P95 < 50ms e < 20ms respectivamente — AC-015)
- Verificar que `revalidatePath` e Redis invalidation estao ocorrendo corretamente apos cada mutacao
- Rodar Lighthouse localmente para estimativa de FCP (meta < 1,500ms — AC-015)

**Done when**:
- Zero violacoes axe-core WCAG 2.1 AA em todas as 4 paginas
- Focus trap funciona em ambos os dialogs
- Viewport 375px: sem scroll horizontal em `/trips` e `/trips/new`
- Index usage confirmado no PostgreSQL EXPLAIN ANALYZE
- FCP estimado dentro do target (validacao final em staging pelo QA)

---

### Full Task List Summary

| Task ID | Titulo | Dev | Day | Paralelo? | Depende De |
|---------|--------|-----|-----|-----------|------------|
| TASK-001 | Read all specs + setup branch | dev-1 | 1 | Sim (TASK-002) | — |
| TASK-002 | Read all specs + setup branch | dev-2 | 1 | Sim (TASK-001) | — |
| TASK-003 | Prisma schema + migration + db.$extends | dev-1 | 2 | Sim (TASK-004) | TASK-001, TASK-004 |
| TASK-004 | US-003 prerequisite + errors.ts + env.ts | dev-2 | 2 | Sim (TASK-003) | TASK-002 |
| TASK-005 | Zod validation schemas + unit tests | dev-1 | 3 | Sim (TASK-006) | TASK-001 |
| TASK-006 | StatusBadge + TripCounter + CoverPicker | dev-2 | 3 | Sim (TASK-005) | TASK-002 |
| TASK-007 | TripService: createTrip + getTripById + listTrips | dev-1 | 4 | Sim (TASK-008) | TASK-003, TASK-005 |
| TASK-008 | TripCard + TripGrid + TripHero + TripInfoHeader | dev-2 | 4 | Sim (TASK-007) | TASK-006 |
| TASK-009 | TripService: updateTrip + archiveTrip + deleteTrip | dev-1 | 5 | Sim (TASK-010) | TASK-007 |
| TASK-010 | TripForm Client Component | dev-2 | 5 | Sim (TASK-009) | TASK-006, TASK-005 |
| TASK-011 | Server Actions: quatro actions | dev-1 | 6 | Sim (TASK-012) | TASK-007, TASK-009, TASK-005 |
| TASK-012 | ConfirmArchiveDialog + ConfirmDeleteDialog + cache/keys.ts | dev-2 | 6 | Sim (TASK-011) | TASK-002 |
| TASK-013 | Redis cache integration + invalidation | dev-1 | 7 | Sim (TASK-014) | TASK-007, TASK-009, TASK-012 |
| TASK-014 | Paginas Server Components (4 paginas) | dev-2 | 7 | Sim (TASK-013) | TASK-008, TASK-010, TASK-012, TASK-011 |
| TASK-015 | Integration tests | dev-1 | 8 | Sim (TASK-016) | TASK-011, TASK-013, TASK-014 |
| TASK-016 | E2E tests (10 critical flows) | dev-2 | 8 | Sim (TASK-015) | TASK-011, TASK-013, TASK-014 |
| TASK-017 | Accessibility + mobile + performance check | dev-1 + dev-2 | 9 | Nao | TASK-015, TASK-016 |
| TASK-018 | Security verification (distribuido Days 4-8) | dev-1 | 4-8 | Sim | Cada task relevante |
| TASK-019 | PR preparation + self-review checklist | dev-1 + dev-2 | 10 | Sim | TASK-017, TASK-018 |

---

### Definition of Done — Sprint 1

Nenhum PR pode ser mergeado ate que TODOS os itens abaixo estejam verificados:

**Funcionalidade**
- [ ] Todos os criterios de aceite AC-001 a AC-017 verificados por testes ou checagem manual
- [ ] Todos os testes unitarios passam — cobertura >= 80% em `trip.service.ts` e `trip.schema.ts`
- [ ] Todos os integration tests IT-001 a IT-008 passam contra PostgreSQL real (nao mock)
- [ ] IT-007 (soft-delete middleware) passa com implementacao `db.$extends` — CR-003 satisfeito
- [ ] Todos os 10 E2E flows (E2E-001 a E2E-010) passam no Chromium
- [ ] E2E-009 (ownership isolation BOLA) passa — P0 security test

**Seguranca — SEC-SPEC-001**
- [ ] FIND-M-001 corrigido: nenhum `redirect()` esta dentro de try/catch em nenhuma Server Action (SR-001)
- [ ] FIND-M-002 corrigido: `db.$extends` usado em `client.ts`, nao `db.$use` (SR-002)
- [ ] SR-003: `auth()` e a primeira instrucao de cada uma das quatro Server Actions
- [ ] SR-004: `hasAnalyticsConsent()` e verificado em `track()` antes de qualquer evento (CR-002)
- [ ] SR-005: clausula `select` explicita em todas as queries Prisma do TripService
- [ ] SR-006: `coverEmoji` validado com regex Unicode ou enum — nao apenas `.max(10)`
- [ ] SR-007: `confirmationTitle` tem `.max(100)` no `TripDeleteSchema`
- [ ] Testes SEC-T-001 a SEC-T-025 passam ou sao verificados em code review
- [ ] CR-001: estrategia de rate limiting para Server Actions documentada em ADR ou architecture.md

**Qualidade**
- [ ] Zero violacoes axe-core WCAG 2.1 AA nas 4 paginas (A11Y-001 a A11Y-004)
- [ ] Viewport 375px: sem scroll horizontal em `/trips` e `/trips/new` (AC-017)
- [ ] FCP < 1,500ms em `/trips` confirmado em staging (AC-015)
- [ ] `listTrips` DB query < 50ms P95 confirmado com EXPLAIN ANALYZE
- [ ] Nenhum bug P0 ou P1 em aberto

**Processo**
- [ ] Nenhum commit direto em `main` — apenas via PR aprovado
- [ ] Nenhuma credencial, segredo ou API key hardcoded no codigo
- [ ] `import "server-only"` presente em todos os arquivos de `src/server/`
- [ ] Code review aprovado pelo tech-lead com security checklist preenchida
- [ ] OQ-003 resolvido na implementacao: `listTrips` usa `status` filter com default correto
- [ ] OQ-005 resolvido: `db.$extends` confirmado e documentado com versao do Prisma

> Ready to execute — todos os pre-requisitos de spec, QA, seguranca e release estao aprovados. Desenvolvimento pode comecar em 2026-02-23.
