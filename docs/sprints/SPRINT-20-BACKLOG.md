# Sprint 20 -- Backlog Priorizado

> **Autor:** product-owner
> **Data:** 2026-03-10
> **Sprint anterior:** 19 (completo, mergeado em master, v0.13.0)
> **Capacidade Sprint 20:** ~40h (2 devs full-stack, ~20h cada)
> **Versao do produto:** 0.13.0 | **Testes:** 1365 passando, 0 falhas
> **Tema:** "Personal Preferences + UX Debt Cleanup"

---

## 1. Sumario Executivo

O Sprint 19 entregou 10 de 12 tarefas planejadas, incluindo os bugs P0 criticos (streaming, navegacao de fases), o redesign do guia do destino (10 categorias em cards), cascade deletion (SEC-S18-001), e melhorias de UX (auto-advance, moeda, bio na confirmacao, dedup de destinos). Dois itens P1 nao foram entregues: remocao de botoes duplicados no dashboard card e reordenacao do Phase 1 wizard. Dois itens P2 foram diferidos conforme planejado.

**Items candidatos para Sprint 20 (7 items):**
- ITEM-A [P1]: Expansao de preferencias pessoais (8-10 categorias com toggles)
- ITEM-B [P1]: Remover botoes duplicados do dashboard card (= DEFER-001)
- ITEM-C [P1]: Reordenacao da Fase 1 (info pessoal primeiro) (= DEFER-002)
- ITEM-D [P1]: Detalhamento de passageiros estilo airline (= ITEM-10)
- ITEM-E [P2]: Expansao de transporte -- Fase 4 "A Logistica" (= ITEM-13/US-115+)
- ITEM-F [P0]: Verificar guide redesign no staging
- ITEM-G [Debt]: SEC-S19-001 hash userId em gamification logs

**Estrategia do Sprint 20:** Priorizar a expansao de preferencias pessoais (ITEM-A) -- item solicitado duas vezes pelo stakeholder e ainda nao entregue -- junto com os 2 itens P1 carregados do Sprint 19 (ITEM-B, ITEM-C). O transporte (ITEM-E) e grande demais para caber neste sprint e deve ser diferido para Sprint 21 como sprint dedicado. ITEM-D (passageiros) requer mudanca de modelo de dados e deve acompanhar o sprint de transporte.

---

## 2. Mapeamento de Sobreposicoes

Varios itens candidatos se sobrepoem com itens ja rastreados no backlog:

| Item Sprint 20 | Equivalente no Backlog | Resolucao |
|---|---|---|
| ITEM-B (remover botoes duplicados) | DEFER-001 (Sprint 19 carry-over) | Mesmo item. Usar ID: DEFER-001/ITEM-B |
| ITEM-C (Phase 1 reorder) | DEFER-002 (Sprint 19 carry-over) | Mesmo item. Usar ID: DEFER-002/ITEM-C |
| ITEM-D (passenger details) | ITEM-10 (Sprint 18 deferral) | Mesmo item. Usar ID: ITEM-10/ITEM-D |
| ITEM-E (transport phase) | ITEM-13 / US-115-US-118 | Mesmo escopo. Usar ref: US-115+ |
| ITEM-G (SEC-S19-001) | DEFER-003 | Mesmo item. Usar ID: SEC-S19-001 |

---

## 3. Avaliacao ITEM-E (Transporte) -- Decisao de Escopo

### O que ITEM-E inclui (escopo completo)

Conforme `TRANSPORT-PHASE-SPEC.md`, a expansao de transporte envolve:

1. **US-118:** Campo `origin` no Trip + pre-populacao via Profile (S, ~4h)
2. **US-115:** Registro de transporte principal -- novo modelo TripTransport, UI de lista N itens, integracao com Fase 6 (L, ~16-20h)
3. **US-117:** Selecao de mobilidade local -- multi-select com 7 opcoes (S, ~4h)
4. **US-116:** Registro de hospedagem -- novo modelo TripAccommodation, UI similar a transporte (M, ~10h)
5. **Renomeacao da Fase 4:** "O Abrigo" -> "A Logistica" + badge rename (S, ~2h)

