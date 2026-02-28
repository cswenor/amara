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
- Event bus (in-process or queue — type decided in Epic 0)
- Basic task CRUD API usable by orchestrator (Epic 5) and agents (Epic 9)

**Out:**
- Orchestrator logic (Epic 5)
- Agent definitions (Epic 4)
- Channel adapters (Epics 7, 8)
- Dashboard (Epic 10)
- Auth / secret handling (Epic 2)

## Key Decisions

> To be resolved during Epic 0 or early in this epic.

- [ ] SQLite file location and naming convention
- [ ] WAL mode: enabled by default?
- [ ] Event bus implementation (in-process `EventEmitter` / SQLite queue / other)
- [ ] Task schema: what fields are required at creation vs. filled in later?
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

- [ ] Define task schema
- [ ] Implement SQLite setup and migration runner
- [ ] Implement task state machine
- [ ] Implement event bus
- [ ] Write crash-recovery test
- [ ] Export and document task CRUD API

## Dependencies

- Epic 0 must be complete (architecture gate)

## Open Questions

- What fields does a Task record need at minimum?
- Should the event bus be synchronous or async?
- Do we need soft-delete on tasks, or just a `failed`/`cancelled` state?
