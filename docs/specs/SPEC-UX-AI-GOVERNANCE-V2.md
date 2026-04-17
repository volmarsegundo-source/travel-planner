# SPEC-UX-AI-GOVERNANCE-V2: Central de Governanca de IA — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: [product-owner, tech-lead, architect, ai-specialist]
**Product Spec**: Sprint 45 — Central de Governanca de IA
**Created**: 2026-04-17
**Last Updated**: 2026-04-17

---

## 1. Objetivo do Administrador

O administrador precisa controlar, monitorar e ajustar todo o comportamento de IA do sistema a partir de uma unica interface, com alteracoes aplicadas em tempo real (sem deploy), garantindo qualidade, custo e seguranca das geracoes.

## 2. Personas Afetadas

| Persona | Como esta feature os serve |
|---|---|
| `@travel-agent` | Proxy para admin: precisa de visibilidade total sobre prompts, modelos, custos e qualidade de output da IA para tomar decisoes operacionais |

Nota: Feature exclusiva para administradores. Nenhuma persona viajante interage com estas telas. Feature flag: `AI_GOVERNANCE_V2`.

---

## 3. User Flow

### 3.1 Fluxo Principal — Dashboard de IA

```
[Admin autenticado no /admin]
    |
    v
[Clica na aba "IA" na navegacao lateral do admin]
    |
    v
[Dashboard /admin/ia carrega com metricas da ultima semana]
    |
    v
[4 tabs visiveis: Prompts | Modelos | Outputs | Evals]
    |
    +-- Visualiza KPI cards (chamadas, custo, erro, latencia, trust score)
    +-- Visualiza graficos de tendencia semanal
    +-- Visualiza alertas ativos (trust score, custo, erro)
    +-- Quick actions: rodar eval, kill-switch, trocar modelo, ajustar timeout
    |
    v
[Admin clica em uma tab para navegar a sub-tela]
```

### 3.2 Fluxo — Edicao de Prompt

```
[Admin na tab "Prompts"]
    |
    v
[Lista de templates com status, versao, trust score]
    |
    v
[Clica em um template]
    |
    v
[Editor abre com syntax highlighting + placeholders destacados]
    |
    +-- [Edita conteudo] --> [Salva como nova versao Draft]
    |       |
    |       v
    |   [Botao "Rodar Evals"] --> [Painel inline Promptfoo executa]
    |       |
    |       v
    |   [Trust score >= 0.80?]
    |       |
    |       +-- SIM --> [Botao "Promover" ativo] --> [Confirma promocao]
    |       |       |
    |       |       v
    |       |   [Toast: "Prompt v{X} promovido para producao."]
    |       |
    |       +-- NAO --> [Botao "Promover" desabilitado]
    |               |
    |               v
    |           [Tooltip: "Trust score minimo de 0.80 necessario para promocao."]
    |
    +-- [Diff viewer] --> [Seleciona 2 versoes para comparar]
    |
    +-- [Preview] --> [Renderiza com dados mock]
    |
    +-- [Rollback] --> [Modal de confirmacao] --> [Reverte para versao anterior ativa]
```

### 3.3 Fluxo — Matriz de Modelos

```
[Admin na tab "Modelos"]
    |
    v
[Tabela: Fase | Primario | Timeout | Fallback | Timeout Fallback | Ultima Alteracao]
    |
    v
[Admin seleciona novo modelo no dropdown de uma fase]
    |
    v
[Modal de confirmacao: custo estimado + latencia esperada]
    |
    +-- "Confirmar" --> [Salva] --> [Toast: "Mudanca aplicada. Proximas geracoes usarao nova configuracao."]
    +-- "Cancelar" --> [Fecha modal, sem alteracao]

[Admin ajusta timeout via input/slider]
    |
    v
[Validacao real-time:
    - < 5s ou > 55s --> borda vermelha + mensagem
    - soma primario+fallback > 55s --> warning amarelo
    - timeout < p90 historico --> warning amarelo "risco de abort prematuro"]
    |
    v
[Modal de impacto estimado ao salvar]
    |
    v
[Toast: "Timeout atualizado."]
```

### 3.4 Fluxo — Curadoria de Outputs

```
[Admin na tab "Outputs"]
    |
    v
[Lista paginada: expedicao | fase | modelo | versao prompt | preview | flags]
    |
    v
[Filtros: tipo flag, fase, modelo, periodo]
    |
    v
[Admin clica em um output]
    |
    v
[Painel expandido: conteudo completo + metadados]
    |
    +-- [Flag: Bias / Alucinacao / Risco] --> [Marca flag + campo comentario]
    +-- [Status: reviewed / flagged / escalated]
    |
    v
[Salvar] --> [Toast: "Output marcado como {status}."]
```

### Estados de Erro

- **Falha ao carregar dados**: Cada secao (KPIs, graficos, tabela, lista) tem tratamento independente. "Nao foi possivel carregar [secao]. Tente novamente." com botao de retry.
- **Falha ao salvar configuracao**: Toast de erro: "Alteracao nao salva. Verifique sua conexao e tente novamente." Config nao muda — rollback otimista.
- **Feature flag desativada**: Redirect para /admin com toast: "Central de IA nao esta ativa neste ambiente."
- **Timeout de eval**: Barra de progresso para em estado parcial. Mensagem: "Avaliacao demorou mais que o esperado. Resultados parciais disponiveis."

