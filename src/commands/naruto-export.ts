import type { NarutoCommand } from "./types.js"

const NARUTO_EXPORT_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Manually trigger an AGENTS.md export.

## Task
Export the current project context to AGENTS.md for other AI agents.

## Instructions
- Read the current pipeline state from .naruto/pipeline.json
- If no pipeline state exists, inform the user that no pipeline has been run yet
- If pipeline state exists, read all available artifacts:
  - .naruto/artifacts/context.md
  - .naruto/artifacts/prd.md
  - .naruto/artifacts/tech-design.md
  - .naruto/artifacts/review.md
  - .naruto/domain-knowledge/ (if exists)
- Generate the AGENTS.md file with sections: OVERVIEW, ARCHITECTURE, IMPLEMENTATION STATUS, KEY FILES, CONVENTIONS, RECENT CHANGES
- Write the AGENTS.md to the configured path (default: .naruto/AGENTS.md)
- Report the export location to the user
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

export function expandNarutoExportTemplate(args: string): string {
  return NARUTO_EXPORT_TEMPLATE.replace(
    /\$ARGUMENTS/g,
    args || "Export AGENTS.md",
  )
}

export const narutoExportCommand: NarutoCommand = {
  name: "naruto-export",
  description: "Manually trigger AGENTS.md export",
  template: NARUTO_EXPORT_TEMPLATE,
  argumentHint: "[output path override]",
  expand: expandNarutoExportTemplate,
}
