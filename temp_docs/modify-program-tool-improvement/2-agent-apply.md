# 2 — Agent apply (`mutateProgram`, remove JSON Patch)

**Parent ADR:** [0001 — Program mutations via registry](../0001-program-mutation-registry.md)  
**Depends on:** [1 — Foundation](./1-foundation.md)  
**Blocks:** [3 — Agent read & skills](./3-agent-read.md)  
**Goal:** Agent mutates the program via typed operation batches; RFC 6902 removed from the agent path.

This slice does **not** ship **`readProgram`** or full skill rewrites (slice 3). Minimal **`instructions.ts`** patch-language removal only.

---

## Scope

### Tool: `mutateProgram`

- Remove **`modifyProgram`**
- Input: `{ operations: z.discriminatedUnion("op", …) }` **generated** from registry where **`agentExposed: true`**
- Tool **description**: auto-generated list of exposed op ids + registry descriptions (skills stay workflow-level)
- Server **`execute`**: run **`applyOperations(requestSnapshot, operations)`** — on success return `{ operations }`; on failure return **`{ error, failures: [{ index, op, reason }] }`** with **`toModelOutput`** summary
- Client is authoritative if server/client disagree; client fail → **toast only**

### Exposed operations (v1)

`update_set`, `insert_exercise`, `edit_exercise`, `delete_exercise`, `edit_day_title`, `add_day_notes`, `add_exercise_notes`, `delete_day`, `delete_week`, `add_day`, `create_superset`, `remove_from_superset`

Not exposed: `duplicate_week`, `duplicate_day`, `reorder_day_in_week`, `add_routine_as_day`

### Client apply

- **`applyMutateProgramFromMessages`** (replaces patch merge helper):
  - Collect **`mutateProgram`** parts for turn; concatenate multiple parts in message order
  - Apply only when **`status === "ready"`**; idempotent applied-keys on history hydrate
  - In-memory **`applyOperations`** → **fail-all** → **`normalizeRepRanges`** → **`commitWithUndo`** (one undo step; `recordUndo: false` when program was empty)
- **`tryCommitAtomicBuildWeekAndMutations`**: duplicate week 1 → apply batch on full program → one commit; fail-all leaves grid unchanged

### Batch ordering (documentation)

- Ops apply in **array order**; no client reorder
- Skills (slice 3): **`insert_exercise`** before **`update_set`** / index-based ops on same day

### Remove

- `modifyProgram` tool, patch Zod, `prepareModifyPatchOperations`, patch merge/apply in `helpers.ts` / `MessageBubbles`
- **`fast-json-patch`** package when grep shows zero refs
- Patch vocabulary in **`instructions.ts`** (point at **`mutateProgram`**)

### Unchanged

- **`buildWeek`**, **`planProgram`**, questionnaire
- **`getCurrentProgram`** until slice 3
- Human grid uses registry from slice 1

---

## Acceptance

- [ ] Periodization: one `mutateProgram` with `folderIds` + `dayOrder` + `exerciseIndex`, not `/N/...` paths
- [ ] Warmups: `insert_exercise` with `exerciseIndex: 0` across `folderIds`
- [ ] `update_set` for RPE/reps/rest tweaks; human still uses `edit_exercise` for dialog edits
- [ ] Invalid batch never mutates grid (including post-`buildWeek` duplicate)
- [ ] Server validation errors visible to model via tool result
- [ ] `fast-json-patch` removed from `package.json`

---

## Tests

- Batch schema + `applyOperations` parity with server preflight
- Atomic buildWeek + mutate success / fail-all
- Two `mutateProgram` parts in one turn → single commit
- Port/replace `modifyProgramInputSchema` tests
