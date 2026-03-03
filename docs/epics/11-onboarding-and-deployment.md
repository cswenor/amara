# Epic 11 — Onboarding & Deployment

## Overview

The install flow, account connection, and getting-started documentation. The goal is that someone other than the author can run Amara successfully by following documented steps.

## Goals

- Install flow is documented and tested end-to-end
- Connecting each channel (WhatsApp, Gmail, Calendar) has a clear how-to
- Getting-started guide exists and is accurate
- A fresh install reaches "Amara is running and receiving messages" state in one sitting

## Scope

**In:**
- Prerequisites documentation (Node.js >=22.12, OpenClaw Gateway v2026.3.2-beta.1 or later (D15), Google OAuth credentials, accounts needed)
- Install steps (clone, install deps, configure)
- Account connection flow for each channel
- Environment variable / config file documentation
- Getting-started guide ("send your first message")
- Troubleshooting guide (common failure modes)
- Channel binding configuration docs (how to set channels as `direct` vs `monitored` — D13)
- Standing rule (D14) configuration docs (how to grant write permissions on monitored channels)

**Out:**
- Hosted/cloud deployment (local only for v1)
- Auto-update mechanism (future)
- Multi-user onboarding (future)

## Key Decisions

- [x] Config format: YAML at `~/.amara/config.yaml` (per Epic 0, Section 6 — Data Stores)
- [ ] Is there an interactive setup wizard, or is it manual config?
- [ ] Where are docs published? (repo README / GitHub Pages / separate site?)
- [ ] What's the minimum viable first experience? (just WhatsApp, or all three channels?)

## Success Metrics

- A developer unfamiliar with the codebase follows the guide and reaches a running Amara in under 30 minutes
- Each troubleshooting entry resolves a failure mode that was actually encountered
- All documented commands work on macOS and Linux

## Definition of Done

- [ ] Prerequisites documented
- [ ] Install steps documented and tested
- [ ] Account connection flow documented per channel
- [ ] Environment / config documented
- [ ] Getting-started guide written and tested by someone other than the author
- [ ] Troubleshooting guide covers top 5 failure modes
- [ ] README updated to point to docs/

## Risks & Failure Modes

| Risk | Mitigation |
|------|-----------|
| Docs written but not tested | Require fresh-install walkthrough before declaring done |
| Config format changes after docs are written | Freeze config format in Epic 0 / Epic 1 before writing docs |
| OAuth flows change (Google, Meta) | Link to official docs for auth steps; own only Amara-specific steps |

## Stories

> Placeholder — to become GitHub issues.

- [ ] Document prerequisites (Node.js >=22.12, OpenClaw v2026.3.2-beta.1 — D15)
- [ ] Document install steps
- [ ] Add `openclaw config validate --json` verification step to install flow (v2026.3.2-beta.1)
- [ ] Document `tools.profile` configuration requirements for agent bundles (v2026.3.2-beta.1 breaking change)
- [ ] Document WhatsApp account connection
- [ ] Document Gmail account connection
- [ ] Document Calendar account connection
- [ ] Document channel binding configuration (direct vs monitored — D13)
- [ ] Document standing rule configuration for write permissions (D14)
- [ ] Write getting-started guide
- [ ] Write troubleshooting guide
- [ ] Test full install on a clean machine
- [ ] Update README

## Dependencies

- All other epics must be complete before the onboarding and deployment epic is done

## Open Questions

- Is there a setup wizard, or is manual config acceptable for v1?
- Should the docs live in the repo or be published externally?
- What's the minimum first experience — one channel or all three?
