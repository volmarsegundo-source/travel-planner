# Achados de Teste Manual -- Pos-Sprint 17 (Staging)

> **Autor:** product-owner
> **Data:** 2026-03-09
> **Ambiente:** Staging (travel-planner-eight-navy.vercel.app)
> **Versao testada:** v0.11.0 (Sprint 17 completo)
> **Itens reportados:** 9
> **Fonte:** Teste manual por stakeholder

---

## 1. Tabela de Classificacao

| ID | Titulo | Tipo | Severidade | Fase Afetada | Personas |
|---|---|---|---|---|---|
| ITEM-1 | Busca de destino lenta e sem i18n | Bug P1 + UX Improvement | MEDIUM | Phase 1 (O Chamado) | @leisure-solo, @leisure-family |
| ITEM-2 | "O Explorador" precisa de mais personalizacao | UX Improvement | LOW | Phase 2 (O Explorador) | @leisure-solo, @leisure-family |
| ITEM-3 | "O Abrigo" nao mostra voos para viagens internacionais | Product Enhancement | HIGH | Phase 4 (O Abrigo) | @leisure-solo, @leisure-family, @business-traveler |
| ITEM-4 | "Mapa dos Dias" com info escondida demais | UX Improvement | MEDIUM | Phase 5 (O Mapa dos Dias) | @leisure-solo, @leisure-family |
| ITEM-5 | "O Roteiro" deveria auto-gerar na primeira visita | Product Enhancement | MEDIUM | Phase 6 (O Roteiro / O Tesouro) | @leisure-solo, @leisure-family |
| ITEM-6 | "O Roteiro" falha ao gerar roteiro | Bug P0 | CRITICAL | Phase 6 (O Roteiro / O Tesouro) | Todos |
| ITEM-7 | Barra de progresso sem indicadores de fase | UX Improvement | LOW | Dashboard / Todas as fases | @leisure-solo, @leisure-family |
| ITEM-8 | Cards de trip no dashboard precisam mostrar ferramentas por fase | UX Improvement + Architecture Decision | MEDIUM | Dashboard | @leisure-solo, @leisure-family |
| ITEM-9 | Botao "Continue" no card de trip nao funciona | Bug P0 | CRITICAL | Dashboard | Todos |

---

## 2. Analise Detalhada por Item

### ITEM-1: Busca de destino lenta e sem i18n

**Tipo:** Bug P1 + UX Improvement
**Severidade:** MEDIUM
**Componentes afetados:** `src/app/api/destinations/search/route.ts`, `src/components/features/expedition/DestinationAutocomplete.tsx`

**Problema:** A busca de destino via Nominatim (a) tem latencia perceptivel e (b) retorna resultados apenas em ingles, independente do locale do usuario. Para um usuario pt-BR buscando "Roma", os resultados aparecem como "Rome, Lazio, Italy" ao inves de "Roma, Lacio, Italia".

**Causa raiz:** A chamada ao Nominatim em `route.ts` nao inclui o parametro `accept-language`. O Nominatim suporta i18n via `accept-language=pt` (ou qualquer ISO 639-1 code). A lentidao pode ser mitigada com debounce mais agressivo no autocomplete e pre-aquecimento de cache Redis para destinos populares.

**Correcao proposta:**
1. Receber o parametro `locale` na query string da API
2. Passar `accept-language={locale}` para o Nominatim
3. Ajustar chave de cache Redis para incluir locale: `dest:search:{locale}:{query}`
4. Aumentar debounce no autocomplete de 300ms para 500ms

**Estimativa:** 2h
**Risco:** Baixo (mudanca isolada em API route + componente)

---

### ITEM-2: "O Explorador" precisa de mais personalizacao

**Tipo:** UX Improvement
**Severidade:** LOW
**Componentes afetados:** Phase 2 Wizard (ProfileAccordion, Phase2Wizard)

**Problema:** O perfil do explorador usa campos de texto aberto para preferencias, o que e pouco intuitivo. O stakeholder sugere toggles/checkboxes para categorias como tipo de culinaria, atividades preferidas, restricoes alimentares, etc.

**Dor do viajante:** Preferencias em texto livre nao sao aproveitadas de forma eficiente pelo AI. Opcoes estruturadas (toggles) melhoram a qualidade das recomendacoes e reduzem o atrito de preenchimento.

**Observacao PO:** Este item e relevante mas LOW porque o Phase 2 ja funciona e coleta dados. A melhoria e incremental. Recomendo postergar para um sprint de refinamento UX, quando o ux-designer puder fazer pesquisa de usuario para definir as categorias corretas.

**Estimativa:** 6h (design + implementacao + i18n para todas as opcoes)
**Risco:** Medio (requer decisoes de design, possivel mudanca de schema)

---

### ITEM-3: "O Abrigo" nao mostra voos para viagens internacionais

**Tipo:** Product Enhancement (ver Secao 3 para visao completa)
**Severidade:** HIGH
**Componentes afetados:** Phase 4 (O Abrigo) inteiro

**Problema:** Para viagens internacionais (ex: Sao Paulo -> Roma), a Phase 4 ("O Abrigo") so pergunta sobre aluguel de carro e CINH. Falta completamente:
- Deteccao de que e viagem internacional e que o viajante precisa de VOOS primeiro
- Opcoes de transporte entre paises (aviao, trem, onibus internacional)
- Transporte local no destino
- Sugestoes de hospedagem (que e o proprio nome da fase: "O Abrigo")

**Analise PO:** Este item revela que a Phase 4 esta incompleta. A fase foi implementada no Sprint 11 como um MVP minimo focado apenas em CINH (documento de habilitacao internacional). A visao completa da fase deveria cobrir transporte + hospedagem, com prioridade diferente dependendo do tipo de viagem.

