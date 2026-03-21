# SPEC-UX-034: Campos Obrigatorios da Fase 4 — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-031
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Contexto e Objetivo do Viajante

O viajante quer saber com clareza quais dados de logistica sao essenciais para prosseguir no planejamento, sem ser sobrecarregado com exigencias excessivas. A diferenciacao visual entre campos obrigatorios e opcionais reduz a carga cognitiva e aumenta a taxa de preenchimento completo, garantindo que o roteiro gerado pela IA (Fase 6) tenha dados reais de logistica como base.

## 2. Personas Afetadas

| Persona | Como esta feature os serve |
|---|---|
| `@leisure-solo` | Precisa de clareza sobre o minimo necessario; evita abandono por sobrecarga de campos |
| `@leisure-family` | Preenche dados para multiplos passageiros; indicadores claros ajudam a nao esquecer campos criticos |
| `@business-traveler` | Quer preencher rapido o essencial e seguir; diferenciacao obrigatorio/opcional permite eficiencia |
| `@group-organizer` | Gerencia multiplos registros de transporte/hospedagem; precisa saber quando pode avancar |

## 3. Fluxo do Usuario

### Caminho Feliz — Preenchimento completo

```
[Fase 4 — Secao Transporte]
    |
    v
[Preenche: Tipo, Origem, Destino, Data ida, Data volta] (obrigatorios)
    |
    v
[Salva registro de transporte] --> [Checkmark verde na secao]
    |
    v
[Fase 4 — Secao Hospedagem]
    |
    v
[Preenche: Tipo, Check-in, Check-out] (obrigatorios)
    |
    v
[Salva registro de hospedagem] --> [Checkmark verde na secao]
    |
    v
[Fase 4 — Secao Mobilidade]
    |
    v
[Seleciona pelo menos 1 opcao de mobilidade] --> [Checkmark verde na secao]
    |
    v
[Clica "Avancar"] --> [Todas secoes completas] --> [Navega para Fase 5]
```

### Caminho com dados incompletos — Tentativa de avanco

```
[Usuario clica "Avancar"]
    |
    v
[Validacao local (sincrona, < 100ms)]
    |
    v
[Secao(oes) incompleta(s) detectada(s)]
    |
    v
[Banner de erro no topo da tela com lista de pendencias por secao]
    |
    v
[Scroll automatico para a primeira secao incompleta]
    |
    v
[Foco no primeiro campo invalido da primeira secao incompleta]
    |
    v
[Botao "Avancar" permanece habilitado mas nao navega ate resolucao]
```

### Validacao inline — Campos individuais

```
[Usuario sai de campo obrigatorio vazio (blur)]
    |
    v
[Mensagem de erro inline abaixo do campo]
    |
    v
[Usuario preenche o campo]
    |
    v
[Mensagem de erro desaparece imediatamente (on-change)]
```

### Casos de borda

- **Registro parcialmente preenchido (nao salvo)**: Nao conta como completo. O banner de pendencias especifica: "Transporte: salve pelo menos um registro com todos os campos obrigatorios."
- **Multiplos registros, um invalido**: Se ao menos um registro valido esta salvo, a secao e considerada completa para fins de avanco. Registros em rascunho (nao salvos) sao ignorados.
- **Observacoes em branco**: Nunca gera erro — campo sempre opcional, sem asterisco.

## 4. Especificacao Visual

### 4.1 Indicadores de Campo Obrigatorio

