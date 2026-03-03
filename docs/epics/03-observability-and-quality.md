# Epic 3 — Observability & Quality

## Overview

Wires in tracing, structured logging, agent outcome scoring, failure taxonomy, and evaluation infrastructure early — so that all subsequent epics can be instrumented as they are built, not retrofitted.

## Goals

- Every request through the system is traceable end-to-end
- Agent outcomes are scored and stored
- Failures are classified by a consistent taxonomy
- Evals can be run against real or synthetic task histories
- Dashboards and alerts are available before the system goes to production

## Scope

**In:**
- Structured logging standards (fields, levels, no-PII-in-logs rule)
- Distributed trace context propagation (correlation IDs through orchestrator → agent)
- Agent outcome scoring schema (success / partial / failed / escalated)
- Failure taxonomy (classification of every failure mode)
- Eval harness (replay task histories, compare outcomes)
- Metrics definitions (latency, success rate, escalation rate, stall rate)
- Triage decision metrics: triage latency (P95 <200ms), confidence scores, escalation rate (D13, Section 8)
- `triage_log` as a data source for triage decision analysis and dashboard feeds

**Out:**
- Dashboard UI (Epic 10) — observability produces data; dashboard displays it
- Specific agent implementations (Epics 9) — they use the instrumentation, not define it
- Alerting / on-call infrastructure (future)

## Key Decisions

- [x] Log format and trace context: OTLP/OpenTelemetry — native to OpenClaw, not overkill (D0, Section 2 capabilities matrix)
- [x] Where are agent outcome scores stored? Amara Task DB (`~/.amara/tasks.db`) alongside task records (D2)
- [x] Eval harness: Separate `*.eval.ts` files + `npm run eval`. Same runner (`node --test`), separate file convention: unit tests = `*.test.ts`, evals = `*.eval.ts`. Add `"eval": "node --test **/*.eval.ts"` to package.json. Evals replay task histories, compare outcomes — slow by nature, should not block fast unit tests.
- [x] Failure taxonomy: Epic 3 defines the base taxonomy as a TypeScript string union in `src/types/failures.ts`. Base categories: `api_failure`, `agent_failure`, `task_failure`, `triage_error`, `poison_message`, `auth_failure`, `validation_failure`. Epics 5 and 9 extend the union with domain-specific categories. Epic 3 owns the base + extension documentation.
- [x] Evals in `node --test` or separate? Same runner, separate command. `npm test` runs `*.test.ts`, `npm run eval` runs `*.eval.ts`.
- [x] Outcome score thresholds: Config-driven with documented defaults. >0.95 confidence for destructive triage actions, >0.7 for escalation. Runtime configuration via `~/.amara/config.yaml`. Enforced by orchestrator (Epic 5) and triage layer. Users can tune thresholds without code changes.

## Success Metrics

- 100% of task lifecycle transitions are logged with a correlation ID
- Agent outcome score is recorded for every completed or failed agent call
- A single command reruns evals against the last N task histories
- Failure root cause is determinable from logs without inspecting agent internals

## Definition of Done

- [ ] Structured logging standard documented and enforced via lint/test
- [ ] Correlation ID propagated from inbound event through to agent response
- [ ] Agent outcome scoring schema defined and stored
- [ ] Failure taxonomy documented
- [ ] Eval harness implemented (can replay and score task histories)
- [ ] Metrics definitions documented
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Observability skipped under time pressure | Make it a blocking gate for orchestrator and agent epics |
| Log verbosity causes performance issues | Async log writes; configurable levels |
| Eval harness not maintained as agents evolve | Eval format versioned alongside agent schema |
| PII leaks into traces | Apply same sanitization rules as security audit log |

## Stories

### S3.1: Define structured logging standard

**Description:** Document the structured logging convention (field names, levels, required fields) and add a lint rule or test that enforces it. This standard is consumed by every epic and specifically unblocks S2.3 (log-sanitization test).

