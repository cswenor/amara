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
- Triage activity feed (recent triage decisions from `triage_log` — D13)
- Triage log browser (filterable by channel, mode, decision type)
- Undo controls for reversible triage actions (D14 — archive, label, draft)

**Out:**
- Task creation via dashboard (input comes from channels)
- Agent management via dashboard (future)
- Multi-user auth (future)

## Key Decisions

- [x] Framework: OpenClaw Canvas/A2UI (D8)
- [x] Refresh model: OpenClaw WebSocket push — not polling (Epic 0, Section 6)
- [x] Auth: localhost-only, no auth for v1 (single-user personal assistant)
- [x] Where does the dashboard server run? Same process — Gateway HTTP endpoint (D8)
- [ ] Mobile breakpoint strategy (deferred to Milestone 6)

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

- [ ] Set up Canvas/A2UI project (D8)
- [ ] Implement active/pending/history views
- [ ] Implement audit log view
- [ ] Implement task detail view (including triage sub-task detail for visibility)
- [ ] Implement triage activity feed (recent decisions from triage_log — D13)
- [ ] Implement undo controls for reversible triage actions (D14)
- [ ] Mobile layout pass
- [ ] Dashboard server integration (same-process Gateway endpoint — D8)

## Dependencies

- Epic 1 (core infrastructure) — task DB must exist
- Epic 3 (observability and quality) — audit log format must be defined

## Open Questions

- ~~Is localhost-only acceptable for v1 security, or do we need a token?~~ **Resolved:** Localhost-only, no auth for v1 (single-user)
- ~~Polling interval: 5s? 10s? Configurable?~~ **Resolved:** Not polling — OpenClaw WebSocket push (Section 6)
- ~~Does the dashboard need to show agent sub-task detail, or just top-level tasks?~~ **Resolved:** Yes, sub-task detail needed for triage visibility (D13)
