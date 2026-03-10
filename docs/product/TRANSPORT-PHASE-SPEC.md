# ITEM-13 & ITEM-14 -- Especificacao de Produto

> **Autor:** product-owner
> **Data:** 2026-03-10
> **Versao do produto:** 0.11.0 (pos Sprint 17)
> **Status:** Rascunho para validacao com stakeholder
> **Escopo:** Definicao de produto (sem decisoes tecnicas de implementacao)

---

## Parte 1: ITEM-13 -- Planejamento de Transporte

### 1.1 Posicionamento na Jornada de 8 Fases

#### Diagnostico do estado atual

A Fase 4 ("O Abrigo") foi concebida como fase de logistica/hospedagem, mas sua implementacao atual se limita a perguntar sobre aluguel de carro e CINH (Carteira Internacional de Habilitacao). Isso cria uma lacuna critica: um viajante planejando Sao Paulo para Roma nao tem onde registrar seu voo, transporte local em Roma, ou hospedagem.

#### Recomendacao: Expandir a Fase 4 -- NAO criar nova fase

**Decisao:** Manter 8 fases. Renomear e expandir a Fase 4.

**Justificativa:**

1. **Coerencia narrativa:** "O Abrigo" ja carrega a ideia de "onde vou ficar e como vou chegar la". Transporte e hospedagem sao co-dependentes -- voce reserva o voo antes do hotel, e o hotel depende do aeroporto de chegada. Separar em fases distintas quebraria essa relacao natural.

2. **Evitar fadiga de fases:** 8 fases ja e um numero alto para engajamento gamificado. Adicionar uma 9a fase aumentaria abandono. Dados de UX em onboarding gamificado indicam que 7-9 etapas e o limite antes de queda significativa de engajamento.

3. **Non-blocking ja funciona:** A Fase 4 ja e `nonBlocking: true`, o que significa que o viajante pode pular e voltar. Isso acomoda bem uma fase mais robusta -- o viajante preenche o que sabe e retorna quando tiver mais informacoes.

4. **Impacto tecnico minimo:** Nao altera o `PhaseNumber` type (1-8), nao quebra o `PhaseEngine`, nao requer migration de dados existentes.

#### Renomeacao proposta

| Antes | Depois |
|---|---|
| Fase 4: "O Abrigo" (The Shelter) | Fase 4: "A Logistica" (The Logistics) |
| `phases.theShelter` | `phases.theLogistics` |
| Badge: `host` | Badge: `logistics_master` |

**Alternativa considerada e rejeitada:** Manter "O Abrigo" e adicionar sub-secoes. Rejeitada porque o nome "Abrigo" nao comunica transporte -- geraria confusao.

#### Estrutura interna da nova Fase 4

A fase tera 3 secoes internas, apresentadas como abas ou steps dentro da fase:

```
Fase 4: A Logistica
  |-- Secao A: Transporte Principal (origem -> destino)
  |-- Secao B: Hospedagem (onde ficar)
  |-- Secao C: Mobilidade Local (como se locomover no destino)
```

A fase permanece `nonBlocking: true`. Cada secao pode ser preenchida independentemente. A fase e considerada "completa" para fins de gamificacao quando pelo menos 1 secao tem dados.

---

### 1.2 Informacoes a Coletar por Tipo de Transporte

#### Pre-requisito: Campo `origin` no Trip

O modelo Trip atualmente tem apenas `destination`. Para que o planejamento de transporte faca sentido, o Trip precisa de um campo `origin` (origem da viagem).

**Proposta:**
- Adicionar `origin` (String, VarChar(150)) ao modelo Trip
- Pre-popular com `UserProfile.city + UserProfile.country` quando disponivel
- Editavel pelo viajante (nem toda viagem parte de casa)
- O `trip-classifier.ts` ja recebe `originCountry` e `destinationCountry` -- o campo `origin` alimenta isso de forma estruturada

**Impacto:** Isso tambem resolve o item Q2-PREP que foi diferido do Sprint 18.

---

#### Secao A: Transporte Principal (Origem -> Destino)

O sistema deve mostrar opcoes de transporte relevantes com base no `tripType`:

| Opcao | domestic | mercosul | schengen | international |
|---|---|---|---|---|
| Aviao | Sim | Sim | Sim | Sim |
| Onibus | Sim | Sim | Raro* | Nao |
| Trem | Sim (se aplicavel) | Nao | Sim | Raro* |
| Carro proprio | Sim | Sim | Nao | Nao |
| Navio/ferry | Condicional** | Condicional** | Condicional** | Condicional** |

*Raro = mostrar apenas se viajante selecionar "Outro"
**Condicional = mostrar para destinos costeiros/ilhas (logica futura; v1 mostra como opcao secundaria)

**Dados a coletar por reserva de transporte:**

| Campo | Obrigatorio | Descricao |
|---|---|---|
| Tipo de transporte | Sim | Enum: flight, bus, train, car, ferry, other |
| Companhia/operador | Nao | Texto livre (ex: "LATAM", "Gol", "Italo") |
| Codigo de reserva | Nao | Texto livre (localizador) |
| Data/hora de partida | Sim | DateTime |
| Data/hora de chegada | Sim | DateTime |
| Local de partida | Nao | Texto (ex: "GRU - Guarulhos") |
| Local de chegada | Nao | Texto (ex: "FCO - Fiumicino") |
| Custo estimado | Nao | Valor + moeda |
| Observacoes | Nao | Texto livre (ex: "Mala 23kg incluida") |

