# Epic 0 — Integration Architecture

> **Architectural gate.** Nothing else starts until this epic is complete.

## 1. Context and Goals

Amara needs a host platform — an "OS for AI agents" that provides channel adapters, session management, tool execution, and extensibility. Before any implementation begins, we must evaluate the landscape, select the best platform, understand exactly what it provides, identify gaps Amara must fill, and decide where every component lives.

This is a **decision doc**, not a feature. Its output is a set of binding architectural decisions that all subsequent epics will implement against.

**Goals:**

- Evaluate candidate host platforms and select the best fit
- Map the selected platform's native capabilities
- Identify gaps Amara must own
- Decide component boundaries (plugin vs Amara service vs external)
- Define the runtime topology
- Define data and control flows
- Establish non-functional requirements and security constraints
- Produce a decision log that future contributors can reference

## 1.5. Platform Selection

### Candidates Evaluated

Two platforms survived initial screening as viable hosts for Amara: **OpenClaw** and **Hermes Agent**.

### Comparison Matrix

| Criterion | OpenClaw | Hermes Agent | Notes |
|---|---|---|---|
| **Language/Runtime** | TypeScript / Node.js | Python 3.10+ (Node.js sidecar for WhatsApp) | OpenClaw is pure TS; Hermes needs polyglot runtime |
| **WhatsApp** | native (Baileys) | native (Baileys via Node.js bridge) | Both use same Baileys library |
| **Gmail inbound** | native (Pub/Sub push via `gog gmail watch`) | gap (no email channel) | OpenClaw has full push-based Gmail integration with auto-renewal, Tailscale tunnel |
| **Gmail outbound** | native (`gog gmail send` — text, HTML, drafts, reply) | gap | Full send/compose/reply/draft API via `gog` CLI |
| **Calendar read** | native (`gog calendar events`) | gap | Full event listing with date range, color support |
| **Calendar write** | native (`gog calendar create/update`) | gap | Create/update events with color IDs (1-11) |
| **Telegram** | native | native | Parity |
| **Discord** | native | native | Parity |
| **Slack** | native | native | Parity |
| **iMessage** | native (BlueBubbles) | gap | OpenClaw advantage |
| **Signal** | native | gap | OpenClaw advantage |
| **Google Chat / Teams / Matrix** | native | gap | OpenClaw advantage |
| **Plugin system** | Modular registration API (channels, tools, hooks, commands, services, providers, HTTP routes) | Skill documents (SKILL.md) + toolsets | OpenClaw more structured with typed plugin SDK; Hermes more portable |
| **Plugin ecosystem** | 13,700+ skills on ClawHub | 40+ bundled skills, agentskills.io standard | OpenClaw far larger ecosystem |
| **Memory** | SQLite + sqlite-vec + FTS5 + LanceDB (vector DB), MEMORY.md | Multi-level (MEMORY.md + USER.md + SOUL.md + skills + Honcho) | Both capable; Hermes has more structured layering; OpenClaw has dual backend (SQLite-vec + LanceDB) |
| **Agent delegation** | Sub-agents + multi-agent routing | `delegate_task` spawns isolated subagents | OpenClaw more mature (explicit allowlisting) |
| **Scheduling** | Cron + heartbeats (config-based) | Built-in cron (croniter library) | Parity |
| **Observability** | Native OTLP via Diagnostic-OTel | Hook-based events + session logs + WandB | OpenClaw advantage — structured telemetry |
| **Security/sandbox** | Docker per-session (network isolation, FS restrictions) | 5 backends (Local/Docker/SSH/Singularity/Modal) | Hermes more flexible; OpenClaw more integrated |
| **Event bus** | 27 plugin hook types + diagnostic event stream (federated, no centralized bus) | Hook-based lifecycle events (not pub/sub) | Both lack a centralized event bus; OpenClaw's hook system is comprehensive (session, message, tool, subagent, gateway lifecycle) |
| **Canvas/UI** | A2UI (agent-generated HTML via Gateway) | CLI/TUI only | OpenClaw advantage |
| **Model flexibility** | 13+ built-in providers + local inference | 4 backends (Nous/OpenRouter/OpenAI/custom) + litellm | OpenClaw broader native support |
| **Maturity** | ~4 months (Nov 2025), active community, 13.7K+ community skills (as of 2026-03-02) | v0.1.0 (announced Feb 26, 2026), early stage (as of 2026-03-02) | OpenClaw significantly more battle-tested |
| **License** | MIT | MIT | Parity |

### Evaluation Criteria (Weighted)

| # | Criterion | Weight | OpenClaw | Hermes Agent | Rationale |
|---|---|---|---|---|---|
| 1 | Channel coverage | High | **Strong** — 8 core + 15+ extension channels including Gmail (Pub/Sub push), Calendar (full CRUD), iMessage | Weak — 4 channels, no email/calendar | Amara's core value prop is monitoring WhatsApp, Gmail, Calendar |
| 2 | Plugin extensibility | High | **Strong** — modular plugin API (channels, tools, hooks, commands, services, providers), 13.7K+ ecosystem | Good — SKILL.md standard, 40+ bundled | Amara needs specialist agents and custom tools |
| 3 | Maturity/stability | Medium | **Good** — more battle-tested, active community | Weak — v0.1.0, no formal releases | Production reliability for a personal assistant |
| 4 | Memory system | Medium | Good — SQLite + vector hybrid | **Strong** — multi-level layered approach | Context persistence across sessions |
| 5 | Observability | Medium | **Strong** — native OTLP | Adequate — hooks + logs | Debugging multi-agent system requires structured telemetry |
| 6 | Security model | Medium | Good — Docker per-session | **Good** — 5 backend options | Sandboxing untrusted agent execution |

### Decision: OpenClaw

**OpenClaw is selected as Amara's host platform.**

**Primary reasons:**

1. **Gmail and Calendar integration** is native — Gmail has full Pub/Sub push (`gog gmail watch`) with auto-renewal and `gog gmail send` for outbound; Calendar has full CRUD (`gog calendar events/create/update`). Hermes Agent has zero email or calendar support.
2. **iMessage support** via BlueBubbles adds a high-value channel that Hermes lacks entirely.
3. **Modular plugin system** (channels, tools, hooks, commands, services, providers, HTTP routes) with a typed SDK maps cleanly to Amara's specialist agent architecture.
4. **OTLP observability** is table stakes for debugging a multi-agent system. OpenClaw ships this natively.
5. **Larger ecosystem** (13,700+ ClawHub skills) provides ready-made tools that Amara can leverage.
6. **Canvas/A2UI** can be leveraged for the Dashboard (Epic 10) without building a separate web server.
7. **More mature** with larger community and more production usage.

