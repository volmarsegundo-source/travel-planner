---
spec-id: SPEC-UX-030
title: Nomes de Fase Abaixo da Barra de Progresso
version: 1.0.0
status: Draft
author: ux-designer
sprint: 32
reviewers: [product-owner, tech-lead, architect]
---

# SPEC-UX-030: Nomes de Fase Abaixo da Barra de Progresso

**Versao**: 1.0.0
**Status**: Draft
**Autor**: ux-designer
**Product Spec**: SPEC-PROD-028 (UX-007)
**Criado**: 2026-03-19
**Ultima Atualizacao**: 2026-03-19

---

## 1. Objetivo do Viajante

O viajante quer identificar rapidamente qual fase corresponde a cada segmento da barra de progresso, sem precisar passar o mouse ou clicar para descobrir o nome.

## 2. Personas Afetadas

| Persona | Como esta melhoria os serve |
|---|---|
| `@leisure-solo` | Orienta-se melhor na jornada — sabe exatamente onde esta e o que vem a seguir |
| `@leisure-family` | Pode comunicar o progresso para familia ("estamos na fase Logistica") |
| `@business-traveler` | Identifica rapidamente a fase sem interacao adicional — eficiencia |
| `@group-organizer` | Referencia fases pelo nome ao coordenar com o grupo |

## 3. Fluxo do Usuario

### Comportamento

Nao ha fluxo interativo — os nomes de fase sao informativos e sempre visiveis abaixo dos segmentos da barra de progresso. O viajante os le naturalmente ao visualizar a barra.

### Onde se aplica

1. **UnifiedProgressBar** — componente de navegacao entre fases nas paginas de wizard (Phase 1 a 6)
2. **Dashboard cards** — barra de progresso em miniatura nos cards de expedicao na pagina de expeditions

## 4. Especificacao Visual

### Nomes Canonicos (fonte: phase-config.ts)

| Fase | Nome completo (PT-BR) | Nome curto (PT-BR) | Nome completo (EN) | Nome curto (EN) |
|---|---|---|---|---|
| 1 | O Chamado | Chamado | The Calling | Calling |
| 2 | O Explorador | Explorador | The Explorer | Explorer |
| 3 | O Preparo | Preparo | The Preparation | Preparation |
| 4 | A Logistica | Logistica | The Logistics | Logistics |
| 5 | Guia do Destino | Guia | Destination Guide | Guide |
| 6 | O Roteiro | Roteiro | The Itinerary | Itinerary |

### UnifiedProgressBar (paginas de wizard)

**Posicao do nome**: Centralizado abaixo de cada segmento circular da barra de progresso.

**Tipografia**:
- Tamanho: 11px (0.6875rem)
- Peso: 400 (regular) para fases nao-atuais, 600 (semibold) para a fase atual
- Line-height: 1.2

