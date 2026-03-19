---
spec-id: SPEC-PROD-028
title: UX Improvements — Autocomplete, Validacao, Preferencias, Phase 4 e Nomes de Fase
version: 1.0.0
status: Draft
author: product-owner
sprint: 32
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-028: UX Improvements — Autocomplete, Validacao, Preferencias, Phase 4 e Nomes de Fase

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-19
**Sprint**: 32
**Relacionado a**: SPEC-PROD-017 (Destination Autocomplete Rewrite), SPEC-PROD-023 (Phase Completion Logic), SPEC-UX-001 (Autocomplete Redesign)
**Melhorias UX cobertas**: UX-001, UX-002, UX-003, UX-004, UX-005, UX-007

---

## Contexto: Por que Este Documento Existe

Seis melhorias de UX foram identificadas durante os testes de v0.26.0 e em feedback do stakeholder. Nenhuma delas e critica o suficiente para bloquear o beta individualmente, mas em conjunto representam friccao suficiente para impactar negativamente a experiencia dos primeiros usuarios. Este spec consolida as 6 melhorias para uma entrega coesa no Sprint 32 de estabilizacao.

Os itens sao maioritariamente independentes entre si, exceto pela dependencia natural entre UX-001 (layout lado a lado) e UX-002 (validacao de mesma cidade), que operam sobre os mesmos dois campos.

---

## 1. Problem Statement

A experiencia atual apresenta seis pontos de friccao confirmados:

1. **UX-001**: Os campos Destino e Origem aparecem empilhados verticalmente em vez de lado a lado — decisao de layout subotima para telas medias e grandes, identificada pelo stakeholder como prioridade visual.

2. **UX-002**: A validacao "origem igual ao destino" (viagem sem saida) ocorre apenas ao tentar avancar de fase — o usuario nao recebe feedback imediato ao preencher ambos os campos.

3. **UX-003**: A tela de preferencias exibe todas as 8 categorias em uma unica pagina paginada de forma desbalanceada — o split atual nao segue uma logica visual clara. O stakeholder solicitou 4 categorias na pagina 1 e 3 na pagina 2 (total de 7 categorias, as 8 sendo acessibilidade — que pode permanecer na pagina 2).

4. **UX-004**: A pergunta sobre aluguel de carro em Phase 4 aparece sempre, mesmo quando o usuario nao selecionou "Aluguel de Carro" como opcao de mobilidade local — criando uma pergunta irrelevante para a maioria dos viajantes.

5. **UX-005**: Phase 4 nao tem auto-save e nao exibe dialogo de confirmacao ao tentar sair com dados nao salvos — o usuario pode perder dados preenchidos sem perceber.

6. **UX-007**: Os nomes das fases (ex: "O Chamado", "O Explorador") nao aparecem abaixo dos segmentos da barra de progresso nas paginas de expedicao e no dashboard — o usuario nao consegue associar cada segmento ao nome da fase de forma rapida.

---

## 2. User Story (composta)

As a @leisure-solo or @leisure-family,
I want the trip planning interface to feel polished and responsive — fields side by side, validation at the right moment, preferences organized clearly, relevant questions only, safe data entry, and phase names visible on the progress bar,
so that I can complete my planning efficiently without confusion, data loss, or irrelevant questions.

### Contexto do Traveler

- **Pain point**: Pequenas frustroes acumuladas — campo de aluguel de carro aparece sem contexto, preferencias desorganizadas, dados perdidos ao sair de Phase 4, nomes de fase ausentes na barra de progresso.
- **Workaround atual**: Nao ha workaround para dados perdidos (UX-005). Para os demais, o usuario simplesmente tolera a experiencia subotima.
- **Frequencia**: UX-007 afeta 100% dos usuarios em todas as sessoes (barra de progresso onipresente). UX-005 afeta qualquer usuario que preenche Phase 4 e sai antes de salvar.

---

## 3. Acceptance Criteria

### UX-001 — Campos Destino e Origem lado a lado