**Hermes strengths to incorporate into Amara's design:**

- Multi-level memory architecture (MEMORY.md + USER.md + SOUL.md layering) — inform Amara's own context management
- SKILL.md as an open standard for portable agent skills — consider adopting for agent bundles
- Honcho-style user modeling — inform personalization features
- Modal/Singularity sandbox backends — consider if scaling beyond Docker

**Governance note:** OpenClaw's creator joined OpenAI (Feb 14, 2026) and announced the project will move to an open-source foundation. This introduces governance uncertainty but also signals institutional backing. Monitor this transition.

### Screened-Out Candidates

| Candidate | Reason Excluded | Evidence |
|---|---|---|
| Moltworker (Cloudflare) | Serverless — can't access local files or run shell commands. Amara needs persistent local state + tool execution. | Cloudflare blog: "cannot access your local files or run shell commands" |
| Nanobot | Only Telegram + WhatsApp. No Gmail, Calendar, or iMessage. | GitHub repo README (as of 2026-03-02) |
| NanoClaw | WhatsApp only (Baileys). No other channels. | GitHub repo README (as of 2026-03-02) |
| memU | No messaging channel integration at all. Local-only memory system. | GitHub repo README (as of 2026-03-02) |
| NullClaw/PicoClaw | Edge/embedded focus. Too minimal for multi-channel personal assistant. | GitHub repo README (as of 2026-03-02) |
| Agent S3 | Computer-use agent (OSWorld benchmark), not a messaging platform host. | Simular AI docs |

> See Decision Log entry **D0** for the formal decision record.

## 2. OpenClaw Capabilities Matrix

> Status legend:
> - `native` — built-in and documented in platform runtime/channel/tooling
> - `partial` — available with constraints or via adjunct workflows
> - `gap` — not natively provided for Amara's required behavior