**Estimativa total: 36-40h (um sprint inteiro)**

### Veredicto: NAO CABE no Sprint 20

O transporte completo (US-115 + US-116 + US-117 + US-118 + renomeacao) consume praticamente todo o budget de 40h. Incluir qualquer outro item se torna impossivel. Alem disso:

- US-115 e US-116 requerem novos modelos Prisma, migrations, criptografia de codigos de reserva, e UI complexa (lista dinami)
- A integracao com Fase 6 (itinerario respeitar horarios de voo) adiciona complexidade de prompt engineering
- O architect precisa definir o spec tecnico (TripTransport vs metadata JSON)

### Recomendacao: Sprint 21 dedicado ao transporte

| Sprint | Items de Transporte | Estimativa |
|---|---|---|
| Sprint 20 | Nenhum item de transporte | 0h |
| Sprint 21 | US-118 (origin) + US-115 (transport) + US-117 (mobility) + renomeacao Fase 4 | ~26-30h |
| Sprint 22 | US-116 (hospedagem) + US-119 (AI cost estimate) | ~14-16h |

Alternativa considerada: incluir apenas US-118 (campo origin, 4h) no Sprint 20 como preparacao. Rejeitada porque US-118 isolado nao entrega valor visivel ao usuario sem US-115 -- e prefiro um sprint coeso que entrega valor completo.

---

## 4. Avaliacao ITEM-F (Guide no Staging)

O Sprint 19 review confirma que o guide redesign foi entregue (T-S19-006: "Guide redesign: 10 sections, card layout, dashboard cards | DONE"). No entanto, o item reporta que staging pode ainda mostrar o accordion antigo.

**Acao:** Verificacao rapida no staging (travel-planner-eight-navy.vercel.app) antes de iniciar o sprint. Se o deploy do Sprint 19 ja foi feito (v0.13.0), o guide redesign deve estar visivel. Se nao, e um problema de deploy -- escalar para devops-engineer.

**Estimativa:** 0.5h (verificacao, nao implementacao)
**Classificacao:** P0 (verificar antes de qualquer outro trabalho)

---

## 5. Scoring Matrix Sprint 20

| Item | Dor (30%) | Receita (25%) | Esforco inv. (20%) | Estrategia (15%) | Diferencial (10%) | **Score** | Estimativa |
|---|---|---|---|---|---|---|---|
| ITEM-A (preferencias) | 4 (1.20) | 3 (0.75) | 3 (0.60) | 4 (0.60) | 3 (0.30) | **3.45** | 10h |
| ITEM-C (Phase 1 reorder) | 4 (1.20) | 2 (0.50) | 3 (0.60) | 4 (0.60) | 2 (0.20) | **3.10** | 8h |
| ITEM-D (passageiros) | 3 (0.90) | 3 (0.75) | 3 (0.60) | 3 (0.45) | 3 (0.30) | **3.00** | 6h |
| ITEM-B (remover botoes) | 2 (0.60) | 1 (0.25) | 5 (1.00) | 2 (0.30) | 1 (0.10) | **2.25** | 1h |
| SEC-S19-001 (hash userId) | 2 (0.60) | 1 (0.25) | 5 (1.00) | 3 (0.45) | 1 (0.10) | **2.40** | 1h |
| DEFER-004 (theme tokens) | 1 (0.30) | 1 (0.25) | 5 (1.00) | 2 (0.30) | 1 (0.10) | **1.95** | 1h |

**Nota sobre ITEM-E (transporte):** Score alto (3.70 para US-115) mas esforco L-XL. Diferido conforme analise na secao 3.

---

## 6. Backlog Sprint 20

### 6.1 P0 -- MUST VERIFY (~0.5h)

---

#### T-S20-001: ITEM-F -- Verificar guide redesign no staging

**Estimativa:** 0.5h | **Tipo:** Verificacao

**Descricao:** Verificar no staging (travel-planner-eight-navy.vercel.app) que o guide redesign do Sprint 19 esta ativo: 10 categorias em cards, banner de highlights, layout responsivo. O Sprint 19 review confirma entrega (commit bdae35e), mas staging pode estar desatualizado se o deploy nao ocorreu.

