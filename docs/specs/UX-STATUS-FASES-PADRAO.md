# UX-STATUS-FASES-PADRAO — Padrão Visual Universal de Status de Fases

> Versão: 1.0.0 | Status: APROVADO | Data: 2026-03-30 | Autor: UX Designer

---

## 1. Problema

Atualmente existem **3 vocabulários de status diferentes** no codebase:

| Engine | Estados | Onde é usado |
|--------|---------|-------------|
| `phase-navigation.engine.ts` | `completed`, `current`, `available`, `locked` | PhaseShellV2, AtlasPhaseProgress |
| `phase-completion.engine.ts` | `completed`, `in_progress`, `pending` | Phase completion service |
| `trip-readiness.service.ts` | `complete`, `partial`, `not_started` | ExpeditionSummaryV2, DashboardV2 |

Cada componente mapeia esses estados de forma diferente, com cores inline e lógica duplicada em pelo menos 3 arquivos. Este documento define **UM único vocabulário canônico** com **UMA única função centralizada**.

---

## 2. Os 5 Estados Canônicos

### A) CONCLUÍDA (`completed`)
Todos os campos obrigatórios preenchidos, sem pendências.

| Elemento | Visual | Classe Tailwind |
|----------|--------|-----------------|
| Círculo (barra lateral) | Verde preenchido + ✓ | `bg-atlas-success text-white` |
| Círculo (barra horizontal) | Verde preenchido + ✓ | `bg-atlas-success text-white` |
| Badge | "Concluída" em verde | `AtlasBadge color="success"` |
| Borda do card (sumário) | Verde à esquerda, 4px | `border-l-4 border-l-atlas-success` |
| Pin do mapa | Verde | `#10b981` (--atlas-v2-success) |
| Conector | Linha verde sólida | `bg-atlas-success` |
| Label | Texto verde | `text-atlas-success` |
| CTA | "Editar" | — |

### B) EM ANDAMENTO (`in_progress`)
Fase atual do usuário, dados parciais em progresso normal.

| Elemento | Visual | Classe Tailwind |
|----------|--------|-----------------|
| Círculo (barra lateral) | Laranja preenchido + número | `bg-atlas-primary text-white` |
| Círculo (barra horizontal) | Laranja preenchido + número com pulse | `bg-atlas-primary text-white animate-pulse` |
| Badge | "Em andamento" em laranja | `AtlasBadge color="warning"` |
| Borda do card (sumário) | Laranja à esquerda, 4px | `border-l-4 border-l-atlas-secondary-container` |
| Pin do mapa | Laranja | `#f59e0b` (--atlas-v2-warning) |
| Conector | Linha laranja tracejada | `bg-atlas-primary border-dashed` |
| Label | Texto laranja | `text-atlas-primary` |
| CTA | "Continuar" | — |

### C) PENDENTE (`pending`)
Fase visitada/avançada mas com itens incompletos (ex: "Ainda não decidi", checklist parcial).

| Elemento | Visual | Classe Tailwind |
|----------|--------|-----------------|
| Círculo (barra lateral) | Amber preenchido + número | `bg-amber-500 text-white` |
| Círculo (barra horizontal) | Amber preenchido + número | `bg-amber-500 text-white` |
| Badge | "Pendente" em amber | `AtlasBadge color="warning"` (com texto "Pendente") |
| Borda do card (sumário) | Amber à esquerda, 4px | `border-l-4 border-l-amber-500` |
| Pin do mapa | Amber | `#f59e0b` |
| Alerta | Bloco amber com lista de pendências | `bg-amber-50 border-amber-200 text-amber-800` |
| Label | Texto amber | `text-amber-600` |
| CTA | "Completar" | — |

> **Distinção importante**: `pending` ≠ `in_progress`. O `pending` indica que o viajante **avançou** mas tem ressalvas conscientes (marcou "Ainda não decidi" ou não completou checklist). O `in_progress` indica que o viajante **está trabalhando** na fase agora.

### D) NÃO INICIADA (`not_started`)
Fase futura que o viajante ainda não visitou.

| Elemento | Visual | Classe Tailwind |
|----------|--------|-----------------|
| Círculo (barra lateral) | Cinza outline + número | `border-2 border-gray-300 text-gray-400` |
| Círculo (barra horizontal) | Cinza outline + número | `border-2 border-gray-300 text-gray-400` |
| Badge | Não aparece no sumário, ou "Não iniciada" | `AtlasBadge color="info"` |
| Borda do card (sumário) | Sem borda lateral | `` (nenhuma classe extra) |
| Pin do mapa | Não aparece | — |
| Card opacity | Reduzida | `opacity-60` |
| CTA | "Iniciar" | — |

