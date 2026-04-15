# SPEC-RELEASE-REORDER-PHASES -- Plano de Release: Reestruturacao das Fases da Expedicao

**Spec ID**: SPEC-RELEASE-REORDER-PHASES
**Tipo**: Release Plan (SDD 9 dimensoes)
**Sprint**: 44
**Autor**: release-manager
**Data**: 2026-04-15
**Status**: **Approved** -- PO aprovou 15 decisoes em 2026-04-15 (ver Secao 11 e Change History)
**Versao alvo**: **v0.59.0** (merge flag OFF) -> **v0.60.0** (flip) -> **v0.61.0** (cleanup)
**Versao atual (tag)**: v0.58.0
**Feature flag**: `PHASE_REORDER_ENABLED` -- **env-only** (nao ha feature-flag service), default OFF em producao
**CIA**: CIA-008 -- Sprint 44 Phase Reorder
**ADR**: requer ADR-0XX (a ser criada pelo architect) -- registro da decisao de reordenacao
**Specs dependentes** (devem estar "Approved" antes da execucao): SPEC-PROD-REORDER-PHASES, SPEC-ARCH-REORDER-PHASES, SPEC-UX-REORDER-PHASES, SPEC-AI-REORDER-PHASES, SPEC-QA-REORDER-PHASES, SPEC-DEVOPS-REORDER-PHASES

---

## 0. Sumario Executivo

Sprint 44 reordena as 6 fases da expedicao para refletir um fluxo mental mais coerente para o viajante:

| Fase Semantica       | Antes (atual) | Depois (novo) |
|----------------------|---------------|---------------|
| Base / Perfil        | 1             | 1             |
| Destino / Datas      | 2             | 2             |
| Guia do destino      | 5             | **3**         |
| Roteiro (itinerario) | 6             | **4**         |
| Logistica (transporte/hospedagem) | 4 | **5**         |
| Checklist            | 3             | **6**         |

A mudanca **quebra a semantica do campo `Trip.currentPhase`** (inteiro 1..6) para todos os consumidores internos: frontend, backend, gamification engines, analytics, admin dashboard e relatorios. Nao ha consumers externos (nao existe API publica v1 de expedicoes).

**Veredicto CIA-008**: `-- Breaking interno, rollout com feature flag obrigatorio, migration de dados obrigatoria, com plano de migracao completo.`

---

## 1. Change Impact Assessment (CIA-008)

### 1.1 Breaking change? Para quem?

**SIM -- breaking interno.** O significado numerico de `currentPhase` muda. Qualquer codigo que compare `currentPhase === 3` hoje assumindo "Checklist" vai, apos a mudanca, ler "Guia" -- uma violacao de contrato interno.

| Consumidor                 | Tipo       | Como usa `currentPhase` hoje                      | Impacto apos reorder                              | Acao necessaria |
|----------------------------|------------|---------------------------------------------------|---------------------------------------------------|-----------------|
| **Frontend -- wizards**    | Interno    | Roteamento de `Phase{N}Wizard.tsx`, progress bar, badges | Telas exibidas na ordem errada, deep links quebram | Atualizar mapeamento N->componente, links, i18n labels |
| **Backend -- PhaseEngine** | Interno    | Transicao de fases, pontos por fase, BOLA guards  | Recompensas concedidas na fase errada, guards invertidos | Reescrever `phase-config.ts`, atualizar `PhaseEngine` |
| **Backend -- PointsEngine**| Interno    | Delta de pontos por `phase N completa`            | Usuarios podem receber pontos duplicados ou ausentes | Tabela de pontos reindexada, reconciliacao pos-migracao |
| **AI Actions**             | Interno    | `generatePlan` (roteiro) esperava fase 6, `generateGuide` fase 5 | Rotas de IA chamadas na fase errada -> gasto de token inuteis, PA refund incorreto | Atualizar constantes de fase em AI actions |
| **Analytics / eventos**    | Interno    | Eventos `phase_started`, `phase_completed` com `phase_number` | Funnels historicos pre/pos-flip ficam incomparaveis | Documentar cutover date no dashboard; comparacoes historicas split em "antes/depois do flip" |
| **Admin dashboard**        | Interno    | Filtros por fase, graficos de cohort por fase     | Pos-flip todos os numeros sao v2                  | Anotar cutover date na interface do dashboard |
| **Testes E2E + Unit**      | Interno    | Centenas de testes com `currentPhase` hardcoded   | Falhas em massa                                   | Refatorar para usar constantes semanticas (`PHASE_GUIDE`, `PHASE_CHECKLIST`) |
| **Beta testers ativos**    | Semi-externo| Expedicoes em andamento no meio do fluxo         | Confusao UX, potencial perda de progresso percebida | Comunicacao proativa + migracao de dados (ver Secao 3) |
| **API REST `/api/v1/*`**   | Externo    | Nenhuma rota expoe `currentPhase` hoje            | Nenhum                                            | N/A |

### 1.2 Recomendacao de versionamento (SemVer pre-1.0)

**Etapa A -- v0.59.0 (MINOR)**: merge do codigo com feature flag `PHASE_REORDER_ENABLED=false`. Produto nao muda de comportamento para o usuario final. Novo codigo fica dormente.