**Dependencia critica:** Para detectar se uma viagem e internacional, o sistema precisa saber a cidade de ORIGEM do viajante. Hoje o Trip model so tem `destination`. Opcoes:
1. Usar `country` do UserProfile como origem (ja existe no schema)
2. Adicionar campo `origin` ao Trip model (mais preciso, permite viagens que nao partem de casa)

**Recomendacao PO:** Este e um item grande demais para Sprint 18. Definir a visao de produto completa agora (Secao 3), mas implementar em sprints dedicados. Para Sprint 18, considerar apenas adicionar o campo `origin` ao Trip model como preparacao.

**Estimativa:** 20-30h (visao completa); 3h (apenas adicionar origin ao Trip)
**Risco:** Alto (requer decisoes de arquitetura sobre integracao de voos/hospedagem)

---

### ITEM-4: "Mapa dos Dias" com info escondida demais

**Tipo:** UX Improvement
**Severidade:** MEDIUM
**Componentes afetados:** `DestinationGuideWizard.tsx`, Phase 5 UI

**Problema:** O guia de destino (Phase 5) apresenta informacoes em secoes colapsadas (acordeoes). O stakeholder acha que isso esconde conteudo valioso e sugere cards/carousel para apresentacao mais visual e engajante.

**Analise PO:** Concordo parcialmente. O acordeao foi a escolha de Sprint 11 para manter a pagina gerenciavel (o guia AI pode gerar muito conteudo). Mas o problema real e que o usuario nao sabe o que esta perdendo. Sugestoes:
1. Manter acordeao mas com preview visivel (primeiras 2-3 linhas de cada secao)
2. Adicionar cards de destaque para as 3 secoes mais relevantes no topo
3. Carousel e bonito mas adiciona complexidade de acessibilidade

**Estimativa:** 4h (preview + cards de destaque); 8h (com carousel)
**Risco:** Baixo (mudanca apenas de apresentacao, sem backend)

---

### ITEM-5: "O Roteiro" deveria auto-gerar na primeira visita

**Tipo:** Product Enhancement
**Severidade:** MEDIUM
**Componentes afetados:** `Phase6Wizard.tsx`, `src/app/[locale]/(app)/expedition/[tripId]/phase-6/page.tsx`

**Problema:** Quando o viajante chega na Phase 6 pela primeira vez, precisa clicar manualmente para gerar o roteiro. O stakeholder sugere:
1. Auto-gerar o roteiro na primeira visita (trigger automatico)
2. Mostrar disclaimer de que e gerado por AI
3. Se ja existe roteiro, mostrar o existente
4. Sempre mostrar botao "Regenerar"

**Analise PO:** O pedido e razoavel e resolve um ponto de atrito real. O viajante ja passou por 5 fases -- quando chega na Phase 6, quer ver resultados imediatamente. O auto-generate melhora a experiencia de "recompensa" da gamificacao.

**Consideracoes:**
- Auto-gerar consome tokens AI (~$0.02-0.05 por geracao com Sonnet). Aceitavel se o usuario chegou ate aqui.
- O disclaimer de AI e obrigatorio para compliance e confianca do usuario.
- A logica de "mostrar existente se ja gerado" JA EXISTE no Phase6Page (verifica `trip.itineraryDays`). So falta o trigger automatico.
- `ItineraryPlanService.getOrCreateItineraryPlan` ja e chamado no server component.

**Estimativa:** 4h
**Risco:** Medio (auto-trigger de chamada AI precisa de protecao contra dupla geracao)

---

### ITEM-6: "O Roteiro" falha ao gerar roteiro (BUG BLOCKING)

**Tipo:** Bug P0
**Severidade:** CRITICAL
**Componentes afetados:** `generateTravelPlanAction` em `ai.actions.ts`, `AiService.generateTravelPlan`, `ClaudeProvider`

**Problema:** Ao tentar gerar roteiro na Phase 6, o usuario ve a mensagem "Falha ao gerar roteiro. Tente novamente". O roteiro nao e gerado.

**Possíveis causas:**
1. `ANTHROPIC_API_KEY` nao configurada ou invalida no ambiente Vercel
2. Timeout da funcao serverless (maxDuration=120s pode nao ser suficiente no plano free do Vercel)
3. Rate limit do Anthropic atingido
4. Erro no parsing da resposta AI (schema Zod rejeitando resposta)
5. BOLA check falhando (trip nao encontrada ou currentPhase < 6)

**Investigacao necessaria:** Verificar logs do Vercel para o endpoint. O `logger.error("ai.generateTravelPlanAction.error")` deve ter o stack trace.

**Impacto:** BLOQUEANTE. Se o roteiro nao gera, a Phase 6 (feature principal do produto) esta inacessivel. Nenhuma feature AI funciona corretamente no staging.

**Estimativa:** 2-4h (depende da causa raiz)
**Risco:** Alto (pode exigir mudanca de plano Vercel ou ajuste de timeout)

---

### ITEM-7: Barra de progresso sem indicadores de fase

**Tipo:** UX Improvement
**Severidade:** LOW
**Componentes afetados:** `ExpeditionProgressBar.tsx`, `ExpeditionCard.tsx`

**Problema:** A barra de progresso no dashboard e nas paginas de fase e uma barra simples sem indicadores visuais de qual fase o usuario esta, quais ja foram completadas, e quais estao por vir.

**Sugestao do stakeholder:** Adicionar marcadores na barra (dots ou steps) representando cada uma das 8 fases, com cores diferentes para completa/ativa/bloqueada. Fases com tarefas pendentes devem ser destacadas.

