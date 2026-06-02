import type { PipelineStage } from "../pipeline/types.js"
import type { NarutoCommand } from "./types.js"

const DEVELOP_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Execute the full requirements development pipeline.

## Pipeline Stages
1. **Clarify** - Clarify the requirement through focused questions
2. **Explore** - Explore the codebase for relevant context
3. **Domain Analysis** - Analyze cross-system domain knowledge
4. **PRD** - Write a Product Requirements Document
5. **Tech Design** - Create a technical design document
6. **Code** - Implement the feature
7. **Test** - Write and run unit tests
8. **Review** - Review all changes

## Mode: $MODE

$MODE_INSTRUCTION

## Instructions
- Use the pipeline_run tool to start the pipeline with the requirement below
- Manage approval gates at PRD and Tech Design stages
- Show artifacts to the user for approval before proceeding
- On rejection, re-run the stage with user feedback
- Persist state via pipeline tools for breakpoint resume capability
- After completion, trigger AGENTS.md export
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

function buildModeInstruction(mode: string): string {
  switch (mode) {
    case "resume":
      return "Resume the pipeline from the last persisted breakpoint. Use pipeline_resume to restore state and continue from the current stage."
    case "from":
      return "Start the pipeline from a specific stage. Use pipeline_run with the specified start stage."
    default:
      return "Start the full pipeline from the beginning (clarify stage)."
  }
}

interface ParsedDevelopArgs {
  mode: "full" | "resume" | "from"
  requirement: string
  startStage?: PipelineStage
}

function parseDevelopArgs(args: string): ParsedDevelopArgs {
  const tokens = args.trim().split(/\s+/)
  if (tokens[0] === "--resume") {
    return {
      mode: "resume",
      requirement: tokens.slice(1).join(" "),
    }
  }
  if (tokens[0] === "--from" && tokens.length >= 2) {
    return {
      mode: "from",
      requirement: tokens.slice(2).join(" "),
      startStage: tokens[1] as PipelineStage,
    }
  }
  return {
    mode: "full",
    requirement: args,
  }
}

export function expandDevelopTemplate(args: string): string {
  const parsed = parseDevelopArgs(args)
  const modeInstruction = buildModeInstruction(parsed.mode)
  return DEVELOP_TEMPLATE
    .replace(/\$MODE/g, parsed.mode)
    .replace(/\$MODE_INSTRUCTION/g, modeInstruction)
    .replace(/\$ARGUMENTS/g, parsed.requirement || "No requirement specified")
}

export const developCommand: NarutoCommand = {
  name: "develop",
  description: "Full requirements development pipeline: clarify -> explore -> domain-analysis -> prd -> tech-design -> code -> test -> review",
  template: DEVELOP_TEMPLATE,
  argumentHint: "<requirement> | --resume | --from <stage>",
  expand: expandDevelopTemplate,
}
