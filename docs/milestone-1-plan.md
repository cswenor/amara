# Milestone 1 — Implementation Plan

Milestone 1 covers Epics 1, 2, 3, and 10: the foundational infrastructure, security contracts, observability layer, and dashboard. This document provides the cross-epic view — dependency map, critical path, and unified story table.

## Unified Story Table

33 stories across 4 epics.

| ID | Title | Size | Epic | Dependencies | Blocks |
|----|-------|------|------|-------------|--------|
| S1.1 | Define task schema | S | 1 | — | S1.3, S1.9, S2.5, S3.3, S3.4 |
| S1.2 | Implement SQLite setup and migration runner | M | 1 | — | S1.3, S1.4, S1.5, S1.6, S2.5, S2.6 |
| S1.3 | Implement task state machine | M | 1 | S1.1, S1.2 | S1.8, S1.9 |
| S1.4 | Implement event queue | M | 1 | S1.2, S1.6 | S1.7, S1.8, S2.6 |
| S1.5 | Define triage_log table schema | S | 1 | S1.2 | S2.5, S3.8, S10.5 |
| S1.6 | Define event_queue + amara_dlq tables | S | 1 | S1.2 | S1.4, S1.7, S2.5 |
| S1.7 | Implement poison message detection and DLQ routing | M | 1 | S1.4, S1.6 | — |
| S1.8 | Write crash-recovery test | M | 1 | S1.3, S1.4 | — |
| S1.9 | Export and document task CRUD API | S | 1 | S1.3 | S3.4, S10.2 |
| S2.1 | Define OAuth scopes per channel | S | 2 | — | — |
| S2.2 | Implement secret storage | S | 2 | — | — |
| S2.3 | Write log-sanitization test | M | 2 | S3.1 | — |
| S2.4 | Define PII inventory and retention policy | S | 2 | — | — |
| S2.5 | Implement delete-my-data 7-step process | L | 2 | S1.1, S1.2, S1.5, S1.6 | — |
| S2.6 | Define and wire security audit log | M | 2 | S1.2, S1.4 | S2.7, S10.3 |
| S2.7 | Implement D14 write permission audit logging | M | 2 | S2.6 | — |
| S2.8 | Document input validation contracts | S | 2 | — | — |
| S3.1 | Define structured logging standard | S | 3 | — | S2.3, S3.3 |
| S3.2 | Implement OTLP/OpenTelemetry integration | M | 3 | — | S3.3, S3.7, S3.8 |
| S3.3 | Implement correlation ID propagation (+ `sessionKey` mapping — D15 beta) | M | 3 | S1.1, S3.2 | — |
| S3.4 | Define and implement agent outcome scoring | M | 3 | S1.1, S1.9 | S3.6 |
| S3.5 | Document failure taxonomy | S | 3 | — | S3.6 |
| S3.6 | Build eval harness | L | 3 | S3.4, S3.5 | — |
| S3.7 | Define metrics and their collection points | S | 3 | S3.2 | S3.8 |
| S3.8 | Implement triage decision metrics | M | 3 | S1.5, S3.2, S3.7 | — |
| S10.1 | Set up Canvas/A2UI project | M | 10 | — | S10.2, S10.3, S10.5, S10.8 |
| S10.2 | Implement active/pending/history views | L | 10 | S1.9, S10.1, S10.8 | S10.4, S10.7 |
| S10.3 | Implement audit log view | M | 10 | S2.6, S10.1, S10.8 | S10.7 |
| S10.4 | Implement task detail view | M | 10 | S10.2 | S10.7 |
| S10.5 | Implement triage activity feed | M | 10 | S1.5, S10.1, S10.8 | S10.6, S10.7 |
| S10.6 | Implement undo controls for reversible triage actions | M | 10 | S10.5 | S10.7 |
| S10.7 | Mobile layout pass | S | 10 | S10.2, S10.3, S10.4, S10.5 | — |
| S10.8 | Dashboard server integration | M | 10 | S10.1 | S10.2, S10.3, S10.5 |

### Size Summary

| Size | Count |
|------|-------|
| S | 12 |
| M | 18 |
| L | 3 |
| **Total** | **33** |

## Cross-Epic Dependency Map

These are the dependencies that cross epic boundaries — the coordination points where one epic's output is another's input.

