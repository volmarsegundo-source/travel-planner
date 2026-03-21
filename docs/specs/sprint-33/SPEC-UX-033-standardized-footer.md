# SPEC-UX-033: Rodape Padronizado de Navegacao — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-029
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Contexto e Objetivo do Viajante

O viajante quer navegar entre passos e fases do wizard com total confianca de que seus dados estao seguros, sem medo de perder informacoes ao clicar "Voltar" ou "Avancar". O rodape padronizado elimina inconsistencias de navegacao que existem entre as 6 fases, criando um unico modelo mental: tres botoes, sempre no mesmo lugar, sempre com o mesmo comportamento.

## 2. Personas Afetadas

| Persona | Como esta feature os serve |
|---|---|
| `@leisure-solo` | Frequentemente preenche em multiplas sessoes; precisa de confianca que dados parciais estao salvos |
| `@leisure-family` | Preenche dados complexos (passageiros, criancas); perder dados e particularmente frustrante |
| `@business-traveler` | Valoriza eficiencia; quer salvar rapidamente e continuar depois |
| `@bleisure` | Alterna entre contextos pessoal/profissional; precisa pausar e retomar sem perda |
| `@group-organizer` | Preenche para multiplas pessoas; perda de dados tem impacto multiplicado |

## 3. Fluxo do Usuario

### Caminho Feliz — Navegacao sem dados alterados

```
[Tela de fase/passo atual]
    |
    v
[Usuario clica "Avancar"]
    |
    v
[Sem dados alterados (clean state)]
    |
    v
[Sistema navega para proximo passo/fase imediatamente]
```

### Caminho com dados alterados — Avancar

```
[Tela de fase/passo com dados alterados (dirty)]
    |
    v
[Usuario clica "Avancar"]
    |
    v
[Dialogo: "Salvar alteracoes?"]
    |
    +-- "Salvar e Avancar" --> [Salva dados] --> [Navega para proximo]
    |
    +-- "Descartar e Avancar" --> [Descarta alteracoes] --> [Navega para proximo]
    |
    +-- [Escape / clicar fora] --> [Fecha dialogo, permanece na tela]
```

### Caminho com dados alterados — Voltar

```
[Tela de fase/passo com dados alterados (dirty)]
    |
    v
[Usuario clica "Voltar"]
    |
    v
[Dialogo: "Salvar alteracoes?"]
    |
    +-- "Salvar e Voltar" --> [Salva dados] --> [Navega para anterior]
    |
    +-- "Descartar e Voltar" --> [Descarta alteracoes] --> [Navega para anterior]
    |
    +-- [Escape / clicar fora] --> [Fecha dialogo, permanece na tela]
```

### Salvar sem navegar

```
[Usuario clica "Salvar"]
    |
    +-- [Dados alterados] --> [Persiste no servidor] --> [Feedback "Salvo com sucesso" inline, 3s]
    |
    +-- [Dados identicos ao ultimo save] --> [Feedback "Ja esta salvo" inline, 3s, sem chamada de rede]
    |
    +-- [Erro de rede/servidor] --> [Feedback de erro inline, dados intactos na tela]
```

### Estados de erro

- **Falha de save (rede)**: Mensagem inline acima do rodape: "Nao foi possivel salvar. Verifique sua conexao e tente novamente." com botao "Tentar novamente".
- **Falha de save (servidor)**: Mensagem inline: "Algo deu errado ao salvar. Seus dados estao intactos — tente novamente em alguns instantes."
- **Timeout**: Apos 10 segundos sem resposta, exibir mensagem de erro com opcao de retry.

### Casos de borda

- **Primeiro passo da primeira fase**: Botao "Voltar" esta desabilitado (visivel mas nao clicavel, com `aria-disabled`).
- **Ultimo passo da ultima fase ativa**: Botao "Avancar" exibe label "Concluir" em vez de "Avancar".
- **Modo edicao (revisita de fase)**: Botao primario exibe "Salvar alteracoes" conforme SPEC-UX-017.

## 4. Especificacao Visual

### Componente: Rodape de Navegacao (StandardizedFooter)

**Proposito**: Barra fixa no fundo da viewport contendo os tres botoes de navegacao do wizard.

**Layout**:
- Barra horizontal fixa no fundo da area de conteudo (sticky bottom)
- Borda superior sutil (1px, cor de borda do sistema)
- Fundo da superficie principal (mesma cor do background da pagina) para coerencia visual
- Padding vertical: 16px; padding horizontal: 16px (mobile), 24px (desktop)
- Altura total minima: 76px (44px botao + 32px padding)

**Hierarquia de botoes (esquerda para direita)**:

1. **"Voltar"** (esquerda)
   - Estilo: outline/secondary (borda, sem preenchimento)
   - Icone: seta para esquerda (antes do texto)
   - Estado desabilitado: opacidade 0.5, cursor not-allowed
   - Ausente apenas se nao ha passo/fase anterior (primeiro passo da fase 1)

