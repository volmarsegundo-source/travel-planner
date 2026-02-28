# Dev Environment Setup & Verification

## Description
Skill for preparing, verifying, and troubleshooting the Travel Planner development environment.

## Triggers
- User asks to set up the dev environment
- User reports "can't connect to database" or similar infra issues
- User wants to run manual tests
- New developer onboarding
- After pulling a branch with migrations

## Architecture

```
Docker Compose
├── PostgreSQL 16   → port 5432
└── Redis 7         → port 6379

Next.js 15 (Turbopack)
├── App Router      → port 3000
├── Prisma ORM      → DATABASE_URL
└── ioredis          → REDIS_URL
```

## Pre-Flight Checklist

1. Docker Desktop is running
2. Run `docker compose up -d` from project root
3. Verify ports: PostgreSQL (5432), Redis (6379)
4. Copy `.env.example` to `.env.local` (if not done)
5. Run `npm run dev:setup` — handles migrations + seed + users

## Quick Commands

```bash
npm run dev:setup    # Full setup: Docker check + migrations + users + trips
npm run dev:check    # Health check only (read-only)
npm run dev:reset    # Nuclear option: destroy volumes, recreate everything
npm run dev:users    # Create/verify test users only
npm run dev          # Start Next.js dev server
```

## Test Users

| Name        | Email                  | Password    | Purpose                           |
|-------------|------------------------|-------------|-----------------------------------|
| Test User   | testuser@travel.dev    | Test@1234   | Standard user flow                |
| Power User  | poweruser@travel.dev   | Test@1234   | User with preloaded trips         |
| New User    | newuser@travel.dev     | Test@1234   | Clean account, no data            |
| Admin User  | admin@travel.dev       | Admin@1234  | Administrative features           |

All passwords are hashed with bcrypt (12 rounds). All users have `emailVerified` set.

## Manual Test Flows

### Flow 1: New User Registration
1. Open http://localhost:3000 (landing page)
2. Click "Get Started" → should navigate to /auth/register
3. Fill: name, email (unique), password (8+ chars), confirm password
4. Click "Create account"
5. Should redirect to /trips (or /onboarding)
6. Verify: user appears in database

### Flow 2: Returning User Login
1. Open http://localhost:3000
2. Click "Login" in header → should navigate to /auth/login
3. Enter: testuser@travel.dev / Test@1234
4. Click "Sign in"
5. Should redirect to /trips
6. Verify: session cookie is set, trips page loads

### Flow 3: Language Switching (i18n)
1. Open http://localhost:3000 (default: pt-BR)
2. Click "EN" in language switcher
3. Verify: URL changes to /en, all text switches to English
4. Click "PT" in language switcher
5. Verify: URL returns to /, all text switches to Portuguese
6. Navigate to login → verify auth page text matches selected locale

### Flow 4: Edge Cases & Error Handling
1. Try accessing /trips without login → should redirect to /auth/login
2. Try accessing /dashboard without login → should redirect to /auth/login
3. Try logging in with wrong password → should show error message
4. Try registering with existing email → should show error
5. Open landing page while logged in → should redirect to /trips
6. After logout → should redirect to landing page

## Troubleshooting

### "Docker is not running"
- Open Docker Desktop and wait for it to start
- On Windows: check Docker Desktop in system tray
- Run `docker info` to verify

### "PostgreSQL is NOT reachable on port 5432"
- Check: `docker compose ps` — container should be "healthy"
- Check: `docker compose logs postgres` for errors
- Try: `docker compose restart postgres`
- Port conflict: `netstat -ano | findstr :5432` (Windows)

### "Redis is NOT reachable on port 6379"
- Check: `docker compose ps`
- Try: `docker compose restart redis`
- Port conflict: `netstat -ano | findstr :6379` (Windows)

### "Prisma migration failed"
- Check DATABASE_URL in .env.local
- Try: `npx prisma migrate reset` (WARNING: destroys data)
- Check: `npx prisma migrate status`

### "Cannot find module '@prisma/client'"
- Run: `npx prisma generate`

### "AUTH_SECRET is required"
- Add to .env.local: `AUTH_SECRET=<32+ char random string>`
- Also add: `NEXTAUTH_SECRET=<same value>`

### "Login succeeds but redirects to login again"
- Check AUTH_SECRET matches between server and middleware
- Check cookies in browser DevTools → Application → Cookies
- Verify signIn callback in auth.config.ts

## Post-Sprint Checklist

- [ ] `npm test` — all tests pass
- [ ] `npm run dev:setup` — executes without errors
- [ ] `npm run dev` — server starts without errors
- [ ] Landing page loads with header, hero, features, footer
- [ ] "Get Started" navigates to register
- [ ] "Login" navigates to login
- [ ] Language switcher works (EN ↔ PT)
- [ ] Registration creates user successfully
- [ ] Login with test user works
- [ ] Trips page loads after login
- [ ] Logout redirects to landing page
- [ ] Dashboard without auth redirects to login
- [ ] No errors in browser console
- [ ] Responsive layout (375px, 768px, 1440px)
