# 1a — Pure apply layer

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** nothing  
**Blocks:** [1b](./1b-snapshot-undo.md), [1c](./1c-registry-shell.md)  
**Goal:** Extract mutation logic into a testable module with **zero UI wiring**.

---

## Scope

### New module only (`src/components/program-builder/mutations/`)

| File | Role |
|------|------|
| `types.ts` | `ValidationFailure`, operation discriminated union |
| `locate.ts` | Resolve `folderIds` + `dayOrder` (1-based) + `exerciseIndex` |
| `ops.ts` | Per-op pure `run(program, args)` — copy logic from today's `ProgramEditor` handlers |
| `apply.ts` | `applyOperation`, `applyOperations` (fail-all batch) |
| `schemas.ts` | Zod per op (for slice 2; define now, unused by UI) |
| `defineProgramMutation.ts` | Factory |
| `catalog.ts` | Register all ops; **no React** |
| `index.ts` | Public exports |

### Rules

- **No imports** from React, contexts, or `BuildProgram`
- **No edits** to `ProgramEditor`, `HevyColumn`, `editor-reducer`, or agent code
- Retire **`add_exercise`** id → **`insert_exercise`** in catalog only
- Audit **`if (dayOrder)`** falsy bugs when copying locate logic

---

## Acceptance

- [ ] `pnpm test` (or vitest) passes for `apply.test.ts`
- [ ] Every op in foundation table has a `run` + schema in catalog
- [ ] App behavior **unchanged** (no consumer imports yet)
- [ ] `insert_exercise` at `exerciseIndex: 0` covered by test

---

## Tests (`apply.test.ts`)

- Happy path per op (minimal fixture program)
- Failure shape: bad `dayOrder`, missing day, bad `exerciseIndex`, empty `folderIds` for week ops
- Batch fail-all: second op invalid → program unchanged

---

## Typical diff

~9 new files, 0–1 modified (`vitest.config.ts` if needed).