- Justificativa: sob SemVer pre-1.0 do projeto, adicionar novo comportamento atras de flag e **backward-compatible** porque o contrato publico vigente (flag OFF) continua identico. MINOR.

**Etapa B -- v0.60.0 (MINOR) ou v1.0.0 (MAJOR)**: quando a flag vira default ON em producao.
- Se ainda pre-1.0: **MINOR** com nota destacada "BREAKING INTERNO -- reordenacao de fases". Segue a politica "0.x.x pode quebrar contratos internos em MINOR" registrada na memoria do release-manager.
- Se coincidir com a estabilizacao 1.0.0 planejada para quando a REST API publica: **MAJOR 1.0.0**. Decidir com o architect no momento do flip.

**Recomendacao concreta**: `v0.59.0 (Sprint 44) com flag OFF` -> `v0.60.0 (Sprint 45+) com flag default ON` + nota de breaking interno. 1.0.0 continua reservado para o marco de API publica estavel.

### 1.3 Classificacao final

**Verdict**: `-- Breaking com migration plan -- cleared para merge atras de flag. Flip da flag requer checklist de go/no-go completo (Secao 6).`

---

## 2. Plano de Rollout em Etapas

> **Modelo de rollout**: merge-with-flag-OFF -> staging -> canary interno + 5% beta opt-in -> rollout gradual beta (25/50/100) -> cleanup.
> A migracao de dados e **big-bang in-place** (Opcao D, ver Secao 3), rodada **uma unica vez** por ambiente, sempre **antes** do flip da flag naquele ambiente.

### Etapa 1 -- Merge com flag OFF (Sprint 44, D0) -- v0.59.0
- Merge para `master` atras de `PHASE_REORDER_ENABLED=false` (env-only) em producao.
- Codigo novo fica **dormente** em producao: shim `lib/phases/phase-mapping.ts` ainda le da `phase-config.v1.ts` porque flag e OFF e os dados em prod ainda estao no schema v1.
- Produ cao continua exatamente como antes. Zero impacto runtime, zero migracao de dados.
- Tag: **v0.59.0** (MINOR). Inclui bump corrigindo RISK-017 (`package.json` 0.35.1 -> 0.59.0).
- **Go-criteria para merge**: build verde, testes verdes nas duas configs (flag OFF e flag ON), QA spec conformance QA-CONF-S44 PASS, security review ok, ADR-0XX assinada pelo architect, SPEC-RELEASE em status Approved.

### Etapa 2 -- Staging com flag ON (Sprint 44, D+1 a D+3)
- Em staging: rodar a **migracao big-bang SQL** (script `scripts/db/migrate-phase-reorder.sql`) sobre o DB de staging **apos snapshot**.
- Depois da migracao: setar `PHASE_REORDER_ENABLED=true` e re-deploy.
- QA executa suite E2E completa + cenarios apos migracao sobre dataset sintetico realista (seed com expedicoes em cada uma das 6 fases) + validacao manual interna.
- finops-engineer monitora gasto de tokens AI (nao deve mudar; se mudar >10% e alarme).
- **Janela de observacao em staging: 7 dias** para acomodar tolerancia de trust score (ver 6.2).
- **Go-criteria para canary**: trust score >= **0.82** em staging sustentado por 7 dias, zero regressoes P0/P1, migration SQL aplicada e validada (checksum de contagens v1 vs v2 bate), QA-REL-S44 sign-off, security-specialist sign-off (PII hash preservada).

### Etapa 3 -- Canary em producao (Sprint 44, quarta-feira 10:00 BRT) -- v0.60.0
1. **Pre-canary (T-60min)**: devops-engineer tira **DB snapshot completo** da tabela `Trip` (e dependentes via cascade) em prod. Snapshot rotulado `pre-phase-reorder-S44`. Confirma restore test em ambiente sandbox.
2. **Pre-canary (T-30min)**: freeze de merges em escopo sensivel entra em vigor (ver Secao 2.6).
3. **T-0 (10:00 BRT quarta)**: roda `migrate-phase-reorder.sql` em prod. Transacional, idempotente, janela de manutencao curta (<5 min esperada).
4. **T+5min**: validacao pos-migracao (script de checksum). Contagem total de Trips inalterada; distribuicao por fase coerente com mapeamento.
5. **T+10min**: deploy com `PHASE_REORDER_ENABLED=true` restringido a cohort canary:
   - **Equipe interna** (~10 contas identificadas por allowlist de email em `CANARY_ALLOWLIST` env).
   - **5% de beta testers opt-in** via `/labs` (gate dentro do shim: hash userId mod 100 < 5 && usuario opt-in).
6. **T+10min -> T+48h**: janela de canary e **freeze de merges** em escopo sensivel (ver 2.6).
7. Tag: **v0.60.0** (MINOR) -- flip do default efetivo para cohort canary.

**Metricas monitoradas no canary**:
  - erro rate (server actions relacionadas a fase): baseline +/- 10%
  - taxa de conclusao de fase (conversion) por fase: nao cair >15% vs baseline
  - trust score de IA (plan, guide): >= **0.82**
  - PA refund rate: nao aumentar
  - tickets de suporte com palavra "fase", "ordem", "sumiu": <=3 em 24h
  - zero erros de leitura do shim (indicador de dados inconsistentes pos-migracao)