| Downstream | Upstream | Reason |
|-----------|----------|--------|
| S2.3 | S3.1 | Log sanitization test needs logging standard defined |
| S2.5 | S1.1, S1.2, S1.5, S1.6 | Delete-my-data must cover all tables |
| S2.6 | S1.2, S1.4 | Security audit log needs DB + event bus |
| S2.7 | S2.6 | Write audit extends security audit log |
| S3.3 | S1.1 | correlation_id field on tasks table |
| S3.4 | S1.1, S1.9 | Outcome scores stored in Task DB |
| S3.8 | S1.5 | Triage metrics read from triage_log |
| S10.2 | S1.9 | Task views read via CRUD API |
| S10.3 | S2.6 | Audit view reads from audit log tables |
| S10.5 | S1.5 | Triage feed reads from triage_log |

## Critical Path

The longest dependency chain through the milestone determines the minimum time to completion:

```
S1.1 + S1.2 (parallel)
    → S1.3
        → S1.9
            → S10.2 (also needs S10.1 → S10.8)
                → S10.4
                    → S10.7
```

**Critical path length:** 6 phases (S1.1/S1.2 → S1.3 → S1.9 → S10.2 → S10.4 → S10.7)

Epic 1 foundations (schema + migration runner) are the single biggest bottleneck. Everything else fans out from there.

## Unified Cross-Epic Dependency Graph

```
                    ┌─────────────────── MILESTONE 1 ───────────────────┐
                    │                                                    │
  PHASE 1           │  S1.1 ─┐    S2.1    S3.1 ───┐    S10.1 ──┐      │
  (no deps)         │  S1.2 ─┤    S2.2    S3.2 ───┤            │      │
                    │        │    S2.4    S3.5 ─┐  │            │      │
                    │        │    S2.8          │  │            │      │
                    │        │                  │  │            │      │
  PHASE 2           │  S1.3 ◄┤    S2.3 ◄───────│──┘            │      │
  (Epic 1 core)     │  S1.5 ◄┤                  │     S10.8 ◄──┘      │
                    │  S1.6 ◄┘                  │              │       │
                    │        │                  │              │       │
  PHASE 3           │  S1.4 ◄┤    S2.6 ◄───────│──┐           │       │
  (queues + API)    │  S1.9 ◄┘    │             │  │           │       │
                    │     │       │       S3.3 ◄┘  │           │       │
                    │     │       │       S3.4 ◄───│───────────│──┐    │
                    │     │       │       S3.7 ◄┘  │           │  │    │
                    │     │       │                 │           │  │    │
  PHASE 4           │  S1.7 ◄┐    S2.7 ◄┘          │  S10.2 ◄──┤──┘    │
  (advanced)        │  S1.8 ◄┘                S3.6 ◄┘  S10.3 ◄──┤      │
                    │                         S3.8     S10.5 ◄──┘      │
                    │                                      │           │
  PHASE 5           │              S2.5 ◄── (Epic 1)  S10.4 ◄┘        │
  (integration)     │                                  S10.6 ◄┘        │
                    │                                      │           │
  PHASE 6           │                                  S10.7 ◄─────────│
  (polish)          │                                                  │
                    └──────────────────────────────────────────────────┘

  Legend: ◄── dependency    ─┐ fan-out    ◄┘ fan-in
```

## Open Question Resolutions

All 5 open questions from Milestone 1 epics have been resolved:

| # | Question | Resolution | Epic |
|---|----------|-----------|------|
| 1 | Migration tool: raw SQL, library, or hand-rolled? | Raw SQL files + hand-rolled runner (~50 lines TS, `schema_version` table) | 1 |
| 2 | Eval harness interface? | Separate `*.eval.ts` files + `npm run eval` | 3 |
| 3 | Evals in `node --test` or separate? | Same runner, separate command (`npm test` vs `npm run eval`) | 3 |
| 4 | Failure taxonomy ownership? | Epic 3 defines base union type; Epics 5/9 extend | 3 |
| 5 | Outcome score thresholds? | Config-driven with documented defaults (>0.95 destructive, >0.7 escalation) | 3 |

## Implementation Order Recommendation

For a single implementer, the recommended sequence maximizes parallelism within each phase while respecting all dependencies:

1. **Start:** S1.1 + S1.2 + S3.1 + S3.2 + S3.5 + S10.1 + all S2 docs (S2.1, S2.2, S2.4, S2.8)
2. **After Epic 1 foundations:** S1.3 + S1.5 + S1.6 + S2.3 + S10.8
3. **After state machine + schemas:** S1.4 + S1.9 + S2.6 + S3.3 + S3.4 + S3.7
4. **After queues + API:** S1.7 + S1.8 + S2.7 + S3.6 + S3.8 + S10.2 + S10.3 + S10.5
5. **After views:** S2.5 + S10.4 + S10.6
6. **Final:** S10.7 (mobile pass after all views complete)