**Analise PO:** Excelente sugestao. A barra atual e funcional mas nao comunica o estado da expedição. Um stepper visual (similar ao de processos de checkout) seria mais informativo e alinhado com a narrativa de gamificacao.

**Estimativa:** 4h
**Risco:** Baixo (componente visual, sem backend)

---

### ITEM-8: Cards de trip no dashboard precisam mostrar ferramentas por fase

**Tipo:** UX Improvement + Architecture Decision (ver Secao 3 para visao completa)
**Severidade:** MEDIUM
**Componentes afetados:** `ExpeditionCard.tsx`, `AtlasDashboard.tsx`

**Problema:** Os cards de trip no dashboard mostram apenas destino, fase atual, e progresso numerico. O stakeholder quer:
1. Mostrar as ferramentas disponiveis por fase (Checklist, Guia, Roteiro, etc.)
2. Ferramentas de fases futuras como "Coming Soon" (em cinza/desabilitado)
3. Ferramentas de fases completas como acessiveis (clicaveis)
4. Design que comunique TODAS as 8 fases planejadas, nao apenas as implementadas

**Analise PO:** O card atual ja tem shortcuts condicionais (checklist a partir da fase 5, itinerario quando gerado). A sugestao e expandir isso para uma visualizacao completa do toolkit da expedicao. Isso requer definir quais ferramentas pertencem a cada fase (ver Secao 3).

**Dependencia:** Este item depende da definicao completa da visao de fases (Secao 3). Sem saber quais ferramentas existem para fases 6-8, nao e possivel desenhar o card completo.

**Estimativa:** 6h (implementacao apos definicao da visao)
**Risco:** Medio (requer decisao de produto sobre fases 6-8)

---

### ITEM-9: Botao "Continue" no card de trip nao funciona (BUG BLOCKING)

**Tipo:** Bug P0
**Severidade:** CRITICAL
**Componentes afetados:** `ExpeditionCard.tsx`

**Problema:** O botao/link "Continue" (ou "Ver Expedicao") no card de trip do dashboard nao navega para a expedicao. O click nao produz efeito.

**Possivel causa:** O `ExpeditionCard` usa um `Link` absoluto (`href={/expedition/${tripId}}`) envolvendo todo o card, com shortcuts usando `z-20` para ficar acima. O link wrapper tem `z-0`. Se houver um problema de CSS stacking context, ou se o evento esta sendo interceptado, o link pode nao funcionar.

**Outra hipotese:** O `ExpeditionHubPage` redireciona imediatamente para a fase correta. Se o redirect falhar (ex: erro no `PhaseEngine.getCurrentPhase` capturado silenciosamente), o usuario pode ficar preso.

**Impacto:** BLOQUEANTE. Se o usuario nao consegue acessar suas expedicoes pelo dashboard, a navegacao principal esta quebrada.

**Estimativa:** 1-2h
**Risco:** Baixo (provavelmente fix de CSS ou logica de redirect)

---

## 3. Visao de Produto: As 8 Fases da Expedicao Atlas

### 3.1 Mapa Completo de Fases e Ferramentas

Baseado no `phase-config.ts`, na analise de codigo, e nas necessidades levantadas pelo stakeholder:

| # | Fase | Nome i18n | Tipo | Ferramenta Principal | Estado Atual | Bloqueante? |
|---|---|---|---|---|---|---|
| 1 | O Chamado | phases.theCalling | Setup | Criar expedicao (destino, datas, viajantes) | IMPLEMENTADO (Sprint 10) | Sim |
| 2 | O Explorador | phases.theExplorer | Perfil | Preferencias de viagem (estilo, orcamento, notas) | IMPLEMENTADO (Sprint 10-11) | Sim |
| 3 | A Rota | phases.theRoute | Checklist | Checklist de preparacao (documentos, vacinas, seguro) | IMPLEMENTADO (Sprint 11) | Nao (non-blocking) |
| 4 | O Abrigo | phases.theShelter | Transporte | Transporte + Hospedagem (car rental, CINH hoje; voos + hotel futuro) | PARCIAL (Sprint 11, so CINH) | Nao (non-blocking) |
| 5 | O Mapa dos Dias | phases.theDayMap | Guia | Guia de destino AI (cultura, clima, dicas, pontos turisticos) | IMPLEMENTADO (Sprint 16) | Sim |
| 6 | O Tesouro | phases.theTreasure | Roteiro | Roteiro diario AI (itinerario dia a dia com atividades) | IMPLEMENTADO (Sprint 16) | Sim |
| 7 | A Expedicao | phases.theExpedition | Em viagem | Modo ao vivo: tracking de atividades, notas de campo, fotos | NAO IMPLEMENTADO | Sim |
| 8 | O Legado | phases.theLegacy | Retrospectiva | Retrospectiva: review, fotos, medalhas finais, compartilhamento | NAO IMPLEMENTADO | Sim |

### 3.2 Jornada Completa do Viajante

