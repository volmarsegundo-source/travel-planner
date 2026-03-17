---
spec-id: SPEC-COST-001-S30
title: Sprint 30 Cost Assessment
version: 1.0.0
status: Approved
author: finops-engineer
sprint: 30
reviewers: [tech-lead, architect]
date: 2026-03-17
---

# SPEC-COST-001-S30: Sprint 30 Cost Assessment

**Versao**: 1.0.0
**Status**: Approved
**Autor**: finops-engineer
**Data**: 2026-03-17
**Sprint**: 30
**Specs avaliadas**: SPEC-ARCH-011, SPEC-PROD-017, SPEC-PROD-019

---

## 1. Mapbox Geocoding Cost Analysis

### Free Tier

Mapbox Geocoding v6 free tier: **100,000 requests/month** per account.

### Current Usage Estimate (Nominatim)

| Metric | Value |
|--------|-------|
| Active users (current) | ~50-100 |
| Avg searches per user per session | ~3-5 |
| Avg sessions per user per month | ~4-6 |
| Estimated raw requests/month | ~1,000-3,000 |
| With growth to 500 users | ~10,000-15,000 |

### Projected Mapbox Usage (with Redis cache)

| Scenario | Raw Requests | Cache Hit Rate | Actual Mapbox Calls | % of Free Tier |
|----------|-------------|----------------|---------------------|----------------|
| Current (100 users) | ~3,000/month | ~60% (popular cities) | ~1,200/month | 1.2% |
| Growth (500 users) | ~15,000/month | ~70% (more cache hits at scale) | ~4,500/month | 4.5% |
| Ambitious (2,000 users) | ~50,000/month | ~75% | ~12,500/month | 12.5% |

**Conclusion**: Well within free tier for all foreseeable growth scenarios. The 7-day Redis cache TTL (SPEC-ARCH-011 section 7) significantly reduces calls since city names rarely change.

### Cost If Free Tier Exceeded

Mapbox Geocoding beyond free tier: $5.00 per 1,000 requests. At 100k requests, overage would be minimal. This scenario is unlikely before reaching 5,000+ MAU.

---

## 2. Nominatim Fallback Cost

Nominatim is free and open-source (ODbL license). As fallback provider, it incurs zero cost. The provider abstraction ensures automatic failover at no additional expense.

---

## 3. Redis Cache Cost

No additional Redis cost. The geocoding cache uses the existing Redis instance (`travel_planner_redis`). Estimated additional memory:
- Average cached result: ~500 bytes (JSON serialized)
- With 10,000 unique queries cached: ~5 MB
- Redis instance has ample headroom for this workload

---

## 4. Dashboard Rewrite Cost

The dashboard rewrite (SPEC-PROD-019) has zero infrastructure cost impact:
- No new API endpoints (uses existing trip queries)
- Sort/filter operations are client-side
- No additional database queries beyond current trip listing
- Skeleton loading reduces perceived latency without additional calls

---

## 5. AI Cost Impact

**None.** Sprint 30 does not introduce or modify AI features:
- Autocomplete uses geocoding APIs, not AI models
- Dashboard rewrite is purely UI
- No changes to Anthropic API usage patterns
- No new prompt templates or model calls

---

## 6. Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Mapbox requests/month | > 50,000 | > 80,000 | Review cache TTL, consider extending to 14 days |
| Mapbox requests/day (spike) | > 5,000 | > 10,000 | Investigate potential abuse, verify rate limiting |
| Redis memory (geo cache) | > 50 MB | > 100 MB | Review cache eviction policy |

### Monitoring

Add to application logging (not a new service -- use existing logger):
- Log geocoding provider used per request (`mapbox` or `nominatim`)
- Log cache hit/miss ratio (aggregated, not per-query)
- Monthly summary in FinOps sprint report

---

## 7. Cost Summary

| Item | Monthly Cost (current) | Monthly Cost (Sprint 30) | Delta |
|------|----------------------|--------------------------|-------|
| Mapbox Geocoding | $0 | $0 (free tier) | $0 |
| Nominatim | $0 | $0 (fallback only) | $0 |
| Redis (existing) | $0 (Docker local) | $0 | $0 |
| Anthropic API | No change | No change | $0 |
| Vercel | No change | No change | $0 |
| **Total Sprint 30 cost impact** | | | **$0** |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | finops-engineer | Avaliacao de custo inicial — Sprint 30 |
