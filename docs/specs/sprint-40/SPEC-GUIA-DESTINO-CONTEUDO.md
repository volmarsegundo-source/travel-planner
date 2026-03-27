---
spec_id: SPEC-GUIA-DESTINO-CONTEUDO
title: Definicao de Conteudo — Guia do Destino (Phase 5)
version: 1.0.0
status: Draft
sprint: 40
owner: product-owner
created: 2026-03-26
updated: 2026-03-26
phase: Phase 5 — "Guia do Destino"
parent_spec: SPEC-PROD-053
---

# SPEC-GUIA-DESTINO-CONTEUDO: Definicao de Conteudo — Guia do Destino

## 1. Proposito deste Documento

Este documento define EXATAMENTE qual conteudo pertence a cada secao da Phase 5 ("Guia do Destino"). Ele responde uma pergunta diferente das specs de produto padrao: nao "qual e o comportamento visual" (isso e SPEC-PROD-053 AC-07 a AC-12), mas "qual e a informacao que o AI deve gerar e o produto deve exibir em cada secao".

Esta spec e a fonte de verdade para:
- O prompt-engineer ao escrever o template de geracao de guia
- O ux-designer ao definir quais campos compoe cada card do bento-grid
- O qa-engineer ao validar se o conteudo gerado esta completo e correto
- O product-owner ao aceitar ou rejeitar um guia gerado

---

## 2. Contexto do Produto

### Por que este guia existe

O viajante que chega na Phase 5 ja definiu destino, datas, estilo de viagem e documentacao. Ele nao precisa ser convencido a ir — ele ja decidiu. O que ele precisa agora e inteligencia pratica sobre o destino: o que esperar, como se comportar, quanto gastar, o que nao pode perder.

O Guia do Destino e o momento em que o Atlas se diferencia de uma simples busca no Google. O Google retorna 10 links. O Atlas retorna um guia personalizado, na lingua do viajante, calibrado para o seu perfil (orcamento, interesses, estilo de viagem, composicao do grupo).

### Persona primaria

`@leisure-solo` e `@leisure-family` sao as personas primarias desta fase. Viajantes de negocio (`@business-traveler`) usam a fase mas com interesse elevado em DDI, fuso horario e dicas de segurança em detrimento das atrações.

### Principio de personalizacao

O conteudo do guia DEVE ser personalizado de acordo com os dados coletados nas fases anteriores:
- **Phase 1**: destino, datas (estacao do ano)
- **Phase 2**: estilo de viagem (`travel_pace`), composicao (adultos, criancas, seniors), interesses (`activities`, `cuisine`, `cultural_interests`), orcamento de refeicao (`meal_budget`)
- **Phase 3**: documentacao necessaria (pode indicar requisitos especificos)

A personalizacao nao e opcional — e a razao pela qual o usuario usa o Atlas em vez de um site de turismo generico.

---

## 3. Secoes do Guia — Definicao Autoritativa

O guia e composto por secoes. Cada secao tem uma identidade clara: o que ela DEVE conter, o que ela NAO DEVE conter, e como ela se comporta em termos de personalizacao.

---

### 3.1 SOBRE O DESTINO (`aboutDestination`)

**Finalidade**: Contextualizar o viajante sobre o destino de forma envolvente. Esta e a "capa" do guia — ela deve despertar entusiasmo e curiosidade, nao apresentar fatos secos.

#### Conteudo obrigatorio

| Campo | Descricao | Exemplo (Lisboa) |
|-------|-----------|------------------|
| Historia breve | 2-3 fatos historicos marcantes que moldam a identidade atual do destino | "Capital de um dos primeiros imperios coloniais, Lisboa conserva em seus azulejos a memoria das descobertas" |
| Destaques culturais | 2-3 elementos culturais que distinguem o destino (musica, culinaria, arte, arquitetura) | "O Fado, o Pastel de Nata e o azulejo sao tres expressoes inconfundiveis da alma lisboeta" |
| Por que visitar | 1 paragrafo sintetico com a proposta de valor do destino para ESTE viajante especifico | Varia conforme perfil |
| Visao geral do clima | Descricao geral do clima e da estacao esperada nas datas da viagem (sem dados numericos — esses vao na secao `quickFacts`) | "Espere dias ensolarados com brisas oceânicas frescas" |
| Melhor epoca para visitar | Indicacao da epoca ideal e como o periodo reservado se compara a ela | "Maio a outubro e o periodo ideal; sua viagem em setembro pega o auge do verao europeu" |