**Criterios de Aceite:**
- [ ] AC-001: Given o staging com v0.13.0 deployed, when um viajante acessa Fase 5, then ve 10 categorias em cards (nao accordions)
- [ ] AC-002: Given o staging, when o viajante ve o guia, then o banner de highlights (fuso, moeda, idioma, tomada) esta presente no topo
- [ ] AC-003: Given o staging nao esta atualizado, when detectado, then escalar para devops-engineer para deploy

**Acao:** Deve ser executada no dia 1 do sprint antes de qualquer desenvolvimento.

---

### 6.2 P1 -- MUST HAVE (~20h)

---

#### T-S20-002: ITEM-A / US-123 -- Expansao de Preferencias Pessoais

**Estimativa:** 10h | **Score:** 3.45 | **Tipo:** New feature
**MoSCoW:** Must Have
**Business Value:** Preferencias estruturadas melhoram drasticamente a qualidade das recomendacoes de IA (itinerario, guia, checklist) e aumentam gamificacao (pontos por preenchimento)

**User Story**
> As a leisure traveler (@leisure-solo, @leisure-family),
> I want to select my travel preferences from structured categories (cuisine types, activities, pace, accessibility needs),
> so that the AI generates more personalized recommendations and I earn gamification points for each preference I share.

**Traveler Context**
- **Pain point:** Preferencias atuais sao limitadas a 2 campos de texto livre (restricoes alimentares, acessibilidade). O viajante nao sabe o que informar, e a IA nao consegue extrair dados estruturados de texto livre de forma confiavel.
- **Current workaround:** Viajantes escrevem frases vagas como "gosto de comida italiana" que a IA interpreta de forma inconsistente.
- **Frequency:** 100% dos viajantes passam pela Fase 2 (O Explorador). Preferencias afetam a qualidade de TODAS as fases downstream (3, 5, 6).

**Categorias de Preferencias Propostas (8 categorias):**

| # | Categoria | Tipo de Input | Opcoes (i18n) |
|---|---|---|---|
| 1 | Culinaria | Multi-select (toggles) | Local tipica, Italiana, Japonesa, Mexicana, Vegetariana, Vegana, Street food, Fine dining, Cafes/padarias |
| 2 | Atividades | Multi-select (toggles) | Museus/galerias, Trilhas/natureza, Praias, Vida noturna, Compras, Esportes, Fotografia, Gastronomia, Historia/arquitetura |
| 3 | Ritmo de viagem | Single-select (radio) | Relaxado (poucas atividades/dia), Moderado (2-3 atividades/dia), Intenso (roteiro cheio) |
| 4 | Periodo do dia | Multi-select (toggles) | Matutino (early bird), Vespertino, Noturno (night owl) |
| 5 | Restricoes alimentares | Multi-select (toggles) | Sem gluten, Sem lactose, Vegetariano, Vegano, Halal, Kosher, Alergia a frutos do mar, Nenhuma |
| 6 | Acessibilidade | Multi-select (toggles) | Cadeira de rodas, Mobilidade reduzida, Deficiencia visual, Deficiencia auditiva, Nenhuma necessidade especial |
| 7 | Orcamento por refeicao | Single-select (radio) | Economico (street food, self-service), Moderado (restaurantes casuais), Premium (experiencias gastronomicas) |
| 8 | Interesses culturais | Multi-select (toggles) | Arte contemporanea, Historia antiga, Religiao/templos, Musica ao vivo, Teatro/shows, Festivais locais, Artesanato |

**Integracao com Gamificacao:**
- Cada categoria preenchida: +10 pontos (total: ate +80 pontos)
- Badge desbloqueavel: "identity_explorer" (preencher >= 5 categorias)
- Dados persistidos no UserProfile (campo JSON `preferences`) e reutilizados em todas as trips

