# Sprint 19 -- Backlog Priorizado

> **Autor:** product-owner
> **Data:** 2026-03-10
> **Sprint anterior:** 18 (completo, mergeado em master, v0.12.0)
> **Capacidade Sprint 19:** ~40h (2 devs full-stack, ~20h cada)
> **Versao do produto:** 0.12.0 | **Testes:** 1288 passando, 0 falhas
> **Tema:** "Guide Redesign + Stabilization"

---

## 1. Sumario Executivo

O Sprint 18 entregou funcionalidades significativas (v0.12.0, 1288 testes), mas testes manuais revelaram 14 itens que precisam ser triados, classificados e priorizados para Sprint 19. Adicionalmente, 1 finding de seguranca (SEC-S18-001) permanece pendente.

**Decisoes de stakeholder ja confirmadas:**
- ITEM-13 (Transport expansion): DIFERIDO para Sprint 20
- ITEM-14 (Guide redesign): AGENDADO para Sprint 19
- Fase 4 renomeada: "O Abrigo" -> "A Logistica"
- Guia gerado para TODAS as viagens (domesticas + internacionais)
- Highlights banner no topo do guia aprovado
- Feedback thumbs up/down -> FUTURO
- Mapa, fotos, compartilhamento, impressao -> FUTURO

**Estrategia do Sprint 19:** Corrigir os 2 bugs P0 que quebram a experiencia core (streaming de itinerario e navegacao de fases), entregar o redesign do guia do destino (ITEM-14), e incluir melhorias de UX de alto valor que cabem no budget restante. Itens de transporte (ITEM-13) permanecem diferidos para Sprint 20 conforme decisao do stakeholder.

---

## 2. Classificacao Completa dos Itens

### 2.1 Tabela de Classificacao

| ID | Titulo | Tipo | Severidade | Classificacao |
|---|---|---|---|---|
| ITEM-1 | Streaming de itinerario mostra JSON bruto e volta para tela "Generate" | Bug fix | P0 - Critico | Funcionalidade quebrada -- feature core inutilizavel |
| ITEM-2 | Botao "Continuar" nao funciona para trips na Fase 6+ | Bug fix | P0 - Critico | Navegacao quebrada -- bloqueia progresso |
| ITEM-3 | Barra de progresso mostra "4 de 8" quando usuario esta na Fase 6 | Bug fix | P1 - Alto | Informacao incorreta exibida ao usuario |
| ITEM-4 | Barra de progresso nao e clicavel para navegar entre fases | UX improvement | P2 - Medio | Melhoria de navegacao -- nao bloqueia uso |
| ITEM-5 | Barra de progresso sem labels de numero/nome das fases | UX improvement | P2 - Medio | Orientacao visual insuficiente |
| ITEM-6 | Botoes Checklist/Roteiro duplicados no dashboard card | UX improvement | P2 - Baixo | Duplicacao de controles -- confusao visual |
| ITEM-7 | Fase 1 "O Chamado" -- info pessoal deveria vir antes de info da viagem | New feature | P1 - Alto | Requer refatoracao de fluxo + integracao com Profile |
| ITEM-8 | Tela de confirmacao (Step 4) nao mostra todos os dados coletados | Bug fix | P1 - Alto | Informacao incompleta na revisao pre-inicio |
| ITEM-9 | Transicoes de fase exigem clique desnecessario | UX improvement | P2 - Medio | Friccao na experiencia gamificada |
| ITEM-10 | Campo "Quantas pessoas?" sem detalhamento (adultos, criancas, idades) | New feature | P1 - Medio | Requer novos campos e logica de validacao |
| ITEM-11 | Moeda padrao nao respeita idioma selecionado | UX improvement | P2 - Baixo | Conveniencia -- correcao simples |
| ITEM-12 | Preferencias pessoais limitadas a restricoes alimentares/acessibilidade | New feature | P1 - Medio | Expansao de funcionalidade + gamificacao |
| ITEM-13 | Expansao de planejamento de transporte (Fase 4) | New feature | DIFERIDO | Decisao de stakeholder: Sprint 20 |
| ITEM-14 | Redesign do guia do destino (cards + highlights + 10 categorias) | New feature | P1 - Alto | Decisao de stakeholder: Sprint 19 |
| SEC-S18-001 | Cascade deletion para ItineraryDay/Activity/ChecklistItem | Security fix | P1 - Medio | Dados orfaos apos exclusao de trip |

