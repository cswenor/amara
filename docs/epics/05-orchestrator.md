# Epic 5 — Amara Orchestrator

## Overview

The always-on brain. Receives events from the event queue (direct messages + triage escalations), acknowledges immediately, breaks work into tasks, delegates to specialist agents via the registry, and tracks everything to completion. Runs as an in-process OpenClaw tool plugin (D1) on a fast model.

## Goals

- Immediate acknowledgment on every inbound request (no silent drops)
- Tasks are planned and delegated without human intervention
- Every delegation is tracked and its outcome recorded
- Amara never claims to have done something she hasn't

## Scope

**In:**
- Inbound event handler (receives from event queue — direct messages + triage escalations, D13)
- Immediate acknowledgment logic (<1s template response before planning — Epic 0, Section 8)
- Task planner (break request into subtasks)
- Agent delegation via OpenClaw `agentToAgent` + Amara structured protocol (D7) — ACP dispatch default-enabled (v2026.3.2-beta.1, stable)
- Delegation tracking via `onAgentEvent` and `onSessionTranscriptUpdate` (v2026.3.2-beta.1, beta — verify on stable). Note: `onSessionTranscriptUpdate` data is PII-bearing and subject to Epic 2 retention policy.
- Session attachments for file passing between orchestrator and specialist agents (v2026.3.2-beta.1, beta — verify on stable)
- Status tracking (in-progress, blocked, complete)
- Task summarization on completion
- D14 write permission check on outbound messages (monitored channels require explicit grant)
- Triage escalation intake (Level 3 escalations from triage layer — D13, Section 7)
- Grant schema design for per-instruction and standing-rule write permissions (D14)

**Out:**
- Recovery and re-check scheduling (Epic 6)
- Human escalation (Epic 6)
- Specific agent implementations (Epic 9)
- Channel adapters (Epics 7, 8)

## Key Decisions

- [x] Orchestrator location: in-process OpenClaw tool plugin (D1)
- [x] Delegation interface: OpenClaw `agentToAgent` + Amara structured protocol (D7) — ACP dispatch default-enabled (v2026.3.2-beta.1, stable)
- [x] Acknowledgment: <1s template response before planning begins (Epic 0, Section 8)
- [x] Delegation progress tracking: via native `onAgentEvent`/`onSessionTranscriptUpdate` runtime events (D15, beta — verify on stable). Provides real-time delegation status without polling.
- [ ] What model does the orchestrator use? ("fast model" — specific model TBD)
- [ ] Are subtasks run sequentially or in parallel by default?

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
| Agent delegation hangs indefinitely | Timeout + stall detection (Epic 6). `onAgentEvent` (v2026.3.2-beta.1, beta) enables early stall detection via runtime event monitoring. Note: `onSessionTranscriptUpdate` data is PII-bearing — subject to Epic 2 retention policy. |
| Acknowledgment delayed by planning | Acknowledge before planning — two separate steps |
| Parallel subtasks create conflicting writes | Decide concurrency model in Epic 0 |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Implement inbound event handler (consumes from event queue — direct + escalated events)
- [ ] Implement immediate acknowledgment (<1s template response — Section 8)
- [ ] Implement task planner
- [ ] Implement agent delegation interface (OpenClaw `agentToAgent` — D7, ACP default-enabled)
- [ ] Implement delegation progress tracking via `onAgentEvent`/`onSessionTranscriptUpdate` (D15, beta-caveat)
- [ ] Implement session attachment file passing for delegation (D15, beta-caveat)
- [ ] Wire task status transitions
- [ ] Implement task summarization
- [ ] Implement D14 write permission authorization (check grant before outbound on monitored channels)
- [ ] Implement triage escalation handling (Level 3 intake from triage layer — D13)
- [ ] Design and implement grant schema (per-instruction + standing-rule write permissions — D14)
- [ ] Write end-to-end integration test

## Dependencies

- Epic 1 (core infrastructure) — task DB and event queue
- Epic 4 (agent registry and routing) — registry must be queryable
- Epic 7 (channel platform) — needs AmaraEvent envelope format (D11) for inbound event parsing

## Open Questions

- What fast model does Amara run on in v1?
- ~~Does the orchestrator maintain conversation context across turns, or is each request independent?~~ **Partially resolved:** Orchestrator receives only direct + escalated events from the queue (D13); memory is handled by OpenClaw native memory + Amara Task DB for task context (D12)
- How are parallel subtasks coordinated — and what happens if one fails? *(Note: `onAgentEvent` from v2026.3.2-beta.1 makes parallel subtask monitoring more viable — each subtask's runtime events can be tracked independently)*
