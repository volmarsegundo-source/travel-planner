# Travel Planner — Security Documentation

**Version**: 1.0.0
**Last Updated**: 2026-02-23
**Author**: security-specialist
**Status**: Active — Baseline for MVP

---

## Security Philosophy

> Security is not a feature to be added at the end — it is a design constraint enforced from the first commit.

Este documento define a baseline de segurança obrigatória para o Travel Planner MVP. Toda a equipe — desenvolvedores, tech-lead, devops — deve ler, entender e seguir este documento antes de escrever código de produção.

Our security model is built on three principles:

1. **Defense in depth**: No single control is sufficient. Every layer — network, application, data, authentication — must have independent controls.
2. **Least privilege**: Every component, user, and service gets the minimum access required to perform its function. Nothing more.
3. **Fail securely**: When a system fails, it must fail into a safe state. No partial authorization, no silent data exposure, no swallowed errors.

Travel applications are high-value targets. They collect passport numbers, travel dates, accommodation details, and geolocation histories — a complete dossier for identity theft, stalking, and physical-world harm. A breach is not just a regulatory failure; it is a direct harm to real people.

---

## Top 5 MVP Security Risks

### Risk 1: Broken Object Level Authorization (BOLA / IDOR)

**Severity**: Critical
**Likelihood**: High
**Category**: OWASP API Security Top 10 — API1:2023, OWASP Top 10 — A01:2021 Broken Access Control

**Description**:
The application exposes trip IDs, itinerary IDs, and activity IDs in URLs and API requests (e.g., `GET /api/v1/trips/clx7abc123`). An authenticated user can substitute another user's resource ID and access — or worse, modify — data they do not own. This is the single most exploited API vulnerability class and is particularly dangerous in a travel app where trip itineraries reveal home addresses, hotel bookings, daily schedules, and travel absence windows.

Real-world impact: an attacker who knows another user's trip ID can view their complete travel schedule, learn when they will be away from home, and extract accommodation details.

**Mitigation**:
- Every service method that fetches a user-owned resource MUST include the authenticated `userId` as a filter condition in the Prisma query — never fetch by ID alone.
- The ownership check must happen at the data access layer, not in the route handler after the data is already fetched.
- Use CUID2 IDs (already decided in ADR-001) — not sequential integers — to prevent enumeration, though this is not a substitute for authorization.

**Correct pattern**:
```typescript
// src/server/services/trip.service.ts
export async function getTripById(userId: string, tripId: string): Promise<Trip> {
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      userId: userId,      // ownership enforced at query level
      deletedAt: null,
    },
  });
  if (!trip) throw new NotFoundError("Trip", tripId);
  return trip;
}
```

**Anti-pattern (never do this)**:
```typescript
// WRONG: fetches by ID alone, then checks ownership after
const trip = await db.trip.findUnique({ where: { id: tripId } });
if (trip.userId !== userId) throw new ForbiddenError();
```

The correct pattern is safer because it never loads unauthorized data into memory and avoids timing-observable differences in response behavior.

**Developer Checklist**:
- [ ] Every `findUnique` / `findFirst` on a user-owned model includes `userId` in the `where` clause
- [ ] No route handler calls `db.*` directly — always goes through the service layer
- [ ] Service methods accept `userId` as a required first argument, never as optional
- [ ] Integration tests verify that User A cannot access resources owned by User B
- [ ] E2E test: attempt to access another user's trip ID returns `403 Forbidden`, not `404`

---

### Risk 2: Sensitive Data Exposure — Travel PII in Logs, Errors, and API Responses

**Severity**: Critical
**Likelihood**: High
**Category**: OWASP Top 10 — A02:2021 Cryptographic Failures / A09:2021 Security Logging and Monitoring Failures

**Description**:
Travel applications collect sensitive personal data — full names, passport numbers (if added in Phase 2), travel dates, home addresses (implied by trip origin), geolocation data, and accommodation details. This data can leak through:

- Stack traces in error responses (Prisma errors contain raw SQL with field values)
- Structured logs that capture request bodies (trip creation forms contain all PII)
- API responses that return more fields than the client needs (over-fetching)
- Sentry error reports that include full request context including auth tokens
- Redis cache entries that store unsanitized search queries containing personal terms
- Next.js development mode sending raw server errors to the browser