---

## 3. Scoring Matrix

Criterios ponderados conforme formula padrao do projeto:
- Dor do viajante: 30%
- Impacto em receita: 25%
- Esforco inverso (1=XL, 5=XS): 20%
- Alinhamento estrategico: 15%
- Diferencial competitivo: 10%

| ID | Dor (30%) | Receita (25%) | Esforco inv. (20%) | Estrategia (15%) | Diferencial (10%) | **Score** |
|---|---|---|---|---|---|---|
| ITEM-1 | 5 (1.50) | 5 (1.25) | 3 (0.60) | 5 (0.75) | 3 (0.30) | **4.40** |
| ITEM-2 | 5 (1.50) | 4 (1.00) | 4 (0.80) | 5 (0.75) | 2 (0.20) | **4.25** |
| ITEM-3 | 4 (1.20) | 3 (0.75) | 4 (0.80) | 4 (0.60) | 2 (0.20) | **3.55** |
| ITEM-14 | 4 (1.20) | 3 (0.75) | 2 (0.40) | 5 (0.75) | 4 (0.40) | **3.50** |
| ITEM-8 | 4 (1.20) | 3 (0.75) | 4 (0.80) | 3 (0.45) | 2 (0.20) | **3.40** |
| ITEM-7 | 4 (1.20) | 3 (0.75) | 2 (0.40) | 4 (0.60) | 3 (0.30) | **3.25** |
| SEC-S18-001 | 3 (0.90) | 3 (0.75) | 4 (0.80) | 4 (0.60) | 2 (0.20) | **3.25** |
| ITEM-10 | 3 (0.90) | 3 (0.75) | 3 (0.60) | 3 (0.45) | 3 (0.30) | **3.00** |
| ITEM-12 | 3 (0.90) | 2 (0.50) | 3 (0.60) | 4 (0.60) | 3 (0.30) | **2.90** |
| ITEM-4 | 3 (0.90) | 2 (0.50) | 3 (0.60) | 3 (0.45) | 3 (0.30) | **2.75** |
| ITEM-9 | 2 (0.60) | 2 (0.50) | 4 (0.80) | 3 (0.45) | 3 (0.30) | **2.65** |
| ITEM-5 | 2 (0.60) | 2 (0.50) | 4 (0.80) | 3 (0.45) | 2 (0.20) | **2.55** |
| ITEM-11 | 2 (0.60) | 1 (0.25) | 5 (1.00) | 2 (0.30) | 1 (0.10) | **2.25** |
| ITEM-6 | 2 (0.60) | 1 (0.25) | 5 (1.00) | 2 (0.30) | 1 (0.10) | **2.25** |

---

## 4. Backlog Sprint 19

### 4.1 P0 -- MUST HAVE (bugs criticos + seguranca)

Estimativa total: ~14h

---

#### T-S19-001: ITEM-1 -- Corrigir streaming de itinerario (JSON bruto + reset)

**Estimativa:** 6h | **Score:** 4.40 | **Tipo:** Bug fix P0

**Descricao:** A funcionalidade de streaming de itinerario (T-S18-008) esta fundamentalmente quebrada: (1) durante o streaming, o texto JSON bruto e exibido ao inves de cards formatados; (2) apos a geracao completar, a tela volta para o estado "Generate" ao inves de mostrar o itinerario gerado. Essa e a feature mais importante do produto -- sem ela, a proposta de valor core ("IA monta seu plano em 60 segundos") nao funciona.

**Criterios de Aceite:**
- [ ] AC-001: Given o viajante inicia geracao de itinerario, when o streaming esta em andamento, then o conteudo e renderizado como cards formatados (dia, atividades, horarios) em tempo real
- [ ] AC-002: Given o streaming completa com sucesso, when finalizado, then o itinerario permanece visivel na tela (nao volta para tela "Generate")
- [ ] AC-003: Given o streaming completa, when o viajante navega para outra pagina e volta, then o itinerario gerado e exibido (persistido)
- [ ] AC-004: Given erro durante o streaming, when o streaming falha, then exibe mensagem de erro amigavel com opcao de tentar novamente
- [ ] AC-005: Given mobile (375px), when o streaming esta em andamento, then os cards sao responsivos e legiveis

