# SPEC-PROD-AI-PROGRESS: Componente de Progresso de Geracao AI

**Version**: 1.0.0
**Status**: Approved
**Author**: product-owner
**Reviewers**: ux-designer, architect, tech-lead
**Created**: 2026-04-09
**Last Updated**: 2026-04-09

---

## 1. Problem Statement

As Fases 5 (Guia do Destino) e 6 (O Roteiro) disparam geracao de conteudo por IA que pode levar entre 10 e 60 segundos. Atualmente o usuario nao recebe nenhum feedback visual estruturado durante esse periodo: nao sabe se o sistema esta processando, se travou, ou se deve aguardar. Isso gera abandono da geracao, re-cliques indevidos (disparo multiplo de requests) e percepca de falha onde nao existe.

O problema e agravado pelo ambiente de staging (Vercel Hobby, limite de 60s por funcao serverless), que coloca pressao adicional sobre o tempo de resposta e exige que o usuario confie no sistema por mais tempo sem feedback.

Contexto de uso: MVP Beta. Usuarios sao early adopters convidados, tolerantes a imperfeicoes, mas sensíveis a percecao de sistema quebrado.

## 2. User Story

As a @leisure-solo traveler or @leisure-family organizer,
I want to see clear, reassuring progress feedback while the AI generates my destination guide or itinerary,
so that I know the system is working, understand how long to wait, and do not abandon the flow prematurely.

### Traveler Context

- **Pain point**: Tela congelada ou botao sem resposta apos clicar em "Gerar" — o usuario nao sabe se deve aguardar ou recarregar a pagina.
- **Current workaround**: O usuario fecha a aba, clica novamente, ou reporta bug. Cada re-clique pode consumir PA desnecessariamente (custo duplo).
- **Frequency**: Ocorre em 100% das geracoes de Fase 5 e Fase 6 — e o caminho critico do produto.

## 3. Acceptance Criteria

### Bloco A — Inicio e Feedback Imediato

- [ ] AC-01: Dado que o usuario clicou no botao de geracao (Fase 5 ou Fase 6), quando a requisicao for enviada, entao o sistema deve exibir feedback visual de progresso em no maximo 500ms apos o clique — independentemente de a resposta da IA ter chegado.
- [ ] AC-02: Dado que o feedback de progresso esta ativo, quando exibido, entao o botao de geracao deve ser desabilitado imediatamente para prevenir cliques multiplos (double-submit).
- [ ] AC-03: Dado que o feedback esta ativo, entao o usuario NAO pode navegar para outra fase via stepper ou botao "Voltar" enquanto a geracao esta em andamento — o fluxo nao pode retornar a tela inicial entre o inicio do progresso e a exibicao do resultado.

### Bloco B — Mensagens de Progresso e Estimativa de Tempo

- [ ] AC-04: Dado que a geracao levou mais de 0s, entao o componente deve exibir uma mensagem de status descritiva (ex.: "Analisando o destino...", "Montando seu guia...", "Finalizando detalhes...") que transmita progresso percebido, mesmo que o progresso real nao seja mensuravel.
- [ ] AC-05: Dado que a geracao levou mais de 15 segundos, entao o componente deve exibir uma mensagem de tranquilidade explicita informando que o processo pode levar ate 60 segundos e que o sistema esta trabalhando normalmente.
- [ ] AC-06: Dado que a geracao levou mais de 30 segundos, entao o componente deve exibir uma mensagem adicional de contexto educativo (ex.: "Criamos um guia personalizado para voce — isso exige um pouco mais de tempo.") para reduzir a percepcao de falha.
- [ ] AC-07: Todas as mensagens exibidas durante o progresso devem estar disponíveis em Portugues Brasileiro (pt-BR) E Ingles (en), seguindo o sistema de i18n existente do projeto (next-intl).

### Bloco C — Cancelamento

- [ ] AC-08: Dado que a geracao esta em andamento, entao o usuario deve ter acesso a um botao "Cancelar" visivel e acessivel em todas as fases (Fase 5 e Fase 6).
- [ ] AC-09: Dado que o usuario clicou em "Cancelar", quando confirmado, entao o sistema deve abortar a geracao, NAO debitar PA do usuario (se o debito nao tiver sido finalizado), e retornar o usuario ao estado anterior da fase com o botao de geracao reabilitado.
- [ ] AC-10: Dado que o usuario clicou em "Cancelar", entao o sistema deve exibir uma mensagem de confirmacao antes de abortar (ex.: "Tem certeza? Sua geracao sera cancelada.") para prevenir cancelamentos acidentais.

### Bloco D — Conclusao e Erro

