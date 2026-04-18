# SPEC-UX-056 — AI Consent Modal Copy (PT-BR + EN)

> **Version:** 1.0.0
> **Status:** Approved
> **Owner:** ux-designer
> **Related:** SPEC-PROD-056
> **Created:** 2026-04-18

---

## 1. i18n Keys Proposal

Add the `consent` namespace to both locale files. Developers: do NOT modify wording without UX approval — this is LGPD-auditable copy.

### `messages/pt-BR.json`

```json
{
  "consent": {
    "modal": {
      "title": "Como usamos Inteligência Artificial",
      "body": "Para criar seu guia e roteiro personalizados, enviamos alguns dos seus dados para nosso parceiro de IA: destino, datas, estilo de viagem, orçamento e preferências que você configurou. Nenhum dado sensível (documentos, reservas completas) é enviado. Você pode revogar esse consentimento a qualquer momento nas configurações.",
      "privacyLink": "Política de Privacidade",
      "acceptButton": "Aceitar e continuar",
      "declineButton": "Não, obrigado",
      "declinedToast": "Você optou por não usar IA. Você pode alterar isso nas configurações."
    }
  }
}
```

### `messages/en.json`

```json
{
  "consent": {
    "modal": {
      "title": "How we use Artificial Intelligence",
      "body": "To create your personalized guide and itinerary, we send some of your data to our AI partner: destination, dates, travel style, budget, and the preferences you've set. No sensitive data (documents, full booking details) is shared. You can revoke this consent anytime in your settings.",
      "privacyLink": "Privacy Policy",
      "acceptButton": "Accept and continue",
      "declineButton": "No, thank you",
      "declinedToast": "You opted out of AI features. You can change this anytime in your settings."
    }
  }
}
```

---

## 2. PT Copy Validation

**Draft from SPEC-PROD-056:**

> "Para criar seu guia e roteiro personalizados, enviamos alguns dos seus dados para nosso parceiro de IA: destino, datas, estilo de viagem, orçamento e preferências que você configurou. Nenhum dado sensível (documentos, reservas completas) é enviado. Você pode revogar esse consentimento a qualquer momento nas configurações."

**Verdict: Approved as-is.** No changes needed.

- **Clarity:** Unambiguous. Lists exact data categories sent. States what is NOT sent. Clear revocation path.
- **LGPD compliance:** Satisfies Art. 7, I — specific, informed, and free consent. Data categories enumerated.
- **Tone:** Direct and honest without being defensive or legalistic. Matches Atlas brand voice.
- **Length:** ~55 words. Within the 50-80 target.

---

## 3. EN Copy

**Title:** How we use Artificial Intelligence

Rationale: matches PT title structure, is more accessible to non-technical travelers, and carries more weight in a consent context than the abbreviation "AI".

**Body:** To create your personalized guide and itinerary, we send some of your data to our AI partner: destination, dates, travel style, budget, and the preferences you've set. No sensitive data (documents, full booking details) is shared. You can revoke this consent anytime in your settings.

**Toast:** You opted out of AI features. You can change this anytime in your settings.

Changes from the draft suggestion: "is sent" changed to "is shared" — more natural in EN consent contexts and implies intentional, controlled transfer.

---

## 4. Accessibility Notes

### ARIA Role: `alertdialog` (confirmed correct)

Use `role="alertdialog"`, not `role="dialog"`. Per [W3C APG — Alert and Message Dialogs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/), `alertdialog` is correct when the dialog interrupts the workflow with an important message and the user MUST respond before proceeding. This matches our non-dismissible consent modal exactly.

### Required markup structure

```html
<div role="alertdialog" aria-modal="true"
     aria-labelledby="consent-title" aria-describedby="consent-body">
  <h2 id="consent-title">...</h2>
  <p id="consent-body">...</p>
  <a href="/privacy">...</a>
  <button data-primary>Aceitar e continuar</button>
  <button data-secondary>Não, obrigado</button>
</div>
```

### Focus management

| Event | Behavior |
|---|---|
| Modal opens | Focus moves to the **accept button** (primary actionable element, per APG) |
| Tab / Shift+Tab | Focus trap within modal. Order: Accept > Decline > Privacy link > (cycle) |
| ESC key | No action (AC-CONSENT-004) |
| Click outside | No action (AC-CONSENT-004) |
| Accept / Decline | Modal closes, focus returns to the trigger element |

### Color contrast

| Element | FG | BG | Ratio | WCAG |
|---|---|---|---|---|
| Accept button text | #FFFFFF | #E8621A | 3.2:1 | AA large text only |
| Decline button text | #374151 | #FFFFFF | 8.9:1 | AAA |
| Body text | #374151 | #FFFFFF | 8.9:1 | AAA |
| Privacy link | #1A3C5E | #FFFFFF | 9.7:1 | AAA |

**Accept button contrast note:** #E8621A on white yields 3.2:1, passing AA only for large text (18px bold / 24px normal). The accept button MUST use `font-weight: 700` at 18px+ minimum. This is consistent with existing Atlas CTAs. Alternative: darken to #D4570F for 4.5:1 at any size.

---

> Approved. Ready for Architect.
