# SPEC-PROD-039: WizardFooter Global — Hook useFormDirty e Dialogo Padronizado

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Spec anterior**: SPEC-PROD-035 (Sprint 34) — este spec extrai e generaliza o mecanismo de dirty-state definido naquele spec

---

## 1. Problem Statement

O Sprint 34 (SPEC-PROD-035) entregou o WizardFooter com dialogo de confirmacao para as 6 fases. No entanto, a implementacao do Sprint 34 centralizou a logica de deteccao de estado "dirty" (alteracoes nao salvas) diretamente dentro do Phase4Wizard — o componente com o formulario mais complexo. As demais fases receberam o dialogo, mas sem um mecanismo de deteccao de dirty state extraido e reutilizavel: cada fase implementou sua propria variacao de comparacao de estado, resultando em inconsistencias comportamentais:

1. **Algoritmos de hash divergentes por fase**: a Fase 2 usa comparacao por referencia de objeto, a Fase 4 usa serialicao JSON, a Fase 1 usa estado booleano manual. Isso cria falsos positivos (dialogo aparece desnecessariamente) e falsos negativos (dialogo nao aparece quando deveria).
2. **SaveDiscardDialog duplicado**: existem pelo menos 3 implementacoes do dialogo modal com textos levemente diferentes, impedindo consistencia de UX e dificultando manutencao.
3. **Phases 5 e 6 sem dirty-state**: a Fase 5 (Guia do Destino) e a Fase 6 (O Roteiro) possuem controles de navegacao mas nao possuem logica de dirty-state porque nao persistem dados pelo usuario — ainda assim precisam do WizardFooter para navegacao consistente.
4. **Ausencia de cobertura de testes do hook**: a logica de deteccao de dirty-state nao tem testes unitarios isolados porque nao e um hook autonomo — ela vive dentro dos componentes.

Sem um hook centralizado e um dialogo unico, qualquer sprint futuro que adicionar campos a uma fase precisara reimplementar essa logica manualmente, aumentando o risco de regressao.

**Impacto mensuravel**: usuarios que editam campos e clicam "Voltar" em fases com implementacao inconsistente perdem dados silenciosamente. O Sprint 35 de QA registrou 3 relatos de perda de dados em fases onde o hash divergente gerava falso negativo (dirty nao detectado).

---

## 2. User Stories

### Story principal

As a @leisure-solo traveler,
I want to be warned whenever I try to navigate away with unsaved changes in any expedition phase,
so that I never lose data I already filled in.

### Story de manutencao (interna)

As a dev-fullstack implementing a new phase field,
I want a single reusable hook that handles dirty-state detection automatically,
so that I do not have to re-implement comparison logic for every new form field.

### Traveler Context

- **Pain point**: O viajante preenche os detalhes de transporte (Fase 4), clica "Voltar" para corrigir a data de viagem (Fase 1), e ao retornar a Fase 4 descobre que os dados nao foram salvos — o dialogo nao foi exibido porque o hash da Fase 4 falhou silenciosamente.
- **Current workaround**: O usuario aprende a sempre clicar "Salvar" antes de navegar — comportamento nao intuitivo que eleva o atrito cognitivo e penaliza usuarios novos.
- **Frequency**: Toda sessao com navegacao entre fases. Com uma media de 4-5 fases visitadas por sessao, a probabilidade de impacto em pelo menos uma fase e alta para qualquer usuario ativo.

---

## 3. Requirements

### REQ-WF-001 — Hook useFormDirty com hash djb2

**MoSCoW**: Must Have
**Esforco**: S

Extrair a logica de deteccao de estado "dirty" para um hook React autonomo `useFormDirty` que usa o algoritmo djb2 para calcular um hash do estado do formulario e compara com o hash persistido.

**Comportamento esperado**:
- O hook aceita o estado atual do formulario (objeto serializavel) como parametro.
- O hook expoe `isDirty: boolean` e `markClean(): void`.
- `isDirty` e `true` quando o hash do estado atual diverge do hash do ultimo `markClean()`.
- `markClean()` deve ser chamado apos persistencia bem-sucedida dos dados.
- O hash deve ser computado de forma sincrona e ter performance < 50ms para formularios com ate 50 campos.
- O hook deve ignorar campos excluidos explicitamente via lista de exclusao (ex: timestamps gerados pelo servidor).

