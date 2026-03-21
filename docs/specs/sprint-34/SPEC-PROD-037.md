# SPEC-PROD-037: Melhorias da Fase 4 — A Logistica (REQ-PHASE4-001..004)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, ux-designer
**Created**: 2026-03-21
**Last Updated**: 2026-03-21
**Sprint**: 34
**Specs anteriores**: SPEC-PROD-031 (Sprint 33) — este spec expande e corrige aquele

---

## 1. Problem Statement

A Fase 4 "A Logistica" cobre transporte, acomodacao e mobilidade local. Os testes de aceitacao do Sprint 33 e o feedback de usuarios identificaram 4 problemas distintos que precisam ser corrigidos:

**REQ-PHASE4-001 — Toggle Ida / Ida e Volta**: O formulario de transporte atualmente sempre exibe campos de "Data de Volta" e um checkbox "Segmento de retorno". Para viagens so de ida (ex: mudanca de cidade, cruzeiro com embarque e desembarque em cidades diferentes), esses campos sao confusos e geram dados incorretos quando preenchidos por erro. Um toggle explicito "Somente Ida / Ida e Volta" e a solucao esperada pela industria (padrao adotado por todos os motores de busca de passagens).

**REQ-PHASE4-002 — Indicadores de campos obrigatorios**: O formulario atual nao distingue visualmente campos obrigatorios de opcionais. Usuarios deixam campos obrigatorios em branco e so descobrem o erro ao tentar avancar, gerando frustacao. O padrao de mercado (asterisco * no label do campo) deve ser aplicado.

**REQ-PHASE4-003 — Bug critico de persistencia de acomodacao**: As acomodacoes inseridas na Fase 4 nao estao sendo persistidas corretamente no banco de dados. Este e um bug de regressao critico — dados inseridos pelo usuario sao perdidos silenciosamente. Esse bug foi identificado em staging e nao pode chegar ao ambiente de producao.

**REQ-PHASE4-004 — Checkbox "Ainda nao decidi"**: Viajantes que estao no inicio do planejamento frequentemente nao tem todas as informacoes de logistica definidas. Sem uma opcao explicita para indicar "ainda estou planejando este segmento", o usuario ou deixa campos em branco (gerando erros de validacao) ou preenche dados provisorios incorretos. O checkbox "Ainda nao decidi" permite ao usuario avancar com dados incompletos sem comprometer a integridade das validacoes.

---

## 2. User Story

As a @leisure-family traveler in the early planning stage,
I want to fill in only the logistics details I have confirmed,
so that I can advance through the wizard without being blocked by details I have not yet decided.

### Traveler Context

- **Pain point**: A familia comecou a planejar a viagem com 6 meses de antecedencia. Ja sabe o destino e as datas, mas ainda nao escolheu o hotel. O sistema bloqueia o avanco para a Fase 5 porque os campos de acomodacao sao obrigatorios e estao em branco.
- **Current workaround**: O usuario preenche dados ficticio ("Hotel qualquer", datas inventadas) apenas para "passar de fase", corrompendo os dados do relatorio futuro.
- **Frequency**: Afeta qualquer usuario que planeje com antecedencia (estimativa: >= 50% dos usuarios na fase inicial de planejamento).

---

## 3. Acceptance Criteria

### REQ-PHASE4-001: Toggle Ida / Ida e Volta

#### AC-001: Toggle visivel e funcional
Given o formulario de transporte da Fase 4 esta aberto,
when o usuario visualiza o formulario,
then deve haver um controle de selecao exclusiva com duas opcoes: "Somente Ida" e "Ida e Volta", com "Ida e Volta" como valor padrao.

#### AC-002: Campos exibidos para "Ida e Volta"
Given o toggle esta configurado como "Ida e Volta",
when o formulario e renderizado,
then os campos "Data de Ida" e "Data de Volta" devem estar visiveis e o campo "Data de Volta" deve ser obrigatorio.

#### AC-003: Campos ocultados para "Somente Ida"
Given o toggle esta configurado como "Somente Ida",
when o formulario e renderizado,
then o campo "Data de Volta" deve ser ocultado completamente (nao apenas desabilitado) e o campo "Data de Ida" deve ser obrigatorio.

#### AC-004: Remocao do checkbox "Segmento de retorno"
Given o formulario de transporte esta renderizado,
when o usuario visualiza qualquer configuracao do toggle,
then o checkbox "Segmento de retorno" NAO deve aparecer — o toggle substitui essa funcionalidade de forma mais clara.

#### AC-005: Persistencia do tipo de viagem selecionado
Given o usuario selecionou "Somente Ida" e preencheu os dados,
when o usuario salva e retorna a fase posteriormente,
then o toggle deve exibir "Somente Ida" e o campo "Data de Volta" deve permanecer oculto.

---

### REQ-PHASE4-002: Indicadores de Campos Obrigatorios

#### AC-006: Asterisco em todos os campos obrigatorios — Transporte
Given o formulario de transporte esta renderizado,
when o usuario visualiza os campos,
then os seguintes campos devem ter asterisco (*) visivel no label: "Tipo de transporte", "De (origem)", "Para (destino)", "Data de Ida". Para "Ida e Volta": tambem "Data de Volta".