**Regra de negocio:** O viajante pode adicionar multiplos transportes (ex: voo GRU->LIS + voo LIS->FCO para conexao). Interface deve suportar N registros em formato de lista.

**Estimativa de custo por IA (Free tier):**
- Quando o viajante informa origem, destino e datas, a IA pode gerar uma estimativa de faixa de preco (ex: "Voos Sao Paulo -> Roma em julho costam entre R$3.500 e R$6.000").
- Essa estimativa e gerada via prompt no modelo Free (Gemini Flash) -- baixo custo.
- NAO e busca em tempo real. E uma estimativa baseada em conhecimento do modelo.
- Disclaimer obrigatorio: "Estimativa baseada em dados historicos. Consulte sites de busca para precos atualizados."

**Links uteis (todos os tiers):**
- Exibir links para Google Flights, Skyscanner, Rome2Rio com destino pre-preenchido.
- Esses links sao GRATUITOS (nao exigem API, sao URLs com query params).
- Exemplo: `https://www.google.com/travel/flights?q=flights+from+GRU+to+FCO`

---

#### Secao B: Hospedagem

| Campo | Obrigatorio | Descricao |
|---|---|---|
| Tipo de hospedagem | Sim | Enum: hotel, hostel, airbnb, friends_house, camping, other |
| Nome do local | Nao | Texto (ex: "Hotel Trevi Palace") |
| Endereco | Nao | Texto livre |
| Codigo de reserva | Nao | Texto livre |
| Check-in | Nao | Date |
| Check-out | Nao | Date |
| Custo total estimado | Nao | Valor + moeda |
| Observacoes | Nao | Texto livre (ex: "Cafe da manha incluido") |

**Regra de negocio:** Suportar multiplas hospedagens (ex: 3 noites em Roma + 4 noites em Florenca). Interface em formato de lista.

**Variacao por tripType:**
- `domestic`: Todas as opcoes. Sem recomendacoes especiais.
- `mercosul`: Idem + lembrete sobre diferenca de tomada/voltagem.
- `schengen` / `international`: Idem + lembrete sobre check-in tardio (jet lag), sugestao de contratar transfer do aeroporto.

---

#### Secao C: Mobilidade Local

Quando o viajante indica que NAO vai alugar carro, o sistema deve perguntar como pretende se locomover no destino.

**Formato:** Multi-select (pode selecionar mais de uma opcao)

| Opcao | Icone sugerido | Contexto |
|---|---|---|
| Transporte publico (metro/onibus) | Train | Sempre disponivel |
| Taxi / Uber / App de transporte | Car | Sempre disponivel |
| Caminhadas | PersonStanding | Sempre disponivel |
| Bicicleta / patinete | Bike | Sempre disponivel |
| Transfer privado | CarFront | Sempre disponivel |
| Aluguel de carro | Key | Ja existente -- manter + campo CINH |
| Outro | MoreHorizontal | Texto livre |

**Regra de negocio:** Se o viajante selecionar "Aluguel de carro", reativar as perguntas ja existentes sobre CINH (que hoje sao toda a Fase 4).

**Impacto downstream na IA (Fase 6 - Itinerario):**
- A selecao de mobilidade local alimenta o prompt de geracao de itinerario.
- Exemplo: Se o viajante selecionou "transporte publico + caminhadas", a IA prioriza atracoes acessiveis por metro e agrupa pontos turisticos por proximidade.
- Se selecionou "carro alugado", a IA pode sugerir day trips fora da cidade.

---

### 1.3 Impacto em Fases Downstream

#### Fase 3 (A Rota -- Checklist)

O tipo de transporte principal afeta os itens do checklist:

| Transporte | Itens adicionais no checklist |
|---|---|
| Aviao | Regras de bagagem, check-in online, assento, documentos de embarque |
| Onibus | Ponto de embarque, horario de chegada antecipada |
| Trem | Estacao, reserva de assento, validacao de bilhete |
| Carro | CINH (ja existe), seguro do veiculo, pedagios, vinheta (Europa) |
| Ferry | Reserva de cabine, enjoo, horario de embarque |

**Nota:** A Fase 3 e `nonBlocking: true` e ja funciona com regras em `checklist-rules.ts`. Os novos itens seriam adicionados ao `CHECKLIST_RULES` baseado no transporte selecionado na Fase 4 (logica de feedback entre fases).

#### Fase 5 (O Mapa dos Dias -- Guia do Destino)

O guia deve incluir informacoes contextuais de transporte:
- Como ir do aeroporto ao centro (se transporte principal = aviao)
- Dicas de transporte publico local (se selecionado na mobilidade)
- Apps recomendados de transporte na cidade (Uber, Bolt, Cabify, etc.)
- Custo medio de taxi/metro

#### Fase 6 (O Tesouro -- Itinerario)

Impacto critico nas extremidades do itinerario:
- **Dia 1:** Se o voo chega as 14h, a IA nao deve planejar atividades de manha. Deve sugerir check-in no hotel + atividade leve.
- **Ultimo dia:** Se o voo parte as 10h, a IA nao deve planejar atividades nesse dia. Deve sugerir apenas transfer ao aeroporto.
- **Dias intermediarios:** A mobilidade local afeta o raio de atividades sugeridas (carro = raio maior, transporte publico = concentrado no centro).

---

### 1.4 Modelo Freemium para Transporte

