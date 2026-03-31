# PLAN-EXECUTION-5-FIXES -- Plano de Execucao para 5 Correcoes Recorrentes

> **Versao**: 1.0.0 | **Data**: 2026-03-30 | **Autor**: tech-lead
> **Status**: APROVADO PARA EXECUCAO

---

## 0. Contexto

Cinco problemas foram reportados entre 3-5 vezes cada, indicando correcoes anteriores incompletas ou regressoes. Este plano consolida os artefatos de investigacao produzidos por cada agente e define a ordem de execucao, paralelismo, e gates de qualidade.

### Artefatos de Investigacao (ja produzidos)

| Agente | Artefato | Status |
|--------|----------|--------|
| Architect | `docs/specs/ROOT-CAUSE-PHASE2-ADVANCE.md` (RCA-001) | CONFIRMED |
| Architect | `docs/specs/ROOT-CAUSE-MAP-PHASE6.md` (RCA-002) | CONFIRMED |
| Prompt Engineer | `docs/specs/PROMPT-REVIEW-PHASE5-PHASE6.md` | ANALISE COMPLETA |
| UX Designer | `docs/specs/UX-CUSTOS-MEDIOS-REDESIGN.md` (SPEC-UX-037) | DRAFT |
| Product Owner | `SPEC-PROD-MANUAL-AI-GENERATION.md` | PENDENTE -- PO deve produzir |

---

## 1. Inventario dos 5 Problemas

### FIX-001: Crash ao avancar da Phase 2 (BLOCKER)

- **Sintoma**: ErrorBoundary "Algo deu errado" ao clicar "Avancar" na confirmacao da Phase 2 (primeira vez). Segunda tentativa funciona.
- **Root cause** (RCA-001 S4.4): Race condition. `completePhase2Action` chama `revalidatePath()`, depois o client faz `router.push("/phase-3")`. A Phase 3 page executa `auth()` que retorna `null` transitoriamente durante rotacao de sessao. O triple non-null assertion `session!.user!.id!` lanca TypeError nao tratado.
- **Causa secundaria** (RCA-001 S4.6): Phase 3 page chama `auth()` duas vezes (uma dentro de `guardPhaseAccess`, outra diretamente), aumentando a janela de race condition.
- **Severidade**: P0 -- bloqueia fluxo do usuario
- **Recorrencia**: 3 vezes reportado

### FIX-002: Summary Phase 2 mostra valores em ingles (RECURRING x5)

- **Sintoma**: Na tela de resumo e na confirmacao da Phase 2, preferencias como "nature_hiking", "street_food", "early_bird" aparecem com underscores substituidos por espacos em vez de traduzidas.
- **Root cause**: `Phase2WizardV2.tsx` linhas 563-590 usa `.replace(/_/g, " ")` em vez de `tPrefValue()` (que usa o namespace `expedition.phase2.prefValue` com traducoes completas em pt-BR e en).
- **Locais afetados**:
  - `Phase2WizardV2.tsx` linhas 563, 572, 581, 590 (confirmacao intra-wizard)
  - `Phase3WizardV2.tsx` linha 460 (item keys com replace)
- **Severidade**: P1 -- 5a vez reportado, UX degradada
- **Recorrencia**: 5 vezes reportado

### FIX-003: Geracao IA falha (Phase 5 e 6) -- Mudanca para geracao manual

- **Sintoma**: Phase 5 (guia) e Phase 6 (roteiro) falham na primeira tentativa. Phase 5 excede maxTokens=3072 para guias complexos. Phase 6 falha em viagens 7+ dias.
- **Decisao PO**: Remover auto-geracao. Ambas as fases devem iniciar com conteudo manual editavel. Geracao IA torna-se acao explicita do usuario ("Gerar com IA"), com fallback manual sempre disponivel.
- **Root cause tecnica** (PROMPT-REVIEW S2-S3): Token budget insuficiente para schema exigido. Phase 5 precisa ~4500-5500 tokens mas tem cap de 3072. Phase 6 precisa ~8000-12000 tokens para 7+ dias.
- **Severidade**: P1 -- feature principal parcialmente quebrada
- **Recorrencia**: 4 vezes reportado
- **NOTA**: Requer SPEC-PROD pendente do PO antes de iniciar implementacao