- [ ] **AC-001**: Dado Phase 1 em viewport >= 768px (tablet e desktop), quando o usuario visualiza os campos Destino e Origem, entao os dois campos aparecem na mesma linha, lado a lado, com larguras iguais (50% cada) ou proporcional ao conteudo — nao empilhados verticalmente.
- [ ] **AC-002**: Dado Phase 1 em viewport < 768px (mobile), quando o usuario visualiza os campos Destino e Origem, entao os campos aparecem empilhados verticalmente (um por linha) — o layout lado a lado nao deve ser aplicado em mobile para evitar campos muito estreitos.
- [ ] **AC-003**: Dado o layout lado a lado, quando um campo exibe a lista de sugestoes de autocomplete, entao a lista nao e cortada pela borda do campo adjacente nem pelo viewport — a lista e exibida completamente.
- [ ] **AC-004**: Dado o layout lado a lado, entao a ordem de foco por teclado (Tab) segue a ordem visual: primeiro Destino, depois Origem.

### UX-002 — Validacao de mesma cidade no nivel do campo

- [ ] **AC-005**: Dado que o usuario preencheu o campo Destino com uma cidade e acabou de preencher o campo Origem com a mesma cidade (mesmo valor), quando o campo Origem perde foco, entao uma mensagem de erro inline e exibida abaixo do campo Origem informando que origem e destino nao podem ser iguais.
- [ ] **AC-006**: Dado a mensagem de erro de "mesma cidade" (AC-005), entao a mensagem e exibida no locale do usuario (PT-BR: "Origem e destino nao podem ser a mesma cidade" / EN: "Origin and destination cannot be the same city").
- [ ] **AC-007**: Dado a mensagem de erro de "mesma cidade" visivel, quando o usuario altera o campo Origem para uma cidade diferente do Destino e o campo perde foco, entao a mensagem de erro desaparece imediatamente.
- [ ] **AC-008**: Dado que os dois campos contem a mesma cidade, quando o usuario tenta avancar de Phase 1, entao o avanco e bloqueado (validacao tambem persiste ao tentar avancar, nao apenas no blur).
- [ ] **AC-009**: Dado que o campo Origem esta vazio (nao preenchido), entao a validacao de "mesma cidade" nao e disparada — o campo Origem e opcional e sua ausencia nao e um erro.

### UX-003 — Preferencias com split 4+3

- [ ] **AC-010**: Dado a tela de preferencias em Phase 2, quando o usuario ve a pagina 1, entao exatamente 4 categorias de preferencias sao exibidas.
- [ ] **AC-011**: Dado a tela de preferencias em Phase 2, quando o usuario ve a pagina 2, entao exatamente 3 categorias de preferencias sao exibidas.
- [ ] **AC-012**: Dado o total de 7 categorias distribuidas entre as 2 paginas (4+3), entao a categoria "Acessibilidade" (accessibility) e incluida no conjunto de 7 — a distribuicao exata entre pagina 1 e pagina 2 para as categorias restantes e de responsabilidade do ux-designer, respeitando o agrupamento logico por tema.
- [ ] **AC-013**: Dado as duas paginas de preferencias, entao os indicadores de paginacao (ex: "1 de 2", pontos de progresso) refletem o novo split corretamente.
- [ ] **AC-014**: Dado selecoes feitas na pagina 1, quando o usuario navega para pagina 2 e retorna para pagina 1, entao as selecoes da pagina 1 estao preservadas — nenhuma perda de estado ao navegar entre paginas.

### UX-004 — Pergunta de aluguel de carro condicional em Phase 4

- [ ] **AC-015**: Dado Phase 4 (A Logistica) com a secao de mobilidade local, quando o usuario NAO selecionou "Aluguel de Carro" (ou equivalente) como opcao de mobilidade, entao o campo/secao referente a aluguel de carro nao e exibido.
- [ ] **AC-016**: Dado Phase 4, quando o usuario SELECIONA "Aluguel de Carro" como opcao de mobilidade, entao o campo/secao de aluguel de carro aparece imediatamente — sem necessidade de salvar ou recarregar a pagina.
- [ ] **AC-017**: Dado Phase 4 com "Aluguel de Carro" selecionado e dados de aluguel preenchidos, quando o usuario DESMARCA "Aluguel de Carro" da mobilidade, entao o campo de aluguel de carro desaparece — e o sistema descarta os dados de aluguel previamente preenchidos (ou preserva com aviso — decisao de UX a ser definida pelo ux-designer).
- [ ] **AC-018**: Dado Phase 4 sem "Aluguel de Carro" na lista de opcoes de mobilidade do sistema, entao o campo de aluguel nunca aparece — o campo e estritamente condicional a selecao do tipo de mobilidade.

### UX-005 — Phase 4 auto-save e dialogo de confirmacao ao sair

