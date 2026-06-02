import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import type { NarutoConfig } from "./config/schema.js"
import {
  pipelineRun,
  pipelineStatus,
  pipelineResume,
  pipelineSkip,
  pipelineReject,
} from "./tools/index.js"
import { log } from "./shared/logger.js"

export interface PipelineTools {
  tool: Record<string, ToolDefinition>
}

export function createTools(
  _pluginConfig: NarutoConfig,
  _projectDir: string,
): PipelineTools {
  const tools: Record<string, ToolDefinition> = {
    pipeline_run: pipelineRun,
    pipeline_status: pipelineStatus,
    pipeline_resume: pipelineResume,
    pipeline_skip_stage: pipelineSkip,
    pipeline_reject: pipelineReject,
  }

  log("[create-tools] tools registered", {
    names: Object.keys(tools),
  })

  return { tool: tools }
}
