# Technical Specification: Social Login Architecture

**Spec ID**: SPEC-ARCH-022
**Related Stories**: SPEC-PROD-034 (IMP-006), TASK-S33-013, TASK-S33-014, TASK-S33-015
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-20

---

## 1. Overview

This spec defines the architecture for integrating Google OAuth and Apple Sign-In into the existing Auth.js v5 + PrismaAdapter + JWT authentication system. Google provider is already configured in `auth.config.ts` and `auth.ts` but untested for account linking. Apple provider is new. The primary challenges are: (1) account linking when an OAuth email matches an existing credentials-based user, (2) Apple's private email relay handling, and (3) maintaining a single JWT session strategy across all providers.

## 2. Architecture Diagram

```
                   LoginForm / RegisterForm
                    |              |
        +-----------+              +-------------+
        |                                        |
  [Continuar com Google]              [Continuar com Apple]
        |                                        |
        v                                        v
  signIn("google")                      signIn("apple")
        |                                        |
        +---> Google OAuth consent               +---> Apple Sign-In
        |     (redirect flow)                    |     (redirect / system flow)
        |                                        |
        v                                        v
  GET /api/auth/callback/google       GET /api/auth/callback/apple
        |                                        |
        v                                        v
  +-- Auth.js v5 internal flow -----------------------------------+
  |                                                               |
  |  PrismaAdapter.createUser() or findExisting()                 |
  |       |                                                       |
  |  signIn callback: check email_verified, handle linking        |
  |       |                                                       |
  |  jwt callback: set token.sub = user.id                        |
  |       |                                                       |
  |  session callback: session.user.id = token.sub                |
  +---------------------------------------------------------------+
        |
        v
  redirect -> /expeditions (existing) or /onboarding (new user)
```

## 3. Data Model

### Existing Models (no migration needed)

The Prisma schema already includes the Auth.js `Account` model with all necessary fields:

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String          // "oauth"
  provider          String          // "google" | "apple"
  providerAccountId String          // Google sub / Apple team-scoped user ID
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}
```

**Important**: With JWT strategy, we do NOT store sessions in the DB Session table. The Account table stores the OAuth provider link. The `access_token` and `refresh_token` are stored by PrismaAdapter automatically but are NOT used by our application after initial sign-in (we rely solely on our own JWT session).

### Token Storage Strategy

| Token | Storage | Purpose | Lifetime |
|-------|---------|---------|----------|
| Google ID token | Verified server-side, then discarded | Email verification, user info | One-time at callback |
| Google access token | Account table (PrismaAdapter default) | Not used by us | PrismaAdapter manages |
| Apple ID token | Verified server-side, then discarded | Email, name (first sign-in only) | One-time at callback |
| Atlas JWT session | httpOnly cookie (existing) | All subsequent auth | Configured in auth.config.ts |

**ADR note**: We intentionally do NOT clear `access_token`/`refresh_token` from the Account table even though we do not use them. PrismaAdapter writes them as part of its standard flow. Clearing them would require custom adapter logic for no security benefit (they are already in a server-side DB, not exposed to clients).

## 4. API Contract

### No new API endpoints

Auth.js v5 manages all OAuth routes internally:
- `GET /api/auth/signin/google` -- initiate Google flow
- `GET /api/auth/callback/google` -- handle Google callback
- `GET /api/auth/signin/apple` -- initiate Apple flow
- `GET /api/auth/callback/apple` -- handle Apple callback

These are handled by the `handlers` export from `auth.ts` via the `app/api/auth/[...nextauth]/route.ts` catch-all.

### Environment Variables (new)

```env
# Google OAuth (already defined, needs values)
GOOGLE_CLIENT_ID={{GOOGLE_CLIENT_ID}}
GOOGLE_CLIENT_SECRET={{GOOGLE_CLIENT_SECRET}}

