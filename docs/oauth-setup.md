# OAuth Setup Guide

This document describes how to configure OAuth providers (Google and Apple) for Atlas Travel Planner.

## Google OAuth

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Staging: `https://staging.yourdomain.com/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

### 2. Set Environment Variables

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Consent Screen

Configure the OAuth consent screen under **APIs & Services > OAuth consent screen**:
- App name: Atlas Travel Planner
- Scopes: `email`, `profile`, `openid`
- For production, submit for verification

---

## Apple Sign In

### 1. Configure in Apple Developer Portal

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles > Identifiers**
3. Register an App ID with **Sign In with Apple** capability
4. Create a **Services ID** (this becomes your `APPLE_ID`)
5. Configure the Services ID:
   - Add your domain(s) to **Domains and Subdomains**
   - Add return URL(s):
     - Development: `http://localhost:3000/api/auth/callback/apple`
     - Staging: `https://staging.yourdomain.com/api/auth/callback/apple`
     - Production: `https://yourdomain.com/api/auth/callback/apple`
6. Generate a **Key** with Sign In with Apple enabled
7. Generate the client secret (JWT) using the key

### 2. Generating the Apple Client Secret

Apple requires a JWT-based client secret. Use a script or library to generate it:

```bash
# Required values:
# - Team ID (from Apple Developer account)
# - Key ID (from the key you created)
# - Services ID (your APPLE_ID)
# - Private key (.p8 file downloaded when creating the key)
```

The generated JWT must be refreshed before its expiry (max 6 months).

### 3. Set Environment Variables

```bash
APPLE_ID=com.yourdomain.atlas  # Your Services ID
APPLE_SECRET=your-generated-jwt-secret
```

---

## Vercel Deployment

In your Vercel project settings, add the following environment variables:

| Variable | Environments | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Production, Preview | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Production, Preview | Google OAuth client secret |
| `APPLE_ID` | Production, Preview | Apple Services ID |
| `APPLE_SECRET` | Production, Preview | Apple JWT client secret |
| `NEXTAUTH_URL` | Production | `https://yourdomain.com` |
| `AUTH_URL` | Production | `https://yourdomain.com` |

### Redirect URI Format

The callback URL for each provider follows the pattern:

```
{NEXTAUTH_URL}/api/auth/callback/{provider}
```

Where `{provider}` is `google` or `apple`.

---

## Conditional Rendering

OAuth buttons only appear in the UI when the corresponding environment variables are set.
The server component checks for env var presence and passes `availableProviders` to the
client-side form components. If no OAuth provider is configured, only the credentials
form is displayed.

---

## Error Handling

When OAuth fails (user denies, provider error, etc.):
1. Auth.js redirects to `/auth/error?error={ErrorCode}`
2. The error page displays a localized message based on the error code
3. Auth.js error codes handled: `Configuration`, `AccessDenied`, `Verification`,
   `OAuthSignin`, `OAuthCallback`, `OAuthCreateAccount`, `OAuthAccountNotLinked`
4. LoginForm also reads `?error` from URL and shows an inline error banner
