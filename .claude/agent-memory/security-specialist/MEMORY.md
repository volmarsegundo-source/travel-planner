# Security Specialist Memory -- Travel Planner (Atlas)

## Reviews Completed
- **Sprint 20** (2026-03-10): T-S20-003, T-S20-004/005, T-S20-006, T-S20-009, T-S20-011 -- APPROVED
  - Report: `docs/security/SPRINT-20-SECURITY-REVIEW.md`
  - SEC-S19-001 (LOW) RESOLVED: all 9 raw userId in gamification engines now use hashUserId()
  - Profile persistence: BOLA via session.user.id, no sensitive fields in client props
  - Preferences: Zod enums prevent arbitrary value injection, idempotent point awards
  - Passengers: Zod schema validates structure, refinement ensures ages.length === count
  - Transport/Accommodation: onDelete Cascade + explicit deletion in account transaction
  - Booking codes: schema ready for AES-256-GCM (bookingCodeEnc field), encryption in Sprint 21
- **Sprint 19** (2026-03-10): T-S19-001a/b/c, T-S19-002, T-S19-003, T-S19-008 -- APPROVED
  - Report: `docs/security/SPRINT-19-SECURITY-REVIEW.md`
  - SEC-S18-001 (MEDIUM) RESOLVED: cascade deletion now covers Activity, ItineraryDay, ChecklistItem
  - SEC-S19-001 (LOW): raw userId in phase-engine.ts (4), points-engine.ts (4), itinerary-plan.service.ts (1) -- pre-existing debt
  - Streaming persistence: BOLA check + Zod validation + Redis lock all verified
  - Guide prompt (10 sections): no PII, no injection vectors, destination sanitized
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
- DT-010: TrustSignals.tsx uses next/link instead of @/i18n/navigation
- Redis singleton not persisted in globalThis in production (connection leak risk)

### LOW
- SEC-S17-001: Computed property name in profile.actions.ts upsert (mitigated by validation)
- SEC-S17-002: Controlled spread in profile.service.ts upsert create
- SEC-S16-003 to SEC-S16-007: Regex refinements, phone pattern gaps, passport false positives

## Resolved in Sprint 20
- SEC-S19-001 (LOW): Raw userId in gamification engine logs -- RESOLVED (T-S20-003, all 9 locations hashed)

## Resolved in Sprint 19
- SEC-S18-001 (MEDIUM): ItineraryDay, Activity, ChecklistItem not cleaned on account deletion -- RESOLVED (T-S19-003)

## Resolved in Sprint 18
- SEC-S17-003 (MEDIUM): UserProfile + gamification data not cleaned -- RESOLVED (T-S18-002)
- SEC-S17-004 (MEDIUM): trip.actions.ts raw userId in logs -- RESOLVED (T-S18-003)
- SEC-S17-005 (MEDIUM): auth.service.ts raw userId in logs -- RESOLVED (T-S18-004)
- SEC-S17-006 (LOW): profile.service.ts raw userId in logs -- RESOLVED (T-S18-005)
- SEC-S18-002 (LOW): AbortSignal.timeout -- RESOLVED within Sprint 18
- SEC-S18-003 (LOW): Security headers on SSE -- RESOLVED within Sprint 18
- SEC-S18-004 (LOW): Rate limit key mismatch -- RESOLVED within Sprint 18

## Resolved in Sprint 17
- DT-004 (pre-Sprint 2): updateTrip mass assignment -- RESOLVED (T-S17-001, explicit whitelist)
- SEC-S16-001: Cyrillic homoglyphs bypass NFKD -- RESOLVED (T-S17-008, transliteration map)
- apiKey empty string guard -- RESOLVED (T-S17-009)
- Zod server-side AI params -- RESOLVED (T-S17-005)
- OAuth cleanup on deletion -- RESOLVED (T-S17-002, deleteMany in transaction)

## Security Architecture (Sprint 19+)
- **Mass assignment defense:** All Prisma .create/.update use explicit field lists (not spread)
- **Account deletion flow:** $transaction: deleteMany(Account, Session, UserProfile, UserBadge, PointTransaction, UserProgress) -> trip-dependent deletes (Activity, ItineraryDay, ChecklistItem, ExpeditionPhase, PhaseChecklistItem, ItineraryPlan, DestinationGuide, TransportSegment, Accommodation) -> soft-delete(User) -> cascade soft-delete(Trip)
  - ALL child models now explicitly deleted -- no orphaned data (verified Sprint 20)
- **userId hashing:** SHA-256 truncated to 12 hex chars via src/lib/hash.ts
  - Applied in ALL actions, services, API routes, AND gamification engines (SEC-S19-001 RESOLVED Sprint 20)
- **AI params validation:** Zod schemas in src/lib/validations/ai.schema.ts
  - Applied BEFORE rate limit check (saves quota on invalid requests)
  - Zod strips unknown fields by default (prevents mass assignment via params)
- **Injection guard pipeline:** sanitizeForPrompt -> maskPII -> AI service
  - NFKD -> strip combining marks -> Cyrillic transliteration -> regex matching
  - 23 Cyrillic homoglyphs mapped (lowercase + uppercase)
- **Anthropic guard:** apiKey checked for empty/whitespace before singleton init (claude.provider.ts:20-29)
- **Streaming endpoint:** POST /api/ai/plan/stream with full defense-in-depth
  - Auth -> Zod -> Rate limit -> BOLA -> Age guard -> Redis lock -> Injection -> PII mask -> Stream -> Persist -> [DONE]
  - Redis lock per tripId with TTL 300s, NX atomicity, release in finally block
  - Accumulated JSON validated via Zod before persistence
  - SSE format: `data: {chunk}\n\n` + `data: [DONE]\n\n`
  - No internal IDs, error stacks, or API keys in stream events
- **Guide prompt (10 sections):** timezone, currency, language, electricity, connectivity, cultural_tips, safety, health, transport_overview, local_customs
  - Destination sanitized via injection guard + PII masker before AI call
  - Response validated via DestinationGuideContentSchema (Zod)

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
- Itinerary persistence: `src/server/services/itinerary-persistence.service.ts`
- Itinerary plan service: `src/server/services/itinerary-plan.service.ts`
- Preferences schema: `src/lib/validations/preferences.schema.ts`
- Preferences service: `src/server/services/preferences.service.ts`
- Transport schema: `src/lib/validations/transport.schema.ts`
- Trip schema (passengers): `src/lib/validations/trip.schema.ts`
- Security reviews: `docs/security/`

## LGPD Compliance Notes
- PII masker uses `[TYPE-REDACTED]` -- non-reversible, LGPD-safe
- Account deletion: OAuth tokens, sessions, UserProfile (encrypted PII), gamification data, itinerary data ALL cleaned
- No orphaned data after account deletion (verified Sprint 20 -- includes TransportSegment, Accommodation)
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
- Streaming endpoints: apply full defense-in-depth chain (auth, Zod, rate limit, BOLA, age guard, Redis lock, injection, PII mask)
- SSE responses: only emit text content, never internal IDs or error details
- API route responses: include security headers even when middleware skips /api routes
- Redis locks: use NX + EX for atomicity + TTL, release in finally block
