# SPEC-PROD-AI-GOVERNANCE-V2: Central de Governanca de IA

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, ux-designer, ai-specialist, qa-engineer, security-specialist
**Created**: 2026-04-17
**Last Updated**: 2026-04-17
**Feature Flag**: `AI_GOVERNANCE_V2`

---

## 1. Problem Statement

O sistema de IA do Atlas opera hoje de forma descentralizada: prompts sao gerenciados via arquivos de codigo, modelos sao configurados em variaveis de ambiente, timeouts sao constantes hardcoded e nao existe curadoria sistematica de outputs gerados. Isso cria quatro problemas concretos para o negocio:

1. **Risco operacional**: uma mudanca de modelo ou prompt exige um novo deploy, impossibilitando respostas rapidas a incidentes (alucinacoes, bias, falhas de qualidade em producao).
2. **Risco de qualidade**: sem ciclo estruturado de avaliacao (eval gate), prompts modificados podem ser promovidos sem validacao quantitativa, degradando a experiencia do viajante.
3. **Ausencia de auditoria**: nao existe rastro de quem alterou o que, quando e com qual justificativa — expondo o produto a riscos regulatorios e de reputacao.
4. **Opcacidade para administradores**: o unico painel admin existente foca em metricas de monetizacao; nao ha visibilidade sobre saude, custo e qualidade das chamadas de IA.

Esta spec define a Central de Governanca de IA: uma aba dedicada no painel `/admin` que unifica controle de modelos, gestao de prompts com ciclo de vida completo (draft → eval → aprovacao → rollback), curadoria de outputs e audit log — com todas as configuracoes propagadas em tempo real via consulta ao banco de dados, sem necessidade de redeploy.

**Personas afetadas**:
- Administrador geral com permissao `admin-ai` (novo role): edita, aprova e monitora IA.
- Administrador de leitura: visualiza metricas e audit log sem poder alterar configuracoes.
- Viajante final: nao interage diretamente com esta feature; beneficia-se da melhoria continua de qualidade.

---

## 2. User Story

As an `admin-ai` operator,
I want a single governance panel for all AI configurations, prompt lifecycle management, and output curation,
so that I can improve AI quality, respond to incidents in real-time without deploys, and maintain a full audit trail of every change made.

### Contexto da Persona

- **Pain point**: hoje e necessario abrir um PR, esperar CI e fazer deploy para mudar um prompt ou um timeout — qualquer incidente de qualidade leva horas para ser mitigado.
- **Solucao atual**: nao existe; administradores nao tem visibilidade nem controle sobre IA em producao.
- **Frequencia**: toda semana ocorre pelo menos uma situacao que exigiria ajuste de configuracao de IA (novo modelo disponivel, prompt com performance abaixo do esperado, output com linguagem inadequada reportado por usuario).

---

## 3. Acceptance Criteria

### Bloco A — Estrutura e Acesso

- [ ] AC-1: Dado que um usuario com role `admin-ai` acessa `/admin`, quando navega pela interface, entao existe uma aba "IA" visivelmente destacada no menu de administracao.
- [ ] AC-2: Dado que um usuario sem role `admin-ai` (incluindo admin geral sem essa permissao adicional) tenta acessar qualquer sub-rota da aba IA, quando a requisicao e processada, entao recebe resposta HTTP 403 e nao ve nenhum dado sensivel.
- [ ] AC-3: Dado que um usuario com role `admin-ai` (sem permissao de aprovacao) tenta promover um prompt, quando aciona a acao de promocao, entao a acao e bloqueada com mensagem explicativa.
- [ ] AC-4: Dado que existe um role `admin-ai-approver` separado, quando um promotor de prompts acessa o painel, entao apenas usuarios com esse role conseguem executar a acao "Promover para producao".

### Bloco B — Seletor de Modelo e Timeout em Tempo Real