**Acceptance Criteria:**
- [ ] Logging standard document: required fields (`timestamp`, `level`, `correlation_id`, `component`), optional fields, format (JSON)
- [ ] Log levels defined: `debug`, `info`, `warn`, `error`
- [ ] No-PII-in-logs rule documented with examples of what's allowed vs. forbidden
- [ ] Lint rule or test that catches unstructured `console.log` in `src/`

**Size:** S
**Dependencies:** None
**Blocks:** S2.3, S3.3

---

### S3.2: Implement OTLP/OpenTelemetry integration

**Description:** Wire up OpenTelemetry tracing using OpenClaw's native OTLP support (D0). Configure the trace exporter, set up the global tracer provider, and verify spans are emitted for a basic request lifecycle.

**Acceptance Criteria:**
- [ ] OpenTelemetry SDK initialized at process startup
- [ ] OTLP exporter configured (endpoint configurable via env var)
- [ ] Basic span created for a sample operation (e.g., task state transition)
- [ ] Span attributes include `correlation_id`, `component`, `operation`
- [ ] Integration test: verify span is exported (use in-memory exporter for test)

**Size:** M
**Dependencies:** None
**Blocks:** S3.3, S3.7, S3.8

---

### S3.3: Implement correlation ID propagation

**Description:** Ensure the `correlation_id` field from the tasks table is propagated through all OTLP spans and structured log entries for a request lifecycle. Any log or span produced while processing a task must include that task's correlation ID. The `sessionKey` from OpenClaw session lifecycle hooks (v2026.3.2-beta.1, beta — verify on stable) provides a native session identity that can be mapped to Amara's `correlation_id`, simplifying cross-system trace correlation.

**Acceptance Criteria:**
- [ ] `correlation_id` from task record injected into OTLP trace context
- [ ] `sessionKey` (v2026.3.2-beta.1, beta) mapped to `correlation_id` for native session identity correlation
- [ ] All structured log entries within a task's processing include `correlation_id`
- [ ] Propagation works across event bus boundaries (producer → consumer)
- [ ] Integration test: create task → process event → verify correlation_id in all spans/logs

**Size:** M
**Dependencies:** S1.1, S3.2
**Blocks:** None

---

### S3.4: Define and implement agent outcome scoring

**Description:** Define the outcome scoring schema (success / partial / failed / escalated) and implement storage in the Task DB. Scores are written when an agent completes work on a task.

**Acceptance Criteria:**
- [ ] Outcome enum: `success`, `partial`, `failed`, `escalated`
- [ ] `outcome` and `outcome_score` columns added to tasks table (via migration)
- [ ] `outcome_score` is a float 0.0–1.0 representing confidence
- [ ] Scoring function exported for agents to call
- [ ] Unit test: score a task → read back → verify outcome and score

**Size:** M
**Dependencies:** S1.1, S1.9
**Blocks:** S3.6

---

### S3.5: Document failure taxonomy

**Description:** Define the base failure taxonomy as a TypeScript string union type. Document each category with examples, expected frequency, and how it should be handled (retry, alert, escalate, DLQ).

**Acceptance Criteria:**
- [ ] `src/types/failures.ts` exports base union type with categories: `api_failure`, `agent_failure`, `task_failure`, `triage_error`, `poison_message`, `auth_failure`, `validation_failure`
- [ ] Each category has a JSDoc comment with: definition, example, handling strategy
- [ ] Extension rules documented: how Epics 5 and 9 add domain-specific categories
- [ ] Mapping table: failure category → recommended action (retry/alert/escalate/DLQ)

**Size:** S
**Dependencies:** None
**Blocks:** S3.6

---

### S3.6: Build eval harness

**Description:** Implement the evaluation harness that replays task histories and compares outcomes. Uses `*.eval.ts` file convention and runs via `npm run eval`. Evals are separate from unit tests to avoid slowing down the fast test suite.

