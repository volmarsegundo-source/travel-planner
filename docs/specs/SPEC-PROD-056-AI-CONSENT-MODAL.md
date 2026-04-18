# SPEC-PROD-056 — AI Consent Modal (Pré-Primeira Geração)

> **Version:** 1.0.0
> **Status:** Approved
> **Owner:** product-owner
> **Sprint:** 41 (Beta gate)
> **Created:** 2026-04-17
> **Last updated:** 2026-04-17

---

## Metadata

| Field | Value |
|-------|-------|
| Spec ID | SPEC-PROD-056 |
| Title | AI Consent Modal — Consentimento explícito antes da primeira geração de IA |
| MoSCoW Priority | Must Have — Beta gate |
| Business Value | Conformidade LGPD (base legal Art. 7º, I + Art. 11, I); bloqueador para Beta |
| Effort Estimate | S (~2-4h implementação + testes) |
| Personas | @leisure-solo, @leisure-family, @business-traveler |
| Relates to | SPEC-PROD-055 (Manual AI Generation), SPEC-GUIA-PERSONALIZACAO, SPEC-ROTEIRO-REGEN-INTELIGENTE |
| LGPD Base Legal | Art. 7º, I (consentimento específico, livre, informado) + Art. 11, I (dados sensíveis de preferência) |

---

## User Story

As a viajante do Atlas,
I want to be clearly informed before the first time AI generates content (guide, itinerary),
understanding which data is processed and giving explicit consent,
so that I have control over the use of my personal data.

---

## Traveler Context

- **Pain point:** Usuários não sabem quais dados são enviados ao parceiro de IA durante a geração; risco de percepção de violação de privacidade e não-conformidade com LGPD.
- **Current workaround:** Não há — dados são enviados à IA sem consentimento explícito registrado. Isso é um bloqueador para Beta.
- **Frequency:** Uma vez por conta (evento único, gate para toda geração de IA).

---

## Solution Overview (Opção c — MVP Reduzido com Modal pré-geração)

Modal informativo exibido **uma única vez por conta**, imediatamente antes da **primeira ação de geração de IA** (Fase 5 ou Fase 6). Não altera o OnboardingWizard. O consentimento (ou recusa) é persistido em `UserProfile` e verificado em cada chamada de geração.

---

## Acceptance Criteria

### AC-CONSENT-001 — Disparo único do modal
- **Given** usuário autenticado que nunca consentiu (`UserProfile.aiConsentGiven = null` ou `false`)
- **When** usuário clica no botão de geração de IA (Fase 5 — Guia do Destino ou Fase 6 — O Roteiro)
- **Then** o modal de consentimento é exibido **antes** de qualquer chamada à API de IA
- **And** a geração não é iniciada até o usuário tomar uma decisão

### AC-CONSENT-002 — Aceitar consentimento (happy path)
- **Given** modal exibido
- **When** usuário clica em "Aceitar e continuar"
- **Then** `UserProfile.aiConsentGiven = true`, `aiConsentAt = now()`, `aiConsentVersion = "v1"` são persistidos
- **And** a geração de IA prossegue imediatamente
- **And** o modal não é exibido novamente para este usuário em nenhuma sessão futura

### AC-CONSENT-003 — Recusar consentimento (unhappy path)
- **Given** modal exibido
- **When** usuário clica em "Não, obrigado"
- **Then** `UserProfile.aiConsentGiven = false`, `aiConsentAt = now()`, `aiConsentVersion = "v1"` são persistidos
- **And** o usuário é redirecionado para o Dashboard (`/expeditions`) sem geração de IA
- **And** uma mensagem informativa é exibida: "Você optou por não usar IA. Você pode alterar isso nas configurações."

### AC-CONSENT-004 — Sem X de dismiss
- **Given** modal exibido
- **When** usuário pressiona Esc ou clica fora do modal
- **Then** o modal NÃO é fechado (não há dismiss implícito)
- **And** o usuário deve escolher entre os dois botões explícitos

### AC-CONSENT-005 — Conteúdo do modal
- **Given** modal renderizado em pt-BR
- **Then** título: "Como usamos Inteligência Artificial"
- **And** corpo: "Para criar seu guia e roteiro personalizados, enviamos alguns dos seus dados para nosso parceiro de IA: destino, datas, estilo de viagem, orçamento e preferências que você configurou. Nenhum dado sensível (documentos, reservas completas) é enviado. Você pode revogar esse consentimento a qualquer momento nas configurações."
- **And** link âncora "Política de Privacidade" apontando para `/privacy` (abre na mesma aba)
- **And** botão primário: "Aceitar e continuar"
- **And** botão secundário: "Não, obrigado"
- **And** versão en-US: textos equivalentes via i18n (chaves `consent.modal.*`)

