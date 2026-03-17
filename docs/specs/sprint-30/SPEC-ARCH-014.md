# Technical Specification: Summary/Report Architecture Rewrite

**Spec ID**: SPEC-ARCH-014
**Related Story**: REWRITE-4 (Sprint 30 Planning)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The expedition summary page currently aggregates 6 phases of trip data into a read-only view. Users have requested the ability to export this summary as a PDF for offline use (airport, hotel check-in, sharing with co-travelers), print it with clean formatting, and share it via a signed URL that expires. This spec extends `ExpeditionSummaryService` with export-oriented data formatting, adds PDF generation via `@react-pdf/renderer`, implements CSS `@media print` styles, and introduces signed share URLs with HMAC-SHA256 verification.

## 2. Architecture Diagram

```
+-----------------------------------+
| /expedition/{id}/summary (page)   |
|                                   |
| ExpeditionSummary component       |
|   |-- [Export PDF] button         |-----> /api/trips/{id}/export/pdf
|   |-- [Print] button             |-----> window.print() (CSS @media print)
|   |-- [Share] button             |-----> /api/trips/{id}/share (create link)
|   |-- [Copy link] input          |
+-----------------------------------+

+-----------------------------------+
| /api/trips/{id}/export/pdf        |
|                                   |
| 1. Auth check (session)           |
| 2. Fetch summary data             |
| 3. Render PDF via @react-pdf      |
| 4. Return application/pdf stream  |
+-----------------------------------+

+-----------------------------------+
| /api/trips/{id}/share             |
|                                   |
| POST: Create signed share URL     |
|   -> HMAC-SHA256(tripId+userId+   |
|      expiry, SECRET)              |
|   -> Returns URL with token       |
|                                   |
| DELETE: Revoke share link         |
+-----------------------------------+

+-----------------------------------+
| /shared/{token} (public page)     |
|                                   |
| 1. Verify HMAC signature          |
| 2. Check expiry                   |
| 3. Fetch summary (no auth needed) |
| 4. Render read-only summary       |
| (stripped: no edit links, no       |
|  booking codes, no PII)           |
+-----------------------------------+
```

## 3. ADR-020: Summary Export Strategy

**Date**: 2026-03-17
**Status**: PROPOSED
**Deciders**: architect, tech-lead

### Context

Users need to export their expedition summary for offline use. Three approaches were evaluated:

### Options Considered

| Criteria (weight) | @react-pdf/renderer (A) | html-to-pdf (Puppeteer) (B) | CSS @media print only (C) |
|---|---|---|---|
| **Output quality** (25%) | High -- full control over layout, fonts, colors | Highest -- pixel-perfect HTML rendering | Medium -- browser-dependent rendering |
| **Server resource usage** (25%) | Low -- pure Node.js, no browser instance | High -- requires headless Chromium (~300MB RAM) | Zero -- client-side only |
| **Deployment compatibility** (20%) | Vercel-compatible (serverless) | NOT Vercel-compatible (needs long-running process) | Any platform |
| **Customization** (15%) | Full -- React component model for PDF layout | Full -- any CSS/HTML | Limited -- cannot add logos, page numbers, headers |
| **Bundle size** (15%) | ~150KB (server-only, not in client bundle) | ~50MB+ (Chromium binary) | 0KB |
| **Weighted Score** | **41/50** | **30/50** | **28/50** |

### Decision

**Option A: `@react-pdf/renderer`** for PDF generation, **combined with CSS `@media print`** for quick browser printing.

Primary reasons:
- Vercel-compatible: runs as a serverless function, no headless browser needed
- React component model: PDF layout is defined in JSX, consistent with our stack
- Fast generation: < 500ms for a typical 6-phase summary
- CSS print styles are added as a complement (zero-cost improvement)

### Consequences

**Positive**:
- PDF generation is a server-side function -- no client-side code needed
- React developers can maintain PDF templates using familiar JSX
- CSS print styles give an instant "print" option without PDF generation
- Share URL is stateless (HMAC verification, no DB table)