- [ ] AC-5: Dado que o painel esta carregado, quando o admin visualiza a secao de configuracoes de modelo, entao vê uma tabela com todos os tipos de geracao de IA do sistema (no minimo: plano de viagem, checklist, guia do destino, roteiro) e o modelo atualmente atribuido a cada um.
- [ ] AC-6: Dado que o admin seleciona um novo modelo para um tipo de geracao, quando salva a configuracao, entao a proxima chamada de IA daquele tipo consulta o banco de dados e utiliza o modelo recém-atribuido — sem necessidade de redeploy.
- [ ] AC-7: Dado que o admin tenta salvar uma configuracao de modelo, quando o modelo selecionado nao esta na lista de modelos homologados, entao o sistema rejeita a operacao com mensagem de validacao indicando os modelos permitidos.
- [ ] AC-8: Dado que o admin configura o timeout para um tipo de geracao, quando insere um valor, entao o sistema aceita apenas valores inteiros no intervalo 5 ≤ timeout ≤ 55 (segundos), rejeitando valores fora desse range com mensagem de erro especifica.
- [ ] AC-9: Dado que existe um modelo primario e um fallback para o mesmo tipo de geracao, quando o admin configura ambos os timeouts, entao o sistema valida que `timeout_primario + timeout_fallback ≤ 55 segundos`, bloqueando configuracoes que violem esse limite.
- [ ] AC-10: Dado que o admin atualiza qualquer configuracao de modelo ou timeout, quando a operacao e concluida com sucesso, entao um registro e criado no audit log com: usuario, timestamp, campo alterado, valor anterior e valor novo.

### Bloco C — Lista de Modelos Homologados

- [ ] AC-11: Dado que o admin abre o seletor de modelo, quando visualiza as opcoes disponiveis, entao ve exatamente os seguintes modelos homologados: Gemini 2.0 Flash, Gemini 2.5 Flash, Claude Opus 4.7, Claude Sonnet 4.6, Claude Haiku 4.5 — e nenhum outro.
- [ ] AC-12: Dado que o RISK-011 ainda nao foi resolvido, quando o admin tenta atribuir Gemini 2.5 Flash a qualquer tipo de geracao, entao o sistema exibe um aviso de risco nao resolvido e requer confirmacao explicita antes de salvar.

### Bloco D — Gestao de Prompts: Ciclo de Vida

- [ ] AC-13: Dado que o admin acessa a secao de prompts, quando visualiza a lista, entao cada prompt exibe: nome, tipo de geracao associado, versao atual, status (draft/em-avaliacao/aprovado/reprovado), data da ultima alteracao e autor.
- [ ] AC-14: Dado que o admin cria ou edita um prompt, quando salva, entao o prompt e salvo com status `draft`, incrementa o numero de versao (formato semver MAJOR.MINOR.PATCH), e o conteudo anterior e preservado como versao historica consultavel.
- [ ] AC-15: Dado que um prompt esta em status `draft`, quando o admin aciona "Enviar para avaliacao", entao o sistema registra o prompt como `em-avaliacao`, dispara a execucao do conjunto de avaliacao (eval suite) associado ao tipo de geracao, e exibe o progresso da avaliacao em tempo real.
- [ ] AC-16: Dado que a avaliacao e concluida com Trust Score >= 0.80, quando o resultado e calculado, entao o prompt muda para status `aprovado-pendente` e fica disponivel para promocao por um usuario com role `admin-ai-approver`.
- [ ] AC-17: Dado que a avaliacao e concluida com Trust Score < 0.80, quando o resultado e calculado, entao o prompt muda automaticamente para status `reprovado`, a promocao e bloqueada 100% dos casos, e o admin ve os detalhes das dimensoes que falharam.
- [ ] AC-18: Dado que um prompt esta com status `aprovado-pendente`, quando um `admin-ai-approver` aciona "Promover para producao", entao o prompt entra em producao imediatamente (proximas chamadas de IA usam o novo prompt sem redeploy) e o status muda para `aprovado-em-producao`.
- [ ] AC-19: Dado que um prompt esta em producao, quando o admin aciona "Rollback" e seleciona uma versao anterior, entao o sistema restaura aquela versao como ativa em producao em no maximo 5 segundos, com confirmacao visual e registro no audit log.
- [ ] AC-20: Dado que o editor de prompts esta ativo, quando o admin visualiza o campo de edicao, entao o campo exibe: contagem de tokens estimada, variaveis de contexto disponiveis (ex: `{{destination}}`, `{{preferences}}`), e historico de versoes com diff visual entre versoes adjacentes.
- [ ] AC-21: Dado que o admin tenta promover um prompt sem ter executado avaliacao (ou com avaliacao com mais de 7 dias de antiguidade), quando aciona "Promover para producao", entao a acao e bloqueada com mensagem indicando a necessidade de reavaliacao.

