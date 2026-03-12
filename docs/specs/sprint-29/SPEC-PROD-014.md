---
spec_id: SPEC-PROD-014
title: "Shareable Trip Summary Link"
type: product
status: Draft
version: "1.0.0"
author: product-owner
sprint: 29
priority: P2
created: "2026-03-12"
updated: "2026-03-12"
related_specs: [SPEC-PROD-011, SPEC-PROD-005]
---

# SPEC-PROD-014: Shareable Trip Summary Link

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, security-specialist, architect]
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Problem Statement

Travelers frequently share their trip plans with friends, family, or travel companions. Currently, Atlas provides no mechanism for sharing trip details outside the authenticated application. Users must resort to screenshots or verbal descriptions, which are incomplete and not interactive.

A read-only shareable link for the trip summary enables organic word-of-mouth growth during beta. When a beta user shares their trip plan with a friend, the friend sees a polished, branded summary page that naturally introduces them to Atlas. This is the lowest-effort growth mechanism available before marketing investment.

Industry context: TripIt, Wanderlog, and Google Trips all offer trip sharing via link. This is table-stakes functionality for trip planning applications.

**Evidence**: Competitor analysis (TripIt, Wanderlog). User research pattern: travelers share plans with 2-5 people per trip (family, friends, colleagues).

**Affected users**: All personas. Primarily @leisure-family (sharing with family members) and @group-organizer (sharing with travel group).

## 2. User Story

As a traveler who has planned a trip on Atlas,
I want to generate a shareable link that shows a read-only view of my trip summary to anyone I share it with,
so that my travel companions, family, or friends can see my trip plan without needing to create an Atlas account.

### Traveler Context

- **Pain point**: After spending time planning a trip across 6 phases, the traveler wants to share their plan. Currently, they cannot. Screenshotting multiple screens is tedious and loses the structured layout. Asking others to create an account to view a trip creates friction.
- **Current workaround**: Screenshots of individual screens. Copy-pasting text into messaging apps.
- **Frequency**: 1-3 times per completed trip. Sharing typically happens after completing the planning phases and again close to the departure date.

## 3. Acceptance Criteria

### Share Token Generation

- [ ] AC-001: The summary page MUST display a "Share" / "Compartilhar" button/action. This action MUST be available only to the trip owner (BOLA enforced).
- [ ] AC-002: Clicking "Share" MUST generate a unique, cryptographically random share token (UUID v4 or equivalent) and associate it with the Trip record. If a token already exists for this trip, reuse it (do not generate a new one on each click).
- [ ] AC-003: After generating/retrieving the token, the shareable URL MUST be displayed to the user and automatically copied to the clipboard. The URL format: `[app-domain]/share/[token]`. A brief confirmation ("Link copied!" / "Link copiado!") MUST be shown.

### Shared View (Public Route)

- [ ] AC-004: The URL `/share/[token]` MUST render a read-only version of the trip summary WITHOUT requiring authentication. Any person with the link can view it.
- [ ] AC-005: The shared view MUST display: (a) trip destination, (b) trip dates and countdown, (c) per-phase data summaries (what was planned in each phase), (d) readiness percentage, (e) Atlas branding (logo, "Planned with Atlas" tagline).
- [ ] AC-006: The shared view MUST NOT display: (a) edit actions, (b) booking codes (transport, accommodation), (c) passenger personal data (names, passport numbers, birthdates), (d) gamification data (points, badges, level), (e) user profile information (email, phone), (f) "Next Steps" suggestions (these are actionable only for the owner).
- [ ] AC-007: The shared view MUST include a call-to-action: "Plan your own trip on Atlas" / "Planeje sua viagem no Atlas" linking to the registration page. This is the organic growth mechanism.

### Token Management

- [ ] AC-008: The trip owner MUST be able to revoke the shared link. After revocation, the `/share/[token]` route MUST return a friendly "This link is no longer available" / "Este link nao esta mais disponivel" message. Revocation is irreversible for that token; a new token can be generated afterward.
- [ ] AC-009: Share tokens MUST NOT expire automatically in v1. Expiration policies (time-based, view-count-based) are deferred to post-beta.

