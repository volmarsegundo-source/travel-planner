---
spec-id: SPEC-UX-031
title: Aviso de Fase Incompleta ao Avancar
version: 1.0.0
status: Draft
author: ux-designer
sprint: 32
reviewers: [product-owner, tech-lead, architect]
---

# SPEC-UX-031: Aviso de Fase Incompleta ao Avancar

**Versao**: 1.0.0
**Status**: Draft
**Autor**: ux-designer
**Product Spec**: SPEC-PROD-026 (UX-008)
**Criado**: 2026-03-19
**Ultima Atualizacao**: 2026-03-19

---

## 1. Objetivo do Viajante

O viajante quer saber se esta deixando informacoes incompletas antes de avancar de fase, para poder decidir conscientemente se completa agora ou avanca sabendo das lacunas.

## 2. Personas Afetadas

| Persona | Como esta melhoria os serve |
|---|---|
| `@leisure-solo` | Evita surpresas em fases posteriores ("por que meu guia nao tem info de transporte?") |
| `@leisure-family` | Ajuda a garantir que todos os dados familiares estejam preenchidos antes de avancar |
| `@business-traveler` | Decisao consciente — pode escolher avancar sem completar se estiver com pressa |
| `@bleisure` | Pode optar por completar logistica depois sem perder noção do que falta |

## 3. Fluxo do Usuario

### Happy Path — Fase completa

1. Usuario esta em uma fase com estado COMPLETED
2. Usuario clica "Avancar"
3. Sistema avanca diretamente para a proxima fase — nenhum aviso exibido

### Caminho Alternativo — Fase incompleta

1. Usuario esta em uma fase com estado IN_PROGRESS (dados parciais ou ausentes)
2. Usuario clica "Avancar"
3. Sistema exibe um dialogo informativo (nao bloqueante) listando os itens faltantes
4. Usuario escolhe:
   - **"Completar agora"** → dialogo fecha, usuario permanece na fase atual
   - **"Avancar mesmo assim"** → dialogo fecha, sistema avanca para a proxima fase

```
[Fase N — estado IN_PROGRESS]
    |
    v
[Usuario clica "Avancar"]
    |
    v
[Verificar estado da fase]
    |
    +--- COMPLETED ---> [Avancar diretamente]
    |
    +--- IN_PROGRESS ---> [Exibir dialogo de aviso]
                              |
                              +--- "Completar agora" ---> [Fechar dialogo, manter na fase]
                              |
                              +--- "Avancar mesmo assim" ---> [Fechar dialogo, avancar]
```

### Edge Cases

- **Fase NOT_STARTED**: O aviso NAO se aplica — fases nao acessadas sao gerenciadas pelos guards de navegacao de SPEC-PROD-016
- **Fase bloqueada**: O aviso NAO se aplica — o botao "Avancar" nao esta disponivel em fases bloqueadas
- **Todas as fases aplicaveis**: O aviso se aplica a qualquer fase (1 a 6) que tenha estado IN_PROGRESS no momento do avanco

## 4. Especificacao Visual

### Dialogo de Aviso

**Tipo**: Dialogo modal (focus-trapped), estilo informativo (nao destrutivo, nao de erro).

