---
spec_id: SPEC-SUMARIO-CONTEUDO
title: Definicao de Conteudo — Sumario da Expedicao (Expedition Summary)
version: 1.0.0
status: Draft
sprint: 40
owner: product-owner
created: 2026-03-27
updated: 2026-03-27
phase: Expedition Summary (pos-Phase 6)
parent_spec: SPEC-PROD-053
service_reference: src/server/services/expedition-summary.service.ts
schema_reference: prisma/schema.prisma
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
---

# SPEC-SUMARIO-CONTEUDO: Definicao de Conteudo — Sumario da Expedicao

## 1. Proposito deste Documento

Este documento define EXATAMENTE qual informacao deve aparecer no Sumario da Expedicao, organizada por fase. Ele responde uma pergunta diferente das specs de produto visuais: nao "como o sumario e renderizado" (isso e SPEC-PROD-053 AC-19 a AC-21), mas "qual dado especifico e exibido em cada secao, de qual tabela do banco, em qual formato, com qual prioridade de exibicao, e qual e o criterio de aceite para cada item".

Este documento e a fonte de verdade para:
- O dev-fullstack-2 ao implementar os selects do `ExpeditionSummaryService` e os componentes de UI
- O qa-engineer ao definir casos de teste para o sumario
- O ux-designer ao validar que nenhum dado critico foi omitido do layout
- O product-owner ao aceitar ou rejeitar a implementacao do sumario

### Convencoes deste documento

**Prioridade de exibicao**:
- `must-show` — sempre visivel, mesmo que vazio (exibe estado vazio explicito)
- `show-if-available` — visivel apenas quando o dado existe no banco

**Formato**:
- `text` — string simples
- `number` — valor numerico sem unidade especial
- `date` — data no formato DD/MM/AAAA (pt-BR) ou MM/DD/YYYY (en)
- `date-range` — intervalo de datas: "12 a 19 de julho de 2026"
- `duration` — numero de dias: "7 dias"
- `badge` — componente AtlasBadge com icone e label
- `list` — lista de items
- `progress` — barra ou texto "X/Y"
- `boolean` — "Sim" / "Nao" ou icone check/cross
- `masked-text` — texto parcialmente ocultado (booking codes)
- `currency` — valor monetario com simbolo e moeda

**Estado vazio**: quando um item `must-show` nao tem dado, exibir estado vazio conforme definido em cada item. Nunca exibir `null`, `undefined`, ou campo em branco sem contexto.

---

## 2. Hero Bar — Cabecalho do Sumario

O hero bar e a primeira secao visivel do sumario. Ele aparece acima de todas as secoes de fase e nao tem numeracao de fase. E uma visao consolidada da identidade da expedicao.

Fonte primaria: `Trip` + `ExpeditionSummaryPhase1` (calculado pelo `ExpeditionSummaryService`).

---

### HERO-01: Nome da Expedicao

| Atributo | Valor |
|---|---|
| **Dado** | Nome definido pelo usuario ao criar a viagem |
| **Fonte** | `trips.title` |
| **Formato** | `text` — exibido como heading principal do hero bar |
| **Prioridade** | `must-show` |
| **Estado vazio** | Usar `trips.destination` como fallback se `title` estiver em branco |

**Criterio de aceite**:
- [ ] Dado `trips.title` preenchido, quando o sumario renderiza, entao o titulo aparece como heading H1 no hero bar.
- [ ] Dado `trips.title` vazio, quando o sumario renderiza, entao o campo `trips.destination` e usado como titulo do hero bar.

---

### HERO-02: Destino

| Atributo | Valor |
|---|---|
| **Dado** | Cidade e pais de destino |
| **Fonte** | `trips.destination` (string livre, ex: "Lisboa, Portugal") |
| **Formato** | `text` |
| **Prioridade** | `must-show` |
| **Estado vazio** | Nao aplicavel — trip sem destino nao pode existir |

**Criterio de aceite**:
- [ ] Dado `trips.destination` preenchido, quando o hero bar renderiza, entao o destino aparece imediatamente abaixo do titulo com icone de localizacao.

---

### HERO-03: Cidade de Origem

| Atributo | Valor |
|---|---|
| **Dado** | Cidade de partida do viajante |
| **Fonte** | `trips.origin` |
| **Formato** | `text` — exibido como "De: [origem]" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido do hero bar quando `trips.origin` e null |

**Criterio de aceite**:
- [ ] Dado `trips.origin` preenchido, quando o hero bar renderiza, entao aparece "De: [origem] → [destino]" no formato de rota.
- [ ] Dado `trips.origin` null, quando o hero bar renderiza, entao apenas o destino e exibido, sem o separador de rota.

---

### HERO-04: Periodo da Viagem

| Atributo | Valor |
|---|---|
| **Dado** | Data de inicio e data de fim |
| **Fonte** | `trips.startDate`, `trips.endDate` |
| **Formato** | `date-range` — ex: "12 a 19 de julho de 2026" |
| **Prioridade** | `must-show` |
| **Estado vazio** | "Datas nao definidas" quando ambas as datas sao null |

**Criterio de aceite**:
- [ ] Dado ambas as datas preenchidas, quando o hero bar renderiza, entao o periodo aparece como "DD de mes de AAAA a DD de mes de AAAA" (pt-BR) ou "Month DD – DD, YYYY" (en).
- [ ] Dado apenas `startDate` preenchida, quando o hero bar renderiza, entao aparece "A partir de DD/MM/AAAA".
- [ ] Dado ambas as datas null, quando o hero bar renderiza, entao aparece "Datas nao definidas" em `atlas-on-surface-variant`.

---

### HERO-05: Duracao

| Atributo | Valor |
|---|---|
| **Dado** | Numero de dias calculado a partir de startDate e endDate |
| **Fonte** | Calculado: `(endDate - startDate) + 1` dias |
| **Formato** | `duration` — ex: "7 dias" |
| **Prioridade** | `show-if-available` — exibido apenas quando ambas as datas estao presentes |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado startDate e endDate preenchidas, quando o hero bar renderiza, entao a duracao aparece como "[N] dias" ao lado do periodo.
- [ ] Dado duracao de 1 dia, quando o hero bar renderiza, entao aparece "1 dia" (singular).

---

### HERO-06: Total de Viajantes

| Atributo | Valor |
|---|---|
| **Dado** | Soma de adultos + criancas + bebes + idosos |
| **Fonte** | `trips.passengers` (JSON): `adults + children.count + infants + seniors` |
| **Formato** | `number` — ex: "4 viajantes" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando `trips.passengers` e null |

