# Naruto - Multi-Agent Requirements Development Pipeline

**Date:** 2026-06-01
**Status:** Draft
**Approach:** A - State Machine Pipeline

## Overview

Naruto is an independent OpenCode plugin that orchestrates a multi-agent pipeline for requirements development. It takes raw requirements (natural language or PRD markdown) through a complete pipeline: exploration, PRD, technical design, coding, unit testing, and code review.

The plugin runs as a peer to oh-my-openagent, reusing OpenCode's configured models and infrastructure.

## Requirements

### Input
- Natural language requirement description (a few sentences)
- Complete PRD markdown document
- Semi-structured input (user stories, feature lists)

### Scope
Full pipeline: Requirement clarification -> PRD -> Technical Design -> Coding -> Unit Testing -> Code Review

### User Interaction Model
- **Coordinator** (primary agent) handles ALL user interaction: clarification, approval gates
- **Worker agents** (subagents) only do execution work, no user interaction
- Approval gates at PRD and Technical Design stages (configurable)
- Coding and testing stages auto-proceed without human intervention

### Pipeline Flexibility
- Configurable start stage (e.g., start from tech-design if PRD already exists)
- Stage skipping (e.g., skip tests if not needed)
- Resume from breakpoint after session interruption

## Architecture

### Project Structure

```
naruto/
├── src/
│   ├── index.ts                    # Plugin entry: pluginModule export
│   ├── plugin-config.ts            # JSONC config loading & validation
│   ├── create-agents.ts            # Agent registration
│   ├── create-tools.ts             # Tool registration
│   ├── create-hooks.ts             # Hook registration
│   ├── agents/
│   │   ├── coordinator.ts          # Primary agent (user interaction + orchestration)
│   │   ├── explorer.ts             # Codebase explorer (subagent)
│   │   ├── prd-writer.ts           # PRD writer (subagent)
│   │   ├── tech-designer.ts        # Technical designer (subagent)
│   │   ├── coder.ts                # Business coder (subagent)
│   │   ├── tester.ts               # Unit tester (subagent)
│   │   ├── reviewer.ts             # Code reviewer (subagent)
│   │   ├── types.ts                # Agent type definitions
│   │   └── agent-builder.ts        # Agent factory
│   ├── pipeline/
│   │   ├── state-machine.ts        # Pipeline state machine core
│   │   ├── stages.ts               # Stage definitions & registry
│   │   ├── state-store.ts          # State persistence (.naruto/pipeline.json)
│   │   ├── types.ts                # Pipeline type definitions
│   │   └── transitions.ts          # Stage transition logic
│   ├── tools/
│   │   ├── pipeline-run.ts         # Start pipeline
│   │   ├── pipeline-status.ts      # View pipeline status
│   │   ├── pipeline-resume.ts      # Resume from breakpoint
│   │   └── pipeline-skip.ts        # Skip stage
│   ├── commands/
│   │   ├── develop.ts              # /develop - full pipeline
│   │   ├── prd.ts                  # /prd - standalone
│   │   ├── tech-design.ts          # /tech-design - standalone
│   │   ├── code.ts                 # /code - standalone
│   │   ├── test.ts                 # /test - standalone
│   │   ├── review.ts              # /review - standalone
│   │   └── naruto-export.ts        # /naruto-export - export AGENTS.md
│   ├── shared/
│   │   ├── artifact-resolver.ts    # Artifact path resolution
│   │   ├── context-builder.ts      # Build subagent prompts with context
│   │   ├── agents-md-exporter.ts   # AGENTS.md generation and export
│   │   └── logger.ts               # Logging
│   └── config/
│       └── schema.ts               # Zod config schema
├── package.json
├── tsconfig.json
└── bunfig.toml
```

### Design Principles

1. **Coordinator is the sole primary agent** - handles all user interaction
2. **All workers are subagents** - execution only, no user interaction
3. **Pipeline state is persisted** - `.naruto/pipeline.json` enables breakpoint resume
4. **Artifact-driven flow** - each stage outputs files, next stage reads them
5. **Configurable entry points** - `/develop` for full pipeline, `/prd` etc. for single stages

## Pipeline State Machine

### Stage Definitions

