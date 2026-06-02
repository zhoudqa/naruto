import type { NarutoCommand } from "./types.js"

const TECH_DESIGN_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Run a focused technical design pipeline.

## Pipeline Stages to Execute
1. **Explore** - Explore the codebase for relevant context
2. **Tech Design** - Create a technical design document based on the existing PRD

## Prerequisites
- A PRD must already exist at .naruto/artifacts/prd.md
- If no PRD exists, inform the user and suggest running /prd first

## Instructions
- Read the existing PRD from .naruto/artifacts/prd.md
- Use the pipeline_run tool with startStage set to "explore" and skipStages including "clarify", "prd", "code", "test", "review"
- This runs only the explore and tech-design stages
- Show the tech design artifact to the user for review upon completion
- Do NOT proceed to coding or testing stages
- If the tech design is unsatisfactory, re-run the tech-design stage with user feedback
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

export function expandTechDesignTemplate(args: string): string {
  return TECH_DESIGN_TEMPLATE.replace(
    /\$ARGUMENTS/g,
    args || "Generate technical design from existing PRD",
  )
}

export const techDesignCommand: NarutoCommand = {
  name: "tech-design",
  description: "Generate tech design only (explore + tech-design stages, reads existing PRD)",
  template: TECH_DESIGN_TEMPLATE,
  argumentHint: "[additional context]",
  expand: expandTechDesignTemplate,
}