**Criterio de aceite**:
- [ ] Dado `trips.passengers` preenchido, quando o hero bar renderiza, entao o total aparece como "[N] viajante(s)" com icone de grupo.
- [ ] Dado total igual a 1, quando o hero bar renderiza, entao aparece "1 viajante" (singular).

---

### HERO-07: Percentual de Conclusao

| Atributo | Valor |
|---|---|
| **Dado** | Percentual calculado pelo servico de sumario |
| **Fonte** | `ExpeditionSummary.completionPercentage` (calculado por `calculateCompletionPercentage()`) |
| **Formato** | `progress` — ex: "83% completo" com barra de progresso |
| **Prioridade** | `must-show` |
| **Estado vazio** | "0% completo" |

**Criterio de aceite**:
- [ ] Dado `completionPercentage` calculado, quando o hero bar renderiza, entao a barra de progresso exibe o valor correto de 0 a 100%.
- [ ] Dado `completionPercentage = 100`, quando o hero bar renderiza, entao aparece um badge de "Expedicao Completa" usando `AtlasBadge` com cor de sucesso.

---

## 3. Fase 1 — O Chamado

Fonte de dados: `ExpeditionSummaryPhase1` (campos diretos do model `Trip` + `UserProfile`).

Esta fase e sempre presente — todo sumario tem uma Fase 1, pois a trip nao pode existir sem destino.

---

### F1-01: Cidade de Origem

| Atributo | Valor |
|---|---|
| **Dado** | Cidade de partida |
| **Fonte** | `trips.origin` |
| **Formato** | `text` |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | "Nao informada" em `atlas-on-surface-variant` com link "Adicionar" para Phase 1 |

**Criterio de aceite**:
- [ ] Dado `trips.origin` preenchido, quando a secao F1 renderiza, entao a origem aparece com label "Cidade de origem".
- [ ] Dado `trips.origin` null, quando a secao F1 renderiza, entao aparece "Nao informada" e um link "Adicionar" que navega de volta a Phase 1.

---

### F1-02: Destino

| Atributo | Valor |
|---|---|
| **Dado** | Cidade e pais de destino |
| **Fonte** | `trips.destination` |
| **Formato** | `text` |
| **Prioridade** | `must-show` |
| **Estado vazio** | Nao aplicavel |

**Criterio de aceite**:
- [ ] Dado `trips.destination` preenchido, quando a secao F1 renderiza, entao o destino aparece com label "Destino".

---

### F1-03: Data de Inicio

| Atributo | Valor |
|---|---|
| **Dado** | Data de saida da viagem |
| **Fonte** | `trips.startDate` |
| **Formato** | `date` — DD/MM/AAAA (pt-BR) |
| **Prioridade** | `must-show` |
| **Estado vazio** | "Nao definida" com link "Adicionar" para Phase 1 |

**Criterio de aceite**:
- [ ] Dado `trips.startDate` preenchida, quando a secao F1 renderiza, entao a data aparece formatada no locale do usuario.
- [ ] Dado `trips.startDate` null, quando a secao F1 renderiza, entao aparece "Nao definida" com indicador de pendencia visual (cor `atlas-error`).

---

### F1-04: Data de Fim

| Atributo | Valor |
|---|---|
| **Dado** | Data de retorno da viagem |
| **Fonte** | `trips.endDate` |
| **Formato** | `date` — DD/MM/AAAA (pt-BR) |
| **Prioridade** | `must-show` |
| **Estado vazio** | "Nao definida" com link "Adicionar" para Phase 1 |

**Criterio de aceite**:
- [ ] Idem F1-03 para `trips.endDate`.

---

### F1-05: Duracao da Viagem

| Atributo | Valor |
|---|---|
| **Dado** | Numero de dias calculado |
| **Fonte** | Calculado: `(endDate - startDate) + 1` |
| **Formato** | `duration` — "[N] dias" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado ambas as datas preenchidas, quando a secao F1 renderiza, entao a duracao aparece como "[N] dias".

---

### F1-06: Composicao de Viajantes — Detalhe

| Atributo | Valor |
|---|---|
| **Dado** | Contagem por categoria de viajante |
| **Fonte** | `trips.passengers` (JSON): `{ adults, children: { count }, infants, seniors }` |
| **Formato** | `list` — exibir cada categoria com valor > 0, ex: "2 adultos, 1 crianca, 1 idoso" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | "Nao informado" |

**Criterio de aceite**:
- [ ] Dado `trips.passengers` com valores, quando a secao F1 renderiza, entao cada categoria com valor > 0 aparece como linha separada ou em linha com virgulas.
- [ ] Dado categoria com valor 0, quando a secao F1 renderiza, entao essa categoria e omitida (nao mostrar "0 bebes").
- [ ] Dado `trips.passengers` null, quando a secao F1 renderiza, entao aparece "Nao informado" com link para Phase 1 ou Phase 2.

---

### F1-07: Tipo de Viagem (Classificacao Automatica)

| Atributo | Valor |
|---|---|
| **Dado** | Tipo calculado automaticamente pelo sistema |
| **Fonte** | `trips.tripType` (enum: "international", "domestic", etc.) |
| **Formato** | `badge` — label traduzido, ex: "Internacional" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `trips.tripType` preenchido, quando a secao F1 renderiza, entao o tipo aparece como `AtlasBadge` com label localizado.

---

### F1-08: Datas Flexiveis

| Atributo | Valor |
|---|---|
| **Dado** | Se o viajante marcou datas como flexiveis |
| **Fonte** | `expedition_phases.metadata.flexibleDates` (Phase 1 metadata JSON) |
| **Formato** | `boolean` — "Sim" / "Nao" ou icone |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `flexibleDates = true` na metadata da Phase 1, quando a secao F1 renderiza, entao aparece um indicador "Datas flexiveis" com icone.
- [ ] Dado `flexibleDates = false` ou null, quando a secao F1 renderiza, entao o campo e omitido.

---

## 4. Fase 2 — O Explorador (O Perfil)

Fonte de dados: `ExpeditionSummaryPhase2` — combina `expedition_phases.metadata` (Phase 2) + `trips.passengers` + `user_profiles.preferences`.

Esta fase e `show-if-available` no nivel da secao: se `phase2Data?.status !== "completed"`, a secao exibe estado de "fase nao concluida".

---

### F2-01: Tipo de Viajante