### Bloco E — Dashboard de Metricas de IA

- [ ] AC-22: Dado que o admin acessa o dashboard de IA, quando a pagina carrega, entao ve os seguintes KPIs do periodo selecionado (padrao: ultimos 7 dias): total de chamadas de IA por tipo, taxa de sucesso por tipo, latencia media por tipo, custo total estimado em USD, custo por chamada por tipo.
- [ ] AC-23: Dado que o admin seleciona um periodo customizado, quando aplica o filtro, entao todos os KPIs e graficos atualizam para refletir o periodo selecionado em no maximo 3 segundos.
- [ ] AC-24: Dado que a taxa de sucesso de qualquer tipo de geracao cai abaixo de 90% nas ultimas 1 hora, quando o dashboard e visualizado, entao um alerta visual de alto destaque e exibido na parte superior da aba IA, indicando o tipo afetado e a taxa atual.
- [ ] AC-25: Dado que o admin visualiza o dashboard, quando observa a secao de modelos, entao ve a distribuicao de uso entre modelos primario e fallback por tipo de geracao, para identificar a frequencia de acionamento do fallback.

### Bloco F — Curadoria de Outputs

- [ ] AC-26: Dado que um output de IA e gerado para qualquer viajante, quando o sistema o armazena, entao uma amostra configuravel (padrao: 5% dos outputs) e automaticamente enfileirada para revisao humana na fila de curadoria.
- [ ] AC-27: Dado que o admin acessa a fila de curadoria, quando visualiza um item, entao ve: o prompt que originou o output (versionado), o output completo, o perfil anonimizado do viajante (sem PII direta), e os botoes de acao: "Aprovado", "Sinalizar: Bias", "Sinalizar: Alucinacao", "Sinalizar: Risco", "Escalar".
- [ ] AC-28: Dado que o admin marca um output como "Sinalizar: Bias", "Sinalizar: Alucinacao" ou "Sinalizar: Risco", quando confirma a acao, entao o item muda de status para `flagged`, um registro e criado no audit log com categoria de sinal e justificativa obrigatoria (campo texto livre, minimo 20 caracteres).
- [ ] AC-29: Dado que um item e marcado como "Escalar", quando confirmado, entao o status muda para `escalated` e uma notificacao e enviada para todos os usuarios com role `admin-ai-approver` ativos.
- [ ] AC-30: Dado que o numero de outputs com status `flagged` ou `escalated` supera 3% do total do dia corrente, quando o dashboard e visualizado, entao um alerta de qualidade e exibido na aba IA com o percentual atual e o threshold.
- [ ] AC-31: Dado que o admin acessa o historico de curadoria, quando filtra por categoria de sinal (bias/alucinacao/risco/escalado), entao ve a lista paginada de itens com os filtros aplicados, incluindo o revisor responsavel e a data de revisao.
- [ ] AC-32: A frequencia de revisao minima para a fila de curadoria e de 48 horas: se a fila tiver itens com mais de 48 horas sem revisao, um indicador de atraso e exibido na aba IA para qualquer admin logado.

### Bloco G — Kill-Switches