| Stage | Agent | Mode | Approval Gate | Input | Output |
|-------|-------|------|--------------|-------|--------|
| clarify | Coordinator | direct | No | Raw user input | Structured requirement summary |
| explore | Explorer | subagent | No | Requirement summary | `.naruto/artifacts/context.md` |
| prd | PRD Writer | subagent | Yes (default) | Requirement + context | `.naruto/artifacts/prd.md` |
| tech-design | Tech Designer | subagent | Yes (default) | PRD + context | `.naruto/artifacts/tech-design.md` |
| code | Coder | subagent | No | Tech design + context | Source files in user project |
| test | Tester | subagent | No | Tech design + source files | Test files + run results |
| review | Reviewer | subagent | No | All changes + tech design + PRD | `.naruto/artifacts/review.md` |

### State Model

```typescript
type PipelineStage =
  | "clarify"
  | "explore"
  | "prd"
  | "tech-design"
  | "code"
  | "test"
  | "review"

type StageStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "skipped"

interface PipelineState {
  id: string
  version: 1
  projectDir: string
  input: {
    raw: string
    type: "natural_language" | "prd_markdown"
  }
  currentStage: PipelineStage
  stages: Record<PipelineStage, StageStatus>
  artifacts: {
    context?: string        // .naruto/artifacts/context.md
    prd?: string            // .naruto/artifacts/prd.md
    techDesign?: string     // .naruto/artifacts/tech-design.md
    sourceFiles?: string[]
    testFiles?: string[]
    reviewReport?: string   // .naruto/artifacts/review.md
  }
  config: {
    startStage?: PipelineStage
    skipStages?: PipelineStage[]
    approvalGates: ("prd" | "tech-design")[]
  }
  createdAt: number
  updatedAt: number
}
```

### Transition Flow

```
User Input
    |
    v
clarify (Coordinator) ──── direct user interaction
    |
    v
explore (subagent) ──── fire 1-3 explore agents in parallel
    |
    v
prd (subagent)
    |
    v
[APPROVAL GATE] ──── Coordinator shows PRD to user
    | approve          \ reject (with feedback)
    v                    \──> re-run prd stage with feedback
tech-design (subagent)
    |
    v
[APPROVAL GATE] ──── Coordinator shows tech design to user
    | approve          \ reject
    v                    \──> re-run tech-design stage
code (subagent) ──── may parallelize independent modules
    |
    v
test (subagent)
    |
    v
review (subagent)
    |
    v
DONE
```

### Breakpoint Resume

State persists to `.naruto/pipeline.json` on every stage transition. If the session is interrupted:

1. User runs `/develop --resume`
2. Coordinator reads `.naruto/pipeline.json`
3. Finds `currentStage` and its status
4. Resumes from that point:
   - If `waiting_approval` -> re-prompt user for approval
   - If `running` -> check if subagent completed, collect results
   - If `pending` -> start that stage fresh

## Agent Definitions

### Coordinator (Primary Agent)

