import type { OpenClawPluginApi, AnyAgentTool } from "openclaw/plugin-sdk";
import { jsonResult } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";

export default function register(api: OpenClawPluginApi): void {
  const helloTool: AnyAgentTool = {
    name: "amara_hello",
    description: "Amara hello world — verifies plugin is loaded",
    label: "Amara Hello",
    parameters: Type.Object({}),
    execute: async () => jsonResult({ text: "Hello from Amara!" }),
  };

  api.registerTool(helloTool);

  api.on("gateway_start", async () => {
    api.logger.info("[amara] Plugin loaded successfully");
  });
}