- [ ] AC-33: Dado que o admin acessa a secao de kill-switches, quando visualiza a interface, entao ve um toggle individual para cada tipo de geracao de IA (plano de viagem, checklist, guia, roteiro) com estado atual (ativo/desativado) claramente indicado.
- [ ] AC-34: Dado que o admin desativa um tipo de geracao via kill-switch, quando um viajante tenta gerar aquele conteudo, entao o sistema exibe uma mensagem amigavel informando que aquela funcionalidade esta temporariamente indisponivel, sem expor detalhes tecnicos.
- [ ] AC-35: Dado que o admin aciona um kill-switch (ativar ou desativar), quando confirma no dialogo de confirmacao obrigatorio, entao a mudanca propaga em tempo real (proxima chamada ja respeita o novo estado), e um registro e criado no audit log com usuario, timestamp e justificativa obrigatoria.
- [ ] AC-36: Dado que todos os kill-switches de geracao de IA estao desativados simultaneamente, quando o sistema detecta esse estado, entao exibe um alerta critico no dashboard de administracao indicando que toda geracao de IA esta desabilitada.

### Bloco H — Audit Log

- [ ] AC-37: Dado que qualquer operacao de escrita e executada na Central de Governanca de IA (alteracao de modelo, timeout, prompt, kill-switch, curadoria), quando a operacao e concluida, entao um registro imutavel e criado no audit log contendo: ID unico, timestamp UTC, usuario (ID + email mascarado), tipo de operacao, entidade afetada, valor anterior (serializado), valor novo (serializado), IP de origem.
- [ ] AC-38: Dado que o admin acessa o audit log, quando aplica filtros (periodo, tipo de operacao, usuario), entao os resultados sao retornados em no maximo 3 segundos para periodos de ate 90 dias.
- [ ] AC-39: Os registros do audit log sao imutaveis: nenhum usuario, incluindo `admin-ai-approver`, pode editar ou excluir entradas do audit log via interface ou API.
- [ ] AC-40: Dado que o admin exporta o audit log, quando seleciona o periodo e aciona exportacao, entao recebe um arquivo CSV com todos os campos, sem formulas injetaveis (todos os valores de texto prefixados com apostrofe se iniciarem com `=`, `+`, `-` ou `@`).

### Bloco I — Rate Limiting e Seguranca

- [ ] AC-41: Dado que um usuario com role `admin-ai` tenta salvar mais de 10 edicoes de prompts ou configuracoes em uma janela de 1 hora, quando o limite e atingido, entao as operacoes adicionais sao rejeitadas com mensagem indicando o limite e o tempo restante para reset.
- [ ] AC-42: Dado que a Central de Governanca de IA esta protegida por autenticacao, quando uma requisicao e recebida sem sessao valida ou sem os roles necessarios, entao todas as rotas retornam HTTP 401 ou 403 sem vazar informacoes sobre a estrutura interna.

### Bloco J — Comunicacao ao Viajante Final

- [ ] AC-43: Dado que uma configuracao de modelo ou prompt e alterada em tempo real, quando o viajante inicia uma geracao de IA, entao a mudanca e transparente: o viajante nao ve mensagem de "manutencao em andamento" nem interrupcao de servico durante atualizacoes de configuracao.
- [ ] AC-44: Dado que um kill-switch desativa um tipo de geracao, quando o viajante tenta usar aquela funcionalidade, entao ve uma mensagem em linguagem amigavel (ex: "Esta funcionalidade esta temporariamente indisponivel. Tente novamente em alguns minutos.") sem indicacao de natureza tecnica da interrupcao.

### Bloco K — Performance e A11y

- [ ] AC-45: Dado que o admin carrega a aba IA do painel, quando a pagina e renderizada, entao o conteudo principal e visivel em no maximo 2 segundos em conexao padrao (3G rapido).
- [ ] AC-46: Dado que cada chamada de IA consulta o banco de dados para obter configuracoes (modelo + prompt + timeout) via mecanismo de cache com TTL configuravel (padrao: 30 segundos), quando uma configuracao e atualizada, entao o overhead por chamada nao excede 20ms em media medida no servidor.
- [ ] AC-47: Dado que o painel de governanca e acessado por um usuario que navega por teclado, quando interage com todos os controles (toggles, selects, botoes, editor de prompts), entao todos os elementos sao alcancaveis e ativaveis via teclado com indicadores de foco visiveis (contraste minimo 3:1 para o indicador de foco).
- [ ] AC-48: Dado que o painel e renderizado, quando inspecionado com leitor de tela, entao todos os alertas de status (kill-switches, alertas de qualidade, progresso de avaliacao) possuem `role="alert"` ou `aria-live` apropriados para anuncio automatico.

