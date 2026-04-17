# Relatorio Forense -- Sprint 44 Phase Reorder

## Data: 2026-04-15
## Investigador: tech-lead

---

## 1. Estado do Codigo

### Git Log (ultimos 15 commits)
```
0b16212 fix(sprint-44): make PhaseShell progress bar labels flag-aware
6c49d0c fix(sprint-44): add missing *Reordered i18n keys and fix swapped subtitles
2e2b9a7 fix(sprint-44): add missing checklist categories and fix nextPath scope
5a3cef5 docs(sprint-44): add SPEC-UX-044 phase footer standardization
6f39f1d fix(sprint-44): correct PHASE_REORDER_ENABLED env var name in specs
38ef481 feat(sprint-44): unify profile city/country into autocomplete field
d4756d8 fix(sprint-44-wave-5): remove redundant eslint-disable in injection-guard.ts
cf83af9 docs(sprint-44-wave-5): track Sprint 44 spec files in git
```

### Status: Limpo
- Branch: `master`, up to date com `origin/master`
- Nenhuma mudanca em arquivos de codigo-fonte pendente (apenas memory files e i18n-report.md)
- Todos os commits do Sprint 44 estao presentes no historico

---

## 2. Feature Flag -- Trace Completo

### 2.1 Declaracao em `src/lib/env.ts` (linhas 59-62)
```typescript
NEXT_PUBLIC_PHASE_REORDER_ENABLED: z
  .enum(["true", "false"])
  .default("false")           // <-- DEFAULT E "false"
  .transform((v) => v === "true"),
```

### 2.2 Resolucao em `src/lib/flags/phase-reorder.ts`
```typescript
export function isPhaseReorderEnabled(): boolean {
  return env.NEXT_PUBLIC_PHASE_REORDER_ENABLED;
}
```

### 2.3 ACHADO CRITICO #1: Flag NAO esta setada em nenhum .env

| Arquivo         | Contem `PHASE_REORDER`? |
|-----------------|------------------------|
| `.env`          | NAO                    |
| `.env.local`    | NAO                    |
| `.env.example`  | SIM (comentado: `# NEXT_PUBLIC_PHASE_REORDER_ENABLED="false"`) |

**Consequencia**: O default `"false"` do Zod schema e usado. `isPhaseReorderEnabled()` retorna `false` SEMPRE no ambiente local.

### 2.4 ACHADO CRITICO #2: Build-time inlining do Next.js

Variaveis `NEXT_PUBLIC_*` sao **inline no bundle JS no build time**. Isso significa:
- Se o Vercel/staging fez build sem a var setada, o valor `false` esta HARDCODED no JS servido ao browser
- Mudar a var no painel do Vercel DEPOIS do build NAO tem efeito -- precisa de NOVO build
- Todos os 47+ call sites em client components recebem `false` independente do que esta configurado agora

### 2.5 Call Sites (47 ocorrencias)

**Componentes CLIENT ("use client")** -- afetados pelo build-time inlining:
- `ChecklistProgressMini.tsx` (linha 48)
- `ExpeditionCardRedesigned.tsx` (linha 225)
- `PhaseReorderBanner.tsx` (linha 34)
- `DestinationGuideV2.tsx` (linhas 781, 809, 810, 832)
- `ExpeditionSummary.tsx` (linhas 29, 114)
- `Phase2WizardV2.tsx` (linhas 216, 245, 279)
- `Phase3WizardV2.tsx` (linhas 228, 229, 230)
- `Phase4WizardV2.tsx` (linhas 377, 378, 379, 397)
- `Phase6ItineraryV2.tsx` (linhas 1542, 1543, 1544, 1606)
- `PhasesSectionV2.tsx` (linha 59)

**Codigo SERVER** -- le a var em runtime (funciona se var estiver setada no servidor):
- `checklist-engine.ts`
- `next-steps-engine.ts`
- `phase-completion.engine.ts`
- `phase-config.ts`
- `phase-navigation.engine.ts`
- `expedition.actions.ts`
- `ai.service.ts`
- `itinerary-plan.service.ts`

**Divergencia critica**: Se a var for setada no Vercel mas build for antigo, SERVER-SIDE ve `true` mas CLIENT-SIDE ve `false`. Isso causa inconsistencia entre o que o servidor calcula e o que o browser exibe.

---

## 3. Rastreamento "O Preparo"

### 3.1 ACHADO CRITICO #3: Roteamento HARDCODED -- URL /phase-3 sempre renderiza Checklist

**`src/app/[locale]/(app)/expedition/[tripId]/phase-3/page.tsx`** (linha 3):
```typescript
import { Phase3Wizard } from "@/components/features/expedition/Phase3Wizard";
```