---

#### T-S19-002: ITEM-2 -- Corrigir botao "Continuar" para trips na Fase 6+

**Estimativa:** 3h | **Score:** 4.25 | **Tipo:** Bug fix P0

**Descricao:** O botao "Continuar" no card da viagem no dashboard nao funciona quando a trip esta na Fase 6 ou adiante. O fix do ITEM-9 do Sprint 18 nao cobriu esse cenario. O viajante fica sem forma de acessar a trip pelo caminho principal de navegacao.

**Criterios de Aceite:**
- [ ] AC-001: Given uma trip na Fase 6 (O Tesouro), when o viajante clica "Continuar", then e redirecionado para a tela correta da Fase 6
- [ ] AC-002: Given uma trip na Fase 7 ou 8, when o viajante clica "Continuar", then e redirecionado para a tela correta da fase correspondente
- [ ] AC-003: Given uma trip com itinerario ja gerado, when o viajante clica "Continuar", then e redirecionado para visualizacao do itinerario (nao para tela de geracao)
- [ ] AC-004: Testes unitarios cobrindo todas as fases (1-8) para o mapeamento de redirecionamento

---

#### T-S19-003: ITEM-3 -- Corrigir contagem de fases na barra de progresso

**Estimativa:** 2h | **Score:** 3.55 | **Tipo:** Bug fix P1

**Descricao:** A barra de progresso exibe "Fase 6 - 4 de 8 fases" quando o usuario esta na Fase 6. O `completedPhases` nao esta sendo calculado corretamente -- deveria mostrar "6 de 8". O calculo provavelmente conta apenas fases com dados preenchidos ao inves de contar fases completadas ou a fase atual.

**Criterios de Aceite:**
- [ ] AC-001: Given o viajante esta na Fase 6, when a barra de progresso e renderizada, then mostra "6 de 8 fases"
- [ ] AC-002: Given o viajante esta na Fase N (1-8), when a barra de progresso e renderizada, then mostra "N de 8 fases"
- [ ] AC-003: Given fases nonBlocking foram puladas, when o calculo e feito, then conta a fase atual como referencia (nao apenas fases com dados)
- [ ] AC-004: Testes unitarios cobrindo cenario com fases puladas (nonBlocking) e cenario linear

---

#### T-S19-004: SEC-S18-001 -- Cascade deletion para itens de itinerario e checklist

**Estimativa:** 3h | **Score:** 3.25 | **Tipo:** Security fix P1

**Descricao:** Quando um Trip e excluido (soft delete ou hard delete), os registros relacionados (ItineraryDay, Activity, ChecklistItem) nao sao deletados em cascata. Isso deixa dados orfaos no banco de dados, potencialmente contendo PII do viajante (notas, enderecos de atividades).

**Criterios de Aceite:**
- [ ] AC-001: Given um Trip e excluido, when a exclusao e processada, then todos os ItineraryDay, Activity e ChecklistItem associados sao removidos
- [ ] AC-002: Given a exclusao e por soft delete (deletedAt), when processada, then os itens filhos tambem recebem soft delete
- [ ] AC-003: Given a exclusao de conta do usuario (LGPD), when processada, then todos os dados de itinerario e checklist sao incluidos na transacao
- [ ] AC-004: Testes unitarios verificando que nenhum registro orfao permanece apos exclusao

---

### Resumo P0

| Task | Descricao | Horas | Score |
|---|---|---|---|
| T-S19-001 | Streaming itinerario: JSON bruto + reset (ITEM-1) | 6h | 4.40 |
| T-S19-002 | Botao "Continuar" fase 6+ (ITEM-2) | 3h | 4.25 |
| T-S19-003 | Contagem de fases na progress bar (ITEM-3) | 2h | 3.55 |
| T-S19-004 | Cascade deletion itinerario/checklist (SEC-S18-001) | 3h | 3.25 |
| **TOTAL P0** | | **14h** | |

