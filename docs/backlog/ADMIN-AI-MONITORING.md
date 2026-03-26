# Backlog: Admin AI Monitoring (Phase 3 Checklists)

**Priority**: P2 (future sprint)
**Created**: 2026-03-25
**Source**: PO feedback during Phase 3 testing

## Requirements

### 1. View Checklist Generation Prompt
- Admin Dashboard: display the prompt template used to generate Phase 3 checklists
- Show variables injected: trip type, destination, dates, passenger profile
- Allow PO to review and optimize prompt quality

### 2. View AI Inputs/Outputs
- Admin Dashboard: for each expedition, show:
  - Input sent to AI (prompt + context)
  - Output received (generated checklist items)
  - Timestamp, latency, token count
  - Model used (Haiku/Sonnet)
- Filterable by destination, trip type, date range

### 3. Purpose
- PO can monitor checklist quality across destinations
- Identify destinations where AI generates poor checklists
- Optimize prompts based on real output data
- Track AI cost per checklist generation

## Technical Notes
- Requires logging AI inputs/outputs in a new table or extending PointTransaction
- Admin-only route (role=ADMIN guard)
- Consider privacy: mask user PII in admin view
