# Epic 4 — Agent Registry & Routing

## Overview

Defines the agent definition format, implements the registry that loads and validates agent bundles, and builds the routing logic that selects the right agent for a given task. Completed before the orchestrator so interfaces are stable when Epic 5 begins.

## Goals

- Agent capabilities are declared in a standard, human-readable format
- The registry validates and indexes all agent bundles at startup
- Given a task description, the router returns the most appropriate agent
- Three agent types are supported: template, role, and generic doer

## Scope

**In:**
- Agent bundle format (YAML metadata + markdown mandate)
- Registry implementation (load, validate, index)
- Routing / matching logic
- Three agent types: template (fixed prompt), role (persona + tools), generic doer (fallback)
- Agent schema versioning

**Out:**
- Specific agent implementations (Epic 9)
- Orchestrator (Epic 5) — uses the registry; defined separately
- Model selection / cost optimization (future)

## Key Decisions

- [ ] Bundle format: YAML front-matter + markdown body, or separate files?
- [ ] How are agent capabilities declared? (tags, skill list, free-text, embedding?)
- [ ] Routing algorithm: keyword match / embedding similarity / model-based classifier?
- [ ] How are agents versioned? (semver in YAML / git tag?)
- [ ] What does "generic doer" mean — one agent or a class of agents?

## Success Metrics

- Registry loads all bundles and rejects malformed ones with clear errors
- Routing returns the correct agent for 10 representative test inputs
- Adding a new agent requires only a new bundle file — no code changes
- Schema validation errors are human-readable

## Definition of Done

- [ ] Agent bundle schema defined and documented
- [ ] Registry implemented: loads, validates, and indexes bundles
- [ ] Three built-in agent types defined (template / role / generic doer)
- [ ] Routing logic implemented
- [ ] Routing tested against representative inputs
- [ ] Schema versioning approach decided and implemented
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Routing logic too naive for real tasks | Start with keyword/tag matching; plan upgrade path to embedding |
| Agent bundle format too rigid to extend | Keep format open; use semver to evolve |
| Generic doer becomes a dumping ground | Define explicit "I don't know" escalation path |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Define agent bundle schema (YAML + markdown)
- [ ] Implement registry loader and validator
- [ ] Define three agent types
- [ ] Implement routing / matching algorithm
- [ ] Write routing tests
- [ ] Document how to add a new agent

## Dependencies

- Epic 1 (core infrastructure)

## Open Questions

- Should routing be deterministic (rule-based) or probabilistic (model-based) in v1?
- How do agents declare "I can't do this"? Does the router need to handle fallback chains?
- Are agent bundles stored in the repo, loaded from disk, or fetched remotely?