### Localization

- [ ] AC-010: The shared view MUST render in the locale of the trip owner's preference at the time of sharing. The viewer does not choose the locale.

## 4. Scope

### In Scope

- Share token generation and storage (new `shareToken` field on Trip model)
- Public route `/share/[token]` rendering a read-only summary
- Clipboard copy of shareable URL
- PII filtering on shared view (no booking codes, no personal data)
- "Plan your own trip" CTA on shared view
- Token revocation by trip owner
- Localization of shared view

### Out of Scope

- Token expiration policies (future)
- View count tracking or analytics on shared links (future)
- Collaborative editing via shared link (future -- requires auth + permissions model)
- Social media share buttons (Facebook, WhatsApp, Twitter) -- the URL can be shared manually
- PDF download from shared view (deferred, SPEC-PROD-011 out-of-scope)
- QR code generation for the shareable link (future)
- Email invitation to view the shared link (requires email provider, not chosen yet)
- Open Graph / social preview metadata for link previews in messaging apps (nice-to-have, not required for v1)

## 5. Constraints (MANDATORY)

### Security

- The share token MUST be cryptographically random (UUID v4 or equivalent). Sequential or predictable tokens are NOT acceptable (prevents enumeration attacks).
- The shared view MUST NOT expose any PII: no booking codes, no passenger names, no passport numbers, no birthdates, no email addresses, no phone numbers. SPEC-PROD-005 Section 5 (booking code masking) applies in reverse: booking codes are completely omitted, not masked.
- The share token MUST NOT grant any write access. The public route is strictly read-only.
- BOLA: only the trip owner can generate, view, or revoke the share token. Other authenticated users cannot manage another user's share tokens.
- The public route MUST have rate limiting to prevent abuse (e.g., scraping all shared trips by iterating tokens).
- CSP headers on the shared page MUST be at least as strict as authenticated pages.

### Accessibility

- WCAG 2.1 AA compliance on the shared view page.
- The "Plan your own trip" CTA MUST meet minimum touch target size (44x44px on mobile).
- The shared view MUST be usable without JavaScript enabled (server-side rendered).

### Performance

- The shared view page MUST load in under 2 seconds (no AI calls, no complex aggregation -- data is pre-computed).
- The share token lookup MUST complete in under 100ms (indexed query).

### Privacy (LGPD/GDPR)

- The shared view contains only trip planning data (destination, dates, phase summaries). This is NOT personal data under LGPD unless it includes PII (names, booking codes, etc.), which is explicitly filtered out (AC-006).
- If in the future passenger names or personal data are considered for sharing, a consent mechanism MUST be added. For v1, no consent is needed because no PII is shared.

### Architectural Boundaries

- This spec does NOT define the visual design of the shared view page. That belongs to SPEC-UX.
- This spec does NOT define the database schema for the share token. That belongs to SPEC-ARCH.
- This spec does NOT define the clipboard API mechanism. Implementation chooses the appropriate browser API.

## 6. Success Metrics

- **Share adoption**: >= 15% of users who view their summary use the "Share" action at least once during beta. Measured by analytics.
- **Shared link views**: >= 30% of generated share links receive at least one view from a non-owner. Measured by page view on the public route (anonymous, no tracking).
- **Conversion from shared view**: >= 5% of shared view visitors click "Plan your own trip" CTA. Measured by referral tracking on registration page.

## 7. Dependencies

- SPEC-PROD-011 (Summary with Edit): The shared view is a read-only variant of the summary page. The summary must be card-based (T-S29-001) before the shared view can reuse its layout.
- Trip model must support a new `shareToken` field (String?, unique, nullable).
- Rate limiting infrastructure (existing from Sprint 22 rate-limit.ts).

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | product-owner | Initial draft for Sprint 29. Organic growth mechanism via shareable trip summary |