### FIX-004: Card de Custos Medios Diarios desordenado

- **Sintoma**: Card "Custos Medios Diarios" na Phase 5 (DestinationGuideV2) ocupa largura errada no grid bento (B3=5cols + B4=6cols = 11, overflow). Tabela comprimida em mobile, scroll horizontal escondido.
- **Root cause** (SPEC-UX-037 S2): Grid 10 colunas com soma incorreta na row 2. Card precisa de full-width (col-span-10) com layout de tabela responsiva.
- **Severidade**: P2 -- UX degradada mas funcional
- **Recorrencia**: 3 vezes reportado

### FIX-005: Mapa Phase 6 nunca renderiza pins

- **Sintoma**: ItineraryMap sempre mostra "Localizacoes nao disponiveis" independente do dia selecionado.
- **Root cause** (RCA-002): Ausencia de coordenadas em TRES camadas:
  1. AI prompt nao solicita coordenadas (system-prompts.ts)
  2. Activity model no Prisma nao tem campos lat/lng
  3. `convertToV2Days()` hardcoda `coordinates: null` (Phase6ItineraryV2.tsx:323)
- **Severidade**: P2 -- feature completamente nao-funcional
- **Recorrencia**: 3 vezes reportado

---

## 2. Ordem de Execucao (Prioridade)

```
PRIORIDADE     FIX       BLOCKER?    DEP?
   1           FIX-001   SIM         Nenhuma
   2           FIX-002   NAO         Nenhuma
   3           FIX-003   NAO         Requer SPEC-PROD do PO
   4           FIX-004   NAO         Nenhuma (UX spec pronta)
   5           FIX-005   NAO         Nenhuma (RCA pronta)
```

---

## 3. Detalhamento por Fix

### FIX-001: Crash ao avancar da Phase 2

**Complexidade**: S (Small)

**Arquivos a modificar**:

| Arquivo | Mudanca |
|---------|---------|
| `src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx` | (1) Remover segunda chamada a `auth()`. Usar `userId` retornado por `guardPhaseAccess`. (2) Envolver `initializePhase3Checklist` em try/catch com fallback graceful. (3) Adicionar null-check no session antes de usar |
| `src/lib/guards/phase-access.guard.ts` | Retornar `userId` no `GuardResult` para que pages nao precisem chamar `auth()` novamente |
| `src/components/features/expedition/Phase2WizardV2.tsx` | Considerar usar `router.refresh()` antes de `router.push()` para forcar revalidacao sincrona, OU aguardar o resultado do action antes de navegar (ja faz isso, mas verificar timing) |

**Testes requeridos**:
- Unit: `guardPhaseAccess` retorna userId; Phase3 page trata session null sem crash
- Unit: `initializePhase3Checklist` falha graceful (nao propaga excecao)
- Manual (MANUAL-V): Completar Phase 2 e verificar transicao para Phase 3 sem erro, 5 tentativas consecutivas

**Criterio de aceite**:
- Phase 2 -> Phase 3 funciona em 100% das tentativas (minimo 5 consecutivas)
- ErrorBoundary nunca dispara durante avanço de fase
- Zero non-null assertions (`!`) em session objects nos pages de expedition

---

### FIX-002: Preferencias nao traduzidas

**Complexidade**: XS (Extra Small)

**Arquivos a modificar**:

| Arquivo | Mudanca |
|---------|---------|
| `src/components/features/expedition/Phase2WizardV2.tsx` | Linhas 559-594: Substituir `.replace(/_/g, " ")` por chamadas a `useTranslations("expedition.phase2.prefValue")`. Importar hook, criar funcao `translatePref(key)` identica a do ExpeditionSummaryV2 |
| `src/components/features/expedition/Phase3WizardV2.tsx` | Linha 460: Substituir `.replace(/_/g, " ")` por traducao i18n para checklist item keys |
| `messages/pt-BR.json` | Verificar se todas as chaves de preferencia estao presentes em `expedition.phase2.prefValue` (ja tem ~55 chaves) |
| `messages/en.json` | Idem verificacao de completude |

