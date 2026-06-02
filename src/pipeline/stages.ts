import type { PipelineStage } from "./types.js"

export interface StageDefinition {
  name: PipelineStage
  agent: string
  mode: "primary" | "subagent"
  hasApprovalGate: boolean
  dependencies: PipelineStage[]
  outputPath: string
  instructionsTemplate: string
}

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    name: "clarify",
    agent: "coordinator",
    mode: "primary",
    hasApprovalGate: false,
    dependencies: [],
    outputPath: "",
    instructionsTemplate:
      "Clarify the user's requirement. Ask follow-up questions to fill any gaps. Summarize the structured requirement.",
  },
  {
    name: "explore",
    agent: "explorer",
    mode: "subagent",
    hasApprovalGate: false,
    dependencies: ["clarify"],
    outputPath: ".naruto/artifacts/context.md",
    instructionsTemplate:
      "Explore the codebase to understand the existing architecture relevant to the requirement. Identify key files, patterns, and conventions.",
  },
  {
    name: "domain-analysis",
    agent: "domain-analyst",
    mode: "subagent",
    hasApprovalGate: false,
    dependencies: ["explore"],
    outputPath: ".naruto/domain-knowledge/<domain>.md",
    instructionsTemplate:
      "Analyze cross-system domain knowledge from the codebase context. Identify cross-system call chains, state machines, data models, and API contracts. Produce or incrementally update the domain knowledge file.",
  },
  {
    name: "prd",
    agent: "prd-writer",
    mode: "subagent",
    hasApprovalGate: true,
    dependencies: ["explore"],
    outputPath: ".naruto/artifacts/prd.md",
    instructionsTemplate:
      "Write a structured PRD based on the requirement and codebase context. Include goals, scope, user stories, acceptance criteria.",
  },
  {
    name: "tech-design",
    agent: "tech-designer",
    mode: "subagent",
    hasApprovalGate: true,
    dependencies: ["prd", "explore"],
    outputPath: ".naruto/artifacts/tech-design.md",
    instructionsTemplate:
      "Create a technical design document. Include architecture, API design, data models, and file-by-file implementation plan.",
  },
  {
    name: "code",
    agent: "coder",
    mode: "subagent",
    hasApprovalGate: false,
    dependencies: ["tech-design", "explore", "prd"],
    outputPath: "",
    instructionsTemplate:
      "Implement the feature according to the technical design. Write production-quality code following project conventions.",
  },
  {
    name: "test",
    agent: "tester",
    mode: "subagent",
    hasApprovalGate: false,
    dependencies: ["tech-design"],
    outputPath: "",
    instructionsTemplate:
      "Write and run unit tests for the implemented code. Cover edge cases and ensure all acceptance criteria are met.",
  },
  {
    name: "review",
    agent: "reviewer",
    mode: "subagent",
    hasApprovalGate: false,
    dependencies: ["prd", "tech-design"],
    outputPath: ".naruto/artifacts/review.md",
    instructionsTemplate:
      "Review all code changes against the PRD and technical design. Check for quality, correctness, and adherence to conventions.",
  },
]

const stageMap = new Map(STAGE_DEFINITIONS.map((s) => [s.name, s]))

export function getStageDefinition(stage: PipelineStage): StageDefinition {
  const def = stageMap.get(stage)
  if (!def) throw new Error(`Unknown pipeline stage: ${stage}`)
  return def
}

export function getAllStageDefinitions(): StageDefinition[] {
  return STAGE_DEFINITIONS
}

export function hasApprovalGate(stage: PipelineStage): boolean {
  return getStageDefinition(stage).hasApprovalGate
}