**Restricao de algoritmo**: usar djb2 (nao JSON.stringify simples) para evitar falsos negativos causados por diferencas de ordem de chave em objetos JavaScript.

### REQ-WF-002 — Componente SaveDiscardDialog centralizado

**MoSCoW**: Must Have
**Esforco**: XS

Consolidar as 3+ implementacoes do dialogo modal em um unico componente `SaveDiscardDialog` com as seguintes propriedades:

- `variant`: `"back"` | `"forward"` — controla o texto do titulo e dos botoes.
- `onSave`: callback — acionado pelo botao primario.
- `onDiscard`: callback — acionado pelo botao secundario.
- `onCancel`: callback — acionado pelo botao terciario e pela tecla Esc.
- `isLoading`: boolean — exibe estado de carregamento no botao primario.

**Textos por variante**:

| Elemento | variant "back" | variant "forward" |
|---|---|---|
| Titulo | "Salvar alteracoes antes de voltar?" | "Voce tem alteracoes nao salvas" |
| Botao primario | "Salvar" | "Salvar e Continuar" |
| Botao secundario | "Descartar" | "Continuar sem Salvar" |
| Botao terciario | "Cancelar" | "Cancelar" |

### REQ-WF-003 — WizardFooter aplicado a todas as 6 fases

**MoSCoW**: Must Have
**Esforco**: M

Garantir que o WizardFooter existente use `useFormDirty` + `SaveDiscardDialog` em todas as 6 fases, respeitando as seguintes regras por fase:

| Fase | Nome | Comportamento do WizardFooter |
|---|---|---|
| Fase 1 | O Chamado | Salvar + Navegar (formulario de criacao de viagem) |
| Fase 2 | O Explorador | Salvar + Navegar (estilo de viagem + passageiros) |
| Fase 3 | O Preparo | Salvar + Navegar (checklist de documentos) |
| Fase 4 | A Logistica | Salvar + Navegar (transporte, acomodacao, mobilidade) |
| Fase 5 | Guia do Destino | Navegar apenas (conteudo gerado por IA — sem dados do usuario a salvar) |
| Fase 6 | O Roteiro | Navegar apenas (roteiro gerado por IA — sem dados do usuario a salvar) |

As Fases 5 e 6 nao possuem dirty-state (sem formulario editavel pelo usuario) mas devem ter o WizardFooter para navegacao consistente.

---

## 4. Acceptance Criteria

### AC-039-001: Hook useFormDirty — estado inicial limpo
Given o hook `useFormDirty` e inicializado com um estado de formulario,
when o componente e montado pela primeira vez,
then `isDirty` deve ser `false` (o estado inicial e considerado limpo).

### AC-039-002: Hook useFormDirty — deteccao de alteracao
Given o hook `useFormDirty` esta ativo com estado inicial A,
when o estado do formulario muda para B (onde B != A),
then `isDirty` deve ser `true`.

### AC-039-003: Hook useFormDirty — restauracao do valor original
Given o estado do formulario foi alterado de A para B,
when o usuario restaura manualmente o valor para A,
then `isDirty` deve retornar a `false` (sem falso positivo).

### AC-039-004: Hook useFormDirty — markClean apos salvamento
Given `isDirty` e `true` e o usuario salva os dados,
when `markClean()` e chamado,
then `isDirty` deve ser `false` ate a proxima alteracao.

### AC-039-005: Hook useFormDirty — performance
Given um formulario com ate 50 campos (objetos serializaveis),
when o hook recomputa o hash apos uma alteracao,
then o calculo deve ser concluido em menos de 50ms (medido em dispositivo de referencia mid-range).

### AC-039-006: SaveDiscardDialog — variant "back" textos corretos
Given o `SaveDiscardDialog` e renderizado com `variant="back"`,
when o dialogo e exibido,
then o titulo deve ser "Salvar alteracoes antes de voltar?", o botao primario "Salvar", o botao secundario "Descartar" e o botao terciario "Cancelar".

### AC-039-007: SaveDiscardDialog — variant "forward" textos corretos
Given o `SaveDiscardDialog` e renderizado com `variant="forward"`,
when o dialogo e exibido,
then o titulo deve ser "Voce tem alteracoes nao salvas", o botao primario "Salvar e Continuar", o botao secundario "Continuar sem Salvar" e o botao terciario "Cancelar".