### E) BLOQUEADA (`locked`)
Fases 7-8, sempre bloqueadas na versão atual.

| Elemento | Visual | Classe Tailwind |
|----------|--------|-----------------|
| Círculo (barra lateral) | Cinza + 🔒 | `bg-gray-200 text-gray-400` |
| Círculo (barra horizontal) | Cinza + 🔒 | `bg-gray-200 text-gray-400` |
| Badge | "Em Breve" | `AtlasBadge color="info"` |
| Borda do card (sumário) | Não aparece | — |
| Pin do mapa | Não aparece | — |
| Label | "Em Breve" cinza | `text-gray-400` |

---

## 3. Matriz Fase × Estado

| Fase | completed | in_progress | pending | not_started | locked |
|------|-----------|-------------|---------|-------------|--------|
| 1 — O Chamado | ✅ | ✅ | ❌ | ✅ | ❌ |
| 2 — O Explorador | ✅ | ✅ | ❌ | ✅ | ❌ |
| 3 — O Preparo | ✅ | ✅ | ✅ (checklist incompleto) | ✅ | ❌ |
| 4 — A Logística | ✅ | ✅ | ✅ ("Ainda não decidi") | ✅ | ❌ |
| 5 — Guia do Destino | ✅ | ✅ | ❌ | ✅ | ❌ |
| 6 — O Roteiro | ✅ | ✅ | ❌ | ✅ | ❌ |
| 7 — (Futuro) | ❌ | ❌ | ❌ | ❌ | ✅ |
| 8 — (Futuro) | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Tokens de Design (existentes no Atlas DS v2)

Cores já definidas em `src/app/globals.css`:

```css
--atlas-v2-success:           #10b981;  /* Verde — CONCLUÍDA */
--atlas-v2-success-container: #ecfdf5;  /* Verde claro — bg alerta */
--atlas-v2-warning:           #f59e0b;  /* Amber — PENDENTE */
--atlas-v2-warning-container: #fffbeb;  /* Amber claro — bg alerta */
--atlas-v2-error:             #ba1a1a;  /* Vermelho — erro crítico */
--atlas-v2-error-container:   #ffdad6;  /* Vermelho claro */
--atlas-v2-info:              #3b82f6;  /* Azul — informativo */
--atlas-v2-info-container:    #eff6ff;  /* Azul claro */
--atlas-v2-outline:           #75777d;  /* Cinza — NÃO INICIADA */
--atlas-v2-outline-variant:   #c5c6cc;  /* Cinza claro */
```

Cores do EM ANDAMENTO (primary/secondary já existentes):
```css
--atlas-v2-primary:              /* Laranja principal */
--atlas-v2-secondary-container:  /* Laranja container */
```

**Nenhum token novo necessário.** Todos os 5 estados usam tokens existentes.

---

## 5. Interface TypeScript — Função Centralizada

```typescript
// src/lib/utils/phase-status.ts

export type PhaseStatus = 'completed' | 'in_progress' | 'pending' | 'not_started' | 'locked';

export interface PhaseStatusVisual {
  // Círculo na barra de progresso
  circleBg: string;           // ex: 'bg-atlas-success'
  circleText: string;         // ex: 'text-white'
  circleBorder: string;       // ex: '' ou 'border-2 border-gray-300'

  // Badge
  badgeColor: 'success' | 'warning' | 'info' | 'error';
  badgeTextKey: string;       // chave i18n: 'phaseCompleted', 'phasePending', etc.

  // Card do sumário
  borderClass: string;        // ex: 'border-l-4 border-l-atlas-success'
  cardOpacity: string;        // ex: '' ou 'opacity-60'

  // Mapa
  pinColor: string;           // hex: '#10b981'
  showPin: boolean;           // false para not_started e locked

  // Ícone do círculo
  icon: 'check' | 'number' | 'lock' | 'outline';

  // CTA
  ctaTextKey: string;         // chave i18n: 'phaseEdit', 'phaseContinue', etc.

  // Alerta de pendências (só para pending)
  alertBg: string;            // ex: 'bg-amber-50'
  alertBorder: string;        // ex: 'border-amber-200'
  alertText: string;          // ex: 'text-amber-800'
  showAlert: boolean;         // true só para pending
}

/**
 * Retorna o visual completo para um status de fase.
 * ÚNICA fonte de verdade — nenhum componente deve ter mapeamento inline.
 */
export function getPhaseStatusVisual(status: PhaseStatus): PhaseStatusVisual;

/**
 * Resolve o status canônico a partir das diferentes fontes de dados.
 * Unifica os 3 vocabulários existentes em 1.
 */
export function deriveCanonicalStatus(params: {
  navigationStatus?: 'completed' | 'current' | 'available' | 'locked';
  completionStatus?: 'completed' | 'in_progress' | 'pending';
  readinessStatus?: 'complete' | 'partial' | 'not_started';
  phaseNumber: number;
  isCurrentPhase: boolean;
}): PhaseStatus;
```

