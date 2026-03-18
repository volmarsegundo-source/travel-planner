---
spec-id: SPEC-INFRA-002-S31
title: Sprint 31 Infrastructure
version: 1.0.0
status: Draft
author: devops-engineer
sprint: 31
reviewers: [tech-lead, architect]
date: 2026-03-17
---

# SPEC-INFRA-002-S31: Sprint 31 Infrastructure

**Versao**: 1.0.0
**Status**: Draft
**Autor**: devops-engineer
**Data**: 2026-03-17
**Sprint**: 31
**Specs relacionadas**: SPEC-PROD-018 (Meu Atlas), SPEC-QA-005/006/007/008

---

## 1. New Dependencies

### Map Library Stack

| Package | Version | License | Bundle Size (gzip) | Purpose |
|---|---|---|---|---|
| `leaflet` | ^1.9.4 | BSD-2-Clause | ~40KB | Map rendering engine |
| `react-leaflet` | ^4.2.1 | MIT | ~5KB | React bindings for Leaflet |
| `@types/leaflet` | ^1.9.12 | MIT | devDependency | TypeScript type definitions |

**License compliance**: BSD-2-Clause and MIT are both in the approved license list (MIT, Apache 2.0, BSD, ISC).

**CVE check**: Run `npm audit` after installation. As of 2026-03-17, leaflet 1.9.x has no known critical CVEs.

### Installation Command

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

---

## 2. Environment Variables

### No New Env Vars Required

Sprint 31 map feature uses OpenStreetMap tiles, which require no API key.

| Feature | Data Source | API Key Required | Env Var |
|---|---|---|---|
| Map tiles (Sprint 31) | OpenStreetMap / CartoDB | No | None |
| Geocoding (Sprint 30) | Mapbox | Yes (already configured) | `MAPBOX_SECRET_TOKEN` (existing) |
| Map tiles (future upgrade) | Mapbox | Yes (already configured) | `NEXT_PUBLIC_MAPBOX_TOKEN` (existing) |

**No changes to `src/lib/env.ts` needed.**

---

## 3. Dynamic Import for Leaflet (SSR: false)

Leaflet requires `window` and `document` globals that do not exist in Node.js. The map component MUST use Next.js dynamic import with SSR disabled:

```typescript
// src/components/features/atlas/AtlasMap.tsx (or similar)
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("./AtlasMapClient"),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

**Verification**: After build, run `grep -r "leaflet" .next/server/` — Leaflet MUST NOT appear in any server-side chunk.

### Leaflet CSS

Leaflet requires its CSS file. Import it in the client-only component:

```typescript
// Inside the dynamically-imported client component
import "leaflet/dist/leaflet.css";
```

Do NOT import Leaflet CSS in global styles or layout — it would bloat the server bundle.

---

## 4. Database Migrations

### No New Migrations Required

Sprint 31 does not introduce new database tables or columns. All required fields already exist:

| Field | Table | Added In | Used By Sprint 31 |
|---|---|---|---|
| `destinationLat` | Trip | Sprint 29 | Map pin positioning |
| `destinationLon` | Trip | Sprint 29 | Map pin positioning |
| `currentPhase` | Trip | Sprint 9 | Phase completion status |
| `status` | ExpeditionPhase | Sprint 9 | Phase completion logic |

---

## 5. Tile Server Configuration

### Default: OpenStreetMap

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### Dark Mode: CartoDB Dark Matter

```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

Both are free, community-hosted tile servers with no rate limits for reasonable usage. Attribution is required:

- OSM: "Map data (c) OpenStreetMap contributors"
- CartoDB: "Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL."

### Tile Caching

Browser caches tiles natively (HTTP Cache-Control headers from tile servers). No additional caching infrastructure needed on our side.

---

## 6. Build Verification

After Sprint 31 implementation, verify:

- [ ] `npm run build` passes (no Leaflet SSR errors)
- [ ] Server bundle does NOT contain Leaflet code
- [ ] Client bundle includes Leaflet in a separate chunk (code-split)
- [ ] Leaflet CSS loaded only in map page (not globally)
- [ ] `npm audit` shows no critical/high CVEs from new dependencies
- [ ] Total bundle size increase < 50KB gzip (Leaflet + react-leaflet)

---

## 7. CI/CD Impact

### No Pipeline Changes Required

- Existing `npm run build` and `npm run test` commands cover Sprint 31 changes
- No new Docker services needed
- No new deployment configuration needed
- E2E tests may need a brief wait for map tile loading (add `waitForSelector` on map container)

---

## 8. Performance Monitoring

### Metrics to Watch Post-Deploy

| Metric | Baseline (v0.25.0) | Threshold | Alert |
|---|---|---|---|
| `/meu-atlas` LCP | N/A (new page) | < 3s on 4G | Alert if > 5s for 5+ minutes |
| Total JS bundle size | Current baseline | < +50KB gzip | Alert if > +80KB |
| Tile server response time | N/A | < 500ms p95 | Informational (external dependency) |
