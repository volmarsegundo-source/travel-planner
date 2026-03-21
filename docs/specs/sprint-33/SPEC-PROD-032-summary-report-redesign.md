# SPEC-PROD-032: Redesenho do Sumario/Relatorio da Expedicao (IMP-004)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Problem Statement

O relatorio de expedicao atual so pode ser acessado apos a conclusao da Fase 6, exige que todos os dados estejam completos, e apresenta informacoes resumidas ou abreviadas. Isso cria tres problemas:

1. **Acesso tardio**: O viajante que concluiu as Fases 2-4 e ainda esta em planejamento nao consegue ver um relatorio consolidado do que ja preencheu — uma oportunidade perdida de engajamento e de revisao.

2. **Dados truncados**: Abreviacoes e resumos impactam a confianca do usuario. Em planejamento de viagem, o viajante precisa ver EXATAMENTE o que registrou, nao uma versao condensada do sistema.

3. **Pendencias ocultas**: O relatorio atual nao destaca claramente o que ainda falta ser preenchido, impedindo o viajante de ter visibilidade do seu progresso de forma orientada.

Referencia de mercado: TripIt exibe um relatorio completo de todos os segmentos de viagem com documentos originais; Wanderlog mostra a viagem completa com mapa + timeline + orcamento mesmo em viagens em andamento; Google Trips consolidava todos os dados por trip mesmo sem confirmacoes de booking finais. O padrao de mercado e: **mostrar tudo, sempre, com clareza sobre o que esta pendente.**

## 2. User Story

As a @leisure-solo,
I want to access a complete trip report from the Dashboard after completing Phase 2,
so that I can review all data I've entered, identify what's still missing, and share or print my planning progress at any stage.

### Traveler Context

- **Pain point**: O viajante completa horas de planejamento nas Fases 1-5, mas so consegue ver um sumario do resultado ao completar a Fase 6 inteira. Sem visibilidade consolidada do que preencheu, o viajante perde a sensacao de progresso e a motivacao para continuar.
- **Current workaround**: O viajante tira screenshots de cada fase individualmente ou anota em planilha separada para ter uma visao consolidada.
- **Frequency**: Toda sessao de planejamento — o viajante naturalmente quer revisar o que ja preencheu antes de continuar.

## 3. Acceptance Criteria

### Acesso ao Relatorio

- [ ] AC-001: Dado que o usuario completou a Fase 2 (ou qualquer fase apos a Fase 2), o Dashboard exibe um botao/link "Ver Relatorio" para aquela expedicao.
- [ ] AC-002: Dado que o usuario completou apenas a Fase 1 ou nao completou nenhuma fase, o botao "Ver Relatorio" nao aparece no Dashboard para aquela expedicao.
- [ ] AC-003: O relatorio e acessivel a qualquer momento, sem necessidade de concluir todas as fases — ele mostra o que existe e destaca o que falta.

### Conteudo do Relatorio — Dados Completos

- [ ] AC-004: O relatorio exibe TODOS os dados inseridos pelo usuario sem abreviacao, truncamento ou resumo automatico. O que o usuario escreveu, o sistema exibe integralmente.
- [ ] AC-005: O relatorio inclui, quando preenchidos pelo usuario: dados pessoais relevantes da expedicao (nome, tipo de viajante, data de nascimento se pertinente), detalhes da viagem (destino, origem, datas, numero de passageiros e composicao), preferencias completas (todas as 8 categorias de preferencias), itens do checklist de documentos com status (marcado / nao marcado), dados de transporte (todos os registros com todos os campos), dados de hospedagem (todos os registros), opcoes de mobilidade selecionadas, destaques do guia de destino, roteiro completo (todos os dias e atividades).
- [ ] AC-006: Secoes de fases nao iniciadas aparecem no relatorio com indicacao "Nao preenchido ainda" — nao ficam ausentes do layout, o que poderia confundir o usuario.
- [ ] AC-007: Secoes de fases "Em andamento" (parcialmente preenchidas) exibem os dados existentes E destacam o que ainda falta com um indicador visual distinto (ex.: secao com fundo diferenciado e texto "Pendencias: X itens").

### Destaques de Pendencias

- [ ] AC-008: O relatorio exibe, no topo, um painel de "Pendencias" que lista de forma resumida quais secoes ainda estao incompletas, com link para ir diretamente a cada secao.
- [ ] AC-009: Itens individuais pendentes (ex.: checklist nao marcado, campo nao preenchido) sao destacados inline na secao correspondente — nao apenas no painel do topo.
- [ ] AC-010: O painel de pendencias desaparece quando todas as fases estao concluidas — o relatorio final nao exibe mais nenhum indicador de pendencia.

### Funcionalidades Inovadoras de Mercado

- [ ] AC-011: O relatorio exibe um indicador de "Completude da Expedicao" em percentual (0-100%) calculado com base no preenchimento de todas as secoes obrigatorias das fases 1-6, visivel no topo do relatorio.
- [ ] AC-012: O relatorio oferece a opcao de "Imprimir / Salvar como PDF" que gera uma versao formatada para impressao, sem elementos de navegacao, incluindo apenas os dados preenchidos.
- [ ] AC-013: O relatorio exibe os dados organizados por secoes com ancora (deep link interno), permitindo que o usuario navegue rapidamente para uma secao especifica sem scroll manual.
- [ ] AC-014: Campos que contem codigo de reserva (bookingCode) sao exibidos mascarados por padrao (ex.: "AB****XY") com opcao de revelar ao clicar, para privacidade em telas compartilhadas.

