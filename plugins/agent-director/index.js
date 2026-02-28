/**
 * Agent Director — OpenClaw orchestrator plugin
 *
 * Three responsibilities:
 *   1. Immediate acknowledgment of complex tasks so you know it was heard
 *   2. Tool-by-tool progress updates streamed back to the conversation
 *   3. A `director_spawn_agent` tool that lets the LLM delegate subtasks to
 *      isolated sub-agent sessions
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a sessionKey of the form "channelId:conversationId" */
function parseSessionKey(sessionKey) {
  if (!sessionKey || typeof sessionKey !== "string") return null;
  const idx = sessionKey.indexOf(":");
  if (idx === -1) return { channelId: sessionKey, conversationId: sessionKey };
  return {
    channelId: sessionKey.slice(0, idx),
    conversationId: sessionKey.slice(idx + 1),
  };
}

/** Best-effort message dispatch across supported channels */
async function sendToChannel(api, channelId, conversationId, accountId, text) {
  const ch = api.runtime.channel;
  switch (channelId) {
    case "whatsapp":
      await ch.whatsapp.sendMessageWhatsApp(conversationId, text, { accountId });
      break;
    case "telegram":
      await ch.telegram.sendMessageTelegram(conversationId, text, { accountId });
      break;
    case "discord":
      await ch.discord.messageActions.sendMessageDiscord(conversationId, text, { accountId });
      break;
    case "slack":
      await ch.slack.sendMessageSlack(conversationId, text, { accountId });
      break;
    case "signal":
      await ch.signal.sendMessageSignal(conversationId, text, { accountId });
      break;
    case "imessage":
      await ch.imessage.sendMessageIMessage(conversationId, text, { accountId });
      break;
    default:
      api.logger.warn(`agent-director: unsupported channel "${channelId}" for progress message`);
  }
}

/**
 * Rough heuristic: is this prompt likely a multi-step / long-running request?
 * We ack if yes so the operator knows the agent heard them.
 */
function isComplexPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return false;
  if (prompt.length > 200) return true;
  const lower = prompt.toLowerCase();
  return [
    "build", "create", "implement", "write a", "set up", "configure",
    "refactor", "migrate", "deploy", "analyze", "and then", "step by step",
    "multiple", "several", "research", "investigate",
  ].some((kw) => lower.includes(kw));
}

/** Produce a short human-readable progress line for a tool call */
function formatToolProgress(toolName, params) {
  const tool = toolName?.toLowerCase() ?? "";
  if (tool.includes("bash") || tool.includes("shell") || tool.includes("command"))
    return `⚙️ Running: \`${String(params?.command ?? "").slice(0, 80)}\``;
  if (tool.includes("write"))
    return `✏️ Writing: ${String(params?.path ?? params?.file_path ?? "file").slice(0, 80)}`;
  if (tool.includes("read") || tool.includes("file"))
    return `📄 Reading: ${String(params?.path ?? params?.file_path ?? "file").slice(0, 80)}`;
  if (tool.includes("web") || tool.includes("fetch") || tool.includes("browse"))
    return `🌐 Fetching: ${String(params?.url ?? "").slice(0, 80)}`;
  if (tool.includes("search") || tool.includes("grep") || tool.includes("glob"))
    return `🔍 Searching: ${String(params?.pattern ?? params?.query ?? "").slice(0, 60)}`;
  return `🔧 ${toolName}`;
}

// ─── Orchestrator system prompt ───────────────────────────────────────────────

const ORCHESTRATOR_SYSTEM_PROMPT = `\
You are the Director — an orchestrator agent.

Your responsibilities:
1. **Decompose** complex tasks into discrete, self-contained subtasks.
2. **Delegate** subtasks to specialist sub-agents using the \`director_spawn_agent\` tool.
3. **Stay responsive** — never go silent. Briefly state your plan before executing it.
4. **Synthesize** — collect sub-agent results and present a clear, concise summary.

When you receive a complex request:
- State your plan in 2–4 sentences (what you'll do, in what order, using which specialists).
- Execute the plan, calling \`director_spawn_agent\` for each discrete subtask.
- Return a final summary when done.

For simple conversational messages or quick questions, respond directly — no sub-agents needed.

Available specialist roles for \`director_spawn_agent\`:
- \`coder\`      — software development, debugging, scripting
- \`researcher\` — information gathering, reading docs, web search
- \`analyst\`    — reasoning through problems, data analysis, decision support
- \`writer\`     — documentation, explanations, summaries
`;