| Atributo | Valor |
|---|---|
| **Dado** | Categoria do viajante definida pelo usuario |
| **Fonte** | `expedition_phases.metadata.travelerType` (Phase 2) — valores: "solo", "couple", "family", "group", "business", "student" |
| **Formato** | `badge` — label traduzido: "Solo", "Casal", "Familia", "Grupo", "Negocios", "Estudante" |
| **Prioridade** | `must-show` dentro da secao F2 (se F2 existir) |
| **Estado vazio** | "Nao informado" |

**Criterio de aceite**:
- [ ] Dado Phase 2 completa e `travelerType` preenchido, quando a secao F2 renderiza, entao o tipo aparece como `AtlasBadge` com label localizado e icone representativo.

---

### F2-02: Estilos de Viagem

| Atributo | Valor |
|---|---|
| **Dado** | Estilos de viagem selecionados |
| **Fonte** | `user_profiles.preferences` — categoria `activities` (multi-select) |
| **Formato** | `list` de `AtlasChip` — ex: "Museus", "Praias", "Gastronomia" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | "Nao definidos" |

**Criterio de aceite**:
- [ ] Dado `preferences.activities` com valores, quando a secao F2 renderiza, entao cada atividade aparece como `AtlasChip` individual.
- [ ] Dado `preferences.activities` vazio ou null, quando a secao F2 renderiza, entao aparece "Nao definidos".

---

### F2-03: Faixa de Orcamento

| Atributo | Valor |
|---|---|
| **Dado** | Categoria de orcamento selecionada + valor numerico se informado |
| **Fonte** | `expedition_phases.metadata.budgetRange` (valores: "economic", "moderate", "premium") + `expedition_phases.metadata.budget` + `expedition_phases.metadata.currency` |
| **Formato** | `badge` + `currency` — ex: "Moderado — R$ 5.000" |
| **Prioridade** | `must-show` dentro da secao F2 (se F2 existir) |
| **Estado vazio** | "Nao definido" |

**Criterio de aceite**:
- [ ] Dado `budgetRange` preenchido e `budget` preenchido, quando a secao F2 renderiza, entao aparece label traduzido + valor formatado com simbolo da moeda.
- [ ] Dado `budgetRange` preenchido e `budget` null, quando a secao F2 renderiza, entao aparece apenas o label traduzido ("Moderado") sem valor numerico.
- [ ] Dado `budgetRange` null, quando a secao F2 renderiza, entao aparece "Nao definido".

---

### F2-04: Tipo de Hospedagem Preferida

| Atributo | Valor |
|---|---|
| **Dado** | Estilo de hospedagem preferido |
| **Fonte** | `expedition_phases.metadata.accommodationStyle` — valores: "hotel", "hostel", "airbnb", "camping", "resort", "pousada" |
| **Formato** | `badge` — label traduzido |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `accommodationStyle` preenchido, quando a secao F2 renderiza, entao aparece como `AtlasBadge` com label traduzido.

---

### F2-05: Ritmo de Viagem

| Atributo | Valor |
|---|---|
| **Dado** | Ritmo preferido: relaxado, moderado ou intenso |
| **Fonte** | `user_profiles.preferences` — categoria `travel_pace` (single-select): "relaxed", "moderate", "intense" |
| **Formato** | `badge` — label traduzido: "Relaxado", "Moderado", "Intenso" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `preferences.travel_pace` preenchido, quando a secao F2 renderiza, entao aparece como `AtlasBadge` com label localizado.

---

### F2-06: Restricoes Alimentares

| Atributo | Valor |
|---|---|
| **Dado** | Restricoes alimentares selecionadas |
| **Fonte** | `user_profiles.preferences` — categoria `dietary_restrictions` (multi-select) — exibir apenas se o array nao contiver "none" ou nao estiver vazio |
| **Formato** | `list` de `AtlasChip` — ex: "Vegetariano", "Sem Gluten" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando a selecao e "none" ou array vazio |

**Criterio de aceite**:
- [ ] Dado `preferences.dietary_restrictions` contendo restricoes reais (sem "none"), quando a secao F2 renderiza, entao cada restricao aparece como `AtlasChip`.
- [ ] Dado `preferences.dietary_restrictions` = ["none"] ou vazio, quando a secao F2 renderiza, entao o campo e omitido completamente.

---

### F2-07: Interesses e Hobbies

| Atributo | Valor |
|---|---|
| **Dado** | Interesses culturais selecionados |
| **Fonte** | `user_profiles.preferences` — categoria `cultural_interests` (multi-select) |
| **Formato** | `list` de `AtlasChip` — ex: "Historia Antiga", "Arte Contemporanea" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `preferences.cultural_interests` com valores, quando a secao F2 renderiza, entao cada interesse aparece como `AtlasChip`.

---

### F2-08: Nivel de Atividade Fisica

| Atributo | Valor |
|---|---|
| **Dado** | Nivel de condicionamento fisico relevante para planejamento |
| **Fonte** | `user_profiles.preferences` — sub-campo de acessibilidade ou ritmo (se mapeado); atualmente nao mapeado separadamente. Usar `preferences.accessibility` como proxy: se contem "reduced_mobility", indicar "Mobilidade reduzida" |
| **Formato** | `badge` |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `preferences.accessibility` contendo valores diferentes de "none", quando a secao F2 renderiza, entao aparece `AtlasBadge` com label "Acessibilidade: [valores]".
- [ ] Dado `preferences.accessibility` = ["none"] ou vazio, quando a secao F2 renderiza, entao o campo e omitido.

> Nota PO: O mapeamento explicito de "nivel de atividade fisica" como campo independente nao existe no schema atual. O QA deve validar apenas o campo `accessibility` como proxy. Um campo dedicado (`fitness_level`) pode ser incluido em sprint futuro de expansao do perfil.

---

## 5. Fase 3 — O Preparo (Checklist de Documentos)

Fonte de dados: `ExpeditionSummaryPhase3` — construido a partir de `phase_checklist_items` onde `phaseNumber = 3`.

Esta fase e `show-if-available` no nivel da secao: se `checklist.length === 0`, exibe estado "checklist nao gerado".

---

### F3-01: Progresso do Checklist

| Atributo | Valor |
|---|---|
| **Dado** | Quantos items foram concluidos vs total |
| **Fonte** | `ExpeditionSummaryPhase3.done` / `ExpeditionSummaryPhase3.total` |
| **Formato** | `progress` — "[X] de [Y] itens concluidos" + barra de progresso |
| **Prioridade** | `must-show` dentro da secao F3 (se F3 existir) |
| **Estado vazio** | "0 de 0 itens" |

