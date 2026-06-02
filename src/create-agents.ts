import type { AgentConfig } from "@opencode-ai/sdk"
import type { NarutoConfig } from "./config/schema.js"
import type { PipelineAgentName } from "./agents/types.js"
import {
  createCoordinatorAgent,
  createExplorerAgent,
  createPrdWriterAgent,
  createTechDesignerAgent,
  createCoderAgent,
  createTesterAgent,
  createReviewerAgent,
} from "./agents/index.js"
import { log } from "./shared/logger.js"

interface AgentOverride {
  model?: string
  temperature?: number
  fallback_models?: string[]
}

const WORKER_FACTORIES: Record<
  Exclude<PipelineAgentName, "coordinator">,
  (model: string, temperature?: number) => AgentConfig
> = {
  explorer: createExplorerAgent,
  "prd-writer": createPrdWriterAgent,
  "tech-designer": createTechDesignerAgent,
  coder: createCoderAgent,
  tester: createTesterAgent,
  reviewer: createReviewerAgent,
}

function applyOverride(
  agent: AgentConfig,
  override: AgentOverride,
): AgentConfig {
  const result = { ...agent }
  if (override.model !== undefined) {
    result.model = override.model
  }
  if (override.temperature !== undefined) {
    result.temperature = override.temperature
  }
  return result
}

export interface AgentDefinitions {
  all: Record<string, AgentConfig>
}

export function createAgents(
  pluginConfig: NarutoConfig,
  _projectDir: string,
): AgentDefinitions {
  const coordinator = createCoordinatorAgent("")

  const agents: Record<string, AgentConfig> = {
    "naruto-coordinator": coordinator,
  }

  for (const [name, factory] of Object.entries(WORKER_FACTORIES)) {
    const override = pluginConfig.agents[name] as AgentOverride | undefined
    const model = override?.model ?? ""
    const temperature = override?.temperature
    let agent = factory(model, temperature)
    if (override) {
      agent = applyOverride(agent, override)
    }
    agents[`naruto-${name}`] = agent
  }

  log("[create-agents] agents created", {
    names: Object.keys(agents),
  })

  return { all: agents }
}
