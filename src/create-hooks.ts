import type { Hooks, PluginInput, Config } from "@opencode-ai/plugin"
import type { Part } from "@opencode-ai/sdk"
import type { NarutoConfig } from "./config/schema.js"
import type { AgentDefinitions } from "./create-agents.js"
import type { PipelineTools } from "./create-tools.js"
import { COMMANDS } from "./commands/index.js"
import { log } from "./shared/logger.js"

const COMMAND_SYSTEM_PROMPTS: Record<string, string> = {
  "/develop":
    "You are acting as the Naruto Coordinator. Execute the full requirements development pipeline: clarification -> exploration -> PRD -> technical design -> coding -> testing -> review. Use the pipeline_run tool to start, then orchestrate each stage.",
  "/prd":
    "You are acting as the Naruto Coordinator for PRD generation only. Run the explore stage first, then generate a PRD. Use pipeline_run to start from the explore stage if no context exists.",
  "/tech-design":
    "You are acting as the Naruto Coordinator for technical design only. Read the existing PRD from .naruto/artifacts/prd.md and codebase context from .naruto/artifacts/context.md, then generate the technical design.",
  "/code":
    "You are acting as the Naruto Coordinator for coding only. Read the tech design from .naruto/artifacts/tech-design.md and dispatch the coder subagent.",
  "/test":
    "You are acting as the Naruto Coordinator for testing only. Read the tech design and dispatch the tester subagent.",
  "/review":
    "You are acting as the Naruto Coordinator for code review only. Read all changed files and dispatch the reviewer subagent.",
  "/naruto-export":
    "You are acting as the Naruto Coordinator. Export the current project context to AGENTS.md using the artifacts in .naruto/.",
}

interface CreateHooksInput {
  ctx: PluginInput
  pluginConfig: NarutoConfig
  agents: AgentDefinitions
  tools: PipelineTools
}

export function createHooks(input: CreateHooksInput): Hooks {
  const { agents, tools } = input

  const configHook = async (config: Config): Promise<void> => {
    config.agent = {
      ...config.agent,
      ...agents.all,
    }

    // Register commands so they appear in OpenCode's command list
    if (!config.command) {
      config.command = {}
    }
    for (const [name, cmd] of Object.entries(COMMANDS)) {
      config.command[name] = {
        template: cmd.template,
        description: cmd.description,
      }
    }

    log("[create-hooks] config hook applied", {
      agentNames: Object.keys(agents.all),
      commandNames: Object.keys(config.command),
    })
  }

  const commandExecuteBefore: NonNullable<Hooks["command.execute.before"]> =
    async (cmdInput, output): Promise<void> => {
      const command = cmdInput.command
      const commandNames = new Set(Object.keys(COMMANDS).map((n) => `/${n}`))
      if (!commandNames.has(command)) return

      const prompt = COMMAND_SYSTEM_PROMPTS[command]
      if (!prompt) return

      output.parts.push({
        type: "text",
        text: prompt,
      } as Part)

      log("[create-hooks] command.execute.before", {
        command,
        sessionID: cmdInput.sessionID,
      })
    }

  return {
    config: configHook,
    tool: tools.tool,
    "command.execute.before": commandExecuteBefore,
  }
}