**Criterio de aceite**:
- [ ] Dado checklist com items, quando a secao F3 renderiza, entao aparece "[X] de [Y] itens concluidos" com barra de progresso proporcional.
- [ ] Dado `done === total`, quando a secao F3 renderiza, entao a barra de progresso usa cor de sucesso e aparece icone de check verde.

---

### F3-02: Itens Obrigatorios Pendentes

| Atributo | Valor |
|---|---|
| **Dado** | Items marcados como `required = true` e `completed = false` |
| **Fonte** | `ExpeditionSummaryPhase3.items` filtrados por `required = true AND completed = false` |
| **Formato** | `list` — maximo 5 items exibidos; se houver mais, exibir "+N outros" |
| **Prioridade** | `must-show` dentro da secao F3 (mesmo que vazio) |
| **Estado vazio** | "Nenhum item obrigatorio pendente" com icone de check — estado positivo |

**Criterio de aceite**:
- [ ] Dado items obrigatorios pendentes, quando a secao F3 renderiza, entao a lista aparece com indicador visual de urgencia (cor `atlas-error` ou `atlas-error-container`).
- [ ] Dado mais de 5 items obrigatorios pendentes, quando a secao F3 renderiza, entao os primeiros 5 sao listados e aparece "+N outros pendentes" como link para Phase 3.
- [ ] Dado nenhum item obrigatorio pendente, quando a secao F3 renderiza, entao aparece mensagem positiva de conclusao.

---

### F3-03: Itens Recomendados Pendentes

| Atributo | Valor |
|---|---|
| **Dado** | Items marcados como `required = false` e `completed = false` |
| **Fonte** | `ExpeditionSummaryPhase3.items` filtrados por `required = false AND completed = false` |
| **Formato** | `list` — maximo 3 items exibidos; se houver mais, exibir "+N outros" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando nenhum item recomendado estiver pendente |

**Criterio de aceite**:
- [ ] Dado items recomendados pendentes, quando a secao F3 renderiza, entao a lista aparece com indicador visual neutro (cor `atlas-on-surface-variant`).
- [ ] Dado nenhum item recomendado pendente, quando a secao F3 renderiza, entao a sub-secao e omitida.

---

### F3-04: Itens Adicionados Manualmente

| Atributo | Valor |
|---|---|
| **Dado** | Items criados pelo usuario (nao gerados pela IA) — identificados por `itemKey` prefixado com "custom_" ou equivalente |
| **Fonte** | `phase_checklist_items` onde `phaseNumber = 3` e `itemKey LIKE 'custom_%'` |
| **Formato** | `list` com contagem — ex: "3 itens personalizados adicionados" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado items customizados existentes, quando a secao F3 renderiza, entao aparece contagem de items personalizados com link para Phase 3.
- [ ] Dado nenhum item customizado, quando a secao F3 renderiza, entao o campo e omitido.

> Nota PO: A convencao de prefixo "custom_" para identificar items manuais deve ser confirmada com o tech-lead. Se o esquema usar outro mecanismo de diferenciacao, este AC deve ser ajustado sem alterar a intencao do produto.

---

## 6. Fase 4 — A Logistica

Fonte de dados: `ExpeditionSummaryPhase4` — combina `transport_segments` + `accommodation` + `trips.localMobility`.

Esta fase e `show-if-available` no nivel da secao: se `phase4 === null`, exibe estado "logistica nao definida".

---

### F4-01: Transporte Principal (Ida)

| Atributo | Valor |
|---|---|
| **Dado** | Primeiro segmento de transporte (ida) |
| **Fonte** | `transport_segments` ordenados por `segmentOrder ASC`, primeiro registro com `isReturn = false` |
| **Formato** | `text` + `badge` — ex: badge "Aviao" + "Lisboa → Porto • 14/07 09:00" |
| **Prioridade** | `must-show` dentro da secao F4 (se F4 existir) |
| **Estado vazio** | "Transporte nao definido" com link "Adicionar" para Phase 4 |

**Criterio de aceite**:
- [ ] Dado segmento de transporte de ida existente, quando a secao F4 renderiza, entao o tipo de transporte aparece como `AtlasBadge` e a rota "saida → chegada" aparece com data/hora de partida.
- [ ] Dado `departurePlace` ou `arrivalPlace` null, quando a secao F4 renderiza, entao o campo ausente e substituido por "—".
- [ ] Dado nenhum segmento de transporte, quando a secao F4 renderiza, entao aparece "Nao definido" com link para Phase 4.

---

### F4-02: Transporte de Retorno

| Atributo | Valor |
|---|---|
| **Dado** | Segmento de retorno |
| **Fonte** | `transport_segments` onde `isReturn = true` |
| **Formato** | `text` + `badge` — idem F4-01 |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando nenhum segmento de retorno existe |

**Criterio de aceite**:
- [ ] Dado segmento de retorno existente, quando a secao F4 renderiza, entao aparece como linha separada abaixo do transporte de ida com label "Retorno".
- [ ] Dado nenhum segmento de retorno, quando a secao F4 renderiza, entao o campo e omitido (sem mensagem "sem retorno").

---

### F4-03: Segmentos de Transporte Adicionais

| Atributo | Valor |
|---|---|
| **Dado** | Outros segmentos alem de ida e volta |
| **Fonte** | `transport_segments` exceto o primeiro (ida) e o de retorno — todos os demais |
| **Formato** | `list` com contagem — ex: "2 conexoes adicionadas" + link "Ver todos" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando ha apenas ida e/ou volta |

**Criterio de aceite**:
- [ ] Dado 3 ou mais segmentos de transporte, quando a secao F4 renderiza, entao aparece contagem de segmentos adicionais com link "Ver todos" que navega para Phase 4.

---

### F4-04: Codigo de Reserva do Transporte

| Atributo | Valor |
|---|---|
| **Dado** | Codigo de reserva mascarado do primeiro segmento |
| **Fonte** | `transport_segments.bookingCodeEnc` — descriptografado e mascarado por `maskBookingCode()` |
| **Formato** | `masked-text` — ex: "BOOK-****-XY7" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando `bookingCodeEnc` e null |

**Criterio de aceite**:
- [ ] Dado `bookingCodeEnc` preenchido, quando a secao F4 renderiza, entao o codigo aparece mascarado no formato "BOOK-****-XXX".
- [ ] Dado `bookingCodeEnc` null, quando a secao F4 renderiza, entao o campo e completamente omitido.
- [ ] Dado `bookingCodeEnc` preenchido, quando o codigo mascarado e exibido, entao o valor descriptografado completo nunca aparece no DOM ou nos logs.

