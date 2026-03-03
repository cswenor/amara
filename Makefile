.PHONY: install setup dev test build clean

install:
	pnpm install

setup: install
	@echo "==> Checking OpenClaw CLI..."
	@command -v openclaw >/dev/null 2>&1 || { echo "OpenClaw CLI not found. Install with: npm install -g openclaw@latest"; exit 1; }
	@echo "==> Setup complete."

dev:
	openclaw gateway --config config/openclaw.dev.json5

test:
	node --test --import tsx 'src/__tests__/**/*.test.ts'

build:
	pnpm run build

clean:
	rm -rf build