---

### 4.2 P1 -- SHOULD HAVE (guide redesign + UX alto valor)

Estimativa total: ~20h

---

#### T-S19-005: ITEM-14/US-120 -- Redesign do guia: cards visiveis + highlights

**Estimativa:** 10h | **Score:** 3.50 | **Tipo:** New feature (UI redesign)

**Descricao:** Substituir o layout atual do guia do destino (accordions com 6 categorias) por cards visiveis em grid responsivo com 10 categorias + banner de highlights no topo. Decisao de stakeholder confirmada: Sprint 19.

Escopo combinado de US-120 (cards visiveis) e US-121 (categorias expandidas). As 4 novas categorias (Documentos e Entrada, Clima e O Que Vestir, Transporte Local, Saude e Seguranca) requerem ajuste no prompt de geracao do guia.

**Criterios de Aceite (US-120):**
- [ ] AC-001: Given o viajante acessa a Fase 5, when a pagina carrega, then todas as 10 categorias sao visiveis como cards em grid (nenhum conteudo escondido)
- [ ] AC-002: Given conteudo de uma categoria excede 3 linhas, when renderizado, then mostra resumo + link "Ver mais" que expande inline
- [ ] AC-003: Given desktop (>= 1024px), when renderizado, then exibe grid de 3 colunas
- [ ] AC-004: Given mobile (375px), when renderizado, then exibe stack vertical (1 coluna) com cards compactos
- [ ] AC-005: Given o topo da pagina, when renderizado, then exibe banner de highlights com fuso, moeda, idioma e tipo de tomada
- [ ] AC-006: Given guia ja gerado, when o viajante acessa, then nao requer nova geracao (usa dados em cache)

**Criterios de Aceite (US-121):**
- [ ] AC-007: Given viagem internacional, when o guia e gerado, then inclui as 10 categorias definidas no TRANSPORT-PHASE-SPEC
- [ ] AC-008: Given viagem domestica, when o guia e gerado, then categorias como "Documentos e Entrada" mostram conteudo simplificado
- [ ] AC-009: Given categoria "Transporte Local", when renderizada, then inclui dicas especificas do destino
- [ ] AC-010: Given categoria "Saude e Seguranca", when renderizada, then inclui numero de emergencia local

**Out of Scope (v1):**
- Thumbs up/down feedback por card (PO-5: FUTURO)
- Mapa interativo (UX-2: FUTURO)
- Fotos/imagens (UX-3: FUTURO)
- Compartilhamento de secoes (UX-4: FUTURO)
- Impressao (UX-5: FUTURO)

---

#### T-S19-006: ITEM-8 -- Tela de confirmacao exibe todos os dados coletados

**Estimativa:** 3h | **Score:** 3.40 | **Tipo:** Bug fix P1

**Descricao:** A tela "Pronto para comecar?" (Step 4 do wizard) nao mostra todos os dados que o viajante forneceu nos passos anteriores. Exemplo: "Mini bio" nao aparece na revisao. O viajante nao tem confianca de que seus dados foram capturados corretamente antes de iniciar a expedicao.

**Criterios de Aceite:**
- [ ] AC-001: Given o viajante chega ao Step 4, when a tela de confirmacao e renderizada, then TODOS os dados coletados nos steps 1-3 sao exibidos (nome, bio, destino, datas, estilo, orcamento, notas, preferencias)
- [ ] AC-002: Given um campo opcional nao preenchido, when a tela de confirmacao e renderizada, then o campo aparece como "Nao informado" (nao omitido)
- [ ] AC-003: Given o viajante identifica um dado incorreto, when clica no dado, then e redirecionado para o step correspondente para edicao
- [ ] AC-004: Given mobile (375px), when a tela e renderizada, then layout e legivel com agrupamento visual por step

---

#### T-S19-007: ITEM-9 -- Transicoes de fase automaticas (sem clique)

**Estimativa:** 3h | **Score:** 2.65 | **Tipo:** UX improvement

**Descricao:** As transicoes entre fases da expedicao exigem um clique explicito do viajante para avancar. As animacoes devem permanecer (sao parte da experiencia gamificada), mas a transicao deve ser fluida/automatica apos um breve delay (ex: 1.5s de animacao + auto-avanco).

