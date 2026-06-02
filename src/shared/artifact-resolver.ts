import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const DEFAULT_ARTIFACT_DIR = ".naruto"

const USER_KNOWLEDGE_DIR = join(homedir(), ".naruto", "domain-knowledge")

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

export function getDomainKnowledgeDir(): string {
  return USER_KNOWLEDGE_DIR
}

export function getDomainKnowledgePath(
  _projectDir: string,
  domain: string,
  _artifactDir?: string,
): string {
  return join(USER_KNOWLEDGE_DIR, `${domain}.md`)
}

export function ensureDomainKnowledgeDir(): void {
  mkdirSync(USER_KNOWLEDGE_DIR, { recursive: true })
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
