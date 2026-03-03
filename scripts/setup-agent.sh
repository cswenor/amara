#!/usr/bin/env bash
set -euo pipefail

AGENT_ID="${1:-amara-dev}"
WORKSPACE_DIR="$HOME/.openclaw/agents/$AGENT_ID"

echo "==> Setting up agent workspace: $WORKSPACE_DIR"

mkdir -p "$WORKSPACE_DIR"

# Write a minimal agent config if one doesn't already exist
AGENT_CONFIG="$WORKSPACE_DIR/agent.json"
if [ ! -f "$AGENT_CONFIG" ]; then
  cat > "$AGENT_CONFIG" <<EOF
{
  "id": "$AGENT_ID",
  "name": "Amara Dev Agent",
  "description": "Development agent for testing the Amara plugin"
}
EOF
  echo "    Created $AGENT_CONFIG"
else
  echo "    Agent config already exists at $AGENT_CONFIG — skipping"
fi

echo "==> Agent workspace ready at $WORKSPACE_DIR"
echo ""
echo "Next steps:"
echo "  1. Run 'make dev' to start the OpenClaw gateway with the Amara plugin"
echo "  2. The gateway will load the plugin from this repo automatically"
