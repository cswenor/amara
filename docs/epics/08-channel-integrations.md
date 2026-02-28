# Epic 8 — Channel Integrations

## Overview

Implements WhatsApp, Gmail, and Calendar on top of the Channel Platform (Epic 7). Each integration satisfies the adapter interface and handles only channel-specific concerns (API calls, message formats, auth flows).

## Goals

- WhatsApp inbound and outbound working end-to-end
- Gmail inbound (triage) and outbound (reply/send) working end-to-end
- Calendar read and write working end-to-end
- All integrations pass the platform test harness

## Scope

**In:**
- WhatsApp adapter (Meta Cloud API or OpenClaw native — per Epic 0 decision)
- Gmail adapter (Gmail API via OAuth)
- Calendar adapter (Google Calendar API via OAuth)
- Channel-specific message normalization (to/from platform format)
- Channel-specific auth flows (OAuth for Gmail/Calendar; API key or webhook for WhatsApp)

**Out:**
- Adapter interface definition (Epic 7)
- OAuth scope definitions (Epic 2)
- Additional channels (Slack, SMS, etc.) — future

## Key Decisions

- [ ] WhatsApp: use OpenClaw's existing adapter or build a new one?
- [ ] Gmail: polling vs. push (Pub/Sub watch)?
- [ ] Calendar: which operations are in scope for v1? (read events, create, accept/decline invites?)
- [ ] Message normalization: common envelope format or channel-specific?
- [ ] How are threading and reply context preserved across channels?

## Success Metrics

- End-to-end test: WhatsApp message → Amara acknowledges → responds
- End-to-end test: Gmail email → Amara triages → drafts/sends reply
- End-to-end test: Calendar event invite → Amara reads and reports
- All three adapters pass platform test harness

## Definition of Done

- [ ] WhatsApp adapter implemented and tested
- [ ] Gmail adapter implemented and tested
- [ ] Calendar adapter implemented and tested
- [ ] All three pass platform test harness
- [ ] Auth flows documented
- [ ] Message normalization documented
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Gmail Pub/Sub setup is complex | Fall back to polling for v1; upgrade later |
| WhatsApp API changes break adapter | Pin API version; monitor changelogs |
| Calendar API quota limits | Cache reads; batch writes |
| OAuth token refresh fails silently | Explicit refresh error handling; alert to human |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Implement WhatsApp adapter
- [ ] Implement Gmail adapter
- [ ] Implement Calendar adapter
- [ ] Write end-to-end test per channel
- [ ] Document auth flow per channel
- [ ] Document message normalization

## Dependencies

- Epic 7 (channel platform) — adapter interface must be stable

## Open Questions

- Does Amara handle WhatsApp via the existing OpenClaw plugin, or does she own her own adapter?
- Is Gmail polling acceptable for v1, or is Pub/Sub required for acceptable latency?
- Which Calendar operations are in scope for the first release?
