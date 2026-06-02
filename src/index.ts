import type { PluginModule, Plugin } from "@opencode-ai/plugin"
import { loadConfig } from "./plugin-config.js"
import { createAgents } from "./create-agents.js"
import { createTools } from "./create-tools.js"
import { createHooks } from "./create-hooks.js"
import { log } from "./shared/logger.js"

const serverPlugin: Plugin = async (input) => {
  log("[naruto] ENTRY - plugin loading", {
    directory: input.directory,
  })

  const pluginConfig = loadConfig(input.directory)
  const agents = createAgents(pluginConfig, input.directory)
  const toolsResult = createTools(pluginConfig, input.directory)
  const hooks = createHooks({
    ctx: input,
    pluginConfig,
    agents,
    tools: toolsResult,
  })

  return { ...hooks }
}

const pluginModule: PluginModule = {
  id: "naruto",
  server: serverPlugin,
}

export default pluginModule
