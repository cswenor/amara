import type { PluginApi } from "./types.js";

/**
 * Register the Amara plugin with the OpenClaw Gateway.
 *
 * This is the plugin entry point invoked by the gateway at startup.
 * It registers tools and lifecycle hooks.
 */
export default function register(api: PluginApi): void {
  api.registerTool({
    name: "amara_hello",
    description: "Amara hello world — verifies plugin is loaded",
    inputSchema: { type: "object", properties: {} },
    handler: async () => ({ text: "Hello from Amara!" }),
  });

  api.registerHook(
    "gateway_start",
    async () => {
      api.logger.info("[amara] Plugin loaded successfully");
    },
    { name: "amara.startup" },
  );
}