**Go-criteria para rollout gradual**: todas as metricas acima dentro do limite por 24h minimo, zero P0 aberto, sign-off explicito PO + tech-lead.

### Etapa 4 -- Rollout gradual beta (Sprint 44, D+5 a D+10)
- Gate de % beta no shim: 5% -> **25% -> 50% -> 100% dos beta testers**.
- Incremento a cada 24h se metricas saudaveis; holding de +24h em cada patamar se qualquer alerta laranja.
- Usuarios nao-beta continuam comportamento identico a pre-flip porque a migracao ja rodou (dados ja estao em v2) e o codigo novo ja esta rodando para todos -- a unica diferenca e que a UI reordenada so e renderizada quando o gate beta libera. Em outras palavras: **os dados ja sao v2 para todo mundo desde a Etapa 3**; o rollout gradual e puramente UX-level.

  > **Nota importante**: como a migracao e big-bang in-place, "flag OFF" em producao pos-Etapa 3 nao restaura o comportamento antigo -- os dados estao em v2. A UI legacy nao sabe ler dados v2. Por isso o shim em v0.60.0 **sempre** assume schema v2 quando detecta que a migracao rodou (marcador em tabela de metadata). O gate beta e apenas cosmético sobre recursos UI adicionais/rotulagens -- nao alterna leitura de dados.

- **Go-criteria entre patamares**: erro rate estavel, nenhum novo bug P0/P1, PA balance coerente (gastos == creditos no dia), trust score >= 0.82.

### Etapa 5 -- Remocao do codigo legacy (Sprint 45 ou 46) -- v0.61.0
- Baking period minimo: **2 sprints apos 100% beta** sem issues.
- Remover `phase-config.v1.ts`, remover branch legacy do shim `phase-mapping.ts`, remover flag `PHASE_REORDER_ENABLED` do env, remover marcador de metadata de migracao.
- Tag: **v0.61.0** (MINOR -- limpeza).
- **Go-criteria**: zero references a legacy no codigo (verificado via grep), zero testes em legacy, CHANGELOG registra a remocao.

### 2.6 Freeze de merges durante canary (48h apos Etapa 3)

Durante as 48h da Etapa 3 (canary produccao), **merges que tocam o seguinte escopo estao congelados**, exceto hotfix P0 relacionado ao proprio rollout:

- `src/lib/engines/phase-*` (PhaseEngine, phase-config, phase-mapping)
- `src/lib/engines/points-*` (PointsEngine)
- `src/components/features/expedition/Phase*Wizard.tsx`
- `src/server/actions/ai.actions.ts` e qualquer AI action consumindo fase
- Qualquer migration Prisma
- Qualquer alteracao em `Trip` schema

Responsavel por enforcar: **tech-lead** (approval label no PR). release-manager monitora.
Demais merges (docs, styles, testes isolados, features que nao tocam fase) podem seguir normalmente.

---

## 3. Estrategia para Expedicoes em Andamento -- Opcao D (big-bang in-place simples)

### Decisao

**Opcao D -- big-bang in-place SQL, rodada uma unica vez por ambiente, antes do flip da flag.**

Aprovada pelo PO em 2026-04-15. Justificativa:
1. Beta tem volume de dados muito baixo -- a janela de manutencao e trivial (<5 min) e nao justifica a complexidade de um esquema dual.
2. Sem `phaseSchemaVersion`, sem `currentPhaseV2`, sem background job de backfill progressivo, sem cohort-aware shim: elimina ~70% da superficie de teste e de bugs potenciais da Opcao B original.
3. Reversibilidade continua garantida via **DB snapshot** pre-migracao (ver Secao 5), nao mais via flag flip. Essa e a constraint explicita mais importante deste plano.

### O que a migracao faz

**Script**: `scripts/db/migrate-phase-reorder.sql` (autor: devops-engineer + architect).

Em uma unica transacao:
1. Cria tabela de metadata `_phase_reorder_migration` com linha registrando timestamp, checksums pre/pos, operador. Funciona como marcador idempotente.
2. Se o marcador ja existe: aborta silenciosamente (idempotente -- re-rodar e seguro).
3. Faz `UPDATE Trip SET currentPhase = CASE currentPhase WHEN 3 THEN 6 WHEN 4 THEN 5 WHEN 5 THEN 3 WHEN 6 THEN 4 ELSE currentPhase END` (fases 1 e 2 inalteradas).
4. Atualiza qualquer tabela acessoria que armazene snapshots de fase (PointTransaction se houver snapshot de fase, ExpeditionPhase se armazenar numero literal) -- escopo exato confirmado pelo architect em SPEC-ARCH-REORDER-PHASES.
5. Grava checksum pos (contagem por fase) no marcador.
6. COMMIT.

**Propriedades**:
- **Transacional** (tudo ou nada).
- **Idempotente** (marcador).
- **Rapida** (<5 min esperado em beta).
- **Sem coluna extra**: `currentPhase` e reescrito in-place, nao ha `phaseSchemaVersion` nem `currentPhaseV2`.

### O que o codigo faz

