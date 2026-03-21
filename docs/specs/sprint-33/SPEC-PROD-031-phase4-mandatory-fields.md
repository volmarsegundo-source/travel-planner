# SPEC-PROD-031: Campos Obrigatorios da Fase 4 — A Logistica (IMP-003)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Problem Statement

A Fase 4 ("A Logistica") coleta dados de transporte, hospedagem e mobilidade local — as informacoes mais criticas para a operacionalizacao da viagem. Atualmente, o usuario pode avancar para a Fase 5 sem preencher nenhum dado de logistica, o que resulta em um relatorio de expedicao incompleto e em uma geracao de roteiro (Fase 6) com contexto insuficiente.

Alem disso, o campo "Observacoes" e tratado da mesma forma que campos estruturais, criando confusao sobre o que e necessario para prosseguir. O viajante precisa de clareza: quais campos sao obrigatorios (sem eles, o planejamento nao tem base), e quais sao opcionais (complementares, enriquecedores).

A regra deve ser minimalista: exigir apenas o que e absolutamente necessario para que a viagem seja logisticamente coerente, sem sobrecarregar o usuario com campos obrigatorios excessivos.

## 2. User Story

As a @leisure-solo,
I want the system to require only the essential logistics fields before I can advance to Phase 5,
so that my trip report and AI itinerary are based on real logistics data — not assumptions.

### Traveler Context

- **Pain point**: O usuario preenche parcialmente a logistica, avanca para a Fase 5, e o roteiro gerado pela IA ignora o tipo de transporte e hospedagem escolhidos, gerando sugestoes genericas e desconectadas da realidade da viagem.
- **Current workaround**: O usuario volta manualmente para a Fase 4 depois de gerar o roteiro para completar os dados, mas a IA ja foi acionada com dados incompletos.
- **Frequency**: Em toda expedicao em que o usuario tenta gerar o roteiro antes de completar a logistica — estimado como comportamento comum em primeiros usuarios (onboarding).

## 3. Acceptance Criteria

### Secao de Transporte

- [ ] AC-001: Dado que o usuario esta preenchendo o transporte, os campos "Tipo de transporte", "Origem (De)", "Destino (Para)", "Data de ida" e "Data de volta" sao obrigatorios para que o registro de transporte seja considerado valido.
- [ ] AC-002: Dado que o usuario tenta salvar um registro de transporte sem preencher qualquer um dos campos obrigatorios, o sistema exibe mensagem de validacao inline especificando qual campo esta faltando.
- [ ] AC-003: O campo "Observacoes" do transporte e sempre opcional — sua ausencia nao impede salvar nem avancar.
- [ ] AC-004: Dado que o usuario preencheu pelo menos UM registro de transporte valido (com todos os campos obrigatorios), a secao de transporte e considerada completa para fins de avanco.

### Secao de Hospedagem

- [ ] AC-005: Dado que o usuario esta preenchendo a hospedagem, os campos "Tipo de hospedagem", "Data de check-in" e "Data de check-out" sao obrigatorios para que o registro seja considerado valido.
- [ ] AC-006: Dado que o usuario tenta salvar um registro de hospedagem sem preencher qualquer um dos campos obrigatorios, o sistema exibe mensagem de validacao inline.
- [ ] AC-007: O campo "Observacoes" da hospedagem e sempre opcional.
- [ ] AC-008: Dado que o usuario preencheu pelo menos UM registro de hospedagem valido, a secao de hospedagem e considerada completa para fins de avanco.

### Secao de Mobilidade Local

- [ ] AC-009: Dado que o usuario esta na secao de mobilidade, pelo menos UMA opcao de mobilidade local deve ser selecionada para que a secao seja considerada completa.
- [ ] AC-010: Dado que nenhuma opcao de mobilidade foi selecionada e o usuario tenta avancar, o sistema exibe mensagem de validacao para a secao de mobilidade.

### Avanco para Fase 5