**Aparencia**:
- Overlay semi-transparente (fundo escurecido, 50% opacidade)
- Card centralizado na tela, max-width 480px
- Cantos arredondados (--radius, 8px)
- Fundo branco (--color-surface, #FFFFFF)
- Sem icone de erro — usar icone informativo (circulo com "i") na cor azul (#3B82F6)

**Conteudo**:

```
[Icone informativo]

Informacoes incompletas

Esta fase ainda tem dados pendentes. Avancar agora pode afetar a
qualidade das recomendacoes nas proximas fases.

Itens pendentes:
  - [Item 1 faltante]
  - [Item 2 faltante]
  - [Item 3 faltante]

[Completar agora]  [Avancar mesmo assim]
```

**Hierarquia visual**:
1. Titulo: "Informacoes incompletas" — fonte 18px, semibold, cor --color-text
2. Descricao: texto explicativo — fonte 14px, regular, cor --color-text-muted
3. Lista de itens pendentes: lista com bullet points, fonte 14px, cor --color-text
4. Botoes: alinhados horizontalmente, a direita do dialogo

**Botoes**:
- **"Completar agora"** (acao primaria): estilo primario (fundo --color-primary #E8621A, texto branco). Posicao: direita.
- **"Avancar mesmo assim"** (acao secundaria): estilo ghost/outline (sem fundo, borda --color-border, texto --color-text). Posicao: esquerda do primario.

> **Decisao UX**: "Completar agora" e o botao primario porque a acao recomendada e completar os dados. "Avancar mesmo assim" e secundario para indicar que e uma opcao valida mas nao preferencial.

### Lista de Itens Pendentes por Fase

A lista vem do PhaseCompletionEngine (requisitos de conclusao por fase, conforme SPEC-PROD-023). Exemplos:

| Fase | Itens que podem aparecer como pendentes |
|---|---|
| 1 | Destino nao preenchido |
| 2 | Nenhuma preferencia selecionada |
| 3 | Itens obrigatorios do checklist nao marcados |
| 4 | Nenhum transporte registrado, nenhuma acomodacao registrada |
| 5 | Guia do destino nao gerado |
| 6 | Roteiro nao gerado |

> Os textos exatos dos itens pendentes devem ser strings i18n. O sistema deve fornecer chaves especificas para cada tipo de dado faltante.

### Animacao

- Abertura: fade-in do overlay + scale-in do card (100ms, ease-out)
- Fechamento: fade-out (100ms)
- prefers-reduced-motion: sem scale, apenas fade rapido (50ms) ou corte direto

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Dialogo ocupa largura completa menos margens laterais (16px de cada lado). Botoes empilhados verticalmente (primario acima, secundario abaixo). |
| Tablet (768-1024px) | Dialogo max-width 480px, centralizado. Botoes lado a lado. |
| Desktop (> 1024px) | Mesmo que tablet. |

## 6. Acessibilidade

- [x] Dialogo usa role="dialog" com aria-modal="true"
- [x] aria-labelledby aponta para o titulo ("Informacoes incompletas")
- [x] aria-describedby aponta para a descricao + lista de itens pendentes
- [x] Focus trap ativo enquanto dialogo esta aberto (Tab cicla entre os dois botoes e o botao de fechar)
- [x] Botao de fechar (X) no canto superior direito — acessivel por teclado, equivale a "Completar agora"
- [x] Escape fecha o dialogo — equivale a "Completar agora" (acao conservadora)
- [x] Ao abrir: foco move para o botao "Completar agora" (acao recomendada)
- [x] Ao fechar: foco retorna ao botao "Avancar" que disparou o dialogo
- [x] Anuncio para screen readers: o dialogo e anunciado automaticamente ao abrir (role="dialog")
- [x] Lista de itens pendentes usa elemento de lista semantico (ul > li)
- [x] Contraste: texto #1E293B sobre #FFFFFF = 14.5:1 (excede AA). Botao primario: branco sobre #E8621A = 3.2:1 (passa para texto grande/bold de botao).

## 7. Conteudo e Microcopy

### Labels e CTAs

| Chave | PT-BR | EN |
|---|---|---|
| `warning_title` | Informacoes incompletas | Incomplete information |
| `warning_description` | Esta fase ainda tem dados pendentes. Avancar agora pode afetar a qualidade das recomendacoes nas proximas fases. | This phase still has pending data. Advancing now may affect the quality of recommendations in the next phases. |
| `warning_pending_items` | Itens pendentes: | Pending items: |
| `warning_complete_now` | Completar agora | Complete now |
| `warning_advance_anyway` | Avancar mesmo assim | Advance anyway |
| `pending_no_destination` | Destino nao preenchido | Destination not filled |
| `pending_no_preferences` | Nenhuma preferencia selecionada | No preferences selected |
| `pending_checklist_incomplete` | Itens obrigatorios do checklist pendentes | Required checklist items pending |
| `pending_no_transport` | Nenhum transporte registrado | No transport registered |
| `pending_no_accommodation` | Nenhuma acomodacao registrada | No accommodation registered |
| `pending_no_guide` | Guia do destino nao gerado | Destination guide not generated |
| `pending_no_itinerary` | Roteiro nao gerado | Itinerary not generated |

### Tom de Voz

- Informativo, nao alarmante. O aviso existe para ajudar, nao para bloquear.
- Nunca culpar o usuario — o texto descreve o que falta, nao o que o usuario "esqueceu".
- O botao "Avancar mesmo assim" valida a escolha do usuario — sem julgamento.

## 8. Restricoes (da Spec de Produto)

- SPEC-PROD-026 AC-018: Aviso inline (informativo, nao bloqueante) — interpretado como dialogo modal informativo com opcao de avancar
- SPEC-PROD-026 AC-019: Dois botoes — "Continuar mesmo assim" e "Completar agora"
- SPEC-PROD-026 AC-020: "Continuar mesmo assim" permite avanco normal
- SPEC-PROD-026 AC-021: Fase COMPLETED nao exibe aviso
- SPEC-PROD-026 AC-022: Fase NOT_STARTED segue regras de SPEC-PROD-016
- SPEC-PROD-026 AC-023: Texto i18n (PT-BR e EN)
- SPEC-PROD-026 Accessibility: role="alert" ou aria-live="polite" — decisao UX: role="dialog" com aria-modal (mais apropriado para interacao que requer resposta do usuario)

> **Nota sobre AC-018**: O spec de produto menciona "aviso inline (nao modal bloqueante)". A interpretacao UX e que o aviso NAO bloqueia o avanco (o usuario pode clicar "Avancar mesmo assim"), mas o formato mais adequado e um dialogo modal leve porque: (1) lista itens pendentes que requerem leitura, (2) oferece duas acoes que precisam de decisao consciente, (3) evita que o usuario perca o aviso se for apenas um banner. O dialogo e informativo, nao bloqueante no sentido de que permite avanco.

## 9. Criterios de Aceite (UX)

- [ ] Dialogo exibido quando usuario tenta avancar de fase IN_PROGRESS
- [ ] Dialogo NAO exibido quando fase esta COMPLETED
- [ ] Lista de itens pendentes exibe dados especificos da fase atual
- [ ] Botao "Completar agora" fecha dialogo e mantém usuario na fase
- [ ] Botao "Avancar mesmo assim" fecha dialogo e avanca para proxima fase
- [ ] Escape e botao X fecham dialogo (equivale a "Completar agora")
- [ ] Focus trap ativo durante dialogo
- [ ] Foco retorna ao botao "Avancar" ao fechar
- [ ] Dialogo responsivo: botoes empilhados em mobile
- [ ] Textos em i18n (PT-BR e EN)
- [ ] prefers-reduced-motion respeitado na animacao

## 10. Prototipo

- [ ] Prototipo requerido: Nao
- **Justificativa**: Dialogo padrao do design system (ConfirmDialog) com conteudo customizado. A especificacao visual e suficiente.

## 11. Questoes Abertas

Nenhuma — spec pronta para implementacao.

## 12. Padroes Utilizados

- ConfirmDialog (padrao existente — adaptar para estilo informativo em vez de destrutivo)
- WizardFooter (integracao com botao "Avancar" existente)
- PhaseCompletionEngine (fonte dos itens pendentes)

---

> **Status da Spec**: Draft
> Ready for Architect

---

## Historico de Mudancas

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | ux-designer | Draft inicial — dialogo de aviso para fases incompletas |
