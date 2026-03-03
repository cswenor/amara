import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import register from "../index.js";
import type { PluginApi, ToolDefinition, HookOptions } from "../types.js";

describe("Amara plugin registration", () => {
  function createMockApi() {
    const tools: ToolDefinition[] = [];
    const hooks: Array<{ event: string; callback: () => Promise<void>; options: HookOptions }> = [];

    const api: PluginApi = {
      registerTool: mock.fn((tool: ToolDefinition) => {
        tools.push(tool);
      }),
      registerHook: mock.fn(
        (event: string, callback: () => Promise<void>, options: HookOptions) => {
          hooks.push({ event, callback, options });
        },
      ),
      logger: {
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn(),
      },
    };

    return { api, tools, hooks };
  }

  it("exports a register function", () => {
    assert.equal(typeof register, "function");
  });

  it("registers the amara_hello tool", () => {
    const { api, tools } = createMockApi();
    register(api);

    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "amara_hello");
    assert.equal(typeof tools[0].handler, "function");
  });

  it("registers the gateway_start hook", () => {
    const { api, hooks } = createMockApi();
    register(api);

    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].event, "gateway_start");
    assert.equal(hooks[0].options.name, "amara.startup");
  });

  it("amara_hello handler returns greeting", async () => {
    const { api, tools } = createMockApi();
    register(api);

    const result = await tools[0].handler({});
    assert.deepEqual(result, { text: "Hello from Amara!" });
  });

  it("gateway_start hook logs success", async () => {
    const { api, hooks } = createMockApi();
    register(api);

    await hooks[0].callback();
    assert.equal((api.logger.info as unknown as ReturnType<typeof mock.fn>).mock.calls.length, 1);
  });
});
