---
spec-id: SPEC-UX-029
title: Preferencias 4+3 Split
version: 1.0.0
status: Draft
author: ux-designer
sprint: 32
reviewers: [product-owner, tech-lead, architect]
---

# SPEC-UX-029: Preferencias 4+3 Split

**Versao**: 1.0.0
**Status**: Draft
**Autor**: ux-designer
**Product Spec**: SPEC-PROD-028 (UX-003)
**Criado**: 2026-03-19
**Ultima Atualizacao**: 2026-03-19

---

## 1. Objetivo do Viajante

O viajante quer preencher suas preferencias de viagem de forma organizada, com categorias agrupadas por tema — sem se sentir sobrecarregado por muitas opcoes em uma unica tela.

## 2. Personas Afetadas

| Persona | Como esta melhoria os serve |
|---|---|
| `@leisure-solo` | Agrupamento logico facilita reflexao sobre estilo de viagem — categorias "core" primeiro, estilo de vida depois |
| `@leisure-family` | Preferencias familiares (acomodacao, orcamento) aparecem juntas na pagina 1, facilitando decisoes de grupo |
| `@business-traveler` | Pagina 1 contem as categorias mais impactantes para AI — preenchimento rapido das essenciais |
| `@bleisure` | Pode priorizar pagina 1 (estilo de viagem) e deixar pagina 2 (lifestyle) para depois |

## 3. Fluxo do Usuario

### Happy Path

1. Usuario acessa a secao de preferencias (Phase 2)
2. Pagina 1 exibe 4 categorias de preferencias (estilo de viagem core)
3. Usuario preenche as categorias desejadas na pagina 1
4. Usuario clica "Proximo" para ir a pagina 2
5. Pagina 2 exibe 3 categorias de preferencias (interesses e lifestyle)
6. Usuario preenche as categorias desejadas na pagina 2
7. Usuario conclui ou retorna a pagina 1

```
[Phase 2 — Preferencias]
    |
    v
[Pagina 1: 4 categorias core]
    |
    +---> "Proximo" ---> [Pagina 2: 3 categorias lifestyle]
    |                         |
    |                         +---> "Anterior" ---> [Pagina 1]
    |                         |
    |                         +---> "Concluir"
    v
[Indicador: "1 de 2" / "2 de 2"]
```

### Caminho Alternativo — Navegacao ida e volta

- Usuario navega de pagina 2 para pagina 1: selecoes da pagina 1 estao preservadas
- Usuario navega de pagina 1 para pagina 2: selecoes da pagina 2 estao preservadas
- Nenhuma perda de estado ao navegar entre paginas (AC-014)

## 4. Especificacao Visual

### Distribuicao de Categorias

**Pagina 1 — "Estilo de Viagem" (4 categorias)**:

| Ordem | Categoria (key) | Nome exibido (PT-BR) | Justificativa do agrupamento |
|---|---|---|---|
| 1 | `travelPace` | Ritmo de Viagem | Define o tom geral da viagem — impacto direto na geracao AI |
| 2 | `budgetStyle` | Estilo de Orcamento | Define o nivel de investimento — impacto direto em recomendacoes |
| 3 | `socialPreference` | Preferencia Social | Define com quem viaja — impacta acomodacao e atividades |
| 4 | `accommodationStyle` | Estilo de Acomodacao | Define onde ficar — complementa orcamento e social |

**Pagina 2 — "Interesses e Estilo de Vida" (3 categorias)**:

| Ordem | Categoria (key) | Nome exibido (PT-BR) | Justificativa do agrupamento |
|---|---|---|---|
| 1 | `interests` | Interesses | Define atividades e atracoes preferidas |
| 2 | `foodPreferences` | Preferencias Alimentares | Define restricoes e preferencias gastronomicas |
| 3 | `fitnessLevel` | Nivel de Preparo Fisico | Calibra intensidade de atividades sugeridas |

**Categorias removidas da exibicao (3 categorias)**:

As seguintes categorias existem no schema (`preferences.schema.ts`) mas NAO sao exibidas na UI paginada. O SPEC-PROD-028 AC-012 indica 7 categorias no total. As 3 categorias abaixo sao consideradas de baixo impacto para a geracao AI e podem ser reintroduzidas em versao futura:

| Categoria (key) | Motivo da exclusao |
|---|---|
| `photographyInterest` | Baixo impacto na qualidade do roteiro AI — nice-to-have para futuro |
| `wakePreference` | Impacto marginal — o ritmo de viagem ja captura a informacao indiretamente |
| `connectivityNeeds` | Impacto marginal na geracao de roteiro — relevante apenas para destinos remotos |

> **Nota para PO**: Se o stakeholder preferir incluir alguma dessas categorias, basta move-la para a pagina 2 (ficando 4+4). A recomendacao UX e manter 4+3 para reduzir carga cognitiva.

### Indicador de Paginacao

**Formato**: Indicador de pontos (dots) + texto "Pagina X de 2"

