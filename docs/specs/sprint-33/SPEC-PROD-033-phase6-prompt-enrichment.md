# SPEC-PROD-033: Enriquecimento do Prompt da Fase 6 (IMP-005)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, prompt-engineer
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Problem Statement

O prompt de geracao de roteiro da Fase 6 ("O Roteiro") nao utiliza todos os dados que o usuario preencheu nas Fases 1-5. Como resultado, a IA gera roteiros genericos que ignoram informacoes cruciais como: tipo de transporte escolhido, hospedagem e localizacao, restricoes alimentares, nivel de acessibilidade, ritmo de viagem desejado, e destaques do guia de destino.

Um viajante que escolheu hospedagem em uma fazenda rural 30km do centro da cidade, declara ritmo "relaxado", tem restricao alimentar vegetariana e quer priorizar museus de historia, deveria receber um roteiro radicalmente diferente de outro viajante hospedado em hotel no centro, ritmo "intenso", sem restricoes alimentares e interessado em nightlife. Atualmente, o sistema pode gerar roteiros quase identicos para esses dois perfis.

Esse e o problema de personalizacao central da plataforma. A IA ja tem capacidade para personalizar — falta alimenta-la com os dados corretos.

## 2. User Story

As a @leisure-solo,
I want the AI to generate my itinerary using ALL data I provided across all planning phases,
so that the itinerary reflects my real travel context, preferences, and logistics — not a generic tourist plan.

### Traveler Context

- **Pain point**: O usuario investe tempo preenchendo preferencias detalhadas, transporte e hospedagem, e recebe um roteiro que parece ter sido gerado sem considerar nada disso. A percepcao de "esse app nao entendeu nada que eu disse" e devastadora para o NPS.
- **Current workaround**: Nenhum — o usuario nao tem como forcar a IA a usar os dados que preencheu. Alguns usuarios recorrem a ChatGPT manualmente, inserindo os dados eles mesmos.
- **Frequency**: Toda geracao de roteiro — evento central e de alto impacto emocional no uso do produto.

## 3. Acceptance Criteria

### Dados de Entrada do Prompt

- [ ] AC-001: O prompt de geracao de roteiro DEVE incluir os seguintes dados quando preenchidos: nome do destino e pais, cidade/regiao de origem, datas de inicio e fim da viagem (com calculo de duracao em dias), numero e composicao de passageiros (adultos, criancas, bebes, idosos).
- [ ] AC-002: O prompt DEVE incluir dados de perfil do viajante quando disponiveis: tipo de viajante (lazer solo, familia, negocios, etc.), faixa etaria calculada a partir da data de nascimento (sem expor a data exata), idioma de preferencia da conta.
- [ ] AC-003: O prompt DEVE incluir TODAS as preferencias preenchidas pelo usuario nas 8 categorias: culinaria preferida, atividades de interesse, ritmo de viagem (relaxado/moderado/intenso), periodo do dia preferido, restricoes alimentares, necessidades de acessibilidade, orcamento de refeicoes, interesses culturais.
- [ ] AC-004: O prompt DEVE incluir dados de transporte quando preenchidos: tipo(s) de transporte utilizado(s), origem e destino de cada segmento, datas de ida e volta — permitindo que a IA saiba, por exemplo, que o viajante chega de aviao tarde da noite no primeiro dia.
- [ ] AC-005: O prompt DEVE incluir dados de hospedagem quando preenchidos: tipo(s) de hospedagem, datas de check-in e check-out, numero de registros (quando ha multiplas hospedagens, indicar as datas de cada uma para que a IA distribua as atividades georreferenciadas).
- [ ] AC-006: O prompt DEVE incluir as opcoes de mobilidade local selecionadas (ex.: "a pe, bicicleta, transporte publico") — a IA deve considerar esses modais ao sugerir deslocamentos entre atividades.
- [ ] AC-007: O prompt DEVE incluir os destaques do guia de destino que o usuario marcou como interesse na Fase 5 (quando aplicavel).
- [ ] AC-008: O prompt DEVE incluir os itens do checklist de documentos marcados como concluidos, para que a IA saiba que o viajante confirmou, por exemplo, que tem visto — relevante para roteiros com destinos que exigem documentacao especifica.

### Qualidade do Output

- [ ] AC-009: O roteiro gerado com o prompt enriquecido deve distribuir as atividades considerando o ritmo de viagem declarado (relaxado = menos atividades por dia, mais pausas; intenso = mais atividades, agenda densa).
- [ ] AC-010: O roteiro deve considerar restricoes alimentares ao sugerir restaurantes ou refeicoes — nunca sugerir opcoes incompativeis com as restricoes declaradas.
- [ ] AC-011: O roteiro deve considerar as datas reais de check-in/check-out da hospedagem para definir o primeiro e o ultimo dia da expedicao com atividades.
- [ ] AC-012: Se o usuario declarou necessidade de acessibilidade, o roteiro deve priorizar locais acessiveis e evitar sugestoes incompativeis (ex.: trilhas sem acessibilidade para cadeirante).
- [ ] AC-013: Quando ha criancas ou bebes na composicao de passageiros, o roteiro deve incluir atividades family-friendly e evitar sugestoes inadequadas para essas idades.