- `phase-config.ts` (unico, sem `.v1`/`.v2`) -- ja reflete a nova ordem.
- `phase-mapping.ts` (shim) -- **apenas** para consumir a flag `PHASE_REORDER_ENABLED` para gating de **UI/labels** (Etapa 4 beta rollout), nao para decidir qual schema ler. Leitura de dados assume sempre schema novo pos-Etapa 3.
- Constantes semanticas (`PHASE_GUIDE=3`, `PHASE_ITINERARY=4`, `PHASE_LOGISTICS=5`, `PHASE_CHECKLIST=6`) devem ser usadas em toda parte. grep fail em PR com numero literal (linter rule adicionado pela dev-fullstack-*).

### Constraint critico de rollback

**O codigo pos-v0.60.0 nao sabe ler dados pre-migracao (v1).** Apos a migracao rodar em prod, `PHASE_REORDER_ENABLED=false` **nao restaura** o comportamento antigo para dados ja migrados -- uma leitura da fase 6 apos o flag OFF retornaria "Checklist" na tabela, mas o codigo v1 interpretaria aquilo como "Roteiro" semanticamente errado. Portanto:

> **Flag OFF apos migracao = estado inconsistente. Nao usar como rollback confiavel em producao.**

O rollback confiavel pos-migracao e **DB snapshot restore** (ver Secao 5.2). Flag OFF so e rollback seguro **antes** da migracao ter rodado (ou seja, so em staging antes da Etapa 3, ou em prod no intervalo entre tag v0.59.0 e T-0 da Etapa 3).

### Comunicacao ao usuario durante migracao

- **Emails ao beta** (2 ondas): T-7 dias e T-0, ver Secao 4.1 (copy em PT-BR abaixo).
- **Modal in-app** na primeira sessao pos-flip para usuarios com expedicao ativa em fases afetadas: 1 tela com o mapeamento + botao "entendi".
- **Pagina de ajuda**: `/pt/ajuda/reordenacao-fases` publicada ate D-3 do canary.

---

## 4. Comunicacao

### 4.1 Beta testers (aprovado PO: 2 emails + in-app modal)

**Canal e cadencia confirmados pelo PO**:
- Email 1 em T-7 dias (pre-anuncio)
- Email 2 em T-0 (dia do canary, apos migracao concluida)
- In-app modal obrigatorio na primeira sessao pos-flip
- Canal de suporte dedicado (form) por 14 dias

#### Email 1 -- T-7 dias (rascunho PT-BR)

> **Assunto**: Uma mudanca importante na ordem das fases da sua expedicao
>
> Ola, {{NOME}}!
>
> Nas proximas semanas, vamos reorganizar a ordem das fases da expedicao no Atlas para que ela reflita melhor como voce realmente planeja uma viagem.
>
> **O que muda**: o Guia do destino e o Roteiro do dia-a-dia passam a aparecer antes da Logistica (transporte e hospedagem) e do Checklist final -- porque, na pratica, voce precisa saber para onde vai e o que quer fazer antes de reservar voo, hotel e fechar a mala.
>
> **Nova ordem**:
> 1. Perfil do viajante
> 2. Destino e datas
> 3. Guia do destino *(antes era fase 5)*
> 4. Roteiro do dia-a-dia *(antes era fase 6)*
> 5. Logistica *(antes era fase 4)*
> 6. Checklist final *(antes era fase 3)*
>
> **O que voce precisa fazer**: nada. Todo o seu progresso sera preservado e reatribuido automaticamente a fase correspondente.
>
> **Quando**: a mudanca entra no ar para beta testers na quarta-feira, {{DATA}}, as 10:00 (horario de Brasilia).
>
> Qualquer duvida, responda este email ou use {{LINK_SUPORTE}}.
>
> Obrigado por viajar com a gente,
> {{NOME_PO}} -- Product
> Atlas / Travel Planner

#### Email 2 -- T-0 (rascunho PT-BR)

> **Assunto**: A nova ordem das fases ja esta ativa na sua conta
>
> Ola, {{NOME}}!
>
> A reorganizacao das fases que avisamos semana passada ja esta ativa na sua expedicao. Quando voce abrir o Atlas, vai ver a nova ordem direto no painel.
>
> **Resumo rapido**: Guia e Roteiro agora vem antes de Logistica e Checklist. Seu progresso foi mantido.
>
> **Se voce estava no meio de uma fase**: um aviso rapido vai aparecer na primeira vez que abrir sua expedicao, explicando exatamente como o seu progresso foi reatribuido.
>
> **Precisa de ajuda?** {{LINK_AJUDA}} tem a explicacao completa, ou responda este email.
>
> Boa viagem,
> {{NOME_PO}} -- Product
> Atlas / Travel Planner

#### In-app modal (rascunho PT-BR)

> **Titulo**: A ordem das fases mudou
>
> **Corpo**:
> Reorganizamos as fases para refletir como voce planeja de verdade: primeiro voce conhece o destino e monta o roteiro, depois resolve transporte, hospedagem e a mala.
>
> **Antes -> Agora**
> - Checklist: 3 -> **6**
> - Logistica: 4 -> **5**
> - Guia do destino: 5 -> **3**
> - Roteiro: 6 -> **4**
>
> Seu progresso atual foi preservado. Voce esta agora na fase **{{FASE_ATUAL}}**.
>
> **CTAs**: `Entendi` (primario) | `Ver explicacao completa` (link para pagina de ajuda)

