# SPEC-PROD-035: Rodape Padronizado de Fases — Revisao e Refinamento (REQ-GENERAL-001)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-21
**Last Updated**: 2026-03-21
**Sprint**: 34
**Spec anterior**: SPEC-PROD-029 (Sprint 33) — este spec refina e expande o escopo daquele

---

## 1. Problem Statement

O Sprint 33 entregou o componente WizardFooter (SPEC-PROD-029) com os 3 botoes padronizados (Voltar / Salvar / Avancar). No entanto, o feedback de QA e os testes manuais de aceitacao do Sprint 33 identificaram lacunas criticas:

1. **Dialogo "Voltar" ausente ou inconsistente**: em algumas fases, o botao "Voltar" navega imediatamente sem verificar se ha alteracoes nao salvas, causando perda silenciosa de dados.
2. **Botao "Salvar" nao existe em algumas fases**: certas telas de fase ainda possuem botoes de acao especificos do passo ("Salvar Transporte", "Salvar Acomodacao", "Adicionar Segmento") em vez do botao "Salvar" do rodape padronizado, gerando inconsistencia na experiencia.
3. **Dialogo "Avancar" ausente**: ao tentar avancar com alteracoes nao salvas, o sistema avanca sem aviso, descartando dados silenciosamente.
4. **Cobertura incompleta de fases**: o componente foi aplicado em algumas fases mas nao em todas as 6 fases ativas do wizard.

Essas lacunas comprometem a integridade dos dados coletados durante o planejamento da viagem, especialmente na Fase 4 (logistica com multiplos segmentos de transporte e acomodacao).

**Impacto mensuravel**: usuarios que clicam "Voltar" em formularios com campos preenchidos perdem dados em 100% dos casos onde o dialogo nao existe. Isso cria frustacao, retrabalho e potencialmente abandono do fluxo de planejamento.

---

## 2. User Story

As a @leisure-solo traveler,
I want every phase screen to warn me before I lose unsaved changes,
so that I never accidentally lose work I already entered.

### Traveler Context

- **Pain point**: O viajante preenche informacoes de transporte (trecho de ida, trecho de volta, reserva de hotel) e ao clicar "Voltar" para corrigir algo na fase anterior, todos os dados desaparecem sem aviso.
- **Current workaround**: O usuario precisa lembrar de clicar em botoes especificos por passo ("Salvar Transporte", "Adicionar Acomodacao") antes de navegar — mas esses botoes sao inconsistentes em nomenclatura, posicao e comportamento entre fases.
- **Frequency**: Ocorre em toda sessao onde o usuario navega entre fases apos preencher campos. Com 6 fases e navegacao tipica de 2-3 visitas por fase, e virtualmente certo que qualquer usuario seja afetado.

---

## 3. Acceptance Criteria

### AC-001: Presenca do rodape em todas as fases
Given qualquer tela de fase do wizard (Fase 1 a Fase 6),
when a tela e renderizada,
then o rodape padrao deve exibir exatamente 3 botoes: "Voltar" (esquerda), "Salvar" (centro), "Avancar" (direita).

### AC-002: Botao "Voltar" — sem alteracoes
Given a Fase N esta aberta e nenhum campo foi alterado desde o ultimo salvamento,
when o usuario clica "Voltar",
then o sistema navega diretamente para a Fase N-1 sem exibir dialogo.

### AC-003: Botao "Voltar" — com alteracoes nao salvas
Given a Fase N esta aberta e o usuario alterou pelo menos um campo sem salvar,
when o usuario clica "Voltar",
then o sistema exibe um dialogo modal com:
  - Titulo: "Salvar alteracoes antes de voltar?"
  - Mensagem: descricao clara de que ha alteracoes nao salvas
  - Botao primario: "Salvar" (salva os dados e navega para Fase N-1)
  - Botao secundario: "Descartar" (descarta alteracoes e navega para Fase N-1)
  - Botao terciario: "Cancelar" (fecha o dialogo e permanece na Fase N).

### AC-004: Dialogo "Voltar" — acao "Salvar"
Given o dialogo "Salvar alteracoes antes de voltar?" esta aberto,
when o usuario clica "Salvar",
then o sistema salva os dados da fase atual, exibe toast "Dados salvos" e navega para a fase anterior.

### AC-005: Dialogo "Voltar" — acao "Descartar"
Given o dialogo "Salvar alteracoes antes de voltar?" esta aberto,
when o usuario clica "Descartar",
then o sistema descarta as alteracoes nao salvas, restaura os dados persistidos e navega para a fase anterior sem exibir toast.

