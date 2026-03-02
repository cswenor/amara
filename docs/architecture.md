# Amara System Architecture

> This document is a living overview updated from Epic 0 (Integration Architecture) decisions.

## Overview

Amara is an opinionated personal assistant built on top of **OpenClaw** (selected as host platform — see [Epic 0, Section 1.5](epics/00-integration-architecture.md#15-platform-selection)). She monitors inbound channels, plans and delegates work to specialist agents, tracks tasks to completion, and escalates to the human only when genuinely necessary.

Amara is a **manager, not a doer**. She runs on a fast model and coordinates specialist agents — she does not do deep work herself.

## High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      OpenClaw Gateway                           │
│                   (single Node.js process)                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Channel Providers                         │  │
│  │  WhatsApp · Telegram · Gmail · Calendar · iMessage · ...  │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │ chat events                      │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Amara Normalization Layer                       │  │
│  │       (channel events → common AmaraEvent envelope)       │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Amara Event Queue                             │  │
│  │         (SQLite WAL, at-least-once delivery)               │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               Amara Orchestrator                           │  │
│  │     Intake · Planner (fast model) · Delegation Engine     │  │
│  └────────┬──────────────────────────────┬───────────────────┘  │
│           │                              │                      │
│           ▼                              ▼                      │
│  ┌────────────────────┐     ┌────────────────────────────┐     │
│  │   Task State DB    │     │     Agent Registry         │     │
│  │   (SQLite)         │     │  (YAML + MD bundles)       │     │
│  └────────────────────┘     └────────────┬───────────────┘     │
│                                           │                     │
│           ┌───────────────┬───────────────┼──────────────┐     │
│           │               │               │              │     │
│    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼────┐ ┌──────▼──┐  │
│    │   Comms     │ │  Research   │ │  Coding   │ │ Generic │  │
│    │   Agent     │ │  Agent      │ │  Agent    │ │  Doer   │  │
│    └─────────────┘ └─────────────┘ └───────────┘ └─────────┘  │
│                                                                 │
│  ┌────────────────────┐     ┌────────────────────────────┐     │
│  │  Amara Scheduler   │     │  Dashboard (A2UI Canvas)   │     │
│  │  (heartbeat-driven)│     │  (task views, audit log)   │     │
│  └────────────────────┘     └────────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │             Diagnostic-OTel (OTLP telemetry)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### OpenClaw (Host Platform)

The plugin host that provides channel adapters (WhatsApp via Baileys, Telegram, Gmail via `gog` with Pub/Sub push, Calendar via `gog` with full CRUD, iMessage via BlueBubbles, plus 15+ more), webhook lifecycle management, Docker sandboxing (per-session with security controls), OTLP observability (17+ metrics), and a modular plugin SDK (channels, tools, hooks, commands, services, providers). Amara runs as a set of tool plugins within the OpenClaw Gateway process.

**Selected over** Hermes Agent, Moltworker, and others. See [Platform Selection rationale](epics/00-integration-architecture.md#15-platform-selection).

### Amara Orchestrator (Epic 5)

The always-on brain. Receives inbound events via the event queue, acknowledges immediately, breaks work into tasks, delegates to specialist agents, and monitors progress. Runs on a fast model. Lives in-process as an OpenClaw tool plugin.

### Task State Machine (Epic 1)

SQLite-backed persistence (separate database from OpenClaw memory) for every task Amara is tracking. States: `pending → in_progress → blocked → complete | failed`. Survives restarts via WAL mode.

### Event Queue (Epic 1)

SQLite WAL-mode queue providing at-least-once delivery for task-critical events. Events are written before processing and marked complete after. Crash recovery re-processes uncommitted events.

### Agent Registry (Epic 4)

YAML + markdown bundles that define each specialist agent — its model, tools, mandate, and routing hints. File-based for version control and hot-reload. The registry is the source of truth for capability-based routing decisions.

### Channel Platform (Epic 7)

Normalization layer that converts OpenClaw channel-specific events to a common AmaraEvent envelope format. All channel implementations (Epic 8) sit on top of this, using OpenClaw's native adapters for transport.

### Dashboard (Epic 10)

Task visibility UI leveraging OpenClaw's Canvas/A2UI feature. Served via the Gateway's HTTP endpoint. Shows active, pending, and completed tasks plus audit log. Core dashboard in Milestone 1 for early visibility; mobile-optimized layout deferred to Milestone 6 polish.

## Data Flow (happy path)

```
1. Inbound message arrives on a channel (WhatsApp, Gmail, etc.)
2. OpenClaw Gateway fires chat event via channel provider
3. Amara normalization layer converts to common AmaraEvent envelope
4. Event written to Amara Event Queue (at-least-once guarantee)
5. Orchestrator reads event, creates Task record, sends immediate acknowledgment
6. Planner (fast model) classifies: which specialist(s) are needed?
7. Specialist agent(s) spawned via OpenClaw sub-agent with structured input
8. Agent(s) return structured output
9. Orchestrator composes response, marks task complete, queue entry done
10. Response sent via channel adapter through Gateway
```

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Acknowledgment latency (P95) | < 1000 ms |
| Agent response (P95) | < 45 s (with interim updates every 15s) |
| Task persistence | RPO = 0 for acknowledged tasks (process crash/OOM; see [Epic 0 caveats](epics/00-integration-architecture.md#8-non-functional-requirements)) |
| Availability | ≥ 95% uptime (no formal SLA) |
| Concurrent tasks | Max 10 |
| Memory footprint | < 512 MB RSS |

## Security Summary

- **Least-privilege OAuth** — minimum scopes per service (gmail.readonly + gmail.send, calendar.readonly + calendar.events, contacts.readonly)
- **Secrets** — delegated to OpenClaw auth-profiles mechanism (`~/.openclaw/agents/{agentId}/agent/auth-profiles.json`), never logged
- **PII retention** — 90-day auto-purge, configurable
- **Audit** — correlation-ID linked to OTLP traces
- **Deletion** — `amara delete-my-data` purges all Amara-owned data

See [Epic 0, Section 9](epics/00-integration-architecture.md#9-security-and-privacy-constraints) for full details.

## Key Decisions

All architectural decisions are recorded in [Epic 0, Decision Log](epics/00-integration-architecture.md#10-decision-log). Key highlights:

| Decision | Choice |
|---|---|
| Host platform | OpenClaw (D0) |
| Orchestrator location | In-process OpenClaw plugin (D1) |
| Task storage | Separate SQLite DB (D2) |
| Event reliability | SQLite WAL queue (D3) |
| Agent registry format | File-based YAML + MD (D10) |
| Dashboard hosting | OpenClaw Canvas/A2UI (D8) |