```
ANTES DA VIAGEM (planejamento)
================================

[Phase 1: O Chamado]
  - Viajante cria uma nova expedicao
  - Define: destino, datas, numero de viajantes, emoji de capa
  - Sistema: classifica tipo de viagem (domestica/mercosul/schengen/internacional)
  - Recompensa: +100 pontos, badge "first_step"
  |
  v
[Phase 2: O Explorador]
  - Viajante define seu perfil de viagem
  - Define: estilo de viagem, orcamento, moeda, notas especiais
  - [FUTURO] Toggles estruturados: culinaria, atividades, acessibilidade, ritmo
  - Recompensa: +150 pontos, rank "explorer"
  |
  v
[Phase 3: A Rota] (non-blocking -- pode pular e voltar)
  - AI gera checklist personalizada baseada no tipo de viagem
  - Viajante marca itens: passaporte, visto, seguro, vacinas, moeda local
  - Itens obrigatorios vs recomendados
  - Viajante pode voltar a qualquer momento antes da viagem
  - Recompensa ao completar: +75 pontos, badge "navigator"
  |
  v
[Phase 4: O Abrigo] (non-blocking -- pode pular e voltar)
  - ESTADO ATUAL: pergunta sobre aluguel de carro + CINH
  - VISAO COMPLETA (ver 3.3): transporte inter-cidades + hospedagem + transporte local
  - Para viagens internacionais: voos PRIMEIRO, depois hospedagem
  - Para viagens domesticas: transporte terrestre + hospedagem
  - Recompensa ao completar: +50 pontos, badge "host"
  |
  v
[Phase 5: O Mapa dos Dias]
  - AI gera guia completo do destino
  - Secoes: cultura, clima, gastronomia, transporte local, seguranca, dicas
  - Viajante marca secoes lidas
  - Prerequisito para Phase 6: guia deve existir (enriquece o roteiro)
  - Recompensa: +40 pontos, rank "cartographer"
  |
  v
[Phase 6: O Tesouro]
  - AI gera roteiro diario (itinerario completo)
  - Usa dados das fases 2 (preferencias) + 5 (guia) para personalizar
  - Viajante pode regenerar, ajustar, adicionar notas
  - [FUTURO] Mapa interativo com pontos do roteiro
  - Recompensa: +250 pontos, badge "treasurer"

DURANTE A VIAGEM
================================

[Phase 7: A Expedicao] (NAO IMPLEMENTADO)
  - Modo ao vivo durante a viagem
  - Ferramentas planejadas:
    * Checklist diaria (atividades do roteiro como tarefas)
    * Notas de campo (diario de viagem)
    * Registro de gastos reais vs orcamento
    * [FUTURO] Upload de fotos por dia
    * [FUTURO] Localizacao em mapa (opt-in)
    * [FUTURO] Notificacoes de atividades proximas
  - Recompensa: +400 pontos, rank "pathfinder"

APOS A VIAGEM
================================

[Phase 8: O Legado] (NAO IMPLEMENTADO)
  - Retrospectiva pos-viagem
  - Ferramentas planejadas:
    * Avaliacao da viagem (1-5 estrelas + texto)
    * Resumo de gastos reais
    * [FUTURO] Album de fotos organizado por dia
    * [FUTURO] Compartilhamento social (link publico do roteiro)
    * [FUTURO] Recomendacao para outros viajantes
    * [FUTURO] Conquistas desbloqueadas (medalhas especiais por tipo de viagem)
  - Recompensa: +500 pontos, badge "ambassador"
```

### 3.3 Visao Completa da Phase 4 (O Abrigo) -- Requisitada pelo Stakeholder

A Phase 4 deveria adaptar-se ao tipo de viagem detectado:

**Viagem Internacional (ex: Sao Paulo -> Roma)**
```
1. TRANSPORTE INTER-CIDADES (prioridade maxima)
   - Tipo: Voo internacional
   - Info: "Voce vai precisar de voo de [origem] para [destino]"
   - [FUTURO] Links para buscadores de voo (Google Flights, Skyscanner)
   - [FUTURO] Estimativa de preco AI baseada em datas
   - Checklist: reserva confirmada? (sim/nao)

2. TRANSPORTE LOCAL NO DESTINO
   - Opcoes: metro, onibus, taxi, aluguel de carro, a pe
   - Se aluguel de carro:
     * CINH obrigatorio para Schengen/Internacional
     * CNH brasileira valida para Mercosul
     * Deadline de 45 dias antes da viagem

3. HOSPEDAGEM
   - Tipo: hotel, hostel, Airbnb, casa de amigos
   - [FUTURO] Links para buscadores (Booking, Airbnb)
   - [FUTURO] Estimativa de preco AI por noite
   - Checklist: reserva confirmada? (sim/nao)
```

**Viagem Domestica (ex: Sao Paulo -> Salvador)**
```
1. TRANSPORTE INTER-CIDADES
   - Opcoes: voo domestico, onibus, carro proprio, carona
   - Se voo: info sobre bagagem
   - Se carro: CNH regular suficiente
   - Checklist: transporte confirmado? (sim/nao)

2. TRANSPORTE LOCAL NO DESTINO
   - Opcoes: transporte publico, aluguel de carro, taxi/app, a pe
   - Se aluguel: CNH regular suficiente

3. HOSPEDAGEM
   - Mesmo fluxo que internacional
```

**Viagem Mercosul (ex: Sao Paulo -> Buenos Aires)**
```
1. TRANSPORTE INTER-CIDADES
   - Opcoes: voo, onibus internacional
   - Info: "Nao precisa de passaporte para Mercosul, RG e suficiente"
   - Checklist: transporte confirmado?

2. TRANSPORTE LOCAL + HOSPEDAGEM
   - Mesmo fluxo (CNH brasileira valida no Mercosul)
```

**Requisito de origem:** Para implementar essa logica, o sistema precisa saber de onde o viajante esta partindo. Opcoes:
- **Opcao A:** Usar `UserProfile.country + UserProfile.city` como origem padrao
- **Opcao B:** Adicionar campo `origin` (cidade de partida) ao modelo Trip
- **Recomendacao PO:** Opcao B. Nem toda viagem parte de casa. O viajante pode estar em viagem de negocios em outra cidade e quer planejar um side trip. O campo `origin` deve ser coletado na Phase 1 (O Chamado), junto com o destino.

