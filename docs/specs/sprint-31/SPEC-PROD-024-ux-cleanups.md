---
spec-id: SPEC-PROD-024
title: UX Cleanups — Profile Navigation, Badge Display, Date Validation & Expedition Completion
version: 1.0.0
status: Draft
author: product-owner
sprint: 31
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-024: UX Cleanups — Profile Navigation, Badge Display, Date Validation & Expedition Completion

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 31
**Relacionado a**: SPEC-PROD-023 (conclusao automatica de expedicao — substitui botao "Completar Expedicao")
**Requisitos de negocio cobertos**: REQ-002, REQ-003, REQ-005, REQ-006

---

## Contexto: Por que Este Documento Existe

Quatro problemas de UX foram identificados em testes de beta que nao justificam specs individuais por serem de escopo pequeno, mas que juntos criam friccao suficiente para degradar a experiencia de primeiros usuarios. Este spec consolida os 4 itens para uma unica entrega coesa.

Os itens sao intencionalmente independentes entre si — podem ser implementados em qualquer ordem e por desenvolvedores diferentes. A unica dependencia cruzada e entre REQ-006 e SPEC-PROD-023 (conclusao automatica de expedicao).

---

## User Story (composta)

As a @leisure-solo or @leisure-family,
I want the navigation structure to be intuitive, badges to be decorative (not confusing links), dates to be validated clearly before I submit, and expedition completion to happen automatically,
so that I do not encounter dead-end links, confusing interactive elements, invalid trip data, or manual steps that the system could handle for me.

---

## REQ-002 — Mover link "Perfil" para dentro do account dropdown

### Contexto

Atualmente o link "Perfil" aparece como item de navegacao separado no header ou em local de destaque. Isso cria duas entradas de acesso ao perfil visualmente distantes do menu de conta, gerando confusao sobre onde gerenciar preferencias e dados pessoais.

### Requisito

O link de navegacao para `/profile` (ou equivalente) e movido para dentro do dropdown do menu de conta (o mesmo menu que contem "Configuracoes" e "Sair"). A posicao sugerida e o primeiro item do dropdown, acima de qualquer configuracao de conta.

O header nao exibe mais o link "Perfil" como item separado. O acesso ao perfil e exclusivamente pelo dropdown.

### Criterios de Aceite (REQ-002)

- **AC-001**: Dado o header em qualquer pagina autenticada, quando o usuario abre o dropdown de conta, entao "Perfil" aparece como o primeiro item do dropdown.
- **AC-002**: Dado o header, entao nenhum link "Perfil" existe fora do dropdown de conta.
- **AC-003**: Dado viewport de 375px (mobile), quando o usuario abre o menu de conta, entao o item "Perfil" e visivel e acessivel sem scroll adicional no menu.

---

## REQ-003 — Badge de gamificacao no header e apenas decorativa (sem link)

### Contexto

O badge/indicador de gamificacao no header (que exibe pontos, nivel ou rank) foi implementado como elemento clicavel que navega para /atlas ou /profile. Usuarios beta reportaram comportamento inesperado ao clicar — esperavam informacao visual mas receberam navegacao.

### Requisito

O badge de gamificacao no header (qualquer que seja o formato atual — pontos, nivel, icone de rank) e um elemento de exibicao puro. Nao e um link. Nao e clicavel. Nao tem cursor pointer. Nao possui `href` ou handler `onClick` de navegacao.

Se o elemento atual e implementado como `<Link>` ou `<a>`, deve ser convertido para `<span>` ou `<div>` semanticamente apropriado.

O badge pode ter tooltip com informacao adicional (ex: "Nivel: Explorador — 1.250 pontos") mas o tooltip nao e interativo.

### Criterios de Aceite (REQ-003)