**Criterios de Aceite:**
- [ ] AC-001: Given o viajante completa uma fase, when a animacao de transicao e exibida, then apos 1.5 segundos o sistema avanca automaticamente para a proxima fase
- [ ] AC-002: Given a animacao esta em andamento, when o viajante clica/toca na tela, then avanca imediatamente (atalho para impacientes)
- [ ] AC-003: Given preferencias de acessibilidade (prefers-reduced-motion), when a transicao ocorre, then pula a animacao e avanca diretamente
- [ ] AC-004: Testes verificando timeout e cleanup de timer

---

#### T-S19-008: ITEM-6 -- Remover botoes duplicados do dashboard card

**Estimativa:** 1h | **Score:** 2.25 | **Tipo:** UX improvement

**Descricao:** Os botoes "Checklist" e "Roteiro" no card da viagem no dashboard duplicam funcionalidade ja disponivel na PhaseToolsBar dentro da trip. Remover para simplificar a interface do card.

**Criterios de Aceite:**
- [ ] AC-001: Given o card da viagem no dashboard, when renderizado, then nao exibe botoes "Checklist" e "Roteiro"
- [ ] AC-002: Given o botao "Continuar", when o viajante acessa a trip, then encontra Checklist e Roteiro na PhaseToolsBar (caminho principal)
- [ ] AC-003: Testes existentes do TripCard atualizados para refletir remocao

---

#### T-S19-009: ITEM-11 -- Moeda padrao baseada no idioma

**Estimativa:** 1h | **Score:** 2.25 | **Tipo:** UX improvement

**Descricao:** Na tela de orcamento, a moeda padrao deve ser BRL quando o idioma selecionado e portugues (pt-BR) e USD quando e ingles (en). Atualmente nao ha default inteligente.

**Criterios de Aceite:**
- [ ] AC-001: Given idioma = pt-BR, when a tela de orcamento e exibida, then a moeda padrao e BRL (R$)
- [ ] AC-002: Given idioma = en, when a tela de orcamento e exibida, then a moeda padrao e USD ($)
- [ ] AC-003: Given o viajante seleciona outra moeda, when altera, then a selecao e respeitada (override do default)

---

### Resumo P1

| Task | Descricao | Horas | Score |
|---|---|---|---|
| T-S19-005 | Guide redesign: cards + highlights + 10 categorias (ITEM-14) | 10h | 3.50 |
| T-S19-006 | Tela confirmacao completa (ITEM-8) | 3h | 3.40 |
| T-S19-007 | Transicoes de fase automaticas (ITEM-9) | 3h | 2.65 |
| T-S19-008 | Remover botoes duplicados dashboard (ITEM-6) | 1h | 2.25 |
| T-S19-009 | Moeda padrao por idioma (ITEM-11) | 1h | 2.25 |
| **TOTAL P1** | | **18h** | |

---

### 4.3 P2 -- COULD HAVE (se sobrar capacidade)

Estimativa total: ~7h (buffer)

| ID | Descricao | Horas | Score | Racional |
|---|---|---|---|---|
| T-S19-010 | ITEM-4: Progress bar clicavel para navegar entre fases | 3h | 2.75 | Melhoria de navegacao. Depende de T-S19-003 (contagem correta) |
| T-S19-011 | ITEM-5: Labels de numero/nome nas fases da progress bar | 2h | 2.55 | Orientacao visual. Pode ser tooltip ou texto fixo |

---

### 4.4 DIFERIDO -- Sprint 20+

| ID | Descricao | Sprint alvo | Racional |
|---|---|---|---|
| ITEM-13 | Expansao de transporte (US-115, US-116, US-117, US-118) | Sprint 20 | Decisao de stakeholder (PO-8) |
| ITEM-7 | Reordenacao da Fase 1 (info pessoal antes de trip) + Profile | Sprint 20+ | Requer refatoracao significativa do wizard + integracao Profile. Esforco L. Score 3.25 mas alta complexidade |
| ITEM-10 | Detalhamento de viajantes (adultos, criancas, idades) | Sprint 20+ | New feature que altera modelo de dados (travelers struct). Requer spec do architect |
| ITEM-12 | Expansao de preferencias pessoais (categorias estruturadas) | Sprint 20+ | New feature que altera modelo de dados + gamificacao. Depende de categorias serem definidas pelo PO |

