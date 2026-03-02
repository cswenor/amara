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
- [x] Migration tool: Raw SQL files + hand-rolled runner. Numbered `.sql` files in `migrations/` (e.g., `001_initial_schema.sql`), `schema_version` table tracks applied migrations, runner reads in order, skips applied, wraps each in a transaction (~50 lines TS). Rationale: Node.js >=22 has built-in `node:sqlite`, schema is small (5-7 tables), avoids external deps, satisfies idempotency success metric.

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

### S1.1: Define task schema

**Description:** Define the SQLite task table schema based on Epic 0 §6. Includes all minimum fields plus any additional columns identified during architecture review. Output is a numbered migration SQL file.

**Acceptance Criteria:**
- [ ] Migration file `001_initial_schema.sql` exists with `CREATE TABLE tasks`
- [ ] Columns include: `task_id`, `state`, `channel`, `created_at`, `updated_at`, `correlation_id`
- [ ] `task_id` is a TEXT primary key (ULID or UUID)
- [ ] `state` column has a CHECK constraint for valid states
- [ ] Schema documented in a comment block at top of migration file

**Size:** S
**Dependencies:** None
**Blocks:** S1.3, S1.9, S2.5, S3.3, S3.4

---

### S1.2: Implement SQLite setup and migration runner

**Description:** Create the hand-rolled migration runner that manages `~/.amara/tasks.db`. Uses Node.js built-in `node:sqlite`. Reads numbered `.sql` files from `migrations/`, tracks applied migrations in a `schema_version` table, skips already-applied migrations, and wraps each in a transaction.

**Acceptance Criteria:**
- [ ] `schema_version` table created automatically on first run
- [ ] Runner reads `migrations/*.sql` files in numeric order
- [ ] Already-applied migrations are skipped (idempotent)
- [ ] Each migration runs inside a transaction (rollback on failure)
- [ ] WAL mode enabled with `synchronous=FULL`
- [ ] Runner is ~50 lines, no external dependencies

**Size:** M
**Dependencies:** None
**Blocks:** S1.3, S1.4, S1.5, S1.6, S2.5, S2.6

---

### S1.3: Implement task state machine

**Description:** Implement the state machine that enforces valid task transitions: `pending → in_progress → blocked → complete | failed`. Invalid transitions throw a typed error with the current state, attempted state, and task ID.

**Acceptance Criteria:**
- [ ] Valid transitions: `pending→in_progress`, `in_progress→blocked`, `in_progress→complete`, `in_progress→failed`, `blocked→in_progress`, `blocked→failed`
- [ ] Invalid transitions throw `InvalidStateTransitionError` with context
- [ ] State changes update `updated_at` timestamp
- [ ] Unit tests cover all valid transitions and at least 3 invalid transitions

**Size:** M
**Dependencies:** S1.1, S1.2
**Blocks:** S1.8, S1.9

---

### S1.4: Implement event queue

**Description:** Implement the SQLite WAL-mode event queue with poll + mark-complete consumer pattern (D3). Events are written to the `event_queue` table by producers and consumed by polling consumers that mark events as complete after processing.

**Acceptance Criteria:**
- [ ] Events enqueued with `event_id`, `event_type`, `payload`, `created_at`, `status`
- [ ] Consumer polls for `pending` events in FIFO order
- [ ] Consumer marks events `complete` after successful processing
- [ ] At-least-once delivery: unacknowledged events re-delivered after timeout
- [ ] Unit test: enqueue → consume → mark-complete cycle works

**Size:** M
**Dependencies:** S1.2, S1.6
**Blocks:** S1.7, S1.8, S2.6

---

### S1.5: Define triage_log table schema

**Description:** Define the `triage_log` table for recording triage decisions (D13, Section 7). This table feeds the dashboard triage activity feed (Epic 10) and triage decision metrics (Epic 3).

**Acceptance Criteria:**
- [ ] Migration file creates `triage_log` table
- [ ] Columns include: `log_id`, `task_id`, `decision`, `confidence`, `latency_ms`, `channel`, `mode`, `created_at`
- [ ] `decision` column documents expected values (e.g., archive, label, escalate, draft_reply)
- [ ] Subject to 30-day PII retention policy (documented in schema comment)

**Size:** S
**Dependencies:** S1.2
**Blocks:** S2.5, S3.8, S10.5

---

### S1.6: Define event_queue + amara_dlq tables

**Description:** Define the `event_queue` and `amara_dlq` (dead-letter queue) table schemas for at-least-once delivery and poison message storage (D3, Section 3 P0).