**Mitigation**:
- Error responses MUST use the standardized error shape (defined in `docs/architecture.md`) — `message` fields must be generic, never containing raw field values, SQL fragments, or stack traces.
- Server Actions in development mode send raw errors to the browser. Never run development mode in a staging or production environment.
- Sentry must be configured with data scrubbing rules to strip known PII fields before transmission.
- Prisma logging (`log: ["query"]`) is allowed only in development; must be disabled in production.
- API responses use explicit `select` in Prisma queries — never return `SELECT *` or the full Prisma model object.
- Log statements must never include: email, name, userId in combination with trip details, accommodation addresses, or travel dates.

**Sentry PII scrubbing configuration**:
```typescript
// src/lib/monitoring.ts
Sentry.init({
  dsn: env.SENTRY_DSN,
  beforeSend(event) {
    // Strip request body from all events
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }
    return event;
  },
  // Sentry built-in PII scrubbing
  sendDefaultPii: false,
});
```

**Developer Checklist**:
- [ ] No `console.log`, `logger.info`, or similar calls include user email, name, passport data, or full trip details
- [ ] All Prisma queries use explicit `select` — no `db.trip.findUnique({ where: { id } })` without a `select` clause in service layer
- [ ] `NODE_ENV=production` is set in all deployment environments including staging
- [ ] Sentry `sendDefaultPii: false` is configured
- [ ] Error response messages reviewed: no Prisma error text, no SQL, no field values
- [ ] Redis cache keys do not encode PII (use hashed keys for search queries)

---

### Risk 3: Authentication and Session Vulnerabilities

**Severity**: Critical
**Likelihood**: Medium
**Category**: OWASP Top 10 — A07:2021 Identification and Authentication Failures

**Description**:
Auth.js v5 with Redis session store is well-designed, but several implementation risks exist:

- **JWT vs. database sessions**: JWT sessions cannot be invalidated before expiry. If a user's token is stolen, there is no way to revoke it. For a travel app where users may be on shared devices (hotel computers, airport kiosks), session revocation is critical.
- **Weak `AUTH_SECRET`**: If `AUTH_SECRET` is short, predictable, or reused across environments, JWT tokens can be forged.
- **Session fixation**: If the session ID is not rotated after login, a pre-login session can be promoted to an authenticated session.
- **Insecure cookie configuration**: Missing `Secure`, `HttpOnly`, or `SameSite` attributes expose session cookies to XSS and CSRF.
- **Token leakage to client**: Auth.js session token must never be exposed in API responses or passed to Client Components.
- **OAuth state parameter weakness**: Missing or predictable OAuth state parameters enable CSRF against the OAuth flow itself.

**Mitigation**:
- Use **database sessions** (not JWT sessions) for Auth.js v5. Database sessions allow immediate revocation. The latency cost (~1 DB query per request) is acceptable and mitigated by Redis caching.
- `AUTH_SECRET` must be at minimum 32 bytes of cryptographic randomness. Generate with `openssl rand -base64 32`. Validated at startup via `@t3-oss/env-nextjs`.
- Auth.js v5 rotates session tokens by default on every request — verify this behavior is not disabled.
- Cookie configuration must explicitly set `Secure: true`, `HttpOnly: true`, `SameSite: Lax`.
- Provide a "sign out all devices" feature for users (delete all sessions from the session store).
- Never store third-party OAuth `access_token` or `refresh_token` in the client-visible session object.

**Required Auth.js configuration**:
```typescript
// src/lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db/client";

export const authConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "database",     // NOT "jwt" — allows session revocation
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // rotate every 24h
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // callbacks, providers...
};
```

**Developer Checklist**:
- [ ] `session.strategy` is `"database"`, not `"jwt"`
- [ ] `AUTH_SECRET` is validated to be ≥ 32 characters in env schema
- [ ] `AUTH_SECRET` is different across development, staging, and production environments
- [ ] Session cookie has `HttpOnly`, `Secure` (in production), and `SameSite: lax`
- [ ] No `session.accessToken` or OAuth tokens in the client-visible session shape
- [ ] `/account` page offers "sign out all devices" functionality
- [ ] Auth route (`/auth/[...nextauth]`) is not accessible without HTTPS in production

---

### Risk 4: Server-Side Request Forgery (SSRF) via Mapbox and External API Proxying

**Severity**: High
**Likelihood**: Medium
**Category**: OWASP Top 10 — A10:2021 Server-Side Request Forgery