**Descricao visual**:
- Dois pontos circulares (8px de diametro) alinhados horizontalmente, centralizados abaixo das categorias
- Ponto ativo: preenchido com cor primaria (--color-primary, #E8621A)
- Ponto inativo: contorno apenas, cor muted (--color-text-muted)
- Abaixo dos pontos: texto "1 de 2" ou "2 de 2" em fonte pequena (12px), cor muted
- Espacamento entre os pontos: 8px (--space-sm)

**Navegacao**:
- Botao "Proximo" (pagina 1 -> pagina 2): alinhado a direita, estilo primario
- Botao "Anterior" (pagina 2 -> pagina 1): alinhado a esquerda, estilo secundario/ghost
- Na pagina 2: botao "Anterior" a esquerda, botao de conclusao a direita

### Layout das Categorias

- Cada categoria mantém o padrao existente PreferenceCategory (card colapsavel com chips)
- Categorias empilhadas verticalmente dentro de cada pagina
- Espacamento entre categorias: 16px (--space-md)

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Categorias empilhadas, full-width. Pontos de paginacao centralizados. Botoes full-width. |
| Tablet (768-1024px) | Mesmo layout mobile — categorias sao complexas o suficiente para ocupar largura total. |
| Desktop (> 1024px) | Mesmo layout dentro do container max-width existente. |

## 6. Acessibilidade

- [x] Indicador de paginacao tem texto acessivel ("Pagina 1 de 2") — nao depende apenas dos pontos visuais
- [x] Botoes "Proximo" e "Anterior" sao focaveis e ativados por Enter/Space
- [x] Ao navegar entre paginas, foco move para o titulo da primeira categoria visivel (aria-live region nao necessaria — e navegacao intencional do usuario)
- [x] Pontos de paginacao sao decorativos (aria-hidden="true") — o texto "X de 2" e a informacao acessivel
- [x] Selecoes preservadas ao navegar entre paginas — sem perda de estado
- [x] Todas as categorias e chips mantem WCAG 2.1 AA (padroes PreferenceChip existentes)
- [x] Touch targets dos botoes de navegacao >= 44x44px

## 7. Conteudo e Microcopy

### Labels e CTAs

| Chave | PT-BR | EN |
|---|---|---|
| `preferences_page_1_title` | Estilo de Viagem | Travel Style |
| `preferences_page_2_title` | Interesses e Estilo de Vida | Interests & Lifestyle |
| `preferences_pagination` | Pagina {current} de {total} | Page {current} of {total} |
| `preferences_next` | Proximo | Next |
| `preferences_previous` | Anterior | Previous |

### Tom de Voz

- Titulos das paginas devem ser descritivos e acolhedores — o viajante deve entender que as categorias sao opcionais e podem ser preenchidas a qualquer momento.

## 8. Restricoes (da Spec de Produto)

- SPEC-PROD-028 AC-010: Pagina 1 exibe exatamente 4 categorias
- SPEC-PROD-028 AC-011: Pagina 2 exibe exatamente 3 categorias
- SPEC-PROD-028 AC-013: Indicadores de paginacao refletem o split correto
- SPEC-PROD-028 AC-014: Selecoes preservadas ao navegar entre paginas
- A ordem das categorias dentro de cada pagina e responsabilidade do UX (SPEC-PROD-028 Scope)

## 9. Criterios de Aceite (UX)

- [ ] Pagina 1 exibe: travelPace, budgetStyle, socialPreference, accommodationStyle (nesta ordem)
- [ ] Pagina 2 exibe: interests, foodPreferences, fitnessLevel (nesta ordem)
- [ ] Indicador de paginacao mostra "1 de 2" e "2 de 2" com pontos visuais
- [ ] Navegacao entre paginas preserva todas as selecoes
- [ ] Categorias photographyInterest, wakePreference, connectivityNeeds nao sao exibidas
- [ ] Botoes de navegacao posicionados conforme especificacao (Anterior esquerda, Proximo direita)

## 10. Prototipo

- [ ] Prototipo requerido: Nao
- **Justificativa**: Reutiliza componentes existentes (PreferenceCategory, PreferenceChip) com alteracao apenas na distribuicao e paginacao. A especificacao textual e suficiente.

## 11. Questoes Abertas

- [ ] **PO**: Confirmar que as 3 categorias excluidas (photographyInterest, wakePreference, connectivityNeeds) podem ser ocultadas na v1. Se alguma deve ser mantida, ajustar para 4+4.

## 12. Padroes Utilizados

- PreferenceCategory (card colapsavel com chips — existente)
- PreferenceChip (chip selecionavel com emoji — existente)
- PreferenceProgressBar (barra de 10 segmentos — ajustar para 7 segmentos ou manter 10 com 7 ativos)
- Pagination dots (novo padrao simples — reutilizavel)

---

> **Status da Spec**: Draft
> Ready for Architect (pendente confirmacao PO sobre categorias excluidas)

---

## Historico de Mudancas

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | ux-designer | Draft inicial — split 4+3 de preferencias com agrupamento tematico |