---

## 5. Analise de Capacidade

### 5.1 Distribuicao de Horas

| Faixa | Horas | % do Budget |
|---|---|---|
| P0 (Must Have) | 14h | 35% |
| P1 (Should Have) | 18h | 45% |
| P2 (Could Have) | 5h* | 12.5% |
| Buffer (code review, descobertas) | 3h | 7.5% |
| **Total** | **40h** | **100%** |

*P2 parcial: apenas T-S19-010 (3h) + margem

### 5.2 Distribuicao Sugerida por Dev

#### dev-fullstack-1 (~20h)

| Ordem | Task | Horas | Justificativa |
|---|---|---|---|
| 1 | T-S19-001 (streaming itinerario fix) | 6h | Bug P0 mais critico. Requer debug profundo do streaming + rendering |
| 2 | T-S19-005 (guide redesign) - Backend/Prompt | 5h | Ajuste no prompt de geracao (6->10 categorias) + modelo de resposta |
| 3 | T-S19-006 (tela confirmacao) | 3h | Wizard step 4 fix |
| 4 | T-S19-004 (cascade deletion) | 3h | Migration/Prisma + testes |
| stretch | T-S19-010 (progress bar clicavel) | 3h | Se sobrar capacidade |

#### dev-fullstack-2 (~20h)

| Ordem | Task | Horas | Justificativa |
|---|---|---|---|
| 1 | T-S19-002 (botao "Continuar" fase 6+) | 3h | Bug P0 de navegacao |
| 2 | T-S19-003 (contagem de fases) | 2h | Bug P1 relacionado -- mesmo componente |
| 3 | T-S19-005 (guide redesign) - Frontend/UI | 5h | Cards grid + highlights banner + responsividade |
| 4 | T-S19-007 (transicoes automaticas) | 3h | UX improvement na expedicao |
| 5 | T-S19-008 (remover botoes duplicados) | 1h | Quick win |
| 6 | T-S19-009 (moeda padrao por idioma) | 1h | Quick win |
| stretch | T-S19-011 (labels na progress bar) | 2h | Se sobrar capacidade |

### 5.3 Cronograma Sugerido

| Dia | dev-fullstack-1 | dev-fullstack-2 |
|---|---|---|
| 1 | T-S19-001 (streaming fix - inicio) | T-S19-002 (botao Continuar) + T-S19-003 (contagem) |
| 2 | T-S19-001 (streaming fix - conclusao) | T-S19-005 frontend (guide cards - inicio) |
| 3 | T-S19-005 backend/prompt (guide 10 categorias) | T-S19-005 frontend (guide cards - conclusao) |
| 4 | T-S19-006 (tela confirmacao) + T-S19-004 (cascade) | T-S19-007 (transicoes) + T-S19-008 (botoes) + T-S19-009 (moeda) |
| 5 | Stretch: T-S19-010 + code review cruzado | Stretch: T-S19-011 + code review cruzado |

### 5.4 Nota sobre T-S19-005 (Guide Redesign)

O redesign do guia tem duas frentes paralelas:
1. **Backend/Prompt (dev-1):** Ajustar o prompt de geracao do guia para retornar 10 categorias em formato estruturado. Atualizar parsing da resposta da IA. Ajustar seed/mock de dados para testes.
2. **Frontend/UI (dev-2):** Implementar layout de cards em grid, banner de highlights, "Ver mais" expandivel, responsividade. Usar dados existentes do modelo DestinationGuide.

O tech-lead deve coordenar a interface entre as duas frentes (formato JSON do guia).

---

## 6. Registro de Decisoes do Stakeholder