Este arquivo importa diretamente `Phase3Wizard` (checklist / "O Preparo"). NAO consulta a feature flag. NAO usa `getPhaseDefinitions()`.

**`src/app/[locale]/(app)/expedition/[tripId]/phase-5/page.tsx`** (linha 8):
```typescript
import { DestinationGuideV2 } from "@/components/features/expedition/DestinationGuideV2";
```

Mapeamento ESTATICO atual:
| URL       | Componente Importado   | Conteudo          | Flag-aware? |
|-----------|------------------------|-------------------|-------------|
| /phase-3  | Phase3Wizard           | Checklist (O Preparo) | NAO     |
| /phase-4  | Phase4WizardV2         | Logistica         | NAO         |
| /phase-5  | DestinationGuideV2     | Guia do Destino   | NAO         |
| /phase-6  | Phase6ItineraryV2      | Itinerario        | NAO         |

**Com flag ON, a ordem deveria ser**:
| URL       | Deveria Renderizar     |
|-----------|------------------------|
| /phase-3  | Guia do Destino (DestinationGuideV2) |
| /phase-4  | Itinerario (Phase6ItineraryV2)       |
| /phase-5  | Logistica (Phase4WizardV2)           |
| /phase-6  | Checklist (Phase3WizardV2)           |

**CONCLUSAO**: Mesmo que a flag esteja ON, a URL `/phase-3` SEMPRE renderiza o checklist "O Preparo" porque o mapeamento URL->componente esta hardcoded nos arquivos `page.tsx`. Este e o BUG RAIZ do problema "Fase 3 mostra O Preparo".

### 3.2 Uso direto de PHASE_DEFINITIONS (constante estatica, ignora flag)

Arquivos que usam `PHASE_DEFINITIONS` diretamente (NAO `getPhaseDefinitions()`):
- `src/app/[locale]/(app)/como-funciona/page.tsx` -- linhas 2, 90
- `src/app/[locale]/(app)/layout.tsx` -- linhas 6, 50, 52
- `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` -- linhas 6, 31
- **`src/components/features/expedition/PhaseShellV2.tsx`** -- linhas 13, 90, 93 (CRITICO: progress bar labels)
- `src/components/features/expedition/UnifiedProgressBar.tsx` -- linhas 13, 95
- `src/server/actions/gamification.actions.ts` -- linhas 7, 46, 48
- `src/server/services/trip-readiness.service.ts` -- linhas 7, 109

Estes SEMPRE retornam a ordem original (fase 3 = "O Preparo"), mesmo com flag ON.

### 3.3 Nomes hardcoded em arrays literais

**`DashboardV2.tsx`** (linhas 19-28):
```typescript
const PHASE_NAMES_KEYS = [
  "theCalling", "theExplorer", "thePreparation",  // <-- fase 3 = O Preparo, fixo
  "theLogistics", "theDestinationGuide", "theItinerary", ...
];
```

**`PhaseTransition.tsx`** (linhas 49-58):
```typescript
const phaseNameKeys: Record<number, string> = {
  3: "thePreparation",  // <-- hardcoded, ignora flag
  ...
};
```

### 3.4 Traduces i18n

Em `messages/pt-BR.json`:
- `phases.thePreparation` = "O Preparo" (existe, correto para flag OFF)
- `guide.title` = "Guia do Destino" (existe)

As chaves i18n EXISTEM para ambas as ordens. O problema nao e falta de traducao -- e que o codigo usa as chaves da ordem original.

---

## 4. Autocomplete do Perfil

### 4.1 Estado Atual do Codigo
O commit `38ef481` ESTA presente em `ProfileAccordion.tsx`:
- Linha 9: `import { DestinationAutocomplete } from "@/components/features/expedition/DestinationAutocomplete";`
- Linha 58: Campo `location` com `type: "location"` no array `PROFILE_FIELDS`
- Linhas 311-336: Rendering condicional do `DestinationAutocomplete` quando `field.type === "location"`

### 4.2 ACHADO CRITICO #4: CSS overflow:hidden clip a dropdown

**`ProfileAccordion.tsx` linha 281:**
```typescript
className="rounded-xl border border-border bg-card overflow-hidden"
```

**`DestinationAutocomplete.tsx` linha 342:**
```typescript
className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto ..."
```

A dropdown do autocomplete usa `position: absolute` + `z-50`, mas o container pai (card do accordion) tem `overflow-hidden`. O dropdown e renderizado DENTRO do container -- `overflow-hidden` corta qualquer conteudo que saia dos limites do card, tornando a dropdown INVISIVEL.

