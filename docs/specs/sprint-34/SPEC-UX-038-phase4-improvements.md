# SPEC-UX-038: Phase 4 Improvements — Ida/Volta, "Ainda nao decidi", Obrigatoriedade

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-031
**Architecture Spec**: SPEC-ARCH-026
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Contexto e Objetivo

A Fase 4 (A Logistica) coleta transporte, hospedagem e mobilidade local. Tres melhorias UX sao necessarias: (1) toggle Ida/Ida e Volta no transporte para simplificar preenchimento, (2) checkbox "Ainda nao decidi" em cada passo para desbloqueio de avanco sem dados, e (3) asteriscos de obrigatoriedade + estados de erro claros.

## 2. Ida / Ida e Volta — Transport Step

### Radio Toggle

Posicionado no topo do formulario de transporte, acima da lista de segmentos:

```
+-------------------------------------------+
|  Tipo de viagem:                          |
|  ( ) Somente Ida    (o) Ida e Volta       |
+-------------------------------------------+
```

- **Radio group** com 2 opcoes: "Somente Ida" / "Ida e Volta"
- Default: "Somente Ida" (nenhum segmento de retorno pre-configurado)
- Quando "Ida e Volta" e selecionado:
  - Se nao existe segmento de retorno, cria automaticamente um segmento com `isReturn: true`
  - O segmento de retorno pre-preenche: `departurePlace = arrivalPlace do primeiro segmento`, `arrivalPlace = departurePlace do primeiro segmento`
  - Campos de data do retorno ficam vazios para preenchimento manual
- Quando usuario muda de "Ida e Volta" para "Somente Ida":
  - Remove todos os segmentos com `isReturn: true`
  - Animacao suave de collapse (300ms ease-out)

### Animacao Show/Hide

- Campo de data de retorno (e segmento de retorno) aparece com `transition: max-height 300ms ease-out, opacity 200ms ease-in`
- `prefers-reduced-motion: reduce`: sem animacao, show/hide instantaneo

## 3. "Ainda nao decidi" Checkbox

### Posicionamento

Cada passo (Transport, Accommodation, Mobility) exibe um checkbox proeminente no topo, antes do formulario:

```
+-----------------------------------------------+
| [x] Ainda nao decidi                          |
|     Posso preencher depois. Os campos abaixo  |
|     serao opcionais.                           |
+-----------------------------------------------+
| (formulario com opacity 50% quando marcado)   |
+-----------------------------------------------+
```

### Comportamento Visual

| Estado | Formulario | Validacao |
|---|---|---|
| Checkbox desmarcado | Opacity 100%, campos editaveis | Campos obrigatorios ativos |
| Checkbox marcado | Opacity 50%, campos editaveis mas nao obrigatorios | Todos os campos opcionais |

- Quando "Ainda nao decidi" e marcado:
  - Formulario recebe `opacity: 0.5` com `transition: opacity 200ms`
  - Campos permanecem editaveis (usuario pode preencher parcialmente)
  - Asteriscos de obrigatoriedade desaparecem
  - Validacao de campos obrigatorios e desativada para aquele passo
  - Avanco para proximo passo/fase e permitido

- Quando "Ainda nao decidi" e desmarcado:
  - Formulario retorna a `opacity: 1.0`
  - Asteriscos reaparecem
  - Validacao de obrigatoriedade reativada

### Estilo do Checkbox

- Checkbox grande (h-5 w-5) com `accent-atlas-gold`
- Label em `text-sm font-medium text-foreground`
- Sublabel em `text-xs text-muted-foreground`
- Container: `rounded-lg border-2 border-atlas-gold/30 bg-atlas-gold/5 p-4`
- Quando marcado: `border-atlas-gold bg-atlas-gold/10`

## 4. Asteriscos de Obrigatoriedade

### Labels Obrigatorios

Campos obrigatorios recebem asterisco vermelho apos o texto do label:

```
Tipo de Transporte *
Local de Partida *
Local de Chegada *
Data de Partida *
Data de Chegada *
```

- Asterisco: `<span class="text-destructive ml-0.5" aria-hidden="true">*</span>`
- Acessibilidade: `aria-required="true"` no input correspondente
- Legenda no topo da secao: `<p class="text-xs text-muted-foreground">* Campos obrigatorios</p>`

### Campos Obrigatorios por Step

| Step | Campos Obrigatorios |
|---|---|
| Transport | transportType, departurePlace, arrivalPlace, departureAt, arrivalAt |
| Accommodation | accommodationType, checkIn, checkOut |
| Mobility | Pelo menos 1 opcao selecionada |

## 5. Estados de Erro

### Inline Errors

Quando o usuario tenta avancar sem preencher campo obrigatorio:

```
+-----------------------------------+
| Local de Partida *                |
| [                              ]  |
| ! Este campo e obrigatorio        |
+-----------------------------------+
```

- Texto de erro: `text-sm text-destructive mt-1`
- Borda do input: `border-destructive`
- Icone de exclamacao antes do texto (opcional)

### Banner de Validacao

Se multiplos campos estao incompletos, banner no topo:

```
+--------------------------------------------------+
| ! Preencha os campos obrigatorios para avancar   |
|   - Local de partida                             |
|   - Data de chegada                              |
+--------------------------------------------------+
```

- Estilo: `border-atlas-rust/30 bg-atlas-rust/5 text-foreground`
- `role="alert"` para screen readers
- Lista os campos faltantes como bullet points

## 6. Responsividade

| Breakpoint | Ida/Volta toggle | "Ainda nao decidi" | Formulario |
|---|---|---|---|
| < 640px | Radio buttons empilhados verticalmente | Full-width container | Campos em coluna unica |
| >= 640px | Radio buttons inline | Full-width container | Grid 2 colunas |

## 7. Acessibilidade

- Radio group para Ida/Volta com `role="radiogroup"` e `aria-label`
- Checkbox "Ainda nao decidi" com `aria-expanded` controlando a visibilidade semantica do formulario
- `aria-required="true"` em todos os campos obrigatorios
- `aria-invalid="true"` + `aria-describedby` apontando para mensagem de erro
- `prefers-reduced-motion: reduce` desativa todas as transicoes de opacity e max-height

## 8. Criterios de Aceitacao

- [ ] **AC-038-01**: Radio toggle "Somente Ida" / "Ida e Volta" aparece no topo do TransportStep
- [ ] **AC-038-02**: Selecionar "Ida e Volta" cria automaticamente segmento de retorno com lugares invertidos
- [ ] **AC-038-03**: Mudar para "Somente Ida" remove segmentos de retorno com animacao suave
- [ ] **AC-038-04**: Checkbox "Ainda nao decidi" aparece no topo de cada step (Transport, Accommodation, Mobility)
- [ ] **AC-038-05**: Marcar "Ainda nao decidi" reduz opacidade do formulario para 50%
- [ ] **AC-038-06**: Com "Ainda nao decidi" marcado, avanco para proximo passo e permitido sem dados obrigatorios
- [ ] **AC-038-07**: Desmarcar "Ainda nao decidi" restaura opacidade 100% e reativa validacao
- [ ] **AC-038-08**: Campos obrigatorios exibem asterisco vermelho no label
- [ ] **AC-038-09**: Tentar avancar sem campos obrigatorios preenchidos exibe erros inline e banner
- [ ] **AC-038-10**: `aria-required`, `aria-invalid` e `aria-describedby` presentes nos campos obrigatorios

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