**Acceptance Criteria:**
- [ ] AC-001: Given o viajante acessa a Fase 2 (O Explorador), when a secao de preferencias e renderizada, then exibe 8 categorias com toggles/checkboxes (nao texto livre)
- [ ] AC-002: Given o viajante seleciona opcoes em uma categoria, when confirma, then os dados sao salvos no UserProfile
- [ ] AC-003: Given o viajante ja preencheu preferencias em uma trip anterior, when inicia nova trip, then as preferencias sao pre-populadas (persistencia cross-trip)
- [ ] AC-004: Given cada categoria preenchida, when o viajante salva, then recebe +10 pontos de gamificacao
- [ ] AC-005: Given o viajante preenche >= 5 categorias, when o sistema verifica, then desbloqueia badge "identity_explorer"
- [ ] AC-006: Given a secao em mobile (375px), when renderizada, then toggles sao exibidos em grid 2 colunas compacto
- [ ] AC-007: Given as preferencias salvas, when a IA gera itinerario/guia, then o prompt inclui as preferencias estruturadas
- [ ] AC-008: Given o viajante nao preenche nenhuma preferencia, when avanca para o proximo passo, then pode avancar sem impedimento (campos opcionais)
- [ ] AC-009: Given i18n, when as opcoes sao renderizadas, then estao traduzidas para pt e en
- [ ] AC-010: Given a categoria "Acessibilidade", when o viajante seleciona uma necessidade, then a IA adapta recomendacoes de mobilidade e atividades

**Out of Scope (v1):**
- Preferencias por trip (v1 = preferencias globais no perfil, compartilhadas entre trips)
- Recomendacao proativa ("baseado no seu perfil, voce vai gostar de...")
- Import de preferencias de redes sociais
- Imagens/fotos nas opcoes de toggle

**Success Metrics:**
- 60% dos viajantes preenchem pelo menos 3 categorias
- Qualidade percebida do itinerario gerado sobe 15% (medido via feedback thumbs up)
- Pontos de gamificacao medio por usuario sobe +40 pontos

---

#### T-S20-003: ITEM-C / DEFER-002 -- Reordenacao da Fase 1 + Persistencia via Profile

**Estimativa:** 8h | **Score:** 3.10 | **Tipo:** Refatoracao + UX improvement
**MoSCoW:** Must Have
**Business Value:** Coletar info pessoal antes da trip melhora a qualidade de todas as fases downstream e elimina retrabalho para usuarios recorrentes

**User Story**
> As a returning traveler (all personas),
> I want my personal information (name, bio, nationality) to be collected first and persisted in my profile,
> so that I don't have to re-enter the same data every time I create a new trip.

**Traveler Context**
- **Pain point:** A ordem atual da Fase 1 e: Destino -> Datas -> Sobre Voce -> Confirmacao. Um viajante que cria a segunda trip precisa re-informar dados pessoais que ja existem no perfil.
- **Current workaround:** Nenhum. O viajante preenche os mesmos dados repetidamente.
- **Frequency:** 100% dos viajantes recorrentes (2+ trips).

**Mudancas propostas:**
1. Reordenar steps: **Sobre Voce (Step 1) -> Destino (Step 2) -> Datas (Step 3) -> Confirmacao (Step 4)**
2. Step 1 (Sobre Voce) pre-populado com dados do UserProfile se ja preenchidos
3. Se UserProfile tem nome, bio e nacionalidade preenchidos, Step 1 exibe resumo + botao "Editar" ao inves de formulario completo (skip inteligente)
4. Dados do Step 1 salvos/atualizados no UserProfile ao avancar

**Acceptance Criteria:**
- [ ] AC-001: Given a Fase 1, when o wizard e carregado, then o primeiro step e "Sobre Voce" (nao "Destino")
- [ ] AC-002: Given o viajante ja tem UserProfile preenchido (nome + bio), when acessa Step 1, then os campos estao pre-populados
- [ ] AC-003: Given UserProfile com nome + bio + nacionalidade preenchidos, when o viajante ve Step 1, then exibe resumo com opcao "Editar" (skip inteligente)
- [ ] AC-004: Given o viajante edita dados no Step 1, when avanca para Step 2, then as alteracoes sao persistidas no UserProfile
- [ ] AC-005: Given a nova ordem de steps, when o viajante completa a Fase 1, then os dados estao corretos na tela de confirmacao
- [ ] AC-006: Testes existentes do Phase1Wizard atualizados para refletir a nova ordem

