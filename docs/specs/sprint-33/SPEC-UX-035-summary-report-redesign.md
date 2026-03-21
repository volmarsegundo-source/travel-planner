# SPEC-UX-035: Redesenho do Sumario/Relatorio da Expedicao — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-032
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Contexto e Objetivo do Viajante

O viajante quer visualizar um panorama completo de toda a sua expedicao a qualquer momento apos a Fase 2, revisando os dados ja preenchidos e identificando rapidamente o que ainda falta completar. O relatorio deve ser a "fonte da verdade" consolidada da expedicao, acessivel, imprimivel e transparente sobre pendencias.

## 2. Personas Afetadas

| Persona | Como esta feature os serve |
|---|---|
| `@leisure-solo` | Revisa planejamento em multiplas sessoes; relatorio consolida tudo num so lugar |
| `@leisure-family` | Precisa compartilhar o planejamento com parceiro(a); impressao/PDF facilita coordenacao |
| `@business-traveler` | Necessita relatorio formatado para prestacao de contas e reembolso corporativo |
| `@bleisure` | Revisa o planejamento misturando contextos pessoal e profissional; visao consolidada e essencial |
| `@group-organizer` | Compartilha relatorio com o grupo para validacao coletiva antes de confirmar reservas |
| `@travel-agent` | Usa o relatorio como entregavel ao cliente; precisa de formato profissional e completo |

## 3. Fluxo do Usuario

### Acesso ao relatorio

```
[Dashboard / Lista de Expedicoes]
    |
    v
[Card da expedicao com fase >= 2 completa]
    |
    v
[Botao "Ver Relatorio" visivel no card] --> [Clica]
    |
    v
[Pagina do relatorio completo: /expedition/[tripId]/report]
    |
    v
[Carregamento: skeleton loading por secao]
    |
    v
[Relatorio renderizado com todas as secoes]
```

### Navegacao no relatorio

```
[Topo do relatorio: Hero + Barra de completude + Painel de pendencias]
    |
    v
[Indice de secoes (ancoras)] --> [Clica em secao] --> [Scroll para secao]
    |
    v
[Secao da Fase 1: O Explorador]
[Secao da Fase 2: O Destino]
[Secao da Fase 3: O Preparo]
[Secao da Fase 4: A Logistica]
[Secao da Fase 5: O Guia]
[Secao da Fase 6: O Roteiro]
```

### Exportar/Imprimir

```
[Barra de acoes flutuante (topo ou lateral)]
    |
    +-- [Botao "Imprimir"] --> [Abre print dialog do navegador, @media print aplicado]
    |
    +-- [Botao "Exportar PDF"] --> [Gera PDF em background] --> [Download automatico]
```

### Revelar codigo de reserva

```
[Codigo de reserva mascarado: "AB****XY"]
    |
    v
[Botao "Revelar" (icone de olho)]
    |
    v
[Codigo completo exibido por 10 segundos] --> [Auto-mascara novamente]
```

### Caso: Fase nao iniciada

```
[Secao da fase no relatorio]
    |
    v
[Estado vazio: "Nao preenchido ainda"]
    |
    v
[Botao: "Ir para [nome da fase]"] --> [Navega para a fase correspondente]
```

### Caso: Fase parcialmente preenchida

```
[Secao da fase no relatorio]
    |
    v
[Dados preenchidos exibidos normalmente]
    |
    v
[Itens pendentes destacados em laranja: "Pendente: [descricao do que falta]"]
    |
    v
[Botao: "Completar [nome da fase]"] --> [Navega para a fase correspondente]
```

## 4. Especificacao Visual

### 4.1 Tela: Pagina do Relatorio

**Proposito**: Consolidar TODOS os dados da expedicao em uma unica pagina legivel, com destaque para pendencias.

