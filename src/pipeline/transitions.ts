import {
  PIPELINE_STAGES,
  type PipelineState,
  type PipelineStage,
  type StageStatus,
} from "./types.js"
import { hasApprovalGate } from "./stages.js"

function getStageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.indexOf(stage)
}

function getNextStage(
  currentStage: PipelineStage,
  skipStages: PipelineStage[],
): PipelineStage | null {
  const currentIndex = getStageIndex(currentStage)
  for (let i = currentIndex + 1; i < PIPELINE_STAGES.length; i++) {
    if (!skipStages.includes(PIPELINE_STAGES[i])) {
      return PIPELINE_STAGES[i]
    }
  }
  return null
}

export function canAdvance(state: PipelineState): boolean {
  const currentStatus = state.stages[state.currentStage]
  if (currentStatus === "completed" || currentStatus === "skipped") {
    return getNextStage(state.currentStage, state.config.skipStages ?? []) !== null
  }
  if (currentStatus === "approved") {
    return true
  }
  return false
}

export function advanceStage(state: PipelineState): PipelineState {
  const skipStages = state.config.skipStages ?? []
  const nextStage = getNextStage(state.currentStage, skipStages)

  if (nextStage === null) {
    throw new Error(`No next stage after "${state.currentStage}"`)
  }

  const updatedStages: Record<PipelineStage, StageStatus> = {
    ...state.stages,
    [nextStage]: "running",
  }

  return {
    ...state,
    currentStage: nextStage,
    stages: updatedStages,
    updatedAt: Date.now(),
  }
}

export function rejectStage(
  state: PipelineState,
  feedback: string,
): PipelineState {
  const stage = state.currentStage
  if (!hasApprovalGate(stage)) {
    throw new Error(`Stage "${stage}" does not have an approval gate`)
  }

  const currentStatus = state.stages[stage]
  if (currentStatus !== "waiting_approval") {
    throw new Error(
      `Cannot reject stage "${stage}" with status "${currentStatus}"`,
    )
  }

  return {
    ...state,
    stages: {
      ...state.stages,
      [stage]: "rejected",
    },
    rejectionFeedback: feedback,
    updatedAt: Date.now(),
  }
}

export function skipStage(
  state: PipelineState,
  stage: PipelineStage,
): PipelineState {
  const currentIndex = getStageIndex(stage)
  const currentStageIndex = getStageIndex(state.currentStage)
  if (currentIndex < currentStageIndex) {
    throw new Error(`Cannot skip already passed stage "${stage}"`)
  }

  const updatedStages: Record<PipelineStage, StageStatus> = {
    ...state.stages,
    [stage]: "skipped",
  }

  let newCurrentStage = state.currentStage
  if (stage === state.currentStage) {
    const skipStages = [...(state.config.skipStages ?? []), stage]
    const next = getNextStage(stage, skipStages)
    if (next !== null) {
      newCurrentStage = next
      updatedStages[next] = "running"
    }
  }

  return {
    ...state,
    currentStage: newCurrentStage,
    stages: updatedStages,
    updatedAt: Date.now(),
  }
}