**Out of Scope (v1):**
- Auto-skip completo da Fase 1 para viajantes recorrentes (ainda precisam escolher destino e datas)
- Deteccao de mudancas no perfil desde a ultima trip

---

#### T-S20-004: ITEM-B / DEFER-001 -- Remover botoes duplicados do dashboard card

**Estimativa:** 1h | **Score:** 2.25 | **Tipo:** UX cleanup
**MoSCoW:** Must Have (carregado do Sprint 19, debito ja em segundo sprint)

**Descricao:** Remover os botoes "Checklist", "Itens" e "Roteiro" do card da viagem no dashboard (ExpeditionCard). Manter apenas a barra de progresso + botao "Continuar". As ferramentas ja estao acessiveis via PhaseToolsBar dentro da trip.

**Acceptance Criteria:**
- [ ] AC-001: Given o card da viagem no dashboard, when renderizado, then nao exibe botoes "Checklist", "Itens" ou "Roteiro"
- [ ] AC-002: Given o card, when renderizado, then exibe apenas: emoji, destino, fase atual, barra de progresso, botao "Continuar"
- [ ] AC-003: Testes existentes do ExpeditionCard atualizados para refletir remocao

---

### 6.3 P2 -- SHOULD HAVE (~8h)

---

#### T-S20-005: SEC-S19-001 -- Hash raw userId em gamification engines

**Estimativa:** 1h | **Score:** 2.40 | **Tipo:** Security debt
**MoSCoW:** Should Have

**Descricao:** Substituir raw userId por `hashUserId(userId)` em 9 chamadas de logger nos arquivos: `phase-engine.ts` (4), `points-engine.ts` (4), `itinerary-plan.service.ts` (1). Pre-existente desde Sprint 9, LOW severity.

**Acceptance Criteria:**
- [ ] AC-001: Given qualquer log emitido pelos 3 arquivos, when inspecionado, then nao contem userId em formato raw (apenas hash)
- [ ] AC-002: Busca por `logger.` nos 3 arquivos nao retorna nenhum `userId` sem hash

---

#### T-S20-006: ITEM-D / ITEM-10 -- Detalhamento de Passageiros (airline-style)

**Estimativa:** 6h | **Score:** 3.00 | **Tipo:** New feature
**MoSCoW:** Should Have

**User Story**
> As a family traveler (@leisure-family),
> I want to specify the number of adults, children (with ages), seniors and infants in my trip,
> so that the AI can recommend age-appropriate activities and the checklist includes relevant items (e.g., child car seat, senior accessibility).

**Traveler Context**
- **Pain point:** O campo atual "Quantas pessoas?" e um numero simples. A IA nao sabe se sao adultos, criancas ou idosos, gerando itinerarios genericos que nao consideram necessidades especificas.
- **Current workaround:** Viajantes escrevem nas "notas especiais" algo como "2 adultos, 1 crianca de 4 anos".
- **Frequency:** ~40% das viagens sao em familia (dados Deloitte 2026).

**Campos propostos (Fase 1, Step 1 -- "Sobre a viagem"):**

| Campo | Tipo | Default | Validacao |
|---|---|---|---|
| Adultos (18+) | Stepper (- / +) | 1 | Min 1, Max 20 |
| Criancas (2-17) | Stepper (- / +) | 0 | Min 0, Max 10. Se > 0, pedir idade de cada |
| Bebes (0-1) | Stepper (- / +) | 0 | Min 0, Max 5 |
| Idosos (65+) | Stepper (- / +) | 0 | Min 0, Max 10 |