**Chaves de i18n confirmadas existentes** (verificado no codebase):
- `expedition.phase2.prefValue.nature_hiking` -> "Natureza e Trilhas" (pt-BR) / "Nature & Hiking" (en)
- `expedition.phase2.prefValue.street_food` -> "Comida de rua" (pt-BR) / "Street food" (en)
- `expedition.phase2.prefValue.early_bird` -> "Madrugador" (pt-BR) / "Early bird" (en)
- Total: ~55 chaves em cada locale

**Testes requeridos**:
- Unit: Phase2WizardV2 confirmation step renderiza valores traduzidos (nao raw keys)
- Unit: Verificar que `translatePref("nature_hiking")` retorna string traduzida, nao "nature hiking"
- Snapshot: Comparar render da confirmacao com valores traduzidos

**Criterio de aceite**:
- Zero ocorrencias de `.replace(/_/g, " ")` em Phase2WizardV2.tsx e Phase3WizardV2.tsx
- Confirmacao da Phase 2 exibe "Natureza e Trilhas" em pt-BR (nao "nature hiking")
- Summary exibe valores identicos aos da confirmacao (consistencia)

---

### FIX-003: Geracao IA manual (Phase 5 e 6)

**Complexidade**: L (Large)

**Pre-requisito**: PO deve produzir `SPEC-PROD-MANUAL-AI-GENERATION.md` antes de iniciar.

**Arquivos a modificar (estimativa pre-spec)**:

| Arquivo | Mudanca |
|---------|---------|
| `src/components/features/expedition/DestinationGuideV2.tsx` | (1) Remover auto-generate no `useEffect` (linhas 564-577). (2) Iniciar com template manual editavel. (3) "Gerar com IA" como botao explicito. (4) Manter fallback manual sempre acessivel |
| `src/components/features/expedition/Phase6ItineraryV2.tsx` | (1) Remover auto-generate no `useEffect` (linhas 1317-1330). (2) Iniciar com timeline vazia editavel (formulario de adicao de atividades ja existe). (3) "Gerar com IA" como botao explicito. (4) Manter capacidade de edicao manual em paralelo |
| `src/server/actions/expedition.actions.ts` | Possivel: Nova action para criar dias/atividades manualmente em batch |
| `src/server/actions/itinerary.actions.ts` | Possivel: Nova action para criar dia vazio com N atividades template |
| `src/lib/prompts/system-prompts.ts` | Aumentar maxTokens se IA mantida como opcao (3072->6144 para Phase 5, manter streaming para Phase 6) |
| `messages/pt-BR.json` + `messages/en.json` | Novas chaves para modo manual: botoes, placeholders, empty states |

**Testes requeridos**:
- Unit: Phase 5 e 6 renderizam sem erro quando nao ha dados (empty state)
- Unit: Botao "Gerar com IA" dispara fluxo correto (PA check -> confirm -> generate)
- Unit: Edicao manual de atividades funciona independente de IA
- Integration: Phase 5 completa-se com conteudo manual (sem IA)
- Integration: Phase 6 completa-se com atividades adicionadas manualmente
- Manual (MANUAL-V): Fluxo completo Phase 5 e 6 sem usar IA

**Criterio de aceite** (pendente refinamento pelo PO):
- Phase 5 e 6 NUNCA disparam geracao IA automaticamente
- Usuario pode completar ambas as fases 100% manualmente
- Botao "Gerar com IA" e claramente opcional e requer confirmacao
- Erro de IA nao bloqueia progresso da fase
- Token budget ajustado para reduzir falhas quando IA e usada

---

### FIX-004: Card de Custos Medios full-width

**Complexidade**: S (Small)

**Arquivos a modificar**:

| Arquivo | Mudanca |
|---------|---------|
| `src/components/features/expedition/DestinationGuideV2.tsx` | Reposicionar card de custos para `col-span-10` (full-width) em row dedicada, conforme SPEC-UX-037. Tabela responsiva com layout horizontal desktop / stack vertical mobile |
| `messages/pt-BR.json` + `messages/en.json` | Possivel: Novas chaves para labels de tier ("Economico", "Moderado", "Premium") se nao existirem |