#### AC-007: Asterisco em todos os campos obrigatorios — Acomodacao
Given o formulario de acomodacao esta renderizado,
when o usuario visualiza os campos,
then os seguintes campos devem ter asterisco (*) visivel no label: "Tipo de acomodacao", "Data de Check-in", "Data de Check-out".

#### AC-008: Asterisco em campos obrigatorios — Mobilidade
Given o formulario de mobilidade local esta renderizado,
when o usuario visualiza as opcoes,
then deve haver indicacao clara de que ao menos 1 opcao de mobilidade precisa ser selecionada (ex: "Selecione pelo menos uma opcao *").

#### AC-009: Legenda de asterisco
Given qualquer formulario da Fase 4 esta renderizado,
when o usuario visualiza a tela,
then deve haver uma legenda visivel (ex: "* Campo obrigatorio") posicionada no formulario ou no rodape do formulario, NAO apenas no rodape de navegacao.

#### AC-010: Mensagem de erro inline ao tentar avancar com campo obrigatorio vazio
Given o usuario nao preencheu um campo marcado como obrigatorio e nao marcou "Ainda nao decidi",
when o usuario clica "Avancar" no rodape padronizado,
then o sistema deve exibir mensagem de erro inline diretamente abaixo do campo vazio, sem navegar para a Fase 5.

---

### REQ-PHASE4-003: Correcao de Bug de Persistencia de Acomodacao

#### AC-011: Persistencia completa de dados de acomodacao
Given o usuario preencheu os campos de acomodacao (tipo, nome, check-in, check-out) e clicou "Salvar" no rodape padronizado,
when o usuario navega para outra fase e retorna a Fase 4,
then todos os dados de acomodacao devem ser exibidos exatamente como foram preenchidos, sem perda de nenhum campo.

#### AC-012: Multiplas acomodacoes persistem corretamente
Given o usuario adicionou 2 ou mais registros de acomodacao,
when o usuario salva e retorna a fase,
then todos os registros de acomodacao devem ser listados e seus dados completos devem estar corretos.

#### AC-013: Persistencia de acomodacao apos reload da pagina
Given o usuario preencheu dados de acomodacao e clicou "Salvar",
when o usuario recarrega a pagina (F5),
then os dados de acomodacao devem ser recarregados do banco de dados sem perda.

#### AC-014: Confirmacao visual de persistencia bem-sucedida
Given o usuario preencheu dados de acomodacao e clicou "Salvar",
when a operacao de persistencia conclui com sucesso,
then o sistema deve exibir toast "Dados salvos" confirmando que os dados foram persistidos.

---

### REQ-PHASE4-004: Checkbox "Ainda nao decidi"

#### AC-015: Checkbox "Ainda nao decidi" disponivel em cada secao
Given o formulario da Fase 4 esta aberto em qualquer uma das 3 secoes (Transporte, Acomodacao, Mobilidade),
when o usuario visualiza a secao,
then deve haver um checkbox "Ainda nao decidi" claramente visivel para aquela secao especifica.

#### AC-016: Campos opcionais ao marcar "Ainda nao decidi"
Given o usuario marca "Ainda nao decidi" em uma secao especifica,
when o formulario e re-avaliado,
then todos os campos obrigatorios daquela secao devem se tornar opcionais (remover validacao de obrigatoriedade), permitindo que fiquem em branco.

#### AC-017: Status da fase ao usar "Ainda nao decidi"
Given o usuario marcou "Ainda nao decidi" em pelo menos uma secao da Fase 4,
when o status da Fase 4 e calculado,
then o status deve ser "Em andamento" (nao "Concluida"), indicando que ha informacoes pendentes de preenchimento futuro.

#### AC-018: Avanco permitido com "Ainda nao decidi" marcado
Given o usuario marcou "Ainda nao decidi" em uma ou mais secoes,
when o usuario clica "Avancar" no rodape padronizado,
then o sistema deve permitir a navegacao para a Fase 5 sem exibir erro de validacao para as secoes com "Ainda nao decidi" marcado.

#### AC-019: Indicador visual de secoes com "Ainda nao decidi"
Given o usuario marcou "Ainda nao decidi" em uma secao e avancou para outra fase,
when o usuario retorna a Fase 4,
then as secoes com "Ainda nao decidi" marcado devem ter indicacao visual clara de que estao "pendentes de decisao" (ex: badge, icone, cor diferente).

#### AC-020: Desmarcar "Ainda nao decidi" restaura obrigatoriedade
Given o usuario havia marcado "Ainda nao decidi" e retornou a Fase 4,
when o usuario desmarca "Ainda nao decidi" em uma secao,
then os campos obrigatorios daquela secao devem restaurar a validacao de obrigatoriedade e o usuario nao pode avancar sem preenchimento.

#### AC-021: Persistencia do estado "Ainda nao decidi"
Given o usuario marcou "Ainda nao decidi" em uma secao e salvou,
when o usuario retorna a fase em sessao posterior,
then o checkbox "Ainda nao decidi" deve continuar marcado e os campos devem permanecer como opcionais.