- [ ] **AC-019**: Dado um usuario preenchendo dados em Phase 4 (transporte, acomodacao ou mobilidade), quando o usuario para de editar por mais de 3 segundos sem sair da fase, entao o sistema salva automaticamente os dados preenchidos ate aquele momento — sem acao manual do usuario.
- [ ] **AC-020**: Dado que o auto-save foi bem-sucedido, entao um indicador visual discreto e transitorio (ex: "Salvo automaticamente" por 2–3 segundos) confirma o salvamento ao usuario.
- [ ] **AC-021**: Dado que o usuario tem alteracoes nao salvas em Phase 4 (apos o ultimo auto-save ou sem que o auto-save tenha rodado ainda), quando o usuario tenta sair de Phase 4 (via "Voltar", via menu lateral, via header, ou via link externo), entao o sistema exibe um dialogo de confirmacao com as opcoes: "Sair sem salvar" e "Salvar e sair".
- [ ] **AC-022**: Dado o dialogo de confirmacao (AC-021), quando o usuario clica em "Salvar e sair", entao o sistema salva os dados e navega para o destino solicitado.
- [ ] **AC-023**: Dado o dialogo de confirmacao (AC-021), quando o usuario clica em "Sair sem salvar", entao o sistema descarta as alteracoes nao salvas e navega para o destino solicitado.
- [ ] **AC-024**: Dado que nao ha alteracoes nao salvas em Phase 4 (todos os dados ja foram auto-salvos), quando o usuario tenta sair de Phase 4, entao nenhum dialogo de confirmacao e exibido — o usuario sai diretamente.
- [ ] **AC-025**: Dado Phase 4 em modo de apenas visualizacao (sem edicao ativa), entao nenhum dialogo de confirmacao e exibido ao sair.

### UX-007 — Nomes de fase abaixo dos segmentos da barra de progresso

- [ ] **AC-026**: Dado a barra de progresso de fases em qualquer pagina de expedicao (wizard de fase ativa), quando o usuario visualiza a barra, entao o nome curto de cada fase aparece abaixo do seu segmento correspondente (ex: "O Chamado" abaixo do segmento 1, "O Explorador" abaixo do segmento 2, etc.).
- [ ] **AC-027**: Dado a barra de progresso no dashboard (card de expedicao ou pagina de expedicoes), quando o usuario visualiza a barra, entao os nomes das fases aparecem abaixo dos segmentos — mesmo comportamento que nas paginas de wizard.
- [ ] **AC-028**: Dado viewport mobile (< 768px), quando o usuario visualiza a barra de progresso, entao os nomes de fase sao exibidos de forma legivel — sem overflow, sem truncamento indesejado, podendo usar fonte menor ou rotacao de texto se necessario (decisao de layout do ux-designer).
- [ ] **AC-029**: Dado que a barra de progresso exibe nomes de fase, entao os nomes sao os nomes canonicos definidos em `phase-config.ts` — que sao: "O Chamado", "O Explorador", "O Preparo", "A Logistica", "Guia do Destino", "O Roteiro".
- [ ] **AC-030**: Dado a barra de progresso com nomes de fase, entao os nomes de fase sao exibidos no locale do usuario — se o sistema tiver traducoes de nomes de fase para EN, exibir em EN quando locale for EN.

---

## 4. Scope

### In Scope

- Layout lado a lado para campos Destino e Origem em Phase 1 (telas medias e grandes)
- Validacao inline de "mesma cidade" no nivel do campo (blur + tentativa de avancar)
- Redistribuicao de categorias de preferencias para split 4+3 em Phase 2
- Campo de aluguel de carro condicional a selecao de mobilidade em Phase 4
- Auto-save de dados de Phase 4 com indicador visual
- Dialogo de confirmacao ao sair de Phase 4 com dados nao salvos
- Nomes de fase abaixo dos segmentos da barra de progresso (expedicao e dashboard)
- Traducoes PT-BR e EN para novas strings (mensagem de erro de mesma cidade, labels de dialogo de confirmacao, indicador de auto-save)

### Out of Scope

- Redesign completo do layout de Phase 1 alem do posicionamento dos dois campos
- Auto-save para outras fases alem de Phase 4 — avaliar extensao em Sprint 33
- Dialogo de confirmacao para outras fases — especifico de Phase 4 onde o risco de perda de dados e maior (multiplos registros de transporte/acomodacao)
- Animacao de aparecimento do campo de aluguel de carro (comportamento de show/hide e suficiente — animacao e nice-to-have para Sprint 33)
- Traducao dos nomes das fases para idiomas alem de PT-BR e EN (roadmap futuro)
- Reordenacao das categorias de preferencias alem do split 4+3 — a ordem dentro de cada pagina e de responsabilidade do ux-designer

