# 1d — Day & week ops

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** [1c](./1c-registry-shell.md)  
**Blocks:** nothing (parallel domain with 1e–1g, but sequential PRs)  
**Goal:** Route day/week human actions through `registry.run`.

---

## Ops (this slice only)

| Op | Replaces handler |
|----|------------------|
| `add_day` | `handleAddDay` |
| `delete_day` | `handleDeleteDay` |
| `edit_day_title` | `handleEditTitle` |
| `add_day_notes` | `handleAddRoutineNote` |
| `delete_week` | `handleDeleteWeek` |

---

## Scope

- `ProgramEditor.tsx`: listed handlers → `runMutation(...)`; remove inline `setHevyProgram` for these
- `ProgramGrid.tsx` / props: only if needed to thread `runMutation` instead of raw handlers
- **Do not touch** exercise, superset, duplicate, or reorder handlers

---

## Acceptance

- [ ] Each op: one undo step per action
- [ ] `add_day` requires `folderIds` length 1
- [ ] `delete_week` requires `folderIds` length 1
- [ ] Day title + notes persist correctly after undo

---

## QA checklist

1. Add day to week → undo  
2. Delete day → undo  
3. Edit title → undo  
4. Add day notes → undo  
5. Delete week → undo  

---

## Typical diff

~2–3 files: `ProgramEditor.tsx`, maybe `ProgramGrid.tsx`.