### AC-006: Dialogo "Voltar" — acao "Cancelar"
Given o dialogo "Salvar alteracoes antes de voltar?" esta aberto,
when o usuario clica "Cancelar" ou pressiona Esc,
then o dialogo fecha, o usuario permanece na Fase N e todos os dados preenchidos permanecem intactos no formulario.

### AC-007: Botao "Salvar" — salvamento sem navegacao
Given qualquer tela de fase esta aberta com dados preenchidos,
when o usuario clica "Salvar",
then o sistema persiste todos os dados da fase, exibe um toast de confirmacao "Dados salvos" e o usuario permanece na mesma tela sem navegacao.

### AC-008: Botao "Salvar" — estado de carregamento
Given o usuario clicou "Salvar",
when a operacao de persistencia esta em andamento,
then o botao "Salvar" deve exibir indicador de carregamento (spinner ou equivalente) e ser desabilitado para evitar duplo clique.

### AC-009: Botao "Salvar" — sem alteracoes
Given nenhum campo foi alterado desde o ultimo salvamento,
when o usuario clica "Salvar",
then o sistema deve exibir toast "Nenhuma alteracao para salvar" sem realizar chamada de persistencia desnecessaria.

### AC-010: Botao "Avancar" — sem alteracoes nao salvas
Given a Fase N esta aberta e todos os dados estao salvos (sem alteracoes pendentes),
when o usuario clica "Avancar",
then o sistema valida os campos obrigatorios e, se validos, navega para a Fase N+1.

### AC-011: Botao "Avancar" — com alteracoes nao salvas
Given a Fase N esta aberta e o usuario alterou pelo menos um campo sem salvar,
when o usuario clica "Avancar",
then o sistema exibe um dialogo modal com:
  - Titulo: "Voce tem alteracoes nao salvas"
  - Botao primario: "Salvar e Avancar" (salva e navega para Fase N+1)
  - Botao secundario: "Avancar sem Salvar" (descarta alteracoes e navega para Fase N+1)
  - Botao terciario: "Cancelar" (fecha o dialogo, usuario permanece na Fase N).

### AC-012: Dialogo "Avancar" — acao "Salvar e Avancar"
Given o dialogo "Voce tem alteracoes nao salvas" esta aberto,
when o usuario clica "Salvar e Avancar",
then o sistema salva os dados, valida os campos obrigatorios e, se validos, navega para a Fase N+1.

### AC-013: Dialogo "Avancar" — acao "Avancar sem Salvar"
Given o dialogo "Voce tem alteracoes nao salvas" esta aberto,
when o usuario clica "Avancar sem Salvar",
then o sistema descarta as alteracoes nao salvas e navega para Fase N+1 sem persistir os dados alterados.

### AC-014: Remocao de botoes de acao especificos por passo
Given qualquer fase que anteriormente possuia botoes especificos de acao ("Salvar Transporte", "Salvar Acomodacao", "Adicionar Segmento", ou equivalentes posicionados no corpo da fase),
when a tela e renderizada com o rodape padronizado,
then esses botoes especificos de acao de passo NAO devem aparecer — o rodape padronizado os substitui integralmente.

### AC-015: Cobertura obrigatoria — todas as 6 fases ativas
Given as 6 fases ativas do wizard: Fase 1 "O Chamado", Fase 2 "O Explorador", Fase 3 "O Preparo", Fase 4 "A Logistica", Fase 5 "Guia do Destino", Fase 6 "O Roteiro",
when qualquer uma dessas telas e acessada,
then o rodape padronizado com os 3 botoes deve estar presente e funcional.

### AC-016: Deteccao de estado "dirty" — precisao
Given um formulario de fase com dados preenchidos,
when o usuario altera um campo e depois restaura o valor original manualmente,
then o sistema NAO deve considerar o formulario como "dirty" (sem alteracoes reais = sem dialogo desnecessario).

### AC-017: Responsividade do rodape
Given um dispositivo com largura de tela < 480px (mobile),
when qualquer tela de fase e renderizada,
then os 3 botoes do rodape devem estar visiveis e clicaveis sem sobreposicao ou corte, com areas de toque minimas de 44x44px (WCAG 2.5.5).

### AC-018: Acessibilidade — navegacao por teclado
Given o rodape padronizado esta visivel,
when o usuario navega via teclado (Tab / Shift+Tab),
then os 3 botoes devem ser focaveis na ordem: Voltar → Salvar → Avancar, com indicador visual de foco visivel.

### AC-019: Persistencia de dados apos reload da pagina
Given o usuario preencheu campos em uma fase e clicou "Salvar",
when o usuario recarrega a pagina (F5 ou refresh),
then os dados salvos devem ser recarregados do banco de dados, sem necessidade de re-preenchimento.

---

## 4. Scope

### In Scope