---

## 5. Constraints (MANDATORY)

### Security

- O auto-save de Phase 4 deve respeitar a verificacao de autorizacao existente — apenas o usuario dono da expedicao pode salvar dados (`trip.userId === session.userId`)
- O dialogo de confirmacao ao sair e um controle de UI — nao deve bloquear navegacao programatica ou requests de servidor (apenas navegacao iniciada pelo usuario)
- Nenhum dado temporario do auto-save deve ser persistido no cliente de forma que outro usuario possa acessar (relevante em dispositivos compartilhados)

### Accessibility

- WCAG 2.1 AA: o dialogo de confirmacao ao sair (UX-005) deve ser acessivel por teclado, com foco gerenciado automaticamente para o dialogo ao abrir, e retornando ao elemento que o disparou ao fechar
- O dialogo de confirmacao deve ter role="dialog" e aria-labelledby para que screen readers anunciem o contexto
- O indicador de auto-save (AC-020) deve ser anunciado por screen readers como aria-live="polite" — e informativo, nao urgente
- Os nomes de fase na barra de progresso (UX-007) devem estar associados semanticamente aos segmentos correspondentes — nao apenas proximos visualmente

### Performance

- O auto-save de Phase 4 deve ser debounced (minimo 3 segundos sem edicao) — nao salvar a cada keystroke
- O auto-save nao deve bloquear a UI — deve ocorrer em background sem spinner bloqueante
- A condicionalidade do campo de aluguel de carro (UX-004) deve ser logica de UI pura — sem chamada de API ao mostrar/esconder o campo

### Architectural Boundaries

- O auto-save de Phase 4 reutiliza as server actions existentes de salvamento de Phase 4 — nao criar um novo endpoint apenas para auto-save
- A condicionalidade de UX-004 e gerenciada no estado do componente de Phase 4 — o banco de dados nao precisa de campo adicional para "tem aluguel de carro selecionado"
- Os nomes de fase de UX-007 devem vir de `phase-config.ts` (fonte de verdade canonical) — nao duplicar os nomes em outro arquivo de configuracao

---

## 6. Success Metrics

| Metrica | Baseline (v0.26.0) | Meta (Sprint 32) | Prazo |
|---------|-------------------|-----------------|-------|
| Reducao de reportes sobre campos de aluguel irrelevantes | Presente (UX-004 confirmado) | 0 reportes em beta | Sprint 33 |
| Incidencias de perda de dados em Phase 4 reportadas | Risco presente sem auto-save | 0 reportes em beta | Sprint 33 |
| Stakeholder approval do layout lado a lado (UX-001) | Solicitacao pendente | Aprovado em demo de Sprint 32 | Sprint 32 |
| Usuarios que identificam fase pelo segmento da barra de progresso (UX-007) | Nao medido | Avaliar em usability test de beta | Sprint 33 |

---

## 7. Dependencies

- **SPEC-PROD-017** (Destination Autocomplete Rewrite): UX-001 e UX-002 operam sobre os campos de autocomplete — a correcao de layout deve ser compativel com o comportamento de autocomplete ja implementado
- **SPEC-PROD-023** (Phase Completion Logic): UX-005 auto-save de Phase 4 deve respeitar os criterios de conclusao de Phase 4 — dados salvos pelo auto-save contam para o estado COMPLETED se o criterio minimo for atendido
- `phase-config.ts`: fonte de verdade para nomes canonicos das fases (UX-007, AC-029)
- Arquivos de i18n: novas chaves de traducao necessarias para mensagens de UX-002, UX-005 (dialogo de confirmacao, indicador de auto-save)

---

## 8. Vendor Independence

- Este spec descreve O QUE deve ser melhorado na experiencia do usuario, nao COMO implementar cada melhoria.
- Decisoes de componente especifico, biblioteca de dialogo, mecanismo de debounce, e estrategia de gerenciamento de estado sao de responsabilidade do architect e dos desenvolvedores.
- O ux-designer deve produzir SPEC-UX correspondente para os itens UX-001, UX-003 e UX-007 que tem impacto visual significativo.

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | product-owner | Documento inicial — Sprint 32 stabilization, melhorias UX-001/002/003/004/005/007 |