### 3.4 Ferramentas por Fase para ExpeditionCard (ITEM-8)

Mapeamento de ferramentas (tools) para cada fase, para uso no card do dashboard:

| Fase | Ferramenta | Icone | Link | Estado |
|---|---|---|---|---|
| 1 | Detalhes da Viagem | (info) | /expedition/{id} | Sempre acessivel |
| 2 | Perfil do Explorador | (user) | /expedition/{id}/phase-2 | Acessivel se fase >= 2 |
| 3 | Checklist | (list) | /expedition/{id}/phase-3 | Acessivel se fase >= 3 |
| 4 | Transporte e Hospedagem | (home) | /expedition/{id}/phase-4 | Acessivel se fase >= 4 |
| 5 | Guia de Destino | (map) | /expedition/{id}/phase-5 | Acessivel se fase >= 5 |
| 6 | Roteiro | (calendar) | /expedition/{id}/phase-6 | Acessivel se fase >= 6 |
| 7 | Modo Expedicao | (compass) | -- | Coming Soon |
| 8 | Retrospectiva | (trophy) | -- | Coming Soon |

---

## 4. Priorizacao com Scoring Matrix

Criterios (pesos): Dor do viajante 30% + Impacto em receita 25% + Esforco inverso 20% + Alinhamento estrategico 15% + Diferencial competitivo 10%

| Rank | Item | Dor (30%) | Receita (25%) | Esforco inv. (20%) | Estrategia (15%) | Diferencial (10%) | Score | Estimativa |
|---|---|---|---|---|---|---|---|---|
| 1 | ITEM-6 (Bug: roteiro nao gera) | 5 (1.50) | 5 (1.25) | 4 (0.80) | 5 (0.75) | 5 (0.50) | **4.80** | 2-4h |
| 2 | ITEM-9 (Bug: botao Continue) | 5 (1.50) | 5 (1.25) | 5 (1.00) | 4 (0.60) | 3 (0.30) | **4.65** | 1-2h |
| 3 | ITEM-1 (Busca lenta + sem i18n) | 4 (1.20) | 3 (0.75) | 4 (0.80) | 4 (0.60) | 4 (0.40) | **3.75** | 2h |
| 4 | ITEM-5 (Roteiro auto-gerar) | 4 (1.20) | 3 (0.75) | 3 (0.60) | 4 (0.60) | 4 (0.40) | **3.55** | 4h |
| 5 | ITEM-4 (Guia com info escondida) | 3 (0.90) | 2 (0.50) | 3 (0.60) | 4 (0.60) | 4 (0.40) | **3.00** | 4h |
| 6 | ITEM-7 (Progress bar com fases) | 3 (0.90) | 2 (0.50) | 3 (0.60) | 3 (0.45) | 4 (0.40) | **2.85** | 4h |
| 7 | ITEM-8 (Cards com ferramentas) | 3 (0.90) | 2 (0.50) | 2 (0.40) | 4 (0.60) | 4 (0.40) | **2.80** | 6h |
| 8 | ITEM-2 (Explorador toggles) | 2 (0.60) | 2 (0.50) | 2 (0.40) | 3 (0.45) | 3 (0.30) | **2.25** | 6h |
| 9 | ITEM-3 (Abrigo completo) | 4 (1.20) | 3 (0.75) | 1 (0.20) | 4 (0.60) | 5 (0.50) | **3.25** | 20-30h |

**Nota sobre ITEM-3:** Apesar do score alto (3.25), o esforco e desproporcional (20-30h). Recomendo fracionar: adicionar campo `origin` ao Trip (3h) no Sprint 18, e a implementacao completa em Sprint 19-20.

---

## 5. Backlog Final Sprint 18 (com Decisoes do Stakeholder)

> **Status:** FINALIZADO em 2026-03-09
> **Decisoes do stakeholder:** 7/7 respondidas (ver Secao 6 para registro)
> **Capacidade:** ~40h (2 devs, ~20h cada)

### Decisoes Aplicadas (Resumo)

| # | Pergunta | Decisao | Impacto no Backlog |
|---|---|---|---|
| Q1 | Vercel timeout | Streaming responses (sem upgrade para Pro) | ITEM-6 vira mudanca arquitetural (~8h, nao 4h) |
| Q2 | Localizacao do usuario | Coletar no onboarding + editavel no perfil | Prep work para ITEM-3, entra como P1 neste sprint |
| Q3 | Escopo de transporte | Estimativas AI por enquanto, booking e futuro | ITEM-3 full fica em Sprint 19+ com escopo AI-first |
| Q4 | Cards "Coming Soon" | SIM, mostrar fases 7-8 como "Em construcao" | ITEM-8 confirmado, inclui fase completa |
| Q5 | Auto-geracao de roteiro | SIM, auto-gerar + botao Regenerar + disclaimer AI | ITEM-5 confirmado, depende de ITEM-6 (streaming) |
| Q6 | ANTHROPIC_API_KEY | Ja configurada no Vercel staging | Sem acao necessaria |
| Q7 | ENCRYPTION_KEY | Nao necessaria no staging por enquanto | Sem acao necessaria |

### Cadeia de Dependencias Critica

```
ITEM-6 (Streaming) ──> ITEM-5 (Auto-geracao)
    |
    * ITEM-6 NAO e mais um simples "investigar + corrigir"
    * E uma mudanca ARQUITETURAL: migrar geracao AI de Server Action
      para API Route com streaming (contorna limite de 10s do Vercel Hobby)
    * Requer: nova API route, ReadableStream, cliente SSE/fetch stream,
      adaptacao do AiProvider para suportar streaming
    * Estimativa revisada: 8h (era 4h antes da decisao Q1)
    *
    * ITEM-5 so pode ser implementado APOS streaming funcionar,
      porque auto-gerar um roteiro que falha por timeout seria pior
      que nao auto-gerar
```