#### Conteudo proibido nesta secao

- Custos, valores em moeda local ou em BRL
- Alertas de seguranca, crimes ou riscos
- Informacoes de transporte (como chegar, como se locomover)
- Listas de atrações especificas (isso vai em `mustSee`)
- Dados numericos estruturados (temperatura, codigo do pais, etc.)

#### Formato

- 2 a 3 paragrafos de texto corrido, tom engajante e editorial (nao enciclopedico)
- Maximo 300 palavras no total
- Voz: segunda pessoa ("Voce vai encontrar...", "Prepare-se para...")
- Idioma: portugues do Brasil (pt-BR)

#### Regra de personalizacao

| Perfil detectado | Ajuste de tom e enfase |
|------------------|------------------------|
| Familia com criancas | Destacar segurança do destino, atividades para todas as idades, ritmo adequado |
| Solo com ritmo intenso | Destacar diversidade de experiencias em curto periodo, nightlife, espontaneidade |
| Solo com ritmo relaxado | Destacar cafes, passeios sem pressa, bairros para se perder |
| Interesses em historia/cultura | Destacar museus, monumentos, contexto historico |
| Interesses em gastronomia | Destacar culinaria local, mercados, pratos emblematicos |
| Seniors | Destacar acessibilidade, calma, estrutura para conforto |

---

### 3.2 INFORMACOES RAPIDAS (`quickFacts`)

**Finalidade**: Fornecer ao viajante um painel de referencia rapida para as informacoes praticas que ele consultara repetidamente antes e durante a viagem. Esta e a secao mais "utilitaria" do guia.

#### Campos obrigatorios (sempre presentes)

| Campo | O que exibir | Formato | Exemplo (Lisboa) |
|-------|-------------|---------|------------------|
| Clima (`clima`) | Amplitude termica esperada para as datas da viagem + descricao da estacao | `MIN-MAXoC • Descricao` | `18-25oC • Verao seco` |
| Moeda (`moeda`) | Nome completo da moeda + simbolo + taxa de cambio aproximada para BRL | `Nome (SIMBOLO) • 1 [simbolo] = R$ XX,XX` | `Euro (€) • 1 € = R$ 5,80` |
| Idioma (`idioma`) | Idioma oficial + 3 frases uteis em transliteracao | Nome + frases em tabela | `Portugues • Obrigado / Por favor / Onde fica...` |
| Fuso horario (`fusoHorario`) | Offset UTC + diferenca em horas em relacao a Brasilia | `UTC±X • X horas [a frente/atras] de Brasilia` | `UTC+0 • 3 horas atras de Brasilia` |
| Tomada (`tomada`) | Tipo de plug (letra padrao IEC) + voltagem | `Tipo X • 220V` | `Tipo F • 230V` |
| DDI (`ddi`) | Codigo de discagem internacional com prefixo + | `+XXX` | `+351` |

#### Campos opcionais (exibidos quando dados disponiveis e relevantes)

| Campo | Condicao de exibicao | Formato |
|-------|---------------------|---------|
| Visto (`visa`) | Quando o destino requer visto para passaporte brasileiro | `Requer visto: [tipo] — [onde solicitar]` |
| Vacinacao (`vaccination`) | Quando ha vacinas recomendadas ou obrigatorias pela ANVISA/OMS | `Vacinas: [lista]` |

#### Conteudo proibido nesta secao

- Texto narrativo ou paragrafos
- Dicas de seguranca
- Atrações
- Custos de refeicoes ou hospedagem (esses vao em `dailyCosts`)

#### Formato

- Lista de pares chave-valor compactos
- Cada item: icone + rotulo em caixa alta + valor em destaque
- Sem paragrafos, sem bullet points longos
- Exibicao: grade 2x3 (6 campos) em desktop; lista em mobile

#### Regra de personalizacao

- O campo `clima` DEVE usar as datas especificas da viagem (Phase 1) para descrever a estacao, nao o clima geral anual do destino
- O campo `idioma` deve incluir frases adaptadas: familia com criancas recebe frases sobre "criancas", business traveler recebe frases corporativas ("Onde e o metro?", "Qual e o wifi?")

---

### 3.3 SEGURANCA (`safety`)

**Finalidade**: Dar ao viajante uma avaliacao honesta e pratica do nivel de seguranca do destino, com acoes concretas — nao alarmar desnecessariamente, nem omitir riscos reais.

