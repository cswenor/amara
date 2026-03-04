.PHONY: install setup dev test build clean mcp-build

install:
	pnpm install
	cd tools/mcp/pm-intelligence && pnpm install

setup: install mcp-build
	@echo "==> Checking OpenClaw CLI..."
	@command -v openclaw >/dev/null 2>&1 || { echo "OpenClaw CLI not found. Install with: npm install -g openclaw@latest"; exit 1; }
	@echo "==> Setup complete."

mcp-build:
	cd tools/mcp/pm-intelligence && pnpm run build

dev:
	openclaw gateway --config config/openclaw.dev.json5

test:
	node --test --import tsx 'src/__tests__/**/*.test.ts'

build:
	pnpm run build

clean:
	rm -rf build
	rm -rf tools/mcp/pm-intelligence/build