---

### P0 -- MUST HAVE (~21.25h)

Itens obrigatorios para este sprint. Sem eles, o produto nao e demonstravel.

| # | ID | Descricao | Estimativa | Decisao Aplicada | Dependencia |
|---|---|---|---|---|---|
| 1 | SEC-S17-003 | Limpeza completa de dados na exclusao de conta (LGPD) | 2h | -- | Nenhuma |
| 2 | SEC-S17-004 | Hash userId em trip.actions.ts | 0.5h | -- | Nenhuma |
| 3 | SEC-S17-005 | Hash userId em auth.service.ts | 0.5h | -- | Nenhuma |
| 4 | SEC-S17-006 | Hash userId em profile.service.ts | 0.25h | -- | Nenhuma |
| 5 | ITEM-9 | Fix: botao "Continue" no card de trip nao funciona | 2h | -- | Nenhuma |
| 6 | ITEM-6 | Migrar geracao AI para streaming (contornar timeout Vercel Hobby 10s) | 8h | Q1: Streaming | Nenhuma |
| 7 | ITEM-1 | Busca de destino: i18n (accept-language) + performance | 2h | -- | Nenhuma |
| 8 | ITEM-5 | Auto-gerar roteiro na primeira visita + disclaimer AI + botao Regenerar | 6h | Q5: SIM | ITEM-6 concluido |

**Total P0: ~21.25h (53% da capacidade)**

**Notas de escopo por item:**

**ITEM-6 -- Streaming (8h, Q1):**
- Criar API route `POST /api/ai/generate-plan` com ReadableStream
- Adaptar `AiProvider.generateResponse` para suportar modo streaming (Anthropic SDK suporta nativamente)
- Cliente: consumir stream com fetch + ReadableStream reader
- Manter Server Action existente como fallback para chamadas nao-streaming (checklist, guide -- que sao rapidas)
- Nao e necessario streaming para checklist/guide (Haiku responde em <5s, dentro do limite)
- Testes: mock de stream, teste de timeout, teste de erro parcial

**ITEM-5 -- Auto-geracao (6h, Q5):**
- Na Phase 6, se `trip.itineraryDays` esta vazio, disparar geracao automaticamente via streaming
- Mostrar estado de loading com indicador de progresso (stream parcial visivel ao usuario)
- Disclaimer AI bilingual (pt/en): "Este roteiro foi gerado por inteligencia artificial. Verifique horarios e precos localmente."
- Botao "Regenerar" sempre visivel quando roteiro ja existe
- Protecao contra dupla geracao: lock Redis com TTL (60s) por tripId
- Estimativa revisada de 4h para 6h: a integracao com streaming adiciona complexidade ao trigger automatico

**ITEM-9 -- Botao Continue (2h):**
- Investigar CSS z-index stacking context no ExpeditionCard
- Verificar redirect logic no ExpeditionHubPage
- Fix provavelmente simples (CSS ou href), mas alocar 2h para investigacao segura

**ITEM-1 -- Busca i18n (2h):**
- Passar `locale` via query param, `accept-language` para Nominatim
- Cache key: `dest:search:${locale}:${normalizedQuery}`
- Rate limit: ajustar de 1 req/sec para 10 req/min (melhor para autocomplete)
- Fetch timeout: AbortController com 3s no Nominatim
- Client-side: AbortController para cancelar request anterior (race condition fix)

---

### P1 -- SHOULD HAVE (~12h)

Itens que agregam valor significativo e cabem na capacidade restante.

| # | ID | Descricao | Estimativa | Decisao Aplicada | Dependencia |
|---|---|---|---|---|---|
| 9 | ITEM-8 | Cards de trip com ferramentas por fase + fases 7-8 "Em construcao" | 6h | Q4: SIM, mostrar todas as 8 fases | ITEM-9 concluido |
| 10 | ITEM-7 | Progress bar com indicadores de fase (stepper visual) | 4h | Q4: complemento natural | Nenhuma |
| 11 | Q2-PREP | Coletar localizacao do usuario no onboarding + campo editavel no perfil | 2h | Q2: Onboarding + perfil | Nenhuma |

**Total P1: ~12h (30% da capacidade)**

**Notas de escopo por item:**

**ITEM-8 -- Phase Tools Registry + Dashboard (6h, Q4):**
- Estender `PhaseDefinition` em `phase-config.ts` com array `tools` (conforme proposta do architect)
- Cada ferramenta com: `key`, `nameKey`, `descriptionKey`, `icon`, `status` (available/coming_soon/premium)
- Fases 7-8: renderizar como cards com icone de cadeado e label "Em construcao" (nao "Coming Soon" -- manter pt-BR)
- Fases 1-6: mostrar ferramentas acessiveis com links para `/phase-N`
- i18n: adicionar chaves para todos os nomes de ferramentas (pt + en)
- NAO implementar as paginas de fase 7-8, apenas os cards de preview

**ITEM-7 -- Stepper Visual (4h):**
- Substituir barra de progresso simples por stepper com 8 pontos (um por fase)
- Cores: verde (completa), azul (ativa), cinza (futura), cinza com cadeado (nao implementada)
- Tooltip com nome da fase ao passar o mouse
- Responsivo: em mobile, manter dots compactos sem labels