**Testes requeridos**:
- Unit: Card de custos renderiza com `col-span-10` no desktop
- Unit: Tabela nao tem overflow horizontal (verificar classes CSS)
- Manual (MANUAL-V): Verificar visualmente em 3 breakpoints (mobile 375px, tablet 768px, desktop 1280px)

**Criterio de aceite**:
- Card ocupa 100% da largura do grid bento (sem dead space)
- Tabela legivel em todos os breakpoints sem scroll horizontal
- Tip (se presente) visivel abaixo da tabela

---

### FIX-005: Mapa Phase 6 com pins

**Complexidade**: L (Large)

**Arquivos a modificar**:

| Arquivo | Mudanca |
|---------|---------|
| `prisma/schema.prisma` | Adicionar `latitude Float?` e `longitude Float?` ao model `Activity` |
| Nova migration | `npx prisma migrate dev --name add_activity_coordinates` |
| `src/lib/prompts/system-prompts.ts` | Adicionar `coordinates: { lat: number, lng: number }` ao schema JSON do `PLAN_SYSTEM_PROMPT` |
| `src/server/services/itinerary-persistence.service.ts` | Persistir lat/lng do output da IA. Atualizar `DayActivitySchema` para aceitar coordinates opcionais |
| `src/server/actions/itinerary.actions.ts` | (1) Adicionar lat/lng ao `ActivityData` e `ActivityDataSchema`. (2) Adicionar lat/lng ao `Activity` interface. (3) Incluir lat/lng no select de queries |
| `src/components/features/expedition/Phase6ItineraryV2.tsx` | (1) `convertToV2Days()` linha 323: mapear coordinates do DB em vez de `null`. (2) Activity edit form: campos opcionais para lat/lng |
| `src/components/features/expedition/ItineraryMap.tsx` | Nenhuma mudanca necessaria -- ja funciona com dados corretos |

**Testes requeridos**:
- Unit: `convertToV2Days()` mapeia coordinates do DB quando disponiveis
- Unit: `convertToV2Days()` retorna `null` quando DB nao tem coordinates (graceful)
- Unit: `persistItinerary()` salva lat/lng quando presentes no AI output
- Unit: `persistItinerary()` nao falha quando AI output nao tem coordinates
- Unit: MapPanel filtra corretamente atividades com/sem coordinates
- Integration: AI gera coordenadas no output JSON quando solicitado
- Manual (MANUAL-V): Mapa exibe pins numerados para atividades com coordenadas

**Criterio de aceite**:
- Mapa exibe pins para atividades que tem coordenadas
- "Localizacoes nao disponiveis" so aparece se NENHUMA atividade do dia tem coordenadas
- Atividades criadas manualmente (sem coordenadas) nao quebram o mapa
- Migration e retrocompativel (campos opcionais, null por default)
- Itinerarios existentes continuam funcionando (coordinates null = sem pins, nao crash)

---

## 4. Plano de Execucao Paralela

### Fase A: Imediato (sem dependencias)

```
dev-fullstack-1                    dev-fullstack-2
      |                                  |
  FIX-001 (P0, S)                  FIX-002 (P1, XS)
  Crash Phase 2 advance            Preferencias i18n
      |                                  |
      v                                  v
  [PR + review]                    [PR + review]
      |                                  |
      +------------- merge --------------+
```

**Duracao estimada**: 1-2 dias
**Sem dependencia entre FIX-001 e FIX-002** -- podem ser executados e mergeados em paralelo.

### Fase B: Paralelo (apos Fase A merge)

```
dev-fullstack-1                    dev-fullstack-2
      |                                  |
  FIX-004 (P2, S)                  FIX-005 (P2, L)
  Custos card full-width           Mapa Phase 6 (migration +
      |                            prompt + persistence + UI)
      v                                  |
  [PR + review]                          |
      |                                  |
  FIX-003 (P1, L)                       |
  Manual AI generation                   |
  (APOS PO spec pronta)                 |
      |                                  v
      v                            [PR + review]
  [PR + review]                          |
      +------------- merge --------------+
```