---

## 4. Escopo

### In Scope (v1 com flag AI_GOVERNANCE_V2)

- Aba "IA" no `/admin` com controle de acesso baseado em role `admin-ai` e `admin-ai-approver`
- Seletor de modelo e configuracao de timeout em tempo real por tipo de geracao
- Editor de prompts versionado com ciclo de vida: draft → avaliacao → aprovacao → producao → rollback
- Gate obrigatorio de Trust Score >= 0.80 para promocao de prompts
- Dashboard de metricas de IA com KPIs de uso, latencia, custo e qualidade
- Fila de curadoria de outputs com acoes: aprovado, flagged (bias/alucinacao/risco), escalado
- Kill-switches individuais por tipo de geracao
- Audit log imutavel com exportacao CSV
- Rate limit de 10 edicoes/hora por admin
- Alertas proativos: taxa de sucesso < 90%, fila de curadoria vencida > 48h, flagged > 3%

### Out of Scope (v1)

- Interface de configuracao de eval datasets (gerenciado pela qa-engineer via arquivos)
- Gerenciamento de variaveis de ambiente de chaves de API (dominio do devops-engineer)
- Notificacoes por email ou Slack para alertas (apenas in-app nesta versao)
- A/B testing automatico de prompts (considerado para v2)
- Rotacao automatica de modelos com base em custo ou performance (v2)
- Acesso self-service de usuarios nao-admin para reportar problemas de qualidade de IA (v2)
- Exportacao de metricas para sistema de observabilidade externo (dominio do devops-engineer)

---

## 5. Constraints

### Seguranca

- Todos os endpoints da Central de Governanca de IA devem exigir autenticacao valida E pelo menos o role `admin-ai`; endpoints de promocao exigem `admin-ai-approver`.
- O conteudo dos prompts pode conter logica de negocio sensivel; o acesso de leitura ao conteudo completo dos prompts deve ser restrito a roles `admin-ai` e superiores.
- O audit log deve ser protegido contra delecao ou alteracao por qualquer usuario via interface; a imutabilidade deve ser garantida na camada de dados.
- Outputs de viajantes na fila de curadoria devem ser exibidos sem PII direta (nome, email, telefone); o perfil exibido deve ser anonimizado antes de chegar ao front-end.
- A exportacao CSV do audit log deve sanitizar todos os valores para prevenir formula injection (OWASP CSV Injection).
- O rate limit de 10 edicoes/hora deve ser implementado server-side; validacoes client-side sao complementares, nao substitutivas.
- Toda comunicacao com a Central de Governanca deve ocorrer sobre HTTPS; nenhum dado de configuracao de IA deve ser exposto em logs publicos.

### Acessibilidade

- WCAG 2.1 AA como nivel minimo obrigatorio para todas as telas da Central de Governanca.
- Todos os controles interativos (toggles de kill-switch, selects de modelo, botoes de acao) devem ser operaveis exclusivamente por teclado.
- Alertas de status critico (kill-switch ativo, taxa de sucesso baixa, fila vencida) devem usar `role="alert"` para anuncio automatico por leitores de tela.
- O editor de prompts deve ser navegavel por teclado com suporte a anuncio de contagem de tokens e lista de variaveis disponiveis.
- Contraste minimo de 4.5:1 para texto normal e 3:1 para texto grande e elementos graficos informativos.

### Performance