- [ ] AC-011: Dado que as tres secoes (transporte, hospedagem, mobilidade) estao completas conforme as regras acima, o botao "Avancar" navega para a Fase 5 normalmente.
- [ ] AC-012: Dado que qualquer uma das tres secoes esta incompleta e o usuario clica em "Avancar", o sistema NAO navega — em vez disso, destaca a(s) secao(oes) incompleta(s) com indicador visual (ex.: borda vermelha na aba ou secao, e mensagem explicativa).
- [ ] AC-013: O indicador de secao incompleta especifica o que falta (ex.: "Transporte: preencha pelo menos um registro com Tipo, Origem, Destino e Datas" — nao apenas "campo obrigatorio").
- [ ] AC-014: Dado que o usuario corrige as pendencias e tenta avancar novamente, o sistema navega normalmente — sem necessidade de recarregar a pagina.
- [ ] AC-015: Dado que o usuario tem registros de transporte ou hospedagem parcialmente preenchidos (nao salvos), o sistema nao os conta como completos para fins de avanco.

### Consistencia com Regras de Conclusao da Fase

- [ ] AC-016: A Fase 4 e marcada como "Concluida" quando as tres secoes estao completas E os dados foram salvos. Apenas preencher sem salvar nao conclui a fase.
- [ ] AC-017: A Fase 4 pode ser "Em andamento" se o usuario salvou dados validos em uma ou duas secoes mas nao nas tres.

## 4. Scope

### In Scope

- Validacao dos campos obrigatorios de transporte (Tipo, De, Para, Ida, Volta)
- Validacao dos campos obrigatorios de hospedagem (Tipo, Check-in, Check-out)
- Validacao de selecao minima de mobilidade (ao menos 1 opcao)
- Bloqueio do avanco para Fase 5 com indicacao clara das pendencias
- Marcacao de "Obrigatorio" vs "Opcional" na UI dos campos

### Out of Scope

- Validacao de consistencia de datas (ex.: data de check-in nao pode ser anterior a data de ida do transporte) — feature futura
- Verificacao de disponibilidade real de hospedagem ou transporte (integracao de booking nao esta no escopo MVP)
- Campos obrigatorios condicionais por tipo de transporte (ex.: "numero do voo" so obrigatorio se transporte = aviao) — pode ser adicionado em Sprint 34+
- Limite maximo de registros por secao (ja definido em spec legada: max 5 hospedagens)

## 5. Constraints (MANDATORY)

### Security

- A validacao de campos obrigatorios deve ocorrer tanto no cliente (feedback imediato) quanto no servidor (validacao definitiva) — nao confiar apenas em validacao client-side
- BOLA: toda acao de salvar ou validar deve verificar que a expedicao pertence ao usuario autenticado

### Accessibility

- WCAG 2.1 AA obrigatorio
- Mensagens de validacao devem ser associadas ao campo via `aria-describedby` ou equivalente
- O indicador de secao incompleta deve ser comunicado por texto, nao apenas por cor
- Ao exibir erros de validacao apos tentativa de avanco, o foco deve ser movido para o primeiro campo invalido ou para o sumario de erros

### Performance

- A validacao client-side deve ser sincrona e executar em menos de 100ms
- O bloqueio do avanco (e exibicao dos erros) nao deve fazer chamada de rede — e validacao local antes do submit

### Architectural Boundaries

- Esta spec define QUAIS campos sao obrigatorios e o comportamento de bloqueio de avanco — os schemas de validacao Zod existentes para Fase 4 devem ser atualizados pelo SPEC-ARCH correspondente
- Deve respeitar a estrutura de abas/steps existente na Fase 4 (Transport | Accommodation | Mobility) sem redesenhar o layout — mudancas de layout pertencem ao SPEC-UX correspondente

## 6. Success Metrics

- Completude media dos dados de Fase 4 no momento de geracao do roteiro (Fase 6): meta >= 90% de registros com todos os campos obrigatorios preenchidos (baseline: estimado em ~50% atual)
- Taxa de geracao de roteiro com dados de logistica incompletos: reducao para < 5%
- Satisfacao com o roteiro gerado (survey de beta): melhoria correlacionada com completude dos dados de entrada

## 7. Dependencies

- SPEC-PROD-029: Standardized Footer — o comportamento do botao "Avancar" da Fase 4 segue o padrao global
- SPEC-PROD-026: Completion Engine Fixes — o motor de estados de fase deve suportar as novas regras de completude da Fase 4
- SPEC-PROD-033: Phase 6 Prompt Enrichment — esta spec garante que os dados obrigatorios estejam disponiveis para o enriquecimento do prompt

## 8. Vendor Independence

- Este spec descreve WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH-XXX.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | product-owner | Rascunho inicial — Sprint 33 IMP-003 |
