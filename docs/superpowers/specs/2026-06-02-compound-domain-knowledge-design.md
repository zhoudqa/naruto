# Compound Domain Knowledge Design

## Overview

Add a **domain-analysis** pipeline stage and a **domain-analyst** agent to Naruto. The mechanism accumulates cross-system domain knowledge (call chains, FSM, data models, API contracts) across pipeline runs, enabling agents to leverage prior knowledge for better exploration and downstream output — similar to how a developer builds institutional knowledge over time.

## Pipeline Flow Change

New stage inserted between `explore` and `prd`:

```
clarify → explore → domain-analysis → prd → tech-design → code → test → review
```

### Domain Identification

Occurs at the end of the **clarify** stage:
1. Coordinator analyzes the requirement and infers a business domain.
2. Lists all existing domain knowledge files under `~/.naruto/domain-knowledge/`.
3. Presents the inferred domain + existing domains for user confirmation.
4. Confirmed domain name is written to `PipelineState.domain`.

### Data Flow

**First run (no existing knowledge):**
```
explore [no prior knowledge] → context.md
domain-analysis [context.md] → ~/.naruto/domain-knowledge/<domain>.md
```

**Subsequent runs (existing knowledge):**
```
explore [existing domain knowledge] → context.md (targeted, deeper)
domain-analysis [context.md + old knowledge] → ~/.naruto/domain-knowledge/<domain>.md (incremental update)
```

**Downstream consumption:** prd, tech-design, code, review stages receive domain knowledge automatically via `context-builder.ts` STAGE_DEPENDENCIES.

## Domain Knowledge File Format

Each business domain stored as `~/.naruto/domain-knowledge/<domain>.md`. Cross-system perspective with Mermaid diagrams.

```markdown
# Domain Knowledge: payment

## Meta
- domain: payment
- version: 3
- last_updated: 2026-06-02
- involved_systems: order-service, payment-service, risk-service, notification-service, inventory-service

## Cross-System Call Chains

### Payment Creation Flow
​```mermaid
sequenceDiagram
    participant O as order-service
    participant P as payment-service
    participant R as risk-service
    participant I as inventory-service

    O->>P: createPayment(order_id, amount)
    P->>R: evaluate(payment_id, amount, user_id)
    alt risk PASS
        R-->>P: { score, result: PASS }
        P->>I: lock(order_id, items[])
        I-->>P: { lock_id, status: LOCKED }
        P-->>O: { payment_id, status: LOCKED }
    else risk REJECT
        R-->>P: { score, result: REJECT }
        P-->>O: { payment_id, status: REJECTED }
        O->>O: cancel()
    end
​```

### Payment Callback Flow
​```mermaid
sequenceDiagram
    participant GW as third-party-gateway
    participant P as payment-service
    participant O as order-service
    participant N as notification-service

    GW->>P: callback(payment_id, status)
    P->>P: idempotent check
    alt SUCCESS
        P->>O: confirm(payment_id, order_id)
        O-->>P: ok
        P-)N: sendReceipt(order_id, user_id)
    else FAIL
        P->>O: paymentFailed(payment_id, order_id)
        P-)P: schedule retry or refund
    end
​```

## Cross-System State Machine

### Order-Payment Joint Lifecycle
​```mermaid
stateDiagram-v2
    [*] --> Order_Created
    Order_Created --> Payment_Init: order-service creates payment
    Payment_Init --> Risk_Checking: payment-service calls risk-service
    Risk_Checking --> Payment_Rejected: risk REJECT
    Risk_Checking --> Inventory_Locking: risk PASS
    Inventory_Locking --> Payment_Locked: inventory-service lock success
    Inventory_Locking --> Payment_Failed: inventory-service lock fail
    Payment_Locked --> Payment_Paid: third-party callback SUCCESS
    Payment_Locked --> Payment_Expired: timeout 30min
    Payment_Paid --> Order_Paid: order-service confirm
    Order_Paid --> [*]: notification-service sendReceipt
    Payment_Rejected --> Order_Cancelled: order-service cancel
    Payment_Expired --> Order_Expired: inventory-service release
    Payment_Failed --> Order_PaymentFailed: retry or cancel
    Order_Cancelled --> [*]
    Order_Expired --> [*]
    Order_PaymentFailed --> [*]