**Description**:
The architecture notes that Mapbox API calls should be proxied server-side to hide the API key. If this proxy is implemented naively — accepting a user-supplied URL or destination parameter and forwarding it to an HTTP client — an attacker can redirect the server to make requests to internal services (AWS metadata endpoint `169.254.169.254`, internal databases, Railway/Render management APIs, Redis).

Additionally, destination search functionality that fetches external data (images, descriptions) based on user input is a vector for SSRF if the fetch target is not strictly allowlisted.

**Mitigation**:
- The Mapbox proxy must accept only a predefined set of path patterns and never accept a full URL from client input.
- All server-side `fetch()` calls to external services must use an explicit allowlist of domains.
- Block requests to RFC-1918 addresses (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`) and link-local addresses (`169.254.x.x`) at the application level.
- Enforce a strict timeout on all outbound HTTP requests (5 seconds maximum).
- Use environment variables for all external API base URLs — never construct URLs from user input.

**Safe proxy pattern**:
```typescript
// src/app/api/v1/mapbox/geocode/route.ts
const ALLOWED_MAPBOX_ENDPOINTS = ["/geocoding/v5/mapbox.places/"] as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query || query.length > 256) {
    return NextResponse.json({ error: { code: "INVALID_QUERY" } }, { status: 400 });
  }
  // Path is hardcoded — user input only fills the query parameter
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${env.MAPBOX_SECRET_TOKEN}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  // ... return sanitized response
}
```

**Developer Checklist**:
- [ ] No server-side route accepts a full URL from user input and fetches it
- [ ] Mapbox proxy uses hardcoded path templates — only query values are user-supplied
- [ ] All `fetch()` calls in `src/server/` use `AbortSignal.timeout(5000)`
- [ ] External API base URLs come from validated env vars, never from request parameters
- [ ] No image URL from user input is directly loaded via server-side `fetch()` without domain validation

---

### Risk 5: Insecure Direct Object Reference via Next.js Server Actions (Mass Assignment / Parameter Tampering)

**Severity**: High
**Likelihood**: High
**Category**: OWASP Top 10 — A08:2021 Software and Data Integrity Failures, A03:2021 Injection

**Description**:
Next.js Server Actions expose every exported `"use server"` function as an HTTP endpoint identified by a hash. An attacker who reverse-engineers the action ID can invoke any action with arbitrary arguments. TypeScript type annotations are not enforced at runtime — a Server Action that expects `{ title: string }` can receive `{ title: string, userId: string, deletedAt: null }`, and if the server naively spreads input into a Prisma `create` or `update`, the attacker can overwrite protected fields (mass assignment).

Additionally, closed-over variables in Server Actions that use `.bind()` are NOT encrypted (unlike closure variables), as documented in the Next.js security guide. This means `.bind()`-based actions that include sensitive IDs or computed values expose those values in the serialized payload.

**Mitigation**:
- Zod schemas must explicitly define `allowable` fields using `.pick()` or explicit field definitions — never use `z.object(inputSchema).passthrough()`.
- Service layer methods must never spread raw user input into Prisma operations. Map validated fields explicitly.
- Never use `.bind(null, sensitiveValue)` in Server Action definitions. Use closures (which are encrypted) or re-fetch the value inside the action.
- Authorization check (`await auth()`) is the first statement in every Server Action, before any argument processing.

**Safe Server Action pattern**:
```typescript
// src/server/actions/trip.actions.ts
"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { TripCreateSchema } from "@/lib/validations/trip.schema";
import { TripService } from "@/server/services/trip.service";
import { UnauthorizedError } from "@/lib/errors";

