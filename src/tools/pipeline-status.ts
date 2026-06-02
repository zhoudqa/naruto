import { tool } from "@opencode-ai/plugin/tool"
import { loadState } from "../pipeline/state-store.js"
import { getStageDefinition } from "../pipeline/stages.js"

export const pipelineStatus = tool({
  description:
    "View the current Naruto pipeline status. Shows all stages, their statuses, and the current stage.",
  args: {},
  execute: async (_args, context) => {
    const state = loadState(context.directory)

    if (!state) {
      return {
        title: "No active pipeline",
        output:
          "No pipeline state found. Use pipeline_run to start a new pipeline.",
      }
    }

    const elapsed = Date.now() - state.createdAt
    const minutes = Math.floor(elapsed / 60000)
    const seconds = Math.floor((elapsed % 60000) / 1000)

    const stagesList = Object.entries(state.stages)
      .map(([name, status]) => {
        const marker = name === state.currentStage ? ">>>" : "   "
        const def = getStageDefinition(name as typeof state.currentStage)
        const agent = def.agent
        return `${marker} ${name.padEnd(14)} ${status.padEnd(18)} [${agent}]`
      })
      .join("\n")

    const artifacts = Object.entries(state.artifacts)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `  ${key}: ${value.length} files`
        }
        return `  ${key}: ${value}`
      })

    const artifactsSection =
      artifacts.length > 0
        ? ["\nArtifacts:", ...artifacts].join("\n")
        : ""

    const approvalGates =
      state.config.approvalGates.length > 0
        ? `\nApproval gates: ${state.config.approvalGates.join(", ")}`
        : ""

    return {
      title: `Pipeline: ${state.currentStage}`,
      output: [
        `Pipeline ID: ${state.id}`,
        `Current stage: ${state.currentStage} (${state.stages[state.currentStage]})`,
        `Input type: ${state.input.type}`,
        `Elapsed: ${minutes}m ${seconds}s`,
        approvalGates,
        "",
        "Stages:",
        stagesList,
        artifactsSection,
      ].join("\n"),
      metadata: {
        pipelineId: state.id,
        currentStage: state.currentStage,
        currentStatus: state.stages[state.currentStage],
      },
    }
  },
})
