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
- Prerequisites documentation (Node version, OpenClaw, accounts needed)
- Install steps (clone, install deps, configure)
- Account connection flow for each channel
- Environment variable / config file documentation
- Getting-started guide ("send your first message")
- Troubleshooting guide (common failure modes)

**Out:**
- Hosted/cloud deployment (local only for v1)
- Auto-update mechanism (future)
- Multi-user onboarding (future)

## Key Decisions

- [ ] Config format: `.env` / YAML file / config object in code?
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

- [ ] Document prerequisites
- [ ] Document install steps
- [ ] Document WhatsApp account connection
- [ ] Document Gmail account connection
- [ ] Document Calendar account connection
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
