# SPEC-INFRA-005: Sprint 34 Infrastructure

**Version**: 1.0.0
**Status**: Draft
**Author**: devops-engineer
**Reviewers**: tech-lead, architect
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Scope

Infrastructure changes for Sprint 34. Primarily OAuth environment variable configuration.

## 2. OAuth Environment Variables

### Google (already configured)

| Variable | Source | Required |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs | Yes (for Google login) |
| `GOOGLE_CLIENT_SECRET` | Same as above | Yes (for Google login) |

**Redirect URI to register**: `https://{domain}/api/auth/callback/google`

### Apple (new)

| Variable | Source | Required |
|---|---|---|
| `APPLE_ID` | Apple Developer > Certificates, Identifiers & Profiles > Identifiers > Services IDs | Yes (for Apple login) |
| `APPLE_TEAM_ID` | Apple Developer > Account > Membership > Team ID | Yes (for Apple login) |
| `APPLE_PRIVATE_KEY` | Apple Developer > Keys > Create Key (Sign in with Apple) > Download .p8 file, paste contents | Yes (for Apple login) |
| `APPLE_KEY_ID` | Apple Developer > Keys > Key ID shown after creation | Yes (for Apple login) |

**Redirect URI to register**: `https://{domain}/api/auth/callback/apple`

**Note**: Apple requires HTTPS for all redirect URIs, including development. For local testing, use a tunneling service (ngrok, Cloudflare Tunnel) or skip Apple testing locally.

## 3. No New Services

- No new Docker containers
- No new databases
- No new third-party SaaS
- No schema migrations
- No new CI/CD pipeline changes

## 4. Environment Parity

All OAuth env vars must be present in:
- `.env.local` (local development)
- Staging environment (Vercel/hosting preview)
- Production environment

Google and Apple vars are optional at build time (app still functions with email+password login if vars are absent).

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
