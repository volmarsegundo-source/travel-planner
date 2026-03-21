# SPEC-PROD-029: Rodape Padronizado de Navegacao (IMP-001)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Problem Statement

Atualmente, o comportamento dos botoes de navegacao entre fases e passos do wizard e inconsistente. Algumas telas possuem botoes "Voltar" e "Avancar", outras nao possuem "Salvar", e o tratamento de dados nao salvos varia por componente. Isso cria confusao para o viajante, que pode perder dados preenchidos ao navegar sem querer, ou nao saber como salvar progresso sem avancar de fase.

O impacto e direto: dados perdidos geram frustracoes que resultam em abandono da sessao. Em planejamento de viagem — uma tarefa alta em investimento emocional e cognitivo — qualquer perda de dado e percebida como falha grave do produto.

Pesquisas de UX em produtos de planejamento como TripIt e Wanderlog mostram que a previsibilidade dos controles de navegacao e um dos maiores drivers de confianca do usuario.

## 2. User Story

As a @leisure-solo,
I want every phase and step screen to have consistent navigation buttons with clear save/discard behavior,
so that I never lose data I filled in and always understand what will happen when I navigate.

### Traveler Context

- **Pain point**: O viajante preenche dados em um passo, clica "Voltar" para corrigir algo anterior, e ao retornar descobre que os dados foram perdidos. Ou clica "Avancar" sem saber se os dados foram salvos.
- **Current workaround**: O viajante anota os dados em papel ou outra aba do navegador antes de navegar, por medo de perder o preenchimento.
- **Frequency**: Toda vez que o viajante navega entre passos dentro de uma fase ou entre fases — ocorrencia multipla por sessao.

## 3. Acceptance Criteria

- [ ] AC-001: Dado que o usuario esta em qualquer tela de fase ou passo do wizard, o rodape exibe exatamente tres botoes: "Voltar", "Salvar" e "Avancar", nesta ordem da esquerda para a direita.
- [ ] AC-002: Dado que o usuario clicou em "Voltar" e nao ha dados alterados desde o ultimo save, o sistema navega para a tela anterior imediatamente, sem dialogo de confirmacao.
- [ ] AC-003: Dado que o usuario clicou em "Voltar" e ha dados alterados (dirty state), o sistema exibe dialogo de confirmacao com a pergunta "Salvar alteracoes?" e as opcoes "Salvar e Voltar" e "Descartar e Voltar".
- [ ] AC-004: Dado que o usuario clicou em "Salvar", o sistema persiste os dados da tela atual sem navegar para nenhuma outra tela, e exibe confirmacao visual inline (ex.: "Salvo com sucesso") por no maximo 3 segundos.
- [ ] AC-005: Dado que o usuario clicou em "Avancar" e nao ha dados alterados, o sistema navega para o proximo passo ou fase imediatamente.
- [ ] AC-006: Dado que o usuario clicou em "Avancar" e ha dados alterados, o sistema exibe dialogo com as opcoes "Salvar e Avancar" e "Descartar e Avancar".
- [ ] AC-007: Dado que o usuario esta no primeiro passo da primeira fase, o botao "Voltar" esta desabilitado ou ausente.
- [ ] AC-008: Dado que o usuario esta no ultimo passo da ultima fase ativa, o botao "Avancar" exibe o label "Concluir" ao inves de "Avancar".
- [ ] AC-009: Dado que a operacao de salvar falha (erro de rede ou servidor), o sistema exibe mensagem de erro clara e o usuario permanece na tela atual com os dados intactos.
- [ ] AC-010: Dado que o dialogo de confirmacao esta aberto, o usuario pode pressionar Escape para fechar o dialogo e retornar ao estado anterior sem nenhuma acao.
- [ ] AC-011: Dado que o usuario esta em um dispositivo movel, os tres botoes ocupam a largura total da tela no rodape fixo, com altura minima de 44px por botao para area de toque adequada.
- [ ] AC-012: O comportamento descrito aplica-se a todos os wizards e todas as fases da expedicao sem excecoes — o rodape e um componente global, nao especifico de fase.
- [ ] AC-013: O estado "sujo" (dirty state) e calculado comparando o estado atual do formulario com o ultimo estado persistido, nao com o estado inicial da sessao.
- [ ] AC-014: Dado que o botao "Salvar" e pressionado e os dados atuais sao identicos ao ultimo save, nenhuma chamada de rede e feita e o feedback visual indica "Ja esta salvo".

