import type { NarutoCommand } from "./types.js"

const PRD_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Run a focused PRD generation pipeline.

## Pipeline Stages to Execute
1. **Explore** - Explore the codebase for relevant context
2. **PRD** - Write a Product Requirements Document

## Instructions
- Use the pipeline_run tool with startStage set to "explore" and skipStages including "clarify", "tech-design", "code", "test", "review"
- This runs only the explore and prd stages
- Show the PRD artifact to the user for review upon completion
- Do NOT proceed to tech design or coding stages
- If the PRD is unsatisfactory, re-run the prd stage with user feedback
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

export function expandPrdTemplate(args: string): string {
  return PRD_TEMPLATE.replace(
    /\$ARGUMENTS/g,
    args || "No requirement specified",
  )
}

export const prdCommand: NarutoCommand = {
  name: "prd",
  description: "Generate PRD only (explore + prd stages)",
  template: PRD_TEMPLATE,
  argumentHint: "<requirement>",
  expand: expandPrdTemplate,
}
