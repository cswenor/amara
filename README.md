# Amara

An opinionated personal assistant. Connect your accounts and she manages your life — your messages, your tasks, your calendar, your information. No configuration menus. No prompt engineering. She just works.

→ Read the full vision in [VISION.md](./VISION.md)

---

## What she covers

- **Communications** — monitors inbound messages, surfaces what's urgent, drafts replies
- **Tasks & projects** — captures work, delegates to specialist agents, tracks everything to completion, follows up
- **Calendar & scheduling** — meeting requests, reminders, time management
- **Information & research** — surfaces what you need to know when you need to know it

---

## Getting Started

```bash
make setup                  # Install deps, verify OpenClaw CLI
./scripts/setup-agent.sh    # Create dev agent workspace
make build                  # Compile TypeScript
make test                   # Run tests
make dev                    # Start OpenClaw gateway with Amara plugin
```

See [docs/development/SETUP.md](./docs/development/SETUP.md) for full setup instructions.

---

## Status

Early days. The architecture is clear; the building is underway. See the [roadmap](./VISION.md#roadmap) for what's next.

---

## Why it's public

Built for personal use. Sharing it because there's no reason others can't run the same thing.

---

## Contributing

Check the [issues list](../../issues) or open a discussion.
