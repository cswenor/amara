import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import register from "./index.js";

// ─── Mock factory ──────────────────────────────────────────────────────────────

function makeApi(pluginConfig = {}) {
  const handlers = {};
  let registeredTool = null;

  const api = {
    pluginConfig,
    logger: {
      debug: mock.fn(),
      info:  mock.fn(),
      warn:  mock.fn(),
      error: mock.fn(),
    },
    runtime: {
      channel: {
        whatsapp: { sendMessageWhatsApp: mock.fn(async () => {}) },
        telegram: { sendMessageTelegram: mock.fn(async () => {}) },
        discord:  { messageActions: { sendMessageDiscord: mock.fn(async () => {}) } },
        slack:    { sendMessageSlack: mock.fn(async () => {}) },
        signal:   { sendMessageSignal: mock.fn(async () => {}) },
        imessage: { sendMessageIMessage: mock.fn(async () => {}) },
      },
      system: {
        runCommandWithTimeout: mock.fn(async () => "sub-agent output"),
      },
    },
    on(event, handler) {
      handlers[event] = handler;
    },
    registerTool(tool) {
      registeredTool = tool;
    },
    // Test helpers
    _emit(event, eventData, ctx) {
      return handlers[event]?.(eventData, ctx);
    },
    _tool() {
      return registeredTool;
    },
  };

  return api;
}

function makeMessageCtx(overrides = {}) {
  return {
    channelId:      "whatsapp",
    accountId:      "wa-001",
    conversationId: "+15550000000",
    ...overrides,
  };
}

function makeAgentCtx(overrides = {}) {
  return {
    agentId:    "agent-123",
    sessionKey: "whatsapp:+15550000000",
    sessionId:  "sess-abc",
    ...overrides,
  };
}

function makeToolCtx(overrides = {}) {
  return {
    agentId:    "agent-123",
    sessionKey: "whatsapp:+15550000000",
    toolName:   "bash",
    ...overrides,
  };
}

/** Wait for fire-and-forget async ops kicked off during a hook */
const tick = () => new Promise((r) => setImmediate(r));

