# Developer Setup Guide

## Prerequisites

- **Node.js 22+** — [nodejs.org](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm`
- **OpenClaw CLI** — `npm install -g openclaw@latest`

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/cswenor/amara.git
cd amara

# 2. Install dependencies and verify OpenClaw
make setup

# 3. Set up the dev agent workspace
./scripts/setup-agent.sh

# 4. Build the project
make build

# 5. Run tests
make test

# 6. Start the dev gateway
make dev
```

## What Each Step Does

### `make setup`

Installs Node.js dependencies via pnpm and verifies the OpenClaw CLI is available on your PATH. If OpenClaw is not installed, you'll see instructions to install it globally.

### `./scripts/setup-agent.sh`

Creates the agent workspace at `~/.openclaw/agents/amara-dev/` with a minimal agent configuration. You can pass a custom agent ID as an argument:

```bash
./scripts/setup-agent.sh my-custom-agent
```

### `make dev`

Starts the OpenClaw gateway using `config/openclaw.dev.json5`, which loads the Amara plugin from the current repo. On successful startup you should see:

```
[amara] Plugin loaded successfully
```

### `make build`

Compiles TypeScript to JavaScript in the `build/` directory.

### `make test`

Runs the test suite using Node.js's built-in test runner.

### `make clean`

Removes the `build/` directory.

## Verifying the Plugin

After `make dev`, the gateway should log `[amara] Plugin loaded successfully`. The `amara_hello` tool will be available in the gateway and responds with "Hello from Amara!".

## Project Structure

```
amara/
├── config/
│   └── openclaw.dev.json5    # Dev gateway configuration
├── docs/
│   └── development/
│       └── SETUP.md          # This file
├── scripts/
│   └── setup-agent.sh        # Agent workspace setup
├── src/
│   ├── __tests__/
│   │   └── plugin-load.test.ts
│   └── index.ts              # Plugin entry point
├── Makefile                  # Build targets
├── openclaw.plugin.json      # Plugin manifest
├── package.json
└── tsconfig.json
```
