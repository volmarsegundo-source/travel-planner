# Sprint 23 -- E2E Review Fixes

**Version**: v0.16.0
**Branch**: `fix/e2e-review-fixes`
**Base**: `master` (v0.15.1)
**Capacity**: 2 devs x 15h = 30h
**Sprint Goal**: Corrigir todos os bugs P0/P1 identificados na revisao end-to-end por 6 agentes.

---

## Resumo Executivo

Seis agentes (architect, security-specialist, product-owner, ux-designer, qa-engineer, tech-lead) realizaram uma auditoria E2E completa do fluxo de expedicao. Foram confirmados 5 bugs (2 P0, 3 P1), 2 vulnerabilidades de seguranca (P1), 3 problemas de navegacao (P1/P2) e diversos ajustes de i18n/UX (P2). Este sprint foca exclusivamente em correcoes -- nenhuma feature nova.

BUG-C (Phase 4 tabs para steps) esta DEFERIDO para Sprint 24 (requer spec UX, estimado 8h).

---

## Tabela de Tarefas

| Task ID | Descricao | Prioridade | Est (h) | Dev | Depende de |
|---------|-----------|:----------:|:-------:|:---:|:----------:|
| FIX-E2E-001 | Trip classifier: refatorar para usar ISO 3166-1 alpha-2 country codes | P0 | 1.5 | dev-1 | -- |
| FIX-E2E-002 | Destinations API: incluir `countryCode` na resposta | P0 | 1.0 | dev-1 | -- |
| FIX-E2E-003 | DestinationAutocomplete: propagar `countryCode` na interface e callback | P0 | 1.0 | dev-1 | FIX-E2E-002 |
| FIX-E2E-004 | Phase1Schema: adicionar `destinationCountryCode` e `originCountryCode` | P0 | 0.5 | dev-1 | FIX-E2E-001 |
| FIX-E2E-005 | Phase1Wizard: capturar country codes de ambos autocompletes e enviar ao servidor | P0 | 2.0 | dev-1 | FIX-E2E-003, FIX-E2E-004 |
| FIX-E2E-006 | ExpeditionService: executar `classifyTrip` server-side e persistir `tripType` | P0 | 1.5 | dev-1 | FIX-E2E-004, FIX-E2E-001 |
| FIX-E2E-007 | i18n: corrigir phase4.title/subtitle em pt-BR e en | P0 | 0.5 | dev-2 | -- |
| FIX-E2E-008 | PhaseTransition: alterar key `4: "theShelter"` para `4: "theLogistics"` | P0 | 0.5 | dev-2 | -- |
| FIX-E2E-009 | phase-config: corrigir badgeKey fase 4 de `"host"` para `"logistics_master"` | P0 | 0.5 | dev-2 | -- |
| FIX-E2E-010 | en.json: remover bloco duplicado `gamification.phases` (linhas 776-786) | P0 | 0.5 | dev-2 | -- |
| FIX-E2E-011 | DestinationGuideWizard: auto-gerar guia na primeira visita (useEffect) | P1 | 1.5 | dev-2 | -- |
| FIX-E2E-012 | Phase1Wizard + DestinationGuideWizard: traduzir error messages com `tErrors` | P1 | 1.0 | dev-2 | -- |
| FIX-E2E-013 | Phase2 confirmation: traduzir travelerType e accommodationStyle labels | P1 | 1.0 | dev-2 | -- |
| FIX-E2E-014 | BOLA fix: adicionar ownership check em completePhase4Action e advanceFromPhaseAction | P1 | 1.5 | dev-1 | -- |
| FIX-E2E-015 | Middleware: adicionar `/expedition` a PROTECTED_PATH_SEGMENTS | P1 | 0.5 | dev-1 | -- |
| FIX-E2E-016 | Phase2 page: adicionar guard `currentPhase < 2` + null check no trip | P1 | 1.0 | dev-1 | -- |
| FIX-E2E-017 | DashboardPhaseProgressBar: fase 1 link para `/expedition/{tripId}` (sem `/phase-1`) | P1 | 0.5 | dev-2 | -- |
| FIX-E2E-018 | en.json: corrigir "Coordenadas" portugues na linha 404 | P2 | 0.5 | dev-2 | -- |
| FIX-E2E-019 | pt-BR gamification.phases: corrigir "theShelter" para "A Logistica" (linha 780) | P0 | 0.5 | dev-2 | -- |
| FIX-E2E-020 | Back buttons: adicionar aria-label nos botoes com seta unicode | P2 | 0.5 | dev-2 | -- |
| FIX-E2E-021 | Testes: cobertura para trip classifier refatorado + BOLA fix + auto-generate | P1 | 3.0 | dev-1 + dev-2 | FIX-E2E-001..017 |

