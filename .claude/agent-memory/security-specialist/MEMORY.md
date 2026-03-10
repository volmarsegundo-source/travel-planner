# Security Specialist Memory -- Travel Planner (Atlas)

## Reviews Completed
- **Sprint 18** (2026-03-09): T-S18-002-007 -- APPROVED WITH CONDITIONS
  - Report: `docs/security/SPRINT-18-SECURITY-REVIEW.md`
  - All 3 Sprint 17 conditions RESOLVED (SEC-S17-003/004/005)
  - SEC-S18-001 (MEDIUM): ItineraryDay, Activity, ChecklistItem not cleaned on account deletion
  - SEC-S18-002 (LOW): AbortSignal.timeout missing in streaming provider
  - SEC-S18-003 (LOW): Security headers missing on streaming SSE response
  - SEC-S18-004 (LOW): Streaming rate limit key differs from server action (double quota)
  - Functional note: Phase6Wizard sends flat body, API expects nested {tripId, params:{...}}
- **Sprint 17** (2026-03-09): T-S17-001, 002, 004, 005, 008, 009 -- APPROVED WITH CONDITIONS
  - Report: `docs/security/SPRINT-17-SECURITY-REVIEW.md`
  - 3 conditions ALL RESOLVED in Sprint 18
- **Sprint 16** (2026-03-09): T-S16-004, T-S16-005, T-S16-006 -- APPROVED
  - Report: `docs/security/SPRINT-16-SECURITY-REVIEW.md`

## Active Security Findings
### MEDIUM
- SEC-S18-001: ItineraryDay, Activity, ChecklistItem not cleaned on account deletion (LGPD gap)
- DT-010: TrustSignals.tsx uses next/link instead of @/i18n/navigation
- Redis singleton not persisted in globalThis in production (connection leak risk)

### LOW
- SEC-S18-002: AbortSignal.timeout missing in generateStreamingResponse (claude.provider.ts)
- SEC-S18-003: Security headers (X-Content-Type-Options) missing on streaming SSE response
- SEC-S18-004: Rate limit key `ai:plan:stream:` vs `ai:plan:` allows double quota
- SEC-S17-001: Computed property name in profile.actions.ts upsert (mitigated by validation)
- SEC-S17-002: Controlled spread in profile.service.ts upsert create
- SEC-S16-003 to SEC-S16-007: Regex refinements, phone pattern gaps, passport false positives

## Resolved in Sprint 18
- SEC-S17-003 (MEDIUM): UserProfile + gamification data not cleaned -- RESOLVED (T-S18-002)
- SEC-S17-004 (MEDIUM): trip.actions.ts raw userId in logs -- RESOLVED (T-S18-003)
- SEC-S17-005 (MEDIUM): auth.service.ts raw userId in logs -- RESOLVED (T-S18-004)
- SEC-S17-006 (LOW): profile.service.ts raw userId in logs -- RESOLVED (T-S18-005)

## Resolved in Sprint 17
- DT-004 (pre-Sprint 2): updateTrip mass assignment -- RESOLVED (T-S17-001, explicit whitelist)
- SEC-S16-001: Cyrillic homoglyphs bypass NFKD -- RESOLVED (T-S17-008, transliteration map)
- apiKey empty string guard -- RESOLVED (T-S17-009)
- Zod server-side AI params -- RESOLVED (T-S17-005)
- OAuth cleanup on deletion -- RESOLVED (T-S17-002, deleteMany in transaction)

## Security Architecture (Sprint 18+)
- **Mass assignment defense:** All Prisma .create/.update use explicit field lists (not spread)
- **Account deletion flow:** $transaction: deleteMany(Account, Session, UserProfile, UserBadge, PointTransaction, UserProgress) -> trip-dependent deletes (ExpeditionPhase, PhaseChecklistItem, ItineraryPlan, DestinationGuide) -> soft-delete(User) -> cascade soft-delete(Trip)
  - GAP: ItineraryDay, Activity, ChecklistItem not explicitly deleted (SEC-S18-001)
- **userId hashing:** SHA-256 truncated to 12 hex chars via src/lib/hash.ts
  - Applied in ALL logger calls across the codebase (verified Sprint 18 codebase-wide grep)
- **AI params validation:** Zod schemas in src/lib/validations/ai.schema.ts
  - Applied BEFORE rate limit check (saves quota on invalid requests)
  - Zod strips unknown fields by default (prevents mass assignment via params)
- **Injection guard pipeline:** sanitizeForPrompt -> maskPII -> AI service
  - NFKD -> strip combining marks -> Cyrillic transliteration -> regex matching
  - 23 Cyrillic homoglyphs mapped (lowercase + uppercase)
- **Anthropic guard:** apiKey checked for empty/whitespace before singleton init (claude.provider.ts:20-29)
- **Streaming endpoint:** POST /api/ai/plan/stream with full defense-in-depth
  - Auth -> Zod -> Rate limit -> BOLA -> Age guard -> Injection -> PII mask -> Stream
  - SSE format: `data: {chunk}\n\n` + `data: [DONE]\n\n`
  - No internal IDs, error stacks, or API keys in stream events

## Key File Locations
- Injection guard: `src/lib/prompts/injection-guard.ts`
- PII masker: `src/lib/prompts/pii-masker.ts`
- Hash utility: `src/lib/hash.ts`
- AI schemas: `src/lib/validations/ai.schema.ts`
- AI actions: `src/server/actions/ai.actions.ts`
- Account actions: `src/server/actions/account.actions.ts`
- Trip actions: `src/server/actions/trip.actions.ts`
- Expedition actions: `src/server/actions/expedition.actions.ts`
- Profile actions: `src/server/actions/profile.actions.ts`
- Trip service: `src/server/services/trip.service.ts`
- Profile service: `src/server/services/profile.service.ts`
- Auth service: `src/server/services/auth.service.ts`
- Claude provider: `src/server/services/providers/claude.provider.ts`
- Streaming API route: `src/app/api/ai/plan/stream/route.ts`
- Security reviews: `docs/security/`

## LGPD Compliance Notes
- PII masker uses `[TYPE-REDACTED]` -- non-reversible, LGPD-safe
- Account deletion: OAuth tokens, sessions, UserProfile (encrypted PII), gamification data all cleaned
- GAP: ItineraryDay, Activity, ChecklistItem remain orphaned after soft-delete (SEC-S18-001)
- CPF, email, phone BR, credit card, passport patterns covered in PII masker

## Patterns to Enforce
- Every field in AI prompts MUST pass through sanitizeForPrompt + maskPII
- Injection check BEFORE PII masking (correct order)
- Global regex patterns: ALWAYS reset lastIndex before test() and replace()
- NFKD normalization + Cyrillic transliteration: apply before ALL regex-based security checks
- Error messages from security guards: NEVER include pattern details or input content
- Log payloads: NEVER include raw user input -- always mask via maskPII() first
- All Prisma create/update: explicit field mapping, never spread user input
- userId in logs: always use hashUserId() from src/lib/hash.ts
- Streaming endpoints: apply full defense-in-depth chain (auth, Zod, rate limit, BOLA, age guard, injection, PII mask)
- SSE responses: only emit text content, never internal IDs or error details
- API route responses: include security headers even when middleware skips /api routes
