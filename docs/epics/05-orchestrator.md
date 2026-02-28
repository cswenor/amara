# Epic 5 — Amara Orchestrator

## Overview

The always-on brain. Receives inbound events from channels, acknowledges immediately, breaks work into tasks, delegates to specialist agents via the registry, and tracks everything to completion. Runs on a fast model.

## Goals

- Immediate acknowledgment on every inbound request (no silent drops)
- Tasks are planned and delegated without human intervention
- Every delegation is tracked and its outcome recorded
- Amara never claims to have done something she hasn't

## Scope

**In:**
- Inbound event handler (receives from channel adapters)
- Immediate acknowledgment logic
- Task planner (break request into subtasks)
- Agent delegation (spawn agent with structured input, await structured output)
- Status tracking (in-progress, blocked, complete)
- Task summarization on completion

**Out:**
- Recovery and re-check scheduling (Epic 6)
- Human escalation (Epic 6)
- Specific agent implementations (Epic 9)
- Channel adapters (Epics 7, 8)

## Key Decisions

- [ ] What model does the orchestrator use? (fast model — which one?)
- [ ] How does the orchestrator decompose a request? (single prompt / multi-step reasoning?)
- [ ] Delegation interface: how does the orchestrator call an agent and receive its output?
- [ ] Are subtasks run sequentially or in parallel by default?
- [ ] What is the acknowledgment message format? (terse / informative?)

## Success Metrics

- Acknowledgment sent within 2 seconds of inbound event in all test cases
- Orchestrator correctly delegates to the right agent for 10 representative inputs
- Task status is accurate and queryable at any point in the lifecycle
- No task is silently dropped (failed tasks are still recorded)

## Definition of Done

- [ ] Inbound event handler implemented
- [ ] Immediate acknowledgment sent before any planning begins
- [ ] Task planner breaks requests into subtasks
- [ ] Agent delegation implemented end-to-end
- [ ] Task status updated at each lifecycle transition
- [ ] Task summarization on completion
- [ ] Integration test: request in → acknowledgment → delegation → outcome → summary
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Orchestrator model produces inconsistent plans | Add structured output validation; log all plans for inspection |
| Agent delegation hangs indefinitely | Timeout + stall detection (Epic 6) |
| Acknowledgment delayed by planning | Acknowledge before planning — two separate steps |
| Parallel subtasks create conflicting writes | Decide concurrency model in Epic 0 |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Implement inbound event handler
- [ ] Implement immediate acknowledgment
- [ ] Implement task planner
- [ ] Implement agent delegation interface
- [ ] Wire task status transitions
- [ ] Implement task summarization
- [ ] Write end-to-end integration test

## Dependencies

- Epic 1 (core infrastructure) — task DB and event bus
- Epic 4 (agent registry and routing) — registry must be queryable

## Open Questions

- What fast model does Amara run on in v1?
- Does the orchestrator maintain conversation context across turns, or is each request independent?
- How are parallel subtasks coordinated — and what happens if one fails?
