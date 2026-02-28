# Epic 10 — Dashboard

## Overview

A minimal web UI for task visibility: active tasks, pending tasks, history, and audit log. Mobile-optimized. Provides operational insight without requiring command-line access.

## Goals

- Any task Amara is tracking is visible in the dashboard
- Audit log is browsable without opening a file
- UI works well on a mobile browser
- No configuration required — dashboard reads from the same task DB

## Scope

**In:**
- Active tasks view (in-progress, blocked)
- Pending tasks view
- History view (completed, failed, cancelled)
- Audit log view (filterable by date/type)
- Task detail view (full lifecycle, notes, escalations)
- Mobile-optimized layout

**Out:**
- Task creation via dashboard (input comes from channels)
- Agent management via dashboard (future)
- Multi-user auth (future)
- Real-time push updates (future — polling acceptable for v1)

## Key Decisions

- [ ] Framework: plain HTML/JS / React / SvelteKit / other?
- [ ] Refresh model: polling interval or server-sent events?
- [ ] Auth: localhost-only (no auth) / simple password / full auth?
- [ ] Where does the dashboard server run? (same process as Amara / separate?)
- [ ] Mobile breakpoint strategy

## Success Metrics

- All active tasks visible within 30 seconds of creation
- Audit log shows last 100 entries with correct timestamps
- UI renders correctly on a 390px-wide mobile viewport
- Dashboard loads in under 2 seconds on localhost

## Definition of Done

- [ ] Active, pending, and history views implemented
- [ ] Audit log view implemented with date filter
- [ ] Task detail view implemented
- [ ] Mobile layout tested at 390px viewport
- [ ] Dashboard server starts with Amara (or as a separate command)
- [ ] Polling or push updates working
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Dashboard DB queries slow down Amara's main DB | Read-only connection; consider read replica |
| UI becomes a maintenance burden | Keep it minimal; resist feature creep |
| Mobile layout breaks on real devices | Test on actual device before declaring done |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Choose framework and set up project
- [ ] Implement active/pending/history views
- [ ] Implement audit log view
- [ ] Implement task detail view
- [ ] Mobile layout pass
- [ ] Dashboard server integration

## Dependencies

- Epic 1 (core infrastructure) — task DB must exist
- Epic 3 (observability and quality) — audit log format must be defined

## Open Questions

- Is localhost-only acceptable for v1 security, or do we need a token?
- Polling interval: 5s? 10s? Configurable?
- Does the dashboard need to show agent sub-task detail, or just top-level tasks?