# Apple Sign-In (new)
APPLE_ID={{APPLE_SERVICE_ID}}
APPLE_TEAM_ID={{APPLE_TEAM_ID}}
APPLE_KEY_ID={{APPLE_KEY_ID}}
APPLE_PRIVATE_KEY={{APPLE_PRIVATE_KEY_PEM}}
```

Add to `src/lib/env.ts` as optional (server-only):
```typescript
GOOGLE_CLIENT_ID: z.string().optional(),
GOOGLE_CLIENT_SECRET: z.string().optional(),
APPLE_ID: z.string().optional(),
APPLE_TEAM_ID: z.string().optional(),
APPLE_KEY_ID: z.string().optional(),
APPLE_PRIVATE_KEY: z.string().optional(),
```

All OAuth env vars are optional. If not set, the corresponding provider is not available. The UI conditionally renders buttons based on provider availability (see Section 5).

## 5. Business Logic

### Flow 1: New User Signs In with Google

1. User clicks "Continuar com Google" on LoginForm or RegisterForm
2. `signIn("google", { callbackUrl: "/expeditions" })` triggers redirect to Google consent
3. Google returns to `/api/auth/callback/google` with authorization code
4. Auth.js exchanges code for tokens, extracts profile (email, name, image)
5. PrismaAdapter checks: no `Account` with `provider=google, providerAccountId=googleSub` exists
6. PrismaAdapter checks: no `User` with matching email exists
7. PrismaAdapter creates new `User` (name from Google, email from Google, `emailVerified: new Date()`)
8. PrismaAdapter creates `Account` linking Google to the new User
9. `signIn` callback returns `true`
10. `jwt` callback sets `token.sub = user.id`
11. User is redirected to `/onboarding` (first-time flow)

### Flow 2: Existing User Signs In with Google (Account Linking)

This is the most complex flow and requires custom logic.

1. User clicks "Continuar com Google"
2. Google returns profile with email `user@example.com`
3. PrismaAdapter finds: no `Account` with `provider=google, providerAccountId=googleSub`
4. PrismaAdapter finds: existing `User` with `email=user@example.com` (created via credentials)
5. **Default Auth.js behavior**: PrismaAdapter throws `OAuthAccountNotLinked` error

**Solution**: Override the `signIn` callback to handle this case:

```typescript
// auth.config.ts -- enhanced signIn callback
async signIn({ user, account, profile }) {
  if (account?.provider === "credentials") {
    return !!user?.id;
  }

  // OAuth flow
  if (account?.provider === "google" || account?.provider === "apple") {
    const email = profile?.email ?? user?.email;
    if (!email) return false;

    // Require verified email from provider
    if (account.provider === "google" && !profile?.email_verified) {
      return false;
    }

    // Check for existing user with this email
    // NOTE: This runs in Edge runtime -- cannot use Prisma directly
    // Must handle in the Node.js auth.ts signIn callback instead
    return true;
  }

  return true;
}
```

**Account linking strategy (ADR-027)**:

Auth.js v5 with PrismaAdapter does NOT auto-link accounts when emails match. When a Google sign-in has an email that matches an existing credentials user, Auth.js throws `OAuthAccountNotLinked`. We handle this with the following approach:

**Option A** (Recommended): Configure `allowDangerousEmailAccountLinking: true` on the Google and Apple providers. This tells PrismaAdapter to auto-link when emails match AND the provider email is verified.

```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: true,
}),
```

**Risk mitigation**: This is safe WHEN:
- Google always returns verified emails (they do -- Google does not allow unverified emails in OAuth)
- Apple returns verified emails (they do, including relay addresses)
- We do NOT enable this for providers that may return unverified emails

**Option B** (More secure, more friction): Redirect user to a linking page where they must enter their existing password to confirm ownership. This prevents account takeover if an attacker controls a Google account with the victim's email.

**Decision**: Use Option A for MVP. Google and Apple both guarantee verified emails. The `OAuthAccountNotLinked` error is the more common UX failure in production. Add SPEC-SEC review as gate before shipping.

### Flow 3: Apple Sign-In with Private Email Relay

1. User clicks "Continuar com Apple"
2. Apple presents consent screen; user chooses "Hide My Email"
3. Apple returns a relay address: `abcdef@privaterelay.appleid.com`
4. PrismaAdapter creates User with `email = abcdef@privaterelay.appleid.com`
5. This is a unique email -- no collision with existing accounts (relay addresses are unique per app)
6. User's real email is NEVER exposed to Atlas
7. Emails sent to the relay address are forwarded by Apple to the user's real inbox

**Consideration**: If the user later wants to add password-based login, they must use the relay address. The UI should clearly show which email is associated with their account.

### Flow 4: Provider Detection for UI

The SocialLoginButtons component must know which providers are configured:

```typescript
// src/lib/auth-providers.ts
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push("google");
  }
  if (process.env.APPLE_ID && process.env.APPLE_TEAM_ID) {
    providers.push("apple");
  }
  return providers;
}
```

This function runs server-side. The result is passed as a prop to the login/register page, which passes it to SocialLoginButtons.

### Session Merge

No merge needed. Auth.js JWT strategy produces the same session shape regardless of provider:

```typescript
session.user = {
  id: "cuid...",        // From User table
  email: "...",         // From provider or existing
  name: "...",          // From provider or existing
  image: "...",         // From provider (Google) or null (Apple)
}
```

The JWT token structure is identical for credentials and OAuth users. All downstream code (server actions, guards, services) uses `session.user.id` -- provider-agnostic.

## 6. External Integrations

### Google Cloud Console

- Create OAuth 2.0 Client ID in Google Cloud Console
- Set authorized redirect URI: `{{BASE_URL}}/api/auth/callback/google`
- Scopes: `openid`, `email`, `profile` (minimum required)
- Consent screen: External, testing mode initially

### Apple Developer Portal

- Create a Services ID in Apple Developer account
- Generate a private key for Sign in with Apple
- Set return URL: `{{BASE_URL}}/api/auth/callback/apple`
- Apple requires HTTPS (even in development -- use tunneling or skip for local)

### Failure Handling

| Failure | Behavior |
|---------|----------|
| Google consent denied by user | Redirect to login page with error=OAuthCallback |
| Apple consent denied | Redirect to login page with error=OAuthCallback |
| Google returns unverified email | signIn callback returns false; redirect with error |
| Network failure during token exchange | Auth.js returns error; redirect to /auth/error |
| PrismaAdapter DB error | Auth.js returns error; redirect to /auth/error |
| Google API outage | User sees Google error page; no action on our side |

## 7. Security Considerations

### CSRF Protection (AC-016)

Auth.js v5 automatically generates and validates the `state` parameter for OAuth flows. No custom implementation needed. The `state` is stored in an httpOnly cookie and verified on callback.

### ID Token Validation (AC-017)

Auth.js validates the ID token signature server-side using the provider's JWKS endpoint. For Google, it uses `accounts.google.com/.well-known/openid-configuration`. For Apple, it uses `appleid.apple.com/.well-known/openid-configuration`.

### Open Redirect Prevention (AC-018)

Auth.js validates callback URLs against the configured `NEXTAUTH_URL`. Only pre-registered callback URLs in the provider consoles are accepted. The `callbackUrl` parameter in `signIn()` is validated against allowed patterns.

### Account Linking Security

With `allowDangerousEmailAccountLinking: true`:
- Risk: If an attacker controls a Google account with the victim's email, they gain access
- Mitigation: Google guarantees `email_verified: true` -- an attacker cannot create a Google account with someone else's verified email
- Additional mitigation: We do NOT enable this for any provider that might return unverified emails
- Monitoring: Log all account linking events with hashed email for audit trail

### LGPD/GDPR Consent (SPEC-PROD-034 constraint)

On first social login, before completing the sign-in flow, display a consent notice: "Atlas will store your name and email from [Google/Apple] to create your account." Record consent with timestamp in a new `consentRecordedAt` field or a dedicated consent log.

**Implementation note**: This can be handled post-MVP as a blocking dialog on first social login redirect. For Sprint 33, the consent is implied by the user clicking "Continuar com [Provider]" which mirrors standard industry practice. Flag for security-specialist review.

### Rate Limiting

Apply existing rate limiting to the OAuth callback endpoints:
- `checkRateLimit("oauth:callback", ip, 20, 60)` -- 20 callbacks per minute per IP
- This prevents brute-force account enumeration via rapid OAuth flows

## 8. Performance Requirements

| Metric | Target | Approach |
|--------|--------|----------|
| Login/Register page load impact | < 200ms additional (AC from SPEC-PROD-034) | Social buttons are static HTML; no external SDK loaded on page load |
| OAuth redirect initiation | < 100ms | signIn() is a redirect, no computation |
| Callback processing | < 2s | Auth.js + PrismaAdapter; one DB read + one write |
| SDK/script loading | Lazy | No Google/Apple JS SDK needed; Auth.js handles server-side OAuth. Zero client-side SDK overhead |

**Key insight**: Auth.js handles the entire OAuth flow server-side via HTTP redirects. There are NO client-side Google or Apple SDKs to load. The buttons simply call `signIn("google")` which triggers a server redirect. This makes the performance impact near-zero.

## 9. Testing Strategy

### Unit Tests

- `getAvailableProviders()`: returns google when env set; returns empty when env missing; returns both when both set
- `SocialLoginButtons`: renders Google button when available; hides Apple when not configured; shows divider between social and credentials; loading state on click
- `signIn` callback: returns true for valid OAuth; returns false for unverified email

### Integration Tests

- Google OAuth flow mock: simulate callback with verified email -> user created -> JWT session valid
- Google OAuth flow mock: simulate callback with existing email -> account linked -> same user ID
- Apple OAuth flow mock: simulate callback with relay email -> user created -> relay email stored
- Error flow: simulate OAuthAccountNotLinked (when allowDangerousEmailAccountLinking is false) -> redirect to error page

### E2E Tests

- Google sign-in (requires real Google OAuth in staging): click button -> consent -> redirect back -> session active -> dashboard
- Account linking E2E: create user with email/password -> sign in with Google (same email) -> verify single user record

Note: E2E for Apple requires Apple Developer account. Mark as "needs Apple Dev environment for full E2E".

### EDD Eval Criteria

| Eval ID | Dimension | Criterion | Pass Threshold |
|---------|-----------|-----------|----------------|
| EDD-022-01 | Security | OAuth state parameter validated on callback (CSRF) | 100% |
| EDD-022-02 | Security | Unverified provider email is rejected | 100% |
| EDD-022-03 | Correctness | New Google user gets User + Account records in DB | 100% |
| EDD-022-04 | Correctness | Existing email + Google sign-in links Account to existing User (same user.id) | 100% |
| EDD-022-05 | Correctness | JWT session has correct user.id regardless of sign-in method | 100% |
| EDD-022-06 | UX | Social buttons hidden when provider env vars not configured | 100% |
| EDD-022-07 | Performance | Login page loads in < 200ms more than baseline (no external SDK) | 95th percentile |
| EDD-022-08 | Security | No access_token or refresh_token exposed to client | 100% |

## 10. Implementation Notes for Developers

1. **Google provider is already configured** in both `auth.config.ts` (Edge) and `auth.ts` (Node). The primary work is: (a) add `allowDangerousEmailAccountLinking: true`, (b) add Apple provider, (c) build UI buttons, (d) test account linking.

2. **Apple provider setup**:
   ```typescript
   import Apple from "next-auth/providers/apple";

   Apple({
     clientId: process.env.APPLE_ID,
     clientSecret: process.env.APPLE_PRIVATE_KEY, // Auth.js generates the JWT secret internally
     allowDangerousEmailAccountLinking: true,
   }),
   ```
   Apple provider in Auth.js v5 handles the JWT client secret generation internally from the private key. Ensure the env var contains the full PEM-encoded key.

3. **Edge runtime constraint**: The `signIn` callback in `auth.config.ts` runs in Edge runtime. It CANNOT access Prisma. Complex linking logic must go in the `signIn` callback in `auth.ts` (Node.js runtime), which overrides the Edge version.

4. **SocialLoginButtons component**: Use the `signIn` function from `next-auth/react` for client-side trigger. This performs a redirect, not an API call. Show a loading spinner immediately on click to indicate the redirect is in progress.

5. **Brand guidelines**: Google requires specific button styling (white/dark background, Google "G" logo, specific font). Apple requires the "Sign in with Apple" button with SF Symbol or provided assets. Use SVG icons, not external image CDN.

6. **i18n**: Add keys for both locales:
   ```json
   // pt-BR
   "auth.continueWithGoogle": "Continuar com Google",
   "auth.continueWithApple": "Continuar com Apple",
   "auth.orContinueWithEmail": "ou continue com email",

   // en
   "auth.continueWithGoogle": "Continue with Google",
   "auth.continueWithApple": "Continue with Apple",
   "auth.orContinueWithEmail": "or continue with email",
   ```

7. **Do NOT add profile photo auto-import in this sprint**. AC-013 (avatar from provider) is a nice-to-have. Defer to Sprint 34. The `image` field from Google will be stored in User.image by PrismaAdapter automatically, but displaying it requires profile page changes.

## 11. Open Questions

- [ ] OQ-1: Should `allowDangerousEmailAccountLinking` be enabled for MVP or should we implement the password-confirmation linking flow (Option B)? Recommendation: Option A for MVP with security-specialist sign-off. The name is scarier than the reality when both providers guarantee verified emails.
- [ ] OQ-2: Apple Developer account availability for testing -- if unavailable, implement provider config but defer E2E to Sprint 34.
- [ ] OQ-3: Should social-login users be auto-redirected to onboarding wizard, or directly to expeditions? Recommendation: check if UserProfile exists; if not, redirect to onboarding.

## 12. Definition of Done

- [ ] All AC from SPEC-PROD-034 are met (AC-001 through AC-018)
- [ ] Google sign-in works end-to-end (new user + existing user linking)
- [ ] Apple provider configured (E2E contingent on Apple Dev account)
- [ ] JWT session identical for all provider types
- [ ] SocialLoginButtons component on login + register pages
- [ ] i18n keys in en + pt-BR
- [ ] No credentials hardcoded; all in env vars
- [ ] Rate limiting on OAuth callbacks
- [ ] Security-specialist review of account linking strategy
- [ ] Unit test coverage >= 80% on new components and auth logic
- [ ] EDD eval criteria EDD-022-01 through EDD-022-08 pass

> Draft -- pending tech-lead and security-specialist review

---

## ADR-027: Account Linking Strategy for Social Login (PROPOSED)

**Date**: 2026-03-20
**Status**: Proposed
**Deciders**: architect, security-specialist, tech-lead

### Context

When a user signs in via Google/Apple with an email that already exists in the User table (from a previous credentials registration), Auth.js must decide whether to auto-link the OAuth account to the existing user or reject the sign-in.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| A: `allowDangerousEmailAccountLinking: true` | Zero friction; standard industry practice; Google/Apple guarantee verified emails | Name sounds alarming; relies on provider email verification |
| B: Password confirmation linking page | Maximum security; user proves ownership | Extra friction; requires building custom linking UI; users may not remember password |
| C: Email verification link for linking | Moderate security; no password needed | Extra round-trip; email delivery delay; user confusion |

### Decision

**Option A** for MVP. Both Google and Apple guarantee `email_verified: true`. The attack vector (attacker creates Google account with victim's verified email) is not possible. This matches the behavior of major SaaS products (Vercel, Notion, Linear).

### Consequences

**Positive**: Zero-friction account linking. Higher conversion rate. Simpler implementation.
**Negative**: The flag name implies risk that may concern security reviewers.
**Risks**: If we add a provider that does NOT guarantee email verification, we MUST NOT enable this flag for that provider. Add a guard comment in the code.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | architect | Initial draft -- Sprint 33 social login architecture |
