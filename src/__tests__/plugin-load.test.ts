import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import register from "../index.js";
import type { OpenClawPluginApi, AnyAgentTool } from "openclaw/plugin-sdk";

describe("Amara plugin registration", () => {
  function createMockApi() {
    const tools: AnyAgentTool[] = [];
    const hooks: Array<{ event: string; handler: (...args: unknown[]) => unknown }> = [];

    const api = {
      registerTool: mock.fn((tool: AnyAgentTool) => {
        tools.push(tool);
      }),
      registerHook: mock.fn(),
      on: mock.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        hooks.push({ event, handler });
      }),
      logger: {
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn(),
      },
    } as unknown as OpenClawPluginApi;

    return { api, tools, hooks };
  }

  it("exports a register function", () => {
    assert.equal(typeof register, "function");
  });

  it("registers the amara_hello tool with correct API shape", () => {
    const { api, tools } = createMockApi();
    register(api);

    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "amara_hello");
    assert.equal(tools[0].label, "Amara Hello");
    assert.equal(typeof tools[0].execute, "function");
    assert.ok(tools[0].parameters, "tool must have parameters");
  });

  it("registers the gateway_start lifecycle hook", () => {
    const { api, hooks } = createMockApi();
    register(api);

    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].event, "gateway_start");
  });

  it("amara_hello execute returns AgentToolResult shape", async () => {
    const { api, tools } = createMockApi();
    register(api);

    const result = await tools[0].execute("test-call-id", {});
    assert.ok(result.content, "result must have content array");
    assert.ok(Array.isArray(result.content), "content must be an array");
    assert.equal(result.content[0].type, "text");
  });

  it("gateway_start hook logs success", async () => {
    const { api, hooks } = createMockApi();
    register(api);

    await hooks[0].handler();
    assert.equal(
      (api.logger.info as unknown as ReturnType<typeof mock.fn>).mock.calls.length,
      1,
    );
  });
});