- **Mode:** `primary` (respects user's UI-selected model)
- **Role:** Sole user-facing agent, manages pipeline lifecycle
- **Tools:** All tools + custom pipeline tools
- **Responsibilities:**
  - Requirement clarification (multi-turn dialogue with user)
  - Approval gate management (display artifacts, collect approve/reject)
  - Stage dispatching (spawn subagents with context-rich prompts)
  - State management (update pipeline.json)
  - Error handling and retry decisions

### Explorer (Subagent)

- **Mode:** `subagent`
- **Cost:** CHEAP
- **Tools:** read, grep, glob, ast_grep_search, lsp_* (read-only)
- **Input:** Requirement summary
- **Output:** `.naruto/artifacts/context.md` - codebase context relevant to the requirement
- **Behavior:** Fired as 1-3 parallel explore agents to cover codebase from multiple angles

### PRD Writer (Subagent)

- **Mode:** `subagent`
- **Cost:** Default
- **Tools:** read, write, edit, grep, glob
- **Input:** Requirement summary + context.md
- **Output:** `.naruto/artifacts/prd.md` - structured PRD document
- **Permission:** write/edit allowed. The system prompt instructs PRD Writer to only write to `.naruto/artifacts/`. OpenCode's permission system is tool-level (allow/deny), not path-scoped. Path restriction is enforced via prompt instructions + Coordinator verification, not tool permissions.

### Tech Designer (Subagent)

- **Mode:** `subagent`
- **Cost:** EXPENSIVE (requires strong reasoning)
- **Tools:** read, write, edit, grep, glob, ast_grep, lsp_*
- **Input:** prd.md + context.md
- **Output:** `.naruto/artifacts/tech-design.md` - technical design with architecture, API design, data models, file-by-file implementation plan
- **Permission:** write/edit allowed. Same prompt-based path restriction as PRD Writer - instructed to only write to `.naruto/artifacts/`.

### Coder (Subagent)

- **Mode:** `subagent`
- **Cost:** Default
- **Tools:** Full toolset (read, write, edit, bash, lsp_*, ast_grep, etc.)
- **Input:** tech-design.md + context.md + prd.md
- **Output:** Source code files in user's project
- **Permission:** Full write access to user's project

### Tester (Subagent)

- **Mode:** `subagent`
- **Cost:** Default
- **Tools:** Full toolset + bash (for running tests)
- **Input:** tech-design.md + source files written by Coder
- **Output:** Test files in user's project + test run results

### Reviewer (Subagent)

- **Mode:** `subagent`
- **Cost:** EXPENSIVE
- **Tools:** read, grep, glob, ast_grep, lsp_* (read-only)
- **Input:** All changed files + tech-design.md + prd.md
- **Output:** `.naruto/artifacts/review.md` - code review report with findings

### Agent Factory Pattern

Each agent uses a factory function consistent with OpenCode plugin conventions:

```typescript
// Example: src/agents/explorer.ts
import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentFactory } from "./types"

export function createExplorerAgent(model: string): AgentConfig {
  return {
    description: "Contextual codebase explorer for requirements development",
    mode: "subagent",
    model,
    temperature: 0.2,
    prompt: EXPLORER_PROMPT,
    permission: {
      write: "deny",
      edit: "deny",
    },
  }
}
createExplorerAgent.mode = "subagent" as const
```

## Context Flow

### Artifact Storage

```
.naruto/
├── pipeline.json              # Pipeline state
├── artifacts/
│   ├── context.md             # Explorer output
│   ├── prd.md                 # PRD document
│   ├── tech-design.md         # Technical design document
│   └── review.md              # Code review report
├── AGENTS.md                  # Exported project context for other AI agents
└── config.json                # Project-level naruto config (optional)
```

### AGENTS.md Export

Naruto generates an `AGENTS.md` file (at `.naruto/AGENTS.md` by default, or project root if configured) that provides structured project context for any AI agent working in the codebase. This is similar to oh-my-openagent's `/init-deep` feature but focused on requirements-driven context.

**Purpose:** When a developer uses any AI coding tool (OpenCode, Claude Code, Cursor, etc.) in the project, the AGENTS.md file gives that tool immediate context about what was built, why, and how.

**Content structure:**

```markdown
# <Project Name> - AI Agent Context

## OVERVIEW
[Generated from PRD: summary of what the project does and current requirements]

## ARCHITECTURE
[Generated from tech-design: system architecture, key modules, data flow]

## IMPLEMENTATION STATUS
[Generated from pipeline state: what stages completed, what files were created/modified]

## KEY FILES
[Generated from artifacts: map of important source files and their purposes]

## CONVENTIONS
[Generated from tech-design: coding patterns, naming conventions, test patterns]

## RECENT CHANGES
[Generated from review: summary of latest code changes and their rationale]
```

**Export triggers:**
- Auto-export after each pipeline stage completes (incremental update)
- Manual export via `/naruto-export` command
- Configurable output path in plugin config (`agents_md_path`)

**Config:**
```jsonc
{
  "agents_md_path": ".naruto/AGENTS.md",  // default, set to "AGENTS.md" for project root
  "agents_md_auto_export": true            // auto-update after each stage
}
```

### Context Builder

The Coordinator's context-builder dynamically constructs each subagent's prompt:

1. **Stage instructions** - task-specific directives for the current stage
2. **Original requirement** - user's raw input
3. **Upstream artifacts** - outputs from preceding stages (read from files)
4. **Output requirements** - expected format and location of this stage's output

Dependency chain:
- `explore` <- requirement summary only
- `prd` <- requirement + context.md
- `tech-design` <- prd.md + context.md
- `code` <- tech-design.md + context.md + prd.md
- `test` <- tech-design.md + source files
- `review` <- all changed files + tech-design.md + prd.md

## Commands

| Command | Purpose | Pipeline Stages |
|---------|---------|----------------|
| `/develop <requirement>` | Full pipeline | clarify -> explore -> prd -> tech-design -> code -> test -> review |
| `/develop --resume` | Resume from breakpoint | From currentStage |
| `/develop --from <stage>` | Start from specific stage | stage -> ... -> review |
| `/prd <requirement>` | Generate PRD only | explore -> prd |
| `/tech-design` | Generate tech design | explore -> tech-design (reads existing PRD) |
| `/code` | Code only | code (reads existing tech design) |
| `/test` | Tests only | test (reads existing code) |
| `/review` | Review only | review (reads all changes) |

**Single-stage command fallback:** When a single-stage command is invoked but required upstream artifacts are missing (e.g., `/code` but no tech-design.md), the Coordinator informs the user and suggests running the missing upstream stage first. It does NOT auto-run upstream stages for single commands to keep behavior predictable.

## Custom Tools

Registered for Coordinator agent use:

| Tool | Purpose |
|------|---------|
| `pipeline_run` | Start pipeline with requirement input and config |
| `pipeline_status` | Read and display current pipeline state |
| `pipeline_resume` | Resume pipeline from persisted state |
| `pipeline_skip_stage` | Skip a specified stage |
| `pipeline_reject` | Reject current stage with feedback for re-execution |

## Error Handling

| Scenario | Handling |
|----------|----------|
| Subagent execution failure | Coordinator receives error, auto-retry once (same model). If still fails, report to user |
| Subagent output unsatisfactory | Coordinator verifies artifact exists and is non-empty (path-level validation only, not semantic quality). If invalid, uses task_id to continue dialogue with subagent for correction |
| User rejects approval gate | Coordinator re-triggers stage with user's feedback attached |
| Session interrupted | State persisted, `/develop --resume` restores |
| Model unavailable | Leverages OpenCode's built-in model-fallback mechanism. Each agent can define a `fallback_models` chain in config (e.g., `"fallback_models": ["claude-opus-4-7", "gpt-5.5"]`). When the primary model fails, OpenCode automatically tries the next in the chain |
| Test failures | Tester agent reports failures, Coordinator decides whether to re-trigger Coder or report to user |

## Configuration

### Plugin Config (`.opencode/naruto.jsonc`)

```jsonc
{
  // Approval gate configuration
  "approval_gates": ["prd", "tech-design"],  // default, set [] to disable all

  // Stage skip configuration
  "skip_stages": [],  // default: no stages skipped

  // Agent model overrides (optional)
  "agents": {
    "explorer": { "model": "kimi-k2.6" },
    "prd-writer": { "model": "glm-5.1" },
    "tech-designer": { "model": "claude-opus-4-7" },
    "coder": { "model": "glm-5.1" },
    "tester": { "model": "glm-5.1" },
    "reviewer": { "model": "claude-opus-4-7" }
  },

  // Artifact directory (default .naruto)
  "artifact_dir": ".naruto"
}
```

### Config Loading Order

```
Project (.opencode/naruto.jsonc) -> User (~/.config/opencode/naruto.jsonc) -> Defaults
```

Deep merge for agents/categories, override for scalar fields. Zod validation with safeParse.

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict mode, ESNext)
- **Plugin SDK:** `@opencode-ai/plugin` + `@opencode-ai/sdk`
- **Validation:** Zod v4
- **Test:** Bun test (`bun:test`), co-located `*.test.ts`
- **Module convention:** kebab-case files, barrel index.ts exports, 200 LOC soft limit

## Conventions

- Agent factory pattern: `createXXXAgent(model: string) => AgentConfig` with static `.mode`
- File naming: kebab-case for all files/directories
- No path aliases: relative imports only
- No catch-all files (`utils.ts`, `helpers.ts`)
- Given/when/then test style
- No `as any`, `@ts-ignore`, `@ts-expect-error`
