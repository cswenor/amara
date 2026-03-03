# Epic 9 — Specialist Agents

## Overview

Implements the specialist agents that Amara delegates to: Comms, Research, Coding, Writing, and Generic Doer. Each agent has its own model, tools, mandate, and agent bundle (defined in Epic 4 format).

## Goals

- Each agent receives a structured input and returns a structured output
- Agents run in isolated sessions (no shared state between runs)
- Each agent has a clearly scoped mandate — it does one class of work well
- Generic Doer provides a catch-all for tasks that don't match a specialist

## Scope

**In:**
- Comms agent (messages, email drafts, WhatsApp replies)
- Research agent (web search, document summarization, fact lookup)
- Coding agent (code generation, PR creation, debugging)
- Writing agent (prose, docs, summaries)
- Generic Doer (broad capability fallback)
- Agent bundle files for each (YAML front-matter + markdown body — D10)
- Structured input/output contracts per agent (using Amara structured protocol — D7)
- Session attachments for file passing between orchestrator and agents (v2026.3.2-beta.1, beta — verify on stable)

**Out:**
- Agent routing (Epic 4)
- Orchestration (Epic 5)
- Channel send (Epics 7, 8)

## Key Decisions

- [ ] What model does each agent use? (cost vs. capability tradeoff)
- [ ] What tools does each agent have access to? (web search / code interpreter / file system?)
- [ ] Structured output format: JSON schema / TypeScript type / Zod?
- [x] File passing between agents: via session attachments (v2026.3.2-beta.1, beta — verify on stable). Enables structured file handoff without filesystem workarounds.
- [x] `tools.profile` requirement: all agent bundles must explicitly declare `tools.profile` (v2026.3.2-beta.1 breaking change). See [Epic 4 schema](04-agent-registry-and-routing.md) and [migration checklist](00-integration-architecture.md#16-minimum-openclaw-version).
- [x] How long can an agent run? <45s P95, with interim updates every 15s (Epic 0, Section 8)
- [ ] How do agents handle "I can't do this"?

## Success Metrics

- Each agent handles 5 representative inputs and produces correct structured outputs
- No agent has access to tools outside its declared mandate
- Structured output validation catches malformed responses
- Generic Doer correctly handles inputs that no other agent matches

## Definition of Done

- [ ] Comms agent implemented with agent bundle
- [ ] Research agent implemented with agent bundle
- [ ] Coding agent implemented with agent bundle
- [ ] Writing agent implemented with agent bundle
- [ ] Generic Doer implemented with agent bundle
- [ ] Structured input/output contracts defined per agent
- [ ] 5 representative test inputs per agent pass
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| `tools.profile` default change breaks agent tool access | All agent bundles MUST declare `tools.profile` explicitly. See [Epic 4 migration checklist](00-integration-architecture.md#16-minimum-openclaw-version). |
| Agent scope creep (agents doing work outside their mandate) | Strict tool access lists; mandate review in bundle |
| Agents produce inconsistent output formats | Structured output validation on every response |
| Generic Doer too capable — routing always falls through to it | Monitor routing distribution; tune routing logic |
| Long-running agents time out | Timeout + partial result contract defined per agent |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Configure `tools.profile` for all agent bundles (required field — v2026.3.2-beta.1 breaking change)
- [ ] Implement session attachment file passing for agent delegation (D15, beta-caveat)
- [ ] Define structured input/output contracts
- [ ] Implement Comms agent
- [ ] Implement Research agent
- [ ] Implement Coding agent
- [ ] Implement Writing agent
- [ ] Implement Generic Doer
- [ ] Write representative test suite per agent

## Dependencies

- Epic 4 (agent registry and routing) — bundle format must be defined
- Epic 5 (orchestrator) — delegation interface must be defined

## Open Questions

- Which model does each specialist agent use in v1?
- Does the Coding agent have filesystem/shell access, or is it sandboxed?
- ~~Can an agent spawn sub-agents, or does it always return to the orchestrator?~~ **Partially resolved:** Sub-agent spawning is supported by OpenClaw sessions (D0, Section 2); orchestrator coordinates via `agentToAgent` (D7)