## 4. Scope

### In Scope

- Componente de rodape padronizado aplicado a todas as telas de fase (Phase1 a Phase6) e todos os passos internos (steps) de cada fase
- Logica de deteccao de dirty state por formulario
- Dialogos de confirmacao para Voltar (com dados alterados) e Avancar (com dados alterados)
- Feedback visual de confirmacao de save (inline, nao-modal)
- Estado desabilitado para "Voltar" na primeira tela
- Label alternativo "Concluir" no ultimo passo da ultima fase
- Comportamento de teclado (Escape fecha dialogo)
- Responsividade mobile

### Out of Scope

- Auto-save periodico por timer (definido em SPEC-PROD-028 UX-005)
- Historico de versoes de um passo (undo/redo)
- Salvar rascunhos como entidade separada do banco de dados
- Comportamento especifico por tipo de campo (ex.: campo de texto vs upload de arquivo)

## 5. Constraints (MANDATORY)

### Security

- A acao de salvar deve passar pelo mesmo middleware de autorizacao das demais server actions — verificar BOLA (usuario so salva dados da propria expedicao)
- Nenhum dado do formulario pode ser transmitido como query param na URL; usar apenas POST/server actions
- O dialogo de confirmacao nao deve bloquear outras tabs/janelas do navegador (evitar `window.confirm`)

### Accessibility

- WCAG 2.1 AA obrigatorio
- Os tres botoes devem ser navegaveis via teclado (Tab) na ordem Voltar → Salvar → Avancar
- O dialogo de confirmacao deve seguir o padrao ARIA `role="dialog"` com `aria-modal="true"` e foco automatico no primeiro controle interativo
- O feedback de "Salvo com sucesso" deve ser anunciado por leitores de tela via `aria-live="polite"`
- Contraste minimo 4.5:1 para texto dos botoes em todos os estados (normal, hover, disabled)

### Performance

- A operacao de save deve completar em menos de 1.5 segundos em conexao 3G
- A deteccao de dirty state deve ser sincrona e nao deve causar re-renders desnecessarios
- O componente de rodape nao deve adicionar mais de 5KB ao bundle de qualquer pagina de fase

### Architectural Boundaries

- Este spec descreve o COMPORTAMENTO do rodape — a implementacao tecnica (componente, estado, server action) e responsabilidade do SPEC-ARCH correspondente
- O rodape padronizado substitui qualquer rodape ou conjunto de botoes CTA existente nas fases — nao deve coexistir com implementacoes anteriores
- Deve respeitar o contrato de navegacao definido em SPEC-PROD-016 (Phase Navigation Engine)

## 6. Success Metrics

- Taxa de perda de dados reportada pelos usuarios beta: reducao para 0% (baseline: nao medido, mas presente em feedback qualitativo)
- Taxa de conclusao de fases sem abandono a meio preenchimento: aumento >= 15% em relacao ao baseline de Sprint 32
- Tempo medio para completar um passo: reducao ou manutencao (nao deve aumentar em mais de 10% pelo atrito extra dos dialogos)
- NPS de "facilidade de uso" no fluxo de planejamento: melhoria mensuravel no survey de beta

## 7. Dependencies

- SPEC-PROD-016: Phase Navigation Engine — o rodape deve respeitar as regras de navegacao entre fases ja definidas
- SPEC-PROD-026: Completion Engine Fixes — o estado de completude da fase nao deve ser afetado pelo comportamento de "Descartar"
- SPEC-PROD-031: Phase 4 Mandatory Fields — o botao "Avancar" da Fase 4 deve integrar as regras de campos obrigatorios definidas naquela spec

## 8. Vendor Independence

- Este spec descreve WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH-XXX.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | product-owner | Rascunho inicial — Sprint 33 IMP-001 |