- [ ] AC-11: Dado que a geracao foi concluida com sucesso, quando o conteudo estiver disponível, entao o componente de progresso deve ser substituido pelo conteudo gerado sem recarregar a pagina inteira.
- [ ] AC-12: Dado que a geracao falhou com erro tecnico (timeout, erro de rede, erro de API), entao o sistema deve exibir uma mensagem de erro amigavel em PT-BR e EN, indicando que o PA NAO foi debitado, e oferecer botao "Tentar novamente".
- [ ] AC-13: Dado que a geracao falhou por timeout (>60s no ambiente atual), entao a mensagem de erro deve ser especifica: "A geracao demorou mais do que o esperado. Seu saldo de PA foi preservado. Tente novamente em instantes."
- [ ] AC-14: Dado que ocorreu um erro durante a geracao, entao o erro deve ser registrado no sistema de monitoramento (Sentry) com contexto suficiente: userId, tripId, fase, duracao ate a falha — sem expor PII na mensagem de erro ao usuario.

### Bloco E — Compartilhamento e Reutilizacao

- [ ] AC-15: O componente de progresso deve ser um componente unico e compartilhado, utilizado tanto na Fase 5 quanto na Fase 6, recebendo via parametros: (a) o texto das mensagens de progresso especificas da fase, (b) o custo em PA da operacao, (c) o handler de cancelamento.
- [ ] AC-16: O componente deve ser reutilizavel para futuras geracoes AI do produto (ex.: Fase 5 regeneracao, Fase 6 regeneracao inteligente — SPEC-ROTEIRO-REGEN-INTELIGENTE) sem modificacao do contrato do componente.

### Bloco F — Acessibilidade

- [ ] AC-17: O estado de progresso deve ser anunciado para leitores de tela via atributo `aria-live` (politeness: "polite") ou equivalente semantico — sem referencia a implementacao especifica.
- [ ] AC-18: O botao "Cancelar" deve ser acessivel via navegacao por teclado (Tab + Enter/Space) e ter label descritiva (nao apenas icone).
- [ ] AC-19: O componente de progresso nao deve depender exclusivamente de cor para comunicar estado — deve haver texto ou icone complementar.

### Bloco G — Performance

- [ ] AC-20: O componente de progresso nao deve introduzir nenhuma chamada adicional de rede alem da propria chamada de geracao AI ja existente.
- [ ] AC-21: A transicao entre estados (idle -> loading -> success/error) nao deve causar layout shift mensuravel (CLS > 0.1) na pagina da fase.

## 4. Scope

### In Scope

- Componente de feedback de progresso para geracao AI nas Fases 5 e 6
- Estados: idle, loading (com mensagens sequenciais), success (transicao para conteudo), error (com retry)
- Botao Cancelar com confirmacao
- Mensagens temporizadas (0s, 15s, 30s)
- i18n PT-BR e EN para todas as strings
- Acessibilidade WCAG 2.1 AA
- Logging de erros no sistema de monitoramento existente

### Out of Scope

- Barra de progresso com percentual real (nao temos streaming de progresso do lado do servidor nesta versao)
- Estimativa de tempo restante baseada em dados historicos (requer analytics — futuro)
- Notificacao push ou email quando a geracao for concluida (geracao em background — futuro)
- Aplicacao retroativa a outras geracoes AI do produto (Fase 3 checklist) nesta versao
- Animacoes elaboradas ou Lottie files (manter simples para MVP)

## 5. Constraints (MANDATORY)

### Security

- O componente nao pode expor em mensagens de erro ao usuario: userId, tripId, stack traces, chaves de API ou detalhes internos da falha.
- Cancelamento deve verificar autorizacao: apenas o proprio usuario pode cancelar sua propria geracao (protecao contra BOLA).
- PA so pode ser debitado apos confirmacao de sucesso da geracao — nunca no inicio da requisicao.

### Accessibility

- WCAG 2.1 AA minimo em todos os estados do componente.
- Leitores de tela devem anunciar mudancas de estado (inicio, mensagens de progresso, conclusao, erro).
- Navegacao por teclado completa: botao Cancelar, botao Tentar novamente, botao de confirmacao do dialogo de cancelamento.
- Nenhum elemento interativo pode ficar inacessivel durante o estado de loading.

### Performance

- Tempo ate primeiro feedback visual: maximo 500ms apos clique do usuario (AC-01).
- O componente nao pode bloquear o thread principal durante o estado de loading.
- Sem chamadas de rede adicionais introduzidas pelo componente em si.
- Bundle size do componente: maximo 10KB gzipped (e um componente de UI simples).

### Architectural Boundaries