---

### F4-05: Hospedagem — Tipo e Nome

| Atributo | Valor |
|---|---|
| **Dado** | Tipo e nome do primeiro alojamento |
| **Fonte** | `accommodation` ordenado por `orderIndex ASC`, primeiro registro: `accommodationType` + `name` |
| **Formato** | `badge` + `text` — ex: badge "Hotel" + "Hotel Lisboa Plaza" |
| **Prioridade** | `must-show` dentro da secao F4 (se F4 existir) |
| **Estado vazio** | "Hospedagem nao definida" com link "Adicionar" para Phase 4 |

**Criterio de aceite**:
- [ ] Dado accommodation existente, quando a secao F4 renderiza, entao o tipo aparece como `AtlasBadge` e o nome como texto ao lado.
- [ ] Dado `accommodation.name` null, quando a secao F4 renderiza, entao o badge de tipo e exibido sem nome.

---

### F4-06: Hospedagem — Check-in e Check-out

| Atributo | Valor |
|---|---|
| **Dado** | Datas de check-in e check-out do primeiro alojamento |
| **Fonte** | `accommodation.checkIn`, `accommodation.checkOut` |
| **Formato** | `date` — "Check-in: DD/MM/AAAA • Check-out: DD/MM/AAAA" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando ambas as datas sao null |

**Criterio de aceite**:
- [ ] Dado check-in e check-out preenchidos, quando a secao F4 renderiza, entao ambas as datas aparecem formatadas na mesma linha.
- [ ] Dado apenas check-in preenchido, quando a secao F4 renderiza, entao aparece "Check-in: [data] • Check-out: —".

---

### F4-07: Hospedagens Adicionais

| Atributo | Valor |
|---|---|
| **Dado** | Numero de hospedagens cadastradas alem da principal |
| **Fonte** | `COUNT(accommodation WHERE tripId = ?) - 1` |
| **Formato** | `text` — ex: "+2 hospedagens adicionais" + link "Ver todas" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando ha apenas 1 hospedagem |

**Criterio de aceite**:
- [ ] Dado 2 ou mais hospedagens, quando a secao F4 renderiza, entao aparece contagem de hospedagens adicionais com link para Phase 4.

---

### F4-08: Mobilidade Local — Opcoes Selecionadas

| Atributo | Valor |
|---|---|
| **Dado** | Meios de transporte local selecionados |
| **Fonte** | `trips.localMobility` (array de strings) |
| **Formato** | `list` de `AtlasChip` — ex: "Metro", "Bicicleta", "Taxi/Rideshare" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | "Nao definida" quando o array e vazio |

**Criterio de aceite**:
- [ ] Dado `localMobility` com valores, quando a secao F4 renderiza, entao cada opcao aparece como `AtlasChip`.
- [ ] Dado `localMobility` vazio, quando a secao F4 renderiza, entao aparece "Nao definida" com link para Phase 4.

---

### F4-09: Status de Conclusao por Sub-etapa

| Atributo | Valor |
|---|---|
| **Dado** | Status de cada sub-etapa da logistica |
| **Fonte** | Calculado: `hasTransport`, `hasAccommodation`, `hasMobility` a partir dos dados acima |
| **Formato** | `list` — 3 linhas com icone check (verde) ou pendente (cinza): "Transporte", "Hospedagem", "Mobilidade Local" |
| **Prioridade** | `must-show` dentro da secao F4 (se F4 existir) |
| **Estado vazio** | Todas as linhas com status pendente |