### Transparencia para o Usuario

- [ ] AC-014: Antes de gerar o roteiro, o sistema exibe para o usuario um resumo dos dados que serao enviados a IA (ex.: "Gerando roteiro com base em: 7 dias, Lisboa, 2 adultos, ritmo relaxado, vegetariano, museus e historia"). O usuario pode confirmar ou voltar para ajustar dados.
- [ ] AC-015: Apos a geracao, o sistema indica quantas das 8 categorias de preferencias foram utilizadas (ex.: "Roteiro personalizado com 6/8 preferencias preenchidas — complete seu perfil para uma experiencia ainda mais personalizada").

### Tratamento de Dados Ausentes

- [ ] AC-016: Se uma categoria de dados nao foi preenchida pelo usuario, o prompt omite aquela secao — nao usa valores padrao ou genericos que poderiam enviesar a geracao.
- [ ] AC-017: O sistema nunca bloqueia a geracao de roteiro por dados faltantes — mesmo com o minimo de dados (apenas destino e datas), o roteiro e gerado com o que existe.

## 4. Scope

### In Scope

- Mapeamento de todos os campos das Fases 1-5 para o prompt de geracao de roteiro
- Resumo pre-geracao (AC-014) mostrando o que sera usado
- Indicador pos-geracao de completude das preferencias (AC-015)
- Tratamento correto de dados ausentes (omissao, nao valores padrao)

### Out of Scope

- Alteracao da estrutura ou tamanho maximo do roteiro gerado (responsabilidade do prompt-engineer em SPEC-AI correspondente)
- Geracao de roteiro incremental por dia (feature futura)
- Personalizacao do prompt pelo usuario (ex.: instrucoes customizadas para a IA)
- Uso de dados de localizacao em tempo real durante a viagem
- Integracao com APIs de disponibilidade de atracoes

## 5. Constraints (MANDATORY)

### Security

- Nenhum dado sensivel (bookingCode cifrado, birthDate, dados de pagamento) deve ser incluido no prompt enviado a IA — usar apenas os dados necessarios para a personalizacao do roteiro
- O prompt nao deve incluir o ID do usuario ou qualquer identificador pessoal — usar apenas dados contextuais da viagem
- O conteudo gerado pelo prompt deve passar pelos guardrails existentes de output safety antes de ser exibido ao usuario

### Accessibility

- O resumo pre-geracao (AC-014) deve ser acessivel via leitor de tela
- O indicador de completude pos-geracao (AC-015) deve ser anunciado via `aria-live`

### Performance

- A coleta e montagem dos dados para o prompt (antes de enviar a IA) deve completar em menos de 500ms
- O tamanho do prompt enriquecido nao deve exceder o limite de tokens definido pelo prompt-engineer (a ser especificado em SPEC-AI correspondente) — se o limite for excedido, aplicar estrategia de priorizacao: dados estruturais > preferencias > destaques de guia
- Nao deve haver chamadas adicionais ao banco de dados alem das necessarias para agregar os dados da expedicao

### Architectural Boundaries

- Esta spec define QUAIS dados devem estar no prompt e QUAL comportamento o roteiro deve demonstrar como resultado — a estrutura exata do prompt (texto, formatacao, instrucoes do sistema) e responsabilidade do SPEC-AI correspondente a ser criado pelo prompt-engineer
- Deve reutilizar a logica de agregacao de dados do `expedition-summary.service.ts` ou equivalente — nao duplicar queries

## 6. Success Metrics

- Score de personalizacao percebida (survey de beta): pergunta "O roteiro refletiu suas preferencias e contexto de viagem?" — meta >= 4.0/5.0
- Taxa de re-geracao de roteiro (usuario gera, descarta, e gera novamente): reducao >= 30% em relacao ao baseline (indica que o primeiro roteiro ja e satisfatorio)
- Percentual de roteiros gerados com todas as 8 preferencias preenchidas: meta >= 60% dos usuarios que chegam a Fase 6
- Feedbacks negativos sobre o roteiro em survey de beta: reducao >= 40% comparado ao baseline pre-enriquecimento

## 7. Dependencies

- SPEC-PROD-031: Phase 4 Mandatory Fields — garante que os dados de logistica essenciais estejam preenchidos antes de chegar a Fase 6
- SPEC-PROD-026: Completion Engine Fixes — necessario para que os estados de fase sejam confiáveis ao montar os dados do prompt
- SPEC-AI (a criar pelo prompt-engineer): especificacao tecnica do prompt enriquecido, limites de tokens, estrategia de priorizacao

## 8. Vendor Independence

- Este spec descreve WHAT data must be included and WHAT behavior the output should demonstrate.
- Must NOT reference specific AI models, prompt formats, or API parameters.
- Implementation details belong in the corresponding SPEC-AI-XXX.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | product-owner | Rascunho inicial — Sprint 33 IMP-005 |