#### Nivel de seguranca (obrigatorio)

O campo de nivel de seguranca resume o perfil geral em um dos tres estados:

| Nivel | Descricao | Cor indicativa |
|-------|-----------|----------------|
| `safe` — Seguro | Destino com baixo indice de criminalidade para turistas; nenhuma alerta do MRE brasileiro ativo | Verde (atlas-tertiary) |
| `moderate` — Atencao | Destino com riscos pontuais (furtos em areas turisticas, areas a evitar); cautela recomendada | Amarelo (atlas-primary-fixed) |
| `caution` — Cautela | Destino com alertas de viagem ativos, instabilidade politica, ou historico de crimes contra turistas | Laranja/vermelho (atlas-error) |

O nivel deve ser baseado em evidencias — nunca inferido apenas pelo continente ou regiao.

#### Dicas de seguranca (obrigatorio)

- Minimo: 3 dicas especificas e acionaveis
- Maximo: 5 dicas
- Cada dica deve ser especifica ao destino — NUNCA generica ("nao deixe seus pertences sem vigilancia" e uma dica invalida sem contexto local)
- Exemplos de dicas validas: "Redobre atencao com carteiristas dentro e nas entradas do metro" / "Evite o bairro X apos as 22h" / "O Elétrico 28 e alvo frequente de furtos — use mochila na frente"

#### Contatos de emergencia (obrigatorio)

| Servico | Exibicao |
|---------|----------|
| Policia | Numero local + observacao se ha linha especifica para turistas |
| Ambulancia / SAMU equivalente | Numero local |
| Policia de turismo | Quando existir — numero e/ou website |
| Embaixada brasileira | Telefone da embaixada ou consulado no pais de destino |

#### Conteudo proibido nesta secao

- Informacoes de transporte (como chegar ou se locomover)
- Custos
- Atrações
- Dicas culturais de etiqueta (isso vai em `culturalTips` se disponivel)

#### Formato

- Indicador de nivel visual (badge colorido) no topo da secao
- Lista de dicas com icone de verificacao
- Bloco de contatos de emergencia separado, visualmente distinto (card interno)
- Tom: informativo e sereno — nunca alarmista

#### Regra de personalizacao

| Perfil | Adaptacao |
|--------|-----------|
| Familia com criancas | Incluir dicas especificas para viagens com criancas (areas seguras para brincar, seguranca em praias, etc.) |
| Solo feminina | Incluir dica sobre seguranca para mulheres viajando sozinhas quando relevante para o destino |
| Idosos/seniors | Incluir dica sobre acessibilidade e emergencias medicas |

---

### 3.4 CUSTOS MEDIOS DIARIOS (`dailyCosts`)

**Finalidade**: Dar ao viajante uma estimativa realista de quanto gastar por dia no destino, calibrada para o nivel de orcamento dele. Todos os valores em BRL para facilitar o planejamento financeiro.

#### Categorias obrigatorias

| Categoria | O que exibir | Exemplo (Lisboa, orcamento medio) |
|-----------|-------------|-----------------------------------|
| Refeicao basica (`mealBudget`) | Custo medio de uma refeicao completa (almoco ou jantar) na categoria detectada pelo perfil do usuario | R$ 60-90 por refeicao |
| Refeicao premium (`mealPremium`) | Exibido apenas se `meal_budget = premium` no perfil | R$ 200-350 por refeicao |
| Transporte local (`localTransport`) | Custo medio de deslocamento por dia (combinacao de metro, bus, taxi/ride-share conforme destino) | R$ 30-60 por dia |
| Hospedagem — referencia (`accommodation`) | Faixa de preco por noite para o tipo de hospedagem adequado ao perfil (hostel / hotel 3 estrelas / hotel 4-5 estrelas) | R$ 350-700 por noite |
| Entrada em atrações (`attractions`) | Custo medio de entradas por dia, considerando 1-2 atrações pagas | R$ 60-120 por dia |
| Total diario estimado (`dailyTotal`) | Soma dos itens acima para o perfil do usuario — exibido com destaque | R$ 500-900 por dia |

#### Regra de moeda

TODOS os valores DEVEM ser exibidos em BRL (R$), nao na moeda local. A taxa de cambio usada deve ser a mesma informada em `quickFacts.moeda`. Exibir a data de referencia da taxa: "Valores estimados com cambio de R$ 5,80/€ (marco 2026)".