**Criterio de aceite**:
- [ ] Dado sub-etapa sem dados, quando a secao F4 renderiza, entao a linha aparece com icone de pendente e texto "Ainda nao decidi" em `atlas-on-surface-variant`.
- [ ] Dado sub-etapa com dados, quando a secao F4 renderiza, entao a linha aparece com icone de check em `atlas-tertiary` (#1c9a8e).

---

## 7. Fase 5 — Guia do Destino

Fonte de dados: `ExpeditionSummaryPhase5` — construido a partir de `destination_guides` onde `tripId = ?`.

Esta fase e `show-if-available` no nivel da secao.

---

### F5-01: Status de Geracao

| Atributo | Valor |
|---|---|
| **Dado** | Se o guia foi gerado ou nao |
| **Fonte** | `destination_guides.generatedAt` — null indica nao gerado |
| **Formato** | `badge` — "Guia Gerado em DD/MM/AAAA" ou "Guia nao gerado" |
| **Prioridade** | `must-show` dentro da secao F5 (se F5 existir) |
| **Estado vazio** | "Guia nao gerado" com CTA "Gerar Guia" que navega para Phase 5 |

**Criterio de aceite**:
- [ ] Dado `destination_guides` existente com `generatedAt`, quando a secao F5 renderiza, entao aparece "Guia gerado em [data]" como `AtlasBadge` com cor de sucesso.
- [ ] Dado `destination_guides` null (guia nunca gerado), quando a secao F5 renderiza, entao aparece "Guia nao gerado" com botao "Gerar Guia" que navega para Phase 5.

---

### F5-02: Informacoes-Chave do Destino

| Atributo | Valor |
|---|---|
| **Dado** | Dados de seguranca, custos e clima extraidos do guia |
| **Fonte** | `destination_guides.content` — campos `safety.level`, `quickFacts.currency.value`, `destination.name` (formato v2) ou `HIGHLIGHT_SECTION_KEYS` (formato v1) |
| **Formato** | `list` — maximo 3 items, ex: "Seguranca: Moderada", "Moeda: Euro (€)", "Fuso: GMT+0" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando o guia nao foi gerado |

**Criterio de aceite**:
- [ ] Dado guia v2 gerado, quando a secao F5 renderiza, entao aparecem ate 3 highlights extraidos dos campos `safety.level`, `quickFacts.currency.value` e `destination.name`.
- [ ] Dado guia v1 gerado, quando a secao F5 renderiza, entao aparecem ate 3 highlights extraidos das secoes identificadas por `HIGHLIGHT_SECTION_KEYS` (timezone, currency, language).
- [ ] Dado guia null, quando a secao F5 renderiza, entao o campo de informacoes-chave e omitido.

---

### F5-03: Nivel de Seguranca do Destino

| Atributo | Valor |
|---|---|
| **Dado** | Nivel de seguranca classificado pela IA |
| **Fonte** | `destination_guides.content.safety.level` — valores: "safe", "moderate", "caution" |
| **Formato** | `badge` — "Seguro" (verde), "Moderado" (amarelo), "Cuidado" (vermelho) |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado `safety.level = "safe"`, quando a secao F5 renderiza, entao aparece `AtlasBadge` verde com label "Seguro".
- [ ] Dado `safety.level = "moderate"`, quando a secao F5 renderiza, entao aparece `AtlasBadge` amarelo com label "Moderado".
- [ ] Dado `safety.level = "caution"`, quando a secao F5 renderiza, entao aparece `AtlasBadge` vermelho com label "Atencao".
- [ ] Dado `safety.level` null ou campo inexistente no JSON, quando a secao F5 renderiza, entao o campo de seguranca e omitido.

---

### F5-04: Atracoes em Destaque

| Atributo | Valor |
|---|---|
| **Dado** | Lista de atracoes recomendadas pelo guia |
| **Fonte** | `destination_guides.content.mustSee.items` ou equivalente — maximo 3 itens exibidos no sumario |
| **Formato** | `list` de texto — ex: "Torre de Belem", "Museu do Azulejo", "Bairro de Alfama" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado campo `mustSee.items` existente no guia com valores, quando a secao F5 renderiza, entao ate 3 atracoes aparecem como lista.
- [ ] Dado mais de 3 atracoes no guia, quando a secao F5 renderiza, entao apenas as primeiras 3 sao exibidas com link "Ver todas no Guia" para Phase 5.

> Nota PO: O campo exato para "atracoes em destaque" no schema do guia depende da implementacao atual. O QA deve inspecionar `destination_guides.content` para identificar o campo correto. Se o campo nao existir no schema v1/v2 atual, este item e omitido do sumario sem erro — e candidato para a proxima iteracao do prompt de geracao de guia.

---

## 8. Fase 6 — O Roteiro

Fonte de dados: `ExpeditionSummaryPhase6` — construido a partir de `itinerary_days` + `activities`.

Esta fase e `show-if-available` no nivel da secao.

---

### F6-01: Status de Geracao

| Atributo | Valor |
|---|---|
| **Dado** | Se o roteiro foi gerado ou nao |
| **Fonte** | `itinerary_days` — se `COUNT(*) WHERE tripId = ? = 0`, entao nao gerado |
| **Formato** | `badge` — "Roteiro Gerado" ou "Roteiro nao gerado" |
| **Prioridade** | `must-show` dentro da secao F6 (se F6 existir) |
| **Estado vazio** | "Roteiro nao gerado" com CTA "Gerar Roteiro" que navega para Phase 6 |

**Criterio de aceite**:
- [ ] Dado `itinerary_days.length > 0`, quando a secao F6 renderiza, entao aparece "Roteiro gerado" como `AtlasBadge` com cor de sucesso.
- [ ] Dado `itinerary_days.length === 0`, quando a secao F6 renderiza, entao aparece "Roteiro nao gerado" com botao "Gerar Roteiro".

---

### F6-02: Numero de Dias

| Atributo | Valor |
|---|---|
| **Dado** | Quantidade de dias no roteiro |
| **Fonte** | `ExpeditionSummaryPhase6.dayCount` = `COUNT(itinerary_days WHERE tripId = ?)` |
| **Formato** | `number` — "[N] dias de roteiro" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando roteiro nao foi gerado |

**Criterio de aceite**:
- [ ] Dado roteiro gerado com N dias, quando a secao F6 renderiza, entao aparece "[N] dias de roteiro".

---

### F6-03: Total de Atividades

| Atributo | Valor |
|---|---|
| **Dado** | Soma de todas as atividades em todos os dias |
| **Fonte** | `ExpeditionSummaryPhase6.totalActivities` = soma de `itinerary_days._count.activities` |
| **Formato** | `number` — "[N] atividades planejadas" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

**Criterio de aceite**:
- [ ] Dado roteiro com atividades, quando a secao F6 renderiza, entao o total aparece como "[N] atividades planejadas".
- [ ] Dado `totalActivities = 0` (dias sem atividades), quando a secao F6 renderiza, entao aparece "0 atividades planejadas" ou o campo e omitido — decisao de UX.

---

### F6-04: Custo Total Estimado

| Atributo | Valor |
|---|---|
| **Dado** | Custo total estimado do roteiro |
| **Fonte** | Campo nao existe no schema atual — `Activity` nao tem campo de custo; `ItineraryPlan` nao tem campo de custo agregado |
| **Formato** | `currency` — "Custo estimado: R$ X.XXX" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido |

> **Nota PO — campo nao implementado**: O custo total estimado do roteiro nao esta no schema atual. `Activity` e `ItineraryPlan` nao possuem campos de custo. Este item e registrado como **divida de produto** — nao deve ser exibido no sumario ate que o schema seja estendido e aprovado. O dev-fullstack-2 deve omitir este campo no Sprint 40 e registrar `TODO: SPEC-SUMARIO-CONTEUDO F6-04 — campo de custo de atividade nao implementado` no codigo.

**Criterio de aceite**:
- [ ] Dado Sprint 40, quando a secao F6 renderiza, entao o campo de custo total estimado e completamente omitido.
- [ ] Dado que o campo `estimatedCost` for adicionado ao schema em sprint futuro, entao este AC deve ser revisado antes da implementacao.

---

### F6-05: Destaques por Dia

| Atributo | Valor |
|---|---|
| **Dado** | Primeira atividade de cada dia (titulo) como preview |
| **Fonte** | `itinerary_days` ordenados por `dayNumber ASC`, para cada dia: primeira `Activity` ordenada por `orderIndex ASC`, campo `activities.title` |
| **Formato** | `list` — maximo 3 dias exibidos: "Dia 1: [titulo da primeira atividade]" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando roteiro nao foi gerado |

**Criterio de aceite**:
- [ ] Dado roteiro com 3 ou mais dias, quando a secao F6 renderiza, entao os primeiros 3 dias aparecem com o titulo da primeira atividade de cada dia.
- [ ] Dado roteiro com menos de 3 dias, quando a secao F6 renderiza, entao todos os dias disponiveis sao exibidos.
- [ ] Dado dia sem atividades, quando a secao F6 renderiza, entao esse dia e omitido da lista de destaques.
- [ ] Dado roteiro com mais de 3 dias, quando a secao F6 renderiza, entao aparece link "Ver roteiro completo" que navega para Phase 6.

---

## 9. Gamificacao — Pontos e Badges

Esta secao aparece ao final do sumario, apos todas as secoes de fase. Ela celebra o progresso do viajante e reforça o valor da conclusao da expedicao.

Fonte de dados: `UserProgress` + `UserBadge` + `ExpeditionPhase` (para PA ganhos por expedicao).

---

### GAMI-01: Pontos Atlas (PA) Ganhos nesta Expedicao

| Atributo | Valor |
|---|---|
| **Dado** | Total de PA ganhos especificamente nesta expedicao |
| **Fonte** | `expedition_phases.pointsEarned` — soma de todos os registros onde `tripId = ?` e `status = "completed"` |
| **Formato** | `number` — "[N] PA ganhos nesta expedicao" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | "0 PA ganhos — complete as fases para ganhar pontos" |

**Criterio de aceite**:
- [ ] Dado fases com `pointsEarned > 0`, quando a secao de gamificacao renderiza, entao aparece a soma total com label "[N] PA ganhos nesta expedicao".
- [ ] Dado nenhuma fase concluida, quando a secao de gamificacao renderiza, entao aparece "0 PA" com mensagem encorajadora.

---

### GAMI-02: Saldo Atual de PA

| Atributo | Valor |
|---|---|
| **Dado** | Saldo disponivel atual do usuario |
| **Fonte** | `user_progress.availablePoints` |
| **Formato** | `number` — "Saldo atual: [N] PA" |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | "0 PA disponivel" |

**Criterio de aceite**:
- [ ] Dado `user_progress.availablePoints` qualquer valor, quando a secao de gamificacao renderiza, entao o saldo atual aparece como informacao secundaria abaixo do PA ganho nesta expedicao.

---

### GAMI-03: Rank Atual

| Atributo | Valor |
|---|---|
| **Dado** | Rank atual do usuario |
| **Fonte** | `user_progress.currentRank` — valores: "novato", "desbravador", "navegador", "capitao", "aventureiro", "lendario" |
| **Formato** | `badge` — label traduzido com cor de rank |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando `user_progress` nao existe |

**Criterio de aceite**:
- [ ] Dado `user_progress.currentRank` preenchido, quando a secao de gamificacao renderiza, entao o rank aparece como `AtlasBadge` com label localizado.

---

### GAMI-04: Badges Conquistados Durante o Planejamento

| Atributo | Valor |
|---|---|
| **Dado** | Badges ganhos em conexao com esta expedicao especifica |
| **Fonte** | `user_badges` — sem correlacao direta com `tripId` no schema atual. Exibir apenas badges conquistados recentemente (ultimos 30 dias) como proxy |
| **Formato** | `list` de badges — icone + nome do badge |
| **Prioridade** | `show-if-available` |
| **Estado vazio** | Campo omitido quando nenhum badge recente existe |

**Criterio de aceite**:
- [ ] Dado `user_badges` com registros onde `earnedAt >= NOW() - 30 dias`, quando a secao de gamificacao renderiza, entao ate 3 badges aparecem com icone e nome.
- [ ] Dado mais de 3 badges recentes, quando a secao de gamificacao renderiza, entao os 3 mais recentes sao exibidos com link "Ver todos os badges".
- [ ] Dado nenhum badge recente, quando a secao de gamificacao renderiza, entao o campo e omitido.

> Nota PO: A correlacao de badges com uma expedicao especifica requer `tripId` em `UserBadge`, que nao existe no schema atual. O proxy de "30 dias" e uma solucao temporaria. A extensao do schema para correlacionar badges a trips e registrada como divida tecnica de produto — escalar ao architect para Sprint 41+.

---

### GAMI-05: Fases Concluidas

| Atributo | Valor |
|---|---|
| **Dado** | Quantas das 6 fases ativas foram concluidas |
| **Fonte** | `expedition_phases` onde `tripId = ?` e `status = "completed"` — contar registros |
| **Formato** | `progress` — "[N] de 6 fases concluidas" |
| **Prioridade** | `must-show` na secao de gamificacao |
| **Estado vazio** | "0 de 6 fases concluidas" |

**Criterio de aceite**:
- [ ] Dado fases concluidas, quando a secao de gamificacao renderiza, entao aparece "[N] de 6 fases concluidas" com mini barra de progresso.
- [ ] Dado todas as 6 fases concluidas, quando a secao de gamificacao renderiza, entao aparece mensagem de celebracao "Expedicao Completa!" com animacao discreta (respeitando `prefers-reduced-motion`).

---

## 10. Acoes — CTA e Navegacao

Esta secao descreve os botoes de acao disponiveis no sumario. As acoes aparecem em uma barra fixa no rodape (consistente com o WizardFooter padrao) ou como secao dedicada ao final do sumario.

---

### ACTION-01: Exportar PDF

| Atributo | Valor |
|---|---|
| **Acao** | Gerar e baixar o sumario em formato PDF |
| **Status** | Futuro — SPEC-PROD-014 (deferred Sprint 29) |
| **Visibilidade** | `show-if-available` — exibir como botao desabilitado com label "Em breve" ou omitir completamente |
| **Prioridade do botao** | Secundaria (outline) |

**Criterio de aceite**:
- [ ] Dado Sprint 40, quando a secao de acoes renderiza, entao o botao "Exportar PDF" esta desabilitado com tooltip "Em breve" ou e completamente omitido — decisao de UX Designer.
- [ ] Dado botao desabilitado exibido, quando usuario tenta clicar, entao nenhuma acao e executada e o tooltip "Em breve" e visivel por 2 segundos.

---

### ACTION-02: Compartilhar Expedicao

| Atributo | Valor |
|---|---|
| **Acao** | Gerar link compartilhavel para o sumario |
| **Status** | Futuro — SPEC-PROD-014 (deferred Sprint 29) |
| **Visibilidade** | Idem ACTION-01 |
| **Prioridade do botao** | Secundaria (outline) |

**Criterio de aceite**:
- [ ] Idem ACTION-01 para a acao de compartilhamento.

---

### ACTION-03: Editar Fase Especifica

| Atributo | Valor |
|---|---|
| **Acao** | Navegar de volta para uma fase especifica para editar |
| **Status** | Ativo — implementado como link "Editar" em cada secao de fase |
| **Visibilidade** | `must-show` — cada secao de fase deve ter seu proprio link de edicao |
| **Prioridade do botao** | Terciaria (text link) — label "Editar" |

**Rotas de edicao por fase**:
| Fase | Rota |
|---|---|
| Fase 1 | `/expedition/[tripId]/phase/1` |
| Fase 2 | `/expedition/[tripId]/phase/2` |
| Fase 3 | `/expedition/[tripId]/phase/3` |
| Fase 4 | `/expedition/[tripId]/phase/4` |
| Fase 5 | `/expedition/[tripId]/phase/5` |
| Fase 6 | `/expedition/[tripId]/phase/6` |

**Criterio de aceite**:
- [ ] Dado qualquer secao de fase no sumario, quando o usuario clica em "Editar", entao navega para a rota correspondente da fase correta para o `tripId` atual.
- [ ] Dado usuario que navega de volta ao sumario apos editar, quando o sumario recarrega, entao os dados refletem as alteracoes feitas na fase.

---

### ACTION-04: Voltar ao Dashboard

| Atributo | Valor |
|---|---|
| **Acao** | Navegar para o dashboard "Meu Atlas" |
| **Status** | Ativo |
| **Visibilidade** | `must-show` — botao primario no footer do sumario |
| **Prioridade do botao** | Primaria (filled) — usando `atlas-secondary-container` com texto `atlas-primary` |

**Criterio de aceite**:
- [ ] Dado qualquer estado do sumario, quando o usuario clica em "Voltar ao Dashboard", entao navega para `/dashboard` ou `/expeditions` (rota atual pos-Sprint 29).
- [ ] Dado Design V2 ativo, quando o botao renderiza, entao usa `AtlasButton` variant "primary" com as cores corretas de token.

---

## 11. Regras Gerais de Exibicao

### 11.1 Ordem das Secoes

A ordem de exibicao das secoes no sumario e fixa:

1. Hero Bar
2. Fase 1 — O Chamado
3. Fase 2 — O Explorador
4. Fase 3 — O Preparo
5. Fase 4 — A Logistica
6. Fase 5 — Guia do Destino
7. Fase 6 — O Roteiro
8. Gamificacao
9. Acoes (footer)

### 11.2 Comportamento de Fases Nao Iniciadas

Quando uma fase nunca foi acessada e seus dados nao existem no banco:
- A secao e exibida com estado "Nao iniciada"
- Aparece um CTA "Iniciar [nome da fase]" que navega para a fase correspondente
- A secao NAO e ocultada — o sumario sempre mostra todas as 6 fases, mesmo que incompletas

### 11.3 Seguranca e BOLA

Todos os dados exibidos no sumario devem ser obtidos usando o `userId` da sessao autenticada como filtro primario. O `tripId` da URL nunca e usado como unico identificador de permissao. Esta regra e implementada pelo `ExpeditionSummaryService.getExpeditionSummary(tripId, userId)` existente.

### 11.4 Dados Sensiveis

Os seguintes campos nunca devem aparecer no sumario:
- `bookingCodeEnc` (sempre mascarado como `BOOK-****-XXX`)
- `passportNumberEnc` (nunca exibido, nem mascarado)
- `nationalIdEnc` (nunca exibido, nem mascarado)
- `passwordHash` (nunca exibido)
- Data de nascimento exata (apenas faixa etaria via `deriveAgeRange()`)

### 11.5 Localizacao

Todos os labels, datas, moedas e enums traduzidos devem respeitar o `preferredLocale` do usuario (`User.preferredLocale`: "pt-BR" ou "en"). Nenhum valor hard-coded em ingles ou portugues deve aparecer no codigo de renderizacao.

### 11.6 Performance

O sumario agrega dados de 6 fases em uma unica view. O `ExpeditionSummaryService` ja usa `Promise.all()` para paralelizar as queries. Nenhum componente de UI do sumario deve realizar queries de banco individualmente — todos os dados devem vir do servico centralizado.

---

## 12. Mapa de Fontes de Dados — Resumo

| Item | Tabela | Campo(s) |
|---|---|---|
| Nome da expedicao | `trips` | `title` |
| Destino | `trips` | `destination` |
| Origem | `trips` | `origin` |
| Datas | `trips` | `startDate`, `endDate` |
| Passageiros | `trips` | `passengers` (JSON) |
| Tipo de viagem | `trips` | `tripType` |
| Mobilidade local | `trips` | `localMobility` (Array) |
| Tipo de viajante | `expedition_phases` | `metadata.travelerType` (Phase 2) |
| Estilo de hospedagem | `expedition_phases` | `metadata.accommodationStyle` (Phase 2) |
| Orcamento | `expedition_phases` | `metadata.budget`, `metadata.budgetRange`, `metadata.currency` (Phase 2) |
| Datas flexiveis | `expedition_phases` | `metadata.flexibleDates` (Phase 1) |
| PA ganhos por fase | `expedition_phases` | `pointsEarned` |
| Fases concluidas | `expedition_phases` | `status = "completed"` |
| Checklist de documentos | `phase_checklist_items` | `phaseNumber=3`, `completed`, `required`, `itemKey` |
| Transporte | `transport_segments` | todos os campos |
| Hospedagem | `accommodation` | todos os campos |
| Guia do destino | `destination_guides` | `content` (JSON), `generatedAt` |
| Roteiro — dias | `itinerary_days` | `dayNumber`, `date` |
| Roteiro — atividades | `activities` | `title`, `startTime`, `orderIndex` |
| Preferencias do usuario | `user_profiles` | `preferences` (JSON) |
| Saldo PA | `user_progress` | `availablePoints`, `totalPoints`, `currentRank` |
| Badges | `user_badges` | `badgeKey`, `earnedAt` |

---

## 13. Dividas de Produto Identificadas

As seguintes lacunas foram identificadas durante a elaboracao desta spec e requerem decisao em sprint futuro:

| ID | Descricao | Impacto | Sprint sugerido |
|---|---|---|---|
| DEBT-SUMARIO-01 | Campo `estimatedCost` nao existe em `Activity` ou `ItineraryPlan` — impossivel exibir custo total do roteiro (F6-04) | Medio — feature de alto valor para o viajante | Sprint 42+ |
| DEBT-SUMARIO-02 | `UserBadge` nao tem `tripId` — impossivel correlacionar badges a uma expedicao especifica (GAMI-04) | Baixo — proxy de 30 dias e aceitavel no curto prazo | Sprint 41 |
| DEBT-SUMARIO-03 | Campo `fitness_level` nao existe em `UserProfile` ou `preferences` — F2-08 usa `accessibility` como proxy | Baixo — proxy e funcional | Sprint 42+ |
| DEBT-SUMARIO-04 | `mustSee.items` (atracoes em destaque) pode nao existir no schema do guia v1/v2 — F5-04 depende de confirmacao | Medio — atracoes sao informacao critica para o viajante | Verificar no Sprint 40 antes de implementar |

---

## Change History

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0.0 | 2026-03-27 | product-owner | Versao inicial — especificacao completa de conteudo do Sumario da Expedicao para Sprint 40 |