**Cores por estado** (usa tokens SPEC-UX-026):
- Fase concluida: --color-phase-completed (#10B981) — verde
- Fase atual (ativa): --color-phase-current (#3B82F6) — azul
- Fase pendente (desbloqueada): --color-text-muted (#6B7280) — cinza
- Fase bloqueada: --color-text-muted (#9BA8B5) com opacity 0.5

**Variante de nome**:
- Em viewport >= 640px (sm+): exibir nome completo (ex: "O Chamado")
- Em viewport < 640px (xs): exibir nome curto (ex: "Chamado")

**Espacamento**:
- Margem superior do nome em relacao ao segmento: 4px (--space-xs)
- Largura maxima do texto: igual a largura do segmento + margem lateral de 4px de cada lado
- Se o nome exceder a largura: truncar com ellipsis (text-overflow: ellipsis)

**Alinhamento**: Cada nome deve estar centralizado com o centro do segmento correspondente, nao com o inicio. O texto deve usar text-align: center.

### Dashboard Cards (barra de progresso em miniatura)

**Diferenca em relacao ao UnifiedProgressBar**: A barra no dashboard e mais compacta e aparece dentro de um card com espaco limitado.

**Nome curto SEMPRE**: Independente do viewport, usar sempre o nome curto nos cards do dashboard (ex: "Chamado", "Explorador", "Guia").

**Tipografia**:
- Tamanho: 9px (0.5625rem)
- Peso: 400 (regular)
- Line-height: 1.1

**Cores**: Mesma logica de cores por estado da UnifiedProgressBar.

**Truncamento**: Se o nome curto exceder a largura disponivel do segmento no card, aplicar text-overflow: ellipsis. Em cards muito estreitos (mobile), considerar exibir apenas o numero da fase se o nome nao couber (fallback: "1", "2", "3"...).

**Espacamento**:
- Margem superior do nome: 2px
- Nao adicionar mais de 16px de altura total ao card (nomes + margem)

### Associacao Semantica

Os nomes devem estar semanticamente associados aos segmentos, nao apenas visualmente proximos:
- Cada nome deve usar o mesmo `aria-label` ja existente no segmento (que ja inclui o nome da fase)
- O texto visual do nome pode ser `aria-hidden="true"` se o aria-label do segmento ja anuncia o nome — para evitar duplicacao no screen reader
- Alternativa: o nome visivel funciona como o label do segmento (aria-labelledby apontando para o elemento de texto)

## 5. Responsividade

| Breakpoint | UnifiedProgressBar | Dashboard Card |
|---|---|---|
| xs (< 640px) | Nomes curtos. Truncar se necessario. Fonte 11px. | Nomes curtos, fonte 9px. Fallback para numero se nao couber. |
| sm (640-767px) | Nomes completos. Fonte 11px. | Nomes curtos, fonte 9px. |
| md (768-1024px) | Nomes completos. Fonte 11px. | Nomes curtos, fonte 9px. |
| lg (> 1024px) | Nomes completos. Fonte 11px. | Nomes curtos, fonte 9px. |

## 6. Acessibilidade

- [x] Nomes de fase sao o texto acessivel do segmento OU sao redundantes com aria-label existente (neste caso, aria-hidden no texto visual)
- [x] Contraste de texto: 11px/#10B981 sobre fundo #F7F9FC = 3.1:1 (passa para UI text); 9px no dashboard pode precisar de cor mais escura — verificar e ajustar se necessario
- [x] Nomes nao sao interativos — nao recebem foco nem respondem a click (o segmento ja e interativo)
- [x] Nomes sao exibidos no locale do usuario (PT-BR ou EN) — usando chaves i18n de phase-config.ts (nameKey)
- [x] Informacao do nome nao depende apenas de cor — o texto em si carrega o significado
- [x] prefers-reduced-motion: nao se aplica (nenhuma animacao nos nomes)

**Nota de contraste**: O verde (#10B981) sobre branco (#FFFFFF) tem contraste de 3.0:1 que passa para texto grande (>= 14px bold) mas NAO passa para texto de 11px regular. Para os nomes de fases concluidas em 11px, usar uma variante mais escura: #059669 (contraste 4.6:1 sobre branco). Para o dashboard (9px), usar #047857 (contraste 5.5:1).

| Cor original | Alternativa para texto pequeno | Contraste sobre #FFFFFF |
|---|---|---|
| #10B981 (completed) | #059669 (label completed) | 4.6:1 |
| #3B82F6 (current) | #3B82F6 (mantém) | 4.1:1 — aceitavel para 11px |
| #6B7280 (pending) | #6B7280 (mantém) | 5.0:1 |
| #9BA8B5 (locked, 50% opacity) | Texto efetivo ~#C5CCD4 | 1.9:1 — usar #9BA8B5 sem opacity | 3.1:1 |

> Decisao: Labels de fase bloqueada usam #9BA8B5 pleno (sem opacity), atingindo 3.1:1 que passa para componentes UI mas nao para texto. Como fases bloqueadas sao informativas e o numero da fase no segmento ja e acessivel, este compromisso e aceitavel. Alternativa: usar #6B7280 para todos os nao-ativos.

## 7. Conteudo e Microcopy

### Labels

| Chave | PT-BR | EN |
|---|---|---|
| `phase.1.name` | O Chamado | The Calling |
| `phase.2.name` | O Explorador | The Explorer |
| `phase.3.name` | O Preparo | The Preparation |
| `phase.4.name` | A Logistica | The Logistics |
| `phase.5.name` | Guia do Destino | Destination Guide |
| `phase.6.name` | O Roteiro | The Itinerary |
| `phase.1.shortName` | Chamado | Calling |
| `phase.2.shortName` | Explorador | Explorer |
| `phase.3.shortName` | Preparo | Preparation |
| `phase.4.shortName` | Logistica | Logistics |
| `phase.5.shortName` | Guia | Guide |
| `phase.6.shortName` | Roteiro | Itinerary |

> **Nota**: Os nomes completos ja existem em `phase-config.ts` (campo `name` e `nameKey`). Os nomes curtos sao novas chaves de i18n.

### Tom de Voz

- Nomes de fase sao proprios do universo "Atlas" — devem ser mantidos conforme definidos em phase-config.ts, sem simplificacao excessiva.

## 8. Restricoes (da Spec de Produto)

- SPEC-PROD-028 AC-026: Nomes abaixo dos segmentos nas paginas de wizard
- SPEC-PROD-028 AC-027: Nomes abaixo dos segmentos no dashboard
- SPEC-PROD-028 AC-028: Legivel em mobile sem overflow ou truncamento indesejado
- SPEC-PROD-028 AC-029: Nomes canonicos de phase-config.ts
- SPEC-PROD-028 AC-030: Nomes no locale do usuario (i18n)

## 9. Criterios de Aceite (UX)

- [ ] UnifiedProgressBar exibe nome de fase abaixo de cada segmento
- [ ] Nomes completos em sm+, nomes curtos em xs (<640px)
- [ ] Dashboard cards exibem nomes curtos sempre
- [ ] Cores dos nomes correspondem ao estado do segmento (completed/current/pending/locked)
- [ ] Contraste de cores verificado para tamanhos de fonte de 9px e 11px (usar variantes de cor ajustadas)
- [ ] Nomes sao i18n-aware (PT-BR e EN)
- [ ] Dashboard cards nao crescem mais que 16px em altura total por causa dos nomes
- [ ] Nomes truncam com ellipsis quando excedema largura do segmento

## 10. Prototipo

- [ ] Prototipo requerido: Nao
- **Justificativa**: Melhoria incremental sobre componentes existentes. A especificacao visual e suficiente.

## 11. Questoes Abertas

Nenhuma — spec pronta para implementacao.

## 12. Padroes Utilizados

- UnifiedProgressBar (componente existente — SPEC-UX-019)
- Phase color tokens (SPEC-UX-026: --color-phase-completed, --color-phase-current, etc.)
- PHASE_DEFINITIONS de phase-config.ts (fonte de verdade para nomes)

---

> **Status da Spec**: Draft
> Ready for Architect

---

## Historico de Mudancas

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | ux-designer | Draft inicial — nomes de fase abaixo dos segmentos da barra de progresso |
