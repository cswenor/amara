# Epic 6 — Recovery & Human-in-the-loop

## Overview

Handles what happens when tasks stall, agents fail, or Amara genuinely needs a human decision. Adds scheduled re-checks, stall detection, human escalation, and retry-with-specific-feedback so nothing falls through the cracks.

## Goals

- In-progress tasks are periodically re-checked and never silently stale
- Stalled agents are detected and re-queued with feedback
- When Amara is blocked, she escalates with a specific, actionable question — not a vague handoff
- Human input unblocks tasks and re-triggers the agent

## Scope

**In:**
- Follow-up scheduler (re-check in-progress tasks on a configurable interval)
- Stall detection (task has been in-progress too long without progress)
- Human escalation (send a question to the human via the originating channel)
- Retry-with-feedback (re-run agent with human answer appended to context)
- Escalation message format and content standards

**Out:**
- Initial task planning (Epic 5)
- Channel send (Epics 7, 8)
- Dashboard visibility of stalled tasks (Epic 10)

## Key Decisions

- [ ] Stall threshold: how long before a task is considered stalled?
- [ ] Re-check interval: fixed / configurable per task?
- [ ] Escalation format: how does Amara phrase a question to the human?
- [ ] What happens if the human never answers? (re-escalate / time out / fail task?)
- [ ] Can the human proactively unblock a task without being asked?

## Success Metrics

- No task remains in-progress indefinitely without a status update or escalation
- Escalation messages are specific (contain the blocking question, not just "I need help")
- Human answer successfully unblocks a test task in integration test
- Re-check scheduler fires on the correct interval in all test cases

## Definition of Done

- [ ] Follow-up scheduler implemented and tested
- [ ] Stall detection implemented (configurable threshold)
- [ ] Human escalation logic implemented
- [ ] Escalation message format defined
- [ ] Retry-with-feedback implemented
- [ ] Human-unblocks-task integration test passes
- [ ] Infinite-loop guard (escalation does not re-trigger itself)
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Escalation storm (many tasks escalating simultaneously) | Rate limit escalations; batch or prioritize |
| Human answer misrouted to wrong task | Strict task ID correlation on all replies |
| Re-check scheduler drifts under load | Use wall-clock timestamps, not interval counters |
| Retry loop escalates again immediately | Track retry count; limit retries before final failure |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Implement follow-up scheduler
- [ ] Implement stall detection
- [ ] Implement human escalation with question formatting
- [ ] Implement retry-with-feedback
- [ ] Write human-unblocks-task integration test
- [ ] Add retry count limit and final-failure state

## Dependencies

- Epic 1 (core infrastructure) — task state machine
- Epic 5 (orchestrator) — tasks must exist before recovery can operate on them

## Open Questions

- Should the scheduler be a cron job, a setInterval, or event-driven (e.g., on task update)?
- How does the human reply get correlated back to the task? (reply detection / explicit command?)
- Is there a maximum number of retries before a task is permanently failed?
