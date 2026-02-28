# Amara

An [OpenClaw](https://github.com/openclaw/openclaw) plugin that turns your AI assistant into a manager, not a doer.

Amara acknowledges your request immediately, delegates work to specialist sub-agents, tracks every task to completion, and comes back to you when she's stuck — rather than going quiet and hoping for the best.

→ Read the full vision in [VISION.md](./VISION.md)

---

## What it does today

- **Immediate acknowledgment** — sends a confirmation message the moment a complex task is detected, before any work begins
- **Tool progress streaming** — surfaces a short status update after each slow tool call so you always know what's happening
- **Orchestrator prompt** — injects a system prompt that instructs the model to break tasks down and delegate to sub-agents rather than doing everything itself
- **Sub-agent delegation** — spawns focused sub-agents for discrete work units with a configurable timeout

---

## Installation

Install as an OpenClaw plugin:

```bash
# from your OpenClaw plugins directory
git clone https://github.com/cswenor/amara.git
```

Then add to your OpenClaw config:

```json
{
  "extensions": ["./amara/plugins/agent-director/index.js"]
}
```

---

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ackMessage` | string | `"On it — I'll keep you posted."` | Sent immediately when a complex task is detected |
| `progressUpdates` | boolean | `true` | Stream status after each slow tool call |
| `progressMinDurationMs` | number | `2000` | Only send progress update if tool call exceeded this threshold (ms) |
| `orchestratorPrompt` | boolean | `true` | Inject the orchestrator system prompt |
| `subAgentTimeoutMs` | number | `300000` | How long to wait for a sub-agent before giving up (ms) |

---

## Development

Requires Node ≥ 22.

```bash
node --test
```

---

## Roadmap

This plugin is the seed of a larger vision. See [VISION.md](./VISION.md) for the full picture — task persistence, the agent directory, the human clarification loop, and more.

---

## Contributing

Check the [issues list](../../issues) for open work. If you want to build something, grab an issue or open a discussion.