const LONG_PROMPT =
  "Please build me a full authentication system with JWT tokens, refresh token rotation, " +
  "a user management dashboard, and email verification flow. Then deploy it to production.";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("agent-director", () => {

  describe("register()", () => {
    it("returns stop() and introspection handles", () => {
      const api = makeApi();
      const result = register(api);
      assert.equal(typeof result.stop, "function");
      assert.ok(result._sessionCtx instanceof Map);
      assert.ok(result._cfg);
    });

    it("registers the expected hooks", () => {
      const api = makeApi();
      const hooks = [];
      api.on = (name) => hooks.push(name);
      register(api);
      assert.ok(hooks.includes("message_received"),   "missing message_received");
      assert.ok(hooks.includes("before_agent_start"), "missing before_agent_start");
      assert.ok(hooks.includes("after_tool_call"),    "missing after_tool_call");
    });

    it("registers director_spawn_agent tool", () => {
      const api = makeApi();
      register(api);
      assert.ok(api._tool(), "no tool registered");
      assert.equal(api._tool().name, "director_spawn_agent");
    });
  });

  // ─── Config ───────────────────────────────────────────────────────────────

  describe("config", () => {
    it("applies sensible defaults", () => {
      const { _cfg } = register(makeApi());
      assert.equal(_cfg.ackMessage,            "On it — I'll keep you posted.");
      assert.equal(_cfg.progressUpdates,       true);
      assert.equal(_cfg.progressMinDurationMs, 2000);
      assert.equal(_cfg.orchestratorPrompt,    true);
      assert.equal(_cfg.subAgentTimeoutMs,     300_000);
    });

    it("honours custom config values", () => {
      const { _cfg } = register(makeApi({
        ackMessage:            "Custom ack",
        progressUpdates:       false,
        progressMinDurationMs: 5000,
        orchestratorPrompt:    false,
        subAgentTimeoutMs:     60_000,
      }));
      assert.equal(_cfg.ackMessage,            "Custom ack");
      assert.equal(_cfg.progressUpdates,       false);
      assert.equal(_cfg.progressMinDurationMs, 5000);
      assert.equal(_cfg.orchestratorPrompt,    false);
      assert.equal(_cfg.subAgentTimeoutMs,     60_000);
    });

    it("ignores invalid numeric values and falls back to default", () => {
      const { _cfg } = register(makeApi({ progressMinDurationMs: "bad", subAgentTimeoutMs: -1 }));
      assert.equal(_cfg.progressMinDurationMs, 2000);
      assert.equal(_cfg.subAgentTimeoutMs,     300_000);
    });
  });

  // ─── message_received ─────────────────────────────────────────────────────

  describe("message_received hook", () => {
    it("stores session context keyed by channelId:conversationId", async () => {
      const api = makeApi();
      const { _sessionCtx } = register(api);
      await api._emit("message_received", { from: "+15559999999", content: "hi" }, makeMessageCtx());
      assert.ok(_sessionCtx.has("whatsapp:+15550000000"));
      const stored = _sessionCtx.get("whatsapp:+15550000000");
      assert.equal(stored.channelId,      "whatsapp");
      assert.equal(stored.conversationId, "+15550000000");
      assert.equal(stored.accountId,      "wa-001");
    });

    it("skips storage if conversationId is missing", async () => {
      const api = makeApi();
      const { _sessionCtx } = register(api);
      await api._emit("message_received", {}, { channelId: "whatsapp" });
      assert.equal(_sessionCtx.size, 0);
    });
  });

  // ─── before_agent_start ───────────────────────────────────────────────────

  describe("before_agent_start hook", () => {
    it("sends ack for a complex (long) prompt", async () => {
      const api = makeApi();
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit("before_agent_start", { prompt: LONG_PROMPT }, makeAgentCtx());
      await tick();
      assert.equal(api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls.length, 1);
      const [, msg] = api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls[0].arguments;
      assert.equal(msg, "On it — I'll keep you posted.");
    });

    it("sends ack for a prompt containing complex keywords", async () => {
      const api = makeApi();
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit("before_agent_start", { prompt: "build a new auth module" }, makeAgentCtx());
      await tick();
      assert.equal(api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls.length, 1);
    });

    it("does NOT send ack for a simple greeting", async () => {
      const api = makeApi();
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit("before_agent_start", { prompt: "hello there" }, makeAgentCtx());
      await tick();
      assert.equal(api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls.length, 0);
    });

    it("returns systemPrompt containing 'Director' when orchestratorPrompt is true", async () => {
      const api = makeApi({ orchestratorPrompt: true });
      register(api);
      const result = await api._emit("before_agent_start", { prompt: "do something" }, makeAgentCtx());
      assert.ok(result?.systemPrompt?.includes("Director"), "systemPrompt missing 'Director'");
    });

    it("returns undefined when orchestratorPrompt is false", async () => {
      const api = makeApi({ orchestratorPrompt: false });
      register(api);
      const result = await api._emit("before_agent_start", { prompt: "do something" }, makeAgentCtx());
      assert.equal(result, undefined);
    });

    it("handles missing sessionKey gracefully", async () => {
      const api = makeApi();
      register(api);
      const result = await api._emit("before_agent_start", { prompt: LONG_PROMPT }, {});
      assert.equal(result, undefined);
    });

    it("uses custom ackMessage from config", async () => {
      const api = makeApi({ ackMessage: "Roger that, processing..." });
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit("before_agent_start", { prompt: LONG_PROMPT }, makeAgentCtx());
      await tick();
      const [, msg] = api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls[0].arguments;
      assert.equal(msg, "Roger that, processing...");
    });
  });

  // ─── after_tool_call ──────────────────────────────────────────────────────

  describe("after_tool_call hook", () => {
    it("sends a progress update for a slow bash tool call", async () => {
      const api = makeApi({ progressMinDurationMs: 1000 });
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit(
        "after_tool_call",
        { toolName: "bash", params: { command: "ls -la /tmp" }, durationMs: 3000 },
        makeToolCtx(),
      );
      await tick();
      assert.equal(api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls.length, 1);
      const [, msg] = api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls[0].arguments;
      assert.ok(msg.includes("ls -la /tmp"));
    });

    it("skips progress update for fast tool calls", async () => {
      const api = makeApi({ progressMinDurationMs: 5000 });
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit(
        "after_tool_call",
        { toolName: "bash", params: {}, durationMs: 100 },
        makeToolCtx(),
      );
      await tick();
      assert.equal(api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls.length, 0);
    });

    it("skips director_spawn_agent tool calls to avoid noise", async () => {
      const api = makeApi({ progressMinDurationMs: 0 });
      register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      await api._emit(
        "after_tool_call",
        { toolName: "director_spawn_agent", params: {}, durationMs: 30000 },
        makeToolCtx(),
      );
      await tick();
      assert.equal(api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls.length, 0);
    });

    it("does NOT register after_tool_call when progressUpdates is false", () => {
      const api = makeApi({ progressUpdates: false });
      const hooks = [];
      api.on = (name) => hooks.push(name);
      register(api);
      assert.ok(!hooks.includes("after_tool_call"));
    });

    it("formats progress messages correctly for different tool types", async () => {
      const cases = [
        ["read_file",  { file_path: "/etc/hosts" },   "📄"],
        ["write_file", { file_path: "/tmp/out.txt" },  "✏️"],
        ["web_fetch",  { url: "https://example.com" }, "🌐"],
        ["glob",       { pattern: "**/*.js" },         "🔍"],
      ];

      for (const [toolName, params, expectedEmoji] of cases) {
        const api = makeApi({ progressMinDurationMs: 0 });
        register(api);
        await api._emit("message_received", {}, makeMessageCtx());
        await api._emit(
          "after_tool_call",
          { toolName, params, durationMs: 5000 },
          makeToolCtx(),
        );
        await tick();
        const [, msg] = api.runtime.channel.whatsapp.sendMessageWhatsApp.mock.calls[0].arguments;
        assert.ok(msg.includes(expectedEmoji), `Expected ${expectedEmoji} in "${msg}" for tool ${toolName}`);
      }
    });
  });

  // ─── director_spawn_agent tool ────────────────────────────────────────────

  describe("director_spawn_agent tool", () => {
    it("calls runCommandWithTimeout with openclaw agent command", async () => {
      const api = makeApi();
      register(api);
      const result = await api._tool().execute({ task: "Write a hello world script", subSessionKey: "hw-001" });
      assert.ok(result.success);
      assert.equal(result.output, "sub-agent output");
      const [cmd] = api.runtime.system.runCommandWithTimeout.mock.calls[0].arguments;
      assert.ok(cmd.startsWith("openclaw agent --message"), `cmd was: ${cmd}`);
      assert.ok(cmd.includes("Write a hello world script"));
    });

    it("prepends role prompt for 'coder' role", async () => {
      const api = makeApi();
      register(api);
      await api._tool().execute({ task: "Debug this function", subSessionKey: "debug-001", role: "coder" });
      const [cmd] = api.runtime.system.runCommandWithTimeout.mock.calls[0].arguments;
      assert.ok(cmd.includes("specialist coding agent"), `cmd was: ${cmd}`);
    });

    it("prepends role prompt for 'researcher' role", async () => {
      const api = makeApi();
      register(api);
      await api._tool().execute({ task: "Find info", subSessionKey: "r-001", role: "researcher" });
      const [cmd] = api.runtime.system.runCommandWithTimeout.mock.calls[0].arguments;
      assert.ok(cmd.includes("specialist research agent"));
    });

    it("passes configured timeout to runCommandWithTimeout", async () => {
      const api = makeApi({ subAgentTimeoutMs: 60_000 });
      register(api);
      await api._tool().execute({ task: "Quick task", subSessionKey: "q-001" });
      const [, timeout] = api.runtime.system.runCommandWithTimeout.mock.calls[0].arguments;
      assert.equal(timeout, 60_000);
    });

    it("handles sub-agent failure gracefully", async () => {
      const api = makeApi();
      register(api);
      api.runtime.system.runCommandWithTimeout = mock.fn(async () => {
        throw new Error("command timed out");
      });
      const result = await api._tool().execute({ task: "Some task", subSessionKey: "fail-001" });
      assert.equal(result.success, false);
      assert.ok(result.error.includes("timed out"));
      assert.equal(api.logger.error.mock.calls.length, 1);
    });

    it("handles { stdout } result shape from runtime", async () => {
      const api = makeApi();
      register(api);
      api.runtime.system.runCommandWithTimeout = mock.fn(async () => ({
        stdout: "agent stdout output",
        stderr: "",
        exitCode: 0,
      }));
      const result = await api._tool().execute({ task: "Task", subSessionKey: "s-001" });
      assert.ok(result.success);
      assert.equal(result.output, "agent stdout output");
    });

    it("escapes single quotes in task description", async () => {
      const api = makeApi();
      register(api);
      await api._tool().execute({ task: "It's a test with 'quotes'", subSessionKey: "q-001" });
      const [cmd] = api.runtime.system.runCommandWithTimeout.mock.calls[0].arguments;
      // The raw single-quote string should not appear unescaped inside the outer single-quoted arg
      const inner = cmd.match(/--message '([\s\S]*)'/)?.[1] ?? "";
      assert.ok(!inner.includes("It's"), `unescaped quote found in: ${cmd}`);
    });
  });

  // ─── Multi-channel dispatch ────────────────────────────────────────────────

  describe("channel dispatch", () => {
    const channelCases = [
      ["telegram", (api) => api.runtime.channel.telegram.sendMessageTelegram],
      ["slack",    (api) => api.runtime.channel.slack.sendMessageSlack],
    ];

    for (const [channelId, getFn] of channelCases) {
      it(`dispatches ack to ${channelId}`, async () => {
        const api = makeApi();
        register(api);
        const ctx = makeMessageCtx({ channelId, conversationId: "chat-001" });
        await api._emit("message_received", {}, ctx);
        await api._emit(
          "before_agent_start",
          { prompt: LONG_PROMPT },
          { ...makeAgentCtx(), sessionKey: `${channelId}:chat-001` },
        );
        await tick();
        assert.equal(getFn(api).mock.calls.length, 1);
      });
    }

    it("warns on unsupported channel instead of throwing", async () => {
      const api = makeApi();
      register(api);
      await api._emit("message_received", {}, makeMessageCtx({ channelId: "matrix", conversationId: "!room:server.com" }));
      await api._emit(
        "before_agent_start",
        { prompt: LONG_PROMPT },
        { ...makeAgentCtx(), sessionKey: "matrix:!room:server.com" },
      );
      await tick();
      assert.ok(api.logger.warn.mock.calls.some((c) => c.arguments[0].includes("unsupported channel")));
    });
  });

  // ─── stop() ───────────────────────────────────────────────────────────────

  describe("stop()", () => {
    it("clears session context map", async () => {
      const api = makeApi();
      const { stop, _sessionCtx } = register(api);
      await api._emit("message_received", {}, makeMessageCtx());
      assert.equal(_sessionCtx.size, 1);
      stop();
      assert.equal(_sessionCtx.size, 0);
    });
  });
});