#### Conteudo proibido nesta secao

- Dicas de seguranca
- Informacoes culturais
- Texto narrativo (nao e o lugar para "Lisboa e uma cidade barata para padroes europeus")
- Valores na moeda local sem conversao em BRL

#### Formato

- Tabela ou lista estruturada: categoria + faixa de preco em BRL + dica contextual curta (1 linha)
- Total diario destacado (peso visual maior, fundo diferenciado)
- Nota de rodape com aviso de variacao sazonal e referencia de cambio
- Aviso obrigatorio: "Valores estimados com base em dados historicos. Verifique precos atuais antes da viagem."

#### Regra de personalizacao

| Dado do perfil (Phase 2) | Comportamento em `dailyCosts` |
|--------------------------|-------------------------------|
| `meal_budget = budget` | Exibir tier economico para refeicoes; `mealPremium` ocultado |
| `meal_budget = moderate` | Exibir tier medio para refeicoes; `mealPremium` ocultado |
| `meal_budget = premium` | Exibir tier premium; adicionar coluna comparativa com economico |
| Criancas no grupo | Adicionar linha "Menu infantil / Kids meal": faixa de preco separada |
| Seniors no grupo | Adicionar nota sobre descontos para terceira idade quando disponiveis no destino |
| `travel_pace = relaxed` | Aumentar estimativa de refeicoes por dia (turistas relaxados comem fora mais vezes) |

---

### 3.5 O QUE NAO PERDER (`mustSee`)

**Finalidade**: Curar uma lista de experiencias imperdíveis no destino, personalizada para os interesses do viajante. Esta e a secao de maior impacto emocional — e o momento em que o viajante imagina como vai ser a viagem.

#### Cada atracao/experiencia contem (obrigatorio)

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| `name` | Nome oficial da atracao em portugues (e nome local entre parenteses quando diferente) | "Mosteiro dos Jeronimos (Mosteiro dos Jerónimos)" |
| `category` | Categoria padronizada do enum abaixo | `cultura` |
| `estimatedTime` | Duracao recomendada da visita | "2-3 horas" |
| `costRange` | Faixa de custo de entrada em BRL (ou "Gratis" quando sem custo) | "R$ 30-50" |
| `description` | 1-2 frases descritivas, orientadas a experiencia (o que o viajante vai sentir, ver, ou viver) — nao uma descricao enciclopedica | "O conjunto monastico mais impressionante de Lisboa, onde a pedra parece flutuar em rendas manuelinas" |
| `personalizedTag` | Tag opcional indicando por que esta atracao e relevante PARA ESTE viajante (exibida como chip) | "Perfeito para criancas", "Fora do circuito turistico", "Vista imperdivel" |

#### Categorias validas

| Enum | Icone sugerido | Descricao |
|------|---------------|-----------|
| `natureza` | `park` | Parques, praias, trilhas, paisagens naturais |
| `cultura` | `museum` | Museus, monumentos, arquitetura, patrimonio historico |
| `gastronomia` | `restaurant` | Mercados, restaurantes emblematicos, experiencias culinarias |
| `noturno` | `nightlife` | Bares, casas de show, baladas, musica ao vivo |
| `esporte` | `sports` | Estadios, atividades esportivas, aventura |
| `compras` | `shopping_bag` | Mercados locais, lojas tipicas, feiras |
| `religioso` | `church` | Igrejas, templos, locais de culto de relevancia cultural |
| `familiar` | `family_restroom` | Atrações especificamente adequadas para criancas |

#### Regras de curadoria

- Minimo: 5 atrações
- Maximo: 8 atrações (nao sobrecarregar o viajante)
- Distribuicao de categorias: nunca mais de 3 atrações da mesma categoria (evitar lista monotematica)
- A primeira atracao exibida DEVE ser a mais iconica e reconhecivel do destino (estabelece o "wow moment" imediato)
- Pelo menos 1 atracao gratuita DEVE estar na lista

#### Regra de personalizacao (ordem e selecao)

A lista de atrações DEVE ser reordenada e filtrada com base nos interesses do viajante coletados na Phase 2 (`activities`, `cuisine`, `cultural_interests`):

