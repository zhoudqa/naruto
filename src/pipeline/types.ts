export type PipelineStage =
  | "clarify"
  | "explore"
  | "prd"
  | "tech-design"
  | "code"
  | "test"
  | "review"

export type StageStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "skipped"

export interface PipelineInput {
  raw: string
  type: "natural_language" | "prd_markdown"
}

export interface PipelineArtifacts {
  context?: string
  prd?: string
  techDesign?: string
  sourceFiles?: string[]
  testFiles?: string[]
  reviewReport?: string
}

export interface PipelineConfig {
  startStage?: PipelineStage
  skipStages?: PipelineStage[]
  approvalGates: ("prd" | "tech-design")[]
}

export interface ApprovalGate {
  stage: "prd" | "tech-design"
  status: "pending" | "approved" | "rejected"
  feedback?: string
}

export interface PipelineState {
  id: string
  version: 1
  projectDir: string
  input: PipelineInput
  currentStage: PipelineStage
  stages: Record<PipelineStage, StageStatus>
  artifacts: PipelineArtifacts
  config: PipelineConfig
  rejectionFeedback?: string
  createdAt: number
  updatedAt: number
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  "clarify",
  "explore",
  "prd",
  "tech-design",
  "code",
  "test",
  "review",
] as const
