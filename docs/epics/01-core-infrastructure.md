# Epic 1 — Core Infrastructure

## Overview

Establishes the foundational persistence and event layer that every other epic builds on. Scope is determined by Epic 0 — do not begin implementation until the architecture gate is passed.

## Goals

- SQLite task database with a working state machine
- Event bus wired and usable by other components
- Task records survive process restarts
- Schema versioned and migrated cleanly

## Scope

**In:**
- Task model and state transitions (`pending → in_progress → blocked → complete | failed`)
- SQLite schema and migration strategy
- Event queue: SQLite WAL-mode queue with poll + mark-complete consumer (D3)
- Basic task CRUD API usable by orchestrator (Epic 5) and agents (Epic 9)
- Triage infrastructure: `triage_log` table for triage decision records (D13, Section 7)
- Event reliability: `event_queue` table with at-least-once delivery (D3, Section 3 P0)
- Dead-letter queue: `amara_dlq` table for poison messages (Section 3 P0)

**Out:**
- Orchestrator logic (Epic 5)
- Agent definitions (Epic 4)
- Channel adapters (Epics 7, 8)
- Dashboard (Epic 10)
- Auth / secret handling (Epic 2)
- Triage decision logic (Epic 5) — this epic provides the tables, not the rules engine

## Key Decisions

- [x] SQLite file location: `~/.amara/tasks.db` (Epic 0, Section 6 — Data Stores)
- [x] WAL mode: yes, enabled by default with `synchronous=FULL` for crash safety (D2, D3)
- [x] Event bus implementation: SQLite WAL-mode queue with poll + mark-complete consumer — no in-process EventEmitter (D3)
- [x] Task schema minimum fields: `task_id`, `state`, `channel`, `created_at`, `updated_at`, `correlation_id` (Epic 0, Section 6)
- [ ] Migration tool: raw SQL files, a migration library, or hand-rolled?

## Success Metrics

- Task records persist across a simulated crash (process kill + restart)
- State transitions are enforced (invalid transitions throw)
- Event bus delivers events to registered listeners in order
- Migration from empty DB to current schema is idempotent

## Definition of Done

- [ ] SQLite schema created with migration support
- [ ] Task state machine implemented and tested
- [ ] Invalid state transitions rejected with clear errors
- [ ] Event bus implemented
- [ ] Task CRUD API exported and documented
- [ ] Crash-recovery test passes
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Schema designed without knowing orchestrator needs | Defer final schema until Epic 5 design is sketched |
| SQLite contention if agents write concurrently | Use WAL mode; benchmark under load |
| Event ordering guarantees assumed but not enforced | Decide ordering contract explicitly |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Define task schema (including `correlation_id` for OTLP trace linkage)
- [ ] Implement SQLite setup and migration runner
- [ ] Implement task state machine
- [ ] Implement event queue (SQLite WAL poll + mark-complete consumer, D3)
- [ ] Define `triage_log` table schema (decision, confidence, latency, channel, mode — D13)
- [ ] Define `event_queue` + `amara_dlq` tables (at-least-once delivery, poison message handling — D3)
- [ ] Implement poison message detection and DLQ routing
- [ ] Write crash-recovery test
- [ ] Export and document task CRUD API

## Dependencies

- Epic 0 must be complete (architecture gate)

## Open Questions

- ~~What fields does a Task record need at minimum?~~ **Resolved:** `task_id`, `state`, `channel`, `created_at`, `updated_at`, `correlation_id` (Epic 0, Section 6)
- ~~Should the event bus be synchronous or async?~~ **Resolved:** Async — SQLite WAL queue with poll consumer (D3)
- ~~Do we need soft-delete on tasks, or just a `failed`/`cancelled` state?~~ **Resolved:** No soft-delete; use `failed` state for terminal failures (Epic 0, Section 7)
