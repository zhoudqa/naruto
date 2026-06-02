import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename } from "node:path"
import type { PipelineState, NarutoConfig } from "./types"
import {
  getArtifactPath,
  getAgentsMdPath,
} from "./artifact-resolver"
import { log } from "./logger"

function readArtifact(
  projectDir: string,
  filename: string,
): string | null {
  const path = getArtifactPath(projectDir, undefined, filename)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, "utf-8")
  } catch {
    return null
  }
}

function buildOverviewSection(
  state: PipelineState,
  prd: string | null,
): string {
  const projectName = basename(state.projectDir)
  const lines: string[] = []
  lines.push(`Project: ${projectName}`)
  lines.push(`Requirement: ${state.input.raw}`)

  if (prd) {
    const summaryLines = prd.split("\n").filter(
      (l) => l.startsWith("# ") || l.startsWith("## "),
    )
    if (summaryLines.length > 0) {
      lines.push("")
      lines.push("PRD Sections:")
      for (const line of summaryLines) {
        lines.push(line)
      }
    }
  }

  return lines.join("\n")
}

function buildArchitectureSection(
  techDesign: string | null,
): string {
  if (!techDesign) return "[Not yet generated]"
  const archStart = techDesign.indexOf("## Architecture")
  if (archStart === -1) {
    const overviewStart = techDesign.indexOf("## Overview")
    if (overviewStart === -1) return "[Not yet generated]"
    const nextSection = techDesign.indexOf("\n## ", overviewStart + 1)
    return nextSection === -1
      ? techDesign.slice(overviewStart)
      : techDesign.slice(overviewStart, nextSection)
  }
  const nextSection = techDesign.indexOf("\n## ", archStart + 1)
  return nextSection === -1
    ? techDesign.slice(archStart)
    : techDesign.slice(archStart, nextSection)
}

function buildImplementationStatusSection(
  state: PipelineState,
): string {
  const lines: string[] = []
  const stageOrder: Array<{
    key: keyof typeof state.stages
    label: string
  }> = [
    { key: "clarify", label: "Clarification" },
    { key: "explore", label: "Exploration" },
    { key: "domain-analysis", label: "Domain Analysis" },
    { key: "prd", label: "PRD" },
    { key: "tech-design", label: "Technical Design" },
    { key: "code", label: "Coding" },
    { key: "test", label: "Testing" },
    { key: "review", label: "Review" },
  ]

  for (const { key, label } of stageOrder) {
    const status = state.stages[key]
    const marker =
      status === "completed"
        ? "[x]"
        : status === "skipped"
          ? "[-]"
          : "[ ]"
    lines.push(`- ${marker} ${label}: ${status}`)
  }

  if (state.artifacts.sourceFiles && state.artifacts.sourceFiles.length > 0) {
    lines.push("")
    lines.push("Source files created/modified:")
    for (const f of state.artifacts.sourceFiles) {
      lines.push(`  - ${f}`)
    }
  }

  if (state.artifacts.testFiles && state.artifacts.testFiles.length > 0) {
    lines.push("")
    lines.push("Test files created:")
    for (const f of state.artifacts.testFiles) {
      lines.push(`  - ${f}`)
    }
  }

  return lines.join("\n")
}

function buildKeyFilesSection(
  state: PipelineState,
): string {
  const lines: string[] = []
  const artifacts: Array<{ label: string; value: string | undefined }> = [
    { label: "Codebase Context", value: state.artifacts.context },
    { label: "PRD", value: state.artifacts.prd },
    { label: "Technical Design", value: state.artifacts.techDesign },
    { label: "Review Report", value: state.artifacts.reviewReport },
  ]

  for (const { label, value } of artifacts) {
    if (value) {
      lines.push(`- ${label}: ${value}`)
    }
  }

  return lines.length > 0 ? lines.join("\n") : "[No artifacts generated yet]"
}

function buildConventionsSection(
  techDesign: string | null,
): string {
  if (!techDesign) return "[Not yet generated]"
  const convStart = techDesign.indexOf("## Conventions")
  if (convStart === -1) {
    const patternsStart = techDesign.indexOf("## Patterns")
    if (patternsStart === -1) return "[Not yet generated]"
    const nextSection = techDesign.indexOf("\n## ", patternsStart + 1)
    return nextSection === -1
      ? techDesign.slice(patternsStart)
      : techDesign.slice(patternsStart, nextSection)
  }
  const nextSection = techDesign.indexOf("\n## ", convStart + 1)
  return nextSection === -1
    ? techDesign.slice(convStart)
    : techDesign.slice(convStart, nextSection)
}

function buildRecentChangesSection(
  review: string | null,
): string {
  if (!review) return "[Not yet generated]"
  const summaryStart = review.indexOf("## Summary")
  if (summaryStart === -1) return review
  const nextSection = review.indexOf("\n## ", summaryStart + 1)
  return nextSection === -1
    ? review.slice(summaryStart)
    : review.slice(summaryStart, nextSection)
}

export function exportAgentsMd(
  projectDir: string,
  state: PipelineState,
  config: NarutoConfig,
): void {
  const prd = readArtifact(projectDir, "prd.md")
  const techDesign = readArtifact(projectDir, "tech-design.md")
  const review = readArtifact(projectDir, "review.md")

  const projectName = basename(projectDir)

  const sections: string[] = []
  sections.push(`# ${projectName} - AI Agent Context`)
  sections.push("")
  sections.push("## OVERVIEW")
  sections.push("")
  sections.push(buildOverviewSection(state, prd))
  sections.push("")
  sections.push("## ARCHITECTURE")
  sections.push("")
  sections.push(buildArchitectureSection(techDesign))
  sections.push("")
  sections.push("## IMPLEMENTATION STATUS")
  sections.push("")
  sections.push(buildImplementationStatusSection(state))
  sections.push("")
  sections.push("## KEY FILES")
  sections.push("")
  sections.push(buildKeyFilesSection(state))
  sections.push("")
  sections.push("## CONVENTIONS")
  sections.push("")
  sections.push(buildConventionsSection(techDesign))
  sections.push("")
  sections.push("## RECENT CHANGES")
  sections.push("")
  sections.push(buildRecentChangesSection(review))
  sections.push("")

  const content = sections.join("\n")
  const outputPath = getAgentsMdPath(projectDir, config.agents_md_path)

  writeFileSync(outputPath, content, "utf-8")
  log("AGENTS.md exported", { path: outputPath })
}