### 4.2 Equipe interna
- **Kickoff D-2** (antes do merge): release-manager conduz reuniao de 30 min com tech-lead, devops, qa, security, ux, prompt-engineer. Revisa este plano, confirma go-criteria, RACI de rollback.
- **Daily stand-up adicional** durante Etapa 3 e 4 (15 min, foco so nas metricas do rollout).
- **War-room assincrono** no canal #sprint-44-rollout: cada etapa gera post de status.

### 4.3 Rascunho de release notes (Portugues, publico)

> ## Travel Planner -- v0.59.0 -- 2026-04-XX
>
> ### O que mudou
> Reorganizamos a ordem das fases da sua expedicao para refletir melhor como voce realmente planeja uma viagem. Agora o Guia do destino e o Roteiro aparecem antes da Logistica e do Checklist, que sao os ultimos passos antes de viajar.
>
> **Nova ordem**:
> 1. Perfil do viajante
> 2. Destino e datas
> 3. Guia do destino (antes era fase 5)
> 4. Roteiro do dia-a-dia (antes era fase 6)
> 5. Logistica (antes era fase 4)
> 6. Checklist final (antes era fase 3)
>
> ### Como isso me afeta?
> Se voce ja tem uma expedicao em andamento, nada se perde: todo o seu progresso foi preservado e reatribuido a fase equivalente. Voce vera um aviso dentro do app explicando a nova ordem.
>
> ### Precisa de ajuda?
> Visite {{AJUDA_URL}} ou fale com a gente em {{SUPORTE_EMAIL}}.

### 4.4 Rascunho de CHANGELOG.md

```markdown
## [0.59.0] - 2026-04-XX

### Added
- [SPEC-RELEASE-REORDER-PHASES] Feature flag env-only `PHASE_REORDER_ENABLED` (default OFF) como gate de UI/labels do rollout gradual da reordenacao das fases da expedicao
- [SPEC-ARCH-REORDER-PHASES] Shim `lib/phases/phase-mapping.ts` para centralizar acesso a config de fases
- [SPEC-UX-REORDER-PHASES] Banner e modal de notificacao da nova ordem das fases para expedicoes em andamento
- [SPEC-DEVOPS-REORDER-PHASES] Script de migracao big-bang `scripts/db/migrate-phase-reorder.sql` (transacional, idempotente) e script break-glass `scripts/db/reverse-phase-reorder.sql`

### Changed
- [SPEC-PROD-REORDER-PHASES] Nova ordem semantica das fases: Guia (3), Roteiro (4), Logistica (5), Checklist (6). Codigo permanece dormente em producao nesta versao (migracao ocorre em v0.60.0)
- [SPEC-AI-REORDER-PHASES] Constantes semanticas de fase adotadas em AI actions (`PHASE_GUIDE`, `PHASE_ITINERARY`, etc.)
- **Bump de versao**: `package.json` corrigido para `0.59.0` (estava dessincronizado em `0.35.1` -- RISK-017)

### Security
- Revisao de PII hash em PhaseEngine confirmada -- userId hash continua aplicado apos reorder (SEC-S19-001 re-verificado)
```

> Nota: a tag v0.60.0 (flip + migracao in-place) gerara entrada separada no CHANGELOG com secao **Changed** destacando o **BREAKING INTERNO** da migracao de dados.

---

## 5. Plano de Rollback -- Dois Niveis

Com a Opcao D (big-bang in-place), o rollback nao e mais trivial como era com schema dual. Temos **dois niveis** com garantias distintas. E critico entender a constraint de cada um.

### 5.1 Trigger conditions (qualquer um dispara avaliacao de rollback)
- **P0**: erro rate em server actions de fase >20% acima do baseline por 10 min consecutivos
- **P0**: trust score cai abaixo de 0.80 em qualquer dimensao em producao (ver `docs/evals/playbooks/trust-score-drop.md`)
- **P0**: PA refund mismatch detectado (saldo de usuario divergente com log de transacoes)
- **P0**: corrupcao de dados de Trip detectada (currentPhase fora de 1..6)
- **P1**: conversion de conclusao de fase cai >25% vs baseline por 2h
- **P1**: volume de tickets de suporte sobre "fase errada" > 10 em 2h
- **P2** (avaliar -- nao trigger automatico): injection resistance eval falha

### 5.2 Nivel 1 -- Flag OFF (rapido, com CONSTRAINT critico)

**Tempo de execucao**: <2 minutos. Disponivel a qualquer hora.

**Procedimento**:
1. devops-engineer seta `PHASE_REORDER_ENABLED=false` e dispara re-deploy rolling.
2. Invalida cache Redis relacionado a fase.

**CONSTRAINT CRITICO -- ler antes de usar**:

