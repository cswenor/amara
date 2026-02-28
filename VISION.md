# Amara: Agent Director

> **Amara is a personal assistant who manages your work, not does it.** She talks to you in seconds, delegates to specialist agents, tracks every task to completion, and comes back to you when she's stuck.

---

## The Problem

Current AI assistants are doers, not managers.

You hand them a task, they go quiet, and eventually something comes back — or doesn't. There's no visibility into what's happening, no way to intervene mid-flight, and no record of what was attempted. If a task fails or gets forgotten, it's just gone.

The problem runs deeper than responsiveness. Today's assistants force one model to do everything: the fast conversational parts and the slow, deep-work parts. That's the wrong shape. It makes them slow when they should be instant and shallow when they should be thorough. It also means they can't follow up, escalate, or ask for help while working — because they aren't really *working*, they're just replying.

What's missing isn't a faster model. It's a real assistant.

---

## Core Philosophy: Manager, Not Doer

A real personal assistant doesn't do everything herself. She manages people who do things.

When you ask her to handle something, she:

1. **Acknowledges immediately** — you know she heard you
2. **Breaks it into work units** — figures out what needs to happen and in what order
3. **Assigns to the right people** — knows who to call for what
4. **Tracks progress** — nothing falls through the cracks
5. **Escalates when needed** — comes back to you when a decision is required
6. **Closes the loop** — tells you when it's done and what happened

That's Amara. She's the orchestration layer. The specialist agents are her team.

---

## Architecture: Two Tiers

### Amara — Orchestration Layer

Amara runs on a fast model and responds in ~2 seconds. She handles all conversation, planning, task creation, delegation, and follow-up. She is never the one doing the deep work — that belongs to her agents. She is never unavailable.

### Specialist Agents — Execution Layer

Each specialist agent runs in its own isolated session with its own model, skills, and system prompt. Agents are purpose-built: a coding agent has file access and code execution; a research agent has web search; a writing agent has a style guide and draft templates. They receive structured inputs from Amara and return structured outputs.

```
You ←──────────────────────────────────────────────────┐
 │                                                      │
 ▼                                                      │
Amara (fast)                                   clarification
 │  ├─ creates/tracks tasks                            │
 │  ├─ consults Agent Directory                        │
 │  ├─ delegates to best-fit agent                     │
 │  └─ follows up until done ──────────────────────────┘
 │
 ├──► Template Agent: "Deploy to Vercel"  (own model + skills)
 ├──► Template Agent: "Write PR summary"  (own model + skills)
 ├──► Generic Doer                        (fallback, broad skills)
 └──► ... (any registered agent)
```

The key constraint: **Amara never goes silent.** She may not have the answer yet, but she always knows the status.

---

## The Agent Directory

The directory is how Amara decides where work goes. It is a catalog of available agents, each entry describing:

- **Name & description** — what this agent is good at
- **Model** — which LLM to use (fast vs. powerful vs. cheap)
- **Skills/tools** — what capabilities are loaded (web search, code execution, file access, etc.)
- **Template** (optional) — a pre-built prompt/config for frequently recurring job types
- **Trigger hints** — keywords or patterns that suggest routing to this agent

Agents are defined as small YAML + markdown bundles, inspired by [antfarm](https://github.com/snarktank/antfarm):

- `identity.md` — role and responsibilities
- `soul.md` — personality, tone, decision style
- `config.yml` — model, skills, input/output contracts, trigger hints

### Three Agent Types

**Template agents** are fully pre-configured for a specific recurring job — "deploy app", "write release notes", "triage GitHub issues". They're fast to spin up and produce consistent results because the mandate is tight.

**Role agents** are general-purpose specialists: Coder, Researcher, Analyst, Writer. They have a role-specific model and toolset but no job-specific template. Good for tasks that fit a professional category but don't match a pre-built job.

**Generic doers** are the catch-all. Broad skills, capable model, no assumptions. Used when nothing in the directory fits.

Amara queries the directory first. Good match → use that agent. No match → fall back to a generic doer.

### Key Patterns

These patterns come from hard lessons in multi-agent systems:

- **Fresh session per agent** — each specialist runs in a clean context. Long message histories cause hallucination and context bleed. State is passed explicitly as structured data, not through accumulated conversation.
- **Input/output contracts** — each agent definition declares what it expects and what it produces. Amara passes context as structured data. Agents return structured results. No narrative telephone.
- **Retry with specific feedback** — when an agent's output fails verification, Amara sends targeted feedback ("test X is failing because Y"), not a generic retry. Precision matters more than politeness.
- **SQLite for persistence** — tasks, runs, and agent outputs are stored in SQLite. Nothing is lost on restart. The dashboard has real history to show.

---

## Task Lifecycle

How Amara manages a task from the moment you send it to the moment it's done:

1. **Receive** — user sends a request; Amara acknowledges within seconds
2. **Plan** — break into subtasks; identify which specialists are needed
3. **Delegate** — spawn specialist agents for each subtask
4. **Track** — every task lives in persistent state; nothing is forgotten
5. **Follow up** — Amara checks on in-progress work; re-queues stalled tasks
6. **Clarify** — if a task is blocked or ambiguous, she asks the human
7. **Complete** — marks done, summarizes outcome, updates history

No task disappears into a black box. Every step is recorded, every agent run is logged, and the human always has a clear picture of what's in flight.

---

## The Dashboard (future)

A web/mobile browser interface showing Amara's full plate:

- **Active tasks** — in-progress, which agents are working on them
- **Pending tasks** — queued or waiting on human input
- **Recurring tasks** — scheduled, cron-style
- **Completed history** — what got done, when, by whom
- **Audit log** — what Amara delegated and what came back

The dashboard is read-only first. Visibility before control. If you can see the system clearly, you can debug it. Control comes after.

---

## Roadmap

Roughly ordered by priority. Each item maps to one or more GitHub issues.

- [ ] **Task persistence** — task state survives restarts
- [ ] **Agent Directory** — registry of available agents with model, skills, and templates
- [ ] **Template agents** — pre-configured agents for frequently recurring job types
- [ ] **Human clarification loop** — Amara asks questions when blocked
- [ ] **Follow-up engine** — Amara re-checks in-progress tasks on a schedule
- [ ] **Parallel sub-agent execution** — run multiple specialists concurrently
- [ ] **Recurring task support** — cron-style scheduled tasks
- [ ] **Dashboard MVP** — minimal web UI for task visibility (active, pending, history)
- [ ] **Sub-agent progress relay** — Amara surfaces specialist status in real-time
- [ ] **Smarter task classification** — model-based routing instead of keyword heuristics
- [ ] **Mobile-optimized dashboard** — full mobile browser experience
- [ ] **Sub-agent result caching** — don't redo work already done

---

## Name & Identity

Amara is the name of this OpenClaw instance. The plugin takes its name from her. Building Amara is about building the AI assistant that actually behaves like one — not a chatbot that pretends to manage things, but a system with real task state, real delegation, and real follow-through. The name is a reminder of what we're building toward.

---

## Contributing

We welcome contributors. Check the [issues list](../../issues) for open work — most items in the roadmap above will have a corresponding issue. If you have ideas, open a discussion. If you want to build something, grab an issue or propose one.

The most useful contributions right now are in the foundational layers: task persistence, the agent directory schema, and the clarification loop. Get those right and everything else follows.