**Acceptance Criteria:**
- [ ] Migration file creates `event_queue` table with: `event_id`, `event_type`, `payload`, `status`, `retry_count`, `created_at`, `updated_at`
- [ ] Migration file creates `amara_dlq` table with: `dlq_id`, `original_event_id`, `event_type`, `payload`, `failure_reason`, `moved_at`
- [ ] `status` CHECK constraint: `pending`, `processing`, `complete`, `failed`
- [ ] Schema comments document the at-least-once delivery contract

**Size:** S
**Dependencies:** S1.2
**Blocks:** S1.4, S1.7, S2.5

---

### S1.7: Implement poison message detection and DLQ routing

**Description:** Implement logic that detects poison messages (events that fail processing repeatedly) and routes them to the dead-letter queue. After 3 consecutive failures, the event is moved from `event_queue` to `amara_dlq` and an OTLP alert is emitted.

**Acceptance Criteria:**
- [ ] Events with `retry_count >= 3` are moved to `amara_dlq`
- [ ] Original event marked as `failed` in `event_queue`
- [ ] DLQ record includes `failure_reason` from last attempt
- [ ] OTLP span/event emitted when a message is DLQ'd
- [ ] Unit test: simulate 3 failures → verify DLQ routing

**Size:** M
**Dependencies:** S1.4, S1.6
**Blocks:** None

---

### S1.8: Write crash-recovery test

**Description:** Integration test that verifies task and event persistence across a simulated crash. Kills the process mid-operation and restarts, then verifies that committed data survived and uncommitted data did not corrupt the database.

**Acceptance Criteria:**
- [ ] Test creates tasks and enqueues events
- [ ] Process is killed (SIGKILL or equivalent)
- [ ] After restart, committed tasks are present with correct state
- [ ] After restart, committed events are present and consumable
- [ ] SQLite integrity check passes after recovery
- [ ] Test runs in CI without flakiness

**Size:** M
**Dependencies:** S1.3, S1.4
**Blocks:** None

---

### S1.9: Export and document task CRUD API

**Description:** Define and export the public TypeScript API surface for task create/read/update/delete operations. This is the interface consumed by the orchestrator (Epic 5), agents (Epic 9), and dashboard (Epic 10).

**Acceptance Criteria:**
- [ ] Exported functions: `createTask`, `getTask`, `listTasks`, `updateTask`, `deleteTask`
- [ ] Each function has TypeScript types for params and return values
- [ ] JSDoc comments on each exported function
- [ ] Functions enforce state machine rules (delegates to S1.3)
- [ ] Integration test: full CRUD cycle

**Size:** S
**Dependencies:** S1.3
**Blocks:** S3.4, S10.2

## Story Sequencing

```
Phase 1 (parallel start):
  S1.1: Define task schema ─────────────┐
  S1.2: SQLite setup + migration runner ─┤
                                         │
Phase 2 (unblocked by Phase 1):         │
  S1.3: Task state machine ◄────────────┤ (needs S1.1, S1.2)
  S1.5: triage_log schema ◄─────────────┤ (needs S1.2)
  S1.6: event_queue + DLQ schemas ◄─────┘ (needs S1.2)
                                         │
Phase 3 (unblocked by Phase 2):         │
  S1.4: Event queue impl ◄──────────────┤ (needs S1.2, S1.6)
  S1.9: Task CRUD API ◄─────────────────┤ (needs S1.3)
                                         │
Phase 4 (unblocked by Phase 3):         │
  S1.7: Poison message + DLQ ◄──────────┤ (needs S1.4, S1.6)
  S1.8: Crash-recovery test ◄───────────┘ (needs S1.3, S1.4)
```

## Dependencies

- Epic 0 must be complete (architecture gate)

## Open Questions

- ~~What fields does a Task record need at minimum?~~ **Resolved:** `task_id`, `state`, `channel`, `created_at`, `updated_at`, `correlation_id` (Epic 0, Section 6)
- ~~Should the event bus be synchronous or async?~~ **Resolved:** Async — SQLite WAL queue with poll consumer (D3)
- ~~Do we need soft-delete on tasks, or just a `failed`/`cancelled` state?~~ **Resolved:** No soft-delete; use `failed` state for terminal failures (Epic 0, Section 7)
- ~~Migration tool: raw SQL files, a migration library, or hand-rolled?~~ **Resolved:** Raw SQL files + hand-rolled runner. Numbered `.sql` files in `migrations/`, `schema_version` table tracks applied migrations, ~50 lines TS. Node.js >=22 built-in `node:sqlite` eliminates external deps.
