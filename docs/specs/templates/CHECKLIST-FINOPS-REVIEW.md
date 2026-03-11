# FinOps Review Checklist for Spec Approval

Use this checklist when reviewing Architecture Specs (SPEC-ARCH-XXX).
The finops-engineer MUST complete this review before any spec is approved for implementation.

**Spec ID**: SPEC-ARCH-___
**Reviewer**: finops-engineer
**Date**: YYYY-MM-DD
**Sprint**: ___

---

## Cost Impact Assessment

- [ ] AI/LLM token usage estimated (input + output tokens per request)
- [ ] Expected token cost per request calculated (model pricing x estimated tokens)
- [ ] API call frequency estimated (requests/day, requests/user)
- [ ] Database query cost estimated (complex joins, full scans, connection pool impact)
- [ ] Third-party API costs identified and quantified (geocoding, maps, email, etc.)
- [ ] Caching strategy defined to reduce redundant calls (Redis TTL, cache key design)
- [ ] Rate limiting specified to prevent cost overruns (per-user and global limits)
- [ ] Estimated monthly cost at current user base documented
- [ ] Estimated monthly cost at 10x user base documented

## Performance Budget Review

- [ ] Token budget per request specified (max input + max output tokens)
- [ ] Response time budget includes cost-efficient model selection (Haiku vs Sonnet vs Opus)
- [ ] Batch vs real-time processing considered for cost optimization
- [ ] Streaming vs non-streaming cost implications evaluated (if applicable)
- [ ] Model routing strategy defined (cheaper model for simpler tasks)

## Free Tier Compliance

- [ ] Feature operates within free tier limits where possible
- [ ] Graceful degradation defined when limits are reached (fallback behavior)
- [ ] User-facing rate limits communicated in UI/UX spec
- [ ] Free tier headroom calculated (current usage vs limit, with this feature added)

## Cost Monitoring

- [ ] New cost metrics identified for this feature
- [ ] Alert thresholds defined (warning at 80%, critical at 95% of budget)
- [ ] Cost attribution possible (per-feature, per-user tier)
- [ ] Token usage logging specified for this feature's AI calls
- [ ] Dashboard or reporting requirements documented

## Cost Optimization Opportunities

- [ ] Prompt caching applicability evaluated (shared system prompts)
- [ ] Response caching applicability evaluated (Redis, CDN)
- [ ] Request deduplication considered (identical concurrent requests)
- [ ] Lazy loading or on-demand generation preferred over eager generation
- [ ] Data minimization applied (only fetch/generate what is needed)

---

## Verdict

Select one:

- [ ] **APPROVED** -- cost impact acceptable, no additional action needed
- [ ] **APPROVED WITH CONDITIONS** -- implementation must include the following cost optimizations:
  1. _[list required optimizations]_
  2. _[...]_
- [ ] **BLOCKED** -- cost impact too high, alternatives needed:
  - _[describe concern and suggest alternatives]_

---

## Notes

_[Any additional cost observations, risks, or recommendations for the architect and dev team]_

---

**Signed**: finops-engineer
**Date**: YYYY-MM-DD
