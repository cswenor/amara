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
- [x] Mobile breakpoint strategy: Milestone 1 delivers basic responsive CSS for 390px viewport (iPhone 14 baseline). Full mobile polish (PWA, native-like interactions, gesture support) deferred to Milestone 6.

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

### S10.1: Set up Canvas/A2UI project

**Description:** Scaffold the dashboard project using OpenClaw Canvas/A2UI (D8). Set up the build pipeline, dev server, and basic shell layout (header, navigation, content area).

**Acceptance Criteria:**
- [ ] Canvas/A2UI project initialized with build configuration
- [ ] Dev server starts and serves an empty shell page
- [ ] Basic layout shell: header with "Amara" title, sidebar/tab navigation, main content area
- [ ] Build produces static assets suitable for embedding in Gateway
- [ ] `npm run dev` starts hot-reloading dev server

**Size:** M
**Dependencies:** None
**Blocks:** S10.2, S10.3, S10.5, S10.8

---

### S10.2: Implement active/pending/history views

**Description:** Three list views showing tasks from the Task DB via the CRUD API (S1.9): active (in_progress, blocked), pending, and history (complete, failed). Each view shows task summary with state badge, channel, and timestamps.

**Acceptance Criteria:**
- [ ] Active view: lists tasks with state `in_progress` or `blocked`
- [ ] Pending view: lists tasks with state `pending`
- [ ] History view: lists tasks with state `complete` or `failed`
- [ ] Each task row shows: task_id (truncated), state badge, channel, created_at, updated_at
- [ ] Views update via WebSocket push (no manual refresh needed)
- [ ] Empty state message when no tasks match the view

**Size:** L
**Dependencies:** S1.9, S10.1, S10.8
**Blocks:** S10.4, S10.7

---

### S10.3: Implement audit log view

**Description:** Filterable view of the security audit log (S2.6). Users can filter by event type and date range. Shows recent audit entries in reverse chronological order.

**Acceptance Criteria:**
- [ ] Displays audit log entries in reverse chronological order
- [ ] Filter by event type (dropdown: oauth_exchange, token_rotation, etc.)
- [ ] Filter by date range (start date, end date)
- [ ] Each entry shows: timestamp, event_type, actor, target, details summary
- [ ] Pagination or infinite scroll for large result sets

**Size:** M
**Dependencies:** S2.6, S10.1, S10.8
**Blocks:** S10.7

---

### S10.4: Implement task detail view

**Description:** Full detail view for a single task showing its complete lifecycle: state transitions, triage sub-tasks, outcome score, correlation ID, and associated events.

**Acceptance Criteria:**
- [ ] Navigable from any task list view (click task → detail)
- [ ] Shows all task fields: task_id, state, channel, correlation_id, created_at, updated_at
- [ ] State transition timeline (visual history of state changes)
- [ ] Triage sub-task section: linked triage_log entries for this task
- [ ] Outcome score displayed if present (success/partial/failed/escalated + confidence)
- [ ] Back navigation to originating list view

**Size:** M
**Dependencies:** S10.2
**Blocks:** S10.7

---

### S10.5: Implement triage activity feed

**Description:** Real-time feed of recent triage decisions from the `triage_log` table. Filterable by channel, mode, and decision type. Provides operational visibility into what Amara's triage layer is doing.

**Acceptance Criteria:**
- [ ] Displays triage decisions in reverse chronological order
- [ ] Each entry shows: timestamp, decision, confidence, channel, mode, latency_ms
- [ ] Filter by channel (dropdown)
- [ ] Filter by mode (dropdown)
- [ ] Filter by decision type (dropdown)
- [ ] Updates via WebSocket push for new decisions

**Size:** M
**Dependencies:** S1.5, S10.1, S10.8
**Blocks:** S10.6, S10.7

---

### S10.6: Implement undo controls for reversible triage actions

**Description:** Add undo buttons for reversible triage actions (D14): archive, label, and draft_reply are reversible; mark_read is not. The undo control appears inline on the triage feed entry for a brief window after the action.

**Acceptance Criteria:**
- [ ] Reversible actions (archive, label, draft_reply) show an "Undo" button
- [ ] Non-reversible actions (mark_read) do not show an undo button
- [ ] Undo window: button available for 30 seconds after action
- [ ] Undo triggers the reverse operation and updates the feed entry
- [ ] Visual distinction between undone and active triage entries

**Size:** M
**Dependencies:** S10.5
**Blocks:** S10.7

---

### S10.7: Mobile layout pass

**Description:** Basic responsive CSS to ensure all dashboard views render correctly at 390px viewport width (iPhone 14 baseline). This is not a full mobile UX — PWA, gesture support, and native-like interactions are deferred to Milestone 6.

**Acceptance Criteria:**
- [ ] All views (task lists, audit log, triage feed, task detail) render without horizontal scroll at 390px
- [ ] Navigation collapses to a mobile-friendly pattern (hamburger menu or bottom tabs)
- [ ] Touch targets are at least 44px (iOS HIG minimum)
- [ ] Text is readable without zooming
- [ ] No layout-breaking overflow on any view

**Size:** S
**Dependencies:** S10.2, S10.3, S10.4, S10.5
**Blocks:** None

---

### S10.8: Dashboard server integration

**Description:** Integrate the dashboard into Amara's runtime as a same-process Gateway HTTP endpoint (D8). Implement WebSocket push for real-time updates instead of polling.

**Acceptance Criteria:**
- [ ] Dashboard static assets served from Gateway HTTP endpoint (must use `registerHttpRoute()` — not removed `registerHttpHandler()` — for route registration per v2026.3.2-beta.1 breaking change)
- [ ] WebSocket endpoint established for push updates
- [ ] Task state changes pushed to connected dashboard clients
- [ ] Triage log entries pushed to connected dashboard clients
- [ ] Dashboard accessible at `http://localhost:<port>/dashboard`
- [ ] No separate process required — starts with Amara

**Size:** M
**Dependencies:** S10.1
**Blocks:** S10.2, S10.3, S10.5

## Story Sequencing

```
Phase 1:
  S10.1: Canvas/A2UI scaffolding ──────┐
                                       │
Phase 2 (unblocked by Phase 1):       │
  S10.8: Server integration ◄─────────┘

Phase 3 (unblocked by Phase 2 + cross-epic):
  S10.2: Task list views ◄───────────── (needs S1.9, S10.1, S10.8)
  S10.3: Audit log view ◄────────────── (needs S2.6, S10.1, S10.8)
  S10.5: Triage activity feed ◄──────── (needs S1.5, S10.1, S10.8)

Phase 4 (unblocked by Phase 3):
  S10.4: Task detail view ◄──────────── (needs S10.2)
  S10.6: Undo controls ◄─────────────── (needs S10.5)

Phase 5 (all views complete):
  S10.7: Mobile layout pass ◄────────── (needs S10.2, S10.3, S10.4, S10.5)
```

## Dependencies

- Epic 1 (core infrastructure) — task DB must exist
- Epic 3 (observability and quality) — audit log format must be defined

## Open Questions

- ~~Is localhost-only acceptable for v1 security, or do we need a token?~~ **Resolved:** Localhost-only, no auth for v1 (single-user)
- ~~Polling interval: 5s? 10s? Configurable?~~ **Resolved:** Not polling — OpenClaw WebSocket push (Section 6)
- ~~Does the dashboard need to show agent sub-task detail, or just top-level tasks?~~ **Resolved:** Yes, sub-task detail needed for triage visibility (D13)