- **AC-004**: Dado o badge de gamificacao no header, quando o usuario clica nele, entao nenhuma navegacao ocorre.
- **AC-005**: Dado o badge de gamificacao no header, entao `cursor: default` e aplicado (nenhum cursor pointer).
- **AC-006**: Dado um screen reader, entao o badge e anunciado como conteudo informativo (ex: "1.250 pontos, Nivel Explorador") sem indicacao de que e um link ou botao.
- **AC-007**: Dado o badge com tooltip, quando o usuario passa o cursor sobre ele (desktop) ou foca com teclado, entao o tooltip exibe informacao adicional mas nao contem elementos clicaveis.

---

## REQ-005 — Validacao de datas de viagem

### Contexto

As datas de inicio e fim da expedicao (Phase 1) atualmente aceitam qualquer valor que passe a validacao de formato. Usuarios tem criado expedicoes com datas no passado, datas iguais (viagem de 0 dias) e datas de hoje — todos casos invalidos que causam erros downstream na geracao de itinerario.

### Requisito

O sistema aplica as seguintes regras de validacao para os campos `startDate` e `endDate` da expedicao:

| Regra | Descricao |
|---|---|
| Data no passado | `startDate` nao pode ser anterior a amanha (D+1) |
| Data igual a hoje | `startDate` nao pode ser o dia atual |
| Data de inicio = data de fim | `startDate` nao pode ser igual a `endDate` (viagem minima de 1 noite = 2 dias) |
| Ordem incorreta | `startDate` deve ser anterior a `endDate` |
| Campo vazio ao avancar | Ambos os campos sao obrigatorios para avancar de Phase 1 |

**Calculo de "hoje"**: usa o timezone do usuario (browser). O sistema nao assume UTC para a comparacao de data.

**Mensagens de erro**: devem ser inline (abaixo do campo) e especificas. Nao usar mensagens genericas como "Data invalida". Usar mensagens descritivas:

| Regra violada | Mensagem PT-BR | Mensagem EN |
|---|---|---|
| Data no passado | "A data de partida deve ser no futuro" | "Departure date must be in the future" |
| Data igual a hoje | "A data de partida deve ser no futuro" | "Departure date must be in the future" |
| Datas iguais | "A viagem precisa ter pelo menos 1 noite" | "Trip must be at least 1 night" |
| Ordem incorreta | "A data de retorno deve ser apos a partida" | "Return date must be after departure" |
| Campo vazio | "Data obrigatoria" | "Date required" |

**Quando validar**: em blur do campo (ao perder foco) E ao tentar avancar de Phase 1. Nao em cada keystroke.

### Criterios de Aceite (REQ-005)

- **AC-008**: Dado que o usuario insere uma `startDate` igual a hoje, quando o campo perde foco, entao a mensagem de erro inline "A data de partida deve ser no futuro" aparece abaixo do campo em PT-BR.
- **AC-009**: Dado que o usuario insere uma `startDate` no passado, quando tenta avancar de Phase 1, entao o avanco e bloqueado e a mensagem de erro e exibida.
- **AC-010**: Dado que o usuario insere `startDate` e `endDate` com a mesma data, quando o segundo campo perde foco, entao a mensagem "A viagem precisa ter pelo menos 1 noite" aparece.
- **AC-011**: Dado que o usuario insere `endDate` anterior a `startDate`, quando o campo perde foco, entao a mensagem "A data de retorno deve ser apos a partida" aparece.
- **AC-012**: Dado que o usuario deixa os campos de data vazios e tenta avancar de Phase 1, entao o avanco e bloqueado e ambos os campos exibem "Data obrigatoria".
- **AC-013**: Dado um usuario com locale EN, quando ve uma mensagem de erro de data, entao a mensagem e exibida em ingles.
- **AC-014**: Dado que o usuario corrige uma data invalida, quando o campo perde foco novamente com valor valido, entao a mensagem de erro desaparece imediatamente.
- **AC-015**: Dado que uma expedicao existente tem datas validas e o usuario edita para uma data invalida, quando tenta salvar, entao o salvar e bloqueado com mensagem de erro inline.