**Duracao estimada**: 3-5 dias (depende de quando PO entrega SPEC-PROD)

### Caminho Critico

```
PO produz SPEC-PROD-MANUAL-AI-GENERATION.md
    |
    v
FIX-003 pode iniciar (dev-fullstack-1)
    |
    v
FIX-003 e a maior task (L), determina prazo final
```

**Se PO atrasar a spec**: dev-fullstack-1 inicia FIX-004 enquanto aguarda. FIX-003 inicia assim que spec estiver aprovada.

---

## 5. Quality Gates

### 5.1 Baseline de Testes

| Metrica | Baseline | Regra |
|---------|----------|-------|
| Unit tests | 2630+ (verificar contagem atual antes de iniciar) | Nenhuma regressao. Cada fix ADICIONA testes |
| Test suites | Todos passando | Zero falhas |
| Build | `npm run build` limpo | Zero erros, zero warnings criticos |

### 5.2 Checklist por PR

Cada PR deve passar TODOS os itens antes de merge:

- [ ] Unit tests passando (`npm run test`)
- [ ] Build passando (`npm run build`)
- [ ] Lint passando (`npm run lint`)
- [ ] Zero hardcoded credentials/secrets
- [ ] Zero non-null assertions (`!`) em session objects
- [ ] Todos os inputs validados com Zod
- [ ] PII nao logada em console/logger
- [ ] Import de `useRouter`/`Link` de `@/i18n/navigation` (nao `next/navigation`)
- [ ] Commit messages com task ID: `fix(FIX-001): description`
- [ ] PR description inclui spec conformance checklist

### 5.3 Verificacao Manual Obrigatoria (MANUAL-V)

Para CSS/layout bugs e race conditions, unit tests sao NECESSARIOS mas NAO SUFICIENTES (licao Sprint 27).

| Fix | Verificacao Manual |
|-----|-------------------|
| FIX-001 | 5 tentativas consecutivas Phase 2->3 sem erro |
| FIX-002 | Screenshot da confirmacao em pt-BR e en |
| FIX-003 | Fluxo completo Phase 5+6 sem IA |
| FIX-004 | Screenshots em 3 breakpoints (375px, 768px, 1280px) |
| FIX-005 | Mapa com pins visivies apos geracao de itinerario |

### 5.4 UX Validation

- FIX-004 requer aprovacao do UX Designer antes de merge (SPEC-UX-037)
- FIX-003 requer aprovacao do PO e UX Designer (nova spec)
- FIX-005 requer verificacao visual do mapa pelo QA

---

## 6. Risk Assessment

### 6.1 Riscos por Fix