---

## 6. Componentes que DEVEM Migrar

| Componente | Arquivo | Status Visual Atual | Migração |
|-----------|---------|---------------------|----------|
| ExpeditionSummaryV2 | `src/components/features/expedition/ExpeditionSummaryV2.tsx` | 5 funções inline (getPhaseStatus, getStatusBadgeColor, getStatusLabel, getCtaLabel, getBorderClass) | Substituir por `getPhaseStatusVisual()` |
| DashboardV2 | `src/components/features/dashboard/DashboardV2.tsx` | 2 funções inline (getStatusBadgeColor, getStatusLabelKey) | Substituir por `getPhaseStatusVisual()` |
| AtlasPhaseProgress | `src/components/features/expedition/AtlasPhaseProgress.tsx` | Mapeamento inline | Substituir por `getPhaseStatusVisual()` |
| PhaseShellV2 | `src/components/features/expedition/PhaseShellV2.tsx` | Recebe `completedPhases: number[]` — precisa receber dados de completion | Passar PhaseStatus por fase |
| ExpeditionSummary (v1) | `src/components/features/expedition/ExpeditionSummary.tsx` | Legacy, PhaseStatus type próprio | Deprecar ou migrar |

---

## 7. Regra de Consistência Visual

### Regra de Ouro
> Se o verde é `#10b981` para "Concluída", esse MESMO verde aparece no círculo da barra, no badge do card, no pin do mapa, e no card do Dashboard. ZERO inconsistência.

### Validação
- Nenhum componente pode ter `bg-green-*`, `bg-emerald-*`, `text-green-*` para representar status — deve usar `bg-atlas-success`, `text-atlas-success`
- Nenhum componente pode ter `bg-amber-*`, `bg-yellow-*` para status sem usar `getPhaseStatusVisual()`
- Grep de validação: `grep -r "bg-green\|bg-emerald\|text-green" src/components/` deve retornar ZERO hits para lógica de status

---

## 8. Acessibilidade (WCAG 2.1 AA)

| Combinação | Ratio | Status |
|-----------|-------|--------|
| `#10b981` (success) sobre branco | 3.0:1 | ⚠️ OK para ícones grandes, insuficiente para texto pequeno |
| `#059669` (success-dark) sobre branco | 4.6:1 | ✅ Usar para texto de label pequeno |
| `#f59e0b` (warning) sobre branco | 2.4:1 | ⚠️ Só para ícones; usar `#d97706` para texto |
| `#f59e0b` sobre `#fffbeb` (warning-container) | 3.1:1 | ⚠️ OK para ícones |
| `#92400e` (amber-800) sobre `#fffbeb` | 8.5:1 | ✅ Usar para texto de alerta |
| `#75777d` (outline) sobre branco | 4.6:1 | ✅ OK |

**Decisão**: Para badges com texto pequeno de status completed, usar `text-emerald-700` (≥4.5:1) ao invés de `text-atlas-success`.

---

## 9. Alerta de Pendências (Estado C)

Para fases com status `pending`, exibir alerta inline no card do sumário:

```
┌─────────────────────────────────────────────┐
│ ⚠️ Decisões pendentes                       │
│                                              │
│ • Transporte: ainda não decidido             │
│ • Hospedagem: ainda não decidido             │
│                                              │
│ [Completar →]                                │
└─────────────────────────────────────────────┘
```

Classes: `bg-amber-50 border border-amber-200 rounded-lg p-3`
Texto: `text-amber-800 text-sm`
Ícone: `⚠️` ou `AlertTriangle` do Lucide
CTA: Link para a fase, estilo `text-amber-700 font-medium underline`

---

## 10. Questão para o Architect

O `PhaseShellV2` atualmente recebe apenas `completedPhases: number[]`. Para distinguir `pending` de `not_started`, é necessário passar dados de completion por fase. Opções:

1. **Prop adicional**: `phaseStatuses: Record<number, PhaseStatus>` — simples, mínimo impacto
2. **Server component fetch**: PhaseShellV2 busca dados diretamente — mais autonomia, mais complexidade
3. **React Context**: `PhaseStatusContext` compartilhado — ideal se múltiplos componentes na mesma página precisam

**Recomendação UX**: Opção 1 (prop adicional) por ser a mais simples e manter o contrato explícito.

---

## Histórico de Mudanças

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0.0 | 2026-03-30 | Criação — 5 estados canônicos, tokens, interface TS, matriz fase×estado |
