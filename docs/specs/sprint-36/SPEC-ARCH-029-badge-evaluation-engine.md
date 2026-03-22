# SPEC-ARCH-029: Badge System Data Model + Evaluation Engine

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: tech-lead, qa-engineer, data-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**References**: SPEC-PROD-040, SPEC-UX-042, ATLAS-GAMIFICACAO-APROVADO.md Section 4

---

## 1. Problem Statement

The Atlas gamification system has ranks and PA points but no badge system. ATLAS-GAMIFICACAO-APROVADO.md defines 16 badges in 4 categories. The `UserBadge` Prisma model exists since Sprint 9 but badge evaluation logic is not implemented.

---

## 2. Data Model

### 2.1 Existing UserBadge Model (Sprint 9)

```prisma
model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badgeKey  String
  earnedAt  DateTime @default(now())

  @@unique([userId, badgeKey])
  @@index([userId])
}
```

**Assessment**: Existing model is sufficient. The `@@unique([userId, badgeKey])` constraint provides idempotency. No schema changes needed for badges.

### 2.2 Badge Progress

Badge progress (e.g., "3 of 5 expeditions") is calculated at **runtime**, not stored. This avoids stale data.

---

## 3. Badge Registry

```typescript
// src/lib/gamification/badge-registry.ts

export type BadgeCategory = "explorador" | "perfeccionista" | "aventureiro" | "veterano";

export interface BadgeDefinition {
  key: string;
  name: { en: string; "pt-BR": string };
  description: { en: string; "pt-BR": string };
  category: BadgeCategory;
  icon: string; // emoji or icon identifier
  criteria: BadgeCriteria;
}

export interface BadgeCriteria {
  type: "trip_count" | "phase_complete" | "profile" | "login_count" | "trip_type" | "language" | "time_based" | "custom";
  threshold?: number;
  evaluator: string; // function name in badge-engine
}

export const BADGE_REGISTRY: BadgeDefinition[] = [
  // Explorador (4)
  { key: "primeira_viagem", category: "explorador", criteria: { type: "trip_count", threshold: 1, evaluator: "checkTripCount" } },
  { key: "viajante_frequente", category: "explorador", criteria: { type: "trip_count", threshold: 3, evaluator: "checkTripCount" } },
  { key: "globetrotter", category: "explorador", criteria: { type: "trip_count", threshold: 5, evaluator: "checkTripCount" } },
  { key: "marco_polo", category: "explorador", criteria: { type: "trip_count", threshold: 10, evaluator: "checkTripCount" } },

  // Perfeccionista (4)
  { key: "detalhista", category: "perfeccionista", criteria: { type: "phase_complete", evaluator: "checkPhase4Complete" } },
  { key: "planejador_nato", category: "perfeccionista", criteria: { type: "phase_complete", evaluator: "checkAllPhasesComplete" } },
  { key: "zero_pendencias", category: "perfeccionista", criteria: { type: "custom", evaluator: "checkNoPendingItems" } },
  { key: "revisor", category: "perfeccionista", criteria: { type: "custom", evaluator: "checkPhaseRevisit" } },

  // Aventureiro (5)
  { key: "sem_fronteiras", category: "aventureiro", criteria: { type: "trip_type", evaluator: "checkInternationalTrip" } },
  { key: "em_familia", category: "aventureiro", criteria: { type: "trip_type", evaluator: "checkFamilyTrip" } },
  { key: "solo_explorer", category: "aventureiro", criteria: { type: "trip_type", evaluator: "checkSoloTrip" } },
  { key: "poliglota", category: "aventureiro", criteria: { type: "language", threshold: 2, evaluator: "checkLanguageUsage" } },
  { key: "multicontinental", category: "aventureiro", criteria: { type: "trip_type", threshold: 3, evaluator: "checkContinentCount" } },

  // Veterano (4)
  { key: "fiel", category: "veterano", criteria: { type: "login_count", threshold: 10, evaluator: "checkDailyLogins" } },
  { key: "maratonista", category: "veterano", criteria: { type: "custom", evaluator: "checkMarathoner" } },
  { key: "fundador", category: "veterano", criteria: { type: "time_based", evaluator: "checkBetaUser" } },
  { key: "aniversario", category: "veterano", criteria: { type: "time_based", evaluator: "checkAnniversary" } },
];
```