> Flag OFF so e **seguro** enquanto os dados no ambiente alvo **ainda nao foram migrados**. Ou seja:
> - Em **staging apos Etapa 2 migrada**: flag OFF NAO e rollback confiavel. O codigo legacy nao consegue ler corretamente dados ja remapeados na tabela. Use snapshot restore em staging.
> - Em **producao apos Etapa 3 migrada (T-0 da quarta)**: flag OFF NAO e rollback confiavel pelo mesmo motivo. Use snapshot restore (Nivel 2).
> - Em **producao entre v0.59.0 merge e T-0 da Etapa 3**: flag OFF e **totalmente seguro** porque dados em prod ainda estao no schema v1 e o codigo tem que respeitar isso. Essa e a unica janela em que Nivel 1 e genuinamente rapido e reversivel.

Apos migracao ter rodado, o que "Nivel 1 -- flag OFF" consegue e desligar o gate beta da UI nova (Etapa 4), nao restaurar o significado antigo dos dados. Isso ajuda em incidentes UX mas **nao resolve** incidentes de integridade de dados ou logica de fase.

### 5.3 Nivel 2 -- DB Snapshot Restore (unico rollback confiavel pos-migracao)

**Tempo de execucao**: **15-60 minutos** (depende do tamanho). Janela de downtime.

**Procedimento**:
1. devops-engineer para writes em `Trip` (deploy modo maintenance ou bloqueio de server actions de fase).
2. Restore da `Trip` (e tabelas dependentes migradas) a partir do snapshot `pre-phase-reorder-S44` tirado em T-60min da Etapa 3.
3. Deploy com `PHASE_REORDER_ENABLED=false` e imagem v0.59.0 (ou imagem atual com flag OFF -- ambas funcionam pois os dados agora sao v1).
4. Invalida caches.
5. Validacao: checksum de contagem por fase igual ao pre-migracao.
6. Libera writes.
7. Comunica usuarios (in-app + email para canary cohort): "Revertemos temporariamente a reordenacao; qualquer progresso feito no ultimo {{X}}h na fase reordenada precisara ser refeito."

**Custo aceito**: qualquer Trip criada ou modificada entre T-0 e o momento do restore **se perde** (volta ao estado do snapshot). Por isso o snapshot restore so e aceitavel durante a **janela de 48h apos Etapa 3** -- depois dela o volume de writes pos-migracao torna o data loss inaceitavel.

### 5.4 Janela de rollback

| Nivel                  | Janela                                   | Tempo  | Data loss?       |
|------------------------|------------------------------------------|--------|------------------|
| Flag OFF (pre-migrate) | v0.59.0 merge -> T-0 Etapa 3             | <2min  | Nao              |
| Flag OFF (pos-migrate) | **Nao e rollback -- apenas UX gating**   | <2min  | N/A              |
| Snapshot restore       | T-0 Etapa 3 + 48h                        | 15-60m | Sim (writes pos-migrate) |
| Apos 48h               | Reverse migration manual (exception)     | horas  | Sim + alto risco |

**Apos 48h**: reverte-se somente com aprovacao explicita de **PO + tech-lead + security-specialist**. Script de reverse SQL (`scripts/db/reverse-phase-reorder.sql`) existe como backup mas e considerado "break glass only".

### 5.5 Procedimento de decisao (qual nivel usar)

```
Problema detectado pos-canary (Etapa 3+)
  |
  v
E incidente UX (layout errado, label confuso)?
  |-- sim --> Nivel 1 (flag OFF), comunica, investiga
  |
  v
E incidente de dados/logica (pontos errados, fase errada, PA mismatch)?
  |-- sim --> dentro da janela 48h? --> Nivel 2 (snapshot restore)
  |                                 \-- fora da janela? --> escalar PO+tech-lead+security (reverse manual)
```

### 5.6 RACI de rollback

| Acao                        | Responsavel (R)     | Aprovacao (A)       | Consultado (C)                   | Informado (I) |
|-----------------------------|---------------------|---------------------|-----------------------------------|---------------|
| Detectar trigger            | devops-engineer     | tech-lead           | qa-engineer, security-specialist | all agents    |
| Decidir Nivel 1 (flag OFF)  | tech-lead           | tech-lead           | release-manager, devops-engineer | PO, all agents|
| Executar Nivel 1            | devops-engineer     | tech-lead           | --                                | all agents    |
| Decidir Nivel 2 (snapshot)  | tech-lead           | **PO + tech-lead**  | security-specialist, qa-engineer | all agents    |
| Executar Nivel 2            | devops-engineer     | tech-lead           | data-engineer                    | all agents    |
| Comunicar usuarios          | product-owner       | PO                  | ux-designer, release-manager     | all agents    |

### 5.7 O que NAO e reversivel (mesmo com snapshot restore)
- **Eventos de analytics ja enviados** durante canary pos-migracao: ficam no historico. Mitigacao: data-engineer anota o cutover-date no dashboard para segmentar historico antes/depois.
- **Tokens de IA gastos** durante canary: nao reembolsados automaticamente. finops-engineer audita custo total; se anomalia >5% do budget diario, PA refund em lote autorizado pelo PO.
- **Writes feitos entre migracao e snapshot restore**: perdidos por design. Apenas ate 5% beta + interno sao afetados durante a janela canary, por isso o escopo e aceitavel.

---

## 6. Criterios de Go/No-Go

