import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"
import { loadState, saveState } from "../pipeline/state-store.js"
import { skipStage } from "../pipeline/transitions.js"
import type { PipelineStage } from "../pipeline/types.js"

export const pipelineSkip: ToolDefinition = tool({
  description:
    "Skip a specified pipeline stage. Updates the pipeline state and advances if the skipped stage is the current one.",
  args: {
    stage: tool.schema
      .enum(["clarify", "explore", "domain-analysis", "prd", "tech-design", "code", "test", "review"])
      .describe("The pipeline stage to skip"),
  },
  execute: async (args, context) => {
    const state = loadState(context.directory)

    if (!state) {
      return {
        title: "No active pipeline",
        output:
          "No pipeline state found. Use pipeline_run to start a new pipeline.",
      }
    }

    try {
      const updated = skipStage(state, args.stage as PipelineStage)
      saveState(context.directory, updated)

      return {
        title: `Skipped stage: ${args.stage}`,
        output: [
          `Stage "${args.stage}" has been skipped.`,
          `Current stage: ${updated.currentStage}`,
          `Status: ${updated.stages[updated.currentStage]}`,
        ].join("\n"),
        metadata: {
          skippedStage: args.stage,
          currentStage: updated.currentStage,
        },
      }
    } catch (err) {
      return {
        title: "Cannot skip stage",
        output: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },
})