| Funcionalidade | Free | Premium |
|---|---|---|
| Registrar transporte principal (dados manuais) | Sim | Sim |
| Registrar hospedagem (dados manuais) | Sim | Sim |
| Selecionar mobilidade local | Sim | Sim |
| Links para Google Flights / Skyscanner | Sim | Sim |
| Estimativa de custo por IA (faixa de preco) | Sim* | Sim |
| Sugestoes de hospedagem por IA | Nao | Sim |
| Impacto no itinerario (horarios voo/hotel) | Basico** | Completo |
| Multiplas opcoes de transporte comparadas por IA | Nao | Sim |

*Free usa Gemini Flash para estimativa basica (1 prompt simples)
**Basico = ajusta dia 1 e ultimo dia. Completo = otimiza toda logistica de deslocamento entre atracoes.

**Justificativa:** O registro manual de dados e sempre gratuito -- o valor do produto esta em organizar informacoes que o viajante JA TEM. A IA adiciona conveniencia (estimativas, sugestoes) que justifica o tier Premium.

---

### 1.5 Implicacoes no Modelo de Dados

**Nota:** As decisoes abaixo sao diretrizes de produto. O architect e o tech-lead definirao a implementacao final.

#### Novos campos/entidades necessarios:

1. **Trip.origin** -- campo de texto (similar a `destination`), pre-populado via UserProfile
2. **TripTransport** -- entidade para registrar N transportes por viagem (ida, conexoes, volta)
3. **TripAccommodation** -- entidade para registrar N hospedagens por viagem
4. **Trip.localMobility** -- campo multi-valor (array de opcoes selecionadas)

#### Uso do campo `metadata` (Json) em ExpeditionPhase

O modelo `ExpeditionPhase` ja tem um campo `metadata: Json?`. Para o MVP, os dados de transporte/hospedagem PODEM ser armazenados como JSON nesse campo (decisao do architect). Entidades separadas sao recomendadas se houver necessidade de query/filtro sobre esses dados.

#### Armazenamento seguro

Codigos de reserva (localizadores de voo/hotel) sao dados sensiveis. Devem receber o mesmo tratamento de campos como `passportNumberEnc` -- criptografia AES-256-GCM usando o modulo `src/lib/crypto.ts` ja existente.

---

### 1.6 User Stories -- Transporte

---

#### US-115: Registro de Transporte Principal

**MoSCoW Priority:** Must Have
**Business Value:** Completa a jornada de planejamento -- sem transporte, a viagem e teorica
**Effort Estimate:** L (Large)

**User Story**
> As a leisure traveler (@leisure-solo, @leisure-family),
> I want to register my main transport from origin to destination (flight, bus, train, car),
> so that I have all my travel logistics organized in one place and the AI can optimize my itinerary based on arrival/departure times.

**Traveler Context**
- **Pain point:** O viajante planeja destino, estilo e orcamento mas nao tem onde registrar o voo. Precisa manter essa informacao em emails, apps de companhia aerea, ou notas separadas.
- **Current workaround:** Planilhas, screenshots de email de confirmacao, apps separados (TripIt, Google Trips descontinuado).
- **Frequency:** 100% das viagens precisam de pelo menos 1 transporte.

**Acceptance Criteria**
- [ ] AC-001: Given um Trip com `origin` e `destination` preenchidos, when o viajante acessa a Fase 4, then o sistema exibe opcoes de transporte relevantes para o `tripType`
- [ ] AC-002: Given o viajante seleciona "Aviao", when preenche os campos, then os dados sao salvos e exibidos na timeline da viagem
- [ ] AC-003: Given o viajante precisa de conexao, when clica "Adicionar trecho", then pode registrar multiplos trechos em sequencia
- [ ] AC-004: Given o viajante informa data/hora de chegada, when a IA gera itinerario (Fase 6), then o Dia 1 respeita o horario de chegada
- [ ] AC-005: Given o viajante informa data/hora de partida (volta), when a IA gera itinerario, then o ultimo dia respeita o horario de partida
- [ ] AC-006: Given qualquer campo de codigo de reserva, when salvo no banco, then o valor e criptografado (AES-256-GCM)
- [ ] AC-007: Given mobile (375px), when o viajante adiciona multiplos trechos, then a lista e scrollavel e cada trecho e colapsavel
- [ ] AC-008: Given a Fase 4 e non-blocking, when o viajante nao preenche nada, then pode avancar para Fase 5 sem impedimento

**Out of Scope (v1)**
- Busca de voos em tempo real (requer API de GDS/NDC -- PCI-DSS scope)
- Import automatico de reservas via email parsing
- Comparacao de precos entre companhias
- Integracao com apps de companhias aereas

**Success Metrics**
- 60% dos viajantes com viagem internacional preenchem pelo menos 1 transporte
- Reducao de 20% no tempo de planejamento total (medido via analytics)
- Itinerarios gerados com horarios de voo respeitados em 95% dos casos

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 5 | 30% | 1.50 |
| Revenue Impact | 3 | 25% | 0.75 |
| Effort (inverse) | 2 | 20% | 0.40 |
| Strategic Alignment | 5 | 15% | 0.75 |
| Competitive Diff | 3 | 10% | 0.30 |
| **Total** | | | **3.70** |

---

#### US-116: Registro de Hospedagem

**MoSCoW Priority:** Must Have
**Business Value:** Completa a logistica basica da viagem
**Effort Estimate:** M (Medium)

