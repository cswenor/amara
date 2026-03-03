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
- Data deletion ("delete my data" must work — 7-step process per Epic 0, Section 9)
- Audit log schema for security-sensitive events
- Input validation and output sanitization contracts
- Write permission audit logging — all outbound sends on monitored channels logged (D14)
- Triage log PII handling — `triage_log` contains message snippets subject to 30-day retention (Epic 0, Section 9)

**Out:**
- Channel implementation (Epic 8)
- Dashboard auth/session (Epic 10)
- Deployment hardening (Epic 11)
- Threat modeling beyond Amara's own components

## Key Decisions

- [x] Where are OAuth tokens stored? OpenClaw auth-profiles at `~/.openclaw/agents/{agentId}/agent/auth-profiles.json` (D9)
- [x] Token rotation: OpenClaw auth-profiles fallback chain handles refresh; refresh failures alert human (D9, R9)
- [x] Which events go in the security audit log vs. the general audit log? Same SQLite database, separate tables; security events include OAuth exchanges, token rotations, write permission grants (Epic 0, Section 9)
- [x] PII retention period: 90-day auto-purge for task data, 30-day for `triage_log`, OAuth tokens exempt from purge (Epic 0, Section 9)
- [x] What does "delete my data" delete? 7-step process covering tasks, triage_log, event_queue, audit logs, agent session data, cached credentials, and config (Epic 0, Section 9)

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

### S2.1: Define OAuth scopes per channel

**Description:** Document the minimum OAuth scopes required for each channel (WhatsApp, Gmail, Calendar) with explicit justification for each scope. Output is a reference table in this epic and inline in channel adapter docs.

**Acceptance Criteria:**
- [ ] Scopes listed for Gmail (read, send, labels, drafts)
- [ ] Scopes listed for Calendar (read, write events)
- [ ] Scopes listed for WhatsApp (read, send messages)
- [ ] Each scope has a one-line justification
- [ ] "Why not broader?" rationale documented for any scope that could be narrower

**Size:** S
**Dependencies:** None
**Blocks:** None

---

### S2.2: Implement secret storage

**Description:** Verify and document the OpenClaw auth-profiles integration (D9) for storing OAuth tokens and other secrets. Confirm the file-based storage at `~/.openclaw/agents/{agentId}/agent/auth-profiles.json` works for Amara's needs. Note: v2026.3.2-beta.1 expands SecretRef to support 64 targets with fail-fast validation — verify this covers Amara's secret indirection needs.

**Acceptance Criteria:**
- [ ] Auth-profiles path confirmed and documented
- [ ] Token read/write/refresh cycle verified against OpenClaw API
- [ ] Refresh failure detection and human-alert path documented
- [ ] No secrets stored outside of auth-profiles (no `.env`, no in-memory caching beyond request scope)

**Size:** S
**Dependencies:** None
**Blocks:** None

---

### S2.3: Write log-sanitization test

**Description:** Automated test that verifies OAuth tokens, API keys, and other secrets never appear in structured log output at any log level. Depends on the structured logging standard from Epic 3 (S3.1).

**Acceptance Criteria:**
- [ ] Test injects known secret values into a request context
- [ ] Test captures all log output from a simulated request lifecycle
- [ ] Test asserts none of the injected secrets appear in captured output
- [ ] Covers all log levels: debug, info, warn, error
- [ ] Test fails if a new log statement leaks a secret (regression guard)

**Size:** M
**Dependencies:** S3.1 (structured logging standard)
**Blocks:** None

---

### S2.4: Define PII inventory and retention policy

**Description:** Document all user data Amara stores, why it's stored, and how long it's retained. This is a policy document that gates data deletion implementation. Note: `onSessionTranscriptUpdate` (v2026.3.2-beta.1, beta) data is PII-bearing — session transcript updates contain message content and must be included in the PII inventory and subject to the retention policy.

**Acceptance Criteria:**
- [ ] Inventory table: data field, storage location, purpose, retention period
- [ ] Task data: 90-day retention from creation
- [ ] Triage log: 30-day retention from creation
- [ ] OAuth tokens: exempt from auto-purge (managed by OpenClaw)
- [ ] Audit logs: retention period documented (recommended: 1 year)
- [ ] Purge mechanism described (scheduled job or on-access check)

**Size:** S
**Dependencies:** None
**Blocks:** None

---

### S2.5: Implement delete-my-data 7-step process

