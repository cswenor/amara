# Epic 0 — Integration Architecture

> **Architectural gate.** Nothing else starts until this epic is complete.

## 1. Context and Goals

Amara is built on top of OpenClaw. Before any implementation begins, we must understand exactly what OpenClaw provides, what gaps Amara must fill, and where every component lives.

This is a **decision doc**, not a feature. Its output is a set of binding architectural decisions that all subsequent epics will implement against.

**Goals:**
- Map OpenClaw's native capabilities
- Identify gaps Amara must own
- Decide component boundaries (plugin vs Amara service vs external)
- Define the runtime topology
- Define data and control flows
- Establish non-functional requirements and security constraints
- Produce a decision log that future contributors can reference

## 2. OpenClaw Native Capabilities Matrix

> Fill in during investigation.

| Capability | Status | Source / Proof | Notes |
|------------|--------|----------------|-------|
| WhatsApp inbound events | ? | | |
| WhatsApp outbound send | ? | | |
| Gmail inbound events | ? | | |
| Gmail outbound send | ? | | |
| Calendar read | ? | | |
| Calendar write | ? | | |
| Plugin-to-plugin event bus | ? | | |
| Persistent storage | ? | | |
| Auth / secret management | ? | | |
| Webhook lifecycle (register, renew, verify) | ? | | |
| Retry / idempotency primitives | ? | | |
| Logging / observability | ? | | |

## 3. Gap Analysis

> What OpenClaw does NOT provide that Amara must own.

| Gap | Proposed Owner | Notes |
|-----|---------------|-------|
| Task state machine | Amara core | |
| Agent registry | Amara core | |
| Orchestrator / planner | Amara core | |
| Follow-up / re-check scheduler | Amara core | |
| Human escalation loop | Amara core | |
| Dashboard UI | Amara core | |
| TBD | | |

## 4. Boundary Decisions

> For each major component, record whether it lives as an OpenClaw plugin, an Amara service, or an external system.

| Component | Location | Rationale |
|-----------|----------|-----------|
| Orchestrator | ? | |
| Task DB | ? | |
| Agent registry | ? | |
| Channel adapters | ? | |
| Dashboard | ? | |
| Scheduler | ? | |

## 5. Candidate Plugin Inventory

> Components that could be extracted as reusable standalone OpenClaw plugins.

| Plugin | Owner | Extraction Cost | Status |
|--------|-------|----------------|--------|
| Inbox Sentinel (exists) | OpenClaw | low | done |
| WhatsApp policy (exists) | OpenClaw | low | done |
| TBD | | | |

## 6. Runtime Topology

> Processes, queues/event bus, data stores.

```
[ To be filled in ]
```

- **Process model:** single process? multiple? how do they communicate?
- **Event bus:** in-process emitter / SQLite queue / external broker?
- **Data stores:** what databases, where, owned by whom?

## 7. Data and Control Flows

> Channel → Orchestrator → Agent → Response

```
[ To be filled in ]
```

Happy path:

1.
2.
3.

Error / escalation path:

1.
2.
3.

## 8. Non-Functional Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| Acknowledgment latency | < ? ms | |
| Agent response P95 | < ? s | |
| Task persistence durability | survive restart | |
| Availability target | ? | single-user; downtime acceptable? |
| Max concurrent tasks | ? | |

## 9. Security and Privacy Constraints

> To be filled in. Feed into Epic 2.

- OAuth scopes: which scopes does Amara request, and why?
- Secret storage: where do tokens live, how are they scoped?
- PII handling: what user data is stored, for how long, and where?
- Audit: what actions must be logged for accountability?
- Data deletion: what does "delete my data" mean?

## 10. Decision Log

> Record each significant architectural decision.

| Decision | Chosen Option | Alternatives Considered | Rationale | Consequences |
|----------|--------------|------------------------|-----------|--------------|
| | | | | |

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenClaw API surface is narrower than expected | medium | high | audit early; plan fallbacks |
| Plugin isolation prevents needed cross-plugin state sharing | low | high | investigate shared DB or event bus options |
| SQLite contention under concurrent agent writes | low | medium | benchmark; switch to WAL mode |

## 12. Exit Criteria

Epic 1 (and all other epics) may not begin until **all** of the following are true:

- [ ] OpenClaw capabilities matrix is complete and verified against code/docs
- [ ] All gaps are identified and assigned
- [ ] Every component has a decided boundary (plugin / service / external)
- [ ] Runtime topology is diagrammed and agreed
- [ ] Happy path data flow is documented end-to-end
- [ ] Non-functional requirements have numeric targets
- [ ] Security constraints are written down and reviewed
- [ ] Decision log has at least one entry per major decision
- [ ] No open questions remain that could block Epic 1 design