**Negative / Trade-offs**:
- `@react-pdf/renderer` layout system is limited (Flexbox only, no CSS Grid)
- Fonts must be registered explicitly (no system font inheritance)
- PDF and web layouts will diverge -- two templates to maintain

**Risks**:
- `@react-pdf/renderer` v4 may have compatibility issues with React 19. Test before committing.
- Large summaries (many transport segments, accommodations) may exceed a single PDF page -- must handle page breaks.

---

## 4. Data Model Changes

### 4.1 Share Token (Stateless -- No DB Table)

Share links use HMAC-SHA256 signatures. No database table is needed.

Token format: `base64url(JSON({ tripId, userId, expiresAt })).base64url(HMAC-SHA256(payload, SHARE_SECRET))`

```
https://app.example.com/shared/eyJ0...fQ.abc123signature
```

**Why stateless**: Avoids a new DB table for share links. The HMAC ensures integrity and authenticity. Expiry is embedded in the payload.

**Env var**: `SHARE_LINK_SECRET` (32-byte random string, stored in env). Falls back to `AUTH_SECRET` if not set (acceptable for MVP).

### 4.2 Export-Friendly Summary DTO

Extend `ExpeditionSummary` with export-specific fields:

```typescript
// src/server/services/expedition-export.service.ts

export interface ExportSummary extends ExpeditionSummary {
  userName: string | null;        // Traveler name (for PDF header)
  tripTitle: string;              // Trip title
  generatedAt: string;            // Export timestamp
  locale: string;                 // For i18n in PDF
}

export interface SharedSummary {
  // Same as ExportSummary but WITHOUT:
  // - bookingCodes (even masked)
  // - userId
  // - any PII
  tripTitle: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  phases: SharedPhaseSummary[];
  generatedAt: string;
}
```

## 5. API Contracts

### 5.1 Endpoint: GET /api/trips/{tripId}/export/pdf

Generates and returns a PDF binary.

**Auth**: Required (session cookie)
**Rate Limit**: 5 req/min per user (PDF generation is CPU-intensive)

**Request**:
| Param | Type | Required | Validation |
|---|---|---|---|
| `tripId` | string (path) | Yes | CUID2 format |
| `locale` | string (query) | No | "pt-BR" or "en", default from session |