export async function createTrip(formData: FormData) {
  // Step 1: auth FIRST — before touching arguments
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Step 2: parse and validate — Zod rejects unknown fields
  const input = TripCreateSchema.parse({
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  // Step 3: service call with explicit userId — never from user input
  return TripService.createTrip(session.user.id, input);
}
```

**Anti-pattern (never do this)**:
```typescript
// WRONG: spreads user input directly — mass assignment vulnerability
export async function createTrip(data: unknown) {
  const session = await auth();
  const validated = TripCreateSchema.passthrough().parse(data);
  await db.trip.create({ data: { ...validated, userId: session.user.id } });
  // Attacker can inject: status: "published", deletedAt: null, userId: "victim-id"
}
```

**Developer Checklist**:
- [ ] Every Server Action calls `await auth()` as its first statement
- [ ] Zod schemas use explicit field definitions — no `.passthrough()` on input schemas
- [ ] Prisma `create` and `update` operations list fields explicitly — no `...spread` of validated input
- [ ] `userId` is always sourced from `session.user.id`, never from user-supplied input
- [ ] `.bind()` is not used with sensitive values in Server Action definitions

---

## Risk Register

| ID | Risk | Category | Severity | Likelihood | Status | Owner | Mitigation Summary |
|---|---|---|---|---|---|---|---|
| SEC-001 | Broken Object Level Authorization (BOLA/IDOR) | Access Control | Critical | High | Open | dev-fullstack | `userId` filter on all resource queries; ownership at DB layer |
| SEC-002 | PII exposure in logs / errors / API responses | Data Exposure | Critical | High | Open | dev-fullstack | Explicit Prisma `select`; Sentry PII scrubbing; no request body logging |
| SEC-003 | Session vulnerabilities (JWT non-revocable, weak secret) | Authentication | Critical | Medium | Open | dev-fullstack | Database sessions; 32-byte secret; cookie hardening |
| SEC-004 | SSRF via external API proxying | Injection | High | Medium | Open | dev-fullstack | Hardcoded URL templates; allowlisted domains; 5s timeout |
| SEC-005 | Mass assignment via Server Actions | Integrity | High | High | Open | dev-fullstack | Explicit Zod schemas; no spread of user input into Prisma |
| SEC-006 | Dependency supply chain compromise | Supply Chain | High | Medium | Open | devops | Dependabot; `npm audit` in CI; license check; SBOM |
| SEC-007 | Rate limit bypass — search API cost explosion | Availability | High | High | Open | devops | Redis-based rate limiting from day 1; 30 req/min on search |
| SEC-008 | Mapbox API key exposure in client bundle | Secret Exposure | High | Medium | Open | dev-fullstack | Public token only in `NEXT_PUBLIC_`; secret token server-side only |
| SEC-009 | Missing `deletedAt` filter exposing soft-deleted data | Data Exposure | High | High | Open | dev-fullstack | Global Prisma middleware enforcing `deletedAt: null` filter |
| SEC-010 | GDPR right-to-erasure not implemented | Compliance | High | Medium | Open | architect | Soft delete in place; batch purge job in Phase 2 |
| SEC-011 | XSS via user-generated itinerary content (notes, titles) | Injection | High | Medium | Open | dev-fullstack | React auto-escaping; DOMPurify for any `dangerouslySetInnerHTML` |
| SEC-012 | Insecure direct database access from route handlers | Architecture | Medium | Medium | Open | tech-lead | `server-only` enforcement; Prisma only through `src/server/` |
| SEC-013 | Missing security headers (CSP, HSTS, X-Frame-Options) | Transport | Medium | High | Open | devops | Next.js `headers()` config with strict CSP |
| SEC-014 | Environment variables leaked via `NEXT_PUBLIC_` prefix | Secret Exposure | High | Medium | Open | dev-fullstack | CI check: no sensitive key has `NEXT_PUBLIC_` prefix |
| SEC-015 | Geolocation data retained beyond necessity | Privacy | Medium | Low | Open | architect | Define retention policy; do not log precise geolocation |
| SEC-016 | OAuth token stored in client-visible session | Auth | Medium | Medium | Open | dev-fullstack | Never expose OAuth `access_token` in session callback |
| SEC-017 | Missing CSRF protection on custom Route Handlers | CSRF | Medium | Medium | Open | dev-fullstack | Audit all `route.ts` files; add CSRF token for non-Server-Action mutations |
| SEC-018 | Vercel deployment exposes internal `/_next/` debug routes in development | Information Disclosure | Low | Low | Open | devops | Ensure `NODE_ENV=production` on all deployed environments |
| SEC-019 | No audit log for sensitive operations | Accountability | Medium | High | Open | data-engineer | Log trip creation/deletion, account changes with userId and timestamp |
| SEC-020 | Pagination `totalItems` leaks aggregate counts | Information Disclosure | Low | Low | Open | dev-fullstack | Evaluate whether total count is needed; cap at max page boundary if needed |

---

## Minimum Security Requirements (Day-One Rules)

Estas regras são OBRIGATÓRIAS e devem ser seguidas desde o primeiro commit. Não são opcionais.

### Authentication and Authorization

1. **Auth check is always first**: Every Server Action and API Route Handler must call `await auth()` as its absolute first statement, before any argument parsing, database access, or business logic.

2. **Database sessions, not JWT**: Auth.js must be configured with `session: { strategy: "database" }`. JWT sessions cannot be revoked and are unsuitable for a travel app.

3. **Authorization at the data layer**: Ownership checks are enforced in Prisma queries via `userId` filter conditions — not after fetching data. The service layer is the authorization boundary.

4. **Session secret strength**: `AUTH_SECRET` must be ≥ 32 bytes of cryptographic randomness. It must differ across environments. It must be validated at startup.

5. **No role or permission from user input**: Roles, permissions, and user IDs must always come from the authenticated session — never from request body, query params, or headers supplied by the client.

6. **Middleware protection**: The Next.js middleware (`middleware.ts`) must protect all routes under `/(auth)/` by redirecting unauthenticated requests to `/auth/sign-in`. Use an allowlist approach — every new authenticated route must be explicitly included or covered by a path pattern.

### Input Validation and Sanitization

1. **Zod validation at every boundary**: All Server Actions and API Route Handlers must validate input using Zod schemas before processing. No raw `FormData` or `request.json()` is passed to services without parsing.

2. **No `.passthrough()` on input schemas**: Input schemas must only accept declared fields. Unknown fields are stripped (use `.strip()`, Zod's default) or rejected (use `.strict()`).

3. **Path parameters are untrusted**: URL path segments (`params.id`, `params.slug`) are user-controlled strings. They must be validated (type, format, length) before use. They must never be interpolated directly into SQL or used without ownership verification.

4. **Query string length limits**: Search queries must be capped at 256 characters maximum before any processing. Reject with `400 Bad Request` if exceeded.

5. **No `dangerouslySetInnerHTML`**: This React prop is forbidden unless the value has been explicitly sanitized with DOMPurify and the exception is documented in a code comment with the reviewer's name.

6. **No raw SQL**: All database queries must go through Prisma's parameterized query builder. Raw SQL (`db.$queryRaw`, `db.$executeRaw`) requires explicit security review and written justification in a code comment before merge.

### Data Protection (PII and Travel Data)

1. **PII field inventory**: The following fields are classified as PII and subject to heightened protection — `email`, `name`, `avatarUrl`, trip `title` (may contain real names or locations), activity `notes`, any future passport, document, or payment fields.

2. **Explicit Prisma `select`**: Service layer methods must use explicit `select` clauses to return only the fields required by the caller. Never return the full Prisma model object from a service method exposed to a route handler.

3. **No PII in logs**: Structured log events must never include: email, full name, trip destination paired with user identity, accommodation address, or passport/document numbers. Log user IDs (CUID2) only when necessary for correlation, not in combination with behavioral data.

4. **No PII in error messages**: Error messages visible to the client (API responses, form error states) must not contain the user's own PII reflected back, raw Prisma error messages, or SQL fragments.

5. **Encryption at rest**: PostgreSQL instance must have encryption at rest enabled (Railway and Render both support this by default). Verify this is active before the first user data is written.

6. **Encryption in transit**: All connections must use TLS. `DATABASE_URL` must use `sslmode=require`. Redis connection must use TLS (`rediss://` protocol). HTTPS is enforced on all Vercel deployments by default.

7. **Soft delete only**: User-owned data (`User`, `Trip`, and future booking/document models) must use `deletedAt` soft delete. Never issue a hard `DELETE` on user data. A Prisma middleware must enforce `where: { deletedAt: null }` globally.

8. **Geolocation minimization**: Store geolocation data (latitude/longitude) only when operationally required. Do not log precise coordinates. Activity location data is stored for itinerary building, not for tracking.

### API Security

1. **Rate limiting from day one**: All API endpoints must be protected by Redis-based rate limiting middleware. Limits: 60 req/min (public), 120 req/min (authenticated), 30 req/min (search). Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` must be included in every response.

2. **No sequential IDs in URLs**: All resource IDs exposed in URLs and API responses must be CUID2 strings. Integer primary keys must never appear in any HTTP response or URL.

3. **Consistent error responses**: All errors must use the standardized shape `{ error: { code, message, status, timestamp, requestId } }`. The `message` field must be safe for display — no internal details.

4. **Request ID tracing**: Every request must receive a unique `requestId` generated by middleware (e.g., using `crypto.randomUUID()`). This ID must be included in all log events related to the request and in error response bodies for support correlation.

5. **Security headers**: The following HTTP headers must be set via `next.config.ts` `headers()`:

   ```
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: geolocation=(self), camera=(), microphone=()
   Content-Security-Policy: [strict policy — see below]
   ```

6. **Content Security Policy (CSP)**: A strict CSP must be configured. Mapbox GL JS requires specific CSP exceptions for WebGL worker scripts. Define once in `next.config.ts` and review at every new dependency addition.

   Minimum CSP for MVP:
   ```
   default-src 'self';
   script-src 'self' 'nonce-{NONCE}' blob:;
   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
   img-src 'self' data: blob: https://*.mapbox.com https://*.mapbox.cn;
   connect-src 'self' https://*.mapbox.com https://*.sentry.io wss://*.mapbox.com;
   worker-src blob:;
   font-src 'self' https://fonts.gstatic.com;
   frame-src 'none';
   object-src 'none';
   base-uri 'self';
   ```

7. **CORS policy**: API routes must not set `Access-Control-Allow-Origin: *`. For webhook endpoints that require cross-origin access, allowlist specific trusted origins only.

### Dependency Security

1. **Automated vulnerability scanning**: Dependabot must be configured in `.github/dependabot.yml` to scan npm dependencies weekly. Critical and High CVEs must block the PR merge.

2. **`npm audit` in CI**: Every CI pipeline run must execute `npm audit --audit-level=high`. A non-zero exit code fails the build.

3. **License compliance**: Only MIT, Apache 2.0, BSD, and ISC licensed packages are permitted (as defined in `CLAUDE.md`). A license check step must be added to CI using `license-checker` or `licensee`.

4. **Software Bill of Materials (SBOM)**: Generate and store an SBOM for each release artifact. Use `cyclonedx-npm` to generate CycloneDX format SBOM as a CI artifact.

5. **No abandoned packages**: Before adding a new dependency, verify: last publish date within 12 months, open CVEs, number of maintainers, and weekly downloads. Document the review in the PR description.

6. **Lock file integrity**: `package-lock.json` (or `pnpm-lock.yaml` / `bun.lockb`) must be committed and CI must fail if it is out of sync with `package.json` (`npm ci --ignore-scripts` verifies this).

---

## GDPR / LGPD Compliance Checklist (Travel Product)

Esta seção é obrigatória para operação na UE e no Brasil. Não pode ser adiada para depois do MVP público.

> Note: GDPR compliance covers approximately 70–80% of LGPD requirements. Both are addressed here in parallel. Where they differ, both requirements are listed.

### Lawful Basis for Processing

- [ ] **Consent collected** for marketing communications (separate from service operation consent). Uses unchecked checkbox, not pre-ticked.
- [ ] **Legitimate interest assessment** documented for service operation data (processing trip data to provide the service).
- [ ] **Privacy notice** published and accessible before registration. Must include: data controller identity, categories of data collected, purposes and legal bases, retention periods, third-party data sharing, data subject rights, and supervisory authority contact.
- [ ] **LGPD**: Privacy notice also published in Portuguese for Brazilian users.
- [ ] **Cookie consent** implemented for non-essential cookies (analytics, error tracking). Functional cookies (session, auth) do not require consent but must be disclosed.

### Data Subject Rights

- [ ] **Right to access (GDPR Art. 15 / LGPD Art. 18)**: Users can request a full export of their data. Implement a `/account/data-export` page that generates a downloadable JSON/CSV of all user data within 30 days.
- [ ] **Right to erasure (GDPR Art. 17 / LGPD Art. 18)**: Users can request account deletion. The `deletedAt` soft-delete pattern is in place. A scheduled job must permanently purge records 30 days after `deletedAt` is set. This includes: User, all Trips, all ItineraryDays, all Activities, all Bookmarks, and all session records.
- [ ] **Right to portability (GDPR Art. 20)**: Trip and itinerary data must be exportable in a machine-readable format (JSON).
- [ ] **Right to rectification (GDPR Art. 16)**: Users can update their profile data via `/account` settings page.
- [ ] **Right to restriction (GDPR Art. 18)**: Users can deactivate their account (suspend processing without deletion) — a separate `deactivatedAt` field on the User model.
- [ ] **Response SLA**: Data subject requests must be fulfilled within **30 calendar days** (both GDPR and LGPD). Log all requests and completion dates in an internal tracking document.

### Data Minimization and Retention

- [ ] **Minimum required fields only**: Registration requires only email and password (or OAuth). Name is optional at registration — do not require it.
- [ ] **No collection of sensitive travel data at MVP**: Passport numbers, national ID numbers, visa details, and payment card data are NOT collected at MVP stage. If Phase 2 introduces these, a separate GDPR/LGPD impact assessment (DPIA) must be conducted first.
- [ ] **Retention periods defined** and documented:
  - Active accounts: data retained while account is active
  - Deleted accounts: 30 days post `deletedAt`, then permanently purged
  - Session data: max 30 days (Auth.js session `maxAge`)
  - Log data: max 90 days (no PII in logs)
  - Redis cache: TTL ≤ 5 minutes for search results, ≤ 24h for geocoding
- [ ] **Geolocation data**: Activity coordinates (latitude/longitude) are stored for itinerary building. They are not used for behavioral tracking. This must be disclosed in the privacy notice.
- [ ] **Travel dates and absence windows**: Trip `startDate` / `endDate` combined with user identity constitute sensitive data (reveals when a user is away from home). This data must not be used for any purpose other than the itinerary service itself.

### Third-Party Data Sharing and DPAs

- [ ] **Data Processing Agreements (DPAs) signed** with all processors before any user data is collected:
  - [ ] Vercel (hosting — processes HTTP requests containing session cookies)
  - [ ] Railway / Render (database hosting — stores all user PII)
  - [ ] Upstash (Redis — may temporarily hold session data and search queries)
  - [ ] Sentry (error monitoring — must be configured with PII scrubbing; `sendDefaultPii: false`)
  - [ ] Mapbox (maps — processes search queries; review their DPA)
- [ ] **No third-party analytics before consent**: Vercel Analytics and any future analytics platform must only activate after the user has consented to analytics cookies.
- [ ] **International data transfers**: Verify that all processors have adequate transfer mechanisms for EU→US transfers (EU-U.S. Data Privacy Framework or Standard Contractual Clauses). For LGPD, verify ANPD-approved mechanisms for BR→US transfers.

### Travel-Specific Privacy Considerations

- [ ] **Itinerary visibility controls**: Trip `visibility` field (public/private/shared) must default to **private**. Users must explicitly opt-in to sharing.
- [ ] **Shared trip links**: If implementing shared trip links, generate unpredictable tokens (not sequential IDs). Shared links must expire or be revocable.
- [ ] **No itinerary data in email subject lines**: If email notifications are added (Phase 2), subject lines must not include destination names or travel dates — these reveal travel patterns to email providers.
- [ ] **Avatar images**: If avatar upload is implemented, store in private storage (not public CDN without signed URLs). Images must be stripped of EXIF metadata (GPS coordinates embedded in photos) before storage.
- [ ] **Search query logging**: Do not log raw search queries associated with user identities. Search queries may reveal travel intentions, medical destinations, or political activities.

### Breach Response

- [ ] **Breach detection**: Sentry alerting and anomalous DB query monitoring in place before accepting first user.
- [ ] **GDPR Art. 33**: Data breaches affecting personal data must be reported to the supervisory authority within **72 hours** of discovery. Designate the responsible person (DPO or equivalent) before launch.
- [ ] **LGPD Art. 48**: ANPD notification within a **reasonable period** (expected to be interpreted as 72 hours, similar to GDPR).
- [ ] **Breach response plan documented**: Who is contacted, in what order, what data is captured, how affected users are notified (GDPR Art. 34 requires notification if high risk to individuals).
- [ ] **Data controller contact**: A `security@[domain]` email address must exist and be monitored before the product goes live.

---

## Security Review Checklist (for Every PR)

Executar antes de qualquer PR ser aprovado pelo tech-lead.

### Secrets and Configuration

- [ ] No credentials, API keys, tokens, passwords, or connection strings hardcoded anywhere in the diff
- [ ] No new `NEXT_PUBLIC_` prefixed variable exposes a secret key (must be only public, non-sensitive identifiers)
- [ ] No `.env` files committed — only `.env.example` with placeholder values
- [ ] New environment variables added to `.env.example` and to the `env.ts` validation schema

### Authentication and Authorization

- [ ] Every new Server Action calls `await auth()` as its first statement
- [ ] Every new API Route Handler validates session before any data access
- [ ] New database queries on user-owned resources include `userId` in `where` clause
- [ ] No new role, permission, or privilege is sourced from user-supplied input

### Input Validation

- [ ] All new Server Action and Route Handler inputs are validated with Zod before use
- [ ] No `.passthrough()` on any input Zod schema
- [ ] URL path parameters and query strings are validated for type and length
- [ ] No `dangerouslySetInnerHTML` added without DOMPurify and documented justification

### Data Exposure

- [ ] Prisma queries use explicit `select` — no queries return full model objects with all fields
- [ ] No PII fields in `console.log`, `logger.*`, or Sentry `addBreadcrumb` calls
- [ ] Error messages in API responses contain no raw Prisma errors, SQL text, or internal details
- [ ] API responses do not include fields unnecessary for the UI operation

### External Calls

- [ ] New outbound `fetch()` calls use `AbortSignal.timeout(5000)` or equivalent
- [ ] No outbound call constructs a URL from user-supplied input without an allowlist check
- [ ] New external service integrations have a DPA in place (flag in PR if not)

### Soft Delete and Data Integrity

- [ ] No hard `DELETE` statements on user-owned data
- [ ] New queries on soft-deleted models include `deletedAt: null` filter
- [ ] No Server Action spreads validated input directly into a Prisma `create` or `update`

### Dependencies

- [ ] New npm packages have been checked for CVEs (`npm audit`)
- [ ] New npm packages have an approved license (MIT, Apache 2.0, BSD, ISC)
- [ ] New npm packages have been published within the last 12 months and have active maintenance

### Documentation

- [ ] If a new architectural decision was made, ADR updated in `docs/architecture.md`
- [ ] If a new data category is collected, GDPR/LGPD checklist updated in this document

---

## Open Security Questions

These questions must be answered before the relevant features are specced or implemented. The architect and security-specialist must be consulted.

- [ ] **Payment integration (Phase 2)**: Will we integrate Stripe or another payment processor? If yes, this changes our PCI-DSS scope significantly. Even if using Stripe.js (which scopes us to SAQ A), we must document the cardholder data environment. The security-specialist must conduct a PCI-DSS scoping exercise before any payment code is written.

- [ ] **Passport and identity document storage**: Will users ever store passport numbers, national ID numbers, or visa information? If yes, these are sensitive personal data under GDPR Article 9 (special categories in context of profiling) and require a DPIA. They must be encrypted at the application layer (not just at rest in the database), with separate encryption keys managed in a secrets vault (AWS Secrets Manager or similar).

- [ ] **Multi-tenancy / B2B travel agents**: If travel agents manage itineraries on behalf of clients, the authorization model must be redesigned to include `organizationId` and role-based access control (RBAC). This is a significant schema and security design change — must be decided before the first migration.

- [ ] **Rate limiting implementation**: Redis-based rate limiting is specified in the architecture. Should this use a sliding window or fixed window algorithm? Sliding window is more accurate and resistant to burst manipulation at window boundaries. Decision needed before implementing the rate limit middleware.

- [ ] **Shared itinerary collaboration**: If two or more users can edit the same trip, we need a resource-sharing model (explicit permissions per trip per user). The current data model has no `tripMembers` or sharing table. This must be designed carefully to avoid BOLA vulnerabilities when one collaborator can access another's data.

- [ ] **Web Application Firewall (WAF)**: Vercel provides basic DDoS protection, but a WAF (Cloudflare, AWS WAF) should be evaluated for MVP launch. Decision needed from devops-engineer and product-owner on risk tolerance.

- [ ] **Penetration testing**: When is the first penetration test scheduled? Recommended: before the first public user (internal pentest) and after the first 1,000 users (professional pentest). Budget must be allocated.

- [ ] **DPO designation**: GDPR requires a Data Protection Officer for certain processing activities. Does the volume and nature of travel data trigger DPO requirements? Legal review needed before the product accepts first EU users.

---

## Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-23 | security-specialist | Initial security baseline — MVP risks, requirements, GDPR/LGPD checklist |
