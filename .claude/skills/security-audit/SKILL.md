# Security Audit

## Description
Automated security scanner for secrets, auth patterns, LGPD compliance, and dependencies.

## Triggers
- Before merging a PR
- During sprint review
- User asks about security concerns
- CI/CD security gate

## Commands
```bash
npm run security       # Full security scan with report
npm run security:ci    # CI mode (exit code 1 on CRITICAL)
```

## Categories

### Secrets (CRITICAL)
- console.log/debug with password, token, secret, apiKey
- Hardcoded API keys (strings > 20 chars assigned to key/token/secret vars)
- Connection strings with passwords in code
- Private keys (BEGIN PRIVATE KEY)
- .env files not in .gitignore

### Auth (HIGH)
- API routes without auth middleware
- Passwords stored without hashing
- bcrypt with salt rounds < 10
- Cookies without httpOnly
- CORS with origin: "*"

### LGPD/GDPR (HIGH)
- No account deletion functionality
- No data export capability
- No privacy policy reference
- No consent mechanism

### Dependencies
- npm audit critical/high vulnerabilities
- Deprecated packages