- O componente define WHAT o usuario ve — o HOW (polling, SSE, streaming) e decisao do architect (SPEC-ARCH correspondente).
- O componente deve ser desacoplado do provider de AI: nao pode referenciar Gemini, Anthropic, ou qualquer vendor diretamente.
- Deve respeitar o sistema de design V2 existente (tokens atlas-*, fontes Plus Jakarta Sans / Work Sans) quando o flag NEXT_PUBLIC_DESIGN_V2 estiver ativo.
- Deve funcionar com e sem o flag de Design V2 (suporte a ambos os visuais).

## 6. Success Metrics

- Taxa de abandono durante geracao AI: reducao de baseline atual para menos de 10% (a medir apos deploy).
- Taxa de double-submit (cliques multiplos no botao Gerar): reducao para 0% (botao desabilitado — AC-02).
- Taxa de relatos de "sistema travado" nos canais de feedback beta: reducao de >50% em relacao ao baseline pre-feature.
- Tickets de suporte relacionados a "PA debitado sem conteudo gerado": 0 ocorrencias apos implementacao dos ACs de erro (AC-12, AC-13).
- Medicao: via Sentry (erros capturados) + feedback qualitativo dos beta testers nos primeiros 7 dias apos deploy.

## 7. Dependencies

- SPEC-PROD-055 (Manual AI Generation): define que geracao e manual e PA e debitado so no sucesso — este spec depende dessa semantica estar implementada.
- SPEC-ROTEIRO-REGEN-INTELIGENTE: ao ser implementado no Sprint 41, deve reutilizar este componente (AC-16).
- SPEC-GUIA-PERSONALIZACAO: regeneracao de Fase 5 deve reutilizar este componente (AC-16).
- Sistema de monitoramento existente (Sentry): deve estar operacional para AC-14.
- Sistema i18n existente (next-intl, messages/pt-BR.json e messages/en.json): chaves de traducao devem ser adicionadas nestes arquivos.

## 8. Vendor Independence

- Este spec descreve WHAT o componente exibe e WHEN exibe — nao HOW e implementado.
- Nao referencia React, Next.js, Tailwind, ou qualquer biblioteca de UI.
- A escolha de mecanismo de progresso (polling, streaming, SSE, timer local) e decisao do architect no SPEC-ARCH correspondente.
- A escolha de biblioteca de animacao (ou ausencia dela) e decisao de implementacao.

---

## Decisao de Produto Relacionada (Decisao 1 — Provider AI)

Esta secao registra a decisao de produto que motivou a criacao deste spec.

**Contexto**: Fases 5 e 6 apresentam timeouts no staging (Vercel Hobby, limite 60s). Causa raiz: latencia do provider de AI combinada com prompts longos.

**Decisao**: Opcao (b) — Anthropic como provider primario para Fases 5 e 6 durante o periodo beta, com condicao de reavaliacao.

**Justificativa**:
1. Beta e o momento de capturar primeiras impressoes. Uma geracao que falha por timeout destroi a confianca do early adopter de forma irreversivel. Custo de reputacao supera custo de API em ordens de magnitude neste estagio.
2. O COST-LOG.md mostra que custos de API em producao sao zero atualmente (sem usuarios reais em volume). O overhead de Anthropic vs. Gemini em beta com dezenas de usuarios e negligenciavel — estimativa: delta de menos de $5/mes para o volume de beta esperado.
3. Anthropic Sonnet ja e o provider para usuarios Premium (decisao Sprint 8). Usar Sonnet para todos os usuarios nas Fases 5 e 6 no beta e coerente com a promessa de qualidade do produto — o beta nao deve ser tratado como free tier.
4. O modelo freemium (Free = Gemini, Premium = Sonnet) faz sentido em escala, mas nao no beta onde o objetivo e validar o produto, nao a economia.

**Condicoes e limites**:
- Esta decisao se aplica SOMENTE ao periodo beta (ate que o produto alcance 500 usuarios ativos ou o time faça upgrade do Vercel para o plano Pro com timeout de 300s — o que vier primeiro).
- Se o finops-engineer reportar custo AI mensal acima de $50 durante o beta, reavaliar imediatamente.
- Apos upgrade para Vercel Pro (300s timeout), retornar a decisao de provider para o architect e finops-engineer avaliarem se Gemini passa a ser viavel para Fase 5/6 no tier Free.
- A opcao (c) — reducao de prompts/maxTokens — pode ser executada em paralelo pelo prompt-engineer como otimizacao complementar, sem bloquear esta decisao.

**O que esta decisao NAO autoriza**:
- Migrar todas as fases para Anthropic (Fases 1-4 e checklist permanecem com sua logica atual).
- Remover o GeminiProvider ou a arquitetura de abstração de providers.
- Ignorar o ceiling de custo: se estourar $50/mes em beta, parar e reavaliar.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-09 | product-owner | Initial draft — criado na rodada 2 de correcoes do staging. Inclui decisao de produto sobre provider AI. |