### 6.1 Checklist antes de **merge** (fim Etapa 1)
- [ ] Build verde em `master` com flag OFF e com flag ON
- [ ] Unit + integration tests verdes nas duas configs
- [ ] QA-CONF-S44 (spec conformance) PASS
- [ ] ADR-0XX assinada pelo architect
- [ ] security-specialist sign-off (revisao de PII hash, BOLA guards no novo phase-config)
- [ ] SPEC-PROD, SPEC-ARCH, SPEC-UX, SPEC-AI, SPEC-QA, SPEC-DEVOPS em status "Approved"
- [ ] Flag `PHASE_REORDER_ENABLED` documentada em `.env.example` e `docs/infrastructure.md`
- [ ] Shim `phase-mapping.ts` com coverage >=90%
- [ ] CHANGELOG draft escrito e revisado

### 6.2 Checklist antes de **staging flag ON** (fim Etapa 2)
- [ ] Staging deploy verde
- [ ] Snapshot de DB de staging tirado antes da migracao
- [ ] `migrate-phase-reorder.sql` aplicado em staging sem erro, marcador de metadata gravado
- [ ] Checksum pos-migracao validado (contagem de Trips por fase coerente com mapeamento)
- [ ] E2E completo verde em staging (Playwright/QA-REL-S44)
- [ ] **Trust score >= 0.82 sustentado em staging por 7 dias** (tolerancia acordada com PO)
- [ ] Zero regressoes P0/P1 abertas
- [ ] QA-REL-S44 sign-off formal (qa-engineer)
- [ ] security-specialist re-aprova apos teste em staging
- [ ] `reverse-phase-reorder.sql` testado em staging (dry-run do break-glass)

### 6.3 Checklist antes de **canary em producao** (Etapa 3)
- [ ] **DB snapshot completo** de `Trip` (+ dependentes) em producao, rotulado `pre-phase-reorder-S44`
- [ ] Snapshot testado em sandbox via restore test
- [ ] `migrate-phase-reorder.sql` aprovado por architect + tech-lead + security-specialist
- [ ] Cohort canary configurado: `CANARY_ALLOWLIST` com equipe interna + 5% beta opt-in gate no shim
- [ ] Beta testers comunicados (email 1 enviado >=7 dias antes)
- [ ] Pagina de ajuda `/pt/ajuda/reordenacao-fases` publicada
- [ ] Modal in-app implementado e testado
- [ ] Monitoramento + alertas configurados (devops-engineer confirma dashboards)
- [ ] War-room channel ativo
- [ ] Freeze de merges em escopo sensivel ativo (ver 2.6)
- [ ] Janela **quarta-feira 10:00 BRT** confirmada no calendario da equipe
- [ ] Email 2 pronto para disparo em T-0

### 6.4 Checklist entre patamares do rollout gradual beta (Etapa 4)
- [ ] Erro rate dentro do baseline +/- 10%
- [ ] Trust score >= 0.82 sustentado
- [ ] Zero P0 aberto
- [ ] Zero P1 novo aberto na ultima janela
- [ ] PA saldo reconciliado (finops-engineer dry-run)
- [ ] Tickets de suporte sobre fase <=3 nas ultimas 24h
- [ ] tech-lead aprova avanco (5% -> 25% -> 50% -> 100% beta)

### 6.5 Checklist antes de **remocao de legacy** (fim Etapa 5) -- v0.61.0
- [ ] 100% beta por >=2 sprints sem issues
- [ ] grep em codigo nao retorna branch legacy do shim nem `PHASE_REORDER_ENABLED`
- [ ] Marcador de metadata `_phase_reorder_migration` dropado
- [ ] Testes legacy removidos
- [ ] CHANGELOG da versao da remocao registra como cleanup

---

## 7. Release Notes / Changelog -- ver Secao 4.3 e 4.4

---

## 8. Versao Alvo

- **Merge com flag OFF (Sprint 44)**: **v0.59.0**
- **Flag default ON (Sprint 45+, condicional ao go/no-go)**: **v0.60.0**
- **Remocao do legacy (Sprint 46+)**: **v0.61.0** ou seguinte
- **Tag 1.0.0**: nao acoplada a este esforco. Reservada para o marco de API REST publica estavel.

**Nota de divida**: `package.json` atualmente declara `0.35.1` enquanto a tag mais recente e `v0.58.0`. Esta divida deve ser corrigida pelo devops-engineer antes do merge de v0.59.0 (bump para 0.59.0 direto). Registrado como RISK-017 (novo) -- ver Secao 9.

---

## 9. Janela de Deploy Sugerida

- **Merge (Etapa 1)**: qualquer dia util. Recomendado **terca-feira de manha** para ter a semana completa de observacao.
- **Staging flag ON (Etapa 2)**: mesmo dia do merge ou D+1.
- **Canary em producao (Etapa 3)**: **quarta-feira, 10:00 BRT** (UTC-3). Justificativa:
  - Menor trafego historico em Travel Planner em manhas de dia util (assumindo padrao de uso que precisa ser confirmado com data-engineer).
  - Equipe inteira disponivel (evita sexta/segunda).
  - 48h de buffer para flag flip antes do final de semana.
- **Rollout gradual (Etapa 4)**: quinta 10-50%, sexta holding, segunda-feira 100%.
- **Proibido**: deploys na sexta a tarde, vesperas de feriado, janela de freeze de outro sprint.