| Interesse declarado | Priorizar |
|--------------------|-----------|
| `museums` | Atrações de categoria `cultura` sobem na lista |
| `beaches` | Atrações de categoria `natureza` (especialmente praias) sobem |
| `nightlife` | Atrações de categoria `noturno` sobem; ampliar para ate 2 itens desta categoria |
| `gastronomy` | Atrações de categoria `gastronomia` sobem; incluir mercados locais obrigatoriamente |
| `history` | Atrações de categoria `cultura` e `religioso` sobem; enfase em contexto historico nas descricoes |
| `shopping` | Incluir pelo menos 1 item de categoria `compras` |
| Criancas no grupo | Incluir pelo menos 1 item de categoria `familiar`; priorizar atrações com indicacao de "Perfeito para criancas" |
| Futebol (interesse cultural) | Incluir estadio ou museu de futebol quando disponivel no destino |

#### Formato

- Grade horizontal com scroll em mobile (horizontal card scroll)
- Grade 3-4 colunas em desktop (cards com imagem de destaque)
- Cada card: imagem + nome + categoria (chip) + duracao + custo + descricao (truncada, expandivel)
- Sem paginacao — toda a lista visivel (maximo 8 itens)

---

### 3.6 SECOES ADICIONAIS (quando dados disponiveis)

As secoes abaixo sao opcionais. Devem ser geradas quando o destino e/ou o perfil do viajante justifica seu conteudo. Nao exibir secoes vazias ou com conteudo generico.

---

#### 3.6.1 DOCUMENTACAO (`documentation`)

**Quando exibir**: Sempre — documenta o checklist de requisitos de entrada para o destino.

| Campo | Descricao |
|-------|-----------|
| Passaporte | Validade minima exigida (ex: "6 meses apos a data de retorno") |
| Visto | Sim/Nao + tipo (Schengen, eletrônico, na chegada) + link do site oficial |
| Vacinas | Lista de vacinas recomendadas pela OMS e/ou obrigatorias pelo pais destino para entrada de brasileiros |
| Seguro viagem | Obrigatorio ou recomendado; faixa de cobertura recomendada em USD |

Nota: Esta secao complementa o checklist da Phase 3 — nao o substitui. Enquanto a Phase 3 lista todos os documentos a preparar, esta secao foca nos requisitos de entrada no pais de destino.

---

#### 3.6.2 TRANSPORTE LOCAL (`localTransport`)

**Quando exibir**: Sempre — informacoes de mobilidade urbana sao essenciais para qualquer viagem.

| Campo | Descricao | Exemplo (Lisboa) |
|-------|-----------|------------------|
| Opcoes disponíveis | Lista das principais opcoes de transporte (metro, bus, tram, bike, ride-share) | Metro, Elétrico, Autocarros, Uber |
| Avaliacao de qualidade | Rating qualitativo (Excelente / Bom / Regular) + observacao | "Bom — cobertua ampla no centro, mas Elétrico 28 superlotado em horario de pico" |
| Custo de referencia | Preco do transporte publico por viagem + passe diario/semanal se disponivel, em BRL | "R$ 3,50 por viagem / R$ 30 passe 24h" |
| Dica principal | 1 dica pratica e especifica | "O Lisboa Card vale a pena se voce vai visitar 2+ museus — inclui transporte ilimitado" |
| App recomendado | Aplicativo local de mobilidade quando disponivel | "Bolt, Uber — ambos funcionam bem. Evite taxi de rua" |

---

#### 3.6.3 DICAS CULTURAIS (`culturalTips`)

**Quando exibir**: Sempre — contribui significativamente para a experiencia e satisfacao do viajante.

| Subcategoria | Conteudo |
|-------------|---------|
| Etiqueta | 2-3 normas de comportamento esperado em locais publicos, restaurantes, ou locais religiosos |
| Gorjetas | Pratica local de gorjetas (sim/nao, percentual tipico, contexto: restaurantes, taxis, etc.) |
| Horarios | Diferenca de horario de funcionamento que pode surpreender o brasileiro (ex: siesta, lojas fecham cedo, restaurantes abrem tarde) |
| Saudacoes | Forma de cumprimento local + observacao sobre contato fisico (aperto de mao, abraco, beijo) |
| Costumes locais | 1-2 costumes que o viajante deve respeitar ou que vai encontrar de forma distinta do Brasil |

---

## 4. Criterios de Qualidade do Conteudo Gerado

### 4.1 Criterios universais (toda secao)