**Total estimado**: 20.5h (dev-1: 12.5h, dev-2: 10.5h -- com overlap em FIX-E2E-021)

---

## Mapa de Dependencias

```
BUG-A (Trip Classification -- P0):
  FIX-E2E-001 (classifier ISO codes) ──┐
  FIX-E2E-002 (API countryCode)  ──────┤
                                        ├──> FIX-E2E-003 (autocomplete interface)
                                        │         │
  FIX-E2E-004 (schema fields) ─────────┘         │
         │                                        │
         ├────────────────────────────────────────>│
         │                                        v
         └──> FIX-E2E-006 (server-side classify) ──> FIX-E2E-005 (wizard integration)

BUG-B (Phase 4 naming -- P0):
  FIX-E2E-007, FIX-E2E-008, FIX-E2E-009, FIX-E2E-010, FIX-E2E-019  (all independent)

BUG-D/E/F (P1 -- all independent):
  FIX-E2E-011, FIX-E2E-012, FIX-E2E-013

Security (P1):
  FIX-E2E-014, FIX-E2E-015  (independent)

Navigation (P1/P2):
  FIX-E2E-016, FIX-E2E-017  (independent)

Tests:
  FIX-E2E-021  (depends on all P0/P1 fixes)
```

---

## Caminho Critico

```
FIX-E2E-001 + FIX-E2E-002 (parallel, 1.5h)
    -> FIX-E2E-003 + FIX-E2E-004 (parallel, 1.0h)
        -> FIX-E2E-005 + FIX-E2E-006 (parallel, 2.0h)
            -> FIX-E2E-021 (tests, 3.0h)
```

Duracao critica: ~7.5h (dev-1 path). Dev-2 trabalha BUG-B + P1 fixes em paralelo.

---

## Detalhamento por Tarefa

### FIX-E2E-001: Refatorar trip-classifier para ISO country codes
**Dev**: dev-fullstack-1 | **Prioridade**: P0 | **Est**: 1.5h
**Arquivos**:
- `src/lib/travel/trip-classifier.ts`

**Descricao**: O classificador atual compara nomes de paises em ingles (e.g., "Brazil"), mas o Nominatim retorna nomes localizados pelo locale do usuario (e.g., "Brasil" em pt-BR). Refatorar para usar ISO 3166-1 alpha-2 codes (BR, AR, DE, etc.) que sao invariantes de locale.

**Implementacao**:
- Substituir `MERCOSUL_COUNTRIES` por `MERCOSUL_CODES = ["AR", "BR", "PY", "UY", "VE"]`
- Substituir `SCHENGEN_COUNTRIES` por `SCHENGEN_CODES = ["AT", "BE", "HR", "CZ", ...]`
- `classifyTrip(originCode: string, destCode: string)` compara codigos uppercase
- Manter o export do tipo `TripType`

**Criterio de aceite**:
- `classifyTrip("BR", "BR")` retorna `"domestic"`
- `classifyTrip("BR", "AR")` retorna `"mercosul"`
- `classifyTrip("BR", "DE")` retorna `"schengen"`
- `classifyTrip("BR", "JP")` retorna `"international"`
- Testes unitarios atualizados para nova assinatura

