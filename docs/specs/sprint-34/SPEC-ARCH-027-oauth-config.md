# Technical Specification: OAuth Configuration — Google + Apple

**Spec ID**: SPEC-ARCH-027
**Related Stories**: SPEC-PROD-034, SPEC-UX-040
**Author**: architect
**Status**: Draft
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Overview

This spec documents the OAuth provider configuration for Google (already configured) and Apple (to be added) using Auth.js v5. It covers environment variables, redirect URIs, account linking strategy, and the Edge-safe architecture split between `auth.config.ts` and `auth.ts`.

### Current State

From `src/lib/auth.config.ts` (Edge-safe):
- **Google provider**: Already configured with `clientId` and `clientSecret` from env vars
- **Credentials provider**: Configured (authorize function in `auth.ts`)
- **Apple provider**: Not configured

From `src/lib/auth.ts` (Node.js-only):
- Uses `PrismaAdapter` for user/account persistence
- JWT strategy (no DB session round-trip in middleware)
- Google provider duplicated here with same env vars
- `authorize` function for Credentials with bcrypt password comparison

## 2. Google Provider — Verification

Google OAuth is already functional. Verification checklist:

- [x] `Google` imported from `next-auth/providers/google` in both files
- [x] `clientId: process.env.GOOGLE_CLIENT_ID`
- [x] `clientSecret: process.env.GOOGLE_CLIENT_SECRET`
- [x] Provider listed in both `auth.config.ts` (Edge) and `auth.ts` (Node.js)
- [ ] Redirect URI configured in Google Cloud Console (see Section 4)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` present in `.env.local`

### Google Cloud Console Settings

- **Authorized redirect URI**: `https://{domain}/api/auth/callback/google`
- **For local dev**: `http://localhost:3000/api/auth/callback/google`
- **Scopes**: `openid`, `email`, `profile`

## 3. Apple Provider — Setup

### Auth.js Configuration

Add Apple provider to both files:

**`auth.config.ts`** (Edge-safe):
```typescript
import Apple from "next-auth/providers/apple";

export default {
  providers: [
    Google({ ... }),
    Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    }),
    Credentials({}),
  ],
  // ...
} satisfies NextAuthConfig;
```

**`auth.ts`** (Node.js-only):
```typescript
import Apple from "next-auth/providers/apple";

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({ ... }),
    Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    }),
    Credentials({ async authorize(credentials) { ... } }),
  ],
});
```

### Apple Developer Portal Settings

1. **Sign in with Apple** capability enabled on App ID
2. **Services ID** created for web authentication
3. **Redirect URI**: `https://{domain}/api/auth/callback/apple`
4. **Private Key**: Generated and downloaded (`.p8` file)

### Apple Client Secret Generation

Apple requires a JWT-based client secret (not a static string). Auth.js v5 handles this automatically when provided with:

```
APPLE_ID=com.example.travelplanner      # Services ID
APPLE_TEAM_ID=XXXXXXXXXX                # Team ID from Apple Developer
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_KEY_ID=XXXXXXXXXX                 # Key ID from downloaded .p8 key
```

Note: Auth.js v5's Apple provider internally generates the client secret JWT from these env vars.

## 4. Environment Variables Checklist

| Variable | Required For | Where to Get |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Same as above |
| `APPLE_ID` | Apple Sign In | Apple Developer > Certificates, Identifiers & Profiles > Identifiers > Services IDs |
| `APPLE_TEAM_ID` | Apple Sign In | Apple Developer > Account > Membership > Team ID |
| `APPLE_PRIVATE_KEY` | Apple Sign In | Apple Developer > Keys > Create Key (Sign in with Apple) > Download .p8 |
| `APPLE_KEY_ID` | Apple Sign In | Apple Developer > Keys > Key ID shown after creation |

### `.env.local` Template

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Apple Sign In
APPLE_ID=
APPLE_TEAM_ID=
APPLE_PRIVATE_KEY=
APPLE_KEY_ID=
```

### `src/lib/env.ts` Updates

Apple env vars should be added as optional (like Google vars) to avoid breaking builds for developers who don't have Apple credentials:

```typescript
APPLE_ID: z.string().optional(),
APPLE_TEAM_ID: z.string().optional(),
APPLE_PRIVATE_KEY: z.string().optional(),
APPLE_KEY_ID: z.string().optional(),
```

## 5. Account Linking

### Strategy: `allowDangerousEmailAccountLinking`

When a user signs up with email+password, then later tries Google/Apple login with the same email, Auth.js v5 throws `OAuthAccountNotLinked` by default. To enable automatic linking:

```typescript
// In auth.ts
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: true,
}),
Apple({
  clientId: process.env.APPLE_ID,
  clientSecret: process.env.APPLE_SECRET,
  allowDangerousEmailAccountLinking: true,
}),
```

**Security trade-off**: This auto-links accounts based on email match. It assumes the OAuth provider has verified the email. Both Google and Apple verify emails, so this is safe for these providers. Do NOT enable this for providers that don't verify emails.

### Alternative: Manual Linking

If `allowDangerousEmailAccountLinking` is not used, the error flow is:
1. User attempts OAuth login with existing email
2. Auth.js throws `OAuthAccountNotLinked`
3. User is redirected to `/auth/error?error=OAuthAccountNotLinked`
4. UI shows instructions to login with email+password first, then link in settings

The UX spec (SPEC-UX-040) defines the UI for both flows.

## 6. Redirect URI Format

```
https://{domain}/api/auth/callback/{provider}
```

| Environment | Google Callback | Apple Callback |
|---|---|---|
| Local | `http://localhost:3000/api/auth/callback/google` | `http://localhost:3000/api/auth/callback/apple` |
| Staging | `https://staging.atlas.travel/api/auth/callback/google` | `https://staging.atlas.travel/api/auth/callback/apple` |
| Production | `https://atlas.travel/api/auth/callback/google` | `https://atlas.travel/api/auth/callback/apple` |

**Important**: Apple requires HTTPS even for development. Use a tunnel (ngrok, Cloudflare Tunnel) for local Apple testing.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