- Overhead de consulta ao banco de dados para obtencao de configuracoes de IA por chamada: maximo 20ms em media (medido no servidor, excluindo latencia de rede).
- Cache com TTL padrao de 30 segundos para configuracoes de modelo/prompt/timeout; configuravel pelo admin entre 10 e 300 segundos.
- Carregamento da aba IA do painel admin: maximo 2 segundos (LCP) em conexao 3G rapido.
- Queries de audit log filtrado por periodo de ate 90 dias: maximo 3 segundos de resposta.
- Dashboard de metricas com filtro de periodo customizado: atualizacao em maximo 3 segundos.
- O mecanismo de eval (avaliacao de prompts) pode ser executado de forma assincrona; o usuario nao precisa manter a pagina aberta, mas deve poder retornar e ver o resultado.

### Limites Arquiteturais

- Esta spec NAO define como o mecanismo de eval e implementado internamente (responsabilidade da SPEC-ARCH correspondente).
- Esta spec NAO define o schema de banco de dados para ModelAssignment, AiRuntimeConfig ou PromptVersion (responsabilidade da SPEC-ARCH correspondente).
- O range de timeout 5s–55s e a restricao de soma primario+fallback ≤ 55s sao limites de produto; o limite tecnico de 60s e imposto pela infraestrutura de hospedagem (Vercel) e documentado na SPEC-ARCH.
- O overhead de +5-20ms por chamada de IA e aceito como desprezivel frente ao tempo de geracao de 17-30s; qualquer implementacao que exceda 20ms de overhead medio deve ser considerada nao-conforme.
- A lista de modelos homologados e gerenciada nesta spec (AC-11); adicionar novos modelos requer uma atualizacao desta spec com aprovacao do product-owner.

---

## 6. Metricas de Sucesso

- Gate de Trust Score >= 0.80 bloqueia 100% das tentativas de promocao de prompts reprovados (medido em 30 dias apos lancamento).
- Tempo medio de resposta a incidentes de qualidade de IA reduz de > 4 horas (deploy necessario) para < 15 minutos (alteracao via painel) — medido nos 3 primeiros meses.
- 100% das operacoes de escrita na Central de Governanca registradas no audit log (zero lacunas de rastreabilidade).
- Overhead medio por chamada de IA mantido abaixo de 20ms em p95 (medido via telemetria de producao).
- Taxa de cobertura de curadoria de outputs: >= 5% dos outputs gerados revisados mensalmente.
- Zero promocoes de prompts sem avaliacao executada nos ultimos 7 dias (medido por audit log).

---

## 7. Dependencias

### Specs de produto relacionadas
- SPEC-PROD-042: Admin Dashboard with Profit Tracking — a aba IA e adicionada ao painel admin existente; o design e o sistema de permissoes existentes sao a base.
- SPEC-PROD-044: Enhanced Admin Dashboard — metricas de custo de IA ja implementadas; a Central de Governanca expande esse contexto.
- SPEC-PROD-055: Manual AI Generation — o kill-switch de geracao (AC-33 a AC-36) deve ser consistente com o mecanismo de geracao manual ja especificado.

### Specs a serem criadas
- SPEC-ARCH-AI-GOVERNANCE-V2: definicao tecnica de ModelAssignment, AiRuntimeConfig, PromptVersion, AuditLog schemas; mecanismo de cache; integracao com eval runner.
- SPEC-UX-AI-GOVERNANCE-V2: fluxos de navegacao, estados de UI, design do editor de prompts, layout do dashboard de metricas, fila de curadoria.
- SPEC-AI-GOVERNANCE-V2: definicao do conjunto de avaliacao (eval suite) por tipo de geracao, criterios de Trust Score por dimensao, dataset de referencia para gate.
- SPEC-QA-AI-GOVERNANCE-V2: estrategia de testes para ciclo de vida de prompts, curadoria, kill-switches e audit log.
- SPEC-SEC-AI-GOVERNANCE-V2: threat model para acesso ao painel de governanca, imutabilidade do audit log, sanitizacao de outputs na curadoria.
- SPEC-RELEASE-AI-GOVERNANCE-V2: plano de lancamento com feature flag AI_GOVERNANCE_V2, rollback, dependencias de migracao.