**Description:** Implement the complete data deletion process from Epic 0, Section 9. Must cover all tables across all stores. This is the largest story in Epic 2 because it touches every table defined in Epic 1.

**Acceptance Criteria:**
- [ ] Step 1: Delete all tasks owned by the user
- [ ] Step 2: Delete all triage_log entries
- [ ] Step 3: Delete all event_queue entries (pending and complete)
- [ ] Step 4: Delete all amara_dlq entries
- [ ] Step 5: Delete audit log entries
- [ ] Step 6: Clear cached credentials and agent session data
- [ ] Step 7: Reset config to defaults (preserve install, remove user data)
- [ ] Each step is idempotent (safe to re-run)
- [ ] Integration test: populate all tables → delete → verify empty
- [ ] Returns a receipt listing what was deleted (counts per table)

**Size:** L
**Dependencies:** S1.1, S1.2, S1.5, S1.6
**Blocks:** None

---

### S2.6: Define and wire security audit log

**Description:** Create a dedicated security audit log table in SQLite for security-sensitive events. Wire it to the event bus so security events are automatically captured.

**Acceptance Criteria:**
- [ ] `security_audit_log` table created with: `log_id`, `event_type`, `actor`, `target`, `details`, `created_at`
- [ ] Event types include: `oauth_exchange`, `token_rotation`, `token_revocation`, `write_permission_grant`, `data_deletion`
- [ ] Events published to event bus are captured by audit log listener
- [ ] Query API: filter by event type, date range
- [ ] Unit test: emit security event → verify audit log entry

**Size:** M
**Dependencies:** S1.2, S1.4
**Blocks:** S2.7, S10.3

---

### S2.7: Implement D14 write permission audit logging

**Description:** Ensure all outbound sends on monitored channels (Gmail send, Calendar event create, WhatsApp message) are logged in the security audit log with the grant type that authorized the action.

**Acceptance Criteria:**
- [ ] Every outbound write action logged with: channel, action type, grant type, timestamp
- [ ] Grant types documented: `user_explicit`, `standing_rule`, `auto_approved`
- [ ] Log entry includes enough context to reconstruct what was sent (but NOT the full message body — PII)
- [ ] Unit test: simulate outbound send → verify audit log entry with grant type

**Size:** M
**Dependencies:** S2.6
**Blocks:** None

---

### S2.8: Document input validation contracts

**Description:** Document the validation rules and sanitization applied to all external inputs entering Amara (channel messages, API requests, config values). This is a reference document for implementers of channel adapters and API endpoints.

**Acceptance Criteria:**
- [ ] Validation rules documented for: message text, email addresses, calendar dates, task IDs
- [ ] Sanitization rules documented: HTML stripping, URL validation, size limits
- [ ] Maximum input sizes documented per field
- [ ] Error response format documented for validation failures
- [ ] Document is referenced from channel adapter epic (Epic 8) scope

**Size:** S
**Dependencies:** None
**Blocks:** None

## Story Sequencing

```
Phase 1 (parallel start — documentation stories):
  S2.1: OAuth scopes ──────────────────┐
  S2.2: Secret storage verification ───┤
  S2.4: PII inventory + retention ─────┤
  S2.8: Input validation contracts ────┘

Phase 2 (blocked on cross-epic deps):
  S2.3: Log-sanitization test ◄──────── (needs S3.1 from Epic 3)
  S2.6: Security audit log ◄────────── (needs S1.2, S1.4 from Epic 1)

Phase 3 (blocked on Phase 2):
  S2.7: Write permission audit ◄─────── (needs S2.6)

Phase 4 (blocked on Epic 1 tables):
  S2.5: Delete-my-data ◄────────────── (needs S1.1, S1.2, S1.5, S1.6)
```

## Dependencies

- Epic 0 (architecture gate) — security constraints defined there
- Epic 1 (core infrastructure) — audit log uses event bus

## Open Questions

- ~~Do we use the OS keychain, or is a simple encrypted file acceptable for v1?~~ **Resolved:** Neither — delegated to OpenClaw auth-profiles (D9)
- ~~Is the security audit log a separate table or the same JSONL as the general audit log?~~ **Resolved:** Same database, separate tables (Epic 0, Section 9)
- ~~Does the PII retention clock start at task creation or task completion?~~ **Resolved:** Clock starts at record creation; 90-day for tasks, 30-day for triage_log (Epic 0, Section 9)