- [ ] Cada secao DEVE ter APENAS o conteudo definido para ela nesta spec — sem misturar informacoes entre secoes
- [ ] Nenhum valor monetario em moeda estrangeira sem conversao em BRL correspondente
- [ ] Nenhuma secao pode ser entregue vazia ou com placeholder ("informacoes nao disponiveis") — se os dados nao estiverem disponiveis, a secao e omitida e registrado log de conteudo incompleto
- [ ] O tom deve ser consistente com a persona detectada — nunca generico
- [ ] Idioma exclusivo: pt-BR. Nomes proprios em lingua local entre parenteses quando necessario
- [ ] Nenhuma afirmacao de seguranca, saude, ou legal sem disclaimer de verificacao

### 4.2 Criterios de aceitacao por secao (QA)

| Secao | Criterio minimo de aceite |
|-------|--------------------------|
| `aboutDestination` | 2 paragrafos presentes, nao contem custos nem alertas de seguranca, tom personalizado detectavel |
| `quickFacts` | Todos os 6 campos obrigatorios presentes, cambio para BRL informado, datas da viagem refletidas no campo `clima` |
| `safety` | Nivel de seguranca exibido (1 dos 3 valores), minimo 3 dicas especificas ao destino, contatos de emergencia presentes |
| `dailyCosts` | Todos os valores em BRL, total diario estimado presente, aviso de variacao presente, perfil de orcamento refletido |
| `mustSee` | Minimo 5 atrações, maximo 8, pelo menos 1 gratis, distribuicao de categorias, ordenacao reflete interesses declarados |
| `documentation` | Validade de passaporte informada, requisito de visto claro (sim/nao/tipo) |
| `localTransport` | Pelo menos 2 opcoes de transporte listadas, custo em BRL presente |
| `culturalTips` | Pelo menos 3 das 5 subcategorias presentes |

---

## 5. Restricoes

### Dados sensiveis e responsabilidade

- O produto NAOGARANTE a precisao de taxas de cambio, precos de entrada, ou requisitos de visto — essas informacoes mudam. O disclaimer padrao DEVE aparecer em todas as sessoes de dados quantitativos.
- Informacoes de seguranca NAO DEVEM nomear grupos especificos de criminosos, etnicidades, ou fazer afirmacoes que possam ser consideradas discriminatorias.
- A avaliacao de nivel de seguranca (`safe` / `moderate` / `caution`) DEVE ser baseada em dados de fontes confiáveis (MRE brasileiro, FCDO, US State Department) — nunca em estereoitipos ou percepcoes.

### Privacidade

- Os dados de perfil usados para personalizacao (interesses, composicao do grupo, orcamento) sao dados do usuario armazenados com consentimento. Eles nao devem ser expostos ao usuario de volta em texto literal ("Como voce escolheu 'nightlife' nos seus interesses...") — a personalizacao deve ser natural, nao explicita.

### Acessibilidade do conteudo

- Todo conteudo textual gerado deve ser legivel em nivel B2 de portugues — sem jargoes tecnicos ou vocabulario extremamente formal
- Listas de dicas devem usar frases curtas (max. 2 linhas)
- A atracao em `mustSee` deve ter descricao compreensivel mesmo sem imagem (para screen readers)

---

## 6. Dependencias

- SPEC-PROD-053 (AC-07 a AC-12): define a estrutura visual do bento-grid que exibe este conteudo
- SPEC-PROD-052 (Phase 2): define os campos de perfil de preferencias usados na personalizacao
- Phase 1 (dados de destino e datas): entrada obrigatoria para geracao do guia
- Prompt template do guia: a ser definido pelo prompt-engineer com base nesta spec como fonte de verdade
- `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md`: tokens de design para os cards do bento-grid
- `docs/design/stitch-exports/phase5_guia_destino/code.html`: referencia visual das secoes do guia

---

## 7. Metricas de Sucesso

- QA: 100% das secoes obrigatorias presentes em guias gerados para destinos com dados disponiveis (validado em 10 destinos sample)
- Personalizacao: guias gerados para perfis distintos (solo vs familia; budget vs premium) apresentam conteudo mensuravel diferente em >= 3 secoes
- Qualidade editorial: UX Designer + product-owner aprovam 3 guias sample em revisao pre-sprint-close
- Aviso de disclaimer: 100% dos guias gerados exibem aviso de variacao de dados em secoes quantitativas
- Nenhuma afirmacao discriminatoria: zero flags em revisao de conteudo de seguranca

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-26 | product-owner | Initial draft — definicao autoritativa de conteudo por secao do Guia do Destino |