**Asterisco vermelho**: Cada campo obrigatorio tem um asterisco vermelho (*) apos o label.
- Cor: var(--color-error) (#D93B2B)
- Posicao: inline apos o texto do label, com 4px de gap
- Semantica: `aria-required="true"` no input correspondente
- Texto auxiliar no topo da secao: "Campos marcados com * sao obrigatorios" (exibido uma vez por secao, nao por campo)

**Campos obrigatorios por secao**:

| Secao | Campo | Obrigatorio? |
|---|---|---|
| Transporte | Tipo de transporte | Sim * |
| Transporte | Origem (De) | Sim * |
| Transporte | Destino (Para) | Sim * |
| Transporte | Data de ida | Sim * |
| Transporte | Data de volta | Sim * |
| Transporte | Codigo de reserva | Nao |
| Transporte | Observacoes | Nao |
| Hospedagem | Tipo de hospedagem | Sim * |
| Hospedagem | Data de check-in | Sim * |
| Hospedagem | Data de check-out | Sim * |
| Hospedagem | Nome do local | Nao |
| Hospedagem | Codigo de reserva | Nao |
| Hospedagem | Observacoes | Nao |
| Mobilidade | Selecao de opcoes | Sim (pelo menos 1) * |

### 4.2 Mensagens de Validacao Inline

**Posicao**: Abaixo do campo, com 4px de gap vertical.
**Cor do texto**: var(--color-error) (#D93B2B)
**Tamanho do texto**: 13px (0.8125rem)
**Icone**: Exclamacao circular (inline antes do texto), 14px
**Associacao**: `aria-describedby` ligando o input a mensagem de erro
**Comportamento**:
- Aparece no blur (saida do campo) se vazio/invalido
- Desaparece on-change quando o usuario comeca a digitar
- Nao aparece antes da primeira interacao com o campo (sem erros pre-exibidos)

**Mensagens por campo**:

| Campo | Mensagem PT-BR | Mensagem EN |
|---|---|---|
| Tipo de transporte | Selecione o tipo de transporte | Select the transport type |
| Origem (De) | Informe a cidade de origem | Enter the origin city |
| Destino (Para) | Informe a cidade de destino | Enter the destination city |
| Data de ida | Selecione a data de ida | Select the departure date |
| Data de volta | Selecione a data de volta | Select the return date |
| Tipo de hospedagem | Selecione o tipo de hospedagem | Select the accommodation type |
| Data de check-in | Selecione a data de check-in | Select the check-in date |
| Data de check-out | Selecione a data de check-out | Select the check-out date |
| Mobilidade (secao) | Selecione pelo menos uma opcao de mobilidade | Select at least one mobility option |

### 4.3 Banner de Pendencias (ao tentar avancar)

**Posicao**: Topo da area de conteudo, acima das secoes/abas.
**Estilo**:
- Fundo: #FEF2F2 (vermelho claro)
- Borda esquerda: 4px solid var(--color-error)
- Padding: 16px
- Border-radius: 8px
- Icone de alerta (triangulo com exclamacao) no canto superior esquerdo

**Conteudo**:
- Titulo: "Para avancar, complete as seguintes secoes:" (negrito)
- Lista de pendencias como bullet points, uma por secao incompleta:
  - "Transporte: preencha e salve pelo menos um registro com Tipo, Origem, Destino e Datas"
  - "Hospedagem: preencha e salve pelo menos um registro com Tipo, Check-in e Check-out"
  - "Mobilidade: selecione pelo menos uma opcao de mobilidade local"
- Cada item e um link clicavel que faz scroll para a secao correspondente

**Borda das secoes incompletas**:
- Secoes com pendencia recebem borda vermelha (2px) ao redor do card/painel da secao
- A borda desaparece quando a secao e completada (sem necessidade de refresh)

### 4.4 Estado do Botao "Avancar"

O botao "Avancar" do rodape (SPEC-UX-033) permanece **sempre habilitado**. A validacao ocorre ao clicar — nao antes. Justificativa: desabilitar o botao sem explicacao visivel gera confusao ("por que nao posso clicar?"). Manter habilitado e mostrar o banner de pendencias ao clicar e mais informativo e acessivel.

### 4.5 Indicador de Completude por Secao

Cada secao (Transporte, Hospedagem, Mobilidade) exibe um indicador de status no header da secao/aba:
- **Completa**: Icone de checkmark circular verde (16px) + texto "Completo" em verde
- **Incompleta**: Sem icone (estado neutro)
- **Pendente apos tentativa de avanco**: Icone de alerta triangulo vermelho (16px)

**Estado de loading**: N/A (validacao e sincrona, client-side).

**Estado vazio**: Campos com labels visiveis e placeholders descritivos. Nenhum erro exibido ate a primeira interacao.

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Banner de pendencias ocupa largura total com scroll horizontal se necessario. Mensagens de validacao inline empilhadas abaixo de cada campo. Secoes empilhadas verticalmente. Touch targets dos campos: minimo 44px de altura. |
| Tablet (768-1024px) | Layout similar ao mobile, mas com mais espaco horizontal para labels e mensagens de erro lado a lado quando possivel. |
| Desktop (> 1024px) | Banner de pendencias dentro do container do wizard (max-width do conteudo). Secoes podem estar em tabs ou steps conforme layout existente da Fase 4. |

## 6. Acessibilidade (WCAG 2.1 AA — Obrigatorio)

### Navegacao por teclado

- [ ] Todos os campos obrigatorios navegaveis via Tab na ordem logica do formulario
- [ ] Focus indicator visivel em todos os campos: 2px solid var(--color-primary), outline-offset 2px
- [ ] Links no banner de pendencias navegaveis via Tab e ativados com Enter

### Leitores de tela

- [ ] Todos os campos obrigatorios: `aria-required="true"`
- [ ] Campos com erro: `aria-invalid="true"` + `aria-describedby` apontando para a mensagem de erro
- [ ] Banner de pendencias anunciado via `aria-live="assertive"` quando aparece (apos tentativa de avanco)
- [ ] Indicador de secao completa/incompleta comunicado por texto, nao apenas cor/icone
- [ ] Asterisco de obrigatorio: `<span aria-hidden="true">*</span>` (o `aria-required` no input ja comunica a obrigatoriedade)

### Foco apos validacao

- [ ] Apos exibir erros, foco movido automaticamente para o banner de pendencias (topo)
- [ ] Cada link no banner move foco para o primeiro campo invalido da secao correspondente

### Contraste e cor

- [ ] Texto de erro: vermelho (#D93B2B) sobre fundo branco = 5.1:1 (passa AA)
- [ ] Borda vermelha de secao incompleta: contraste >= 3:1 contra fundo adjacente
- [ ] Asterisco vermelho: mesmo contraste do texto de erro
- [ ] Informacao de obrigatoriedade comunicada por texto ("obrigatorio") e asterisco — nao apenas por cor

### Touch targets

- [ ] Todos os campos de formulario: altura minima 44px em mobile
- [ ] Links no banner de pendencias: area de toque minima 44x44px
- [ ] Opcoes de mobilidade (cards/chips): area de toque minima 44x44px

## 7. Conteudo e Microcopy

### Labels e indicadores

| Chave i18n | PT-BR | EN |
|---|---|---|
| `phase4.requiredFieldsHint` | Campos marcados com * sao obrigatorios | Fields marked with * are required |
| `phase4.sectionComplete` | Completo | Complete |
| `phase4.advanceBlocked.title` | Para avancar, complete as seguintes secoes: | To continue, complete the following sections: |
| `phase4.advanceBlocked.transport` | Transporte: preencha e salve pelo menos um registro com Tipo, Origem, Destino e Datas | Transport: fill in and save at least one record with Type, Origin, Destination and Dates |
| `phase4.advanceBlocked.accommodation` | Hospedagem: preencha e salve pelo menos um registro com Tipo, Check-in e Check-out | Accommodation: fill in and save at least one record with Type, Check-in and Check-out |
| `phase4.advanceBlocked.mobility` | Mobilidade: selecione pelo menos uma opcao de mobilidade local | Mobility: select at least one local mobility option |

### Tom de voz

- Mensagens de validacao sao instrutivas, nao punitivas. "Selecione o tipo de transporte" (instrucao), nao "Tipo de transporte e obrigatorio" (acusacao).
- O banner de pendencias e orientador: "Para avancar, complete..." (caminho a seguir), nao "Voce nao completou..." (culpa).

## 8. Padroes de Interacao

- **Validacao inline**: Aparece on-blur, desaparece on-change. Sem debounce necessario (validacao sincrona).
- **Banner de pendencias**: Aparece com slide-down 200ms ease-out. Desaparece com fade-out 150ms quando todas as secoes sao completadas.
- **Borda de secao incompleta**: Aparece com transicao de border-color 200ms ease-out.
- **Indicador de secao completa (checkmark)**: Aparece com scale de 0 a 1 (150ms) + fade-in.
- **Todas as animacoes**: Respeitam `prefers-reduced-motion` — instantaneas com motion reduzido.
- **Scroll automatico**: Smooth scroll para primeira secao incompleta. Com motion reduzido, scroll instantaneo (`auto`).

## 9. Restricoes (da Spec de Produto)

- Validacao client-side (sincrona, < 100ms) E server-side (definitiva via schemas Zod).
- BOLA: verificar que a expedicao pertence ao usuario autenticado em toda acao de salvar.
- Layout de abas/steps existente da Fase 4 nao muda — apenas adicao de indicadores e validacao.
- Campos obrigatorios condicionais por tipo de transporte estao FORA do escopo (Sprint 34+).
- Validacao de consistencia de datas (check-in >= ida do transporte) esta FORA do escopo.

## 10. Prototipo

- [ ] Prototipo necessario: Nao (os indicadores visuais se integram ao layout existente da Fase 4; as especificacoes visuais nesta spec sao suficientes para implementacao)
- **Nota**: Se a equipe de desenvolvimento solicitar, um prototipo parcial mostrando os estados de validacao pode ser criado.

## 11. Questoes Abertas

- [ ] O botao "Avancar" deve ficar **desabilitado** quando secoes estao incompletas ou **habilitado** com validacao ao clicar? Recomendacao UX: **habilitado** (mostra feedback explicativo ao clicar). PO e architect devem confirmar.
- [ ] Incluir contagem de campos faltantes por secao no banner? Ex.: "Transporte: 3 campos pendentes". Recomendacao UX: nao — descrever QUAIS campos faltam e mais util que uma contagem.

## 12. Padroes Reutilizados

- `FormField` (label + input + error + hint) de ux-patterns.md
- `SelectableCard` para opcoes de mobilidade
- `StandardizedFooter` (SPEC-UX-033) — integrado com a validacao de avanco
- Motion tokens: fast(150ms), normal(200ms) de SPEC-UX-003

---

> **Status da Spec**: Draft
> **Pronto para**: Architect (apos confirmacao da questao do botao habilitado/desabilitado)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | ux-designer | Rascunho inicial — Sprint 33 |
