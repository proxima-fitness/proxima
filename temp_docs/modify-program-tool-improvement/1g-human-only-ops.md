# 1g — Human-only ops

**Parent:** [1 — Foundation](./1-foundation.md)  
**Depends on:** [1c](./1c-registry-shell.md)  
**Goal:** Duplicate, reorder, and import-day flows via `registry.run` (`agentExposed: false`).

---

## Ops (this slice only)

| Op | Replaces handler |
|----|------------------|
| `duplicate_week` | `handleDuplicateWeek` |
| `duplicate_day` | `handleDuplicateDay` |
| `reorder_day_in_week` | DnD / reorder in `HevyColumn` |
| `add_routine_as_day` | `handleAddRoutineAsDay` |

---

## Scope

- `ProgramEditor.tsx`: duplicate week/day, add routine as day
- `HevyColumn.tsx`: reorder → `reorder_day_in_week` with `beforeDayId` (`null` = end)
- `ProgramGrid.tsx`: prop threading only if needed
- Remove remaining direct `setHevyProgram` mutation paths in editor/grid column

---

## Acceptance

- [ ] Duplicate week to selected weeks → one undo step  
- [ ] Duplicate day → undo  
- [ ] Reorder day within week → undo  
- [ ] Add routine as day → undo  
- [ ] No human handler still mutates via `setHevyProgram` (grep clean)  
- [ ] `hevy-program-in-progress` debounce unchanged  

---

## Typical diff

~3–4 files: `ProgramEditor.tsx`, `HevyColumn.tsx`, `ProgramGrid.tsx`.