**Q2-PREP -- Localizacao no Onboarding (2h, Q2):**
- Adicionar campo de localizacao (cidade/pais) no OnboardingWizard (passo 1 ou 2)
- Reusar `DestinationAutocomplete` para busca de cidade (mesmo componente, label diferente)
- Salvar em `UserProfile.city` e `UserProfile.country` (campos ja existem no schema)
- Campo editavel na pagina de perfil (`/account`)
- NAO adicionar campo `origin` ao Trip model neste sprint (isso e Sprint 19, ITEM-3)
- Este item PREPARA o terreno para ITEM-3: quando o Trip precisar de origin, ja tera o default do perfil

---

### P2 -- COULD HAVE (Stretch Goals, ~4h)

Se sobrar tempo apos P0 e P1. Nao comprometidos.

| # | ID | Descricao | Estimativa | Notas |
|---|---|---|---|---|
| 12 | ITEM-4 | Guia de destino: preview visivel + cards de destaque | 4h | UX improvement, sem backend |
| 13 | OPT-008 | Output guardrails para respostas AI | 3h | Deferido de S17, P1 de seguranca |

---

### DEFERRED -- Sprint 19+ (Nao entra neste sprint)

| ID | Descricao | Estimativa | Sprint Alvo | Justificativa |
|---|---|---|---|---|
| ITEM-3 (schema) | Adicionar `origin`, `destinationCountry`, `countryCode`, lat/lon ao Trip | 4h | Sprint 19 | Depende de Q2-PREP estar pronto, requer ADR-009 |
| ITEM-3 (classifier) | Refatorar trip-classifier para country codes bidirecionais | 2h | Sprint 19 | Acompanha schema change |
| ITEM-3 (transport) | Recomendador de transporte (Haversine + heuristic rules) | 6h | Sprint 19 | Q3: AI estimates, nao booking |
| ITEM-3 (phase4) | Phase 4 completa: transporte AI + hospedagem AI | 12-18h | Sprint 19-20 | Q3: escopo AI-first, sem integracao de booking |
| ITEM-2 | Explorador: toggles e categorias estruturadas | 6h | Sprint 20+ | Requer pesquisa de usuario (ux-designer) |
| GeminiProvider | Implementar provider Gemini Flash para tier free | 8h | Sprint 19-20 | Q6: roadmap futuro |
| OPT-009/011/012 | Batch API, circuit breaker, fallback chain | 6-10h | Sprint 20+ | Otimizacoes de resiliencia |
| DEBT-S6-003 | Analytics events | 4h | Sprint 20+ | Precisa de provider (PostHog?) |

---

### Resumo de Capacidade Sprint 18

| Bloco | Horas | % Capacidade | Status |
|---|---|---|---|
| P0 -- MUST HAVE (SEC + bugs + streaming + auto-gerar) | 21.25h | 53% | Comprometido |
| P1 -- SHOULD HAVE (dashboard UX + onboarding location) | 12h | 30% | Comprometido |
| Buffer (code review, testes, descobertas durante streaming) | 6.75h | 17% | Reservado |
| **Total** | **40h** | **100%** | |

**Analise de risco da carga:**
- A carga P0 subiu de 38% para 53% em relacao a proposta anterior. Isso se deve a decisao Q1 (streaming) que transformou ITEM-6 de 4h para 8h e ITEM-5 de 4h para 6h.
- O buffer de 17% e menor que o ideal (recomendado: 20-25%), MAS e aceitavel porque:
  - Os 4 itens SEC sao mecanicos (3.25h, risco baixo)
  - ITEM-9 e provavelmente um fix simples (CSS/redirect)
  - O risco real esta concentrado em ITEM-6 (streaming). Se a implementacao de streaming exceder 8h, ITEM-4 (P2) e o item sacrificado primeiro, seguido de ITEM-7 (P1)
- Ordem de sacrificio se houver estouro: ITEM-4 -> OPT-008 -> ITEM-7 -> Q2-PREP

### Ordem de Execucao Recomendada

```
Semana 1 (Dev-1 + Dev-2 em paralelo):
  Dev-1: SEC-S17-003/004/005/006 (3.25h) + ITEM-9 (2h) + ITEM-1 (2h)
  Dev-2: ITEM-6 streaming (8h -- sprint inteiro se necessario)

Semana 2 (apos streaming funcionar):
  Dev-1: ITEM-7 stepper (4h) + Q2-PREP onboarding location (2h)
  Dev-2: ITEM-5 auto-geracao (6h, depende de ITEM-6) + ITEM-8 phase tools (6h)

Stretch (se sobrar tempo):
  Dev-1 ou Dev-2: ITEM-4 (4h) ou OPT-008 (3h)
```

**Nota sobre paralelismo:** Dev-2 fica dedicado a ITEM-6 (streaming) na semana 1 porque e o item de maior risco e mais complexo tecnicamente. Dev-1 limpa itens menores em paralelo. Na semana 2, ITEM-5 so comeca quando ITEM-6 esta concluido e testado.

---

## 6. Decisoes do Stakeholder (Registro)

> Perguntas originais enviadas em 2026-03-09. Respostas recebidas em 2026-03-09.

### Q1 -- Vercel Timeout (ITEM-6)

**Pergunta:** Qual e o plano do Vercel? Hobby tem limite de 10s para serverless.
**Resposta:** Implementar streaming responses (sem custo extra). NAO fazer upgrade para Vercel Pro. Streaming contorna o limite de 10s no plano Hobby.
**Impacto:** ITEM-6 deixa de ser "investigar causa raiz" e passa a ser "implementar streaming". Mudanca arquitetural que afeta toda a camada de geracao AI. Estimativa revisada de 4h para 8h.

### Q2 -- Localizacao do Usuario (ITEM-3 prep)