**Nota**: Este e o MESMO bug documentado na memoria do Sprint 27 -- JSDOM nao detecta CSS stacking contexts, entao testes unitarios passam mas o bug e visual.

### 4.3 Solucao Necessaria
- Opcao A: Remover `overflow-hidden` do card do accordion (pode causar layout glitches)
- Opcao B: Usar `React.createPortal(document.body)` para renderizar a dropdown fora do container (fix correto, ja recomendado no Sprint 27)
- Opcao C: Mudar para `overflow-visible` e usar `clip-path` apenas nas bordas arredondadas

---

## 5. "phaseNotSkippable"

### 5.1 Uso no Codigo
**`src/lib/engines/phase-engine.ts` linha 354:**
```typescript
throw new AppError(
  "PHASE_NOT_NON_BLOCKING",
  "errors.phaseNotSkippable",
  400
);
```

Este erro e lancado quando o usuario tenta pular (skip) uma fase que nao esta marcada como `nonBlocking` no `getPhaseDefinition()`.

### 5.2 ACHADO CRITICO #5: Traducao AUSENTE

| Arquivo              | Chave `errors.phaseNotSkippable` |
|----------------------|----------------------------------|
| `messages/en.json`   | NAO EXISTE                       |
| `messages/pt-BR.json`| NAO EXISTE                       |

A chave `errors.phaseNotSkippable` NAO existe em nenhum arquivo de traducao. O next-intl, ao nao encontrar a chave, exibe a string bruta `"errors.phaseNotSkippable"` na UI.

Chaves existentes no namespace `errors`:
- `errors.generic`, `errors.tripNotFound`, `errors.maxTripsReached`, `errors.unauthorized`, `errors.aiSchemaError`, `errors.prerequisitesNotMet`
- **Faltam**: `errors.phaseNotSkippable`, `errors.phaseNotActive`

---

## 6. Roteamento de Fases

### 6.1 Estrutura de Rotas

```
src/app/[locale]/(app)/expedition/[tripId]/
  phase-1/page.tsx  ->  Phase1Wizard (Inspiracao)
  phase-2/page.tsx  ->  Phase2WizardV2 (Perfil)
  phase-3/page.tsx  ->  Phase3Wizard (Checklist / O Preparo)     <-- HARDCODED
  phase-4/page.tsx  ->  Phase4WizardV2 (Logistica)               <-- HARDCODED
  phase-5/page.tsx  ->  DestinationGuideV2 (Guia do Destino)     <-- HARDCODED
  phase-6/page.tsx  ->  Phase6ItineraryV2 (Itinerario)           <-- HARDCODED
```

### 6.2 ACHADO CRITICO #6: Nenhuma pagina de fase e flag-aware

NENHUM dos 6 arquivos `page.tsx` consulta `isPhaseReorderEnabled()` para decidir qual componente renderizar. O mapeamento URL -> componente e ESTATICO via import direto.

A flag foi aplicada extensivamente DENTRO dos componentes (navegacao back/next, subtitulos, labels), mas a CAMADA DE ROTEAMENTO -- que decide qual componente mostrar para cada URL -- foi esquecida.

### 6.3 Guard de Acesso
`guardPhaseAccess(tripId, 3, locale)` valida se o usuario pode acessar a fase 3. Com flag ON, o phase-navigation.engine pode calcular corretamente que fase 3 = Guide, mas o page.tsx ignora isso e renderiza o checklist.

---

## 7. Cache

### 7.1 `.next/` no repo
`.next/` esta no `.gitignore` (correto). Nao esta versionado.

### 7.2 Build Local
Nao foi executado `npm run build` nesta investigacao, mas o problema NAO e de cache:
- O bug esta no CODIGO FONTE (imports hardcoded nos page.tsx)
- Mesmo um build limpo com flag ON mostraria o componente errado em cada URL

---

## 8. Rota de Debug

Criada em: `src/app/api/debug/flags/route.ts`

- Acessivel via `GET /api/debug/flags` (apenas em development)
- Retorna: raw_env, parsed_env, isPhaseReorderEnabled, phaseOrder, buildTime, nodeEnv
- Bloqueada em production (retorna 403)

---

## DIAGNOSTICO -- CAUSA RAIZ

### Bug 1: "Fase 3 mostra O Preparo" -- TRES causas cumulativas

**Causa Raiz Primaria (CR-1):** Os arquivos `page.tsx` de cada fase tem imports HARDCODED para componentes especificos. A URL `/phase-3` SEMPRE renderiza `Phase3Wizard` (checklist), independente do estado da feature flag. A camada de roteamento NAO foi adaptada para o phase reorder.