| Codigo | Decisao | Status | Sprint |
|---|---|---|---|
| PO-1 | Renomear Fase 4: "O Abrigo" -> "A Logistica" | Aprovado | 20 (implementacao) |
| PO-2 | Transporte suporta ida E volta (user escolhe) | Aprovado | 20 |
| PO-3 | Permitir conexoes multi-cidade | Aprovado | 20 |
| PO-4 | Links de afiliados | Diferido para roadmap futuro | -- |
| PO-5 | Thumbs up/down no guia | Diferido para roadmap futuro | -- |
| PO-6 | Gerar guia para TODAS as viagens (domesticas + internacionais) | Aprovado | 19 (T-S19-005) |
| PO-7 | Banner de highlights no topo do guia | Aprovado | 19 (T-S19-005) |
| PO-8 | Prioridade: guide redesign Sprint 19, transport Sprint 20 | Aprovado | 19/20 |
| UX-1 | Multiplas hospedagens por trip (max 5) | Aprovado | 20 |
| UX-2 | Mapa no guia | Diferido para roadmap futuro | -- |
| UX-3 | Fotos/imagens no guia | Diferido para roadmap futuro | -- |
| UX-4 | Compartilhamento de secoes do guia | Diferido para roadmap futuro | -- |
| UX-5 | Impressao amigavel do guia | Diferido para roadmap futuro | -- |

---

## 7. Avaliacao de Riscos

### 7.1 Riscos do Sprint

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| T-S19-001 (streaming fix) demora mais que 6h | Media | Alto | Buffer de 3h. Se exceder, reduzir P1 scope (remover T-S19-007 ou T-S19-008) |
| T-S19-005 (guide redesign) requer mudanca no modelo de dados do guia | Baixa | Medio | Verificar modelo DestinationGuide atual antes de iniciar. Se 10 categorias nao cabem no schema, usar campo JSON flexivel |
| Prompt de geracao do guia com 10 categorias gera respostas muito longas | Media | Medio | Definir limite de tokens na resposta. Testar com prompt-engineer antes do sprint |
| Code review cruzado consome mais buffer que o previsto | Baixa | Baixo | P2 items sao sacrificaveis -- cortar primeiro T-S19-011 |

### 7.2 Debitos que NAO entram neste sprint

| ID | Descricao | Racional para deferimento |
|---|---|---|
| ITEM-7 | Reordenacao da Fase 1 | Esforco L -- requer spec de UX + refatoracao do wizard inteiro |
| ITEM-10 | Detalhamento de viajantes | Requer novo modelo de dados (TripTravelers struct) |
| ITEM-12 | Expansao de preferencias | Requer definicao de categorias pelo PO + design de UX |
| ITEM-13 | Transporte (US-115-US-118) | Decisao de stakeholder: Sprint 20 |

---

## 8. Criterios de Aceite do Sprint 19 (Product Owner)

- [ ] Streaming de itinerario exibe cards formatados (nao JSON bruto)
- [ ] Apos geracao, itinerario permanece visivel (nao reseta para tela Generate)
- [ ] Botao "Continuar" funciona para TODAS as fases (1-8)
- [ ] Barra de progresso exibe contagem correta de fases
- [ ] Cascade deletion inclui ItineraryDay, Activity e ChecklistItem
- [ ] Guia do destino redesenhado com 10 categorias em cards visiveis
- [ ] Banner de highlights no topo do guia (fuso, moeda, idioma, tomada)
- [ ] Guia gerado para viagens domesticas e internacionais
- [ ] Tela de confirmacao (Step 4) mostra TODOS os dados coletados
- [ ] Zero testes quebrados (regressao zero)
- [ ] >= 40 novos testes (1328+ total)
- [ ] Cobertura >= 80% em todos os arquivos modificados

---

## 9. Metricas de Sucesso Pos-Sprint

| Metrica | Baseline (Sprint 18) | Meta (Sprint 19+) | Como medir |
|---|---|---|---|
| Streaming itinerario funcional | Quebrado (ITEM-1) | 100% funcional | Teste manual + E2E |
| Navegacao por fases | Quebrada fase 6+ (ITEM-2) | Funcional para todas as fases | Teste manual |
| Taxa de visualizacao do guia | ~40% (accordions) | > 80% (cards) | Analytics de scroll/visibilidade |
| Categorias do guia | 6 categorias | 10 categorias | Contagem na UI |
| Testes totais | 1288 | 1328+ | `npm run test` |
| Dados orfaos apos exclusao | Possiveis (SEC-S18-001) | Zero | Query de verificacao |