**Acceptance Criteria:**
- [ ] AC-001: Given a Fase 1, when o viajante chega ao campo de viajantes, then ve steppers para adultos, criancas, bebes e idosos (nao campo numerico unico)
- [ ] AC-002: Given o viajante adiciona 1+ criancas, when confirma o numero, then o sistema pede a idade de cada crianca (dropdown 2-17)
- [ ] AC-003: Given criancas com idade < 5, when a IA gera checklist (Fase 3), then inclui itens como "carrinho de bebe" e "cadeirinha de carro"
- [ ] AC-004: Given idosos no grupo, when a IA gera itinerario (Fase 6), then prioriza atividades com menor exigencia fisica e sugere pausas
- [ ] AC-005: Given os dados de passageiros preenchidos, when persistidos, then o campo `travelers` no Trip armazena a estrutura detalhada (nao apenas um numero)
- [ ] AC-006: Given mobile (375px), when os steppers sao renderizados, then layout e compacto e funcional (- e + acessiveis)

**Out of Scope (v1):**
- Nomes individuais de passageiros
- Documentos por passageiro (passaporte, visto)
- Tarifas diferenciadas por idade

---

#### T-S20-007: DEFER-004 -- Theme tokens em ExpeditionHubPage

**Estimativa:** 1h | **Score:** 1.95 | **Tipo:** UI debt
**MoSCoW:** Could Have

**Descricao:** Substituir cores hardcoded (`text-gray-900`, `text-gray-500`) na secao "Coming Soon" do ExpeditionHubPage por tokens de tema (`text-foreground`, `text-muted-foreground`) para consistencia com dark mode.

**Acceptance Criteria:**
- [ ] AC-001: Given o ExpeditionHubPage, when inspecionado, then nao usa classes de cor hardcoded (gray-900, gray-500)
- [ ] AC-002: Given dark mode habilitado, when a pagina e renderizada, then as cores da secao "Coming Soon" seguem o tema

---

### 6.4 Resumo de Capacidade

| Faixa | Items | Horas | % Budget |
|---|---|---|---|
| P0 (Verify) | T-S20-001 | 0.5h | 1% |
| P1 (Must Have) | T-S20-002, T-S20-003, T-S20-004 | 19h | 48% |
| P2 (Should Have) | T-S20-005, T-S20-006, T-S20-007 | 8h | 20% |
| Buffer (code review, descobertas, testes) | -- | 12.5h | 31% |
| **Total** | **7 items** | **40h** | **100%** |

**Nota sobre o buffer de 31%:** O buffer e intencionalmente alto porque:
1. T-S20-002 (preferencias) e um item novo sem spec tecnico previa -- pode haver descobertas sobre o schema de UserProfile.preferences
2. T-S20-003 (Phase 1 reorder) envolve refatoracao de wizard existente -- risco de regressao
3. T-S20-006 (passageiros) requer mudanca de modelo de dados -- migration + testes
4. O Sprint 19 falhou em entregar 2 de 12 itens por subestimacao do guide redesign. O buffer generoso protege contra o mesmo padrao.

**Ordem de sacrificio se houver estouro:** T-S20-007 -> T-S20-006 -> T-S20-005

Se T-S20-006 (passageiros) nao couber, ele se beneficia de ser entregue no Sprint 21 junto com o transporte (US-115), onde os detalhes de passageiros informam a logistica de viagem.

---

## 7. DIFERIDO -- Sprint 21+

| Item | Sprint Alvo | Estimativa | Racional |
|---|---|---|---|
| US-118: Campo `origin` no Trip | Sprint 21 | 4h | Pre-requisito para US-115. Entrega valor apenas com transporte |
| US-115: Registro de transporte principal | Sprint 21 | 16-20h | Feature L -- requer sprint dedicado com spec tecnico |
| US-117: Selecao de mobilidade local | Sprint 21 | 4h | Complementa US-115 |
| Renomeacao Fase 4: "O Abrigo" -> "A Logistica" | Sprint 21 | 2h | Acompanha US-115 |
| US-116: Registro de hospedagem | Sprint 22 | 10h | Mesma estrutura do transporte, segundo slot |
| US-119: Estimativa de custo por IA | Sprint 22 | 4h | Depende de US-115 (origin + destination + dates) |
| T-S19-011: Progress bar clicavel | Sprint 21+ | 3h | P2 -- diferido desde Sprint 19 |
| T-S19-012: Progress bar labels | Sprint 21+ | 2h | P2 -- diferido desde Sprint 19 |
| US-122: Chat IA sobre destino (Premium) | Futuro | 16-20h | Feature L -- requer infraestrutura de chat |

