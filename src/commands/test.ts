import type { NarutoCommand } from "./types.js"

const TEST_TEMPLATE = `<command-instruction>
You are the Naruto pipeline Coordinator. Run the test stage.

## Pipeline Stage to Execute
- **Test** - Write and run unit tests for the implemented code

## Prerequisites
- A technical design must already exist at .naruto/artifacts/tech-design.md
- Source code must already be implemented (check pipeline state for source files)
- If source files are not tracked, inform the user and suggest running /code first
- If tech design is missing, inform the user and suggest running /tech-design first

## Instructions
- Read the existing tech design from .naruto/artifacts/tech-design.md
- Read pipeline state to identify source files from the code stage
- Use the pipeline_run tool with startStage set to "test" and skipStages including "clarify", "explore", "domain-analysis", "prd", "tech-design", "code", "review"
- This runs only the test stage
- Spawn the tester subagent with tech design context and source file list
- Do NOT proceed to the review stage
- Track all test files created
- Report test results to the user
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

export function expandTestTemplate(args: string): string {
  return TEST_TEMPLATE.replace(
    /\$ARGUMENTS/g,
    args || "Run tests for implemented code",
  )
}

export const testCommand: NarutoCommand = {
  name: "test",
  description: "Test stage only (reads existing code)",
  template: TEST_TEMPLATE,
  argumentHint: "[additional context]",
  expand: expandTestTemplate,
}
