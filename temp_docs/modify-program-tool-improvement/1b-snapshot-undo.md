# 1b — Snapshot undo

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** nothing (can land before or after 1a; no import dependency)  
**Blocks:** [1c](./1c-registry-shell.md)  
**Goal:** Replace inverse-patch undo with snapshot stack; keep **`modifyProgram`** patch apply working.

---

## Scope

### `editor-reducer.ts`

- Remove `Operation` / `inversePatch` from state
- Undo stack: `THevyRoutine[][]` via **`structuredClone`**, cap **100** (drop oldest)
- Actions: `COMMIT_PROGRAM` (push snapshot + set program), `UNDO`, `REPLACE_PROGRAM`, `UPDATE_PROGRAM` (if still needed for hydrate)

### `BuildProgram.tsx`

- **`applyPatchWithUndo`**: still applies RFC 6902 patch for agent, then **`normalizeRepRanges`**, then dispatch `COMMIT_PROGRAM` with `recordUndo` flag
- **`setProgramFromHydrate`**: `REPLACE_PROGRAM`, no undo push
- Human handlers **not** migrated yet — still call `setHevyProgram` / patch path as today

### Out of scope

- `ProgramMutationContext`, `registry.run`
- Removing `fast-json-patch` (slice 2)

---

## Acceptance

- [ ] Human edits still work; undo restores previous grid snapshot
- [ ] Agent `modifyProgram` still commits; one undo step per atomic apply
- [ ] `recordUndo: false` on empty-program first generation (no stack entry)
- [ ] Cap 100: 101st commit drops oldest snapshot
- [ ] No `inversePatch` left in reducer types

---

## Tests

- Reducer unit tests: push/pop, empty undo, cap overflow, failed undo leaves state

---

## Typical diff

~2–3 files: `editor-reducer.ts`, `BuildProgram.tsx`, reducer test file.
