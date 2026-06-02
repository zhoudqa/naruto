import type { NarutoCommand } from "./types.js"

const CODE_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Run the code implementation stage.

## Pipeline Stage to Execute
- **Code** - Implement the feature according to the existing technical design

## Prerequisites
- A technical design must already exist at .naruto/artifacts/tech-design.md
- A PRD must already exist at .naruto/artifacts/prd.md
- If either is missing, inform the user and suggest running the missing stage first:
  - Missing tech-design: suggest /tech-design
  - Missing PRD: suggest /prd

## Instructions
- Read the existing tech design from .naruto/artifacts/tech-design.md
- Read the existing PRD from .naruto/artifacts/prd.md
- Read the existing codebase context from .naruto/artifacts/context.md
- Read any existing domain knowledge from .naruto/domain-knowledge/ if available
- Use the pipeline_run tool with startStage set to "code" and skipStages including "clarify", "explore", "domain-analysis", "prd", "tech-design", "test", "review"
- This runs only the code stage
- Spawn the coder subagent with the full context
- Do NOT proceed to testing or review stages
- Track all source files created or modified
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

export function expandCodeTemplate(args: string): string {
  return CODE_TEMPLATE.replace(
    /\$ARGUMENTS/g,
    args || "Implement code from existing tech design",
  )
}

export const codeCommand: NarutoCommand = {
  name: "code",
  description: "Code implementation only (reads existing tech design)",
  template: CODE_TEMPLATE,
  argumentHint: "[additional context]",
  expand: expandCodeTemplate,
}
