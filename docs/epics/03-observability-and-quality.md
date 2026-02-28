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

**Out:**
- Dashboard UI (Epic 10) — observability produces data; dashboard displays it
- Specific agent implementations (Epics 9) — they use the instrumentation, not define it
- Alerting / on-call infrastructure (future)

## Key Decisions

- [ ] Log format: JSONL to file / stdout / structured logger library?
- [ ] Trace context: OpenTelemetry, or a simpler correlation-ID approach?
- [ ] Where are agent outcome scores stored? (same DB as tasks / separate table?)
- [ ] Eval harness: what's the interface? (CLI? test runner? notebook?)
- [ ] Failure taxonomy: who owns it and how is it extended?

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

> Placeholder — to become GitHub issues.

- [ ] Define structured logging standard
- [ ] Implement correlation ID propagation
- [ ] Define and implement agent outcome scoring
- [ ] Document failure taxonomy
- [ ] Build eval harness
- [ ] Define metrics and their collection points

## Dependencies

- Epic 0 (architecture gate)
- Epic 1 (core infrastructure) — event bus used to emit observability events

## Open Questions

- Is OpenTelemetry the right choice for a single-user personal assistant, or is it overkill?
- Should evals be part of `node --test` or a separate command?
- Who defines acceptable outcome score thresholds?
