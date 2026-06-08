# 1h — Streaming lock

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** [1d](./1d-day-week-ops.md) … [1g](./1g-human-only-ops.md) (all human ops on registry)  
**Goal:** Read-only grid and no undo while the assistant is streaming.

---

## Scope

### Context

- `isAgentStreaming` ← `status === "streaming"` from chat (`BuildProgram` / `BuildProgramChatPanel`)

### Registry

- `registry.run`: hard guard + toast when streaming (already in 1c; now live)

### UI

- Disable mutation controls in `ProgramGrid`, `HevyColumn`, `HevyRoutine` while streaming
- Disable **Undo** toolbar control while streaming
- **Do not** change `MessageBubbles` / `modifyProgram` apply (still runs when `status === "ready"`)

### Agent

- `Agent.tsx`: pass streaming flag only if not already available via context

---

## Acceptance

- [ ] During stream: buttons/dialogs that mutate program are disabled  
- [ ] During stream: undo disabled  
- [ ] `registry.run` toast if somehow invoked  
- [ ] After stream ends: human edits and undo work again  
- [ ] Agent `modifyProgram` still applies on ready (unchanged)  

---

## Typical diff

~4–5 files: `ProgramMutationContext.tsx`, `BuildProgram.tsx`, `BuildProgramChatPanel.tsx`, grid components, undo button site.