**Layout geral**:
- Pagina full-width com conteudo centralizado (max-width: 960px em desktop)
- Fundo: cor de fundo da pagina (#F7F9FC)
- Sem sidebar; navegacao por indice fixo no topo (desktop) ou acordeao (mobile)

**Hierarquia de conteudo** (de cima para baixo):

#### A. Hero do Relatorio

- Gradient de fundo usando a mesma cor do cover da expedicao (gradientes definidos em ux-patterns.md)
- Nome da expedicao (h1, fonte grande, branca sobre gradient)
- Destino + Datas da viagem (subtitulo)
- Contagem regressiva inline (componente TripCountdownInline existente) se datas futuras
- Emoji da expedicao no canto

#### B. Barra de Completude

- Barra horizontal de progresso (estilo MiniProgressBar)
- Percentual exibido: "65% completo" com numero grande e barra preenchida
- Cor de preenchimento: var(--color-accent) #2DB8A0 (teal)
- Fundo da barra: #E2E8F0 (cinza claro)
- Posicao: imediatamente abaixo do hero
- Largura: 100% do container do conteudo
- Altura: 12px com border-radius completo

#### C. Painel de Pendencias

- Visivel SOMENTE quando ha secoes incompletas (desaparece quando 100%)
- Fundo: #FFF7ED (laranja claro, nao vermelho — pendencia nao e erro, e orientacao)
- Borda esquerda: 4px solid #F59E0B (laranja/amber)
- Titulo: "Pendencias da sua expedicao" (h2)
- Lista de itens pendentes, agrupados por fase:
  - Cada item: nome da fase + descricao do que falta + link "Completar" que navega para a fase
- Border-radius: 8px
- Padding: 16px

#### D. Indice de Secoes (Table of Contents)

- Lista horizontal de links (desktop) ou dropdown (mobile)
- Cada link e uma ancora para a secao correspondente
- Secoes completas: texto normal
- Secoes com pendencias: texto com bullet laranja
- Secoes nao iniciadas: texto em cinza/muted
- Posicao: sticky no topo ao scrollar (desktop), abaixo do painel de pendencias

#### E. Cards de Secao (um por fase)

Cada fase e representada por um card de secao:

**Layout do card**:
- Fundo: #FFFFFF (superficie)
- Borda: 1px solid #E2E8F0
- Border-radius: 12px
- Padding: 24px
- Margin-bottom: 24px
- Borda esquerda colorida (4px) indicando status:
  - Verde (#10B981): fase completa
  - Laranja (#F59E0B): fase parcialmente preenchida
  - Cinza (#9CA3AF): fase nao iniciada

**Header do card**:
- Icone da fase (emoji) + Nome da fase (h2) + Badge de status ("Completo" / "Em andamento" / "Nao iniciado")
- Link "Editar" (icone de lapis) alinhado a direita — navega para a fase em modo edicao

**Corpo do card — dados preenchidos**:
- Layout de key-value pairs em grid (2 colunas em desktop, 1 em mobile)
- Labels em cinza/muted, valores em texto primario
- Valores exibidos INTEGRALMENTE sem truncamento ou abreviacao
- Itens de checklist com checkbox visual (marcado/desmarcado)
- Listas (transporte, hospedagem) em sub-cards dentro do card principal

**Itens pendentes dentro do card**:
- Fundo: #FFF7ED (laranja claro)
- Texto: "Pendente: [campo/dado que falta]"
- Icone: relogio ou circulo vazio antes do texto
- Nao destacado em vermelho (nao e erro, e informacao orientadora)

**Codigo de reserva (bookingCode)**:
- Exibido mascarado por padrao: "AB****XY" (2 primeiros + 2 ultimos caracteres)
- Botao "Revelar" (icone de olho) ao lado
- Ao clicar: exibe codigo completo por 10 segundos, depois auto-mascara
- Anuncio de estado via `aria-live`: "Codigo revelado" / "Codigo ocultado"

#### F. Barra de Acoes (Action Bar)

- Posicao: fixa no fundo da pagina (mobile) ou flutuante no topo (desktop, apos scroll)
- Botoes:
  1. "Imprimir" — icone de impressora, abre dialog de impressao do navegador
  2. "Exportar PDF" — icone de download, gera e baixa PDF
- Estilo: botoes outline/secundarios em container com fundo semi-transparente
- Em mobile: barra fixa no bottom com os 2 botoes lado a lado

### 4.2 Layout de Impressao (@media print)

- Fundo: branco puro
- Sem gradient no hero (substituir por texto preto sobre fundo branco)
- Sem barra de acoes, indice sticky, ou elementos interativos
- Todas as secoes expandidas (sem acordeao)
- Codigos de reserva: exibidos MASCARADOS na impressao (seguranca)
- Botao "Revelar" nao aparece na impressao
- Layout: A4, margens de 20mm
- Quebra de pagina inteligente: nunca cortar um card de secao no meio (`break-inside: avoid`)
- Logo do Atlas no header da impressao + URL da expedicao no footer

### 4.3 Estado de Loading

- Skeleton loading por secao: cada card de secao renderiza como retangulo cinza pulsante
- Hero: skeleton com gradient placeholder
- Barra de completude: skeleton animado
- Esqueletos carregam de cima para baixo na ordem das fases
- Tempo maximo esperado: < 2 segundos (4G)

### 4.4 Estado de Erro

- Se o carregamento do relatorio falhar: pagina de erro com mensagem "Nao foi possivel carregar o relatorio. Tente novamente." + botao "Tentar novamente"
- Se uma secao individual falhar: card da secao com mensagem de erro inline, demais secoes carregam normalmente
- Nunca culpar o usuario. Tom: "Algo deu errado do nosso lado."

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Cards de secao empilhados verticalmente, largura total. Secoes em acordeao (expandir/recolher) — Fase 1 expandida por padrao, demais recolhidas. Indice de secoes como dropdown select. Barra de acoes fixa no bottom. Key-value pairs em 1 coluna. Barra de completude abaixo do hero em largura total. Touch targets minimos: 44x44px. |
| Tablet (768-1024px) | Layout similar ao mobile, mas sem acordeao (secoes sempre expandidas). Indice horizontal com scroll. Key-value pairs em 2 colunas. Barra de acoes no topo, sticky. |
| Desktop (> 1024px) | Conteudo centralizado com max-width 960px. Indice sticky no topo. Key-value pairs em 2 colunas. Cards de secao com padding generoso (24px). Barra de acoes flutuante no topo direito. |

## 6. Acessibilidade (WCAG 2.1 AA — Obrigatorio)

### Estrutura semantica

- [ ] Pagina usa `<main>` para o conteudo do relatorio
- [ ] Cada secao de fase: `<section>` com `<h2>` para o nome da fase
- [ ] Sub-secoes: `<h3>` (ex.: "Transporte", "Hospedagem" dentro da Fase 4)
- [ ] Indice de secoes: `<nav>` com `aria-label="Indice do relatorio"`
- [ ] Navegacao por headings funcional para leitores de tela

### Navegacao por teclado

- [ ] Links do indice e ancoras navegaveis via Tab
- [ ] Link "Editar" em cada card: acessivel via Tab, com `aria-label` descritivo ("Editar Fase 1: O Explorador")
- [ ] Botao "Revelar" codigo de reserva: acessivel via Tab, estado anunciado
- [ ] Acordeao mobile: ativado por Enter/Space, estado expandido/recolhido anunciado
- [ ] Barra de acoes: botoes navegaveis via Tab
- [ ] Focus indicator: 2px solid var(--color-primary), outline-offset 2px

### Leitores de tela

- [ ] Barra de completude: `role="progressbar"` com `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Completude da expedicao"`
- [ ] Painel de pendencias: `role="alert"` ou `aria-live="polite"` quando aparece
- [ ] Status de secao (completo/parcial/nao iniciado) comunicado por texto, nao apenas borda colorida
- [ ] Codigo de reserva mascarado: `aria-label` indica "Codigo de reserva mascarado. Pressione para revelar."
- [ ] Estado revelado/ocultado anunciado via `aria-live="polite"`
- [ ] Itens de checklist: `role="list"` com cada item indicando status (marcado/nao marcado)

### Contraste e cor

- [ ] Texto sobre fundo do hero (gradient): contraste >= 4.5:1 (usar overlay escuro sobre gradient se necessario)
- [ ] Texto de pendencia (laranja sobre fundo claro): verificar contraste >= 4.5:1 — usar #92400E (amber-800) sobre #FFF7ED = 7.2:1 (passa)
- [ ] Status de secao comunicado por texto + borda (nao apenas cor)
- [ ] Links no indice: distinguidos por sublinhado, nao apenas por cor

### Touch targets

- [ ] Botoes de acao (Imprimir, PDF): minimo 44x44px
- [ ] Links do indice: minimo 44x44px de area de toque
- [ ] Botao "Revelar" codigo: minimo 44x44px
- [ ] Acordeao (mobile): header clicavel com minimo 44px de altura

### Motion

- [ ] Skeleton loading: animacao de pulso respeita `prefers-reduced-motion`
- [ ] Smooth scroll (ancoras): respeita `prefers-reduced-motion` (instantaneo quando reduzido)
- [ ] Acordeao (expandir/recolher): animacao de altura respeita `prefers-reduced-motion`

## 7. Conteudo e Microcopy

### Labels e CTAs

| Chave i18n | PT-BR | EN |
|---|---|---|
| `report.title` | Relatorio da Expedicao | Expedition Report |
| `report.completion` | {percent}% completo | {percent}% complete |
| `report.pendingPanel.title` | Pendencias da sua expedicao | Your expedition pending items |
| `report.pendingPanel.complete` | Completar | Complete |
| `report.sectionStatus.complete` | Completo | Complete |
| `report.sectionStatus.partial` | Em andamento | In progress |
| `report.sectionStatus.notStarted` | Nao iniciado | Not started |
| `report.notFilledYet` | Nao preenchido ainda | Not filled in yet |
| `report.goToPhase` | Ir para {phaseName} | Go to {phaseName} |
| `report.edit` | Editar | Edit |
| `report.print` | Imprimir | Print |
| `report.exportPdf` | Exportar PDF | Export PDF |
| `report.revealCode` | Revelar | Reveal |
| `report.hideCode` | Ocultar | Hide |
| `report.pending` | Pendente: {description} | Pending: {description} |
| `report.viewReport` | Ver Relatorio | View Report |

### Mensagens de erro

| Cenario | PT-BR | EN |
|---|---|---|
| `report.error.loadFailed` | Nao foi possivel carregar o relatorio. Tente novamente. | Could not load the report. Please try again. |
| `report.error.sectionFailed` | Nao foi possivel carregar esta secao. | Could not load this section. |
| `report.error.pdfFailed` | Nao foi possivel gerar o PDF. Tente novamente. | Could not generate the PDF. Please try again. |
| `report.error.retry` | Tentar novamente | Try again |

### Tom de voz

- Relatorio e afirmativo e orientador. "65% completo" transmite progresso, nao falha.
- Pendencias sao oportunidades, nao erros. "Pendencias da sua expedicao" (neutro), nao "Itens faltantes" (negativo).
- Fases nao iniciadas: "Nao preenchido ainda" (temporal, implica que sera feito), nao "Vazio" (final).

## 8. Padroes de Interacao

- **Acordeao mobile**: Tap para expandir/recolher. Animacao de altura 200ms ease-out. Com `prefers-reduced-motion`: transicao instantanea.
- **Smooth scroll (ancoras)**: `scroll-behavior: smooth` com `prefers-reduced-motion: auto`.
- **Revelar codigo**: Transicao de texto 150ms. Auto-oculta apos 10 segundos com fade-out.
- **Skeleton loading**: Animacao de pulso sutil (opacity 0.5 a 1, 1.5s ciclo).
- **Indice sticky**: Sombra inferior sutil quando sticky ativo (box-shadow 0 2px 4px rgba(0,0,0,0.05)).

## 9. Restricoes (da Spec de Produto)

- Relatorio e read-only — nenhuma edicao direta; links levam as fases para edicao.
- BOLA: relatorio so acessivel pelo dono da expedicao.
- Data de nascimento (birthDate) NAO aparece no relatorio (restricao de SPEC-SEC-003).
- Codigos de reserva decifrados apenas para o usuario autenticado, nunca em HTML estatico cacheado.
- Meta `noindex` na pagina (nao indexavel).
- Tempo de carregamento: < 2 segundos em 4G para expedicao completa.
- PDF gerado em background ou nova aba — nao bloqueia a UI.
- Reutilizar logica de `expedition-summary.service.ts` existente.

## 10. Prototipo

- [ ] Prototipo necessario: Sim
- **Localizacao**: `docs/prototypes/summary-report-redesign.html`
- **Escopo**: Pagina completa com hero, barra de completude, painel de pendencias, 6 cards de secao (com variantes: completo, parcial, nao iniciado), barra de acoes
- **Status**: A criar apos aprovacao da spec

## 11. Questoes Abertas

- [ ] Abordagem de geracao de PDF: CSS `@media print` + dialog nativo do navegador, ou geracao server-side? Recomendacao UX: print dialog nativo para "Imprimir", e geracao server-side apenas para "Exportar PDF" (se viabilidade tecnica confirmada pelo architect). Se server-side nao for viavel no sprint, aceitar apenas print dialog como MVP.
- [ ] Quantidade maxima de itens no painel de pendencias: listar TODOS os itens pendentes de todas as fases, ou agrupar por fase com contagem? Recomendacao UX: agrupar por fase com descricao (sem contagem numerica — descritivo e mais util).
- [ ] Ordem das secoes no acordeao mobile: expandir a primeira fase incompleta por padrao (em vez da Fase 1)? Recomendacao UX: expandir Fase 1 sempre (e a identidade da expedicao), mas auto-scroll para a primeira fase incompleta se o viajante veio do painel de pendencias.

## 12. Padroes Reutilizados

- `TripCountdownInline` (existente) — no hero do relatorio
- `MiniProgressBar` (SPEC-UX-007) — adaptado para barra de completude
- `ErrorBoundaryCard` (existente) — para erros de secao individual
- Cover gradients (ux-patterns.md) — no hero do relatorio
- Status badges (ux-patterns.md) — nos cards de secao
- Motion tokens: fast(150ms), normal(200ms), slow(300ms) de SPEC-UX-003

---

> **Status da Spec**: Draft
> **Pronto para**: Architect (apos resolucao da questao de geracao de PDF)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | ux-designer | Rascunho inicial — Sprint 33 |