---

## 8. Distribuicao por Dev

### dev-fullstack-1 (~20h)

| Ordem | Task | Horas | Justificativa |
|---|---|---|---|
| 1 | T-S20-001 (verificar guide staging) | 0.5h | P0 -- verificacao imediata |
| 2 | T-S20-002 (preferencias - backend) | 5h | Schema UserProfile.preferences JSON, Zod validation, gamificacao (points + badge), integracao com prompt AI |
| 3 | T-S20-003 (Phase 1 reorder) | 8h | Refatoracao wizard steps, integracao Profile read/write, skip inteligente |
| 4 | T-S20-005 (SEC-S19-001 hash userId) | 1h | Quick fix mecanico |
| stretch | T-S20-007 (theme tokens) | 1h | Se sobrar capacidade |

### dev-fullstack-2 (~20h)

| Ordem | Task | Horas | Justificativa |
|---|---|---|---|
| 1 | T-S20-002 (preferencias - frontend) | 5h | UI de toggles/checkboxes, grid responsivo, 8 categorias, i18n |
| 2 | T-S20-004 (remover botoes duplicados) | 1h | Quick win -- limpar dashboard card |
| 3 | T-S20-006 (passageiros airline-style) | 6h | Steppers UI, modelo de dados TripTravelers, integracao wizard |
| stretch | Buffer para code review cruzado | 8h | Revisao T-S20-002/003 + testes adicionais |

### Cronograma Sugerido

| Dia | dev-fullstack-1 | dev-fullstack-2 |
|---|---|---|
| 1 | T-S20-001 (verify staging) + T-S20-002 backend (preferencias schema + API) | T-S20-004 (remover botoes) + T-S20-002 frontend (toggles UI inicio) |
| 2 | T-S20-002 backend (gamificacao + prompt integration) | T-S20-002 frontend (8 categorias + i18n + responsivo) |
| 3 | T-S20-003 (Phase 1 reorder - inicio) | T-S20-006 (passageiros - modelo + UI) |
| 4 | T-S20-003 (Phase 1 reorder - profile integration + skip) | T-S20-006 (passageiros - validacao + testes) |
| 5 | T-S20-005 (SEC-S19-001) + code review cruzado | Code review cruzado + T-S20-007 stretch |

**Coordenacao T-S20-002:** O tech-lead deve alinhar o contrato JSON de `UserProfile.preferences` no dia 1 antes de dev-1 (backend) e dev-2 (frontend) iniciarem suas frentes em paralelo. Proposta de estrutura:

```json
{
  "cuisine": ["local", "italian", "street_food"],
  "activities": ["museums", "hiking", "photography"],
  "pace": "moderate",
  "dayPeriod": ["morning", "evening"],
  "dietaryRestrictions": ["vegetarian"],
  "accessibility": [],
  "mealBudget": "moderate",
  "culturalInterests": ["ancient_history", "live_music"]
}
```

---

## 9. Dependencias e Coordenacao

| Dependencia | Items Afetados | Acao |
|---|---|---|
| Contrato JSON de preferencias | T-S20-002 (backend + frontend) | tech-lead define no dia 1 |
| Spec tecnico de TripTravelers | T-S20-006 | architect define antes do dia 3 |
| Deploy v0.13.0 no staging | T-S20-001 | devops-engineer confirma no dia 1 |
| Prompt engineer review | T-S20-002 (preferencias no prompt AI) | prompt-engineer revisa antes do dia 3 |

---

