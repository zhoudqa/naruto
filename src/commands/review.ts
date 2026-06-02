import type { NarutoCommand } from "./types.js"

const REVIEW_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Run the code review stage.

## Pipeline Stage to Execute
- **Review** - Review all code changes against PRD and technical design

## Prerequisites
- A PRD must already exist at .naruto/artifacts/prd.md
- A technical design must already exist at .naruto/artifacts/tech-design.md
- Source code must already be implemented (check pipeline state for source files)
- If any prerequisite is missing, inform the user and suggest running the missing stage first:
  - Missing PRD: suggest /prd
  - Missing tech-design: suggest /tech-design
  - Missing source files: suggest /code

## Instructions
- Read the existing PRD from .naruto/artifacts/prd.md
- Read the existing tech design from .naruto/artifacts/tech-design.md
- Read pipeline state to identify all changed source and test files
- Use the pipeline_run tool with startStage set to "review" and skipStages including "clarify", "explore", "prd", "tech-design", "code", "test"
- This runs only the review stage
- Spawn the reviewer subagent with full context (PRD, tech design, file list)
- Present the review report to the user
- After review, trigger AGENTS.md export if configured
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

export function expandReviewTemplate(args: string): string {
  return REVIEW_TEMPLATE.replace(
    /\$ARGUMENTS/g,
    args || "Review all changes",
  )
}

export const reviewCommand: NarutoCommand = {
  name: "review",
  description: "Code review only (reads all changes)",
  template: REVIEW_TEMPLATE,
  argumentHint: "[additional context]",
  expand: expandReviewTemplate,
}
