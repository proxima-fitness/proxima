# 1f — Notes & superset

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** [1c](./1c-registry-shell.md)  
**Goal:** Exercise notes and superset grouping via `registry.run`.

---

## Ops (this slice only)

| Op | Replaces handler |
|----|------------------|
| `add_exercise_notes` | `handleAddExerciseNote` |
| `create_superset` | `handleCreateSuperset` |
| `remove_from_superset` | `handleRemoveFromSuperset` |

---

## Scope

- `ProgramEditor.tsx`: three handlers only
- Superset id allocation stays in op `run` (moved in 1a); remove `getNextSupersetId` from editor if redundant

---

## Acceptance

- [ ] Exercise note dialog → one undo step  
- [ ] Create superset (≥2 exercises) → undo  
- [ ] Remove from superset → undo  
- [ ] Superset ids stable within a commit  

---

## Typical diff

~2 files: `ProgramEditor.tsx` (+ minor cleanup in `ops.ts` only if 1a missed edge case).
