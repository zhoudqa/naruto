import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentMode = "primary" | "subagent" | "all"

export type AgentFactory = {
  (model: string, temperature?: number): AgentConfig
  mode: AgentMode
}

export type PipelineAgentName =
  | "coordinator"
  | "explorer"
  | "prd-writer"
  | "tech-designer"
  | "coder"
  | "tester"
  | "reviewer"