| Fix | Risco | Probabilidade | Impacto | Mitigacao |
|-----|-------|---------------|---------|-----------|
| FIX-001 | Race condition pode ter causas adicionais nao identificadas | MEDIA | ALTO | Implementar null-check defensivo E remover double auth(). Monitorar ErrorBoundary triggers apos deploy |
| FIX-002 | Chaves i18n faltando para alguma preferencia obscura | BAIXA | BAIXO | Script de validacao: comparar todas as chaves de enum com chaves em messages/*.json. Fallback: `try { return tPrefValue(key); } catch { return key.replace(/_/g, " "); }` |
| FIX-003 | Spec do PO pode mudar escopo significativamente | MEDIA | ALTO | Iniciar FIX-004 enquanto aguarda. Planejar implementacao em 2 PRs: (1) remover auto-generate, (2) adicionar modo manual |
| FIX-004 | Bento grid reflow pode quebrar outros cards | MEDIA | MEDIO | Testar todos os cards do guide apos mudanca. Comparar antes/depois com screenshots |
| FIX-005 | AI pode nao gerar coordenadas confiaveis | ALTA | MEDIO | Validar lat/lng range (-90 a 90, -180 a 180) no Zod schema. Fallback: geocoding via Nominatim API como segunda passada (post-fix, se qualidade insuficiente) |
| FIX-005 | Migration em producao com dados existentes | BAIXA | BAIXO | Campos opcionais (nullable), zero impacto em dados existentes |

### 6.2 Rollback por Fix

| Fix | Estrategia de Rollback |
|-----|----------------------|
| FIX-001 | Revert commit. Impacto: crash retorna (intermitente). Baixo risco de dados corrompidos |
| FIX-002 | Revert commit. Impacto: preferencias voltam a exibir em ingles. Zero risco de dados |
| FIX-003 | Revert commit. Impacto: volta ao auto-generate (falhas de IA retornam). Feature flag alternativa: `MANUAL_AI_MODE=true` em env para rollback sem revert |
| FIX-004 | Revert commit. Impacto: card volta ao layout anterior. Zero risco de dados |
| FIX-005 | Revert migration + commit. Impacto: mapa volta a "sem localizacoes". Migration down deve dropar colunas lat/lng. Zero risco: campos novos nullable nao tem dados legados |

### 6.3 Risco Global

- **Nenhum fix altera o schema de fases/pontos/badges** -- zero risco ao sistema de gamificacao
- **FIX-005 requer migration** -- agendar para momento de baixo trafego (se houver prod)
- **FIX-003 e o mais arriscado** -- maior escopo, depende de spec externa, muda comportamento fundamental das fases 5/6

---

## 7. Dependencias entre Fixes

```
FIX-001 -----> nenhuma dependencia
FIX-002 -----> nenhuma dependencia
FIX-003 -----> SPEC-PROD-MANUAL-AI-GENERATION.md (PO)
           \-> FIX-005 pode influenciar (se IA gerar coords, modo manual precisa campo de coords)
FIX-004 -----> nenhuma dependencia
FIX-005 -----> nenhuma dependencia
           \-> FIX-003 pode se beneficiar (atividades manuais sem coords = mapa vazio, aceitavel)
```

**Dependencia fraca entre FIX-003 e FIX-005**: Se IA gerar coordenadas (FIX-005), o modo manual (FIX-003) precisa de um campo opcional de coordenadas no formulario de edicao de atividades. Esta dependencia e ADITIVA (nao bloqueante) -- implementar coordenadas manuais como follow-up se necessario.

---

## 8. Atribuicao de Tasks (resumo)

| Task | Assignee | Fase | Est |
|------|----------|------|-----|
| FIX-001: Crash Phase 2 advance | dev-fullstack-1 | A | S |
| FIX-002: Preferencias i18n | dev-fullstack-2 | A | XS |
| FIX-004: Custos card full-width | dev-fullstack-1 | B | S |
| FIX-005: Mapa Phase 6 | dev-fullstack-2 | B | L |
| FIX-003: Manual AI generation | dev-fullstack-1 | B (apos spec) | L |

---

## 9. Definition of Done

- [ ] Todos os 5 fixes implementados e mergeados
- [ ] Zero regressoes no test suite (baseline + novos testes)
- [ ] Build limpo (`npm run build`)
- [ ] Lint limpo (`npm run lint`)
- [ ] Code review aprovado pelo tech-lead para cada PR
- [ ] Security checklist passado (zero secrets, zero PII leaks)
- [ ] Bias checklist passado (sem logica discriminatoria)
- [ ] MANUAL-V completado para cada fix
- [ ] UX validation para FIX-003 e FIX-004
- [ ] SPEC-STATUS.md atualizado
- [ ] Changelog atualizado com todas as correcoes

---

## 10. Proximos Passos Imediatos

1. **AGORA**: dev-fullstack-1 inicia FIX-001, dev-fullstack-2 inicia FIX-002
2. **AGORA**: PO produz SPEC-PROD-MANUAL-AI-GENERATION.md
3. **Apos merge Fase A**: dev-fullstack-1 inicia FIX-004, dev-fullstack-2 inicia FIX-005
4. **Apos spec PO aprovada**: dev-fullstack-1 inicia FIX-003 (pode ser em paralelo com FIX-004 se timing permitir)

> PRONTO PARA EXECUCAO -- Fase A pode iniciar imediatamente (FIX-001 + FIX-002 sem dependencias). Fase B bloqueada apenas para FIX-003 (aguarda SPEC-PROD do PO).