---

### FIX-E2E-002: Incluir countryCode na resposta da API de destinos
**Dev**: dev-fullstack-1 | **Prioridade**: P0 | **Est**: 1.0h
**Arquivos**:
- `src/app/api/destinations/search/route.ts`

**Descricao**: A API Nominatim retorna `address.country_code` (ISO alpha-2, lowercase). Adicionar este campo na resposta da API para que o frontend possa usa-lo na classificacao.

**Implementacao**:
- No mapeamento de `rawResults`, adicionar: `countryCode: item.address?.country_code?.toUpperCase() ?? null`
- Propagar o campo no objeto final apos deduplicacao

**Criterio de aceite**:
- Resposta da API inclui `countryCode: "BR"` para resultados no Brasil
- Campo e `null` quando Nominatim nao retorna country_code
- Testes existentes da rota atualizados

---

### FIX-E2E-003: Propagar countryCode na interface DestinationAutocomplete
**Dev**: dev-fullstack-1 | **Prioridade**: P0 | **Est**: 1.0h
**Arquivos**:
- `src/components/features/expedition/DestinationAutocomplete.tsx`

**Descricao**: Adicionar `countryCode: string | null` a `DestinationResult`. Garantir que o callback `onSelect` propaga o campo.

**Implementacao**:
- Adicionar `countryCode: string | null` a `DestinationResult` interface
- No fetch da API, mapear `countryCode` do resultado
- Nenhuma mudanca visual -- apenas propagacao de dados

**Criterio de aceite**:
- `onSelect` callback recebe objeto com `countryCode` preenchido
- Tipo `DestinationResult` exportado com o novo campo

---

### FIX-E2E-004: Adicionar country codes ao Phase1Schema
**Dev**: dev-fullstack-1 | **Prioridade**: P0 | **Est**: 0.5h
**Arquivos**:
- `src/lib/validations/expedition.schema.ts`

**Descricao**: Adicionar campos opcionais para country codes ao schema de validacao da Fase 1.

**Implementacao**:
```
destinationCountryCode: z.string().length(2).toUpperCase().optional()
originCountryCode: z.string().length(2).toUpperCase().optional()
```

**Criterio de aceite**:
- Schema aceita `{ destination: "Tokyo", destinationCountryCode: "JP" }` sem erro
- Campos sao opcionais (backward-compatible)
- `Phase1Input` type inclui os novos campos

---

### FIX-E2E-005: Phase1Wizard -- capturar country codes e enviar ao servidor
**Dev**: dev-fullstack-1 | **Prioridade**: P0 | **Est**: 2.0h
**Arquivos**:
- `src/components/features/expedition/Phase1Wizard.tsx`

**Descricao**: O wizard atualmente tem `onSelect={() => {}}` no autocomplete de origem. Corrigir para capturar country codes de ambos autocompletes e inclui-los no payload enviado ao servidor.

**Implementacao**:
- Adicionar state: `destinationCountryCode`, `originCountryCode`
- `handleDestinationSelect`: extrair e salvar `result.countryCode`
- Origin `onSelect`: implementar handler que salva `result.countryCode` como `originCountryCode`
- No submit (step 4 confirmation), incluir ambos country codes no payload
- Remover `classifyTrip` client-side (agora e server-side via FIX-E2E-006)
- Manter o badge visual de tipo de viagem -- buscar via `tripType` do resultado do servidor, ou calcular localmente com codes para feedback imediato

**Criterio de aceite**:
- Selecionar destino popula `destinationCountryCode`
- Selecionar origem popula `originCountryCode`
- Payload enviado para `createExpeditionAction` inclui ambos codes
- Badge de trip type continua visivel apos selecao

---

### FIX-E2E-006: ExpeditionService -- classificar trip server-side
**Dev**: dev-fullstack-1 | **Prioridade**: P0 | **Est**: 1.5h
**Arquivos**:
- `src/server/services/expedition.service.ts`
- `src/server/actions/expedition.actions.ts`