const ROLE_PROMPTS = {
  coder:
    "You are a specialist coding agent. Write correct, clean, idiomatic code. Be concise and focused.",
  researcher:
    "You are a specialist research agent. Gather information thoroughly before drawing conclusions.",
  analyst:
    "You are a specialist analyst agent. Reason carefully, consider edge cases, and present findings clearly.",
  writer:
    "You are a specialist writing agent. Write clearly and concisely for the intended audience.",
};

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default function register(api) {
  const cfg = {
    ackMessage:           asString(api.pluginConfig?.ackMessage,           "On it — I'll keep you posted."),
    progressUpdates:      asBool  (api.pluginConfig?.progressUpdates,      true),
    progressMinDurationMs:asNumber(api.pluginConfig?.progressMinDurationMs, 2_000),
    orchestratorPrompt:   asBool  (api.pluginConfig?.orchestratorPrompt,   true),
    subAgentTimeoutMs:    asNumber(api.pluginConfig?.subAgentTimeoutMs,    300_000),
  };

  /**
   * sessionKey → { channelId, conversationId, accountId }
   * Populated by message_received so we can send back to the right place
   * from hooks that only have sessionKey.
   */
  const sessionCtx = new Map();

  // ── 1. Capture inbound message context ──────────────────────────────────────
  api.on("message_received", async (_event, ctx) => {
    if (!ctx.conversationId) return;
    sessionCtx.set(`${ctx.channelId}:${ctx.conversationId}`, {
      channelId:      ctx.channelId,
      conversationId: ctx.conversationId,
      accountId:      ctx.accountId,
    });
  });

  // ── 2. Ack complex tasks + inject orchestrator system prompt ─────────────────
  api.on("before_agent_start", async (event, ctx) => {
    const parsed = parseSessionKey(ctx.sessionKey);
    if (!parsed) return undefined;

    const { channelId, conversationId } = parsed;
    const stored = sessionCtx.get(ctx.sessionKey);

    if (isComplexPrompt(event.prompt)) {
      sendToChannel(api, channelId, conversationId, stored?.accountId, cfg.ackMessage).catch(
        (e) => api.logger.warn(`agent-director: ack failed: ${e?.message ?? e}`),
      );
    }

    if (cfg.orchestratorPrompt) {
      return { systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT };
    }
    return undefined;
  });

  // ── 3. Tool progress updates ─────────────────────────────────────────────────
  if (cfg.progressUpdates) {
    api.on("after_tool_call", async (event, ctx) => {
      // Skip fast tool calls — not worth surfacing
      if ((event.durationMs ?? 0) < cfg.progressMinDurationMs) return;
      // Skip the director tool itself; the LLM narrates its own spawn calls
      if (event.toolName === "director_spawn_agent") return;

      const parsed = parseSessionKey(ctx.sessionKey);
      if (!parsed) return;

      const { channelId, conversationId } = parsed;
      const stored = sessionCtx.get(ctx.sessionKey);

      const msg = formatToolProgress(event.toolName, event.params);
      sendToChannel(api, channelId, conversationId, stored?.accountId, msg).catch(() => {});
    });
  }

  // ── 4. Sub-agent spawning tool ───────────────────────────────────────────────
  api.registerTool({
    name: "director_spawn_agent",
    description:
      "Spawn a specialized sub-agent to handle a discrete subtask in an isolated session. " +
      "Returns the sub-agent's full output when complete. " +
      "Use for self-contained work units (coding a module, doing research, writing a doc section). " +
      "Sub-agents have no access to the current conversation history — be explicit in the task description.",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description:
            "Full task description for the sub-agent. Be explicit — it has no conversation history.",
        },
        subSessionKey: {
          type: "string",
          description:
            "Short unique label for this subtask (e.g. 'auth-module', 'market-research'). " +
            "Used to namespace the sub-agent session.",
        },
        role: {
          type: "string",
          enum: ["coder", "researcher", "analyst", "writer"],
          description: "Specialist role — primes the sub-agent's approach and focus.",
        },
      },
      required: ["task", "subSessionKey"],
    },
    async execute({ task, subSessionKey, role }) {
      const rolePrompt = ROLE_PROMPTS[role] ?? "";
      const fullPrompt = rolePrompt ? `${rolePrompt}\n\nTask:\n${task}` : task;

      // Shell-safe single-quote escaping
      const safePrompt = fullPrompt.replace(/'/g, "'\\''");
      const cmd = `openclaw agent --message '${safePrompt}'`;

      try {
        const result = await api.runtime.system.runCommandWithTimeout(cmd, cfg.subAgentTimeoutMs);
        // result may be a string or { stdout, stderr, exitCode } depending on runtime version
        const output =
          typeof result === "string" ? result : result?.stdout ?? JSON.stringify(result);
        return { success: true, output: output.trim() };
      } catch (err) {
        api.logger.error(
          `agent-director: sub-agent "${subSessionKey}" failed: ${err?.message ?? err}`,
        );
        return { success: false, error: err?.message ?? String(err) };
      }
    },
  });

  return {
    stop() {
      sessionCtx.clear();
    },
    // Exposed for tests
    _sessionCtx: sessionCtx,
    _cfg:        cfg,
  };
}

// ─── Type coercers ────────────────────────────────────────────────────────────

function asString(v, fallback) {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function asBool(v, fallback) {
  return typeof v === "boolean" ? v : fallback;
}

function asNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
