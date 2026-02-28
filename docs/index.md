# Amara Docs

Navigation hub for all Amara documentation and planning.

## Top-Level Docs

| Document | Purpose |
|----------|---------|
| [architecture.md](architecture.md) | System design overview, component diagram |
| [roadmap.md](roadmap.md) | Sequenced milestones across epics |

## Epics

Epics are sequenced by dependency. Epic 0 is an architectural gate — nothing else starts until it is complete.

| # | Epic | Depends on | Doc |
|---|------|------------|-----|
| 0 | Integration Architecture | — | [00-integration-architecture.md](epics/00-integration-architecture.md) |
| 1 | Core Infrastructure | 0 | [01-core-infrastructure.md](epics/01-core-infrastructure.md) |
| 2 | Security & Privacy | 0, 1 | [02-security-and-privacy.md](epics/02-security-and-privacy.md) |
| 3 | Observability & Quality | 0, 1 | [03-observability-and-quality.md](epics/03-observability-and-quality.md) |
| 4 | Agent Registry & Routing | 1 | [04-agent-registry-and-routing.md](epics/04-agent-registry-and-routing.md) |
| 5 | Amara Orchestrator | 1, 4 | [05-orchestrator.md](epics/05-orchestrator.md) |
| 6 | Recovery & Human-in-the-loop | 1, 5 | [06-recovery-and-human-in-the-loop.md](epics/06-recovery-and-human-in-the-loop.md) |
| 7 | Channel Platform | 1, 2 | [07-channel-platform.md](epics/07-channel-platform.md) |
| 8 | Channel Integrations | 7 | [08-channel-integrations.md](epics/08-channel-integrations.md) |
| 9 | Specialist Agents | 4, 5 | [09-specialist-agents.md](epics/09-specialist-agents.md) |
| 10 | Dashboard | 1, 3 | [10-dashboard.md](epics/10-dashboard.md) |
| 11 | Onboarding & Deployment | all | [11-onboarding-and-deployment.md](epics/11-onboarding-and-deployment.md) |

## Dependency Graph

```
0 (Architecture Gate)
└── 1 (Core Infrastructure)
    ├── 2 (Security & Privacy)
    │   └── 7 (Channel Platform)
    │       └── 8 (Channel Integrations)
    ├── 3 (Observability & Quality)
    │   └── 10 (Dashboard)
    ├── 4 (Agent Registry & Routing)
    │   ├── 5 (Orchestrator)
    │   │   ├── 6 (Recovery & HITL)
    │   │   └── 9 (Specialist Agents)
    │   └── 9 (Specialist Agents)
    └── 11 (Onboarding & Deployment) ← depends on all
```

## Status

All epics are currently in the **stub** phase. Stubs exist to define scope and surface open questions before implementation begins.