---

## REQ-006 — Remover botao "Completar Expedicao" e substituir por "Ver Expedicoes"

### Contexto

O botao "Completar Expedicao" cria a impressao errada de que o usuario precisa realizar uma acao manual para concluir sua expedicao. Isso e inconsistente com o modelo de conclusao automatica definido em SPEC-PROD-023 (expedicao conclui quando todas as 6 fases ativas atingem COMPLETED).

Alem disso, o botao e encontrado em locais como a tela de summary e o final do wizard da ultima fase, onde a acao natural do usuario apos concluir e retornar ao dashboard, nao "completar" algo que ja esta completo.

### Requisito

Todo lugar em que o botao "Completar Expedicao" existe deve ser substituido por "Ver Expedicoes" (PT-BR) / "View Expeditions" (EN), que navega para `/expeditions`.

A conclusao da expedicao ocorre automaticamente quando SPEC-PROD-023 detecta todas as fases em COMPLETED. Nao existe fluxo manual de conclusao.

Se existir logica de negocio associada ao clique do botao "Completar Expedicao" (ex: update de `trip.status`), essa logica deve ser migrada para o trigger automatico de SPEC-PROD-023 e removida do handler do botao.

### Criterios de Aceite (REQ-006)

- **AC-016**: Dado qualquer tela ou componente que exiba o botao "Completar Expedicao", entao esse botao nao e mais exibido.
- **AC-017**: Dado o local onde o botao "Completar Expedicao" existia, entao um botao "Ver Expedicoes" e exibido no mesmo local.
- **AC-018**: Dado o botao "Ver Expedicoes", quando clicado, entao o usuario e redirecionado para `/expeditions`.
- **AC-019**: Dado que todas as 6 fases de uma expedicao atingem COMPLETED, entao `trip.status` e atualizado automaticamente pelo sistema sem acao manual do usuario (validado via teste de integracao).

---

## Requisitos de i18n (todos os 4 itens)

Todos os textos novos introduzidos por este spec devem ter entradas nos arquivos de traducao PT-BR e EN:
- Mensagens de erro de validacao de data (5 regras x 2 locales)
- Label do botao "Ver Expedicoes" (2 locales)
- Tooltip do badge de gamificacao, se implementado (2 locales)

---

## Fora do Escopo (v1 desta spec)

- Redesign completo do header (apenas movimentacao de um item e remocao de interatividade do badge)
- Validacao de data maxima (ex: nao pode planejar viagem para mais de 2 anos no futuro) — pode ser Sprint 32
- Sugestao automatica de datas baseada em feriados ou sazonalidade
- Botao de desfazer ao completar expedicao automaticamente

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Reportes de "nao encontrei o perfil" em feedback beta | N/A | 0 | Sprint 32 |
| Expedicoes criadas com datas invalidas (passado, iguais) | Desconhecida | 0 apos implementacao | Sprint 31 |
| Reportes de "o badge do header me levou a lugar errado" | N/A | 0 | Sprint 32 |
| Expedicoes concluidas sem acao manual (automatica vs manual) | 0% (feature inexistente) | 100% (toda conclusao automatica) | Sprint 31 |

---

## Dependencias

- **SPEC-PROD-023** (Phase Completion Logic): REQ-006 (AC-019) depende do trigger automatico definido em SPEC-PROD-023 — os dois devem ser implementados no mesmo sprint
- **`AuthenticatedNavbar.tsx`** e **`UserMenu.tsx`**: componentes afetados por REQ-002 e REQ-003
- **`Phase1Wizard.tsx`** (ou equivalente): componente afetado por REQ-005
- Arquivos de i18n (`messages/pt-BR.json` e `messages/en.json`): precisam de novas chaves de traducao

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — consolida REQ-002, REQ-003, REQ-005, REQ-006 para Sprint 31 |
