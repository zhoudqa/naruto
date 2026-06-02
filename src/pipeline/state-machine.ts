import { randomUUID } from "node:crypto"
import { PIPELINE_STAGES, type PipelineState, type PipelineStage } from "./types.js"
import { hasApprovalGate } from "./stages.js"
import { canAdvance, advanceStage, rejectStage } from "./transitions.js"
import { loadState, saveState } from "./state-store.js"
import type { NarutoConfig } from "../config/schema.js"

function initialStages(
  startStage?: PipelineStage,
  skipStages?: PipelineStage[],
): Record<PipelineStage, PipelineState["stages"][PipelineStage]> {
  const stages: Record<PipelineStage, PipelineState["stages"][PipelineStage]> =
    {} as Record<PipelineStage, PipelineState["stages"][PipelineStage]>
  const skip = skipStages ?? []
  const startIndex = startStage ? PIPELINE_STAGES.indexOf(startStage) : 0

  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    const stage = PIPELINE_STAGES[i]
    if (skip.includes(stage)) {
      stages[stage] = "skipped"
    } else if (i < startIndex) {
      stages[stage] = "completed"
    } else if (i === startIndex) {
      stages[stage] = "running"
    } else {
      stages[stage] = "pending"
    }
  }

  return stages
}

export function createPipeline(
  input: { raw: string; type: "natural_language" | "prd_markdown" },
  config: NarutoConfig,
  projectDir: string,
  startStage?: PipelineStage,
  domain?: string,
): PipelineState {
  const effectiveStart = startStage ?? "clarify"
  const stages = initialStages(effectiveStart, config.skip_stages)
  const now = Date.now()

  const state: PipelineState = {
    id: randomUUID(),
    version: 1,
    projectDir,
    input,
    currentStage: effectiveStart,
    stages,
    domain,
    artifacts: {},
    config: {
      startStage: effectiveStart,
      skipStages: config.skip_stages,
      approvalGates: config.approval_gates,
    },
    createdAt: now,
    updatedAt: now,
  }

  saveState(projectDir, state)
  return state
}

export function advanceToNext(state: PipelineState): PipelineState {
  const currentStatus = state.stages[state.currentStage]

  let updated = state
  if (
    currentStatus === "completed" &&
    hasApprovalGate(state.currentStage) &&
    state.config.approvalGates.includes(
      state.currentStage as "prd" | "tech-design",
    )
  ) {
    updated = {
      ...state,
      stages: {
        ...state.stages,
        [state.currentStage]: "waiting_approval",
      },
      updatedAt: Date.now(),
    }
    saveState(state.projectDir, updated)
    return updated
  }

  if (!canAdvance(updated)) {
    throw new Error(
      `Cannot advance from stage "${state.currentStage}" with status "${currentStatus}"`,
    )
  }

  const next = advanceStage(updated)
  saveState(next.projectDir, next)
  return next
}

export function waitForApproval(state: PipelineState): PipelineState {
  const stage = state.currentStage
  if (!hasApprovalGate(stage)) {
    throw new Error(`Stage "${stage}" does not have an approval gate`)
  }

  const updated: PipelineState = {
    ...state,
    stages: {
      ...state.stages,
      [stage]: "waiting_approval",
    },
    updatedAt: Date.now(),
  }

  saveState(state.projectDir, updated)
  return updated
}

export function approveStage(state: PipelineState): PipelineState {
  const stage = state.currentStage
  const currentStatus = state.stages[stage]
  if (currentStatus !== "waiting_approval") {
    throw new Error(
      `Cannot approve stage "${stage}" with status "${currentStatus}"`,
    )
  }

  const approved: PipelineState = {
    ...state,
    stages: {
      ...state.stages,
      [stage]: "approved",
    },
    updatedAt: Date.now(),
  }

  saveState(state.projectDir, approved)

  if (canAdvance(approved)) {
    return advanceStage(approved)
  }

  return approved
}

export function rejectCurrentStage(
  state: PipelineState,
  feedback: string,
): PipelineState {
  const rejected = rejectStage(state, feedback)
  const retried: PipelineState = {
    ...rejected,
    stages: {
      ...rejected.stages,
      [state.currentStage]: "pending",
    },
    updatedAt: Date.now(),
  }

  saveState(state.projectDir, retried)
  return retried
}

export function resumePipeline(
  projectDir: string,
): PipelineState | null {
  return loadState(projectDir)
}