### Prerequisitos tecnicos
- Role `admin-ai` e `admin-ai-approver` devem ser adicionados ao modelo de usuario antes da implementacao.
- RISK-011 (Gemini 2.5 Flash EOL/estabilidade) deve ser acompanhado; AC-12 captura o aviso de risco enquanto o RISK nao e fechado.

---

## 8. Independencia de Fornecedor

Esta spec descreve O QUE a Central de Governanca de IA faz e PARA QUEM, nao COMO e implementada. Nenhuma biblioteca, framework, servico de terceiros ou ferramenta especifica de avaliacao e mencionada. Decisoes de implementacao pertencem exclusivamente a SPEC-ARCH-AI-GOVERNANCE-V2.

---

## 9. Questoes Abertas

> As seguintes decisoes foram deliberadamente tomadas pelo PO nesta versao, com o raciocinio documentado. Nenhum item permanece indefinido.

| ID | Decisao | Opcoes Consideradas | Decisao Tomada | Raciocinio |
|----|---------|---------------------|----------------|------------|
| DEC-01 | Separar role `admin-ai` do admin geral? | (a) mesmo role com flag adicional; (b) role separado `admin-ai` + `admin-ai-approver` | **Opcao (b): roles separados** | Principio do menor privilegio. O acesso a configuracoes de IA (prompts, modelos) e mais sensivel que acesso a metricas de negocio; separar os roles permite conceder acesso cirurgico sem escalar permissoes de admin geral. |
| DEC-02 | Quem pode aprovar promocao de prompts? | (a) qualquer `admin-ai`; (b) role separado `admin-ai-approver` | **Opcao (b): role separado** | Four-eyes principle: a pessoa que edita o prompt nao deve ser a mesma que aprova a promocao. Reduz risco de erros nao detectados em producao. |
| DEC-03 | TTL do cache de configuracoes | (a) 0 (sem cache, consulta a cada chamada); (b) TTL fixo de 30s; (c) TTL configuravel | **Opcao (c): TTL configuravel, padrao 30s** | TTL zero garia overhead imprevisivel em picos de trafego. TTL fixo nao se adapta a cenarios de incidente (onde o admin quer propagacao mais rapida). TTL configuravel equilibra performance e responsividade. |
| DEC-04 | Percentual de amostragem para curadoria | (a) 1%; (b) 5%; (c) 10% | **Opcao (b): 5% como padrao configuravel** | 1% e insuficiente para detectar padroes sistematicos em volumes baixos. 10% pode gerar fila ingerenciavel para uma equipe pequena (2 devs). 5% como padrao com possibilidade de ajuste pelo admin e o equilibrio correto para o estagio atual do produto. |
| DEC-05 | Retencao do audit log | (a) 30 dias; (b) 90 dias; (c) indefinida | **Opcao (b): 90 dias** | 30 dias e insuficiente para investigacoes de incidentes que sao identificados com atraso. Retencao indefinida gera custo de storage crescente sem beneficio proporcional no estagio atual. 90 dias cobre a grande maioria dos cenarios de auditoria e e consistent com praticas LGPD para logs administrativos. |
| DEC-06 | Comunicacao ao viajante sobre mudancas em tempo real | (a) notificar viajante; (b) mudanca transparente | **Opcao (b): mudanca transparente** | Mudancas de modelo e prompt nao afetam a experiencia percebida do viajante (o output final pode ser diferente, mas nao piora — o gate de qualidade garante isso). Notificar seria ruido sem valor. Kill-switches ja tem tratamento dedicado (AC-44). |

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-04-17 | product-owner | Draft inicial — Central de Governanca de IA, Sprint 45. 48 ACs em 11 blocos. Roles admin-ai/admin-ai-approver, ciclo de vida de prompts, eval gate Trust Score >= 0.80, curadoria de outputs, kill-switches, audit log imutavel, rate limit 10 edicoes/hora. |
