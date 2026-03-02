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
- WhatsApp integration: configure and test OpenClaw native Baileys adapter (per Epic 0 decision D4) + Amara normalization
- Gmail integration: configure and test native `gog` Gmail (Pub/Sub push inbound, send/reply/draft outbound per D5) + Amara enhancement layer
- Calendar integration: configure and test native `gog` Calendar CRUD (per D6) + Amara analysis layer
- Channel-specific message normalization (to/from AmaraEvent envelope format per D11)
- Channel-specific auth flows: QR/pairing session for WhatsApp (Baileys), OAuth2 for Gmail/Calendar (via `gog auth`)

**Out:**
- Adapter interface definition (Epic 7)
- OAuth scope definitions (Epic 2)
- Additional channels (Slack, SMS, etc.) — future

## Key Decisions

- [x] WhatsApp: use OpenClaw's existing Baileys adapter (Decision D4)
- [x] Gmail: use native Pub/Sub push via `gog gmail watch serve` (Decision D5). OpenClaw supports full push-based Gmail with auto-renewal and Tailscale tunnel. No need for polling fallback.
- [x] Calendar: v1 scope is read events + create/update events using native `gog calendar` CRUD (Decision D6). Invite management (accept/decline/RSVP) deferred to v2.
- [x] Message normalization: common AmaraEvent envelope format (Decision D11). Thin normalization layer converts channel-specific events.
- [ ] How are threading and reply context preserved across channels? (Deferred to Epic 7 design phase — does not block Epic 1 start. Must be resolved before normalization layer implementation.)

## Success Metrics

- End-to-end test: WhatsApp message → Amara acknowledges → responds
- End-to-end test: Gmail email → Amara triages → drafts/sends reply
- End-to-end test: Calendar event invite → Amara reads and reports
- All three adapters pass platform test harness

## Definition of Done

- [ ] WhatsApp integration configured, tested end-to-end (native Baileys adapter + Amara normalization)
- [ ] Gmail integration configured, tested end-to-end (native `gog` Pub/Sub push + Amara enhancement layer)
- [ ] Calendar integration configured, tested end-to-end (native `gog` CRUD + Amara analysis layer)
- [ ] All three pass platform test harness
- [ ] Auth flows documented
- [ ] Message normalization documented
- [ ] All tests pass with `node --test`

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Gmail Pub/Sub setup is complex (GCP project + Tailscale tunnel) | OpenClaw provides `openclaw webhooks gmail setup` wizard that automates GCP setup, Pub/Sub topic/subscription creation, and Tailscale Funnel configuration |
| WhatsApp API changes break adapter | Pin API version; monitor changelogs |
| Calendar API quota limits | Cache reads; batch writes |
| OAuth token refresh fails silently | Explicit refresh error handling; alert to human |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Configure and test WhatsApp via native Baileys adapter + normalization
- [ ] Configure and test Gmail via native `gog` (Pub/Sub push + send) + enhancement layer
- [ ] Configure and test Calendar via native `gog` CRUD + analysis layer
- [ ] Write end-to-end test per channel
- [ ] Document auth flow per channel (QR/pairing for WhatsApp, OAuth2 for Gmail/Calendar)
- [ ] Document message normalization (AmaraEvent envelope)

## Dependencies

- Epic 7 (channel platform) — adapter interface must be stable

## Open Questions

- ~~Does Amara handle WhatsApp via the existing OpenClaw plugin, or does she own her own adapter?~~ **Resolved:** Use OpenClaw native adapter (D4)
- ~~Is Gmail polling acceptable for v1, or is Pub/Sub required for acceptable latency?~~ **Resolved:** Use native Pub/Sub push via `gog gmail watch serve` (D5). OpenClaw has full push infrastructure with auto-renewal and setup wizard.
- ~~Which Calendar operations are in scope for the first release?~~ **Resolved:** Read events + create/update using native `gog calendar` CRUD (D6). Invite management deferred.
- How are threading and reply context preserved across channels? (Deferred to Epic 7 design — does not block Epic 1. Must resolve before normalization layer. Each channel has different models: WhatsApp quoted messages, Gmail thread IDs, Telegram reply_to_message_id. AmaraEvent envelope needs a canonical `thread_ref` field.)
