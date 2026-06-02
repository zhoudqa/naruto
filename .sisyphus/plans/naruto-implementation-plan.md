# Naruto Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-01-naruto-multi-agent-pipeline-design.md`
**Date:** 2026-06-01
**Status:** Ready for execution

## Execution Strategy

Decompose into independent work units. Each unit is self-contained and can be delegated to a subagent. Units within the same phase have no dependencies on each other and can run in parallel.

## Phase 0: Project Scaffold

### 0.1 Initialize project
- Init git repo
- Create `package.json` with `@opencode-ai/plugin`, `@opencode-ai/sdk`, `zod` dependencies
- Create `tsconfig.json` (strict, ESNext, bundler moduleResolution, `bun-types`)
- Create `bunfig.toml`
- Create `.gitignore`
- Create basic `src/index.ts` with empty pluginModule export

**Deliverable:** Runnable `bun run typecheck` with zero errors

---

## Phase 1: Core Infrastructure

### 1.1 Config system
- `src/config/schema.ts` — Zod v4 schema for plugin config (approval_gates, skip_stages, agents, artifact_dir)
- `src/plugin-config.ts` — JSONC config loading with project/user/defaults merge

### 1.2 Agent type system
- `src/agents/types.ts` — AgentMode, AgentFactory, AgentCategory, PipelineAgentName types
- `src/agents/agent-builder.ts` — buildAgent factory with category merging

### 1.3 Pipeline types
- `src/pipeline/types.ts` — PipelineStage, StageStatus, PipelineState, ApprovalGate types
- `src/pipeline/stages.ts` — Stage definitions registry with metadata (instructions, dependencies, output paths)
- `src/pipeline/state-store.ts` — File-based state persistence to `.naruto/pipeline.json`
- `src/pipeline/transitions.ts` — Stage transition logic (validate, advance, skip, reject)
- `src/pipeline/state-machine.ts` — State machine orchestrator (advanceStage, canAdvance, getStageConfig, onStageComplete triggers AGENTS.md export)

**Deliverable:** `bun run typecheck` passes, state machine unit tests pass

---

## Phase 2: Shared Utilities

### 2.1 Context builder
- `src/shared/artifact-resolver.ts` — Resolve artifact paths from pipeline state
- `src/shared/context-builder.ts` — Build subagent prompts with upstream artifacts + instructions
- `src/shared/agents-md-exporter.ts` — Generate AGENTS.md from pipeline artifacts (PRD, tech-design, review, pipeline state)
- `src/shared/logger.ts` — Logging to `/tmp/naruto.log`

**Deliverable:** Context builder constructs prompts for all 7 stages; agents-md-exporter generates valid AGENTS.md

---

## Phase 3: Agent Definitions

### 3.1 Coordinator agent
- `src/agents/coordinator.ts` — Primary agent with full pipeline orchestration prompt
  - Phase 0: Intent gate (classify input type)
  - Phase 1: Requirement clarification (multi-turn dialogue)
  - Phase 2: Pipeline dispatching (spawn subagents per stage)
  - Phase 3: Approval gates (display artifacts, collect response)
  - Phase 4: Error handling and retry
- `src/agents/coordinator/prompt.ts` — System prompt sections

### 3.2 Explorer agent
- `src/agents/explorer.ts` — Read-only codebase explorer subagent
- Permission: write deny, edit deny
- Prompt: explore codebase for requirement context

### 3.3 PRD Writer agent
- `src/agents/prd-writer.ts` — PRD generation subagent
- Prompt: generate structured PRD from requirement + context

### 3.4 Tech Designer agent
- `src/agents/tech-designer.ts` — Technical design subagent
- Prompt: generate tech design from PRD + context

### 3.5 Coder agent
- `src/agents/coder.ts` — Full-toolset coding subagent
- Prompt: implement based on tech design

### 3.6 Tester agent
- `src/agents/tester.ts` — Testing subagent
- Prompt: write unit tests based on tech design + code

### 3.7 Reviewer agent
- `src/agents/reviewer.ts` — Read-only code review subagent
- Permission: write deny, edit deny
- Prompt: review changes against tech design + PRD

