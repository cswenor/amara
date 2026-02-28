# Amara Roadmap

Milestones follow epic dependencies. No milestone begins until its predecessors are complete.

## Milestone 0 — Architecture Gate

**Epics:** 0
**Goal:** Resolve all boundary questions before a line of implementation code is written.

- [ ] OpenClaw native capabilities audited
- [ ] Gap analysis complete
- [ ] Component boundaries decided (plugin vs service vs external)
- [ ] Runtime topology chosen
- [ ] Exit criteria met → implementation unlocked

## Milestone 1 — Foundation

**Epics:** 1, 2, 3
**Goal:** Persistence, security contracts, and observability wiring in place before any feature work.

- [ ] SQLite task state machine operational
- [ ] Event bus wired
- [ ] OAuth/secret handling defined
- [ ] Audit logging live
- [ ] Trace and log pipeline running

## Milestone 2 — Agent Infrastructure

**Epics:** 4
**Goal:** Agent definition schema finalized; registry queryable; routing logic working against stub agents.

- [ ] YAML + markdown agent bundle format defined
- [ ] Registry loads and validates bundles
- [ ] Routing/matching returns correct agent for test inputs
- [ ] Three agent types covered (template / role / generic doer)

## Milestone 3 — Orchestrator Core

**Epics:** 5, 6
**Goal:** Amara can receive a request, plan it, delegate to an agent, track it, and recover from stalls.

- [ ] Immediate acknowledgment on inbound
- [ ] Task planning and delegation working end-to-end
- [ ] Follow-up scheduler re-checking in-progress tasks
- [ ] Human escalation path working
- [ ] Retry-with-feedback working

## Milestone 4 — Channels

**Epics:** 7, 8
**Goal:** WhatsApp, Gmail, and Calendar connected through a stable adapter interface.

- [ ] Channel adapter contract finalized
- [ ] Auth and webhook lifecycle handled
- [ ] Retry and idempotency guarantees met
- [ ] WhatsApp integration live
- [ ] Gmail integration live
- [ ] Calendar integration live

## Milestone 5 — Specialist Agents

**Epics:** 9
**Goal:** Comms, Research, Coding, Writing, and Generic Doer agents operational.

- [ ] Comms agent handling messages and drafts
- [ ] Research agent handling web/document queries
- [ ] Coding agent handling code and PRs
- [ ] Writing agent handling prose tasks
- [ ] Generic doer as fallback

## Milestone 6 — Visibility & Deployment

**Epics:** 10, 11
**Goal:** Dashboard live; install flow documented; system runnable by someone other than the author.

- [ ] Dashboard showing active/pending/history
- [ ] Audit log browsable in UI
- [ ] Mobile-optimized layout working
- [ ] Install flow documented and tested
- [ ] Account connection flow working
- [ ] Getting-started guide complete

## Future

Items not assigned to a milestone yet:

- Recurring / cron-style tasks
- Sub-agent progress relay (real-time status)
- Model-based routing (replace keyword heuristics)
- Multi-user support
- Additional channels (Slack, SMS, etc.)