**Response (200)**:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="expedition-{destination}-{date}.pdf"`
- Binary PDF stream

**Error Responses**:
- 401: `{ "error": "Unauthorized" }`
- 404: `{ "error": "Trip not found" }` (includes BOLA check)
- 429: `{ "error": "Rate limit exceeded" }`
- 500: `{ "error": "PDF generation failed" }`

### 5.2 Endpoint: POST /api/trips/{tripId}/share

Creates a signed share URL.

**Auth**: Required
**Rate Limit**: 10 req/hr per user

**Request Body**:
```json
{
  "expiresInHours": 72
}
```
| Field | Type | Required | Validation |
|---|---|---|---|
| `expiresInHours` | number | No | 1-720 (default: 72 = 3 days, max: 30 days) |

**Response (200)**:
```json
{
  "shareUrl": "https://app.example.com/shared/eyJ0...fQ.abc123",
  "expiresAt": "2026-03-20T12:00:00.000Z"
}
```

**Error Responses**:
- 401: `{ "error": "Unauthorized" }`
- 404: `{ "error": "Trip not found" }`
- 422: `{ "error": "Invalid expiry duration" }`

### 5.3 Endpoint: GET /shared/{token} (Public Page)

Renders a read-only, stripped-down summary. NO authentication required.

**Auth**: None (token-verified)
**Rate Limit**: 30 req/min per IP

**Token Verification**:
1. Split token into payload + signature
2. Verify HMAC-SHA256(payload, SHARE_SECRET) matches signature
3. Decode payload, check `expiresAt > now()`
4. Fetch trip data using `tripId` from payload (no userId filter -- the token IS the authorization)
5. Strip PII and booking codes from response

**Error Pages**:
- Invalid/tampered token: "This link is invalid."
- Expired token: "This link has expired. Ask the traveler for a new link."
- Trip deleted: "This expedition is no longer available."

## 6. PDF Document Structure

```typescript
// src/server/pdf/ExpeditionPdfDocument.tsx

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const ExpeditionPdfDocument = ({ summary }: { summary: ExportSummary }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header: Atlas logo + title */}
      <View style={styles.header}>
        <Text style={styles.title}>{summary.tripTitle}</Text>
        <Text style={styles.subtitle}>
          {summary.phase1?.destination} | {formatDateRange(summary)}
        </Text>
      </View>

      {/* Phase 1: Trip Overview */}
      <PhaseSection title="O Chamado" data={summary.phase1} />

      {/* Phase 2: Traveler Profile */}
      <PhaseSection title="O Explorador" data={summary.phase2} />

      {/* Phase 3: Checklist Progress */}
      <ChecklistSection data={summary.phase3} />

      {/* Phase 4: Logistics */}
      <LogisticsSection data={summary.phase4} />

      {/* Phase 5: Destination Guide Highlights */}
      <GuideHighlightsSection data={summary.phase5} />

      {/* Phase 6: Itinerary Overview */}
      <ItinerarySection data={summary.phase6} />

      {/* Footer: generated date + Atlas branding */}
      <View style={styles.footer}>
        <Text>Generated: {summary.generatedAt} | Atlas Travel Planner</Text>
      </View>
    </Page>
  </Document>
);
```

PDF is generated server-side and streamed:

```typescript
// /api/trips/{tripId}/export/pdf route handler
import { renderToBuffer } from "@react-pdf/renderer";

const pdfBuffer = await renderToBuffer(
  <ExpeditionPdfDocument summary={exportSummary} />
);