- Componente de rodape padronizado aplicado a todas as 6 fases ativas (Fases 1-6)
- Dialogo de confirmacao ao clicar "Voltar" com alteracoes nao salvas (3 opcoes: Salvar / Descartar / Cancelar)
- Dialogo de confirmacao ao clicar "Avancar" com alteracoes nao salvas (3 opcoes: Salvar e Avancar / Avancar sem Salvar / Cancelar)
- Botao "Salvar" standalone com feedback de toast
- Remocao de todos os botoes de acao especificos por passo nas 6 fases
- Deteccao de estado "dirty" baseada em comparacao do estado atual vs. estado persistido
- Responsividade completa (mobile, tablet, desktop)
- Acessibilidade WCAG 2.1 AA

### Out of Scope (v1)

- Auto-save periodico (deferido — requer SPEC-ARCH-008 que ainda esta em Draft)
- Indicador visual de "unsaved changes" no progress bar ou na barra de navegacao superior (pode ser adicionado em sprint futuro)
- Sincronizacao offline / modo de rascunho local (fora do escopo do MVP)
- Historico de versoes de dados por fase (fora do escopo do MVP)
- Fases 7-8 ("A Expedicao", "O Legado") — nao ativas no MVP

---

## 5. Constraints (MANDATORY)

### Security

- O botao "Salvar" deve invocar server actions autenticadas — nunca chamadas de API sem validacao de sessao.
- Os dados salvos devem pertencer ao usuario autenticado (verificacao de ownership via tripId + userId — prevencao de BOLA/IDOR).
- Campos de bookingCode (transporte, acomodacao) devem ser criptografados antes da persistencia, mesmo quando salvos via rodape padronizado.
- O dialogo de confirmacao nao deve expor dados sensiveis do usuario em mensagens de erro ou logs.

### Accessibility

- Conformidade WCAG 2.1 AA obrigatoria.
- Dialogos modais devem gerenciar focus trap (foco restrito ao dialogo enquanto aberto).
- Ao fechar o dialogo, o foco deve retornar ao botao que o abriu.
- Botoes devem ter labels descritivos (nao apenas icones) para compatibilidade com screen readers.
- Indicadores de carregamento devem ter equivalente textual via aria-live.
- Contraste de cor dos botoes: minimo 4.5:1 para texto normal, 3:1 para texto grande.

### Performance

- A deteccao de estado "dirty" deve ser computada no cliente (sem roundtrip ao servidor) para resposta imediata ao usuario.
- O salvamento via botao "Salvar" deve completar em < 2s em conexoes 3G (400kbps).
- Os dialogos de confirmacao devem aparecer em < 100ms apos o clique (sem delay perceptivel).
- O componente de rodape nao deve adicionar mais de 5KB ao bundle da fase respectiva.

### Architectural Boundaries

- Este spec descreve O QUE o componente faz, nao COMO e implementado.
- A implementacao tecnica (deteccao de dirty state, state machine do dialogo) pertence ao SPEC-ARCH correspondente.
- O rodape NAO deve conter logica de validacao de negocio das fases — essa logica permanece nos componentes de fase.
- O rodape NAO deve controlar a logica de navegacao entre fases — isso pertence ao Phase Navigation Engine (SPEC-PROD-016).

---

## 6. Success Metrics

- Taxa de perda silenciosa de dados ao navegar entre fases: 0% (baseline atual: estimado ~40% dos usuarios que navegam sem salvar)
- Taxa de conclusao de fases com dados completos: aumento >= 15% em relacao ao Sprint 33
- NPS relacionado a "facilidade de uso do wizard": aumento de >= 5 pontos
- Chamadas de suporte relacionadas a "perdi meus dados": reducao >= 80%
- Cobertura de testes unitarios do componente WizardFooter: >= 90%

---

## 7. Dependencies

- SPEC-PROD-029 (Sprint 33): componente WizardFooter base — este spec e uma expansao e refinamento, nao uma reescrita
- SPEC-PROD-016: Phase Navigation Engine — o rodape deve respeitar as regras de navegacao existentes
- SPEC-ARCH-020 (Sprint 33): WizardFooter Save/Discard Architecture — verifica se a implementacao tecnica base existe
- SPEC-PROD-031 (Sprint 33): validacao de campos obrigatorios da Fase 4 — o botao "Avancar" deve invocar essas validacoes antes de navegar

---

## 8. Vendor Independence

- Este spec descreve WHAT o componente faz, nao HOW e implementado.
- Nenhuma referencia a bibliotecas especificas (React Hook Form, Zustand, etc.).
- A implementacao tecnica pertence ao SPEC-ARCH correspondente para Sprint 34.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | product-owner | Versao inicial — refinamento do SPEC-PROD-029 com 19 ACs cobrindo dialogos, remocao de botoes especificos e cobertura completa das 6 fases |
