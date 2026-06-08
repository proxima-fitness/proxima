# 1 — Foundation (registry, human path, undo, lock)

**Parent ADR:** [0001 — Program mutations via registry](../0001-program-mutation-registry.md)  
**Depends on:** nothing  
**Blocks:** [2 — Agent apply](./2-agent-apply.md)  
**Goal:** One mutation layer for the grid; snapshot undo for human and agent commits; read-only grid while the assistant is streaming.

This slice does **not** add `mutateProgram`, `readProgram`, or remove JSON Patch. Agent keeps **`modifyProgram`** until slice 2.

---

## Why micro-slices

A single pass touches ~20 files (new `mutations/` module, reducer, context, `ProgramEditor`, grid components, agent shell). Too large to review safely. Execute the sub-plans below **in order**; each lands a working app with a narrow diff (~3–8 files).

| Sub-plan | Delivers | Typical diff |
|----------|----------|--------------|
| [1a — Pure apply](./1a-pure-apply.md) | `applyOperations`, locate, ops, tests | **new files only** (~9) |
| [1b — Snapshot undo](./1b-snapshot-undo.md) | `structuredClone` undo stack; agent patch path unchanged | ~3 |
| [1c — Registry shell](./1c-registry-shell.md) | Context, `registry.run`, `commitWithUndo` / hydrate | ~4 |
| [1d — Day & week ops](./1d-day-week-ops.md) | `add_day`, `delete_day`, `edit_day_title`, `add_day_notes`, `delete_week` | ~2–3 |
| [1e — Exercise CRUD](./1e-exercise-crud.md) | `insert_exercise`, `edit_exercise`, `delete_exercise`, `update_set` | ~3–4 |
| [1f — Notes & superset](./1f-notes-superset.md) | `add_exercise_notes`, `create_superset`, `remove_from_superset` | ~2–3 |
| [1g — Human-only ops](./1g-human-only-ops.md) | `duplicate_week`, `duplicate_day`, `reorder_day_in_week`, `add_routine_as_day` | ~3–4 |
| [1h — Streaming lock](./1h-streaming-lock.md) | Disable grid + undo while `status === "streaming"` | ~4–5 |

**Parallelism:** Only **1a** is safe in isolation before **1b**. **1d–1g** are mutually exclusive *domains* (different handlers) but share `ProgramEditor.tsx` — run sequentially, not in parallel.

---

## End state (unchanged from original scope)

When **1a–1h** are done, the acceptance criteria below hold. Details per op live in sub-plans and the original tables in git history; registry API shape is defined in [1c](./1c-registry-shell.md).

### Registry API (summary)

```ts
defineProgramMutation({
  id: string,
  description: string,
  schema: ZodSchema,
  run: (program, args) => THevyRoutine[] | ValidationFailure,
  agentExposed?: boolean, // default true
})
```

- **`registry.run(id, args, ctx)`** — `ctx`: `program`, `commitWithUndo`, `isAgentStreaming`
- **`setProgramFromHydrate(program)`** — replace program, no undo
- **`commitWithUndo(next, { recordUndo?: boolean })`** — `normalizeRepRanges`, snapshot stack (cap **100**)

### Operations (all registered by end of 1g)

| Op | `agentExposed` | Wired in |
|----|----------------|----------|
| `insert_exercise` | true | 1e |
| `edit_exercise` | true | 1e |
| `delete_exercise` | true | 1e |
| `update_set` | true | 1e |
| `edit_day_title` | true | 1d |
| `add_day_notes` | true | 1d |
| `add_exercise_notes` | true | 1f |
| `delete_day` | true | 1d |
| `add_day` | true | 1d |
| `delete_week` | true | 1d |
| `create_superset` | true | 1f |
| `remove_from_superset` | true | 1f |
| `duplicate_week` | false | 1g |
| `duplicate_day` | false | 1g |
| `reorder_day_in_week` | false | 1g |
| `add_routine_as_day` | false | 1g |

---

## Acceptance (full slice 1)

- [ ] All human ops in table route through registry; one undo step per click/save
- [ ] Undo restores prior snapshot; cap 100; oldest dropped on overflow
- [ ] Streaming blocks human mutations and undo (UI + registry)
- [ ] `insert_exercise` at index 0 works (warmup); add dialog appends at end
- [ ] `normalizeRepRanges` on every `commitWithUndo`
- [ ] Agent path still uses **`modifyProgram`** until slice 2

---

## Tests (by sub-plan)

| Sub-plan | Tests |
|----------|-------|
| 1a | `applyOperations` unit tests per op + failure shape |
| 1b | Undo push/pop, `recordUndo: false`, cap 100 |
| 1c | Registry guard when `isAgentStreaming` (can stub `true`) |
| 1d–1g | Manual QA per group; optional thin integration per sub-plan |
| 1h | Manual: controls disabled + registry toast during stream |
