# SPEC-LANDING-COPY-001 — Landing copy & phantom affordances cleanup

**Version:** 1.0.0
**Status:** Approved (Wave 2 — parallel with FORGOTPW-001)
**Sprint:** 44 (pre-Beta)
**Owner:** dev-fullstack-1
**Related:** SPEC-LANDING-HEADER-001, SPEC-LANDING-LAYOUT-001

---

## 1. Problem (line-exact root cause)

The Atlas landing exposes multiple **phantom affordances** — interactive-looking
elements that either point to non-existent routes or do nothing. A pre-Beta
visitor clicking any of these receives an immediate credibility hit:

| # | File:Line | Affordance | Actual behaviour |
|---|---|---|---|
| 1 | `src/components/features/landing/FooterV2.tsx:61` | `<Link href="/como-funciona">` for "Destination Guides" | 404 — route does not exist |
| 2 | `src/components/features/landing/FooterV2.tsx:69` | `<Link href="/como-funciona">` for "Travel Insurance" | 404 — same fake route |
| 3 | `src/components/features/landing/FooterV2.tsx:77` | `<Link href="/como-funciona">` for "Blog" | 404 — same fake route (three distinct nav targets collapsed into one broken URL) |
| 4 | `src/components/features/landing/FooterV2.tsx:94` | `"Em breve"` hardcoded PT string in both EN and PT | Language leak — EN users see Portuguese |
| 5 | `src/components/features/landing/FooterV2.tsx:99` | `"Em breve"` hardcoded PT string (second occurrence) | Same leak |
| 6 | `src/components/features/landing/DestinationsSectionV2.tsx:77` | `<a href="#">` "View All Destinations" | Scrolls to top / no-op — no destinations index exists |
| 7 | `src/components/features/landing/DestinationsSectionV2.tsx:92` | `cursor-pointer` + visual hover on every destination card | Does nothing — no onClick, no navigation |
| 8 | `src/components/features/landing/DestinationsSectionV2.tsx:139-146` | Circular `ArrowUpRight` button on Pantanal card | Has `aria-label` but no `onClick` |
| 9 | `messages/en.json` + `messages/pt-BR.json` | `landingV2.destinations.viewAll` key | Defined but renders a dead link |

All footer confirmation of routes: `ls src/app/[locale]/` shows
`privacidade`, `privacy`, `termos`, `terms`, `support` — but **no
`como-funciona`, no `how-it-works`, no `blog`, no `destinations`**.

## 2. Scope

**In scope (this spec):**
- Neutralize dead links in `FooterV2.tsx` (three "Explore" entries → "coming soon" pill pattern to match `about`/`contact`).
- i18n the "Em breve" label via a new `landingV2.footer.comingSoon` key so both locales render correctly.
- Remove the "View All Destinations" dead link entirely.
- Remove `cursor-pointer` class + Pantanal card button (the interaction hint is a lie).
- Update unit tests to assert the dead affordances are gone.

**Out of scope:**
- Building real content pages (`/blog`, `/destinations`, etc.). Those are post-Beta.
- Copy rewrites of hero/AI/gamification sections (content is fine).
- Newsletter subscription backend (still a simulated POST — flagged but not fixed here).

## 3. Acceptance criteria (BDD-style)

```gherkin
Scenario: Footer "Explore" section shows no dead routes
  Given a visitor on the landing page
  When they inspect the "Explore" column of the footer
  Then "Destination Guides", "Travel Insurance", and "Blog" are rendered as
       non-interactive labels with a "coming soon" pill
  And none of them have an <a href> that would 404 on click

Scenario: "Coming soon" label is localized
  Given a visitor with locale = "en"
  When they read the "Coming soon" pills in the footer
  Then the pill reads "Coming soon" (EN) — not "Em breve"

  Given a visitor with locale = "pt-BR"
  When they read the "Em breve" pills in the footer
  Then the pill reads "Em breve" (PT)

Scenario: Destinations section has no phantom affordances
  Given a visitor in the Destinations section
  Then no "View All Destinations" link is rendered
  And destination cards have no cursor-pointer hover suggesting navigation
  And the Pantanal card no longer renders the ghost arrow button
```

## 4. Technical plan

### 4.1 FooterV2 — neutralize Explore column (lines 58–83)

Replace the three `<Link>` elements with the same `<span>` "coming soon" pattern
already used for `about`/`contact` (lines 93–101). Use a shared
`landingV2.footer.comingSoon` key (NEW) for the pill text.

### 4.2 FooterV2 — i18n comingSoon (lines 94, 99)

Swap the hardcoded `"Em breve"` for `t("comingSoon")`.

### 4.3 DestinationsSectionV2 — drop "View All" link (line 76–81)

Remove the entire `<a href="#">` element. Center or left-align the `<h2>` alone.

### 4.4 DestinationsSectionV2 — strip dead interactions (line 92, 138–146)

- Remove `cursor-pointer group` from the `<div>` at line 92.
- Remove the Pantanal circular button at lines 139–146 (and the `{size === "panoramic" && ...}` wrapper).
- Remove the `group-hover:scale-110` transforms that promise interactivity.

### 4.5 i18n keys

**Add** in both `messages/en.json` and `messages/pt-BR.json`:
```jsonc
"landingV2": {
  "footer": {
    "comingSoon": "Coming soon"   // EN
    // "comingSoon": "Em breve"   // PT-BR
  }
}
```

**Remove** (unused after changes):
- `landingV2.destinations.viewAll`

## 5. SDD dimensions (9)

- **PROD**: Removes credibility-killing dead ends before Beta launch.
- **UX**: Eliminates phantom hover/pointer promises; `coming soon` pill is the honest pattern already used elsewhere.
- **TECH**: Pure view-layer changes. No server, no routing, no DB.
- **SEC**: No attack surface change. Less dead DOM = tiny reduction.
- **AI**: N/A.
- **INFRA**: N/A.
- **QA**: Unit tests assert negative presence of dead affordances + comingSoon label i18n.
- **RELEASE**: Patch — visible but non-breaking. No migration, no flag.
- **COST**: Zero — no new dependencies, no runtime cost.

## 6. Trust gates

- **Unit test gate**: PR ≥ 0.80, Staging ≥ 0.85, Prod ≥ 0.90
- Weights: UX 30% + Accuracy 30% + i18n 25% + Accessibility 15%