**Deliverable:** All 7 agents defined, `create-agents.ts` registers them, `bun run typecheck` passes

---

## Phase 4: Agent Registration

### 4.1 Agent registration
- `src/create-agents.ts` — createBuiltinAgents() function
  - Build Coordinator with full pipeline context
  - Build 6 worker agents with appropriate permissions
  - Apply config overrides
  - Return Record<string, AgentConfig>

**Deliverable:** Agents load in OpenCode, Coordinator appears as selectable agent

---

## Phase 5: Pipeline Tools

### 5.1 Custom tools
- `src/tools/pipeline-run.ts` — Start pipeline (create PipelineState, advance to first stage)
- `src/tools/pipeline-status.ts` — Read and display current pipeline state
- `src/tools/pipeline-resume.ts` — Resume from persisted state
- `src/tools/pipeline-skip.ts` — Skip a stage
- `src/tools/pipeline-reject.ts` — Reject stage with feedback

### 5.2 Tool registration
- `src/create-tools.ts` — Register all tools including pipeline tools
- Wire into plugin interface

**Deliverable:** Pipeline tools available in Coordinator's toolset

---

## Phase 6: Commands

### 6.1 Slash commands
- `src/commands/develop.ts` — `/develop <requirement>` and `/develop --resume` and `/develop --from <stage>`
- `src/commands/prd.ts` — `/prd <requirement>`
- `src/commands/tech-design.ts` — `/tech-design`
- `src/commands/code.ts` — `/code`
- `src/commands/test.ts` — `/test`
- `src/commands/review.ts` — `/review`
- `src/commands/naruto-export.ts` — `/naruto-export` (manual AGENTS.md export)

**Deliverable:** All commands registered and functional

---

## Phase 7: Plugin Wiring

### 7.1 Plugin interface
- `src/create-hooks.ts` — Hook registration (minimal for MVP: chat.message for keyword detection)
- `src/index.ts` — Full pluginModule with config, tool, agent, command handlers

### 7.2 Integration test
- Manual test: install plugin in test project
- Run `/develop "add hello world API endpoint"`
- Verify full pipeline flow

**Deliverable:** Plugin installs and runs in OpenCode

---

## Dependency Graph

```
Phase 0 (scaffold)
    |
    v
Phase 1 (core) ──── 1.1 config
    |                1.2 agent types
    |                1.3 pipeline types + state machine
    v
Phase 2 (shared) ── 2.1 context builder
    |
    v
Phase 3 (agents) ── 3.1 coordinator ── 3.2 explorer ── 3.3 prd-writer
    |                3.4 tech-designer ── 3.5 coder ── 3.6 tester ── 3.7 reviewer
    v
Phase 4 (register) ─ 4.1 create-agents
    |
    v
Phase 5 (tools) ─── 5.1 pipeline tools ── 5.2 tool registration
    |
    v
Phase 6 (commands) ─ 6.1 slash commands
    |
    v
Phase 7 (wiring) ── 7.1 plugin interface ── 7.2 integration test
```

## Parallelization Opportunities

Within each phase, independent units can run in parallel:
- **Phase 1:** 1.1, 1.2, 1.3 are independent (can run in parallel)
- **Phase 3:** 3.2-3.7 are all independent (can run in parallel), 3.1 (coordinator) depends on phase 2
- **Phase 5:** 5.1 tools are independent of each other
- **Phase 6:** All 6 commands are independent of each other

## Estimated Effort

| Phase | Units | Effort |
|-------|-------|--------|
| Phase 0 | 1 | Trivial |
| Phase 1 | 3 | Medium |
| Phase 2 | 1 | Medium |
| Phase 3 | 7 | Heavy (most work) |
| Phase 4 | 1 | Medium |
| Phase 5 | 2 | Medium |
| Phase 6 | 1 | Medium |
| Phase 7 | 2 | Medium |

**Total: ~18 work units across 8 phases**

## Implementation Order

1. Phase 0 → 1 → 2 (sequential, foundation)
2. Phase 3 (coordinator first, then 6 workers in parallel)
3. Phase 4 → 5 → 6 → 7 (sequential, wiring)
