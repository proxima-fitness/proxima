# 1c — Registry shell & context

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** [1a](./1a-pure-apply.md), [1b](./1b-snapshot-undo.md)  
**Blocks:** [1d](./1d-day-week-ops.md) … [1h](./1h-streaming-lock.md)  
**Goal:** Wire `registry.run` + `commitWithUndo` in React; **no handler migrations yet**.

---

## Scope

### New

- `src/contexts/ProgramMutationContext.tsx`
  - `program`, `commitWithUndo`, `setProgramFromHydrate`, `isAgentStreaming` (default `false`)
  - `runMutation(id, args)` → `catalog` pure `run` → `commitWithUndo` on success; toast on `ValidationFailure`

### `mutations/registry.ts`

- `registry.run(id, args, ctx)` — delegates to catalog; calls `ctx.commitWithUndo` on success
- Streaming guard: if `ctx.isAgentStreaming`, toast + return (testable in unit test with mock ctx)

### `BuildProgram.tsx`

- Provider wraps editor + chat panel
- Hydrate paths use `setProgramFromHydrate`
- Pass `runMutation` (or context hook) down — **handlers still use `setHevyProgram` until 1d+**

### Out of scope

- Replacing individual `handle*` callbacks
- Streaming lock UI (1h)

---

## Acceptance

- [ ] Context mounts; app behavior unchanged for users
- [ ] `registry.run` unit/integration test with mock `commitWithUndo`
- [ ] `setProgramFromHydrate` does not push undo (chat load, shared import, empty template)

---

## Typical diff

~4 files: `ProgramMutationContext.tsx`, `registry.ts`, `index.ts` export, `BuildProgram.tsx` provider only.