## 10. Riscos do Sprint

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| T-S20-002 (preferencias): schema UserProfile.preferences pode conflitar com campos existentes | Media | Alto | Verificar schema atual de UserProfile antes de iniciar. Usar campo JSON flexivel |
| T-S20-003 (Phase 1 reorder): refatoracao do wizard causa regressao em testes existentes | Media | Medio | Rodar suite completa apos cada mudanca de step order. Buffer generoso (31%) |
| T-S20-006 (passageiros): mudanca de modelo Trip.travelers quebra trips existentes | Baixa | Alto | Migration com default `{adults: 1, children: 0, infants: 0, seniors: 0}` para trips existentes |
| T-S20-002 + T-S20-003 juntos sobrecarregam o wizard da expedicao | Baixa | Medio | T-S20-003 (Phase 1 reorder) deve ser implementado ANTES de T-S20-002 (preferencias) para evitar conflitos na mesma area de codigo |

---

## 11. Criterios de Aceite do Sprint 20 (Product Owner)

- [ ] Preferencias pessoais exibem 8 categorias com toggles (nao texto livre)
- [ ] Preferencias persistem no UserProfile e sao reutilizadas em novas trips
- [ ] Gamificacao funciona: +10 pontos por categoria, badge "identity_explorer" com >= 5
- [ ] Fase 1 reordenada: "Sobre Voce" e o primeiro step
- [ ] Viajantes recorrentes tem Step 1 pre-populado com dados do Profile
- [ ] Botoes duplicados removidos do dashboard card
- [ ] SEC-S19-001: nenhum userId raw nos logs de gamificacao
- [ ] Guide redesign visivel e funcional no staging (verificacao)
- [ ] Zero testes quebrados (regressao zero)
- [ ] >= 30 novos testes (1395+ total)
- [ ] Cobertura >= 80% em todos os arquivos modificados

---

## 12. Briefings

### Para o Tech-Lead

**Contexto:** Sprint focado em UX e personalizacao -- nao ha features de infraestrutura pesada. Os dois items maiores (preferencias + Phase 1 reorder) afetam a mesma area do codigo (expedition wizard). Coordenar para evitar conflitos: Phase 1 reorder primeiro, preferencias depois.

**Risco principal:** T-S20-002 (preferencias) e T-S20-003 (Phase 1 reorder) tocam no wizard da Fase 1/2. Se dev-1 faz o reorder enquanto dev-2 adiciona toggles ao Phase 2, podem haver conflitos de merge. Recomendacao: T-S20-003 (reorder) deve ser mergeado antes de T-S20-002 (preferencias).

### Para o Prompt-Engineer

**Sprint 20 impacto:** T-S20-002 adiciona 8 categorias de preferencias estruturadas que devem ser incluidas nos prompts de geracao de itinerario e guia. Revisar os prompts atuais e definir como injetar as preferencias sem inflacionar o input token count excessivamente. Sugestao: resumir as preferencias em 2-3 linhas no prompt, nao listar todas as opcoes.

### Para o FinOps-Engineer

**Impacto de custo:** As preferencias estruturadas adicionam ~50-100 tokens ao input de cada prompt de geracao (itinerario + guia). Aumento de custo estimado: ~2-5% por geracao. Monitorar apos deploy.

### Para o Architect

**Decisoes necessarias antes do sprint:**
1. Schema de `UserProfile.preferences`: campo JSON ou colunas individuais? Recomendacao PO: JSON (flexivel, permite adicionar categorias sem migration)
2. Modelo de `TripTravelers`: struct embeddida no Trip (JSON) ou tabela separada? Recomendacao PO: JSON no Trip (v1), tabela separada se houver necessidade de query (v2)

---

## 13. Visao Adiante -- Sprint 21+

| Sprint | Tema | Items Principais |
|---|---|---|
| Sprint 21 | "A Logistica" -- Transporte | US-118 (origin), US-115 (transport), US-117 (mobility), Fase 4 rename |
| Sprint 22 | "A Logistica" -- Hospedagem | US-116 (accommodation), US-119 (AI cost estimate) |
| Sprint 23+ | Premium Features + Polish | US-122 (destination chat), progress bar clickable/labels, UX refinement |

---

*Backlog elaborado pelo product-owner em 2026-03-10 com base no Sprint 19 review, seeds de backlog Sprint 20, TRANSPORT-PHASE-SPEC, e inventario de debitos pendentes.*
