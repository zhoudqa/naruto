import type { AgentConfig } from "@opencode-ai/sdk"
import { COORDINATOR_PROMPT } from "./coordinator/prompt.js"

export { COORDINATOR_PROMPT }

export function createCoordinatorAgent(model: string): AgentConfig {
  return {
    description:
      "Naruto pipeline coordinator - orchestrates multi-agent requirements development from clarification through code review",
    mode: "primary",
    model,
    prompt: COORDINATOR_PROMPT,
    maxSteps: 200,
  }
}
createCoordinatorAgent.mode = "primary" as const
