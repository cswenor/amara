# Epic 7 — Channel Platform

## Overview

Defines the stable adapter contract that all channel integrations (Epic 8) must implement. Handles auth/webhook lifecycle, retry logic, idempotency, and error handling at the platform level — so each integration only has to implement the channel-specific parts.

## Goals

- Adapter contract is stable before any channel is implemented
- Every channel integration gets auth, retries, idempotency, and error handling for free
- Adding a new channel requires only implementing the adapter interface

## Scope

**In:**
- Adapter interface definition (TypeScript types or JSDoc contracts)
- Auth/webhook lifecycle management (register, verify, renew)
- Retry logic with backoff (outbound send failures)
- Idempotency guarantees (inbound deduplication)
- Error taxonomy for channel-level failures
- Platform-level test harness (mock adapter for testing orchestrator + agents)

**Out:**
- Specific channel implementations (Epic 8)
- OAuth scope definitions (Epic 2) — platform uses them, doesn't define them

## Key Decisions

- [ ] Adapter interface: TypeScript interface / JSDoc / JSON schema?
- [ ] How is inbound idempotency implemented? (message ID deduplication table?)
- [ ] Retry strategy: exponential backoff / fixed interval / channel-specific?
- [ ] How are channel-level errors surfaced to the orchestrator?
- [ ] Does the platform handle rate limiting, or is that per-adapter?

## Success Metrics

- Mock adapter fully satisfies the interface contract
- Retry logic delivers a message that initially fails in integration test
- Duplicate inbound message is deduplicated and not processed twice
- Adding a new channel requires zero changes to the platform layer

## Definition of Done

- [ ] Adapter interface defined and documented
- [ ] Auth/webhook lifecycle methods defined (register, verify, renew, teardown)
- [ ] Retry logic with backoff implemented
- [ ] Inbound deduplication implemented
- [ ] Error taxonomy documented
- [ ] Mock adapter implemented for testing
- [ ] Platform test harness usable by Epic 8 integrations
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Interface too narrow — integrations need escape hatches | Design for extension; allow adapter-specific metadata passthrough |
| Retry logic conflicts with channel rate limits | Per-channel retry config; honor rate limit headers |
| Idempotency table grows unbounded | TTL-based cleanup on deduplication records |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Define adapter interface
- [ ] Define auth/webhook lifecycle
- [ ] Implement retry logic
- [ ] Implement inbound deduplication
- [ ] Document error taxonomy
- [ ] Build mock adapter
- [ ] Build platform test harness

## Dependencies

- Epic 1 (core infrastructure)
- Epic 2 (security and privacy) — auth/token handling

## Open Questions

- Should webhook registration be part of the platform or left to each adapter?
- What is the minimal interface a "channel" must satisfy?
- How does the platform signal to the orchestrator that a channel is temporarily unavailable?
