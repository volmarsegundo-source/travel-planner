# Sprint 45 Wave 3 — Design Token Migration Map

**Date:** 2026-04-21
**Owner:** dev-fullstack-1 (impersonated)
**Scope:** migrate 135 `atlas-design/no-raw-tailwind-colors` warnings to Atlas v2 tokens
**Stopping check:** **0 new tokens needed** — existing v2 set covers all cases. Proceed to Passo 3.

---

## Sumário executivo

1. **135 warnings** across **31 files**, 81 unique raw color/font combinations.
2. **0 tokens novos** precisam ser criados — todos mapeiam para tokens Atlas v2 existentes (`atlas-error*`, `atlas-warning*`, `atlas-success*`, `atlas-info*`, `atlas-surface-*`, `atlas-on-surface*`, `atlas-outline*`, `atlas-secondary*`).
3. **Dark mode pattern existente:** `bg-atlas-surface dark:bg-atlas-primary-container` (ver `PhaseShellV2.tsx:149`, `AuthenticatedNavbarV2.tsx:65`, `AtlasCard.tsx:9`, `AtlasInput.tsx:121`).
4. **Semantic tokens (error/warning/success/info)** não precisam de `dark:` — cor é estável em ambos os temas por design.
5. **Estratégia de migração:** 6 batches por domínio. Para cada batch: replace line-exact → type-check → test → lint → commit.
6. **Visual regression:** Playwright visual suite existe (`tests/visual/baseline.playwright.ts`) mas requer server rodando (local ou staging). Validação visual será feita por análise de mapeamento semântico + spot-check manual no dev server após batches.

---

## 1. Distribuição de warnings por arquivo

| # | Arquivo | Warnings |
|---|---|---:|
| 1 | `src/app/[locale]/(app)/admin/dashboard/AdminDashboardClient.tsx` | 18 |
| 2 | `src/components/features/premium/UpsellModal.tsx` | 11 |
| 3 | `src/components/features/expedition/Phase6ItineraryV2.tsx` | ~10 |
| 4 | `src/app/[locale]/(app)/loja/LojaClient.tsx` | 7 |
| 5 | `src/app/[locale]/(app)/loja/checkout-mock/page.tsx` | 6 |
| 6 | `src/app/[locale]/(app)/meu-atlas/comprar-pa/PurchasePageClient.tsx` | 6 |
| 7 | `src/components/features/auth/ResetPasswordForm.tsx` | ~5 |
| 8 | `src/components/features/auth/ForgotPasswordForm.tsx` | ~5 |
| 9 | Outros (23 arquivos) | ~67 |

Total: **135 warnings** / 31 arquivos.

---

## 2. Tabela de mapeamento raw → atlas v2

### 2.1 Erros / destructive (red-*)

| Raw | Atlas v2 token | Notas |
|---|---|---|
| `text-red-500`, `text-red-600`, `text-red-700`, `text-red-800`, `text-red-900` | `text-atlas-error` | Destaca erro crítico em texto |
| `text-red-800/90`, `dark:text-red-200`, `dark:text-red-200/80` | `text-atlas-on-error-container` | Texto sobre fundo container |
| `bg-red-50` | `bg-atlas-error-container` | Fundo suave para alertas |
| `dark:bg-red-950`, `dark:bg-red-950/30` | `dark:bg-atlas-error-container/20` | Dark preserva intensidade baixa |
| `bg-red-600` | `bg-atlas-error` | CTA destructive |
| `hover:bg-red-700` | `hover:bg-atlas-error/90` | Hover destructive |
| `border-red-200`, `border-red-300` | `border-atlas-error-container` | Bordas de alerta |
| `dark:border-red-700`, `dark:border-red-900/40` | `dark:border-atlas-error/40` | |
| `focus-visible:ring-red-300` | `focus-visible:ring-atlas-error/30` | |

### 2.2 Warning / attention (amber-*, yellow-*, orange-*)

| Raw | Atlas v2 token | Notas |
|---|---|---|
| `text-amber-500`, `text-amber-600`, `text-amber-700`, `text-amber-800`, `text-amber-800/90`, `text-amber-900`, `text-yellow-800` | `text-atlas-warning` | |
| `text-orange-700`, `dark:text-amber-200`, `dark:text-amber-300`, `dark:text-amber-400`, `dark:text-amber-200/80`, `dark:text-yellow-200`, `dark:text-orange-300` | `dark:text-atlas-warning` ou `text-atlas-secondary-fixed-dim` | Warning é theme-stable |
| `bg-amber-50`, `bg-yellow-50` | `bg-atlas-warning-container` | |
| `dark:bg-amber-950/30`, `dark:bg-amber-950/20`, `dark:bg-yellow-950`, `dark:bg-orange-950/20` | `dark:bg-atlas-warning-container/10` | |
| `bg-orange-500` | `bg-atlas-secondary-container` | Orange #fe932c = secondary-container |
| `border-amber-200`, `border-amber-300`, `border-yellow-300`, `border-orange-200` | `border-atlas-warning` | |
| `dark:border-amber-700`, `dark:border-amber-800/40`, `dark:border-amber-900/40`, `dark:border-yellow-700`, `dark:border-orange-800/40` | `dark:border-atlas-warning/40` | |

### 2.3 Success (green-*, emerald-*)