### AC-039-008: SaveDiscardDialog — fechar com Esc
Given o `SaveDiscardDialog` esta aberto,
when o usuario pressiona a tecla Esc,
then o callback `onCancel` e invocado e o dialogo fecha sem nenhuma acao de dados.

### AC-039-009: SaveDiscardDialog — estado de loading
Given o botao primario do `SaveDiscardDialog` foi clicado e `isLoading` e `true`,
when o estado de carregamento esta ativo,
then o botao primario exibe um indicador de carregamento e fica desabilitado; os outros botoes tambem ficam desabilitados para evitar acoes concorrentes.

### AC-039-010: Fase 1 — dialogo ao clicar "Voltar" com dirty
Given a Fase 1 (O Chamado) esta aberta e o usuario alterou pelo menos um campo,
when o usuario clica "Voltar" (retorno ao dashboard de expedicoes),
then o `SaveDiscardDialog` com `variant="back"` e exibido.

### AC-039-011: Fase 2 — dialogo ao clicar "Voltar" com dirty
Given a Fase 2 (O Explorador) esta aberta e o usuario alterou pelo menos um campo,
when o usuario clica "Voltar",
then o `SaveDiscardDialog` com `variant="back"` e exibido.

### AC-039-012: Fase 3 — dialogo ao clicar "Voltar" com dirty
Given a Fase 3 (O Preparo) esta aberta e o usuario alterou pelo menos um campo,
when o usuario clica "Voltar",
then o `SaveDiscardDialog` com `variant="back"` e exibido.

### AC-039-013: Fase 4 — dialogo ao clicar "Voltar" com dirty
Given a Fase 4 (A Logistica) esta aberta e o usuario alterou pelo menos um campo (transporte, acomodacao ou mobilidade),
when o usuario clica "Voltar",
then o `SaveDiscardDialog` com `variant="back"` e exibido.

### AC-039-014: Fase 4 — sem regressao no comportamento atual
Given a Fase 4 ja possui logica de dirty-state implementada,
when o hook `useFormDirty` substitui a implementacao inline,
then o comportamento externo observavel (quais alteracoes disparam o dialogo) deve permanecer identico ao comportamento pre-Sprint 36 para todos os campos existentes.

### AC-039-015: Fases 5 e 6 — WizardFooter sem dialogo
Given a Fase 5 (Guia do Destino) ou a Fase 6 (O Roteiro) esta aberta,
when o usuario clica "Voltar" ou "Avancar",
then o sistema navega diretamente sem exibir `SaveDiscardDialog` (essas fases nao tem estado editavel pelo usuario).

### AC-039-016: Toast apos salvar
Given o usuario clica "Salvar" (botao standalone ou botao primario do dialogo),
when a persistencia e concluida com sucesso,
then um toast com mensagem "Dados salvos" e exibido por 3 segundos.

### AC-039-017: Toast em caso de erro de persistencia
Given o usuario clica "Salvar",
when a operacao de persistencia falha (erro de rede ou servidor),
then um toast de erro e exibido com mensagem "Erro ao salvar. Tente novamente." e `isDirty` permanece `true`.

### AC-039-018: Responsividade mobile
Given um dispositivo com viewport < 480px,
when o `SaveDiscardDialog` esta aberto,
then os 3 botoes devem estar visiveis sem sobreposicao, com areas de toque minimas de 44x44px (WCAG 2.5.5), e o dialogo nao deve transbordar a viewport.

### AC-039-019: Acessibilidade — foco no dialogo
Given o `SaveDiscardDialog` e aberto,
when o dialogo aparece,
then o foco do teclado deve ser movido para o primeiro elemento interativo do dialogo (botao primario), e o foco nao deve escapar do dialogo enquanto ele estiver aberto (focus trap).

### AC-039-020: i18n — textos internacionalizados
Given a aplicacao esta em qualquer locale suportado (pt, en),
when o `SaveDiscardDialog` e exibido,
then todos os textos do dialogo devem ser renderizados no idioma correto sem fallback hardcoded em ingles.

---

## 5. Scope

### In Scope

