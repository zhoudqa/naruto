import { readFileSync, existsSync } from "node:fs"
import type { PipelineStage, PipelineState } from "./types"
import {
  artifactExists,
  getArtifactPath,
  getDomainKnowledgePath,
} from "./artifact-resolver"

const STAGE_INSTRUCTIONS: Record<PipelineStage, string> = {
  clarify:
    "You are a requirements analyst. Clarify the user's requirement through focused questions. Produce a structured requirement summary.",
  explore:
    "You are a codebase explorer. Analyze the project structure, existing patterns, and relevant code. Produce a comprehensive context document (context.md) covering architecture, conventions, key modules, and patterns relevant to the requirement.",
  "domain-analysis":
    "You are a cross-system domain knowledge analyst. Analyze the codebase to extract cross-system call chains, state machines, data models, and API contracts for the specified domain. Produce or incrementally update the domain knowledge file.",
  prd:
    "You are a product manager. Write a structured Product Requirements Document (prd.md) based on the requirement and codebase context. Include: problem statement, goals, user stories, functional requirements, non-functional requirements, and acceptance criteria.",
  "tech-design":
    "You are a senior software architect. Write a technical design document (tech-design.md) based on the PRD and codebase context. Include: architecture overview, module design, API contracts, data models, file-by-file implementation plan, and testing strategy.",
  code:
    "You are an expert software engineer. Implement the technical design by writing production code. Follow the architecture, conventions, and implementation plan from the tech design. Write clean, well-structured code that adheres to project patterns.",
  test:
    "You are a test engineer. Write comprehensive unit tests for the implemented code. Cover happy paths, edge cases, and error conditions. Follow the project's test conventions and ensure tests are deterministic and isolated.",
  review:
    "You are a senior code reviewer. Review all code changes against the PRD and technical design. Check for: correctness, completeness, code quality, security concerns, performance, and adherence to the implementation plan. Produce a review report (review.md).",
}

interface ArtifactDependency {
  file: string
  label: string
}

const STAGE_DEPENDENCIES: Record<PipelineStage, ArtifactDependency[]> = {
  clarify: [],
  explore: [
    { file: "domain-knowledge", label: "Existing Domain Knowledge" },
  ],
  "domain-analysis": [
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Existing Domain Knowledge" },
  ],
  prd: [
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
  ],
  "tech-design": [
    { file: "prd.md", label: "Product Requirements Document" },
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
  ],
  code: [
    { file: "tech-design.md", label: "Technical Design" },
    { file: "context.md", label: "Codebase Context" },
    { file: "prd.md", label: "Product Requirements Document" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
  ],
  test: [
    { file: "tech-design.md", label: "Technical Design" },
  ],
  review: [
    { file: "tech-design.md", label: "Technical Design" },
    { file: "prd.md", label: "Product Requirements Document" },
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
    { file: "review.md", label: "Previous Review" },
  ],
}

const STAGE_OUTPUT: Record<PipelineStage, string> = {
  clarify: "A structured requirement summary as plain text.",
  explore: "Write your findings to .naruto/artifacts/context.md",
  "domain-analysis": "Write the domain knowledge file to .naruto/domain-knowledge/<domain>.md",
  prd: "Write the PRD to .naruto/artifacts/prd.md",
  "tech-design": "Write the technical design to .naruto/artifacts/tech-design.md",
  code: "Write source code files in the project directory following the technical design.",
  test: "Write test files alongside the source code they test. Run the tests and report results.",
  review: "Write the review report to .naruto/artifacts/review.md",
}

function readArtifactSafe(
  projectDir: string,
  artifactDir: string | undefined,
  filename: string,
): string | null {
  if (!artifactExists(projectDir, artifactDir, filename)) {
    return null
  }
  try {
    return readFileSync(
      getArtifactPath(projectDir, artifactDir, filename),
      "utf-8",
    )
  } catch {
    return null
  }
}

export function buildSubagentPrompt(
  stage: PipelineStage,
  state: PipelineState,
  projectDir: string,
): string {
  const sections: string[] = []

  sections.push(`## Task\n\n${STAGE_INSTRUCTIONS[stage]}`)

  if (stage === "domain-analysis" && state.domain) {
    sections.push(`## Domain\n\n${state.domain}`)
  }

  sections.push(
    `## Original Requirement\n\n${state.input.raw}`,
  )

  const deps = STAGE_DEPENDENCIES[stage]
  const upstreamParts: string[] = []
  for (const dep of deps) {
    let content: string | null = null
    if (dep.file === "domain-knowledge" && state.domain) {
      const path = getDomainKnowledgePath(projectDir, state.domain)
      try {
        if (existsSync(path)) {
          content = readFileSync(path, "utf-8")
        }
      } catch {
        content = null
      }
    } else {
      content = readArtifactSafe(projectDir, undefined, dep.file)
    }
    if (content) {
      upstreamParts.push(`### ${dep.label}\n\n${content}`)
    }
  }

  if (upstreamParts.length > 0) {
    sections.push(
      `## Upstream Artifacts\n\n${upstreamParts.join("\n\n")}`,
    )
  }

  if (stage === "test" && state.artifacts.sourceFiles && state.artifacts.sourceFiles.length > 0) {
    sections.push(
      `## Source Files to Test\n\n${state.artifacts.sourceFiles.map((f) => `- ${f}`).join("\n")}`,
    )
  }

  if (stage === "review") {
    const allFiles: string[] = []
    if (state.artifacts.sourceFiles) {
      allFiles.push(...state.artifacts.sourceFiles)
    }
    if (state.artifacts.testFiles) {
      allFiles.push(...state.artifacts.testFiles)
    }
    if (allFiles.length > 0) {
      sections.push(
        `## Files to Review\n\n${allFiles.map((f) => `- ${f}`).join("\n")}`,
      )
    }
  }

  sections.push(`## Expected Output\n\n${STAGE_OUTPUT[stage]}`)

  return sections.join("\n\n")
}

export { STAGE_INSTRUCTIONS }