​```

## Cross-System Data Model

​```mermaid
erDiagram
    ORDER ||--|| PAYMENT : "1:1"
    PAYMENT ||--|| RISK_RECORD : "1:1"
    ORDER ||--|{ INVENTORY_LOCK : "1:N"

    ORDER {
        string id PK
        string user_id
        string status
    }
    PAYMENT {
        string id PK
        string order_id FK
        decimal amount
        string status
        string method
    }
    RISK_RECORD {
        string id PK
        string payment_id FK
        int score
        string result
    }
    INVENTORY_LOCK {
        string id PK
        string sku_id
        string order_id FK
        int quantity
        string status
    }
​```

## Cross-System API Contracts

| From | To | Method | Path | Key Params |
|------|----|--------|------|------------|
| payment-service | risk-service | POST | /internal/risk/evaluate | payment_id, amount, user_id |
| payment-service | order-service | POST | /internal/order/callback | payment_id, order_id, status |
| payment-service | inventory-service | POST | /internal/inventory/lock | order_id, items[] |

## Error Handling Across Systems

| Scenario | Strategy |
|----------|----------|
| risk-service down | allow <100 CNY, reject >=100 |
| inventory-service timeout | cancel payment, MQ retry order |
| callback lost | payment-service polling 5min/24h |
```

Design principles:
- Cross-system perspective, not single-system internals.
- Mermaid diagrams for call chains (sequenceDiagram), state machines (stateDiagram-v2), and data models (erDiagram).
- Tables for API contracts and error handling strategies.
- Version number increments on each update for freshness tracking.

## Domain Analyst Agent

New `naruto-domain-analyst` subagent.

**Responsibilities:**
1. Read `context.md` from explore stage.
2. Read existing `~/.naruto/domain-knowledge/<domain>.md` if present.
3. Analyze cross-system knowledge relevant to the current requirement.
4. Produce or incrementally update the domain knowledge file.
5. If `knowledge_sync_tool` is configured, coordinator calls the MCP tool to sync to remote.

**Analysis steps (in agent prompt):**
1. Identify all systems/modules involved.
2. Trace cross-system call chains (entry point to storage, full path).
3. Identify cross-system state machines (multi-system state transitions).
4. Map cross-system data models (entities distributed across systems).
5. Extract cross-system API contracts.
6. Summarize cross-system error handling and resilience strategies.

**Output rules:**
- Use Mermaid diagrams for visualization.
- Cross-system perspective, no single-system internals.
- Incremental: preserve unchanged sections, only update sections relevant to the current requirement.
- Version auto-increment.

**Agent config:**
- mode: subagent (read-only code + write domain knowledge file)
- model: strong reasoning model (same tier as tech-designer)

## Pipeline State and Config Changes

### PipelineStage

```typescript
type PipelineStage =
  | "clarify"
  | "explore"
  | "domain-analysis"  // NEW
  | "prd"
  | "tech-design"
  | "code"
  | "test"
  | "review"
```

### PipelineState

```typescript
interface PipelineState {
  // ...existing fields
  domain?: string  // confirmed domain name from clarify stage
}
```

### NarutoConfig

```typescript
interface NarutoConfig {
  // ...existing fields
  knowledge_sync_tool?: string  // MCP tool name for remote sync
}
```

### context-builder.ts STAGE_DEPENDENCIES

```typescript
const STAGE_DEPENDENCIES = {
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
    { file: "prd.md", label: "PRD" },
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
  ],
  code: [
    { file: "tech-design.md", label: "Technical Design" },
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
  ],
  test: [
    { file: "tech-design.md", label: "Technical Design" },
  ],
  review: [
    { file: "tech-design.md", label: "Technical Design" },
    { file: "prd.md", label: "PRD" },
    { file: "context.md", label: "Codebase Context" },
    { file: "domain-knowledge", label: "Domain Knowledge" },
  ],
}
```

`domain-knowledge` is a special dependency resolved to `~/.naruto/domain-knowledge/<state.domain>.md` in `buildSubagentPrompt`.

## Remote Sync

After domain-analysis completes:
1. Coordinator checks `config.knowledge_sync_tool`.
2. If configured, reads the generated domain knowledge file.
3. Calls MCP tool: `knowledge_sync_tool({ domain, content, version })`.
4. The actual MCP tool implementation is user-configured (Confluence, Notion, custom Wiki, etc.).

No new pipeline tool needed. Remote sync is a post-stage action executed by the coordinator.

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/agents/domain-analyst.ts` | domain-analyst agent definition + prompt |

### Modified Files

| File | Change |
|------|--------|
| `src/pipeline/types.ts` | Add `domain-analysis` to PipelineStage, `domain?` to PipelineState |
| `src/pipeline/stages.ts` | Insert domain-analysis stage definition |
| `src/config/schema.ts` | Add `knowledge_sync_tool?` to NarutoConfig |
| `src/shared/context-builder.ts` | Add domain-knowledge to STAGE_DEPENDENCIES, domain path resolution in buildSubagentPrompt |
| `src/shared/artifact-resolver.ts` | Add `getDomainKnowledgePath()` |
| `src/agents/coordinator/prompt.ts` | Add domain identification in clarify, domain-analysis orchestration, remote sync logic |
| `src/agents/index.ts` | Export createDomainAnalystAgent |
| `src/create-agents.ts` | Register domain-analyst in WORKER_FACTORIES |
| `src/create-hooks.ts` | Update /develop command prompt to be domain-aware |

### Unchanged

- `state-machine.ts` (generic logic, no hardcoded stages)
- `state-store.ts` (no change)
- Existing agent prompts (explorer consumes knowledge via context-builder, agent itself unchanged)
- `transitions.ts` (if generic, no change)
