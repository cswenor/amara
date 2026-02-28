# Amara

> Amara is an opinionated personal assistant. Connect your accounts and she manages your life — your messages, your tasks, your calendar, your information. No configuration menus. No prompt engineering. She just works.

---

## The Problem

Most AI assistants are tools, not assistants.

You have to tell them what to do, every time. They don't track anything. They don't follow up. They don't know that you asked them to handle something yesterday and it hasn't been done yet. They're sophisticated search bars — powerful when you use them, inert when you don't.

A real personal assistant doesn't wait to be asked. She knows what's on your plate, watches what's coming in, makes sure nothing slips, and asks you for a decision only when she actually needs one.

That's what Amara is.

---

## What Amara Does

Amara manages four domains of your life:

**Communications** — She monitors your messages (WhatsApp, email, and more) and understands what's urgent and what isn't. She surfaces high-priority inbound, drafts replies when appropriate, and makes sure you're never blindsided by something you missed.

**Tasks & projects** — She captures work, breaks it into pieces, delegates to specialist agents, and tracks everything to completion. She follows up. She re-queues stalled work. She tells you when something is blocked and needs your input. Nothing falls through the cracks.

**Calendar & scheduling** — She manages your time. She handles meeting requests, sets reminders, and keeps you aware of what's coming.

**Information & research** — She surfaces what you need to know when you need to know it, without you having to go looking.

---

## Opinionated by Design

Amara is not a framework. She is not a blank slate you configure to taste. She has a specific, deliberate way of working — a way that is designed to actually work.

**She has strong defaults.** Install her, connect your accounts, and she starts doing her job. There are no mode switches, no personality sliders, no prompt templates to fill out.

**She has a clear workflow.** Urgent things get handled first. Tasks get tracked. Nothing gets acknowledged and forgotten. Decisions get escalated to you only when they need to be. This is how she operates — not how you configure her to operate.

**She manages the system, not just the requests.** She isn't reactive. She monitors. She follows up. She re-queues. She is always working, not just when you send a message.

If you want a fully configurable assistant you can shape from scratch, Amara is not that. She's for people who want the decisions already made and the system already working.

---

## Architecture: Manager, Not Doer

Amara runs on a fast model and is always available. She never does the deep work herself — she delegates it.

```
You ←──────────────────────────────────────────────────┐
 │                                                      │
 ▼                                                      │
Amara (fast)                                   clarification
 │  ├─ monitors all channels                           │
 │  ├─ creates/tracks tasks                            │
 │  ├─ delegates to specialist agents                  │
 │  └─ follows up until done ──────────────────────────┘
 │
 ├──► Comms agent     (messages, email, drafts)
 ├──► Research agent  (web, documents, summaries)
 ├──► Coding agent    (code, deploys, PRs)
 ├──► Generic doer    (fallback, broad skills)
 └──► ... (any registered agent)
```

Specialist agents each have their own model, tools, and mandate. They run in isolated sessions, receive structured inputs, and return structured outputs. Amara coordinates them — she does not become one.

**Amara never goes silent.** She may not have the answer yet, but she always knows the status.

---

## Task Lifecycle

1. **Receive** — request comes in (from you or from a monitored channel); Amara acknowledges immediately
2. **Plan** — break into subtasks; identify which specialists are needed
3. **Delegate** — spawn specialist agents for each subtask
4. **Track** — every task lives in persistent state; nothing is forgotten
5. **Follow up** — Amara checks on in-progress work; re-queues stalled tasks
6. **Clarify** — if a task is blocked or ambiguous, she asks you
7. **Complete** — marks done, summarizes outcome, updates history

---

## Roadmap

- [ ] **Task persistence** — task state survives restarts
- [ ] **Agent directory** — registry of specialist agents with model, skills, and routing hints
- [ ] **Human clarification loop** — Amara asks questions when blocked
- [ ] **Follow-up engine** — re-checks in-progress tasks on a schedule
- [ ] **Parallel sub-agent execution** — run multiple specialists concurrently
- [ ] **Recurring task support** — cron-style scheduled tasks
- [ ] **Dashboard MVP** — minimal web UI for task visibility (active, pending, history)
- [ ] **Channel: Gmail** — inbound email monitoring and triage
- [ ] **Channel: Calendar** — meeting management and scheduling
- [ ] **Sub-agent progress relay** — surface specialist status in real-time
- [ ] **Smarter routing** — model-based task classification instead of keyword heuristics
- [ ] **Mobile dashboard** — full mobile browser experience

---

## Why It's Public

I built Amara for myself. She manages how I want my life managed. I'm putting her out here because the setup shouldn't be hard and there's no reason other people can't run the same thing.

This isn't a product. It's a working system that you're welcome to run.

---

## Contributing

If you want to help build it out, check the [issues list](../../issues). If you have ideas, open a discussion.