| Raw | Atlas v2 token | Notas |
|---|---|---|
| `text-green-500`, `text-green-600`, `text-emerald-600` | `text-atlas-success` | |
| `bg-green-500`, `bg-emerald-600` | `bg-atlas-success` | |
| `bg-emerald-500/10` | `bg-atlas-success-container` | |

### 2.4 Info (blue-*)

| Raw | Atlas v2 token | Notas |
|---|---|---|
| `text-blue-500`, `text-blue-700` | `text-atlas-info` | |
| `dark:text-blue-300` | `dark:text-atlas-info` | |
| `bg-blue-50` | `bg-atlas-info-container` | |
| `bg-blue-500`, `bg-blue-600`, `hover:bg-blue-700` | `bg-atlas-info`, `hover:bg-atlas-info/90` | |
| `dark:bg-blue-950/30` | `dark:bg-atlas-info-container/20` | |
| `border-blue-200`, `dark:border-blue-800` | `border-atlas-info-container`, `dark:border-atlas-info/40` | |

### 2.5 Neutros (zinc-*, slate-*, gray-*)

| Raw | Atlas v2 token | Notas |
|---|---|---|
| `text-gray-400`, `text-gray-500`, `text-slate-400`, `text-zinc-500` | `text-atlas-on-surface-variant` | Texto secundário |
| `text-gray-600`, `text-gray-900`, `text-zinc-700`, `text-zinc-800` | `text-atlas-on-surface` | Texto primário |
| `dark:text-zinc-200`, `dark:text-zinc-300` | `dark:text-atlas-on-primary` | |
| `hover:text-slate-200` | `hover:text-atlas-inverse-on-surface` | |
| `bg-slate-700`, `bg-gray-900` | `bg-atlas-inverse-surface` | Tooltip/dark surface |
| `dark:bg-zinc-900` | `dark:bg-atlas-primary-container` | |
| `hover:bg-zinc-50`, `hover:bg-zinc-100` | `hover:bg-atlas-surface-container-low`, `hover:bg-atlas-surface-container` | |
| `dark:hover:bg-zinc-800` | `dark:hover:bg-atlas-primary-container/70` | |
| `border-zinc-300` | `border-atlas-outline-variant` | |
| `dark:border-zinc-600` | `dark:border-atlas-outline/40` | |

### 2.6 font-mono (tipografia)

| Raw | Atlas v2 token | Notas |
|---|---|---|
| `font-mono` | `font-atlas-body` | Para IDs, debug, admin (code-like sem ser literal) |
| `font-mono` (em `<pre>` / code real) | Manter `font-mono` + `eslint-disable-next-line` local | Só se for código literal exibido |

**Exceção ESLint:** `PromptViewer.tsx:77` tem `<pre className="... font-mono ...">` que é código literal — manter `font-mono` com `eslint-disable-line atlas-design/no-raw-tailwind-colors` + comentário "code block display". Verificar caso a caso.

---

## 3. Batches de execução

| Batch | Domínio | Arquivos | Warnings estimados |
|---|---|---:|---:|
| **A** | Admin (dashboard, evals, feedback) | 3 | ~21 |
| **B** | Loja + Purchase (checkout, comprar-pa) | 4 | ~19 |
| **C** | Auth (forgot, reset, verify-email, PasswordStrengthChecklist) | 4 | ~15 |
| **D** | Expedition (Phase6ItineraryV2, DestinationGuide, ExpeditionSummary, AiDisclaimer, TripReport) | 6 | ~30 |
| **E** | Dashboard (AtlasHeroMap, PhaseProgressBar, AiServicePausedBanner) | 3 | ~10 |
| **F** | Shared UI (UpsellModal, Tooltip, Footer, LanguageSwitcher, FeedbackWidget, PromptViewer, AtlasMapSkeleton, PAConfirmationModal, DestinationsSectionV2.test) | 11 | ~40 |

**Total: 6 batches / ~31 arquivos / 135 warnings.**

---

## 4. Protocolo por batch

Para cada batch:
1. Substituir mapeamentos da tabela 2 line-exact nos arquivos do batch
2. `npm run type-check` → deve permanecer limpo
3. `npm run lint` → warnings `atlas-design/no-raw-tailwind-colors` devem diminuir pelo exato número esperado
4. `npm test -- <files-afetados>` rodar testes relevantes
5. Inspeção visual manual no dev server (spot-check dos componentes do batch)
6. Commit: `refactor(design-tokens)(SPEC-SPRINT-45-WAVE-3): migrate raw Tailwind colors to Atlas tokens in <Batch>`

---

## 5. Riscos identificados

| Risco | Mitigação |
|---|---|
| Dark mode regression (atlas-v2 tokens não redefinem em `.dark {}`) | Seguir padrão `bg-atlas-surface dark:bg-atlas-primary-container` já em uso (PhaseShellV2, AtlasCard, AtlasInput) — tokens semânticos (error/warning/success/info) são theme-stable por design |
| Visual diff em testes de snapshot | Rodar visual regression em staging ANTES do merge, ou escalar para UX designer se diff perceptível |
| Warnings não-alvo (3 img + 1 exhaustive-deps + 2 a11y) | Fora do escopo Wave 3 — documentados como tech-debt separado |
| Suite de testes quebrar por className check em DestinationsSectionV2.test | Atualizar teste em sincronia com o componente |

---

**Fim do mapeamento. Prosseguir para Passo 3 (migração por batches).** Nenhum token novo proposto → Passo 2 (aprovação PO) desnecessário.
