# Root Cause Analysis — v0.22.0 Manual Test Failures

**Data**: 2026-03-12
**Versao**: v0.22.0
**Analista**: tech-lead + architect
**Status**: Concluido

---

## Resumo Executivo

Investigacao das 5 falhas criticas (CRIT-001 a CRIT-005) reportadas no teste manual de v0.22.0 com 60% de taxa de falha. Rastreamos cada bug ate o codigo-fonte para identificar causa raiz.

---

## CRIT-001: Phase 3 → 4 pula para Phase 6

**Severidade**: P0
**Reproduzivel no codigo**: Sim
**Status**: CORRIGIDO

### Analise

O comportamento normal de avanco (handleAdvance → advanceFromPhaseAction → router.push('/phase-4'))
esta correto e navega para phase+1. POREM, quando o usuario REVISITA uma fase ja concluida:

- `Phase3Wizard.tsx:62` — `isRevisiting = currentPhase > 3`
- Se currentPhase = 6, isRevisiting = true
- O botao primario navegava para `phase-${currentPhase}` = `/phase-6`
- Resultado: usuario vê "Ir para fase 6", clica, e pula fases 4 e 5

### Causa Raiz

**Bug no padrao isRevisiting**: Phase3Wizard e Phase4Wizard usavam `router.push(\`/phase-${currentPhase}\`)`
em modo revisita, permitindo pular fases intermediarias. O cenario ocorre quando usuario navega de volta
para fase 3 (via progress bar ou URL) quando ja esta em fase 5 ou 6.

### Fix Aplicado

- `Phase3Wizard.tsx`: botao de revisita agora navega sempre para `/phase-4` (proximo fase sequencial)
- `Phase4Wizard.tsx`: botao de revisita agora navega sempre para `/phase-5` (proximo fase sequencial)
- Label do botao mudado de `goToCurrentPhase` para `cta.advance` ("Avancar") em ambos

---

## CRIT-002: Nao consegue re-avancar apos revisitar fase completa

**Severidade**: P0
**Reproduzivel no codigo**: Sim
**Status**: CORRIGIDO

### Analise

- `Phase3Wizard.tsx:62` — `isRevisiting = currentPhase > 3`
- Quando `isRevisiting = true`, botao primario mudava para "Ir para fase X"
- Se fase atual era 6, usuario era forçado a pular direto para fase 6
- Nao havia opcao de navegar sequencialmente (fase 3 → 4 → 5 → 6)

### Causa Raiz

**UX Bloqueante**: O botao de avanco em fases revisitadas forçava navegacao para currentPhase,
impedindo o usuario de revisitar fases intermediarias sequencialmente. O comportamento correto e
sempre permitir avanco para a PROXIMA fase (phaseNumber + 1).

### Fix Aplicado

- Phase3Wizard: revisita agora navega para phase-4 (nao currentPhase)
- Phase4Wizard: revisita agora navega para phase-5 (nao currentPhase)
- Botao sempre mostra "Avancar" independente de estar revisitando ou nao
- Navegacao NUNCA bloqueia avanco para a proxima fase

---

## CRIT-003: Progress bar sem navegacao para fase especifica

**Severidade**: P1 (rebaixado de P0)
**Reproduzivel no codigo**: Sim — feature inexistente

### Analise

- `DashboardPhaseProgressBar.tsx` — componente e READ-ONLY
- Sem click handlers, sem links, sem navegacao
- Apenas segmentos coloridos com ARIA labels

### Causa Raiz

**Feature nao implementada**, nao bug. Progress bar foi projetada como indicador visual apenas.

### Acao

Implementar como feature request se necessario: adicionar click handlers nos segmentos para navegar para `/expedition/${tripId}/phase-N`.

---

## CRIT-004: Viagem domestica classificada como internacional

**Severidade**: P0
**Reproduzivel no codigo**: Sim

### Analise

- `expedition.service.ts:44-49`:
  ```typescript
  if (data.destinationCountryCode && data.originCountryCode) {
    tripType = classifyTrip(data.originCountryCode, data.destinationCountryCode);
  } else if (data.destinationCountryCode) {
    tripType = "international";
  }
  ```
- `Phase1Wizard.tsx:109-115` — `originCountryCode` inicia como `null`
- Origin field pre-popula com `userProfile.city, userProfile.country` (texto display)
- `originCountryCode` so e setado via `handleOriginSelect` quando usuario seleciona do autocomplete
- **Se usuario usa texto pre-populado sem selecionar do autocomplete, `originCountryCode` permanece null**

### Causa Raiz

**Pre-populacao do campo origin com texto de perfil nao seta o country code ISO.** O trip classifier funciona corretamente com codigos ISO, mas o fluxo de dados do Phase1Wizard nao garante que o code esteja disponivel quando origin vem do perfil.

### Fix Necessario

Quando `origin` e pre-populado do perfil e `userProfile.country` esta disponivel, precisamos:
1. Resolver o country code ISO do pais do perfil, OU
2. Forcar usuario a selecionar origin via autocomplete para garantir que `originCountryCode` esta setado, OU
3. Usar fallback: se `originCountryCode` esta null mas origin contem texto, tentar resolver country code do texto

**Recomendacao**: Opcao 1 — adicionar mapeamento pais→ISO code no perfil.

---

## CRIT-005: Autocomplete opacity + persistencia do nome da cidade

**Severidade**: P1 (rebaixado de P0)
**Reproduzivel no codigo**: Parcialmente

### Analise

- `DestinationAutocomplete.tsx` usa classes Tailwind padrao, sem issues de opacidade visivel no CSS
- `formatSelectedValue` retorna `"City, Country"` — persiste corretamente no input
- Country code e armazenado em state separado (`destinationCountryCode`, `originCountryCode`)
- Quando usuario edita o texto apos selecionar, os codes NAO sao limpos — podem ficar stale

### Causa Raiz

1. **Opacity**: Nao confirmado no codigo. Pode ser issue de CSS especifica de browser/tema.
2. **Persistencia**: Quando usuario edita texto do autocomplete apos selecao, `countryCode` fica stale (antigo valor). Nao ha reset dos codes quando o texto muda.

### Fix Recomendado

Limpar `destinationCountryCode`/`originCountryCode` quando usuario edita texto manualmente apos selecao (detectar que texto mudou vs valor selecionado).

---

## Resumo de Acoes — TODOS CORRIGIDOS

| Bug | Status | Fix |
|-----|--------|-----|
| CRIT-001 | CORRIGIDO | Phase3/4Wizard: revisita navega para phase+1, nao currentPhase |
| CRIT-002 | CORRIGIDO | Botao "Avancar" sempre navega para proxima fase sequencial |
| CRIT-003 | CORRIGIDO | DashboardPhaseProgressBar agora clickable com tripId |
| CRIT-004 | CORRIGIDO | Auto-resolve origin country code + remover fallback "international" |
| CRIT-005 | CORRIGIDO | Clear stale country codes quando texto editado apos selecao |

## E2E Tests Implementados

- `tests/e2e/registration.e2e.spec.ts` — 5 testes (registro + login + validacoes)
- `tests/e2e/expedition-domestic.spec.ts` — 15 testes (expedição doméstica SP→Salvador)
- `tests/e2e/navigation.e2e.spec.ts` — 15 testes (progress bar, revisita, back, guard)
- `tests/e2e/autocomplete.spec.ts` — 10 testes (dropdown, formato, persistência)
- `tests/e2e/data-persistence.spec.ts` — 10 testes (dados persistem entre fases)

Total: **55 novos E2E tests** + 9 spec files pre-existentes