### Responsividade e Experiencia Mobile

- [ ] AC-015: O relatorio e totalmente legivel em dispositivos moveis, com secoes em acordeao (expandir/recolher) para facilitar a navegacao em tela pequena.
- [ ] AC-016: Em desktop, o relatorio pode ser exibido em layout de uma ou duas colunas para melhor aproveitamento do espaco.

## 4. Scope

### In Scope

- Acesso ao relatorio a partir da Fase 2 (nao apenas Fase 6)
- Exibicao completa de todos os dados das 6 fases, com ou sem preenchimento completo
- Painel de pendencias no topo do relatorio
- Indicador de completude em percentual
- Funcao de impressao/PDF
- Navegacao por ancora entre secoes
- Mascaramento de codigos de reserva
- Layout responsivo com acordeao mobile

### Out of Scope

- Compartilhamento de relatorio por link publico (definido em SPEC-PROD-014, a ser implementado em sprint futuro)
- Edicao de dados diretamente dentro do relatorio (o relatorio e read-only; edicao ocorre nas fases)
- Exportacao para formatos distintos de PDF (ex.: CSV, JSON, Excel)
- Sincronizacao automatica com apps de terceiros (TripIt, Google Calendar)
- Versoes historicas do relatorio (snapshot por data)

## 5. Constraints (MANDATORY)

### Security

- BOLA: o relatorio so pode ser acessado pelo dono da expedicao — verificar autorizacao no servidor antes de retornar qualquer dado
- Codigos de reserva (bookingCode) armazenados criptografados devem ser decifrados apenas para exibicao ao usuario autenticado dono da expedicao — nunca incluir no HTML estatico renderizado no servidor para cache publico
- Data de nascimento (birthDate) do usuario NAO deve aparecer no relatorio (ja identificado como risco em SPEC-SEC-003)
- O relatorio nao deve ser indexavel por motores de busca (meta `noindex` e rota protegida por autenticacao)

### Accessibility

- WCAG 2.1 AA obrigatorio
- O relatorio deve ser completamente navegavel via teclado e leitor de tela
- A estrutura de secoes deve usar elementos semanticos (`<section>`, `<h2>`, `<h3>`) para navegacao por headings
- O indicador de pendencia deve comunicar o status por texto, nao apenas por icone ou cor
- A funcao de revelar codigo de reserva deve ser acessivel via teclado e anunciar o estado (oculto/revelado) via `aria-live`

### Performance

- O relatorio deve carregar em menos de 2 segundos para expedicoes com todas as 6 fases preenchidas, em conexao 4G
- A geracao de PDF/impressao nao deve bloquear a UI — executar em background ou nova aba
- Nao fazer multiplas chamadas ao banco de dados para cada secao — agregar todos os dados em uma unica query ou conjunto otimizado de queries

### Architectural Boundaries

- O relatorio e uma pagina de leitura (read-only) — nenhuma acao de escrita deve ser possivel a partir dela
- A agregacao de dados para o relatorio deve reutilizar a logica do `expedition-summary.service.ts` existente, estendendo-a conforme necessario
- Nao deve duplicar logica de autorizacao — reutilizar os guards existentes

## 6. Success Metrics

- Taxa de acesso ao relatorio apos Fase 2: >= 50% dos usuarios que completam a Fase 2 acessam o relatorio na mesma sessao ou na proxima
- Taxa de retorno as fases apos ver o relatorio: >= 30% (indica que o relatorio orienta o usuario a completar pendencias)
- NPS de "clareza do planejamento": melhoria mensuravel no survey de beta comparado ao baseline pre-relatorio
- Completude media das expedicoes no momento do beta launch: melhoria de >= 20 pontos percentuais em relacao ao baseline de Sprint 32

## 7. Dependencies

- SPEC-PROD-027: Report i18n e Completude — resolve problemas de enum brutos e dados faltantes que precisam estar corrigidos antes do redesenho
- SPEC-PROD-026: Completion Engine Fixes — o calculo de status de fase usado no relatorio deve ser o corrigido
- SPEC-ARCH-005: Journey Summary Data Aggregation — logica de agregacao existente a ser estendida
- SPEC-PROD-014: Shareable Summary Link (deferred) — o link publico e o proximo passo natural apos este redesenho

## 8. Vendor Independence

- Este spec descreve WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH-XXX.

---

## Pesquisa de Mercado — Insights Aplicados

### Praticas de mercado incorporadas nesta spec

| Plataforma | Feature de referencia | Aplicacao nesta spec |
|---|---|---|
| TripIt | Exibe documentos originais de reserva, nao apenas resumos | AC-004: exibicao integral sem abreviacao |
| Wanderlog | Relatorio de orcamento por categoria com progresso visual | AC-011: indicador de completude percentual |
| Wanderlog | Todas as etapas visiveis mesmo em viagem em andamento | AC-003: acesso a partir da Fase 2 |
| Kayak Trips | Salva email original de cada reserva para verificacao | AC-014: mascaramento de bookingCode com reveal |
| TripIt Pro | "Go Now" com contagem regressiva e status em tempo real | AC-008: painel de pendencias com links diretos |
| Google Trips | Organizacao offline por secoes com suporte a navegacao rapida | AC-013: ancoras por secao |

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | product-owner | Rascunho inicial — Sprint 33 IMP-004 com pesquisa de mercado (TripIt, Wanderlog, Kayak) |
