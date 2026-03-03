/** JSON Schema definition for tool input validation. */
export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

/** Tool definition registered with the OpenClaw plugin API. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (input: unknown) => Promise<{ text: string }>;
}

/** Hook callback registered with the OpenClaw plugin API. */
export interface HookOptions {
  name: string;
}

/** Logger provided by the OpenClaw plugin API. */
export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** OpenClaw plugin API surface passed to the register function. */
export interface PluginApi {
  registerTool(tool: ToolDefinition): void;
  registerHook(
    event: string,
    callback: () => Promise<void>,
    options: HookOptions,
  ): void;
  logger: PluginLogger;
}
