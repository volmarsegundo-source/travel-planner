---
spec-id: SPEC-COST-002-S31
title: Sprint 31 Cost Assessment
version: 1.0.0
status: Draft
author: finops-engineer
sprint: 31
reviewers: [tech-lead, architect]
date: 2026-03-17
---

# SPEC-COST-002-S31: Sprint 31 Cost Assessment

**Versao**: 1.0.0
**Status**: Draft
**Autor**: finops-engineer
**Data**: 2026-03-17
**Sprint**: 31
**Specs avaliadas**: SPEC-PROD-018 (Meu Atlas), SPEC-QA-005/006/007/008

---

## 1. Assessment Summary

**Sprint 31 has near-zero incremental cost.** The primary new feature (Meu Atlas interactive map) uses free, community-hosted tile servers. No external paid APIs are introduced. No AI costs are affected.

---

## 2. OpenStreetMap Tiles — Free

| Aspect | Detail |
|---|---|
| Provider | OpenStreetMap (light) / CartoDB (dark mode) |
| Pricing | Free (community-hosted, open data) |
| License | ODbL (data) + CC BY-SA 2.0 (tiles) — requires attribution |
| Rate limits | OSM tile usage policy: max 2 requests/second, no heavy commercial use |
| Our usage | Well within acceptable use (< 100 active users, ~5 page views/day/user) |

**Cost**: $0.00/month

---

## 3. Leaflet Library — Free

| Aspect | Detail |
|---|---|
| Package | leaflet + react-leaflet |
| License | BSD-2-Clause (leaflet) + MIT (react-leaflet) |
| Pricing | Free, open source |
| Bundle cost | ~45KB gzip (leaflet + react-leaflet combined) |

**License compliance**: Both licenses are in the approved list (MIT, Apache 2.0, BSD, ISC).

**Cost**: $0.00/month

---

## 4. Map Tile Bandwidth Estimate

| Scenario | Tiles per Page View | Avg Tile Size | Total per View | Monthly (100 users, 5 views/day) |
|---|---|---|---|---|
| Initial map load (zoom 2-3, world view) | ~12 tiles | ~40KB | ~480KB | ~7.2 GB |
| Zoom to city level | +8 tiles | ~50KB | +400KB | +6.0 GB (if all zoom) |
| Dark mode (separate tile set) | Same count | ~35KB | ~420KB | Similar to light |

**Bandwidth cost**: Tiles are served by OSM/CartoDB CDN — bandwidth is free to us. User pays their own data costs. Our Vercel deployment serves only the application; tile requests go directly from browser to tile CDN.

**Vercel bandwidth impact**: Zero — tiles are external resources, not served through our Next.js app.

---

## 5. No External API Costs

| Feature | Uses External API? | Cost |
|---|---|---|
| Map rendering (tiles) | OSM/CartoDB CDN (free) | $0 |
| Map pins (data) | Internal database (Prisma) | $0 |
| Phase completion engine | Internal logic (no API) | $0 |
| Dashboard quick-access | Internal database (Prisma) | $0 |
| Date validation | Client + server logic (no API) | $0 |
| Report generation | Internal data aggregation (no API) | $0 |

---

## 6. No AI Cost Impact

Sprint 31 introduces no changes to AI prompts, model selection, or token budgets:

- Map pins use database coordinates, not AI-generated data
- Phase completion is rule-based logic, not AI-powered
- Report generation aggregates existing data, no AI generation
- No new Claude/Anthropic API calls introduced

**AI cost delta**: $0.00

---

## 7. Infrastructure Cost Impact

| Resource | Current Cost | Sprint 31 Delta | New Cost |
|---|---|---|---|
| Vercel deployment | Free tier | +0 (no new routes that change compute) | Free tier |
| PostgreSQL (Supabase/Railway) | Free tier | +0 (no new tables, no migration) | Free tier |
| Redis (Upstash) | Free tier | +0 (no new cache patterns) | Free tier |
| Mapbox geocoding | Free tier (100K/month) | +0 (Sprint 30 feature, unchanged) | Free tier |

**Total infrastructure delta**: $0.00/month

---

## 8. Sprint 31 Cost Summary

| Category | Monthly Cost |
|---|---|
| Map tiles (OSM/CartoDB) | $0.00 |
| Leaflet library | $0.00 (OSS) |
| External APIs | $0.00 |
| AI (Anthropic) | $0.00 (no change) |
| Infrastructure | $0.00 (no change) |
| **Total Sprint 31 incremental cost** | **$0.00** |

---

## 9. Future Cost Considerations

If the team later upgrades to Mapbox tiles (for higher quality or custom styling):

| Mapbox Tiles | Free Tier | Overage |
|---|---|---|
| Map loads | 50,000/month | $5.00 per 1,000 |
| Our estimated usage | ~15,000/month (500 users) | $0 (within free tier) |

**Recommendation**: Stay with OSM/CartoDB for Sprint 31. Evaluate Mapbox tiles only if visual quality becomes a user-reported issue. The free tier is sufficient for current and projected growth.