**Acceptance Criteria:**
- [ ] `"eval": "node --test **/*.eval.ts"` added to package.json scripts
- [ ] At least one sample eval file exists demonstrating the pattern
- [ ] Eval replays a recorded task history (fixture file)
- [ ] Eval compares actual vs. expected outcome using scoring from S3.4
- [ ] Eval uses failure taxonomy from S3.5 for classification
- [ ] `npm run eval` exits 0 on pass, non-zero on failure

**Size:** L
**Dependencies:** S3.4, S3.5
**Blocks:** None

---

### S3.7: Define metrics and their collection points

**Description:** Document all OTLP metrics Amara will emit, where they are emitted from (collection points), and who consumes them. This is a reference document that guides instrumentation across all epics. New hook events from v2026.3.2-beta.1 (`onAgentEvent`, `onSessionTranscriptUpdate`, `message:preprocessed`) provide additional native collection points for delegation metrics, transcript tracking, and message preprocessing latency.

**Acceptance Criteria:**
- [ ] Metrics inventory table: metric name, type (counter/histogram/gauge), unit, collection point, consumer
- [ ] Core metrics defined: `task_latency`, `task_success_rate`, `escalation_rate`, `stall_rate`, `event_queue_depth`
- [ ] Collection points identified for each metric (which module/function emits it)
- [ ] OTLP metric emission verified for at least one metric (integration test)

**Size:** S
**Dependencies:** S3.2
**Blocks:** S3.8

---

### S3.8: Implement triage decision metrics

**Description:** Implement metrics collection for triage decisions: latency (P95 <200ms target), confidence scores, and escalation rate. Reads from the `triage_log` table and emits OTLP metrics.

**Acceptance Criteria:**
- [ ] Triage latency histogram emitted per decision (from `triage_log.latency_ms`)
- [ ] Confidence score histogram emitted per decision
- [ ] Escalation rate counter: total decisions vs. escalated decisions
- [ ] Metrics tagged with `channel` and `mode` dimensions
- [ ] Unit test: insert triage_log entries → verify metrics emitted with correct values

**Size:** M
**Dependencies:** S1.5, S3.2, S3.7
**Blocks:** None

## Story Sequencing

```
Phase 1 (parallel start):
  S3.1: Structured logging standard ───┐
  S3.2: OTLP/OpenTelemetry integration ┤
  S3.5: Failure taxonomy ──────────────┘

Phase 2 (unblocked by Phase 1):
  S3.3: Correlation ID propagation ◄──── (needs S1.1, S3.2)
  S3.4: Agent outcome scoring ◄───────── (needs S1.1, S1.9)
  S3.7: Metrics + collection points ◄─── (needs S3.2)

Phase 3 (unblocked by Phase 2):
  S3.6: Eval harness ◄──────────────────  (needs S3.4, S3.5)
  S3.8: Triage decision metrics ◄──────── (needs S1.5, S3.2, S3.7)
```

## Dependencies

- Epic 0 (architecture gate)
- Epic 1 (core infrastructure) — event bus used to emit observability events
- Note: `sessionKey` (v2026.3.2-beta.1, beta) simplifies S3.3 correlation ID propagation by providing native session identity

## Open Questions

- ~~Is OpenTelemetry the right choice for a single-user personal assistant, or is it overkill?~~ **Resolved:** Not overkill — OTLP is native to OpenClaw; we get it for free (D0, Section 2)
- ~~Should evals be part of `node --test` or a separate command?~~ **Resolved:** Same runner (`node --test`), separate command. `npm test` runs `*.test.ts`, `npm run eval` runs `*.eval.ts`. Evals are slow by nature and should not block fast unit tests.
- ~~Who defines acceptable outcome score thresholds?~~ **Resolved:** Config-driven with documented defaults. >0.95 for destructive triage actions, >0.7 for escalation. Runtime config via `~/.amara/config.yaml`; enforced by orchestrator (Epic 5).