---

## 4. Badge Evaluation Engine

```typescript
// src/lib/gamification/badge-engine.ts
import "server-only";

export type BadgeEvent =
  | { type: "trip_complete"; tripId: string; userId: string }
  | { type: "phase_complete"; phase: number; tripId: string; userId: string }
  | { type: "profile_update"; userId: string }
  | { type: "daily_login"; userId: string }
  | { type: "language_change"; locale: string; userId: string };

export async function checkBadgeEligibility(
  userId: string,
  event: BadgeEvent
): Promise<string[]> {
  // 1. Get user's existing badges (cached)
  // 2. Filter BADGE_REGISTRY to unearned badges relevant to event type
  // 3. For each candidate, run evaluator function
  // 4. Return list of newly eligible badge keys
}

export async function awardBadge(
  userId: string,
  badgeKey: string
): Promise<boolean> {
  // Idempotent: INSERT ON CONFLICT DO NOTHING
  // Uses Prisma $transaction
  // Returns true if newly awarded, false if already existed
}

export async function getUserBadges(
  userId: string
): Promise<BadgeWithStatus[]> {
  // Returns all 16 badges with status (locked/unlocked)
  // Cached in Redis (badges:${userId}, 60s TTL)
}

export async function getBadgeProgress(
  userId: string,
  badgeKey: string
): Promise<{ current: number; target: number; percentage: number }> {
  // Runtime calculation — not stored
}
```

### Event-to-Badge Mapping

| Event | Badges Checked |
|---|---|
| trip_complete | primeira_viagem, viajante_frequente, globetrotter, marco_polo, sem_fronteiras, em_familia, solo_explorer, multicontinental, maratonista, zero_pendencias, planejador_nato |
| phase_complete | detalhista (phase 4), revisor (any revisited phase) |
| profile_update | (none currently — profile badges via trip_complete flow) |
| daily_login | fiel |
| language_change | poliglota |

### Trigger Points (Integration)

1. `PhaseEngine.completePhase()` → `checkBadgeEligibility({ type: "phase_complete", ... })`
2. Trip completion action → `checkBadgeEligibility({ type: "trip_complete", ... })`
3. Auth `jwt` callback (daily login) → `checkBadgeEligibility({ type: "daily_login", ... })`
4. Language switcher → `checkBadgeEligibility({ type: "language_change", ... })`

---

## 5. API Routes

### GET /api/badges
Returns current user's badge grid (all 16 with status).
```json
{
  "badges": [
    {
      "key": "primeira_viagem",
      "name": "Primeira Viagem",
      "category": "explorador",
      "status": "unlocked",
      "earnedAt": "2026-03-15T10:30:00Z",
      "progress": { "current": 1, "target": 1, "percentage": 100 }
    },
    {
      "key": "viajante_frequente",
      "status": "locked",
      "progress": { "current": 1, "target": 3, "percentage": 33 }
    }
  ]
}
```

BOLA: userId from session only.

---

## 6. Redis Cache Strategy

| Key | TTL | Invalidation |
|---|---|---|
| `badges:${userId}` | 60s | On badge award |
| `badge-defs` | 3600s | On deploy (static data) |

---

## 7. Performance

- Badge evaluation runs inside existing action flows — no additional API calls
- Only unearned badges are checked (skip already-awarded)
- Idempotent INSERT avoids race conditions on double-trigger
- Redis cache reduces DB reads for badge grid display

---

## 8. Testing Strategy

| Test | Count (est.) |
|---|---|
| badge-registry: all 16 definitions valid | 16 |
| badge-engine: each evaluator function | 16 |
| badge-engine: idempotency (double award) | 2 |
| badge-engine: getUserBadges with mix | 3 |
| badge-engine: getBadgeProgress accuracy | 5 |
| Integration: phase complete → badge check | 3 |
| Integration: trip complete → badge check | 3 |
| **Total** | **~48** |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — badge evaluation engine |