**Pergunta:** Como coletar a origem do viajante?
**Resposta:** Coletar durante o onboarding + editavel no perfil. Isso habilita deteccao de viagem internacional para ITEM-3 (Sprint 19+).
**Impacto:** Novo item Q2-PREP (2h) entra como P1 no Sprint 18. O campo `origin` no Trip model fica para Sprint 19.

### Q3 -- Escopo de Transporte (ITEM-3)

**Pergunta:** Phase 4 deve integrar com buscadores de preco?
**Resposta:** Estimativas AI por enquanto. Booking integration e futuro, nao prioridade.
**Impacto:** ITEM-3 (full) fica mais leve: escopo AI-first com estimativas de preco geradas pelo modelo, sem APIs externas de booking. Estimativa revisada de 20-30h para 12-18h. Permanece em Sprint 19-20.

### Q4 -- Cards "Coming Soon" (ITEM-7, ITEM-8)

**Pergunta:** Mostrar fases 7-8 como "Em breve" ou esconder?
**Resposta:** SIM, mostrar como "Em construcao". Desenhar o sistema completo de 8 fases agora.
**Impacto:** ITEM-8 confirmado com escopo expandido: inclui phase-tools registry completo para todas as 8 fases. Cards de fases 7-8 com visual de cadeado e label "Em construcao".

### Q5 -- Auto-geracao de Roteiro (ITEM-5)

**Pergunta:** Auto-gerar roteiro na primeira visita?
**Resposta:** SIM, auto-gerar. Botao "Regenerar" disponivel. Adicionar disclaimer de AI.
**Impacto:** ITEM-5 confirmado. Depende de ITEM-6 (streaming) estar pronto. Disclaimer bilingual obrigatorio.

### Q6 -- ANTHROPIC_API_KEY

**Pergunta:** Chave configurada no Vercel?
**Resposta:** Ja configurada no staging. GeminiProvider e roadmap futuro.
**Impacto:** Nenhuma acao necessaria neste sprint. Confirma que ITEM-6 nao e problema de chave ausente -- e problema de timeout.

### Q7 -- ENCRYPTION_KEY

**Pergunta:** Necessaria no staging?
**Resposta:** Nao necessaria por enquanto. Skip.
**Impacto:** Campos criptografados do UserProfile (passportNumber, nationalId) nao funcionarao no staging. Aceitavel para MVP/demo.

---

## 7. Riscos Identificados (Atualizado)

| Risco | Probabilidade | Impacto | Mitigacao | Status |
|---|---|---|---|---|
| ITEM-6: Implementacao de streaming excede 8h (complexidade de adaptar AiProvider + cliente + testes) | Media | ALTO | Dev-2 dedicado na semana 1. Se exceder 10h, sacrificar ITEM-4 e ITEM-7. Streaming para checklist/guide NAO e necessario (Haiku <5s). | ATIVO |
| ITEM-5: Dupla geracao por race condition (usuario navega rapido, trigger dispara 2x) | Media | Baixo | Lock Redis com TTL 60s por tripId. Verificar `itineraryDays.length > 0` antes de disparar. | ATIVO |
| ITEM-8: Fases 7-8 "Em construcao" gera expectativa sem timeline | Baixa | Baixo | Q4 confirmou que stakeholder aceita o risco. Nao incluir timeline nos cards -- apenas "Em construcao". | ACEITO |
| Q2-PREP: Onboarding location pode confundir usuarios que ja completaram onboarding | Baixa | Baixo | Usuarios existentes preenchem via perfil (/account). Onboarding so afeta novos usuarios. | ACEITO |
| Streaming nao funciona com Vercel Hobby (edge cases de buffering) | Baixa | ALTO | Vercel Hobby suporta streaming via Edge Runtime e Serverless. Testar com `Transfer-Encoding: chunked`. Se falhar, escalar para stakeholder sobre Pro. | MONITORAR |

### Riscos Removidos (resolvidos pelas decisoes)

| Risco Original | Resolucao |
|---|---|
| ITEM-6 causado por ANTHROPIC_API_KEY ausente | Q6: Chave ja configurada. Descartado. |
| ITEM-6 requer upgrade para Vercel Pro ($20/mes) | Q1: Streaming contorna o limite. Descartado. |
| ITEM-3 escopo de booking integration gera PCI-DSS | Q3: AI estimates only. Sem booking, sem PCI-DSS. Descartado. |

---

## 8. Perguntas Remanescentes (Nao-Bloqueantes)

Nenhuma pergunta bloqueante para iniciar o Sprint 18. As seguintes perguntas ficam para refinamento durante o sprint ou para Sprint 19:

1. **Texto exato do disclaimer AI (ITEM-5):** Proposta definida pelo PO: "Este roteiro foi gerado por inteligencia artificial. Verifique horarios e precos localmente." Se o stakeholder quiser revisar, pode ser ajustado via i18n sem mudanca de codigo.

2. **Categorias de preferencia do Explorador (ITEM-2):** Deferido para Sprint 20+. Requer pesquisa de usuario pelo ux-designer antes de definir as opcoes.

3. **Label exata para fases 7-8:** Proposta: "Em construcao". Se preferir outra redacao, e uma mudanca de i18n.

4. **Streaming: Edge Runtime vs Serverless?** Decisao tecnica para o architect/tech-lead. Ambos suportam streaming no Vercel Hobby, mas Edge tem cold start menor. Recomendacao PO: o que for mais simples de implementar.

---

*Documento elaborado pelo product-owner em 2026-03-09. Atualizado com decisoes do stakeholder em 2026-03-09. Baseado em teste manual de stakeholder, analise de codigo, analise do architect, e decisoes de produto.*
