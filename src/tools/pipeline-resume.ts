import { tool } from "@opencode-ai/plugin/tool"
import { loadState } from "../pipeline/state-store.js"

export const pipelineResume = tool({
  description:
    "Resume a Naruto pipeline from its persisted state. Picks up from the current stage based on its status.",
  args: {},
  execute: async (_args, context) => {
    const state = loadState(context.directory)

    if (!state) {
      return {
        title: "No pipeline to resume",
        output:
          "No pipeline state found in .naruto/pipeline.json. Use pipeline_run to start a new pipeline.",
      }
    }

    const currentStatus = state.stages[state.currentStage]

    let resumeInstruction: string
    switch (currentStatus) {
      case "pending":
        resumeInstruction = `Stage "${state.currentStage}" is pending. Start it by dispatching the appropriate subagent.`
        break
      case "running":
        resumeInstruction = `Stage "${state.currentStage}" was running when interrupted. Re-dispatch the subagent to continue.`
        break
      case "waiting_approval":
        resumeInstruction = `Stage "${state.currentStage}" is awaiting approval. Present the artifact to the user for review.`
        break
      case "approved":
        resumeInstruction = `Stage "${state.currentStage}" was approved. Advance to the next stage.`
        break
      case "rejected":
        resumeInstruction = `Stage "${state.currentStage}" was rejected. Re-run with feedback from the user.`
        break
      case "completed":
        resumeInstruction = `Stage "${state.currentStage}" is completed. Advance to the next stage.`
        break
      case "skipped":
        resumeInstruction = `Stage "${state.currentStage}" was skipped. Check if there is a next stage to run.`
        break
    }

    const stagesSummary = Object.entries(state.stages)
      .map(([name, status]) => `  ${name}: ${status}`)
      .join("\n")

    return {
      title: `Resuming pipeline at ${state.currentStage}`,
      output: [
        `Pipeline ID: ${state.id}`,
        `Resuming at stage: ${state.currentStage} (status: ${currentStatus})`,
        "",
        resumeInstruction,
        "",
        "All stages:",
        stagesSummary,
      ].join("\n"),
      metadata: {
        pipelineId: state.id,
        currentStage: state.currentStage,
        currentStatus,
      },
    }
  },
})
