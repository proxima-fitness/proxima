# 1e — Exercise CRUD

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** [1c](./1c-registry-shell.md)  
**Goal:** Route exercise add/edit/delete/set updates through `registry.run`.

---

## Ops (this slice only)

| Op | Replaces handler |
|----|------------------|
| `insert_exercise` | `handleAddExercise` (append at `exercises.length`; dialog path) |
| `edit_exercise` | `handleEditExercise` |
| `delete_exercise` | `handleDeleteExercise` |
| `update_set` | Inline set edits in `HevyRoutine` if any (agent-only op; wire human set UI if present) |

---

## Scope

- `ProgramEditor.tsx`: exercise dialog save/delete paths
- `HevyRoutine.tsx`: only if set-level edits exist outside dialog
- Add dialog opens at end index; **`insert_exercise` with index 0** must work for future agent warmups (covered in 1a tests; manual QA optional here)

### Naming

- No `add_exercise` id anywhere in registry or handlers

---

## Acceptance

- [ ] Add exercise via dialog → one undo step  
- [ ] Edit exercise → undo  
- [ ] Delete exercise → undo  
- [ ] Warmup: if UI supports insert at 0, verify; else rely on 1a tests  
- [ ] `normalizeRepRanges` runs via `commitWithUndo` after each op  

---

## Typical diff

~3–4 files: `ProgramEditor.tsx`, `HevyRoutine.tsx`, possibly `ProgramGrid.tsx`.