### Edge Cases

- **Sem dados historicos**: KPI cards mostram "0" ou "—". Graficos mostram empty state: "Sem dados para este periodo." Tabela de outputs mostra "Nenhuma geracao encontrada."
- **Admin simultaneo**: Indicador "Ultima alteracao: ha X min por {admin}" previne conflitos. Se outra alteracao ocorreu enquanto o admin editava, toast warning: "Configuracao alterada por outro admin. Recarregue para ver a versao atual."
- **Prompt sem versao anterior**: Botao "Rollback" desabilitado. Tooltip: "Este e o primeiro rascunho — nao ha versao anterior."
- **Trust score indisponivel**: Badge cinza "N/A" com tooltip: "Execute uma avaliacao para calcular o trust score."

---

## 4. Descricao das Telas

### 4.1 Dashboard de IA — /admin/ia

**Proposito**: Visao centralizada da saude do sistema de IA. Permite ao admin detectar problemas e agir rapidamente.

**Layout**:

```
+------------------------------------------------------------------+
| Painel de IA                              [Ultima alt: 5min, Ana] |
+------------------------------------------------------------------+
| [Tabs: Dashboard* | Prompts | Modelos | Outputs | Evals]        |
+------------------------------------------------------------------+
|                                                                    |
| +----------+ +----------+ +----------+ +----------+ +----------+ |
| | Total    | | Custo    | | Taxa     | | Latencia | | Trust    | |
| | Chamadas | | R$420    | | Erro 2.1%| | p50/p90  | | Score    | |
| | 1.284    | |          | |          | | p99      | | 0.87     | |
| +----------+ +----------+ +----------+ +----------+ +----------+ |
|                                                                    |
| +----------+                                                       |
| | Timeout  |                                                       |
| | por      |                                                       |
| | Modelo   |                                                       |
| +----------+                                                       |
|                                                                    |
| +-------------------------------+ +-----------------------------+ |
| | Tendencia Semanal — Chamadas  | | Tendencia Semanal — Custo  | |
| | [line chart]                  | | [line chart]               | |
| +-------------------------------+ +-----------------------------+ |
|                                                                    |
| +-------------------------------+ +-----------------------------+ |
| | Tendencia — Taxa de Erro      | | Tendencia — Latencia       | |
| | [line chart]                  | | [line chart p50/p90/p99]   | |
| +-------------------------------+ +-----------------------------+ |
|                                                                    |
| === Alertas Ativos =============================================  |
| [!] Trust score caiu para 0.72 (limiar: 0.80)      [Ver evals]   |
| [!] Custo 15% acima do budget semanal               [Ver custos] |
| [!] Taxa de erro Gemini 2.0 Flash subiu para 8.3%   [Ver modelo] |
|                                                                    |
| === Acoes Rapidas ===============================================  |
| [Rodar Eval Completo] [Pausar Geracao] [Trocar Modelo] [Timeout] |
+------------------------------------------------------------------+
```

**KPI Cards (6 cards)**:

1. **Total de Chamadas**: Valor inteiro, tendencia vs periodo anterior (seta + %). Icone: raio, muted blue.
2. **Custo Total**: Valor em R$, tendencia vs periodo anterior. Icone: moeda, muted amber.
3. **Taxa de Erro**: Percentual, tendencia (vermelho se subindo, verde se caindo). Icone: alerta triangulo, muted red.
4. **Latencia**: p50 / p90 / p99 em millisegundos, layout compacto vertical. Icone: relogio, muted navy.
5. **Trust Score Atual**: Valor 0.00-1.00, badge de cor (verde >= 0.80, amarelo 0.60-0.79, vermelho < 0.60). Icone: escudo, cor dinamica.
6. **Timeout por Modelo**: Mini-tabela compacta: modelo | % timeout. Icone: ampulheta, muted gray.

Estilo de cada card: consistente com SPEC-UX-044 — surface white, border 1px solid #E2E8F0, border-radius 12px, padding 20px, min-height 120px. Labels: 12px uppercase #94A3B8. Valores: 28px bold #1A202C. Tendencia: 12px, verde para melhora, #D93B2B para piora.

**Graficos de Tendencia Semanal (4 graficos)**:

