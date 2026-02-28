# Amara System Architecture

> This document is a living overview. It will be updated as Epic 0 (Integration Architecture) resolves open questions about component boundaries.

## Overview

Amara is an opinionated personal assistant built on top of OpenClaw. She monitors inbound channels, plans and delegates work to specialist agents, tracks tasks to completion, and escalates to the human only when genuinely necessary.

Amara is a **manager, not a doer**. She runs on a fast model and coordinates specialist agents — she does not do deep work herself.

## High-Level Component Map

```
                        ┌──────────────────────────────────┐
                        │             OpenClaw             │
                        │  (plugin host, channel adapters) │
                        └────────────┬─────────────────────┘
                                     │ events / API
                        ┌────────────▼─────────────────────┐
                        │        Amara Orchestrator        │
                        │  fast model · task planner       │
                        │  delegator · status tracker      │
                        └────┬──────────────┬──────────────┘
                             │              │
              ┌──────────────▼──┐    ┌──────▼──────────────┐
              │  Task State DB  │    │   Agent Registry     │
              │  (SQLite)       │    │   (YAML bundles)     │
              └─────────────────┘    └──────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
  ┌──────▼──────┐   ┌────────▼────┐   ┌─────────▼────┐
  │  Comms      │   │  Research   │   │  Coding /    │
  │  Agent      │   │  Agent      │   │  Writing /   │
  └─────────────┘   └─────────────┘   │  Generic     │
                                       └──────────────┘
```

## Key Components

### OpenClaw (Host Platform)
The plugin host that provides channel adapters (WhatsApp, email, calendar), webhook lifecycle, and the plugin SDK. Amara runs as one or more OpenClaw plugins.

### Amara Orchestrator (Epic 5)
The always-on brain. Receives inbound events, acknowledges immediately, breaks work into tasks, delegates to specialist agents, and monitors progress. Runs on a fast model.

### Task State Machine (Epic 1)
SQLite-backed persistence for every task Amara is tracking. States: `pending → in_progress → blocked → complete | failed`. Survives restarts.

### Agent Registry (Epic 4)
YAML + markdown bundles that define each specialist agent — its model, tools, mandate, and routing hints. The registry is the source of truth for routing decisions.

### Channel Platform (Epic 7)
Adapter contract, auth/webhook lifecycle, retry logic, and idempotency guarantees. All channel implementations (Epic 8) sit on top of this.

### Dashboard (Epic 10)
Minimal web UI showing active, pending, and completed tasks. Audit log view. Mobile-optimized.

## Data Flow (happy path)

```
1. Inbound message arrives on a channel
2. OpenClaw fires message_received event
3. Amara orchestrator receives it, creates a Task record, acknowledges
4. Orchestrator plans: which specialist(s) are needed?
5. Specialist agent(s) spawned with structured input
6. Agent(s) return structured output
7. Orchestrator composes response, marks task complete
8. Response sent via channel adapter
```

## Non-Functional Requirements

> To be filled in during Epic 0.

- **Latency** — TBD
- **Reliability** — TBD
- **Scaling** — single-user initially; multi-user considered in design
- **Privacy** — PII handling, data retention, secret scoping

## Open Questions

> These will be resolved in Epic 0.

- What does OpenClaw provide natively vs. what must Amara own?
- Which components should be reusable standalone plugins?
- What must live outside OpenClaw entirely?
- Single process or multiple processes?
- Event bus: in-process, SQLite queue, or external?