return new Response(pdfBuffer, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="expedition-${safeFilename}.pdf"`,
  },
});
```

## 7. CSS Print Styles

Added to the summary page as a `<style>` block or imported CSS module:

```css
@media print {
  /* Hide navigation, breadcrumbs, buttons */
  nav, .breadcrumb, button, [data-no-print] { display: none !important; }

  /* Remove shadows and borders for clean print */
  .border { border-color: #e5e5e5 !important; }
  .shadow-lg { box-shadow: none !important; }

  /* Ensure white background */
  body, .bg-background { background: white !important; }
  .text-foreground { color: black !important; }
  .text-muted-foreground { color: #666 !important; }

  /* Page breaks */
  [data-testid="phase-card-4"] { break-before: page; }

  /* Print-specific footer */
  .print-footer { display: block !important; }
}

/* Hidden by default, shown in print */
.print-footer { display: none; }
```

The `[Print]` button triggers `window.print()` and is itself hidden via `[data-no-print]`.

## 8. Share URL Crypto

```typescript
// src/lib/share-token.ts

import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const SHARE_SECRET = env.SHARE_LINK_SECRET ?? env.AUTH_SECRET;

interface SharePayload {
  tripId: string;
  userId: string;
  expiresAt: string; // ISO timestamp
}

export function createShareToken(payload: SharePayload): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SHARE_SECRET)
    .update(payloadStr)
    .digest("base64url");
  return `${payloadStr}.${signature}`;
}

export function verifyShareToken(token: string): SharePayload | null {
  const [payloadStr, signature] = token.split(".");
  if (!payloadStr || !signature) return null;

  const expectedSig = createHmac("sha256", SHARE_SECRET)
    .update(payloadStr)
    .digest("base64url");

  // Timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString("utf-8")
    ) as SharePayload;

    // Check expiry
    if (new Date(payload.expiresAt) < new Date()) return null;

    return payload;
  } catch {
    return null;
  }
}
```

## 9. Security Considerations

### 9.1 PDF Generation
- **BOLA**: API route verifies `tripId` belongs to `userId` from session before generating PDF
- **Booking codes**: Masked in PDF (same masking as summary page -- `BOOK-****-XY7`)
- **PII**: Passport numbers are NEVER included in PDF. Only name and trip data.
- **Rate limiting**: 5 req/min prevents abuse (PDF generation is CPU-intensive)

### 9.2 Share Links
- **No auth bypass**: Share tokens grant READ-ONLY access to a STRIPPED summary. No edit capability, no booking codes, no PII.
- **Timing-safe comparison**: Prevents timing attacks on HMAC verification
- **Expiry enforcement**: Token payload includes `expiresAt`. Max 30 days.
- **Revocation**: Not supported in stateless model. If needed, add a `revokedShares` table (deferred -- out of MVP scope). Users can set short expiry (1h) for sensitive shares.
- **SHARE_LINK_SECRET rotation**: If the secret is rotated, all existing share links become invalid. This is acceptable -- links are short-lived.
- **Token in URL**: The token appears in the URL path, which means it may be logged by proxies/CDNs. Acceptable risk for non-sensitive trip summaries. Do NOT include any PII in the token payload beyond tripId+userId.

### 9.3 Print
- **No security concerns**: `window.print()` uses the browser's built-in print dialog. No server interaction.

## 10. Performance Requirements

| Metric | Target |
|---|---|
| PDF generation (6 phases, typical data) | < 500ms |
| PDF file size (typical) | < 200KB |
| Share token generation | < 5ms |
| Share token verification | < 5ms |
| Print layout render | < 100ms (CSS only) |
| `/shared/{token}` page load | < 800ms (public, no auth overhead) |

## 11. Testing Strategy

### Unit Tests
- `createShareToken` / `verifyShareToken`: roundtrip, expiry check, tampered signature, malformed token
- `ExportSummary` DTO: correct field mapping from `ExpeditionSummary`
- `SharedSummary`: PII/booking codes stripped
- PDF filename sanitization: special characters, long names

### Integration Tests
- `/api/trips/{id}/export/pdf`: returns valid PDF binary, correct headers, BOLA check
- `/api/trips/{id}/share`: creates valid token, respects expiry limits
- `/shared/{token}`: renders summary for valid token, 404 for expired/invalid

### E2E Tests
- Click "Export PDF": browser downloads a PDF file
- Click "Print": browser print dialog opens
- Click "Share": share URL appears, copy-to-clipboard works
- Open shared URL in incognito: summary renders without login
- Open expired shared URL: error page shown

## 12. Dependencies

| Package | Version | License | Purpose | New? |
|---|---|---|---|---|
| `@react-pdf/renderer` | ^4.1.0 | MIT | PDF generation | YES |
| `@react-pdf/font` | ^3.0.0 | MIT | Font registration for PDF | YES (transitive) |

**Note**: `@react-pdf/renderer` v4 supports React 19. Verify compatibility before installing. If incompatible, fall back to v3.x with React 19 adapter.

No new client-side dependencies. Share token uses Node.js built-in `crypto`.

## 13. Environment Variables

```
# .env.local -- new variable (optional)
SHARE_LINK_SECRET={{SHARE_LINK_SECRET}}  # 32-byte random string; falls back to AUTH_SECRET
```

Add to `src/lib/env.ts`:
```typescript
SHARE_LINK_SECRET: z.string().min(16).optional(),
```

## 14. Component Changes

### ExpeditionSummary.tsx -- New Buttons

Add three buttons to the summary header:

```typescript
<div className="flex gap-2" data-no-print>
  <Button variant="outline" size="sm" onClick={handleExportPdf}>
    <FileDown className="h-4 w-4 mr-1" />
    {t("exportPdf")}
  </Button>
  <Button variant="outline" size="sm" onClick={() => window.print()}>
    <Printer className="h-4 w-4 mr-1" />
    {t("print")}
  </Button>
  <ShareButton tripId={tripId} />
</div>
```

### ShareButton Component (New)

```
src/components/features/expedition/ShareButton.tsx
```

Handles: POST to create share URL, display URL in input, copy-to-clipboard button, expiry countdown.

## 15. i18n

New translation keys:

```json
{
  "expedition.summary": {
    "exportPdf": "Exportar PDF",
    "print": "Imprimir",
    "share": "Compartilhar",
    "shareTitle": "Compartilhar expedicao",
    "shareDescription": "Qualquer pessoa com o link pode ver um resumo da sua expedicao (sem dados sensiveis).",
    "shareExpiry": "O link expira em {hours} horas.",
    "copyLink": "Copiar link",
    "linkCopied": "Link copiado!",
    "generateLink": "Gerar link",
    "sharedBy": "Compartilhado por {name}",
    "linkExpired": "Este link expirou. Peca um novo link ao viajante.",
    "linkInvalid": "Este link e invalido."
  }
}
```

## 16. Migration Path

### Phase 1: CSS Print Styles (Non-breaking, instant value)
1. Add `@media print` styles to summary page
2. Add "Print" button with `window.print()`
3. Hide non-printable elements with `data-no-print`

### Phase 2: Share URLs (Non-breaking, additive)
1. Create `src/lib/share-token.ts`
2. Create `/api/trips/{id}/share` POST route
3. Create `/shared/{token}` public page
4. Create `ShareButton` component
5. Add `SHARE_LINK_SECRET` to env

### Phase 3: PDF Export (Non-breaking, additive)
1. Install `@react-pdf/renderer`
2. Create `src/server/pdf/ExpeditionPdfDocument.tsx`
3. Create `src/server/services/expedition-export.service.ts`
4. Create `/api/trips/{id}/export/pdf` route
5. Add "Export PDF" button to summary

## 17. Open Questions

- [ ] **OQ-1**: Should shared summaries include Phase 5 (destination guide) content? The guide is AI-generated and may have IP implications. Recommendation: include highlights only (timezone, currency, language), not full guide text.
- [ ] **OQ-2**: Should we support custom expiry times in the share dialog (e.g., 1h, 24h, 72h, 7d)? Recommendation: yes, dropdown with presets. Default 72h.
- [ ] **OQ-3**: PDF font: should we use a custom font matching the Atlas brand or default to Helvetica? Recommendation: Helvetica for MVP (no font registration needed). Custom font in Sprint 31.
- [ ] **OQ-4**: Should the PDF include a QR code linking to the digital summary? Nice-to-have, defer to Sprint 31.
- [ ] **OQ-5**: `@react-pdf/renderer` v4 + React 19 compatibility -- needs spike before committing. If incompatible, fallback plan is `html-pdf-node` (lighter than Puppeteer).

## 18. Definition of Done

- [ ] CSS `@media print` styles on summary page
- [ ] "Print" button triggers `window.print()`
- [ ] PDF generation via `@react-pdf/renderer`
- [ ] "Export PDF" button downloads PDF file
- [ ] PDF includes all 6 phase summaries with clean layout
- [ ] Booking codes masked in PDF (same as web)
- [ ] Passport/PII data excluded from PDF
- [ ] Share URL generation with HMAC-SHA256 signed tokens
- [ ] "Share" button with copy-to-clipboard
- [ ] Public `/shared/{token}` page with stripped summary
- [ ] Expired/invalid token error pages
- [ ] Timing-safe HMAC comparison
- [ ] Rate limiting on all export endpoints
- [ ] BOLA protection on PDF and share endpoints
- [ ] Unit tests for share token crypto (roundtrip, expiry, tampering)
- [ ] E2E tests for PDF download, print dialog, share flow
- [ ] i18n keys for pt-BR and en
- [ ] ADR-020 accepted by tech-lead

> PROPOSED -- Awaiting tech-lead review before implementation begins
