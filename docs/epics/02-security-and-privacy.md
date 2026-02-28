# Epic 2 — Security & Privacy

## Overview

Establishes the security and privacy contracts for Amara before channels or deployment are built. Started early so it gates downstream epics (channels, onboarding) rather than being bolted on at the end.

## Goals

- OAuth scopes are minimal and explicitly justified
- Secrets are stored securely and never logged
- PII is handled with a documented retention and deletion policy
- Every security-sensitive action is auditable
- Privacy boundaries are clear before any channel is connected

## Scope

**In:**
- OAuth scope definitions for each channel (WhatsApp, Gmail, Calendar)
- Secret storage approach (how tokens are stored, rotated, and scoped)
- PII inventory (what user data Amara holds and why)
- Data retention policy (how long data is kept)
- Data deletion ("delete my data" must work)
- Audit log schema for security-sensitive events
- Input validation and output sanitization contracts

**Out:**
- Channel implementation (Epic 8)
- Dashboard auth/session (Epic 10)
- Deployment hardening (Epic 11)
- Threat modeling beyond Amara's own components

## Key Decisions

- [ ] Where are OAuth tokens stored? (OS keychain / encrypted file / secret manager)
- [ ] Token rotation: manual trigger or automatic on expiry?
- [ ] Which events go in the security audit log vs. the general audit log?
- [ ] PII retention period: how long do message contents stay in the task DB?
- [ ] What does "delete my data" delete, and from where?

## Success Metrics

- No OAuth tokens appear in any log file at any log level
- Deleting a task removes all associated PII from all stores
- Audit log records every OAuth token exchange
- Security review checklist passes before any channel goes live

## Definition of Done

- [ ] OAuth scope list defined and documented for each channel
- [ ] Secret storage approach implemented and tested
- [ ] Secrets confirmed absent from logs (automated test)
- [ ] PII inventory documented
- [ ] Data retention policy documented and enforced in DB cleanup
- [ ] Delete-my-data path implemented and tested
- [ ] Security audit log schema defined and wired
- [ ] Input validation contracts documented

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Token leaks via logging | Structured log sanitization; automated test |
| Overly broad OAuth scopes | Request only what's needed; document justification per scope |
| PII in task descriptions not flagged | PII inventory review before schema is frozen |
| Audit log not wired at channel layer | Gate channel epics on audit integration |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Define OAuth scopes per channel
- [ ] Implement secret storage
- [ ] Write log-sanitization test (secrets must not appear in output)
- [ ] Define PII inventory and retention policy
- [ ] Implement data deletion path
- [ ] Define and wire security audit log
- [ ] Document input validation contracts

## Dependencies

- Epic 0 (architecture gate) — security constraints defined there
- Epic 1 (core infrastructure) — audit log uses event bus

## Open Questions

- Do we use the OS keychain, or is a simple encrypted file acceptable for v1?
- Is the security audit log a separate table or the same JSONL as the general audit log?
- Does the PII retention clock start at task creation or task completion?