**Descricao**: O `createExpedition` nunca seta `tripType`, deixando o default Prisma `"international"`. Corrigir para executar `classifyTrip` server-side com os country codes recebidos.

**Implementacao**:
- Em `createExpedition`, receber `destinationCountryCode` e `originCountryCode` do input
- Se ambos estiverem presentes, chamar `classifyTrip(originCode, destCode)` e setar no `trip.create`
- Se apenas destination estiver presente, default para `"international"`
- Em `createExpeditionAction`, propagar os novos campos do Phase1Input validado

**Criterio de aceite**:
- Criar expedicao BR -> BR seta `tripType = "domestic"`
- Criar expedicao BR -> AR seta `tripType = "mercosul"`
- Criar expedicao sem country codes seta `tripType = "international"` (backward-compatible)
- Teste unitario de `ExpeditionService.createExpedition` cobre os 4 cenarios

---

### FIX-E2E-007: Corrigir i18n phase4.title e subtitle
**Dev**: dev-fullstack-2 | **Prioridade**: P0 | **Est**: 0.5h
**Arquivos**:
- `messages/pt-BR.json` (linhas 582-584)
- `messages/en.json` (linhas 582-584)

**Descricao**: Phase 4 ainda mostra "O Abrigo" / "The Shelter" em vez de "A Logistica" / "The Logistics".

**Implementacao**:
- pt-BR: `"title": "A Logistica"`, `"subtitle": "Planeje como chegar e se locomover no destino"`
- en: `"title": "The Logistics"`, `"subtitle": "Plan how to get there and move around at your destination"`

**Criterio de aceite**:
- Phase 4 wizard exibe titulo correto em ambos locales
- Subtitle reflete escopo ampliado (transporte + acomodacao + mobilidade)

---

### FIX-E2E-008: PhaseTransition -- corrigir key da fase 4
**Dev**: dev-fullstack-2 | **Prioridade**: P0 | **Est**: 0.5h
**Arquivos**:
- `src/components/features/expedition/PhaseTransition.tsx` (linha 28)

**Descricao**: Hardcoded `4: "theShelter"` deve ser `4: "theLogistics"`.

**Implementacao**:
- Alterar `4: "theShelter"` para `4: "theLogistics"` no `phaseNameKeys` record

**Criterio de aceite**:
- Animacao de transicao da fase 4 exibe "A Logistica" / "The Logistics"
- Teste unitario de PhaseTransition (se existir) atualizado

---

### FIX-E2E-009: phase-config -- corrigir badgeKey da fase 4
**Dev**: dev-fullstack-2 | **Prioridade**: P0 | **Est**: 0.5h
**Arquivos**:
- `src/lib/engines/phase-config.ts` (linha 46)

**Descricao**: `badgeKey: "host"` nao corresponde ao novo nome da fase. Deve ser `"logistics_master"`.

**Implementacao**:
- Alterar `badgeKey: "host"` para `badgeKey: "logistics_master"`
- Verificar se `"logistics_master"` existe no union type `BadgeKey` em `gamification.types.ts` -- se nao, adicionar
- Verificar e atualizar todos os `Record<BadgeKey, ...>` exhaustivos (badge map, i18n keys)
- Adicionar i18n keys para o novo badge em ambos locales

**Criterio de aceite**:
- Completar fase 4 concede badge `"logistics_master"`
- Badge name traduzido em pt-BR e en
- Build sem erros de tipo (exhaustive Record check)

---

### FIX-E2E-010: Remover bloco duplicado gamification.phases em en.json
**Dev**: dev-fullstack-2 | **Prioridade**: P0 | **Est**: 0.5h
**Arquivos**:
- `messages/en.json` (linhas 776-786 vs 788-800)

**Descricao**: `en.json` tem dois blocos `"phases"` dentro de `gamification`. O segundo (linhas 788-800) tem `progressLabel` e `comingSoon` que o primeiro nao tem. JSON parsers usam o ultimo, mas e fragil.

