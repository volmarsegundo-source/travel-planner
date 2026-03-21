# Sprint 34 — Review Document

**Tema**: Footer Standardization + Phase 4 Improvements + OAuth Fix + Phone Mask
**Versao**: v0.29.0
**Data**: 2026-03-21
**Branch**: feat/sprint-34 (merged to master)
**Tag**: v0.29.0
**Baseline**: v0.28.0 (2199 unit tests)

---

## 1. Resumo Executivo

Sprint 34 entregou o rodape padronizado com dialogos de save/discard, correcoes criticas na Fase 4 (bug de persistencia de hospedagem, toggle ida/volta, checkbox "Ainda nao decidi"), setup de OAuth (Google+Apple) com rendering condicional, e mascara de telefone brasileiro.

### Resultados

| Metrica | v0.28.0 | v0.29.0 | Delta |
|---------|---------|---------|-------|
| Testes unitarios | 2199 | 2259 | +60 |
| Falhas unitarias | 0 | 0 | 0 |
| Build | Clean | Clean | -- |

---

## 2. Entregaveis

### Track 1 — UX Foundation (dev-fullstack-1)

| Task | Descricao | Spec |
|------|-----------|------|
| WizardFooter 3-button | State machine (back/save/advance) com dialogos dirty-state | SPEC-PROD-035 |
| Accommodation save fix | `revalidatePath` apos save actions (P0 data loss) | SPEC-PROD-037 |
| Ida/Volta toggle | Radio no topo de TransportStep, esconde data de volta para ida only | SPEC-PROD-037 |
| Asteriscos obrigatorios | `RequiredAsterisk` em todos os campos obrigatorios da Fase 4 | SPEC-PROD-037 |
| "Ainda nao decidi" | Checkbox por step com fade (opacity-50) e bypass de validacao | SPEC-PROD-037 |

### Track 2 — OAuth + Phase 3 + Phone (dev-fullstack-2)

| Task | Descricao | Spec |
|------|-----------|------|
| Apple OAuth | Provider adicionado a auth.config.ts + auth.ts | SPEC-PROD-038 |
| OAuth condicional | `getAvailableOAuthProviders()` baseado em env vars | SPEC-PROD-038 |
| OAuth error page | Pagina de erro i18n com todos os codigos Auth.js | SPEC-PROD-038 |
| OAuth docs | `docs/oauth-setup.md` com setup Google + Apple | SPEC-PROD-038 |
| Phase 3 verificado | Logica ja correta (mandatory-only, sync apos toggle) | SPEC-PROD-036 |
| Phone mask | Auto-format brasileiro (XX) XXXXX-XXXX, strip +55, validacao | SPEC-PROD-038 |

---

## 3. Detalhes Tecnicos

### WizardFooter State Machine

```
Estado: dialogIntent: null | "back" | "advance"

Usuario clica "Voltar" + isDirty:
  → dialogIntent = "back"
  → Dialog: "Salvar alteracoes antes de voltar?"
  → [Salvar] → onSave() → onBack() → dialogIntent = null
  → [Descartar] → onBack() → dialogIntent = null
  → [Cancelar] → dialogIntent = null

Usuario clica "Avancar" + isDirty:
  → dialogIntent = "advance"
  → Dialog: "Voce tem alteracoes nao salvas"
  → [Salvar e Avancar] → onSave() → onPrimary() → dialogIntent = null
  → [Avancar sem Salvar] → onPrimary() → dialogIntent = null
  → [Cancelar] → dialogIntent = null
```

### P0 Fix: Accommodation Save

Causa raiz: `saveAccommodationAction` e `saveTransportAction` em `transport.actions.ts` nao chamavam `revalidatePath`. Next.js servia dados cached — usuario achava que salvar nao funcionou.

Fix: `revalidatePath(`/expedition/${tripId}`)` adicionado a todas as 3 save actions (transport, accommodation, mobility).

### OAuth Rendering Condicional

```typescript
// src/lib/auth-providers.ts (server-side)
export function getAvailableOAuthProviders(): string[] {
  const providers: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID) providers.push("google");
  if (process.env.APPLE_ID) providers.push("apple");
  return providers;
}

// Login/Register page.tsx (server component)
const availableProviders = getAvailableOAuthProviders();
<LoginForm availableProviders={availableProviders} />
```

### Phone Formatter

```typescript
formatBrazilianPhone("+5511999999999") → "(11) 99999-9999" // strips +55
formatBrazilianPhone("11999999999")    → "(11) 99999-9999"
formatBrazilianPhone("119999")         → "(11) 9999"       // partial
isValidBrazilianPhone("")              → true               // optional
isValidBrazilianPhone("11999999999")   → true               // 11 digits
isValidBrazilianPhone("1199999")       → false              // too short
```

---

## 4. Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/utils/phone.ts` | Formatador e validador de telefone brasileiro |
| `src/lib/auth-providers.ts` | Deteccao de providers OAuth disponiveis |
| `docs/oauth-setup.md` | Documentacao de setup Google + Apple OAuth |
| `tests/unit/lib/utils/phone.test.ts` | 22 testes de phone |
| `tests/unit/lib/auth-providers.test.ts` | 6 testes de providers |

---

## 5. Arquivos Modificados (31 total)

### Fonte (21 arquivos)
- WizardFooter.tsx — state machine + dialogos
- TransportStep.tsx — ida/volta toggle + asteriscos + undecided
- AccommodationStep.tsx — asteriscos + undecided
- MobilityStep.tsx — asteriscos + undecided
- Phase4Wizard.tsx — undecided state management
- Phase1Wizard.tsx — phone mask integration
- LoginForm.tsx — OAuth condicional + error banner
- RegisterForm.tsx — OAuth condicional
- auth.config.ts — Apple provider
- auth.ts — Apple provider
- env.ts — APPLE_ID, APPLE_SECRET
- error/page.tsx — OAuth error i18n
- login/page.tsx — availableProviders prop
- register/page.tsx — availableProviders prop
- transport.actions.ts — revalidatePath fix
- messages/en.json, pt-BR.json — i18n keys

### Testes (10 arquivos)
- WizardFooter.test.tsx (+10), TransportStep.test.tsx (+8), AccommodationStep.test.tsx (+6), MobilityStep.test.tsx (+6), Phase4Wizard.test.tsx (+4), LoginForm.test.tsx (+8), RegisterForm.test.tsx (+4), Phase1Wizard.test.tsx (+1 fix), phone.test.ts (22 new), auth-providers.test.ts (6 new)

---

## 6. Acoes Pendentes para Stakeholder

| Acao | Descricao |
|------|-----------|
| Google OAuth | Configurar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Vercel (ver docs/oauth-setup.md) |
| Apple OAuth | Configurar APPLE_ID e APPLE_SECRET no Vercel |
| Migration script | Executar `npx tsx scripts/fix-phase7-trips.ts` no banco Neon staging |

---

## 7. SDD Compliance

| Etapa | Status |
|-------|--------|
| 17 specs escritas e aprovadas | Done |
| 4 eval datasets criados | Done |
| Implementacao contra specs | Done |
| 2259 testes passando | Done |
| Build limpo | Done |
| Tag v0.29.0 | Done |
| Sprint review | Done |

---

*Documento gerado em 2026-03-21. Tag: v0.29.0.*