**Deps bloqueantes**: devops-engineer precisa confirmar janela de menor trafego real olhando metricas antes de travar o horario.

### RISK-017 (novo)
- **Severidade**: MEDIO
- **Descricao**: `package.json` versao (0.35.1) esta dessincronizada com tag git (0.58.0). Release v0.59.0 deve corrigir isso como parte do bump de versao.
- **Owner**: devops-engineer
- **Prazo**: antes do merge da Etapa 1.

---

## 10. Dependencias de Outras Specs

Este plano de release **nao pode entrar em execucao** ate que as seguintes specs estejam em status "Approved":

| Spec ID                       | Responsavel         | Status esperado | Bloqueia etapa   |
|-------------------------------|---------------------|-----------------|------------------|
| SPEC-PROD-REORDER-PHASES      | product-owner       | Approved        | Etapa 1 (merge)  |
| SPEC-ARCH-REORDER-PHASES      | architect           | Approved        | Etapa 1 (merge)  |
| SPEC-UX-REORDER-PHASES        | ux-designer         | Approved        | Etapa 1 (merge)  |
| SPEC-AI-REORDER-PHASES        | prompt-engineer     | Approved        | Etapa 1 (merge)  |
| SPEC-QA-REORDER-PHASES        | qa-engineer         | Approved        | Etapa 2 (staging)|
| SPEC-DEVOPS-REORDER-PHASES    | devops-engineer     | Approved        | Etapa 2 (staging)|
| SPEC-SEC-REORDER-PHASES (opc) | security-specialist | Approved se houver mudanca em dados | Etapa 1 |
| ADR-0XX                       | architect           | Accepted        | Etapa 1 (merge)  |

release-manager confirma ordem cronologica das aprovacoes antes de abrir PR de merge.

---

## 11. Decisoes do Product Owner (aprovadas em 2026-04-15)

Todas as decisoes abaixo foram aprovadas pelo PO. Este bloco e historico -- serve como referencia de por que o plano tem o shape que tem.

| # | Decisao                             | Resultado aprovado                                                    |
|---|-------------------------------------|-----------------------------------------------------------------------|
| 1 | Estrategia de migracao              | **Opcao D** (big-bang in-place SQL, sem phaseSchemaVersion)           |
| 2 | Feature flag                        | **Env-only** (`PHASE_REORDER_ENABLED`), default OFF, sem flag service |
| 3 | Cohort de canary                    | **Equipe interna + 5% beta testers opt-in**                           |
| 4 | Janela de deploy                    | **Quarta-feira, 10:00 BRT**                                           |
| 5 | Comunicacao beta                    | **2 emails (T-7 e T-0) + in-app modal**                               |
| 6 | Freeze de merges durante canary     | **SIM, 48h**, escopo `phase-*`, PhaseEngine, PointsEngine, AI actions |
| 7 | Tolerancia de trust score em staging| **>= 0.82 sustentado por 7 dias**                                     |
| 8 | Rollback pos-migracao               | **DB snapshot restore como unica garantia confiavel**                 |
| 9 | Pagina de ajuda publica             | **Obrigatoria**, publicada ate D-3 do canary                          |
|10 | Trajetoria de versoes               | **v0.59.0 -> v0.60.0 -> v0.61.0**                                     |
|11 | RISK-017 (package.json dessincr.)   | Corrigido no bump para v0.59.0                                        |
|12 | Baking period antes de cleanup      | 2 sprints apos 100% beta                                              |
|13 | Escopo de rollout gradual           | Beta apenas (5 -> 25 -> 50 -> 100%), nao usuarios finais nesta fase   |
|14 | Canal de suporte dedicado           | Form dedicado, 14 dias apos flip                                      |
|15 | Status da spec                      | **Approved**                                                          |

---

## 12. Status e Proximos Passos

**Status**: **Approved** (2026-04-15).

**Bloqueios restantes** para inicio da execucao:
1. Aprovacao das specs dependentes (Secao 10) -- bloqueio formal da Etapa 1.
2. Kickoff formal convocado pelo release-manager assim que (1) estiver resolvido.
3. CIA-007 fechado / CIA-008 aberto em `docs/release-risk.md`.

---

## Change History

| Versao | Data       | Autor           | Mudanca                                                                 |
|--------|------------|-----------------|-------------------------------------------------------------------------|
| 1.0.0  | 2026-04-15 | release-manager | Criacao inicial (Draft, Opcao B progressiva)                            |
| 2.0.0  | 2026-04-15 | release-manager | **Reconciliacao PO**: Opcao B -> Opcao D (big-bang), rollback em 2 niveis (flag OFF + snapshot), freeze de merges 48h, emails T-7/T-0 + modal redigidos, trust score 0.82/7d, status Approved |

---

`-- Cleared com migration plan -- breaking change interno, version bump: v0.59.0 (merge flag OFF) -> v0.60.0 (flip apos migracao) -> v0.61.0 (cleanup). Migracao big-bang in-place SQL. Rollback confiavel pos-migracao apenas via DB snapshot restore (janela 48h). Flip do canary requer go/no-go completo da Secao 6.3. Execucao bloqueada ate aprovacao das specs dependentes (Secao 10).`