**Implementacao**:
- Mesclar ambos blocos em um unico: manter `progressLabel` e `comingSoon` do segundo bloco, atualizar `theShelter` para `theLogistics` (se ainda nao feito por FIX-E2E-008's i18n scope)
- Remover o primeiro bloco duplicado

**Criterio de aceite**:
- `en.json` tem exatamente um bloco `gamification.phases`
- Contem todas as keys: 8 phase names + `progressLabel` + `comingSoon`
- `npm run build` sem warnings de i18n

---

### FIX-E2E-011: Auto-gerar guia na primeira visita (Phase 5)
**Dev**: dev-fullstack-2 | **Prioridade**: P1 | **Est**: 1.5h
**Arquivos**:
- `src/components/features/expedition/DestinationGuideWizard.tsx`

**Descricao**: O wizard so mostra um botao "Generate". Deveria auto-iniciar geracao na primeira visita, como o Phase6Wizard faz.

**Implementacao**:
- Adicionar `hasTriggeredRef = useRef(false)`
- Adicionar `useEffect`: se `!initialGuide && !isGenerating && !hasTriggeredRef.current`, setar `hasTriggeredRef.current = true` e chamar `handleGenerate()`
- Manter botao "Regenerate" visivel apos geracao completa

**Criterio de aceite**:
- Primeira visita a Phase 5 inicia geracao automaticamente
- Revisita com guia existente NAO re-gera
- Botao de regenerar continua funcional
- Sem loop infinito (ref guard)

---

### FIX-E2E-012: Traduzir error messages em Phase1Wizard e DestinationGuideWizard
**Dev**: dev-fullstack-2 | **Prioridade**: P1 | **Est**: 1.0h
**Arquivos**:
- `src/components/features/expedition/Phase1Wizard.tsx`
- `src/components/features/expedition/DestinationGuideWizard.tsx`

**Descricao**: Catch blocks setam `"errors.generic"` como string literal e exibem `{errorMessage}` sem traduzir. Usuario ve "errors.generic" na tela.

**Implementacao**:
- Adicionar `const tErrors = useTranslations("errors")` em ambos componentes
- Na renderizacao de `errorMessage`: se `startsWith("errors.")`, usar `tErrors(errorMessage.replace("errors.", ""))`, senao exibir literal
- Mesmo padrao ja implementado em Phase2/3/4 wizards

**Criterio de aceite**:
- Erro generico exibe "Algo deu errado" (pt-BR) / mensagem traduzida (en)
- Nenhuma raw i18n key visivel ao usuario

---

### FIX-E2E-013: Traduzir labels de confirmacao na Phase 2
**Dev**: dev-fullstack-2 | **Prioridade**: P1 | **Est**: 1.0h
**Arquivos**:
- `src/components/features/expedition/Phase2Wizard.tsx`

**Descricao**: Tela de confirmacao mostra valores enum crus como "family", "budget" em vez de labels traduzidos.

**Implementacao**:
- `travelerType`: usar `t("step1." + travelerType)` ou chave equivalente
- `accommodationStyle`: usar `t("step2." + accommodationStyle)` ou chave equivalente
- Preferences count: usar chave i18n para "{count} categorias" (adicionar key se ausente)
- Verificar que keys i18n existem em ambos locales

**Criterio de aceite**:
- Confirmacao exibe "Familia" (pt-BR) / "Family" (en) em vez de "family"
- Confirmacao exibe "Economico" (pt-BR) / "Budget" (en) em vez de "budget"
- Contagem de preferencias traduzida

---

### FIX-E2E-014: BOLA fix -- ownership check em completePhase4Action e advanceFromPhaseAction
**Dev**: dev-fullstack-1 | **Prioridade**: P1 (SEC-STAB-006) | **Est**: 1.5h
**Arquivos**:
- `src/server/actions/expedition.actions.ts` (linhas 198-237 e 480-530)

**Descricao**: Ambas as actions fazem `db.expeditionPhase.findUnique` pelo `tripId` sem verificar que o trip pertence ao `session.user.id`. Um atacante pode manipular phases de trips de outros usuarios.

**Implementacao**:
- Em `completePhase4Action` (antes da linha 211): adicionar query `db.trip.findFirst({ where: { id: tripId, userId: session.user.id, deletedAt: null } })`. Se null, retornar `{ success: false, error: "errors.tripNotFound" }`
- Em `advanceFromPhaseAction` (antes da linha 497): mesmo pattern
- Alternativa: criar helper `assertTripOwnership(tripId, userId)` reutilizavel

**Criterio de aceite**:
- Request com `tripId` de outro usuario retorna erro sem modificar dados
- Teste unitario verifica rejeicao de tripId nao pertencente ao usuario
- Nenhuma regressao nos fluxos normais

---

### FIX-E2E-015: Middleware -- adicionar /expedition a PROTECTED_PATH_SEGMENTS
**Dev**: dev-fullstack-1 | **Prioridade**: P1 (SEC-STAB-001) | **Est**: 0.5h
**Arquivos**:
- `src/middleware.ts` (linha 25)

**Descricao**: Rotas `/expedition/*` nao estao no array `PROTECTED_PATH_SEGMENTS`, permitindo acesso sem autenticacao ate o nivel de page component (que faz seu proprio check). Defesa em profundidade requer protecao no middleware.

**Implementacao**:
- Adicionar `"/expedition"` ao array `PROTECTED_PATH_SEGMENTS`

**Criterio de aceite**:
- Acesso nao autenticado a `/en/expedition/xxx` redireciona para login
- Rotas existentes protegidas continuam funcionando

---

### FIX-E2E-016: Phase 2 page -- adicionar guard de fase e null check
**Dev**: dev-fullstack-1 | **Prioridade**: P1 (NAV-001 + NAV-002) | **Est**: 1.0h
**Arquivos**:
- `src/app/[locale]/(app)/expedition/[tripId]/phase-2/page.tsx`

**Descricao**: Phase 2 page nao verifica se `currentPhase >= 2` (o usuario pode acessar diretamente via URL mesmo estando na fase 1). Tambem nao faz null check no trip -- se o trip nao existir, passa `undefined` para o wizard.

**Implementacao**:
- Adicionar `currentPhase: true` ao `select` da query
- Apos query: `if (!trip || trip.currentPhase < 2) { redirect({ href: "/dashboard", locale }); return null; }`
- Seguir exatamente o padrao de `phase-3/page.tsx`

**Criterio de aceite**:
- Acesso direto a `/expedition/{tripId}/phase-2` com `currentPhase = 1` redireciona para dashboard
- Trip inexistente redireciona para dashboard
- Fluxo normal (currentPhase >= 2) funciona sem regressao

---

### FIX-E2E-017: DashboardPhaseProgressBar -- corrigir link da fase 1
**Dev**: dev-fullstack-2 | **Prioridade**: P1 (NAV-006) | **Est**: 0.5h
**Arquivos**:
- `src/components/features/dashboard/DashboardPhaseProgressBar.tsx`

**Descricao**: O componente gera `href={/expedition/${tripId}/phase-${phaseNum}}` para todas as fases. Fase 1 vive em `/expedition/${tripId}` (sem `/phase-1`). Link atual resulta em 404.

**Implementacao**:
- Condicional: se `phaseNum === 1`, usar `/expedition/${tripId}`, senao `/expedition/${tripId}/phase-${phaseNum}`

**Criterio de aceite**:
- Clicar no segmento da fase 1 navega para `/expedition/{tripId}`
- Clicar em fases 2-8 navega para `/expedition/{tripId}/phase-{N}`
- Teste unitario atualizado

---

### FIX-E2E-018: Corrigir "Coordenadas" em en.json
**Dev**: dev-fullstack-2 | **Prioridade**: P2 | **Est**: 0.5h
**Arquivos**:
- `messages/en.json` (linha 404)

**Descricao**: Texto em ingles contem palavra portuguesa "Coordenadas" (nome do sistema de pontos). Deve usar o equivalente ingles.

**Implementacao**:
- Substituir "Coordenadas" por "Coordinates" (ou o termo em ingles usado no restante do en.json)

**Criterio de aceite**:
- Nenhuma palavra portuguesa em en.json
- Texto faz sentido no contexto de gamificacao

---

### FIX-E2E-019: Corrigir gamification.phases.theShelter em pt-BR
**Dev**: dev-fullstack-2 | **Prioridade**: P0 | **Est**: 0.5h
**Arquivos**:
- `messages/pt-BR.json` (linha 780)

**Descricao**: `gamification.phases.theShelter` ainda diz "O Abrigo". Como a fase 4 foi renomeada para "A Logistica", esta key precisa ser atualizada para manter consistencia. Nota: a key `theShelter` em si e o identificador -- o VALOR deve ser "A Logistica".

**Implementacao**:
- Atualizar para manter coerencia: se PhaseTransition agora usa `theLogistics` (FIX-E2E-008), entao:
  - Remover `theShelter` de ambos locales (ou manter como fallback)
  - Garantir que `theLogistics` existe com valor correto em ambos: "A Logistica" (pt-BR), "The Logistics" (en)
- Verificar que o bloco em pt-BR NAO tem duplicatas (confirmado: nao tem)

**Criterio de aceite**:
- Nenhuma referencia a "O Abrigo" / "The Shelter" em i18n
- PhaseTransition, phase-config, e gamification.phases todos usam "theLogistics" / "logistics_master"

---

### FIX-E2E-020: Adicionar aria-label nos botoes de seta
**Dev**: dev-fullstack-2 | **Prioridade**: P2 | **Est**: 0.5h
**Arquivos**:
- `src/components/features/expedition/Phase1Wizard.tsx` (linhas 446, 496, 587)

**Descricao**: Botoes de "voltar" usam caracter unicode seta sem aria-label. Leitores de tela nao identificam a funcao do botao.

**Implementacao**:
- Adicionar `aria-label={tCommon("back")}` ou equivalente em todos os botoes com `{"\u2190"}`

**Criterio de aceite**:
- Cada botao de seta tem aria-label descritivo
- i18n key existe em ambos locales

---

### FIX-E2E-021: Testes para todas as correcoes P0/P1
**Dev**: dev-fullstack-1 + dev-fullstack-2 | **Prioridade**: P1 | **Est**: 3.0h
**Arquivos**:
- `src/lib/travel/trip-classifier.test.ts` (atualizar para ISO codes)
- `src/server/services/expedition.service.test.ts` (testar tripType persistence)
- `src/server/actions/expedition.actions.test.ts` (testar BOLA rejection)
- `src/components/features/expedition/DestinationGuideWizard.test.tsx` (testar auto-generate)
- `src/components/features/dashboard/DashboardPhaseProgressBar.test.tsx` (testar phase 1 link)
- Outros conforme necessario

**Divisao**:
- dev-1: classifier tests, expedition service tests, BOLA action tests (~1.5h)
- dev-2: guide wizard auto-generate test, progress bar test, i18n snapshot tests (~1.5h)

**Criterio de aceite**:
- Todos os testes novos passam
- `npm run test` sem falhas
- `npm run build` sem erros
- Coverage nos arquivos alterados >= 80%

---

## Atribuicao por Dev

### dev-fullstack-1 (12.5h)
| Task | Descricao | Est |
|------|-----------|:---:|
| FIX-E2E-001 | Trip classifier ISO codes | 1.5h |
| FIX-E2E-002 | API countryCode | 1.0h |
| FIX-E2E-003 | Autocomplete interface | 1.0h |
| FIX-E2E-004 | Phase1Schema fields | 0.5h |
| FIX-E2E-005 | Phase1Wizard integration | 2.0h |
| FIX-E2E-006 | Server-side classify | 1.5h |
| FIX-E2E-014 | BOLA ownership check | 1.5h |
| FIX-E2E-015 | Middleware /expedition | 0.5h |
| FIX-E2E-016 | Phase2 page guard | 1.0h |
| FIX-E2E-021 | Tests (dev-1 portion) | 1.5h |

### dev-fullstack-2 (10.5h)
| Task | Descricao | Est |
|------|-----------|:---:|
| FIX-E2E-007 | i18n phase4 title/subtitle | 0.5h |
| FIX-E2E-008 | PhaseTransition key | 0.5h |
| FIX-E2E-009 | phase-config badgeKey | 0.5h |
| FIX-E2E-010 | en.json duplicate phases | 0.5h |
| FIX-E2E-019 | pt-BR gamification phases | 0.5h |
| FIX-E2E-011 | Guide auto-generate | 1.5h |
| FIX-E2E-012 | Error message translation | 1.0h |
| FIX-E2E-013 | Phase2 confirmation labels | 1.0h |
| FIX-E2E-017 | Progress bar phase 1 link | 0.5h |
| FIX-E2E-018 | "Coordenadas" in en.json | 0.5h |
| FIX-E2E-020 | aria-label back buttons | 0.5h |
| FIX-E2E-021 | Tests (dev-2 portion) | 1.5h |

---

## Ordem de Execucao Sugerida

### Dia 1 (paralelo)

**dev-1**: FIX-E2E-001, FIX-E2E-002, FIX-E2E-004, FIX-E2E-003 (~4.0h)
**dev-2**: FIX-E2E-007, FIX-E2E-008, FIX-E2E-009, FIX-E2E-010, FIX-E2E-019 (~2.5h), FIX-E2E-011 (1.5h)

### Dia 2 (paralelo)

**dev-1**: FIX-E2E-005, FIX-E2E-006 (~3.5h), FIX-E2E-014, FIX-E2E-015, FIX-E2E-016 (~3.0h)
**dev-2**: FIX-E2E-012, FIX-E2E-013, FIX-E2E-017, FIX-E2E-018, FIX-E2E-020 (~3.0h)

### Dia 3 (convergencia)

**dev-1 + dev-2**: FIX-E2E-021 -- testes (3.0h total, dividido)
Final: `npm run test && npm run build` -- green gate antes de PR.

---

## Security Checklist (sprint-level)

- [ ] FIX-E2E-014: ownership check adicionado em todas as actions que escrevem metadata
- [ ] FIX-E2E-015: middleware protege /expedition
- [ ] Nenhum hardcoded credential adicionado
- [ ] Country codes vem de API (Nominatim) -- nao de input livre do usuario
- [ ] Inputs de country code validados com `.length(2).toUpperCase()` no schema

## Definition of Done

- [ ] Todos os 21 tasks acima marcados [x]
- [ ] Code review aprovado por tech-lead
- [ ] Test coverage >= 80% nos arquivos alterados
- [ ] Security checklist passed
- [ ] `npm run test` -- 0 falhas
- [ ] `npm run build` -- 0 erros
- [ ] Nenhuma raw i18n key visivel ao usuario em nenhum locale
- [ ] Nenhuma referencia a "O Abrigo" / "The Shelter" / "theShelter" / "host" badge em codigo ativo
- [ ] PR mergeado via review -- sem commits diretos em main

---

## Items Deferidos

| Item | Motivo | Sprint Alvo |
|------|--------|:-----------:|
| BUG-C: Phase 4 tabs para steps layout | Requer UX spec completa (~8h) | Sprint 24 |
| UXR-022: ExpeditionHub hardcoded gray colors | Cosmetic, nao afeta funcionalidade | Sprint 24 |
| UXR-015: PT-BR diacriticos faltantes | Requer auditoria completa de i18n | Sprint 24 |