- Layout: 2 colunas (2x2 grid).
- Cada grafico em card surface com titulo 16px bold #1A202C.
- Tipo: Line chart com area preenchida (10% opacity).
- X-axis: ultimos 7 dias (labels por dia).
- Hover: tooltip com data + valor exato.
- Grid lines: #E2E8F0.
- Cores: Chamadas (#3B82F6 blue), Custo (#F59E0B amber), Erro (#D93B2B red), Latencia (#8B5CF6 purple — 3 linhas p50/p90/p99).

**Alertas Ativos**:

- Posicao: abaixo dos graficos.
- Estilo: banner com borda esquerda 4px + fundo semantico.
  - Trust score baixo: borda #D93B2B, fundo #FDF2F1.
  - Custo acima do budget: borda #F59E0B, fundo #FFFBEB.
  - Erro crescente: borda #D93B2B, fundo #FDF2F1.
- Cada alerta: icone + mensagem descritiva + link de acao a direita.
- Se nenhum alerta: mensagem positiva "Todos os indicadores dentro do esperado." com fundo #E6F7F4 e borda #2DB8A0.

**Quick Actions**:

- Posicao: barra fixa abaixo dos alertas.
- 4 botoes de acao:
  1. **Rodar Eval Completo**: Botao outline azul. Ao clicar: estado loading com spinner + "Executando avaliacao...". Ao completar: toast com resultado resumido.
  2. **Pausar Geracao (Kill-Switch)**: Botao outline vermelho. Ao clicar: modal de confirmacao "Pausar toda geracao de IA? Usuarios verao mensagem de indisponibilidade temporaria." com "Pausar" (destructive red) e "Cancelar". Quando ativo: botao muda para "Retomar Geracao" (solid verde).
  3. **Trocar Modelo**: Abre tab Modelos com scroll ate a primeira fase.
  4. **Ajustar Timeout**: Abre tab Modelos com foco no primeiro campo de timeout.

**Indicador de Ultima Alteracao**:

- Posicao: canto superior direito, ao lado do titulo.
- Formato: "Ultima alteracao: ha X min por {nome}".
- Estilo: 12px, #94A3B8, icone de relogio muted.
- Atualiza via polling (frequencia definida pelo arquiteto).

**Loading State**: Skeleton loaders para cada card e grafico independentemente. Cards: retangulo pulsante no lugar do valor. Graficos: retangulo cinza com linhas tracejadas.

**Empty State**: Cards mostram "—" como valor. Graficos mostram "Sem dados para este periodo." centralizado. Alertas: mensagem positiva verde.

**Error State**: Cada secao independente. Icone de erro + mensagem + botao "Tentar novamente". Outras secoes continuam funcionais.

---

### 4.2 Editor de Prompts — /admin/ia/prompts

**Proposito**: Gerenciar templates de prompt com versionamento, avaliacao e promocao segura.

**Layout**:

```
+------------------------------------------------------------------+
| Prompts                                                [+ Novo]   |
+------------------------------------------------------------------+
| +--------------------------------------------------------------+ |
| | Nome           | Status     | Versao | Trust  | Ultima Edicao| |
| |----------------|------------|--------|--------|--------------|  |
| | checklist-gen  | active     | 3.2.0  | 0.92   | 2h atras     | |
| | guide-gen      | staging    | 2.1.0  | 0.85   | 1d atras     | |
| | itinerary-gen  | draft      | 4.0.0  | —      | 5min atras   | |
| | summary-gen    | archived   | 1.3.0  | 0.78   | 30d atras    | |
| +--------------------------------------------------------------+ |
|                                                                    |
| === Editor (expande ao selecionar template) ==================== |
|                                                                    |
| [Tab: Editor | Diff | Preview]                                   |
|                                                                    |
| +--------------------------------------------------------------+ |
| | Voce e um assistente de viagem...                            | |
| | O viajante vai para {destination} entre {startDate} e       | |
| | {endDate}. Considere o perfil: {travelStyle}...             | |
| |                                                              | |
| | [syntax highlight: placeholders em destaque teal #2DB8A0]   | |
| +--------------------------------------------------------------+ |
|                                                                    |
| [Salvar Rascunho]  [Rodar Evals]  [Promover]  [Rollback]        |
|                                                                    |
| === Resultado Evals (painel inline) =========================== |
| Trust Score: 0.87 | Passou: 42/50 | Falhou: 8/50               |
| Detalhes: [expandir]                                              |
+------------------------------------------------------------------+
```

**Lista de Templates**:

- Tabela com 5 colunas: Nome, Status, Versao, Trust Score, Ultima Edicao.
- Status badges com cor:
  - `draft`: fundo #EFF6FF, texto #3B82F6, borda #93C5FD.
  - `staging`: fundo #FFFBEB, texto #92400E, borda #FCD34D.
  - `active`: fundo #E6F7F4, texto #065F46, borda #6EE7B7.
  - `archived`: fundo #F1F5F9, texto #64748B, borda #CBD5E1.
- Trust score: valor numerico + dot de cor (verde >= 0.80, amarelo 0.60-0.79, vermelho < 0.60, cinza se indisponivel).
- Linha clicavel: ao clicar, expande o editor abaixo da tabela (ou ao lado em telas > 1440px).
- Ordenacao por colunas (clique no header).

**Editor de Prompt**:

- 3 sub-tabs internas: Editor | Diff | Preview.
- **Editor**: Area de texto com syntax highlighting. Placeholders (ex: `{destination}`) destacados com fundo #E6F7F4 + texto #2DB8A0 + borda-inferior 2px #2DB8A0. Numeracao de linhas a esquerda (cinza #94A3B8). Altura minima: 300px, redimensionavel verticalmente.
- **Diff**: Dois dropdowns para selecionar versoes. Visualizacao side-by-side: linhas adicionadas em fundo #E6F7F4, linhas removidas em fundo #FDF2F1. Sem versoes para comparar: "Selecione duas versoes para comparar."
- **Preview**: Renderiza o prompt com dados mock (destino: "Lisboa", datas: "15/05-22/05/2026", estilo: "aventura"). Dados mock pre-definidos, nao editaveis (v1). Resultado renderizado em card cinza #F7F9FC com borda #E2E8F0.

**Botoes de Acao**:

1. **Salvar Rascunho**: Outline secondary. Sempre ativo quando ha alteracoes. Toast: "Rascunho salvo como v{X}."
2. **Rodar Evals**: Outline azul. Estado loading: spinner + "Avaliando prompt..." (pode levar 10-60s). Resultado aparece no painel inline abaixo. Se falhar: "Avaliacao falhou. Tente novamente."
3. **Promover**: Solid primary #E8621A. **Desabilitado** se: (a) trust score < 0.80, ou (b) nenhum eval executado. Tooltip quando desabilitado: "Trust score minimo de 0.80 necessario para promocao. Execute uma avaliacao primeiro." Ao clicar (quando ativo): modal de confirmacao "Promover v{X} para producao? A versao atual (v{Y}) sera arquivada." com "Promover" (primary) e "Cancelar".
4. **Rollback**: Outline vermelho. Desabilitado se nao ha versao anterior ativa. Ao clicar: modal "Reverter para v{Y} (ultima versao ativa)? A versao atual sera arquivada." com "Reverter" (destructive) e "Cancelar".

**A/B Testing (Wave 6 — esboco apenas)**:

- Slider de % trafego posicionado abaixo do editor, visivel apenas para prompts em `staging`.
- Label: "Trafego de teste: {X}%".
- Range: 0-50% em incrementos de 5%.
- Badge "Futuro" ao lado do slider.
- Desabilitado na v1 — visual placeholder para validacao de conceito.

**Loading State**: Skeleton da tabela (5 linhas pulsantes). Editor: area cinza pulsante.
**Empty State**: "Nenhum template encontrado. Crie o primeiro template para comecar." com botao "+ Novo Template".
**Error State**: "Nao foi possivel carregar os templates. Tente novamente." com botao retry.

---

### 4.3 Matriz de Modelos — /admin/ia/models

**Proposito**: Configurar qual modelo de IA atende cada fase, com timeouts ajustaveis e fallbacks, aplicados em tempo real.

**Layout**:

```
+------------------------------------------------------------------+
| Modelos por Fase                     [Config ativa agora: v12]    |
+------------------------------------------------------------------+
|                                                                    |
| +----------------------------------------------------------------+|
| | Fase       | Primario        | Timeout | Fallback       | T.FB ||
| |------------|-----------------|---------|----------------|------||
| | Checklist  | [Gemini 2.5 v]  | [15s]   | [Haiku 4.5 v]  |[10s]||
| | Guia       | [Sonnet 4.6 v]  | [25s]   | [Gemini 2.0 v] |[15s]||
| | Roteiro    | [Opus 4.7  v]   | [30s]   | [Sonnet 4.6 v] |[20s]||
| | Preparo    | [Gemini 2.5 v]  | [15s]   | [Haiku 4.5 v]  |[10s]||
| | ...        | ...             | ...     | ...            | ... ||
| +----------------------------------------------------------------+|
|                                                                    |
| [Indicador: "Ultima alteracao ha 3 min por Carlos"]               |
|                                                                    |
| +-------- Validacoes em tempo real --------------------------------|
| | [!] Checklist: timeout (15s) < p90 historico (18s) —            |
| |     risco de abort prematuro                                     |
| | [!] Roteiro: soma primario+fallback (50s) proximo do            |
| |     limite de 55s                                                |
| +----------------------------------------------------------------+|
+------------------------------------------------------------------+
```

**Tabela de Configuracao**:

- 6 colunas: Fase | Modelo Primario | Timeout Primario | Modelo Fallback | Timeout Fallback | Ultima Alteracao.
- Uma linha por fase que usa IA (numero de linhas definido pelo arquiteto).
- Coluna "Fase": texto bold, nao editavel.
- Coluna "Ultima Alteracao": "ha X min" ou "ha X dias" + nome do admin. 12px, #94A3B8.

**Dropdown de Modelo**:

- Opcoes: Gemini 2.0 Flash, Gemini 2.5 Flash, Opus 4.7, Sonnet 4.6, Haiku 4.5.
- Cada opcao mostra: nome do modelo + custo estimado por chamada (em cinza muted a direita).
- Ao trocar: **modal de confirmacao de custo**.

**Modal de Confirmacao ao Trocar Modelo**:

```
+--------------------------------------------------+
| Confirmar Troca de Modelo                        |
|--------------------------------------------------|
| Fase: Guia Destino                               |
| Modelo anterior: Gemini 2.0 Flash                |
| Novo modelo: Sonnet 4.6                          |
|                                                  |
| Impacto estimado:                                |
| +----------------------------------------------+ |
| | Custo por chamada: R$0,003 --> R$0,015 (+5x) | |
| | Latencia esperada: ~2s --> ~8s               | |
| | Trust score historico: 0.82 --> 0.91         | |
| +----------------------------------------------+ |
|                                                  |
| [Cancelar]                    [Confirmar Troca]  |
+--------------------------------------------------+
```

- Card de impacto: fundo #F7F9FC, borda #E2E8F0.
- Custo: vermelho se aumento > 3x, amarelo se 1.5x-3x, verde se reducao.
- Latencia: vermelho se > 15s, amarelo se 8-15s, verde se < 8s.
- Trust score: verde se melhora, vermelho se piora.

**Input de Timeout**:

- Campo numerico com botoes +/- (stepper) ou digitacao direta.
- Range: 5s a 55s.
- Largura fixa: 80px.
- **Validacao visual real-time**:
  - Valor fora do range (< 5 ou > 55): borda #D93B2B + mensagem abaixo "Timeout deve ser entre 5s e 55s." (12px, #D93B2B).
  - Soma primario+fallback > 55s: borda #F59E0B em ambos os campos + warning abaixo da tabela "Soma dos timeouts ({X}s) excede o limite de 55s. Geracoes podem falhar." (fundo #FFFBEB, borda esquerda #F59E0B).
  - Timeout < p90 historico do modelo: borda #F59E0B + warning "Timeout ({X}s) abaixo do p90 historico ({Y}s) deste modelo. Risco de abort prematuro." (fundo #FFFBEB).
- Ao alterar timeout: **modal de impacto** similar ao de modelo, focado em: % estimado de aborts com novo timeout vs anterior.

**Modal de Impacto ao Alterar Timeout**:

```
+--------------------------------------------------+
| Confirmar Alteracao de Timeout                   |
|--------------------------------------------------|
| Fase: Guia Destino                               |
| Timeout anterior: 25s                            |
| Novo timeout: 15s                                |
|                                                  |
| Impacto estimado:                                |
| +----------------------------------------------+ |
| | % de aborts esperado: 2% --> 12%             | |
| | Baseado nos ultimos 500 requests             | |
| +----------------------------------------------+ |
|                                                  |
| [Cancelar]                   [Confirmar Timeout] |
+--------------------------------------------------+
```

**Indicador de Config Ativa**:

- Canto superior direito: badge com "Config ativa agora: v{N}" em fundo #E6F7F4 + texto #065F46.
- Abaixo da tabela: "Ultima alteracao ha X min por {admin}" em 12px #94A3B8.
- Se houve alteracao por outro admin nos ultimos 5min: toast info "Configuracao atualizada por {admin} ha {X} min."

**Loading State**: Skeleton da tabela (6 linhas). Dropdowns desabilitados.
**Empty State**: "Nenhuma fase configurada." (improvavel em producao — tratar como erro).
**Error State**: "Nao foi possivel carregar a configuracao de modelos. Tente novamente."

---

### 4.4 Curadoria de Outputs — /admin/ia/outputs

**Proposito**: Revisar geracoes de IA, identificar bias/alucinacoes/riscos, e manter registro de qualidade.

**Layout**:

```
+------------------------------------------------------------------+
| Outputs de IA                                                     |
+------------------------------------------------------------------+
| Filtros: [Flag: Todas v] [Fase: Todas v] [Modelo: Todos v]      |
|          [Periodo: Ultimos 7 dias v]  [Status: Todos v]          |
+------------------------------------------------------------------+
|                                                                    |
| +----------------------------------------------------------------+|
| | Expedicao        | Fase     | Modelo    | Prompt | Preview   | ||
| |------------------|----------|-----------|--------|-----------|--||
| | Lisboa Jun/26    | Guia     | Sonnet4.6 | v3.2   | "Lisboa e | ||
| |                  |          |           |        | uma cida."| ||
| |                  |          |           |        |  [flags]  | ||
| |------------------|----------|-----------|--------|-----------|--||
| | Tokyo Set/26     | Roteiro  | Opus 4.7  | v2.1   | "Dia 1:  | ||
| |                  |          |           |        | Shibuya." | ||
| |                  |          |           |        |  [flags]  | ||
| +----------------------------------------------------------------+|
|                                                                    |
| [< Anterior]  Pagina 1 de 23  [Proximo >]                        |
|                                                                    |
| === Painel de Detalhes (expande ao clicar em uma linha) ========  |
|                                                                    |
| Expedicao: Lisboa Junho 2026 (user: joao@email.com)              |
| Fase: Guia Destino | Modelo: Sonnet 4.6 | Prompt: v3.2          |
| Gerado em: 17/04/2026 14:32 | Latencia: 8.2s | Tokens: 1.450   |
|                                                                    |
| +--------------------------------------------------------------+ |
| | [Conteudo completo da geracao renderizado]                    | |
| +--------------------------------------------------------------+ |
|                                                                    |
| Flags:                                                             |
| [Bias]  [Alucinacao]  [Risco]                                    |
|                                                                    |
| Comentario do admin:                                               |
| +--------------------------------------------------------------+ |
| | [textarea — placeholder: "Descreva o problema encontrado..."]| |
| +--------------------------------------------------------------+ |
|                                                                    |
| Status: ( ) Revisado  ( ) Flagged  ( ) Escalado                  |
|                                                                    |
| [Salvar Revisao]                                                  |
+------------------------------------------------------------------+
```

**Tabela de Outputs**:

- Colunas: Expedicao (nome + destino), Fase, Modelo, Versao Prompt, Preview (primeiros 60 chars), Flags.
- Preview: texto truncado com ellipsis. Fonte monospace 13px para diferenciar de UI text.
- Flags na coluna: icones coloridos se flagged:
  - Bias: icone triangulo amarelo #F59E0B.
  - Alucinacao: icone raio vermelho #D93B2B.
  - Risco: icone escudo vermelho #DC2626.
  - Sem flags: vazio.
- Linha clicavel: expande painel de detalhes abaixo.
- Paginacao: 20 itens por pagina. Botoes "< Anterior" e "Proximo >" com indicador de pagina.

**Painel de Detalhes (expandido)**:

- Header: metadados em 2 linhas (expedicao, user, fase, modelo, prompt version, timestamp, latencia, tokens).
- Conteudo: card com fundo #F7F9FC, borda #E2E8F0, padding 16px. Texto da geracao completo. Scroll interno se > 400px de altura.
- Botoes de Flag: 3 toggle buttons. Inativo: outline cinza. Ativo: fundo semantico + icone. Multiplos flags podem estar ativos simultaneamente.
  - Bias ativo: fundo #FFFBEB, borda #F59E0B, texto #92400E.
  - Alucinacao ativo: fundo #FDF2F1, borda #D93B2B, texto #991B1B.
  - Risco ativo: fundo #FDF2F1, borda #DC2626, texto #7F1D1D.
- Comentario: textarea com label "Comentario do admin", placeholder "Descreva o problema encontrado...", max 500 chars, contador de caracteres.
- Status: radio group — Revisado (neutro), Flagged (warning), Escalado (error).
- Botao "Salvar Revisao": solid primary. Toast: "Revisao salva."

**Filtros**:

- 5 dropdowns em linha (flex-wrap em telas menores):
  1. Tipo de flag: Todas | Bias | Alucinacao | Risco | Sem flag.
  2. Fase: Todas | Checklist | Guia | Roteiro | Preparo | ... (dinamico).
  3. Modelo: Todos | [lista de modelos ativos].
  4. Periodo: Ultimos 7 dias | 30 dias | 90 dias | Personalizado.
  5. Status: Todos | Pendente | Revisado | Flagged | Escalado.
- Ao alterar filtro: tabela recarrega com skeleton. URL reflete filtros (query params) para compartilhamento.

**Loading State**: Skeleton da tabela (5 linhas pulsantes). Filtros desabilitados durante carga.
**Empty State**: "Nenhuma geracao encontrada para os filtros selecionados." com link "Limpar filtros."
**Error State**: "Nao foi possivel carregar os outputs. Tente novamente."

---

## 5. Padroes de Interacao

### Transicoes entre Telas

- Tabs no topo da pagina /admin/ia. Tab ativa: borda inferior 2px #E8621A + texto bold #1A202C. Tabs inativas: texto #5C6B7A.
- Troca de tab: conteudo aparece imediatamente (sem animacao de transicao — consistente com tabs convencionais em admin).
- URL atualiza para refletir tab ativa (/admin/ia, /admin/ia/prompts, /admin/ia/models, /admin/ia/outputs).
- Back/forward do navegador funciona entre tabs.

### Feedback de Loading

- Skeleton loaders para dados tabulares e KPI cards.
- Spinner inline para acoes (salvar, rodar eval, promover).
- Barra de progresso indeterminada para evals longos (10-60s).
- Optimistic updates para toggles de flag (reverte em erro).

### Feedback de Sucesso

- Toast auto-dismiss 4s com progress bar, posicao bottom-right, consistente com padrao do app.
- Mensagens especificas por acao (nunca generico "Sucesso!"):
  - "Prompt v{X} promovido para producao."
  - "Timeout atualizado. Proximas geracoes usarao nova configuracao."
  - "Revisao salva."
  - "Rascunho salvo como v{X}."

### Feedback de Erro

- Toast de erro (borda #D93B2B, fundo #FDF2F1) para falhas de acao.
- Inline error para validacao de campos (abaixo do campo, 12px, #D93B2B).
- Banner de erro com retry para falhas de carga de secao.
- Nunca culpar o usuario. Sempre oferecer acao de recuperacao.

### Modais de Confirmacao

- Obrigatorios para: trocar modelo, alterar timeout, promover prompt, rollback prompt, kill-switch.
- Estrutura: titulo + contexto + card de impacto + botoes.
- Foco preso no modal. Escape fecha (equivale a Cancelar).
- Botao destrutivo/primario a direita. Cancelar a esquerda.
- Overlay: fundo #000000 50% opacity.

### Progressive Disclosure

- Dashboard: alertas e quick actions so aparecem se relevantes (alertas so com problemas; quick actions sempre visiveis).
- Prompts: editor expande ao selecionar template (nao pre-carrega todos os editores).
- Outputs: painel de detalhes expande ao clicar na linha.
- Modelos: warnings de validacao aparecem apenas quando valores estao fora do esperado.

---

## 6. Requisitos de Acessibilidade (OBRIGATORIO)

- **Nivel WCAG**: AA (minimo, inegociavel)

### Navegacao por Teclado
- [x] Todos os elementos interativos acessiveis via Tab
- [x] Tabs navegaveis com Arrow Left/Right (padrao roving tabindex)
- [x] Tab order segue ordem logica de leitura: tabs > KPIs > graficos > alertas > quick actions
- [x] Focus indicator visivel em todos os elementos: outline 2px solid #E8621A, offset 2px
- [x] Sem keyboard traps
- [x] Modais prendem foco ate serem fechados
- [x] Escape fecha modais e retorna foco ao trigger
- [x] Tabela de prompts/outputs: Enter ou Space para expandir linha selecionada
- [x] Dropdowns de modelo: navegaveis com Arrow Up/Down, Enter para selecionar

### Leitor de Tela
- [x] Todos os KPI cards: aria-label descritivo (ex: "Total de chamadas: 1284, aumento de 12% em relacao a semana anterior")
- [x] Graficos: aria-label com resumo textual (ex: "Grafico de tendencia de custo: crescimento de 8% nos ultimos 7 dias")
- [x] Alertas: aria-live="polite" para novos alertas. role="alert" para alertas criticos.
- [x] Toasts: aria-live="polite" (padrao existente)
- [x] Status badges: aria-label (ex: "Status: draft") — nao depender apenas de cor
- [x] Trust score: aria-label com valor e classificacao (ex: "Trust score: 0.87, bom")
- [x] Botoes desabilitados: aria-disabled="true" + tooltip via aria-describedby
- [x] Tabela de outputs: role="table" com th/td semanticos
- [x] Linha expandivel: aria-expanded="true/false" no trigger
- [x] Modais: aria-modal="true" + aria-labelledby + aria-describedby
- [x] Textarea de comentario: aria-label="Comentario do administrador" + aria-describedby para contador
- [x] Radio group de status: role="radiogroup" + aria-labelledby
- [x] Todos os inputs de formulario com labels visiveis e associados

### Cor e Contraste
- [x] Texto: contraste >= 4.5:1 (verificado: #1A202C sobre #FFFFFF = 16.7:1; #94A3B8 sobre #FFFFFF = 3.5:1 — usar #6B7280 para labels pequenos, contraste 5.7:1)
- [x] UI components: contraste >= 3:1
- [x] Nenhuma informacao transmitida apenas por cor: todos os badges tem texto, todos os alertas tem icone + texto, trust score tem valor numerico + badge textual
- [x] Status de flag: alem da cor, cada flag tem icone distinto (triangulo, raio, escudo)

### Movimento
- [x] Todas as animacoes respeitam `prefers-reduced-motion`: skeleton loaders param de pulsar, toasts aparecem sem slide
- [x] Nenhum conteudo auto-avancante

**Correcao de contraste**: Labels de KPI cards mudam de #94A3B8 (3.5:1, falha) para #6B7280 (5.7:1, passa) para texto 12px.

---

## 7. Especificacoes Visuais

### Tipografia

| Elemento | Tamanho | Peso | Cor |
|---|---|---|---|
| Titulo da pagina | 24px | Bold (700) | #1A202C |
| Titulo de secao | 18px | Semibold (600) | #1A202C |
| Titulo de card | 16px | Bold (700) | #1A202C |
| Label de KPI | 12px | Regular (400), uppercase | #6B7280 |
| Valor de KPI | 28px | Bold (700) | #1A202C (ou semantico) |
| Tendencia | 12px | Medium (500) | semantico (verde/vermelho) |
| Corpo de tabela | 14px | Regular (400) | #1A202C |
| Header de tabela | 12px | Semibold (600), uppercase | #6B7280 |
| Texto de alerta | 14px | Medium (500) | semantico |
| Texto de toast | 14px | Regular (400) | #1A202C |
| Placeholder | 14px | Regular (400) | #94A3B8 |
| Texto de rodape/meta | 12px | Regular (400) | #6B7280 |

### Espacamento (8pt grid)

| Token | Valor | Uso |
|---|---|---|
| --space-xs | 4px | Espacamento entre icone e texto |
| --space-sm | 8px | Padding interno de badges |
| --space-md | 16px | Padding de celulas de tabela |
| --space-lg | 24px | Gap entre cards/secoes |
| --space-xl | 32px | Margem lateral da pagina |
| --space-2xl | 48px | Gap entre secoes principais |

### Raios de Borda

| Elemento | Raio |
|---|---|
| Cards (KPI, graficos) | 12px |
| Badges de status | 9999px (pill) |
| Inputs, dropdowns | 8px |
| Modais | 12px |
| Botoes | 8px |
| Tabelas | 8px (container externo) |

### Sombras

| Elemento | Sombra |
|---|---|
| Cards elevados | 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06) |
| Modais | 0 20px 25px rgba(0,0,0,0.15), 0 8px 10px rgba(0,0,0,0.1) |
| Dropdowns abertos | 0 4px 6px rgba(0,0,0,0.1) |
| Toasts | 0 4px 12px rgba(0,0,0,0.15) |

---

## 8. Comportamento Responsivo

Esta feature e desktop-only (admin). Nao ha design mobile otimizado.

| Breakpoint | Comportamento |
|---|---|
| < 1024px | Banner fixo no topo: "Para melhor experiencia, acesse o painel pelo desktop." (fundo #EFF6FF, borda #3B82F6, padding 12px). Conteudo renderiza empilhado (single column). Tabelas em scroll horizontal. Funcional mas nao otimizado. |
| 1024px — 1440px | Layout principal. KPI cards: 3+3 (2 linhas). Graficos: 2 colunas. Tabelas: full width. Editor de prompt abaixo da tabela. |
| > 1440px | KPI cards: 6 em linha. Graficos: 2 colunas. Editor de prompt ao lado da tabela de templates (split view 40/60). |

---

## 9. Conteudo e Microcopy

### Labels e CTAs

| Key | PT-BR |
|---|---|
| page_title | Painel de IA |
| tab_dashboard | Dashboard |
| tab_prompts | Prompts |
| tab_models | Modelos |
| tab_outputs | Outputs |
| tab_evals | Evals |
| cta_run_eval | Rodar Eval Completo |
| cta_kill_switch | Pausar Geracao |
| cta_resume | Retomar Geracao |
| cta_save_draft | Salvar Rascunho |
| cta_promote | Promover |
| cta_rollback | Rollback |
| cta_save_review | Salvar Revisao |
| cta_confirm_model | Confirmar Troca |
| cta_confirm_timeout | Confirmar Timeout |
| cta_cancel | Cancelar |
| label_last_change | Ultima alteracao: ha {time} por {admin} |
| label_config_active | Config ativa agora: v{version} |
| label_trust_score | Trust Score |
| label_no_alerts | Todos os indicadores dentro do esperado. |

### Mensagens de Erro

| Cenario | PT-BR |
|---|---|
| load_failure | Nao foi possivel carregar {section}. Tente novamente. |
| save_failure | Alteracao nao salva. Verifique sua conexao e tente novamente. |
| eval_failure | Avaliacao falhou. Tente novamente. |
| eval_timeout | Avaliacao demorou mais que o esperado. Resultados parciais disponiveis. |
| timeout_range | Timeout deve ser entre 5s e 55s. |
| timeout_sum | Soma dos timeouts ({X}s) excede o limite de 55s. |
| timeout_p90 | Timeout ({X}s) abaixo do p90 historico ({Y}s). Risco de abort prematuro. |
| concurrent_edit | Configuracao alterada por outro admin. Recarregue para ver a versao atual. |
| feature_disabled | Central de IA nao esta ativa neste ambiente. |
| unauthorized | Acesso restrito a administradores. |

### Mensagens de Sucesso (Toasts)

| Cenario | PT-BR |
|---|---|
| prompt_promoted | Prompt v{X} promovido para producao. |
| prompt_saved | Rascunho salvo como v{X}. |
| prompt_rollback | Revertido para v{X}. Versao anterior arquivada. |
| model_changed | Mudanca aplicada. Proximas geracoes usarao a nova configuracao. |
| timeout_changed | Timeout atualizado. |
| review_saved | Revisao salva. |
| kill_switch_on | Geracao de IA pausada. Usuarios verao mensagem de indisponibilidade. |
| kill_switch_off | Geracao de IA retomada. |

### Tom de Voz

- **Informativo e direto**: admin nao precisa de linguagem acolhedora como viajante, mas precisa de clareza absoluta.
- **Nunca ambiguo**: "Proximas geracoes usarao nova configuracao" — nao "alteracoes serao aplicadas em breve".
- **Quantitativo**: sempre que possivel, mostrar numeros, nao adjetivos. "+5x custo" e melhor que "significativamente mais caro".
- **Alertas sem panico**: "Trust score caiu para 0.72" e factual. Nao "ALERTA CRITICO: TRUST SCORE EM QUEDA!".

---

## 10. Restricoes (do Produto/Arquitetura)

- Feature flag `AI_GOVERNANCE_V2` controla visibilidade da aba inteira.
- Alteracoes de modelo/timeout aplicadas em real-time via polling DB (sem deploy).
- Desktop-only: admin nao tem requisito mobile.
- Polling definido pelo arquiteto — UX nao prescreve frequencia, apenas indica necessidade de indicador "config ativa agora".
- Consistencia visual com admin dashboard existente (SPEC-UX-044): mesmos tokens, mesmos padroes de card, mesma tipografia.

---

## 11. Prototype

- [ ] Prototype required: Sim (fase separada — nao incluso neste spec)
- **Location**: `docs/prototypes/ai-governance-v2.html` (a ser produzido)
- **Scope**: Dashboard + Prompts + Modelos
- **Notes**: Prototype sera self-contained HTML/CSS

---

## 12. Open Questions

- [ ] **PO**: Quais fases exatamente aparecem na tabela de modelos? Todas as 6 fases que usam IA, ou ha fases que nao usam IA?
- [ ] **PO**: A tab "Evals" (mencionada nas tabs) tem tela propria ou e apenas o painel inline do editor de prompts?
- [ ] **PO**: Kill-switch pausa todas as geracoes ou permite granularidade por fase?
- [ ] **PO**: Limite de versoes armazenadas por template de prompt? (impacto no diff viewer)
- [ ] **Architect**: Frequencia de polling para atualizacao de metricas e deteccao de alteracoes concorrentes.
- [ ] **Architect**: Biblioteca de graficos a ser utilizada (Recharts? Chart.js? Nivo?).
- [ ] **Architect**: Mecanismo de syntax highlighting para o editor de prompts (CodeMirror? Monaco? Textarea simples com regex?).
- [ ] **FinOps**: Budget semanal para o alerta "custo acima do budget" — valor fixo ou configuravel pelo admin?
- [ ] **Prompt Engineer**: Dados mock para preview do editor de prompts — quais campos sao necessarios por tipo de template?

---

> **Spec Status**: Draft
> **Ready for**: Architect (apos resolucao de open questions pelo PO)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-17 | ux-designer | Initial draft — Sprint 45 |
