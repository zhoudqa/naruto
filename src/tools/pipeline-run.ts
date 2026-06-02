import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"
import { createPipeline } from "../pipeline/state-machine.js"
import { loadConfig } from "../plugin-config.js"
import { deleteState, loadState } from "../pipeline/state-store.js"
import type { PipelineStage } from "../pipeline/types.js"

export const pipelineRun: ToolDefinition = tool({
  description:
    "Start a new Naruto requirements development pipeline. Creates pipeline state and begins from the specified stage (default: clarify).",
  args: {
    requirement: tool.schema.string().describe(
      "The raw requirement text - natural language description or PRD markdown",
    ),
    type: tool.schema
      .enum(["natural_language", "prd_markdown"])
      .describe("Input format: natural_language for free text, prd_markdown for structured PRD"),
    start_stage: tool.schema
      .enum(["clarify", "explore", "domain-analysis", "prd", "tech-design", "code", "test", "review"])
      .optional()
      .describe("Stage to start from (default: clarify). Use to skip earlier stages."),
    skip_stages: tool.schema
      .array(tool.schema.enum(["clarify", "explore", "domain-analysis", "prd", "tech-design", "code", "test", "review"]))
      .optional()
      .describe("Stages to skip entirely."),
    domain: tool.schema
      .string()
      .optional()
      .describe("Business domain for domain knowledge analysis. If not provided, the coordinator will infer it."),
  },
  execute: async (args, context) => {
    const existing = loadState(context.directory)
    if (existing) {
      deleteState(context.directory)
    }

    const config = loadConfig(context.directory)

    if (args.skip_stages && args.skip_stages.length > 0) {
      config.skip_stages = args.skip_stages as PipelineStage[]
    }

    const startStage = args.start_stage as PipelineStage | undefined

    const state = createPipeline(
      { raw: args.requirement, type: args.type },
      config,
      context.directory,
      startStage,
      args.domain as string | undefined,
    )

    const stagesList = Object.entries(state.stages)
      .map(([name, status]) => `  ${name}: ${status}`)
      .join("\n")

    return {
      title: "Pipeline started",
      output: [
        `Pipeline ID: ${state.id}`,
        `Current stage: ${state.currentStage}`,
        `Input type: ${state.input.type}`,
        "",
        "Stage statuses:",
        stagesList,
        "",
        `State saved to .naruto/pipeline.json`,
      ].join("\n"),
      metadata: {
        pipelineId: state.id,
        currentStage: state.currentStage,
      },
    }
  },
})