#### AC-022: "Ainda nao decidi" nao remove dados ja preenchidos
Given o usuario preencheu dados em uma secao e depois marca "Ainda nao decidi" para aquela secao,
when o formulario e re-avaliado,
then os dados ja preenchidos devem ser mantidos no formulario (apenas a validacao de obrigatoriedade e removida, os dados nao sao apagados).

---

## 4. Scope

### In Scope

- Toggle "Somente Ida / Ida e Volta" no formulario de transporte
- Remocao do checkbox "Segmento de retorno"
- Indicadores de asterisco (*) em todos os campos obrigatorios das 3 secoes (Transporte, Acomodacao, Mobilidade)
- Legenda "* Campo obrigatorio" nos formularios
- Correcao do bug de persistencia de dados de acomodacao no banco de dados
- Checkbox "Ainda nao decidi" por secao (Transporte, Acomodacao, Mobilidade) com comportamento de tornar campos opcionais

### Out of Scope (v1)

- Integracao com APIs de busca de voos ou hoteis (fora do escopo MVP — booking flow deferido)
- Sugestoes de acomodacao por IA baseadas no destino — deferido
- Calculo automatico de custo de transporte ou acomodacao — deferido
- Validacao cruzada de datas (ex: data de check-in deve ser compativel com datas da viagem da Fase 1) — pode ser adicionado em sprint futuro
- Limite maximo de segmentos de transporte (regra de negocio atual: sem limite explicito definido no MVP)

---

## 5. Constraints (MANDATORY)

### Security

- A correcao do bug de acomodacao (AC-011 a AC-014) deve incluir testes de regressao de BOLA — verificar que o usuario so consegue salvar acomodacoes no tripId que lhe pertence.
- O estado "Ainda nao decidi" deve ser persistido no servidor, nao apenas no cliente (prevencao de manipulacao de estado via ferramentas de desenvolvedor).
- Campos de bookingCode de acomodacao e transporte devem continuar criptografados apos a correcao do bug.

### Accessibility

- O toggle "Somente Ida / Ida e Volta" deve ser implementado como grupo de botoes com role="group" e aria-label descritivo.
- Campos que se tornam opcionais ao marcar "Ainda nao decidi" devem ter seus atributos aria-required atualizados dinamicamente.
- A ocultacao do campo "Data de Volta" ao selecionar "Somente Ida" deve ser comunicada a screen readers via aria-live.
- Conformidade WCAG 2.1 AA obrigatoria em todos os controles novos.

### Performance

- A troca do toggle "Somente Ida / Ida e Volta" deve atualizar o formulario em < 100ms (operacao client-side pura, sem roundtrip).
- A marcacao de "Ainda nao decidi" deve atualizar a validacao do formulario em < 100ms.
- A correcao do bug de persistencia nao deve adicionar latencia adicional a operacao de salvamento existente (target: < 2s em conexao 3G).

### Architectural Boundaries

- A correcao do bug de persistencia de acomodacao (REQ-PHASE4-003) deve ser diagnosticada e documentada no SPEC-ARCH correspondente antes da implementacao.
- A logica de "Ainda nao decidi" deve ser representada como estado no modelo de dados (campo na entidade de fase ou secao), nao apenas como estado de UI.
- Este spec NAO define a estrutura de dados; isso pertence ao SPEC-ARCH correspondente.

---

## 6. Success Metrics

- Bug de persistencia de acomodacao: 0 registros de acomodacao perdidos em testes de regressao (meta: 100% de correcao)
- Taxa de conclusao da Fase 4 com dados reais (nao ficticios): aumento >= 20% em relacao ao Sprint 33
- Taxa de usuarios que usam "Ainda nao decidi" e retornam para completar: >= 30% (indica que o recurso cumpre seu proposito)
- Relatos de "transporte/acomodacao sumiu": reducao >= 90% apos correcao do bug

---

## 7. Dependencies

- SPEC-PROD-031 (Sprint 33): campos obrigatorios da Fase 4 — este spec refina e expande
- SPEC-PROD-035 (Sprint 34): rodape padronizado — o botao "Avancar" deve invocar as validacoes da Fase 4
- SPEC-PROD-023 (Sprint 31): Phase Completion Logic — o estado "Ainda nao decidi" impacta o calculo de completude da Fase 4
- Correcao do bug de persistencia: requer investigacao do SPEC-ARCH correspondente para identificar a causa raiz antes da implementacao

---

## 8. Vendor Independence

- Este spec descreve WHAT o comportamento deve ser, nao HOW e implementado.
- Nenhuma referencia a bibliotecas especificas de formulario, estado ou persistencia.
- A implementacao tecnica pertence ao SPEC-ARCH correspondente para Sprint 34.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | product-owner | Versao inicial — 4 requisitos (REQ-PHASE4-001 a 004) com 22 ACs cobrindo toggle ida/volta, asteriscos, bug de persistencia e checkbox "Ainda nao decidi" |
