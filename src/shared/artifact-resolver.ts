import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const DEFAULT_ARTIFACT_DIR = ".naruto"

export function getArtifactDir(
  projectDir: string,
  artifactDir?: string,
): string {
  const base = artifactDir ?? DEFAULT_ARTIFACT_DIR
  return join(projectDir, base, "artifacts")
}

export function getArtifactPath(
  projectDir: string,
  artifactDir: string | undefined,
  filename: string,
): string {
  return join(getArtifactDir(projectDir, artifactDir), filename)
}

export function getPipelineStatePath(
  projectDir: string,
  artifactDir?: string,
): string {
  const base = artifactDir ?? DEFAULT_ARTIFACT_DIR
  return join(projectDir, base, "pipeline.json")
}

export function getAgentsMdPath(
  projectDir: string,
  agentsMdPath?: string,
): string {
  const relative = agentsMdPath ?? join(DEFAULT_ARTIFACT_DIR, "AGENTS.md")
  return join(projectDir, relative)
}

export function ensureArtifactDir(
  projectDir: string,
  artifactDir?: string,
): void {
  const dir = getArtifactDir(projectDir, artifactDir)
  mkdirSync(dir, { recursive: true })
}

export function artifactExists(
  projectDir: string,
  artifactDir: string | undefined,
  filename: string,
): boolean {
  return existsSync(getArtifactPath(projectDir, artifactDir, filename))
}