| Capability | Status | Source / Proof | Notes |
|---|---|---|---|
| WhatsApp inbound events | native | [OpenClaw docs — channels](https://docs.openclaw.ai/concepts/architecture), Baileys channel adapter | Gateway routes messages via Baileys provider; fires `chat` events |
| WhatsApp outbound send | native | OpenClaw Gateway, Baileys provider | Agent replies routed through Gateway to WhatsApp |
| Gmail inbound events | native | `gog gmail watch serve` + Pub/Sub push, [`src/hooks/gmail-watcher.ts`](https://github.com/openclaw/openclaw/blob/main/src/hooks/gmail-watcher.ts) | Full Pub/Sub push: `gog gmail watch start` registers with Gmail API (auto-renews every 12h), `gog gmail watch serve` runs daemon on port 8788. Tailscale Funnel/Serve for public HTTPS endpoint. Auto-starts on Gateway boot when configured. |
| Gmail outbound send | native | `gog gmail send`, [`skills/gog/SKILL.md`](https://github.com/openclaw/openclaw/blob/main/skills/gog/SKILL.md) | Full send API: `--body` (plain text), `--body-html` (HTML), `--body-file` (file/stdin), `--reply-to-message-id` (thread replies). Draft create/send via `gog gmail drafts create/send`. |
| Calendar read | native | `gog calendar events`, [`skills/gog/SKILL.md`](https://github.com/openclaw/openclaw/blob/main/skills/gog/SKILL.md) | `gog calendar events <calendarId> --from <iso> --to <iso>`. Full event listing with date ranges. |
| Calendar write | native | `gog calendar create/update`, [`skills/gog/SKILL.md`](https://github.com/openclaw/openclaw/blob/main/skills/gog/SKILL.md) | `gog calendar create` with `--summary`, `--from`, `--to`, `--event-color` (11 color IDs). `gog calendar update` for modifications. No invite management or RSVP (Amara gap). |
| Plugin hook event system | native | [`src/plugins/types.ts`](https://github.com/openclaw/openclaw/blob/main/src/plugins/types.ts) | 27 hook types: `message_received`, `message_sending`, `message_sent`, `session_start/end`, `before/after_tool_call`, `subagent_spawning/spawned/ended`, `gateway_start/stop`, `llm_input/output`, etc. Priority-based ordering. No centralized event bus (OpenClawBus RFC #15016 still RFC). |
| Persistent storage | native | [`extensions/memory-core/`](https://github.com/openclaw/openclaw/tree/main/extensions/memory-core), [`extensions/memory-lancedb/`](https://github.com/openclaw/openclaw/tree/main/extensions/memory-lancedb) | Dual backend: SQLite + sqlite-vec (cosine vector search + FTS5 BM25 keyword) and LanceDB (OpenAI embeddings). Auto-capture on messages, auto-recall on context. |
| Auth / secret management | native | [`src/agents/auth-profiles/`](https://github.com/openclaw/openclaw/tree/main/src/agents/auth-profiles) | Per-agent workspace scoping. Tokens stored at `~/.openclaw/agents/{agentId}/agent/auth-profiles.json`. Supports `SecretRef` indirection. Legacy `auth.json` auto-migrated. Fallback chain: agent-specific → main agent → legacy. |
| Webhook lifecycle (register, renew, verify) | native | [`src/hooks/gmail-watcher.ts`](https://github.com/openclaw/openclaw/blob/main/src/hooks/gmail-watcher.ts), [`src/gateway/hooks.ts`](https://github.com/openclaw/openclaw/blob/main/src/gateway/hooks.ts) | Gmail: auto-registration via `gog gmail watch start`, auto-renewal every 12h, verification via `X-Gog-Token` header. Gateway hooks: webhook endpoint at `/hooks/*` with template-based routing, auth (Bearer/X-OpenClaw-Token), rate limiting (20 failed/60s → 429). |
| Retry primitives | native | [`src/infra/retry.ts`](https://github.com/openclaw/openclaw/blob/main/src/infra/retry.ts), [`src/infra/backoff.ts`](https://github.com/openclaw/openclaw/blob/main/src/infra/backoff.ts) | Exponential backoff with jitter, configurable attempts/min/max delay. Per-channel tuning (Discord: 3 attempts 500-30000ms; Telegram: 3 attempts 400-30000ms + `retry_after` extraction). Circuit breaker for Telegram 401s (suspends after 10 consecutive failures). |
| Deduplication / idempotency | native | [`src/infra/dedupe.ts`](https://github.com/openclaw/openclaw/blob/main/src/infra/dedupe.ts), [`src/plugin-sdk/persistent-dedupe.ts`](https://github.com/openclaw/openclaw/blob/main/src/plugin-sdk/persistent-dedupe.ts) | Dual-layer: in-memory (TTL + LRU, 20-min TTL, 5000 entries for web inbound) + persistent disk (file-locked JSON with exponential backoff locking). Inflight promise deduplication. Used for WhatsApp, Discord, Feishu webhooks. **Amara still needs cross-channel task-level dedup** (same request via WhatsApp + email → single task). |
| Logging / observability | native | [Diagnostic-OTel plugin](https://signoz.io/blog/monitoring-openclaw-with-opentelemetry/) | OTLP traces (model usage, webhook processing), metrics (token usage, cost, context size, queue depth), logs. Routes to any OTLP backend. |
| Agent delegation / sub-agents | native | [`src/agents/subagent-spawn.ts`](https://github.com/openclaw/openclaw/blob/main/src/agents/subagent-spawn.ts), [`src/agents/tools/sessions-spawn-tool.ts`](https://github.com/openclaw/openclaw/blob/main/src/agents/tools/sessions-spawn-tool.ts) | Hierarchical spawning: `runtime="subagent"` (direct) or `runtime="acp"`. Modes: `run` (one-shot) or `session` (persistent). Max spawn depth configurable. Workspace isolation, sandbox mode inheritance. Session visibility clamped to `spawned` by default. Inter-agent messaging requires explicit `tools.agentToAgent` allowlisting. |
| Scheduling (cron / heartbeats) | native | [`src/cron/service.ts`](https://github.com/openclaw/openclaw/blob/main/src/cron/service.ts), [`src/cron/types.ts`](https://github.com/openclaw/openclaw/blob/main/src/cron/types.ts) | Three schedule types: `at` (one-time), `every` (interval), `cron` (expression with timezone). Two execution modes: `systemEvent` (triggers as system message) or `agentTurn` (direct agent execution with model override). Delivery to any channel. Failure tracking with consecutive error count. Stagger windows to prevent thundering herd. |
| Canvas / A2UI | native | [`src/canvas-host/`](https://github.com/openclaw/openclaw/tree/main/src/canvas-host), [`vendor/a2ui/`](https://github.com/openclaw/openclaw/tree/main/vendor/a2ui) | Agent-generated HTML served via Gateway. A2UI spec with Angular + Lit renderers. Cross-platform action bridge (iOS/Android/Web). Live reload in dev mode. File serving with range requests. |
| Docker sandboxing | native | [`src/agents/sandbox/`](https://github.com/openclaw/openclaw/tree/main/src/agents/sandbox), `Dockerfile.sandbox` | Per-session containers (scope: session/agent/shared). Workspace access: none/ro/rw. Security: blocked bind sources (`docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`), capability dropping, seccomp/AppArmor profiles, network isolation (bridge/none/custom). Resource limits: pids, memory, CPU, ulimits. |
| Multi-provider LLM | native | [Model providers docs](https://docs.openclaw.ai/concepts/model-providers) | 13+ built-in (OpenAI, Anthropic, Gemini, OpenRouter, Groq, etc.) + local (Ollama, vLLM, LM Studio). Two API types: openai-completions, anthropic-messages. |

## 3. Gap Analysis

> What OpenClaw does NOT provide that Amara must own. Prioritized by downstream epic dependency.

### P0 — Blocks Epic 1 Start

| Gap | Proposed Owner | Downstream Epic | Notes |
|---|---|---|---|
| Task state machine | Amara core | Epic 1 | SQLite-backed states: `pending → in_progress → blocked → complete \| failed`. OpenClaw has no task lifecycle concept. |
| Follow-up / re-check scheduler | Amara core | Epic 1 | OpenClaw cron exists but is session-isolated. Need task-aware scheduling that re-checks in-progress tasks and re-queues stalled work. |
| Cross-channel task-level idempotency | Amara core | Epic 1 | OpenClaw has message-level dedup (dual-layer: memory + persistent disk) per channel. Amara needs *task*-level dedup across channels — same request via WhatsApp and email must not create duplicate tasks. Requires semantic matching, not just message ID dedup. |
| Event reliability (DB-backed queue) | Amara core | Epic 1 | OpenClaw plugin hooks are synchronous and don't provide replay on failure. Amara needs at-least-once delivery for task-critical events. SQLite WAL-mode queue with crash recovery. |

### P1 — Blocks Later Epics

| Gap | Proposed Owner | Downstream Epic | Notes |
|---|---|---|---|
| Orchestrator / planner | Amara core | Epic 5 | The always-on brain. OpenClaw provides agent sessions but no orchestration layer. Amara must build: intake → plan → delegate → track → complete. |
| Agent registry | Amara core | Epic 4 | YAML + markdown bundles defining specialist agents. OpenClaw multi-agent routing is per-channel, not per-capability. Amara needs capability-based routing. |
| Structured I/O contract | Amara core | Epic 4 | Agents need typed input/output schemas for task assignments and results. OpenClaw provides JSON transport (D7), but Amara must define the semantic contract: task assignment format, result report format, and schema versioning. |
| Multi-agent coordination | Amara core | Epic 5 | Parallel task execution, result aggregation, conflict resolution. OpenClaw `agentToAgent` is basic point-to-point. |
| Human escalation loop | Amara core | Epic 6 | When blocked or ambiguous, route to human for decision. OpenClaw has no escalation concept. |
| Gmail enhanced compose | Amara service | Epic 8 | `gog gmail send` provides text, HTML, reply-to, and draft support natively. Amara needs: attachment handling (beyond `--body-file`), template-based compose, batch operations. Build as thin wrapper over `gog`. |
| Calendar event model | Amara service | Epic 8 | `gog` provides full CRUD (list/create/update with colors). v1 scope: conflict detection and scheduling suggestions. v2 scope: invite management, RSVP (requires direct Calendar API calls beyond `gog`). Build as analysis layer on top of native `gog` calendar data. |
| Dashboard UI | Amara service | Epic 10 | Task visibility, audit log. Leverage OpenClaw Canvas/A2UI as the rendering surface. Core dashboard (task views, audit log) in Milestone 1 for early visibility. Mobile-optimized layout deferred to Milestone 6 polish. |
| Channel adapter normalization | Amara core | Epic 7 | OpenClaw channels emit different event shapes. Amara needs a common envelope format for the orchestrator. |
| Cross-channel threading / reply context | Amara core | Epic 7, Epic 8 | How are reply chains and thread context preserved across channels in the AmaraEvent envelope? Each channel has different threading models (WhatsApp: quoted message, Gmail: thread ID, Telegram: reply_to_message_id). Must be resolved before normalization layer. |

### P2 — Enhancements

| Gap | Proposed Owner | Downstream Epic | Notes |
|---|---|---|---|
| Task audit log | Amara core | Epic 3 | Append-only log of all task state transitions, agent actions, and human decisions. Feed into OTLP for correlation. |
| Custom webhook targets | Amara service | Epic 7 | OpenClaw handles Gmail Pub/Sub webhook lifecycle natively (auto-registration, 12h renewal, verification). Amara may need custom webhook endpoints for future non-Google push sources. Low priority. |

## 4. Boundary Decisions

> For each major component, record whether it lives as an OpenClaw plugin, an Amara service within the OpenClaw process, or an external system.

| Component | Location | Rationale |
|---|---|---|
| **Orchestrator** | Amara service (in-process OpenClaw tool plugin) | Must receive events with minimal latency. Running in-process avoids IPC overhead and uses OpenClaw's session management. Exposed as a tool plugin that the Gateway invokes on incoming events. |
| **Task DB** | Separate SQLite database (Amara-owned) | OpenClaw's SQLite is for memory/vectors. Task state has different access patterns (transactional writes, status queries) and must be independently backupable. Co-located on disk, separate file. |
| **Agent registry** | Amara-owned file-based (YAML + markdown bundles) | OpenClaw's multi-agent routing is per-channel. Amara needs per-capability routing with model/tool/mandate definitions. File-based allows version control and hot-reload. |
| **Channel adapters** | OpenClaw channel plugins + Amara normalization layer | Use OpenClaw's native channel plugins (Baileys, Telegram, etc.) for transport. Amara adds a thin normalization layer that converts channel-specific events to a common envelope format. |
| **Dashboard** | Amara service leveraging OpenClaw Canvas/A2UI | Canvas provides the rendering surface (served via Gateway HTTP). Amara owns the UI logic, task views, and audit log display. No separate web server needed. |
| **Scheduler** | Amara service (in-process, backed by Task DB) | OpenClaw cron is session-isolated and lacks task awareness. Amara's scheduler reads pending/stalled tasks from Task DB and emits re-check events. Uses OpenClaw heartbeats as the tick source. |
| **Event reliability layer** | Amara service (SQLite WAL-mode queue) | OpenClaw events are not persisted or replayed. Amara wraps event intake in a DB-backed queue: write to queue → process → mark complete. Guarantees at-least-once delivery. |
| **Inter-agent communication** | OpenClaw `agentToAgent` + Amara protocol | Use OpenClaw's native inter-agent messaging (JSON with schema validation) for transport. Amara defines the message protocol: structured task assignments, result reports, and status updates. |

## 5. Candidate Plugin Inventory

> Components that could be extracted as reusable standalone OpenClaw plugins vs. Amara-internal modules.

| Component | Type | Owner | Extraction Cost | Status | Notes |
|---|---|---|---|---|---|
| WhatsApp channel adapter | OpenClaw channel plugin | OpenClaw (existing) | n/a | done | Native Baileys adapter. Use as-is. |
| Gmail enhanced tools | OpenClaw tool plugin | Amara | low | planned (Epic 8) | Thin wrapper over native `gog gmail` — adds attachment handling, template compose, batch operations. Core send/receive is native. |
| Calendar analysis tools | OpenClaw tool plugin | Amara | medium | planned (Epic 8) | v1: conflict detection, scheduling suggestions on native `gog calendar` CRUD. v2: invite management, RSVP (requires direct Calendar API). |
| Normalization layer | Amara internal | Amara | low | planned (Epic 7) | Converts channel events to common envelope. Too Amara-specific to extract. |
| Task state machine | Amara internal | Amara | low | planned (Epic 1) | Core to Amara's identity. Not extractable. |
| Orchestrator | Amara internal | Amara | low | planned (Epic 5) | Amara's brain. Not extractable. |
| Agent registry | Amara internal | Amara | medium | planned (Epic 4) | Could be extracted later as a general-purpose agent routing plugin. Keep internal for now. |
| Event queue | Amara internal | Amara | low | planned (Epic 1) | SQLite WAL queue. Could become an OpenClaw plugin if OpenClawBus RFC doesn't ship. |
| Dashboard views | OpenClaw Canvas app | Amara | medium | planned (Epic 10) | A2UI-rendered views. Could become a template for other agent dashboards. |
| Diagnostic-OTel | OpenClaw plugin | OpenClaw (existing) | n/a | done | Native observability. Use as-is. |

## 6. Runtime Topology

### Process Model

Single-process architecture. Amara runs as a set of tool plugins within the OpenClaw Gateway process. This avoids IPC overhead and leverages the Gateway's existing session management, WebSocket server, and event routing.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OpenClaw Gateway                             │
│                     (single Node.js process)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Channel Providers                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │   │
│  │  │ WhatsApp │ │ Telegram │ │  Gmail   │ │    iMessage    │  │   │
│  │  │ (Baileys)│ │          │ │ (gog+cron│ │ (BlueBubbles)  │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬─────────┘  │   │
│  └───────┼─────────────┼───────────┼──────────────┼─────────────┘   │
│          │  chat events│          │              │                   │
│          ▼             ▼          ▼              ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Amara Normalization Layer                        │   │
│  │         (common envelope: channel → AmaraEvent)              │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Amara Event Queue                           │   │
│  │              (SQLite WAL, at-least-once)                      │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Amara Orchestrator                           │   │
│  │    ┌──────────┐  ┌───────────┐  ┌────────────────────┐       │   │
│  │    │  Intake   │  │  Planner  │  │  Delegation Engine │       │   │
│  │    │  (ack)    │  │  (fast    │  │  (spawn agents,    │       │   │
│  │    │          │  │   model)  │  │   track results)   │       │   │
│  │    └──────────┘  └───────────┘  └────────────────────┘       │   │
│  └──────────┬───────────────────────────────┬───────────────────┘   │
│             │                               │                       │
│             ▼                               ▼                       │
│  ┌──────────────────────┐       ┌──────────────────────────────┐   │
│  │    Task State DB     │       │      Agent Registry          │   │
│  │   (SQLite, separate  │       │   (YAML + MD bundles,        │   │
│  │    file from OC mem) │       │    file-based, hot-reload)   │   │
│  └──────────────────────┘       └──────────────┬───────────────┘   │
│                                                 │                   │
│                                                 ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Specialist Agents                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │   │
│  │  │  Comms   │ │ Research │ │  Coding  │ │ Generic Doer │    │   │
│  │  │  Agent   │ │  Agent   │ │  Agent   │ │              │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────┐       ┌──────────────────────────────┐   │
│  │  Amara Scheduler     │       │   Dashboard (A2UI Canvas)    │   │
│  │  (heartbeat-driven,  │       │   served at /__openclaw__/   │   │
│  │   reads Task DB)     │       │   canvas/amara-dashboard     │   │
│  └──────────────────────┘       └──────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               Diagnostic-OTel Plugin                         │   │
│  │         (OTLP traces, metrics, logs → backend)               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

External:
  ┌──────────────────┐    ┌──────────────────┐
  │  OTLP Backend    │    │  Docker Sandbox   │
  │  (SigNoz/Grafana)│    │  (per-session     │
  │                  │    │   agent isolation) │
  └──────────────────┘    └──────────────────┘
```

### Event Bus

No external broker. Events flow through the **Amara Event Queue** — a SQLite WAL-mode table that provides:

- **At-least-once delivery**: Events are written before processing, marked complete after.
- **Crash recovery**: Uncommitted events are re-processed on restart.
- **Ordering**: FIFO within a channel, concurrent across channels.
- **Backpressure**: Queue depth exposed as an OTLP metric. Processing pauses if depth exceeds threshold (see NFRs).

OpenClaw's native event system (WebSocket push) is used for real-time UI updates to the Dashboard. It is **not** used for task-critical event delivery.

### Failure Containment

Single-process means a crash in any plugin takes down the Gateway. Mitigations:

- **Process supervisor:** Run Gateway under systemd/pm2 with automatic restart. SQLite WAL + event queue ensure no acknowledged work is lost across restarts.
- **Event-loop blocking:** Long-running agent work must be delegated to OpenClaw sub-agent sessions (which run in separate contexts). The orchestrator's event loop must never block on agent execution.
- **Poison messages:** Events that fail processing 3 times are moved to a dead-letter table (`amara_dlq`) with the error context. They do not block queue processing. A human alert is emitted via OTLP.
- **Plugin crash isolation:** OpenClaw runs agent sessions in isolated contexts. A specialist agent crash does not take down the orchestrator — it surfaces as a task failure handled by the error path (Section 7).
- **Circuit breaking:** If an external service (Gmail API, Calendar API) fails repeatedly, the orchestrator disables that channel's processing temporarily and emits a health warning. For push-based channels (Gmail Pub/Sub), incoming webhooks are accepted but processing is paused. For tool-based channels (Calendar), invocations are suspended. Re-enables after a configurable backoff (default: 5 minutes).

### Data Stores

| Store | Engine | Owner | Location | Purpose |
|---|---|---|---|---|
| OpenClaw Memory | SQLite + sqlite-vec + FTS5 | OpenClaw | `~/.openclaw/memory/` | Agent memory, conversation history, vector search |
| Amara Task DB | SQLite (WAL mode) | Amara | `~/.amara/tasks.db` | Task state machine, event queue, audit log |
| Agent Registry | Filesystem (YAML + MD) | Amara | `~/.amara/agents/` | Agent definitions, routing hints, model configs |
| Amara Config | Filesystem (YAML) | Amara | `~/.amara/config.yaml` | User preferences, channel configs, schedule configs |
| OAuth Tokens | OpenClaw workspace | OpenClaw | `~/.openclaw/agents/{agentId}/agent/auth-profiles.json` | Google OAuth tokens, API keys (per-agent scoped). Fallback chain: agent-specific → main agent → legacy `auth.json`. |

## 7. Data and Control Flows

### Happy Path: Inbound Message → Response

```
1. [WhatsApp]  User sends message "Can you check my calendar for conflicts tomorrow?"
       │
       ▼
2. [Gateway]   Baileys provider receives message, emits `chat` event
       │
       ▼
3. [Normalize]  Amara normalization layer converts to AmaraEvent:
                { channel: "whatsapp", sender: "user", text: "...", ts: 1709337600 }
       │
       ▼
4. [Queue]     Event written to Amara Event Queue (SQLite WAL)
                Status: PENDING
       │
       ▼
5. [Intake]    Orchestrator reads event from queue
                → Sends immediate acknowledgment: "Checking your calendar now."
                → Acknowledgment routed back through Gateway → WhatsApp
       │
       ▼
6. [Planner]   Fast model classifies request:
                → Domain: calendar
                → Action: read + analyze
                → Agent: calendar-specialist (or generic-doer with calendar tools)
       │
       ▼
7. [Task DB]   Task record created:
                { id: "t_abc123", status: "in_progress", agent: "calendar",
                  input: { ... }, channel: "whatsapp", created: 1709337600 }
       │
       ▼
8. [Delegate]  Orchestrator spawns specialist agent via OpenClaw sub-agent:
                → Agent receives structured input (date range, conflict criteria)
                → Agent invokes `gog` tool to read Calendar events
                → Agent analyzes for conflicts
                → Agent returns structured output: { conflicts: [...], summary: "..." }
       │
       ▼
9. [Complete]  Orchestrator receives agent result:
                → Updates Task DB: status → "complete", result stored
                → Composes user-facing response from structured output
                → Event queue entry marked COMPLETE
       │
       ▼
10. [Respond]  Response routed through Gateway → WhatsApp:
                "You have 2 conflicts tomorrow: [details]"
```

### Error Path: Agent Failure

```
1. [Delegate]  Agent spawned for task t_abc123
       │
       ▼
2. [Failure]   Agent throws error (API timeout, invalid response, etc.)
       │
       ▼
3. [Retry]     Orchestrator checks retry policy (max 2 retries for transient errors):
                → If retries remaining: re-spawn agent with same input
                → If retries exhausted: proceed to escalation
       │
       ▼
4. [Escalate]  Task DB updated: status → "blocked", reason: "agent_failure"
                → Human notification sent via preferred channel:
                  "I couldn't check your calendar (API timeout after 3 attempts).
                   Should I retry or skip this?"
       │
       ▼
5. [Resolve]   Human responds with decision
                → Orchestrator resumes task per human instruction
                → Or marks task "failed" with audit log entry
```

### Escalation Path: Ambiguous Request

```
1. [Planner]   Fast model cannot confidently classify request
                → Confidence below threshold (< 0.7)
                → Or request spans multiple domains
       │
       ▼
2. [Clarify]   Orchestrator sends clarification via originating channel:
                "I'm not sure what you mean. Did you want me to:
                 1. Check your calendar?
                 2. Send a message to someone?
                 3. Something else?"
                → Task DB: status → "blocked", reason: "needs_clarification"
       │
       ▼
3. [Resume]    Human responds with clarification
                → Orchestrator updates task, re-enters planning phase
```

## 8. Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| Acknowledgment latency (P95) | < 1000 ms | Template response, no model invocation. Measured from event receipt to ack sent. |
| Agent response latency (P95) | < 45 s | Includes model inference + tool calls. Interim status updates sent every 15s for long-running tasks. |
| Task persistence durability | RPO = 0 for acknowledged tasks (process crash, OOM kill) | Once a task is acknowledged, it must survive process crash and OOM kill. SQLite WAL with `synchronous=FULL`. Note: RPO=0 under sudden power loss depends on hardware write-cache behavior (battery-backed caches honor fsync; consumer SSDs may not). For full durability, enable periodic backups of `~/.amara/tasks.db` via cron or backup script. |
| Availability target | ≥ 95% uptime | Single-user system. Planned maintenance acceptable with notification. No formal SLA. |
| Max concurrent tasks | 10 | Orchestrator processes up to 10 tasks in parallel. Queue depth > 10 triggers backpressure (new tasks queued, not dropped). |
| Event queue max depth | 100 | Beyond 100 queued events, system emits health warning via OTLP. Events are never dropped. |
| Cold start time | < 10 s | Gateway + Amara plugins loaded and ready to receive messages. |
| SQLite write throughput | ≥ 100 writes/s | Sufficient for task state transitions at expected load. WAL mode eliminates reader-writer contention. |
| Memory footprint | < 512 MB RSS | Gateway + all Amara plugins. Excludes Docker sandbox containers. |
| Agent session isolation | Full | Each specialist agent runs in its own OpenClaw session with no shared mutable state. Communication only via structured I/O. |

## 9. Security and Privacy Constraints

### OAuth Scopes

| Service | Scopes | Justification |
|---|---|---|
| Gmail | `gmail.readonly`, `gmail.send`, `gmail.compose` | Read inbound for triage; send messages directly; create/manage/send drafts. No `gmail.modify` (no label/archive manipulation in v1). |
| Google Calendar | `calendar.readonly`, `calendar.events` | Read events for conflict detection; create/update events for scheduling. |
| Google Contacts | `contacts.readonly` | Name resolution for sender identification. No write access. |

**Principle:** Request the minimum scopes needed. Upgrade scopes only when a new feature requires it, with user re-authorization.

### Threat Model

| Threat | Attack Vector | Mitigation |
|---|---|---|
| OAuth CSRF | Attacker crafts malicious OAuth redirect to capture authorization code | Use `state` parameter with CSPRNG nonce; verify on callback. OpenClaw's `gog auth` handles this natively. |
| Token theft from filesystem | Attacker reads `auth-profiles.json` from disk | Directory permissions 0700 on `~/.openclaw/`. `openclaw security audit` checks this automatically. Future: encrypt tokens at rest. |
| Prompt injection via inbound messages | Attacker sends crafted WhatsApp/email message to manipulate agent behavior | OpenClaw wraps external content with safety boundaries by default (`allowUnsafeExternalContent: false`). Amara treats inbound messages as untrusted data, not instructions. |
| Token exfiltration via agent output | Specialist agent inadvertently outputs OAuth tokens or API keys | Secrets are never injected into agent context. OTLP telemetry redacts sensitive text before export (OpenClaw `Diagnostic-OTel` plugin). |
| Stale token persistence | Revoked tokens remain cached and used | Auth-profile fallback chain checks validity on use. `auth-profiles.json` stores `expires_at`; refresh failures trigger human alert. |
| Webhook forgery | Attacker sends fake Gmail Pub/Sub notifications | Webhook endpoint requires `Authorization: Bearer {hooks.token}` or `X-OpenClaw-Token` header. Rate limiting: 20 failed auth attempts / 60s → 429. Production hardening: validate Google Pub/Sub push subscription OIDC JWT signature (issuer: `accounts.google.com`, audience: webhook URL) and enforce replay window (reject messages older than 5 minutes). |
| Agent sandbox escape | Specialist agent breaks out of Docker container | OpenClaw sandbox blocks dangerous bind sources (`docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`), supports seccomp/AppArmor profiles, capability dropping, and namespace isolation. |

### Secret Storage

- OAuth tokens and API keys stored in **OpenClaw's workspace directory** (`~/.openclaw/agents/{agentId}/agent/auth-profiles.json`), scoped per-agent. Supports `SecretRef` indirection for sensitive values.
- Amara does not implement its own secret store — it delegates to OpenClaw's existing mechanism.
- Secrets are **never** written to Task DB, audit log, or OTLP telemetry.
- Environment variables (e.g., `OPENAI_API_KEY`) follow OpenClaw's existing model.

### PII Handling

| Data Type | Stored Where | Retention | Purpose |
|---|---|---|---|
| Message content | OpenClaw Memory DB | 90 days | Conversation history for context |
| Task records | Amara Task DB | 90 days | Task tracking and audit |
| Contact names | OpenClaw Memory DB | 90 days | Sender identification |
| OAuth tokens | OpenClaw workspace | Until revoked (exempt from auto-purge) | API access — managed by OpenClaw auth-profiles lifecycle |
| Agent outputs | Amara Task DB | 90 days | Result storage and review |

**Retention policy:** All user content data (messages, task records, contacts, agent outputs) older than 90 days is automatically purged. Configurable via `~/.amara/config.yaml`. **OAuth tokens are exempt** — they persist until explicitly revoked via `amara delete-my-data` or manual revocation, since purging them would break channel connectivity.

### Audit Logging

- Every task state transition logged with: `timestamp`, `task_id`, `from_state`, `to_state`, `actor` (agent or human), `correlation_id`.
- Every agent invocation logged with: `timestamp`, `task_id`, `agent_name`, `input_hash` (not raw input), `duration_ms`, `outcome` (success/failure).
- Human decisions (escalation responses, clarifications) logged with: `timestamp`, `task_id`, `decision`, `channel`.
- All audit entries carry a `correlation_id` that links to OTLP trace spans.
- **Raw message content is NOT logged in audit entries** — only metadata and hashes. Full content lives in OpenClaw Memory DB under retention policy.

### Data Deletion

`amara delete-my-data` command performs:

1. Emit confirmation via all connected channels ("Data deletion starting — you will lose access to Amara after this completes.")
2. Purge all tables from Amara Task DB (`tasks`, `audit_log` tables)
3. Purge event queue table from Amara Task DB (`event_queue`, `amara_dlq` tables — same SQLite file, separate tables)
4. Request OpenClaw purge Amara-tagged data from Memory DB (via OpenClaw's deletion API)
5. Delete Amara config files
6. Revoke all OAuth tokens (done last — channels need tokens for step 1)
7. Write local deletion receipt to `~/.amara/deletion-receipt.json` (timestamp, items purged)

**Ownership boundaries:**
- **Amara-owned** (steps 2, 3, 5): Amara directly deletes these.
- **OpenClaw-delegated** (step 4): Amara requests deletion via OpenClaw API. If OpenClaw API is unavailable, log the request and retry on next startup.
- **Credential revocation** (step 6): Amara revokes its own OAuth grants. OpenClaw's own API keys are managed by OpenClaw separately.
- **Local fallback** (step 7): If channel confirmation (step 1) fails, the deletion receipt serves as proof of completion.

## 10. Decision Log

| # | Decision | Chosen Option | Alternatives Considered | Rationale | Consequences |
|---|---|---|---|---|---|
| D0 | Host platform selection | OpenClaw | Hermes Agent, Moltworker, Nanobot, NanoClaw, memU, NullClaw/PicoClaw, Agent S3 | Gmail/Calendar integration is native (Pub/Sub push, full CRUD), 8 core + 15+ extension channels, modular plugin API with typed SDK, native OTLP observability (17+ metrics), mature ecosystem (13.7K+ skills), Canvas/A2UI for dashboard. See Section 1.5. | Locked to TypeScript/Node.js runtime. Must work within OpenClaw's plugin architecture. Governance risk if foundation transition stalls. |
| D1 | Orchestrator location | In-process OpenClaw tool plugin | Separate process, separate service | Minimal latency (no IPC), leverages OpenClaw session management, simplifies deployment (single process). | Tightly coupled to OpenClaw lifecycle. Process crash takes down orchestrator. Mitigated by SQLite persistence + restart recovery. |
| D2 | Task storage engine | Separate SQLite database (Amara-owned) | OpenClaw's SQLite, PostgreSQL, external DB | Different access patterns from OpenClaw memory (transactional writes vs. vector search). Independent backup. SQLite is zero-config and co-located. No network dependency. | Two SQLite files on disk. Must manage separately from OpenClaw memory. WAL mode required for concurrent reads during writes. |
| D3 | Event reliability mechanism | SQLite WAL-mode queue (DB-backed) | In-memory queue, Redis, external broker (RabbitMQ) | At-least-once delivery required for task-critical events. SQLite WAL provides crash recovery without external dependencies. In-memory loses events on crash. External broker is over-engineered for single-user. | Additional write overhead per event (~1ms). Queue table in Task DB. Must implement consumer logic (poll + mark complete). |
| D4 | Channel strategy — WhatsApp | Use OpenClaw native Baileys adapter | Build custom adapter, use Meta Cloud API directly | Baileys adapter is battle-tested in OpenClaw. No reason to duplicate effort. Meta Cloud API requires business verification. | Dependent on Baileys library maintenance. No official WhatsApp support (Baileys reverse-engineers Web protocol). Acceptable risk for personal use. |
| D5 | Channel strategy — Gmail | Use native `gog` Gmail integration + thin Amara enhancement layer | Build from scratch with Gmail API, use IMAP | `gog` provides full-featured Gmail: Pub/Sub push inbound (`gog gmail watch serve`), send/reply/draft outbound (`gog gmail send`), OAuth2 with auth-profiles. Amara adds: attachment handling, template compose, batch operations. No need to reimplement OAuth or push infrastructure. | Tied to `gog` CLI's API surface. Must monitor for breaking changes. Gmail Pub/Sub requires GCP project setup + Tailscale or equivalent tunnel. |
| D6 | Channel strategy — Calendar | Use native `gog` Calendar integration + Amara analysis layer | Build from scratch with Google Calendar API | `gog` provides full Calendar CRUD: list events with date ranges, create/update with color support. Amara adds: conflict detection, invite management, scheduling suggestions. These are analysis features on top of native data access. | Tied to `gog` CLI's API surface. Calendar color IDs are Google-specific (1-11). No invite/RSVP in `gog` — Amara must call Calendar API directly for those. |
| D7 | Inter-agent communication protocol | OpenClaw `agentToAgent` transport + Amara structured protocol | Custom WebSocket protocol, shared SQLite table, filesystem | OpenClaw provides the transport (JSON with schema validation). Amara defines the contract: typed task assignments, result reports, status updates. Avoids building transport layer. | Must define and version the protocol schema. Agent-to-agent requires explicit allowlisting in OpenClaw config. |
| D8 | Dashboard hosting | OpenClaw Canvas/A2UI (served via Gateway) | Separate Express/Fastify server, static site, Electron app | Canvas provides agent-generated HTML served at Gateway's HTTP endpoint. No separate process, no CORS issues, no additional port. Mobile-friendly if properly designed. | Tied to Canvas API surface (relatively new feature). Limited to what A2UI can render. If Canvas proves too limiting, fall back to separate server (low migration cost). |
| D9 | Secret management | Delegate to OpenClaw's existing auth-profiles mechanism | Vault, dotenv, OS keychain, custom encrypted store | OpenClaw handles OAuth tokens and API keys via `auth-profiles.json` per-agent with `SecretRef` indirection and fallback chain (agent → main → legacy). Amara adds no new secret types. OpenClaw has a built-in `openclaw security audit` CLI for checking filesystem permissions, sandbox config, and secret exposure. | Secrets at `~/.openclaw/agents/{agentId}/agent/auth-profiles.json`. Must ensure directory permissions are correct (0700). Tokens stored in plaintext JSON — encrypt at rest is a future enhancement. No centralized secret rotation — manual process. |
| D10 | Agent registry format | File-based YAML + markdown bundles (Amara-owned) | Database-backed, OpenClaw plugin registry, API-based | Version-controllable (git), human-readable, hot-reloadable (watch filesystem). Aligns with Hermes SKILL.md concept. No database dependency for agent definitions. | Must implement file watcher for hot-reload. YAML parsing adds startup cost (negligible at expected scale). Schema validation needed to prevent malformed bundles. |
| D11 | Channel normalization approach | Thin Amara layer converting channel events to common envelope | OpenClaw middleware, per-channel adapters with no common format | Common envelope format enables channel-agnostic orchestration. Thin layer minimizes maintenance. OpenClaw handles transport; Amara handles semantics. | Must define and maintain the AmaraEvent schema. New channels require a normalization mapping. Envelope must be extensible for channel-specific metadata. |
| D12 | Memory architecture | Use OpenClaw native memory + Amara Task DB for task context | Custom memory system inspired by Hermes multi-level, replace OpenClaw memory entirely | OpenClaw's memory (SQLite + vector + FTS5) is capable. Amara's task-specific context lives in Task DB. No need to duplicate memory infrastructure. Incorporate Hermes insights (USER.md, SOUL.md layering) as future enhancement. | Two sources of context: OpenClaw memory (conversation) and Amara Task DB (task state). Orchestrator must query both. Future: consider adding USER.md-style profile for personalization. |

## 11. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | OpenClaw governance transition disrupts development | medium | high | Pin to known-good release tag. Monitor foundation transition. Maintain fork capability. All Amara code is in plugins that could migrate to another host. |
| R2 | `gog` skill API surface changes or is deprecated | medium | medium | Amara wraps `gog` with its own tool plugins (D5, D6). If `gog` breaks, replace the inner implementation without changing Amara's interface. |
| R3 | Baileys library breaks (WhatsApp protocol change) | medium | high | This affects all Baileys users, not just Amara. Community will fix quickly (large user base). Amara can temporarily disable WhatsApp channel without losing other channels. |
| R4 | Canvas/A2UI proves too limiting for Dashboard | low | medium | Dashboard core is in Milestone 1 (early visibility). If Canvas is insufficient, fall back to a separate web server (Express/Fastify). Low migration cost — Amara owns the UI logic. Mobile polish deferred to Milestone 6. |
| R5 | SQLite contention under concurrent agent writes | low | medium | WAL mode eliminates reader-writer contention. Benchmark early in Epic 1. If needed, switch to WAL2 or separate DBs per concern. |
| R6 | Single-process architecture limits scaling | low | low | Amara is single-user. 10 concurrent tasks is the target. If scaling is needed later, extract orchestrator to a separate process (D1 consequences). |
| R7 | OpenClawBus RFC never ships | medium | low | Amara's DB-backed event queue (D3) is self-sufficient. OpenClawBus would be a nice-to-have optimization, not a dependency. |
| R8 | Plugin isolation prevents cross-plugin state sharing | low | high | Amara uses its own SQLite DB for shared state (D2). Plugins communicate via structured I/O (D7), not shared memory. |
| R9 | OAuth token refresh fails silently | medium | medium | Implement explicit refresh error handling in Gmail/Calendar tool plugins. Alert human via preferred channel if refresh fails. |
| R10 | Agent sessions accumulate memory without bounds | low | medium | 90-day retention policy (Section 9). OpenClaw memory has temporal decay. Monitor RSS via OTLP metric. |

## 12. Exit Criteria

Epic 1 (and all other epics) may not begin until **all** of the following are true:

- [x] Platform evaluation complete — comparison matrix and selection rationale documented (Section 1.5)
- [x] Host platform capabilities matrix is complete and verified (Section 2) — all `?` entries resolved with `native`/`partial`/`gap` status, Source/Proof, and Notes
- [x] All gaps are identified and assigned with priority (Section 3) — P0/P1/P2 classification with downstream epic references
- [x] Every component has a decided boundary — plugin / service / external (Section 4) — with rationale
- [x] Runtime topology is diagrammed (Section 6) — process model, event bus, data stores
- [x] Happy-path data flow is documented end-to-end (Section 7) — plus error and escalation paths
- [x] Non-functional requirements have numeric targets (Section 8) — all rows filled
- [x] Security and privacy constraints are written (Section 9) — OAuth scopes, secrets, PII, audit, deletion
- [x] Decision log has at least one entry per major decision (Section 10) — 13 entries documented (D0–D12)
- [x] No open questions remain that could block Epic 1 design

### Downstream Epic Verification

| Epic | Key Question | Answered By |
|---|---|---|
| Epic 1 (Core Infrastructure) | What storage engine? What event delivery guarantee? | D2 (SQLite), D3 (WAL queue) |
| Epic 2 (Security & Privacy) | What OAuth scopes? Where do secrets live? | Section 9, D9 |
| Epic 3 (Observability) | What telemetry system? | Section 2 (native OTLP), Section 8 (metrics) |
| Epic 4 (Agent Registry) | What format? Where does it live? | D10 (YAML+MD, file-based) |
| Epic 5 (Orchestrator) | In-process or separate? How do agents communicate? | D1 (in-process), D7 (structured protocol) |
| Epic 6 (Recovery & HITL) | How does escalation work? | Section 7 (escalation path) |
| Epic 7 (Channel Platform) | Use platform adapters or custom? | D4, D5, D6, D11 (platform + normalization) |
| Epic 8 (Channel Integrations) | WhatsApp/Gmail/Calendar strategy? | D4, D5, D6 |
| Epic 9 (Specialist Agents) | How are agents defined and routed? | D10, Section 4 (registry) |
| Epic 10 (Dashboard) | Where does it run? | D8 (Canvas/A2UI) |
| Epic 11 (Onboarding) | What runtime? What config? | D0 (Node.js/OpenClaw), Section 6 (data stores) |