---

## 10. Briefing para Tech-Lead

**Contexto:** Sprint misto -- 2 bugs P0 criticos + 1 feature de redesign (guide) + 4 UX improvements menores.

**Prioridade absoluta:** T-S19-001 (streaming fix) deve ser a primeira tarefa de dev-1. E o bug mais critico do produto -- a proposta de valor core nao funciona enquanto o streaming mostrar JSON bruto. Alocar dev-1 que tem mais contexto sobre a implementacao de streaming do Sprint 18.

**Coordenacao T-S19-005:** O guide redesign tem frente backend (prompt + parsing) e frente frontend (UI cards). O tech-lead deve definir o contrato JSON entre as frentes ANTES de dev-1 e dev-2 iniciarem suas partes. Sugestao: 30 min de alinhamento no dia 2.

**Dependencias:**
- T-S19-003 (contagem de fases) deve ser feito ANTES de T-S19-010 (progress bar clicavel) -- nao adianta ter navegacao clicavel com contagem errada
- T-S19-005 backend deve ser feito em paralelo ou ligeiramente antes de T-S19-005 frontend

**Branch:** `feat/sprint-19`

**Meta de testes:** +40 (1328+ total). O guide redesign deve ter cobertura robusta (novo componente de cards, novo prompt).

---

## 11. Briefing para Prompt-Engineer

**Sprint 19 impacto:** T-S19-005 modifica o prompt de geracao do guia do destino. Mudancas:
1. De 6 categorias para 10 categorias
2. Resposta deve incluir dados estruturados para banner de highlights (fuso, moeda, idioma, tomada)
3. Cada categoria deve ter resumo (2-3 linhas) + conteudo expandido
4. Categorias devem se adaptar ao tipo de viagem (domestica vs. internacional)

**Acao necessaria:** O prompt-engineer deve revisar e otimizar o novo prompt ANTES de dev-1 implementar, para garantir:
- Token usage aceitavel (10 categorias geram mais output -- estimar custo incremental)
- Formato de resposta estruturado e parseavel (JSON com campos definidos)
- Qualidade do conteudo nas 4 novas categorias (Documentos, Clima, Transporte Local, Saude)
- Adaptacao correta para viagens domesticas (conteudo simplificado, nao generico)

---

## 12. Briefing para FinOps-Engineer

**Impacto de custo:** O redesign do guia (T-S19-005) aumenta o output da geracao de guia de 6 para 10 categorias. Estimativa de impacto:
- Output atual (6 categorias): ~800-1200 tokens
- Output estimado (10 categorias): ~1500-2200 tokens
- Aumento de custo por geracao: ~60-80% no output
- Para Free tier (Gemini Flash): aumento de ~$0.002 para ~$0.004 por geracao (insignificante)
- Para Premium tier (Claude Sonnet): aumento de ~$0.015 para ~$0.028 por geracao (aceitavel)

**Acao:** Monitorar o custo real apos deploy e reportar no Sprint 19 review.

---

## 13. Visao Adiante -- Sprint 20+

Com os bugs P0 resolvidos e o guia redesenhado, o Sprint 20 foca na expansao de logistica:

| Candidato | Tipo | Sprint alvo |
|---|---|---|
| US-118: Campo origin no Trip | Must Have (pre-requisito) | 20 |
| US-115: Registro de transporte principal | Must Have | 20 |
| US-117: Selecao de mobilidade local | Should Have | 20 |
| ITEM-7: Reordenacao da Fase 1 + Profile | Should Have | 20-21 |
| ITEM-10: Detalhamento de viajantes | Could Have | 21 |
| US-116: Registro de hospedagem | Must Have | 21 |
| US-119: Estimativa de custo por IA | Could Have | 21 |
| ITEM-12: Expansao de preferencias | Could Have | 21+ |
| US-122: Chat IA sobre destino (Premium) | Could Have | Futuro |

---

*Backlog elaborado pelo product-owner em 2026-03-10 com base em testes manuais pos-Sprint 18, decisoes de stakeholder confirmadas, e inventario de itens pendentes.*