### AC-CONSENT-006 — Cobertura E2E
- **Given** ambiente de teste E2E
- **Then** deve existir um teste cobrindo o **happy path**: novo usuário → chega na Fase 5 → modal aparece → aceita → geração inicia
- **And** deve existir um teste cobrindo o **unhappy path**: novo usuário → chega na Fase 5 → modal aparece → recusa → redirecionado para dashboard → sem chamada à API de IA

### AC-CONSENT-007 — Persistência auditável do consentimento
- **Given** decisão tomada (aceitar ou recusar)
- **Then** os seguintes campos devem ser persistidos em `UserProfile`:
  - `aiConsentGiven: Boolean` (default: não definido / `null` para usuários novos — distinção entre "não perguntou ainda" e "recusou")
  - `aiConsentAt: DateTime?` (timestamp do momento da decisão, UTC)
  - `aiConsentVersion: String?` (ex: `"v1"` — permite re-solicitar consentimento ao atualizar os textos)
- **And** a verificação de consentimento deve ocorrer no **server action** de geração (não apenas no cliente), prevenindo bypass via DevTools

---

## Content — Modal (Draft PT)

> Texto draft aprovado pelo PO. Refinamento de copy final e versão EN delegado ao ux-designer.

**Titulo:** Como usamos Inteligência Artificial

**Corpo:**
Para criar seu guia e roteiro personalizados, enviamos alguns dos seus dados para nosso parceiro de IA: destino, datas, estilo de viagem, orçamento e preferências que você configurou. Nenhum dado sensível (documentos, reservas completas) é enviado. Você pode revogar esse consentimento a qualquer momento nas configurações.

**Link:** [Política de Privacidade] → `/privacy`

**Botão primário:** Aceitar e continuar

**Botão secundário:** Não, obrigado

**Comportamento de dismiss:** Nenhum (sem X, sem fechar ao clicar fora, sem Esc)

---

## Out of Scope (v1)

- Não alterar `OnboardingWizard.tsx` (wizard continua com 3 passos existentes — step de AI consent no onboarding é um redesign futuro)
- O modal aparece **apenas** no momento de geração de IA pela primeira vez — não em outras telas
- Fluxo de revogação de consentimento nas configurações (tela de Settings) é escopo futuro; apenas a mensagem informativa pós-recusa é v1
- Re-solicitação de consentimento por mudança de versão (`aiConsentVersion != currentVersion`) é escopo futuro
- Não cobre geração de checklist de documentos (Fase 3) nesta versão — apenas Fase 5 e Fase 6

---

## Success Metrics

- 100% das gerações de IA em Beta têm registro de consentimento em `UserProfile` (conformidade LGPD auditável)
- Taxa de aceitação >= 75% (benchmark: modais de consentimento contextuais bem projetados atingem 70-85%)
- Zero chamadas à API de IA sem `aiConsentGiven = true` (validado pelo server action)
- Cobertura E2E >= 2 cenários (happy + unhappy path) passando antes do merge

---

## Open Questions

| ID | Questão | Para | Prazo |
|----|---------|------|-------|
| OQ-056-01 | Deve haver migration de dados para usuários **existentes** que já geraram IA antes desta spec? Sugestão: `aiConsentGiven = true`, `aiConsentVersion = "v0-legacy"`, `aiConsentAt = null` — ou mostrar o modal retroativamente? | architect | Sprint 41 kickoff |
| OQ-056-02 | O texto do modal deve ser auditado pelo security-specialist para compliance LGPD antes do merge? | security-specialist | Sprint 41 kickoff |

---

## Dependencies

| Spec | Tipo | Motivo |
|------|------|--------|
| SPEC-PROD-055 | Upstream | Manual AI Generation define o botão de disparo; o modal intercepta esse clique |
| SPEC-ARCH-* (a criar) | Downstream | Architect deve definir os campos no schema Prisma (`UserProfile`) e o contrato do server action de verificação |

---

## Changelog

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-04-17 | product-owner | Initial spec — Approved. Opção (c) MVP modal pré-geração, 7 ACs, base legal LGPD Art. 7º I + Art. 11 I. |
