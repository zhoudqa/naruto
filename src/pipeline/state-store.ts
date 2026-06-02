import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import type { PipelineState } from "./types.js"

function stateFilePath(projectDir: string): string {
  return join(projectDir, ".naruto", "pipeline.json")
}

export function loadState(projectDir: string): PipelineState | null {
  const filePath = stateFilePath(projectDir)
  if (!existsSync(filePath)) return null
  const raw = readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as PipelineState
}

export function saveState(projectDir: string, state: PipelineState): void {
  const dir = join(projectDir, ".naruto")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const filePath = stateFilePath(projectDir)
  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8")
}

export function deleteState(projectDir: string): void {
  const filePath = stateFilePath(projectDir)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
}