- Hook `useFormDirty` com hash djb2, `isDirty`, `markClean()`
- Componente `SaveDiscardDialog` unico com `variant="back"` e `variant="forward"`
- Aplicacao do WizardFooter com `useFormDirty` em Fases 1, 2, 3 e 4
- WizardFooter de navegacao pura (sem dirty-state) em Fases 5 e 6
- Testes unitarios isolados para `useFormDirty` (cobertura >= 90%)
- Testes de componente para `SaveDiscardDialog`
- Remocao das implementacoes duplicadas do dialogo nas fases que ja possuiam versoes proprias

### Out of Scope (v1)

- Auto-save periodico em background (requer decisao de arquitetura em SPEC-ARCH; deferido)
- Indicador visual de "unsaved changes" no progress bar lateral ou header (deferido para Sprint 38)
- Modo offline / rascunho local (fora do escopo do MVP)
- Historico de versoes de dados por fase (fora do escopo do MVP)
- Sincronizacao de dirty-state entre abas do navegador
- Fases 7 e 8 (nao ativas no MVP)

---

## 6. Constraints (MANDATORY)

### Security

- O botao "Salvar" deve sempre invocar server actions com validacao de sessao — nunca chamadas diretas a endpoints sem autenticacao.
- Verificacao de ownership obrigatoria: tripId + userId validados no servidor antes de qualquer persistencia (prevencao BOLA/IDOR).
- O hook `useFormDirty` opera exclusivamente no lado cliente — nunca expoe dados de formulario ao servidor durante a computacao do hash.

### Accessibility (WCAG 2.1 AA)

- `SaveDiscardDialog` deve ter `role="dialog"` e `aria-modal="true"`.
- Titulo do dialogo deve ser referenciado via `aria-labelledby`.
- Focus trap obrigatorio dentro do dialogo enquanto aberto (AC-039-019).
- Todos os botoes devem ter `aria-label` descritivo quando o texto sozinho nao for suficiente.
- Contrastes de cor: minimo 4.5:1 para texto normal, 3:1 para texto grande.

### Performance

- Hash djb2 deve completar em < 50ms para formularios com ate 50 campos (AC-039-005).
- O componente `SaveDiscardDialog` deve ser lazy-loaded — nao deve aumentar o bundle inicial das paginas de fase.
- O hook `useFormDirty` nao deve causar re-renders desnecessarios no componente pai — usar `useMemo` para o hash.

### i18n

- Todos os textos do `SaveDiscardDialog` e toasts de salvamento devem ser chaves de traducao registradas no namespace de fases (`expedition` ou `wizard`).
- Sem hardcode de strings em ingles ou portugues nos componentes.

### Compatibility

- Sem breaking changes no contrato externo do WizardFooter (props existentes continuam funcionando).
- A Fase 4 (Phase4Wizard) deve passar em todos os testes de regressao existentes apos a substituicao da logica inline pelo hook (AC-039-014).

---

## 7. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| SPEC-PROD-035 (Sprint 34) | Predecessor | WizardFooter ja implementado; este spec refatora e unifica |
| SPEC-ARCH-028 | Arquitetura | Spec de arquitetura para o hook de dirty-state (a ser criada pelo architect em Sprint 36) |
| SPEC-UX-041 | UX | Spec de design do SaveDiscardDialog unificado (a ser criada pelo ux-designer em Sprint 36) |

---

## 8. Success Metrics

| Metrica | Baseline (Sprint 35) | Target (Sprint 36) |
|---|---|---|
| Relatos de perda de dados em fases | 3 por ciclo de QA | 0 |
| Implementacoes duplicadas do dialogo | 3+ | 1 (SaveDiscardDialog) |
| Cobertura de testes do mecanismo de dirty-state | ~0% (inline, sem testes isolados) | >= 90% |
| Falsos positivos do dirty-state (dialogo desnecessario) | Nao medido | < 1% das interacoes de navegacao |

---

## 9. Out of Scope — Nota sobre SPEC-PROD-035

Este spec NAO substitui SPEC-PROD-035. O SPEC-PROD-035 (Sprint 34) definiu o comportamento externo observavel do WizardFooter. Este spec (SPEC-PROD-039) extrai e padroniza a implementacao interna do mecanismo de dirty-state. Os criterios de aceite do SPEC-PROD-035 continuam validos e devem permanecer passando apos a implementacao deste spec.

---

## 10. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-22 | product-owner | Documento inicial — Sprint 36 planning. Extrai dirty-state para hook useFormDirty + centraliza SaveDiscardDialog |