**User Story**
> As a leisure traveler (@leisure-solo, @leisure-family),
> I want to register my accommodation details (hotel, hostel, Airbnb, friend's house),
> so that I have check-in/check-out dates organized and the AI can include commute times in my daily itinerary.

**Traveler Context**
- **Pain point:** Informacoes de hospedagem ficam espalhadas entre emails de confirmacao, Booking.com, Airbnb, WhatsApp de amigos.
- **Current workaround:** Print de confirmacao, screenshots, bookmark de emails.
- **Frequency:** 100% das viagens (mesmo ficar na casa de amigos precisa de endereco).

**Acceptance Criteria**
- [ ] AC-001: Given a Fase 4 expandida, when o viajante acessa a secao "Hospedagem", then pode selecionar tipo de hospedagem e preencher detalhes
- [ ] AC-002: Given viagem de multiplas cidades (ex: Roma + Florenca), when o viajante clica "Adicionar hospedagem", then pode registrar multiplas hospedagens com datas diferentes
- [ ] AC-003: Given o viajante preenche endereco da hospedagem, when a IA gera itinerario, then considera a localizacao para sugerir atracoes proximas
- [ ] AC-004: Given viagem internacional, when o viajante preenche hospedagem, then o sistema exibe lembretes contextuais (check-in tardio, transfer aeroporto)
- [ ] AC-005: Given campo de codigo de reserva preenchido, when salvo, then o valor e criptografado

**Out of Scope (v1)**
- Busca de hoteis com precos em tempo real
- Integracao com Booking.com, Airbnb, ou similares
- Mapa interativo com localizacao da hospedagem

**Success Metrics**
- 50% dos viajantes registram pelo menos 1 hospedagem
- Dados de hospedagem utilizados em 80% dos itinerarios gerados (quando disponivel)

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 4 | 30% | 1.20 |
| Revenue Impact | 2 | 25% | 0.50 |
| Effort (inverse) | 3 | 20% | 0.60 |
| Strategic Alignment | 4 | 15% | 0.60 |
| Competitive Diff | 2 | 10% | 0.20 |
| **Total** | | | **3.10** |

---

#### US-117: Selecao de Mobilidade Local

**MoSCoW Priority:** Should Have
**Business Value:** Melhora qualidade do itinerario gerado pela IA
**Effort Estimate:** S (Small)

**User Story**
> As a leisure traveler (@leisure-solo, @leisure-family),
> I want to indicate how I plan to get around at my destination (public transit, walking, Uber, rental car),
> so that the AI generates an itinerary that matches my actual mobility and doesn't suggest places I can't easily reach.

**Traveler Context**
- **Pain point:** Itinerarios gerados por IA frequentemente sugerem atracoes distantes entre si sem considerar como o viajante vai se deslocar. Um viajante que depende de metro recebe sugestoes em bairros sem estacao.
- **Current workaround:** O viajante ignora sugestoes impraticaveis e pesquisa no Google Maps manualmente.
- **Frequency:** Afeta a qualidade de 100% dos itinerarios gerados.

**Acceptance Criteria**
- [ ] AC-001: Given a Fase 4, when o viajante acessa a secao "Mobilidade Local", then ve opcoes de transporte local como multi-select com icones
- [ ] AC-002: Given o viajante seleciona "Aluguel de carro", when confirma, then o sistema exibe perguntas sobre CINH (fluxo ja existente)
- [ ] AC-003: Given o viajante seleciona suas opcoes, when a IA gera itinerario (Fase 6), then o prompt inclui as preferencias de mobilidade
- [ ] AC-004: Given mobile (375px), when o viajante ve as opcoes, then sao exibidas em grid 2 colunas com icone + label

**Out of Scope (v1)**
- Integracao com APIs de transporte publico (horarios, rotas)
- Estimativa de custo de mobilidade local
- Sugestao automatica baseada no destino (ex: "Roma tem otimo metro")

**Success Metrics**
- 70% dos viajantes selecionam pelo menos 1 opcao de mobilidade
- NPS do itinerario gerado sobe 10 pontos (medido via feedback pos-geracao)

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 3 | 30% | 0.90 |
| Revenue Impact | 2 | 25% | 0.50 |
| Effort (inverse) | 4 | 20% | 0.80 |
| Strategic Alignment | 4 | 15% | 0.60 |
| Competitive Diff | 3 | 10% | 0.30 |
| **Total** | | | **3.10** |

---

#### US-118: Campo Origin no Trip + Pre-populacao

**MoSCoW Priority:** Must Have
**Business Value:** Habilita trip-classifier automatico e planejamento de transporte
**Effort Estimate:** S (Small)

**User Story**
> As a traveler (all personas),
> I want my trip to have an origin location (defaulting to my profile city),
> so that the system can automatically classify my trip type and suggest relevant transport options.

**Traveler Context**
- **Pain point:** Hoje o `tripType` e inferido mas o `origin` nao e persistido no Trip. O viajante nao pode editar a origem (ex: viagem a trabalho partindo de outra cidade).
- **Current workaround:** O sistema usa `UserProfile.country` + `UserProfile.city` quando disponivel, mas nao persiste no Trip.
- **Frequency:** 100% das viagens tem uma origem.

**Acceptance Criteria**
- [ ] AC-001: Given um novo Trip sendo criado (Fase 1), when o viajante tem `UserProfile.city` preenchido, then o campo `origin` e pre-populado com "{city}, {country}"
- [ ] AC-002: Given o campo `origin` pre-populado, when o viajante quer alterar, then pode editar livremente (mesma UX do campo `destination`)
- [ ] AC-003: Given `origin` e `destination` preenchidos, when o sistema classifica o trip, then usa esses campos para determinar o `tripType` automaticamente
- [ ] AC-004: Given um Trip existente sem `origin` (migrados), when o viajante acessa a Fase 4, then e convidado a informar a origem

**Out of Scope (v1)**
- Geocoding/autocomplete para o campo origin (reusar Nominatim do DestinationAutocomplete e desejavel mas nao obrigatorio)
- Viagens multi-cidade com origens diferentes por trecho

**Success Metrics**
- 90% dos novos Trips tem campo `origin` preenchido
- `tripType` classificado automaticamente em 95% dos casos

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 4 | 30% | 1.20 |
| Revenue Impact | 2 | 25% | 0.50 |
| Effort (inverse) | 5 | 20% | 1.00 |
| Strategic Alignment | 5 | 15% | 0.75 |
| Competitive Diff | 2 | 10% | 0.20 |
| **Total** | | | **3.65** |

---

#### US-119: Estimativa de Custo de Transporte por IA

**MoSCoW Priority:** Could Have
**Business Value:** Diferencial de conveniencia, incentivo ao preenchimento
**Effort Estimate:** S (Small)

**User Story**
> As a budget-conscious traveler (@leisure-solo),
> I want to see an AI-generated cost estimate for my main transport (e.g., "Flights Sao Paulo to Rome in July: R$3,500-6,000"),
> so that I can plan my budget without leaving the app to search multiple flight websites.

**Traveler Context**
- **Pain point:** Viajantes em fase de planejamento nao sabem quanto custara o transporte. Precisam abrir Google Flights, Skyscanner, etc., para ter uma nocao de preco.
- **Current workaround:** Pesquisa manual em sites de busca de passagens.
- **Frequency:** 100% dos viajantes querem saber o custo antes de reservar.

**Acceptance Criteria**
- [ ] AC-001: Given origem, destino e datas preenchidos, when o viajante clica "Estimar custo", then a IA retorna uma faixa de preco estimada
- [ ] AC-002: Given a estimativa exibida, when renderizada, then inclui disclaimer: "Estimativa baseada em dados historicos. Precos reais podem variar."
- [ ] AC-003: Given Free tier, when a estimativa e gerada, then usa Gemini Flash (baixo custo)
- [ ] AC-004: Given a estimativa exibida, when o viajante quer pesquisar precos reais, then ve links diretos para Google Flights e Skyscanner com origem/destino pre-preenchidos

**Out of Scope (v1)**
- Precos em tempo real via API
- Comparacao entre companhias aereas
- Alerta de queda de preco

**Success Metrics**
- 40% dos viajantes usam a funcao de estimativa
- Click-through rate nos links de busca de voos > 25%

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 3 | 30% | 0.90 |
| Revenue Impact | 3 | 25% | 0.75 |
| Effort (inverse) | 4 | 20% | 0.80 |
| Strategic Alignment | 3 | 15% | 0.45 |
| Competitive Diff | 4 | 10% | 0.40 |
| **Total** | | | **3.30** |

---

## Parte 2: ITEM-14 -- Redesign do Guia do Destino

### 2.1 Categorias de Informacao

#### Estado atual (6 categorias em accordion)

1. Fuso Horario (Time Zone)
2. Moeda (Currency)
3. Idioma (Language)
4. Eletricidade (Electricity/Plugs)
5. Conectividade (Connectivity/SIM cards)
6. Dicas Culturais (Cultural Tips)

#### Proposta: 10 categorias em cards visiveis

Reorganizacao baseada em prioridade para o viajante (ordem de importancia no pre-viagem):

| # | Categoria | Icone | Justificativa da prioridade |
|---|---|---|---|
| 1 | Documentos e Entrada | FileCheck | Primeira preocupacao: "posso entrar nesse pais?" |
| 2 | Moeda e Pagamentos | Wallet | Segunda preocupacao: "como vou pagar?" |
| 3 | Idioma e Comunicacao | MessageCircle | "Vou conseguir me comunicar?" |
| 4 | Fuso Horario | Clock | Planejamento de jet lag e contato com casa |
| 5 | Clima e O Que Vestir | CloudSun | Afeta o que levar na mala |
| 6 | Transporte Local | Train | Como se locomover (conecta com Fase 4 Secao C) |
| 7 | Saude e Seguranca | ShieldCheck | Vacinas, farmacias, emergencias |
| 8 | Eletricidade e Tomadas | Plug | Adaptadores necessarios |
| 9 | Conectividade | Wifi | SIM card, eSIM, Wi-Fi |
| 10 | Cultura e Etiqueta | Heart | Costumes, gorjetas, comportamento |

**Categorias adicionadas (4 novas):**
- **Documentos e Entrada:** Viajantes brasileiros frequentemente nao sabem se precisam de visto. Essa e a informacao mais critica e hoje nao esta no guia.
- **Clima e O Que Vestir:** Informacao pratica que afeta diretamente a mala. Hoje ausente.
- **Transporte Local:** Complementa a Secao C da Fase 4. Guia deve dar dicas especificas (ex: "Em Roma, compre o Roma Pass para metro + museus").
- **Saude e Seguranca:** Complementa a Fase 3 (checklist de vacinas). Guia deve informar sobre farmacias 24h, numero de emergencia, areas a evitar.

**Categorias fixas vs. dinamicas:**
- As 10 categorias sao FIXAS (sempre presentes).
- O CONTEUDO de cada categoria e dinamico (gerado pela IA baseado no destino).
- Categorias podem ser marcadas como "Nao aplicavel" pela IA (ex: "Documentos e Entrada" para viagem domestica pode dizer "Apenas RG e necessario").

---

### 2.2 Estrutura de Conteudo

#### Layout: Cards em grid -- conteudo visivel por padrao

**Decisao:** Abandonar accordions. Adotar cards em grid responsivo.

**Justificativa baseada em pesquisa de UX:**
- Accordions escondem conteudo que a maioria dos usuarios precisa ver. Estudos de UX indicam que scrollar e uma interacao menos custosa do que clicar para expandir.
- Para um guia de destino, TODA informacao e relevante -- nao ha conteudo "secundario" que mereca ser escondido.
- Cards em grid permitem escaneamento visual rapido (o viajante identifica a categoria pelo icone e titulo sem precisar clicar).

**Estrutura de cada card:**

```
+-----------------------------------+
| [Icone]  Titulo da Categoria      |
|-----------------------------------|
| Resumo (2-3 linhas)               |
| Texto principal visivel           |
|                                   |
| [Ver mais ->] (se conteudo longo) |
+-----------------------------------+
```

**Regras de conteudo:**
- **Resumo obrigatorio:** Cada card mostra um resumo de 2-3 linhas SEMPRE visivel.
- **Conteudo expandido:** Se a IA gerou mais de 3 linhas, um link "Ver mais" expande o card inline (nao abre nova pagina).
- **Nao usar carousel:** Carousels escondem conteudo lateralmente e tem baixa taxa de interacao (menos de 10% dos usuarios interagem com slides alem do primeiro, segundo dados de Nielsen Norman Group). Grid scrollavel e superior.

**Responsividade:**
- Desktop (>= 1024px): Grid 3 colunas (3x3 + 1)
- Tablet (768-1023px): Grid 2 colunas
- Mobile (375-767px): Stack vertical (1 coluna), cards compactos

#### Secao de Highlights

**Sim, adicionar secao de highlights no topo.**

Antes dos cards, exibir um banner/hero com 3-4 destaques rapidos:

```
+------------------------------------------------------+
| Roma, Italia                                         |
| UTC+1 | EUR (Euro) | Italiano | Tomada tipo C/F/L  |
+------------------------------------------------------+
```

Essa barra de resumo responde as 4 perguntas mais frequentes sem scroll. E gerada a partir dos dados das categorias 1-4-8.

#### Elementos interativos

| Elemento | v1 (MVP) | v2 (futuro) |
|---|---|---|
| Bookmark/salvar | Nao | Sim -- salvar cards individuais |
| Mark as read | Nao | Sim -- gamificacao (pontos por ler o guia) |
| Share | Nao | Sim -- compartilhar guia como link publico |
| Copiar texto | Sim (nativo do browser) | Sim + botao explicito |
| Feedback ("util?") | Sim -- thumbs up/down por card | Sim + campo de texto |

**Feedback por card (v1):**
- Cada card tem um discreto thumbs up / thumbs down no rodape.
- Dados coletados alimentam melhoria dos prompts futuros.
- Nao obrigatorio. Nao afeta gamificacao.

---

### 2.3 Modelo Freemium

| Funcionalidade | Free | Premium |
|---|---|---|
| Guia basico (10 categorias, resumo) | Sim | Sim |
| Conteudo expandido ("Ver mais") | Sim | Sim |
| Regenerar guia (atualizar conteudo) | 1x por viagem | Ilimitado |
| Perguntar sobre o destino (chat IA) | Nao | Sim |
| Guia personalizado (baseado em estilo de viagem) | Nao | Sim |
| Guia offline (download PDF) | Nao | Sim (futuro) |

**Justificativa:**
- O guia basico DEVE ser gratuito. E parte da proposta de valor core ("diga para onde vai, a IA te ajuda"). Cobrar pelo guia basico destruiria a experiencia do Free tier.
- A regeneracao ilimitada e premium porque cada geracao consome tokens de IA.
- O chat "pergunte sobre o destino" e um diferencial premium forte: o viajante pode fazer perguntas especificas ("restaurante vegetariano perto do Coliseu?") sem sair do app.
- O guia personalizado (ex: destaque dicas de vida noturna para @leisure-solo vs. parques infantis para @leisure-family) e premium porque requer prompt mais complexo com dados do perfil.

---

### 2.4 User Stories -- Guia do Destino

---

#### US-120: Guia do Destino em Cards Visiveis

**MoSCoW Priority:** Must Have
**Business Value:** Melhora drastica na usabilidade da informacao ja gerada -- reduz abandono da fase
**Effort Estimate:** M (Medium)

**User Story**
> As a leisure traveler (@leisure-solo, @leisure-family),
> I want to see all destination guide information displayed in visible cards (not hidden in accordions),
> so that I can quickly scan all relevant information about my destination without clicking to expand each section.

**Traveler Context**
- **Pain point:** O formato atual (accordion) esconde informacao critica atras de cliques. O viajante nao sabe o que esta dentro de cada accordion ate clicar. Dados de UX mostram que conteudo em accordion tem taxa de visualizacao 30-50% menor que conteudo visivel.
- **Current workaround:** O viajante abre todos os accordions manualmente, um por um.
- **Frequency:** 100% dos viajantes que acessam a Fase 5.

**Acceptance Criteria**
- [ ] AC-001: Given o viajante acessa a Fase 5, when a pagina carrega, then todas as 10 categorias sao visiveis como cards em grid (nenhum conteudo escondido por padrao)
- [ ] AC-002: Given o conteudo de uma categoria excede 3 linhas, when renderizado, then mostra resumo + link "Ver mais" que expande inline
- [ ] AC-003: Given o layout em desktop (>= 1024px), when renderizado, then exibe grid de 3 colunas
- [ ] AC-004: Given o layout em mobile (375px), when renderizado, then exibe stack vertical (1 coluna) com cards compactos
- [ ] AC-005: Given o topo da pagina, when renderizado, then exibe barra de highlights com fuso, moeda, idioma e tipo de tomada
- [ ] AC-006: Given cada card, when renderizado, then inclui icone + titulo + conteudo visivel
- [ ] AC-007: Given o guia ja gerado (modelo DestinationGuide existente), when o viajante acessa, then nao requer nova geracao de IA (usa dados em cache)

**Out of Scope (v1)**
- Bookmark/salvar cards individuais
- Gamificacao (pontos por ler o guia)
- Compartilhamento do guia como link publico
- Download como PDF

**Success Metrics**
- Taxa de visualizacao do guia completo sobe de ~40% (estimado com accordions) para > 80%
- Tempo medio na pagina do guia aumenta em 30% (indica leitura real vs. abandono)
- Feedback positivo (thumbs up) em > 60% das interacoes com cards

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 4 | 30% | 1.20 |
| Revenue Impact | 2 | 25% | 0.50 |
| Effort (inverse) | 3 | 20% | 0.60 |
| Strategic Alignment | 4 | 15% | 0.60 |
| Competitive Diff | 3 | 10% | 0.30 |
| **Total** | | | **3.20** |

---

#### US-121: Categorias Expandidas do Guia (10 categorias)

**MoSCoW Priority:** Should Have
**Business Value:** Informacao mais completa reduz surpresas na viagem = maior NPS
**Effort Estimate:** S (Small)

**User Story**
> As a traveler planning an international trip (@leisure-solo, @leisure-family, @business-traveler),
> I want the destination guide to include information about entry requirements, weather, local transport, and health/safety,
> so that I have comprehensive preparation information beyond just timezone and currency.

**Traveler Context**
- **Pain point:** O guia atual tem 6 categorias. Faltam informacoes criticas: documentos de entrada, clima, transporte local, saude. O viajante precisa buscar essas informacoes em outros sites.
- **Current workaround:** Pesquisa manual no Google, consulados, blogs de viagem.
- **Frequency:** Todas as viagens internacionais (>50% do publico-alvo).

**Acceptance Criteria**
- [ ] AC-001: Given uma viagem internacional, when o guia e gerado, then inclui as 10 categorias definidas neste spec
- [ ] AC-002: Given uma viagem domestica, when o guia e gerado, then categorias como "Documentos e Entrada" mostram conteudo simplificado ("Apenas RG necessario")
- [ ] AC-003: Given a categoria "Transporte Local", when renderizada, then inclui dicas especificas do destino (nomes de apps, passes de transporte)
- [ ] AC-004: Given a categoria "Saude e Seguranca", when renderizada, then inclui numero de emergencia local e informacoes sobre farmacias

**Out of Scope (v1)**
- Informacoes em tempo real (ex: alertas de saude, clima atual)
- Links diretos para sites de consulados
- Validacao automatica de requisitos de visto

**Success Metrics**
- Reducao de 15% nas buscas externas durante o planejamento (medido via analytics de saida)
- 4 novas categorias com feedback positivo > 50%

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 3 | 30% | 0.90 |
| Revenue Impact | 2 | 25% | 0.50 |
| Effort (inverse) | 4 | 20% | 0.80 |
| Strategic Alignment | 4 | 15% | 0.60 |
| Competitive Diff | 3 | 10% | 0.30 |
| **Total** | | | **3.10** |

---

#### US-122: Chat IA sobre o Destino (Premium)

**MoSCoW Priority:** Could Have
**Business Value:** Diferencial premium forte -- incentivo a conversao Free -> Premium
**Effort Estimate:** L (Large)

**User Story**
> As a premium traveler (@leisure-solo, @business-traveler),
> I want to ask specific questions about my destination in a chat interface ("best vegetarian restaurant near the Colosseum?"),
> so that I get personalized answers without leaving the app to search on Google.

**Traveler Context**
- **Pain point:** O guia estatico nao responde perguntas especificas. Cada viajante tem duvidas unicas baseadas em suas preferencias e situacao.
- **Current workaround:** Google, Reddit, TripAdvisor, blogs.
- **Frequency:** Viajantes fazem em media 20-30 buscas sobre o destino durante o planejamento (dados Skift 2025).

**Acceptance Criteria**
- [ ] AC-001: Given um usuario Premium na Fase 5, when clica "Perguntar sobre o destino", then abre interface de chat contextualizado ao destino
- [ ] AC-002: Given o chat aberto, when o viajante faz uma pergunta, then a IA responde considerando o destino, datas e estilo de viagem do Trip
- [ ] AC-003: Given um usuario Free, when tenta acessar o chat, then ve mensagem de upgrade com preview do que poderia perguntar
- [ ] AC-004: Given o chat, when uma pergunta e feita, then a resposta e renderizada em markdown com formatacao agradavel
- [ ] AC-005: Given limite de tokens, when o viajante envia mensagens, then ha limite de 20 mensagens por sessao de chat

**Out of Scope (v1)**
- Historico de chat persistente entre sessoes
- Respostas com links clicaveis para reservas
- Respostas com mapas interativos
- Voice input

**Success Metrics**
- 30% dos usuarios Premium usam o chat pelo menos 1x por viagem
- Contribui para 15% das conversoes Free -> Premium
- Satisfacao com respostas > 70% (thumbs up)

**Scoring:**

| Criterio | Score (1-5) | Peso | Ponderado |
|---|---|---|---|
| Pain Severity | 3 | 30% | 0.90 |
| Revenue Impact | 5 | 25% | 1.25 |
| Effort (inverse) | 2 | 20% | 0.40 |
| Strategic Alignment | 4 | 15% | 0.60 |
| Competitive Diff | 5 | 10% | 0.50 |
| **Total** | | | **3.65** |

---

## Parte 3: Ranking Consolidado de User Stories

| Rank | US | Nome | Score | MoSCoW | Effort |
|---|---|---|---|---|---|
| 1 | US-115 | Registro de Transporte Principal | 3.70 | Must Have | L |
| 2 | US-118 | Campo Origin no Trip | 3.65 | Must Have | S |
| 3 | US-122 | Chat IA sobre o Destino (Premium) | 3.65 | Could Have | L |
| 4 | US-119 | Estimativa de Custo por IA | 3.30 | Could Have | S |
| 5 | US-120 | Guia em Cards Visiveis | 3.20 | Must Have | M |
| 6 | US-116 | Registro de Hospedagem | 3.10 | Must Have | M |
| 7 | US-117 | Selecao de Mobilidade Local | 3.10 | Should Have | S |
| 8 | US-121 | Categorias Expandidas do Guia | 3.10 | Should Have | S |

**Nota:** US-122 tem score alto (3.65) mas e "Could Have" porque depende de infraestrutura de chat que nao existe. O score reflete potencial de receita, nao urgencia.

---

## Parte 4: Perguntas Abertas para o Stakeholder

### ITEM-13 (Transporte)

1. **Renomeacao da Fase 4:** O stakeholder aprova mudar de "O Abrigo" para "A Logistica"? Ou prefere outro nome que mantenha a narrativa de expedição (ex: "O Porto", "A Base", "O Acampamento")?

2. **Viagem de ida e volta:** O transporte principal cobre apenas a IDA ou tambem a VOLTA? Recomendacao: cobrir ambos (ida + volta como trechos separados na mesma lista).

3. **Transporte entre cidades:** Para viagens multi-destino (ex: Roma -> Florenca -> Veneza), o viajante pode registrar transportes intermediarios? Recomendacao: Sim, a interface de lista ja suporta N trechos.

4. **Prioridade: Transporte vs. Hospedagem:** Se houver restricao de sprint, o stakeholder prefere entregar primeiro o transporte principal (US-115) ou a hospedagem (US-116)? Recomendacao: Transporte primeiro (habilita impacto no itinerario).

5. **Links de afiliados:** Os links para Google Flights/Skyscanner devem usar programa de afiliados no futuro? Isso criaria uma receita passiva sem integracao de API.

### ITEM-14 (Guia do Destino)

6. **Feedback por card:** O stakeholder quer thumbs up/down em cada card do guia no v1? Ou isso adiciona complexidade visual desnecessaria?

7. **Guia para viagem domestica:** O guia deve ser gerado para viagens domesticas? Faz sentido para Sao Paulo -> Salvador, mas talvez nao para Sao Paulo -> Campinas. Recomendacao: Gerar sempre, mas com conteudo adaptado.

8. **Topo do guia (highlights):** O stakeholder aprova o banner de highlights (fuso + moeda + idioma + tomada) no topo?

---

## Parte 5: Alocacao Recomendada por Sprint

### Pre-requisito (pode entrar no Sprint 18 ou 19)

| Item | Estimativa | Dependencia |
|---|---|---|
| US-118: Campo `origin` no Trip | S (1 sprint) | Nenhuma -- pode ser feito imediatamente |

### Sprint 19 (ou proximo sprint de features)

| Item | Estimativa | Justificativa |
|---|---|---|
| US-120: Guia em Cards Visiveis | M | Redesign de UI apenas -- nao requer novos modelos de dados |
| US-121: Categorias Expandidas | S | Ajuste no prompt de IA -- complementa US-120 |

**Racional:** O redesign do guia e mais simples (UI + prompt), nao requer migration de banco, e entrega valor visual imediato. Ideal para sprint curto ou como complemento de outro trabalho.

### Sprint 20

| Item | Estimativa | Justificativa |
|---|---|---|
| US-115: Registro de Transporte | L | Requer novo modelo de dados, UI complexa (lista N itens), integracao com Fase 6 |
| US-117: Mobilidade Local | S | Multi-select simples, pode ser feito junto com US-115 |

### Sprint 21

| Item | Estimativa | Justificativa |
|---|---|---|
| US-116: Registro de Hospedagem | M | Mesma estrutura do transporte (lista N itens), mas com campos diferentes |
| US-119: Estimativa de Custo IA | S | Prompt simples via Gemini Flash -- baixo risco |

### Futuro (pos-MVP ou v1.1)

| Item | Estimativa | Justificativa |
|---|---|---|
| US-122: Chat IA sobre Destino | L | Requer infraestrutura de chat (WebSocket ou polling), gestao de contexto, limites de tokens. Alto valor mas alta complexidade. |

---

## Referencias

- Analise competitiva: Mindtrip, Layla AI, TripPlanner.ai, iMean AI, Wonderplan (marco 2026)
- UX Research: Nielsen Norman Group (accordion interaction rates), Eleken (accordion best practices)
- Dados de mercado: Deloitte Travel Outlook 2026, Simon-Kucher AI Travel Survey 2025
- Google AI Travel (Canvas): blog.google/products-and-platforms (fevereiro 2026)
