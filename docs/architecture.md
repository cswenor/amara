# Amara System Architecture

> This document is a living overview updated from Epic 0 (Integration Architecture) decisions.

## Overview

Amara is an opinionated personal assistant built on top of **OpenClaw** (selected as host platform — see [Epic 0, Section 1.5](epics/00-integration-architecture.md#15-platform-selection)). She operates in two modes:

1. **Monitored mode** — passively observes ALL communications (full email inbox, all WhatsApp conversations, full calendar). A fast triage layer makes autonomous decisions on most messages (archive spam, label, mark read, note context) without entering the full orchestrator pipeline.
2. **Direct mode** — the user talks to Amara specifically (dedicated thread, specific address). All messages enter the full orchestrator pipeline for planning and delegation.

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
│  │               Amara Triage Layer                           │  │
│  │    Mode Router · Fast Triage · Action Engine               │  │
│  │    (monitored: 90%+ handled autonomously)                  │  │
│  │    (direct: all pass through to orchestrator)              │  │
│  └────────┬──────────────────────────────┬───────────────────┘  │
│           │ direct + escalated           │ autonomous actions   │
│           ▼                              ▼ (archive, label..)  │
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
│  │  (heartbeat-driven)│     │  (tasks, triage, audit)    │     │
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

### Amara Triage Layer (Epic 1, Epic 5)

The fast decision engine between normalization and orchestrator. Classifies every inbound event into one of two modes:

- **Direct mode** — user is talking to Amara. All events pass through to the event queue and orchestrator.
- **Monitored mode** — passive observation. The triage layer makes autonomous decisions: archive spam (<200ms, rules-based), draft replies (fast model), or escalate to orchestrator (~10% of monitored messages).

All triage decisions are logged to the `triage_log` table for Dashboard visibility and audit.

### Amara Orchestrator (Epic 5)

The always-on brain. Receives direct-mode events and escalated monitored-mode events via the event queue. Acknowledges immediately, breaks work into tasks, delegates to specialist agents, and monitors progress. Runs on a fast model. Lives in-process as an OpenClaw tool plugin.

### Task State Machine (Epic 1)

SQLite-backed persistence (separate database from OpenClaw memory) for every task Amara is tracking. States: `pending → in_progress → blocked → complete | failed`. Survives restarts via WAL mode.

### Event Queue (Epic 1)

SQLite WAL-mode queue providing at-least-once delivery for task-critical events. Events are written before processing and marked complete after. Crash recovery re-processes uncommitted events.

### Agent Registry (Epic 4)

YAML + markdown bundles that define each specialist agent — its model, tools, mandate, and routing hints. File-based for version control and hot-reload. The registry is the source of truth for capability-based routing decisions.

### Channel Platform (Epic 7)

Normalization layer that converts OpenClaw channel-specific events to a common AmaraEvent envelope format. The envelope includes a `mode` field (`monitored` | `direct`) determined by channel binding configuration. All channel implementations (Epic 8) sit on top of this, using OpenClaw's native adapters for transport. Channels are bound at account level for monitoring (full inbox, all conversations) with specific threads/addresses designated as direct-mode channels.

**Write permissions:** Visibility does not imply write permission. Monitored channels default to read + silent actions only. Outbound messages in monitored channels require explicit authorization — either a per-instruction grant (one-time, expires after task) or a standing rule (persistent, stored in `~/.amara/config.yaml`). The triage layer structurally cannot send messages. See [D14](epics/00-integration-architecture.md#10-decision-log).

### Dashboard (Epic 10)

Task visibility UI leveraging OpenClaw's Canvas/A2UI feature. Served via the Gateway's HTTP endpoint. Shows active, pending, and completed tasks, triage activity feed (what Amara is doing autonomously), and audit log. Core dashboard in Milestone 1 for early visibility; mobile-optimized layout deferred to Milestone 6 polish.

## Data Flows

### Direct mode (user talks to Amara)

```
1. User sends message to Amara on a channel (WhatsApp, Gmail, etc.)
2. OpenClaw Gateway fires chat event via channel provider
3. Normalization layer converts to AmaraEvent envelope (mode: "direct")
4. Triage layer: direct mode → pass through to event queue
5. Event written to Amara Event Queue (at-least-once guarantee)
6. Orchestrator reads event, creates Task record, sends immediate acknowledgment
7. Planner (fast model) classifies: which specialist(s) are needed?
8. Specialist agent(s) spawned via OpenClaw sub-agent with structured input
9. Agent(s) return structured output
10. Orchestrator composes response, marks task complete, queue entry done
11. Response sent via channel adapter through Gateway
```

### Monitored mode (passive observation)

```
1. Message arrives on monitored channel (email to inbox, WhatsApp group, etc.)
2. OpenClaw Gateway fires chat event via channel provider
3. Normalization layer converts to AmaraEvent envelope (mode: "monitored")
4. Triage layer classifies message (rules + tiny model, <200ms):
   a. ~90%: Autonomous action (archive, label, mark read) → done, logged
   b. ~10%: Escalate to orchestrator → written to event queue
5. Escalated events follow the same orchestrator pipeline as direct mode
```

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Triage decision latency (P95) | < 200 ms |
| Triage throughput | ≥ 500 messages/day |
| Acknowledgment latency (P95) | < 1000 ms (direct + escalated events) |
| Agent response (P95) | < 45 s (with interim updates every 15s) |
| Task persistence | RPO = 0 for acknowledged tasks (process crash/OOM; see [Epic 0 caveats](epics/00-integration-architecture.md#8-non-functional-requirements)) |
| Availability | ≥ 95% uptime (no formal SLA) |
| Concurrent tasks | Max 10 |
| Memory footprint | < 512 MB RSS |

## Security Summary

- **Least-privilege OAuth** — minimum scopes per service (gmail.readonly + gmail.send + gmail.compose + gmail.modify, calendar.readonly + calendar.events, contacts.readonly)
- **Secrets** — delegated to OpenClaw auth-profiles mechanism (`~/.openclaw/agents/{agentId}/agent/auth-profiles.json`), never logged
- **PII retention** — 90-day auto-purge (30-day for triage log; OAuth tokens exempt), configurable
- **Channel write control** — monitored channels are read-only by default; outbound messages require explicit user authorization (per-instruction or standing rule)
- **Audit** — correlation-ID linked to OTLP traces; every outbound message in monitored channels logged with grant type
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
| Two-mode architecture | Triage layer: monitored (passive) + direct (assistant) (D13) |
| Channel write permissions | Monitored channels read-only by default; outbound requires explicit grant (D14) |
