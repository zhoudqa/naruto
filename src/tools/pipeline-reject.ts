import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"
import { rejectCurrentStage } from "../pipeline/state-machine.js"
import { loadState, saveState } from "../pipeline/state-store.js"
import type { PipelineState } from "../pipeline/types.js"

export const pipelineReject: ToolDefinition = tool({
  description:
    "Reject the current pipeline stage with feedback. Resets the stage to pending so it can be re-run with the feedback incorporated.",
  args: {
    stage: tool.schema
      .enum(["prd", "tech-design"])
      .describe("The approval-gate stage to reject (prd or tech-design)"),
    feedback: tool.schema
      .string()
      .describe("Detailed feedback explaining why the stage output is rejected and what to change"),
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

    if (state.currentStage !== args.stage) {
      return {
        title: "Stage mismatch",
        output: `Current stage is "${state.currentStage}", cannot reject "${args.stage}". Reject only applies to the current stage.`,
      }
    }

    const currentStatus = state.stages[args.stage]
    if (currentStatus !== "waiting_approval") {
      return {
        title: "Cannot reject",
        output: `Stage "${args.stage}" has status "${currentStatus}". Can only reject stages in "waiting_approval" status.`,
      }
    }

    try {
      let updated: PipelineState
      updated = {
        ...state,
        stages: {
          ...state.stages,
          [args.stage]: "rejected",
        },
        updatedAt: Date.now(),
      }
      saveState(context.directory, updated)

      updated = rejectCurrentStage(updated, args.feedback)

      return {
        title: `Rejected stage: ${args.stage}`,
        output: [
          `Stage "${args.stage}" has been rejected.`,
          `Feedback: ${args.feedback}`,
          `Stage has been reset to "pending" for re-execution.`,
          `Current stage: ${updated.currentStage}`,
        ].join("\n"),
        metadata: {
          rejectedStage: args.stage,
          feedback: args.feedback,
          currentStage: updated.currentStage,
        },
      }
    } catch (err) {
      return {
        title: "Reject failed",
        output: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },
})