**Causa Raiz Secundaria (CR-2):** Multiplos componentes usam `PHASE_DEFINITIONS` (constante estatica, ordem original) em vez de `getPhaseDefinitions()` (funcao flag-aware). Isso afeta: PhaseShellV2, DashboardPhaseProgressBar, UnifiedProgressBar, layout.tsx, como-funciona, gamification.actions.ts, trip-readiness.service.ts.

**Causa Raiz Terciaria (CR-3):** Arrays literais hardcoded em `DashboardV2.tsx` (PHASE_NAMES_KEYS) e `PhaseTransition.tsx` (phaseNameKeys) mapeiam numero de fase -> nome sem consultar a flag.

### Bug 2: "Autocomplete nao aparece no Perfil" -- UMA causa

**Causa Raiz (CR-4):** O container do accordion em `ProfileAccordion.tsx` tem `overflow-hidden` (linha 281). A dropdown do `DestinationAutocomplete` usa `position: absolute` dentro desse container. O CSS `overflow-hidden` corta a dropdown. Testes unitarios passam porque JSDOM nao computa CSS. Bug exclusivamente visual.

### Bug 3: "errors.phaseNotSkippable como chave crua" -- UMA causa

**Causa Raiz (CR-5):** A chave i18n `errors.phaseNotSkippable` nao existe em `messages/en.json` nem em `messages/pt-BR.json`. O `phase-engine.ts` lanca um `AppError` com essa chave de mensagem, mas a UI nao encontra traducao e exibe a string bruta.

---

## PLANO DE CORRECAO

### Prioridade 1 -- Criticos (bloqueiam uso da feature flag)

**FIX-1: Roteamento dinamico de fases** (CR-1)
- Cada `page.tsx` (phase-3 a phase-6) deve consultar `isPhaseReorderEnabled()` e renderizar o componente correto
- Opcao A: Switch/if no page.tsx baseado na flag
- Opcao B: Um unico `[phaseSlug]/page.tsx` com lookup dinamico via `getPhaseDefinitions()`
- Depende de: decisao arquitetural (escalar ao architect)
- Estimativa: M

**FIX-2: Substituir PHASE_DEFINITIONS por getPhaseDefinitions()** (CR-2)
- 8 arquivos afetados (listados na secao 3.2)
- Substituicao mecanica: `PHASE_DEFINITIONS` -> `getPhaseDefinitions()`
- ATENCAO: Em server components, a funcao e chamada em runtime (OK). Em client components, o valor da flag ja esta inline no build.
- Estimativa: S

**FIX-3: Tornar arrays literais flag-aware** (CR-3)
- `DashboardV2.tsx`: derivar `PHASE_NAMES_KEYS` de `getPhaseDefinitions()`
- `PhaseTransition.tsx`: derivar `phaseNameKeys` de `getPhaseDefinitions()`
- Estimativa: S

### Prioridade 2 -- Importantes

**FIX-4: Dropdown clipping do autocomplete** (CR-4)
- Implementar `React.createPortal(document.body)` no `DestinationAutocomplete` para renderizar a dropdown fora do container
- Ou: remover `overflow-hidden` do card do accordion em `ProfileAccordion.tsx` linha 281
- Estimativa: S

**FIX-5: Adicionar traducao `errors.phaseNotSkippable`** (CR-5)
- Adicionar em `messages/en.json`: `"phaseNotSkippable": "This phase cannot be skipped. Please complete it to continue."`
- Adicionar em `messages/pt-BR.json`: `"phaseNotSkippable": "Esta fase nao pode ser pulada. Complete-a para continuar."`
- Tambem adicionar: `"phaseNotActive"` (mesmo padrao, tambem faltando)
- Estimativa: XS

### Prioridade 3 -- Ambiente

**FIX-6: Setar a flag nos arquivos .env** (CR-0, pre-requisito)
- Adicionar `NEXT_PUBLIC_PHASE_REORDER_ENABLED="true"` em `.env.local` (desenvolvimento)
- Configurar no Vercel e FORCAR NOVO BUILD (por causa do inlining de NEXT_PUBLIC_*)
- Documentar no README/CLAUDE.md que a flag requer rebuild
- Estimativa: XS

### Ordem de Execucao
```
FIX-6 (setar flag) -- pre-requisito para testar os demais
  |
  +--> FIX-1 (roteamento dinamico) -- BLOQUEIA toda a feature
  |      |
  |      +--> FIX-2 (PHASE_DEFINITIONS -> getPhaseDefinitions)
  |      +--> FIX-3 (arrays literais)
  |
  +--> FIX-4 (dropdown clipping) -- independente
  +--> FIX-5 (traducoes) -- independente
```