2. **"Salvar"** (centro)
   - Estilo: ghost/terciario (sem borda, sem preenchimento, texto com destaque sutil)
   - Sem icone no estado padrao; icone de checkmark aparece brevemente apos save bem-sucedido
   - Sempre visivel, sempre habilitado

3. **"Avancar"** (direita)
   - Estilo: primario (preenchido com cor principal, texto branco)
   - Variante final: "Concluir" no ultimo passo da ultima fase
   - Estado de loading: spinner inline substituindo o texto
   - Pode ser desabilitado por validacao de campos obrigatorios (ver SPEC-UX-034)

**Feedback de save inline**:
- Posicao: acima do rodape, como um banner fino (32px altura)
- Sucesso: fundo verde claro (#ECFDF5), texto verde escuro (#065F46), icone checkmark
- "Ja salvo": fundo azul claro (#EFF6FF), texto azul escuro (#1E40AF), icone informacao
- Erro: fundo vermelho claro (#FEF2F2), texto vermelho escuro (#991B1B), icone alerta + botao "Tentar novamente"
- Auto-dismiss: 3 segundos para sucesso/"ja salvo"; persistente para erro
- Anunciado via `aria-live="polite"` para leitores de tela

**Dialogo de confirmacao (save/discard)**:
- Modal centralizado com overlay escuro (semi-transparente)
- Titulo: "Salvar alteracoes?"
- Corpo: "Voce fez alteracoes que ainda nao foram salvas."
- Botao primario: "Salvar e [Voltar/Avancar]" (depende do contexto)
- Botao secundario: "Descartar e [Voltar/Avancar]"
- Fechar: Escape ou clicar no overlay fecha sem acao (retorno a tela)
- Foco automatico no botao primario ao abrir
- Focus trap ativo enquanto dialogo aberto

**Estado de loading (durante save)**:
- Botao "Salvar" exibe spinner inline + texto "Salvando..."
- Botoes "Voltar" e "Avancar" ficam desabilitados durante o save
- O rodape inteiro fica em estado de espera; nenhuma navegacao permitida

**Estado vazio**: N/A (o rodape esta sempre presente em telas de wizard).

## 5. Responsividade

| Breakpoint | Comportamento do layout |
|---|---|
| Mobile (< 768px) | Tres botoes em linha, largura total. "Voltar" ocupa ~25%, "Salvar" ocupa ~25%, "Avancar" ocupa ~50%. Botoes com altura minima 44px. Padding horizontal 16px. Rodape fixo no bottom da viewport. |
| Tablet (768-1024px) | Tres botoes centralizados com gap de 12px. Largura maxima do rodape: 640px, centralizado. Botoes com largura automatica pelo conteudo. |
| Desktop (> 1024px) | Tres botoes alinhados dentro do container do wizard (max-width do conteudo). "Voltar" alinhado a esquerda, "Salvar" ao centro, "Avancar" a direita. |

Em todos os breakpoints, o rodape e sticky (fixo no fundo da area visivel) e acompanha o scroll da pagina.

## 6. Acessibilidade (WCAG 2.1 AA — Obrigatorio)

### Navegacao por teclado

- [ ] Tab order: Voltar -> Salvar -> Avancar (esquerda para direita)
- [ ] Todos os tres botoes acessiveis via Tab
- [ ] Focus indicator visivel: 2px solid var(--color-primary), outline-offset 2px
- [ ] Botao desabilitado: `aria-disabled="true"` (nao `disabled`, para que continue no tab order com anuncio de estado)
- [ ] Enter ou Space ativa o botao focado

### Dialogo de confirmacao

- [ ] `role="dialog"` com `aria-modal="true"`
- [ ] `aria-labelledby` apontando para o titulo do dialogo
- [ ] `aria-describedby` apontando para o corpo do dialogo
- [ ] Foco movido para o primeiro botao interativo ao abrir
- [ ] Focus trap: Tab circula apenas entre os elementos do dialogo
- [ ] Escape fecha o dialogo e retorna foco ao botao que o abriu

### Feedback de save

- [ ] Banner de sucesso/erro anunciado via `aria-live="polite"`
- [ ] Texto do feedback e descritivo (nao apenas icone/cor)
- [ ] Contraste do texto no banner >= 4.5:1

### Contraste e cor

- [ ] Texto dos botoes: contraste >= 4.5:1 em todos os estados (normal, hover, disabled)
- [ ] Botao primario "Avancar": texto branco sobre fundo primario — verificar contraste (branco #FFFFFF sobre #E8621A = 3.2:1 para texto normal; usar fonte >= 18px/bold para passar como large text, ou escurecer fundo para #C74E0F para atingir 4.5:1)
- [ ] Nenhuma informacao transmitida apenas por cor

### Touch targets

- [ ] Todos os botoes: area de toque minima 44x44px em mobile
- [ ] Espacamento entre botoes: minimo 8px

### Motion

- [ ] Spinner de loading: `motion-reduce:animate-none`
- [ ] Transicao de abertura/fechamento do dialogo: respeitam `prefers-reduced-motion`

## 7. Conteudo e Microcopy

### Labels e CTAs

| Chave i18n | PT-BR | EN |
|---|---|---|
| `wizard.footer.back` | Voltar | Back |
| `wizard.footer.save` | Salvar | Save |
| `wizard.footer.advance` | Avancar | Next |
| `wizard.footer.conclude` | Concluir | Finish |
| `wizard.footer.saving` | Salvando... | Saving... |
| `wizard.footer.saveChanges` | Salvar alteracoes | Save changes |

### Mensagens de feedback

| Cenario | PT-BR | EN |
|---|---|---|
| `wizard.footer.savedSuccess` | Salvo com sucesso | Saved successfully |
| `wizard.footer.alreadySaved` | Ja esta salvo | Already saved |
| `wizard.footer.saveError` | Nao foi possivel salvar. Verifique sua conexao e tente novamente. | Could not save. Check your connection and try again. |
| `wizard.footer.serverError` | Algo deu errado ao salvar. Seus dados estao intactos — tente novamente em alguns instantes. | Something went wrong while saving. Your data is intact -- try again in a moment. |
| `wizard.footer.retry` | Tentar novamente | Try again |

### Dialogo de confirmacao

| Cenario | PT-BR | EN |
|---|---|---|
| `wizard.footer.dialog.title` | Salvar alteracoes? | Save changes? |
| `wizard.footer.dialog.body` | Voce fez alteracoes que ainda nao foram salvas. | You have unsaved changes. |
| `wizard.footer.dialog.saveAndBack` | Salvar e Voltar | Save and go back |
| `wizard.footer.dialog.discardAndBack` | Descartar e Voltar | Discard and go back |
| `wizard.footer.dialog.saveAndAdvance` | Salvar e Avancar | Save and continue |
| `wizard.footer.dialog.discardAndAdvance` | Descartar e Avancar | Discard and continue |

### Tom de voz

- Sempre tranquilizador: o viajante nunca deve sentir que esta prestes a perder dados.
- Mensagens de erro nunca culpam o usuario. "Nao foi possivel salvar" (neutro), nunca "Voce nao salvou".
- Confirmacoes sao breves e afirmativas.

## 8. Padroes de Interacao

- **Transicao de tela**: Ao navegar entre passos, usar fade+slide 200ms ease-out conforme SPEC-UX-003 (tokens de motion definidos).
- **Feedback de save**: Banner aparece com slide-down 150ms, desaparece com fade-out 150ms apos 3s.
- **Dialogo**: Aparece com fade-in 200ms + scale de 0.95 a 1.0. Overlay com fade-in 150ms.
- **Dirty state**: Indicador visual sutil no botao "Salvar" quando ha dados alterados (ponto azul de 6px no canto superior direito do botao, similar a notificacao). Opcional: texto do botao muda para "Salvar*" com asterisco.
- **Todas as animacoes**: Respeitam `prefers-reduced-motion` — com motion reduzido, transicoes sao instantaneas (0ms).
- **Atalhos de teclado**: Nenhum atalho global (Ctrl+S etc.) nesta versao — risco de conflito com atalhos do navegador. Pode ser avaliado em sprint futuro.

## 9. Restricoes (da Spec de Produto)

- Nao usar `window.confirm` — dialogo custom com ARIA.
- Save via server actions (POST), nunca query params na URL.
- Dirty state comparado com ultimo save persistido, nao com estado inicial da sessao.
- Componente nao pode adicionar mais que 5KB ao bundle.
- Respeitar contrato de navegacao de SPEC-PROD-016 (Phase Navigation Engine).
- O rodape SUBSTITUI todos os rodapes/botoes CTA existentes nas fases — nenhuma coexistencia.

## 10. Prototipo

- [ ] Prototipo necessario: Sim
- **Localizacao**: `docs/prototypes/standardized-footer.html`
- **Escopo**: Rodape com 3 botoes + dialogo de confirmacao + estados de feedback
- **Status**: A criar apos aprovacao da spec

## 11. Questoes Abertas

- [ ] Cor do botao "Avancar": manter #E8621A (laranja primario) ou usar #2DB8A0 (teal)? O WizardFooter atual usa teal (`bg-atlas-teal`). A spec SPEC-UX-009 padronizou "Avancar" com laranja. Recomendacao UX: **manter laranja** para coerencia com SPEC-UX-009, mas verificar contraste com texto branco (pode necessitar ajuste para #C74E0F). PO deve confirmar.
- [ ] Indicador visual de dirty state: ponto azul no botao "Salvar" ou nenhum indicador visual (confiar apenas no dialogo ao navegar)? Recomendacao UX: ponto azul — feedback proativo reduz ansiedade.

## 12. Padroes Reutilizados

- `WizardFooter` (existente) — sera estendido/substituido por este componente padronizado
- `ConfirmDialog` (de ux-patterns.md) — base para o dialogo de save/discard
- Toast/Banner de feedback — padrao existente de feedback inline
- Motion tokens: fast(150ms), normal(200ms), slow(300ms) de SPEC-UX-003

---

> **Status da Spec**: Draft
> **Pronto para**: Architect (apos resolucao das 2 questoes abertas)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | ux-designer | Rascunho inicial — Sprint 33 |
