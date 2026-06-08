# 3 — Agent read & skills (`readProgram`, instructions cleanup)

**Parent ADR:** [0001 — Program mutations via registry](../0001-program-mutation-registry.md)  
**Depends on:** [2 — Agent apply](./2-agent-apply.md) (`mutateProgram` op ids and args stable)  
**Blocks:** nothing (v1 complete for this ADR)  
**Goal:** On-demand program reads via filtered `hevyProgram`; skills and system prompt aligned with registry — no JSON Patch vocabulary.

This slice does **not** change registry, undo, or client apply logic.

---

## Scope

### Tool: `readProgram`

- Remove **`getCurrentProgram`**
- Required **`purpose`**: `"edit"` | `"analyze"`
- **`execute`** returns **`{ hevyProgram: THevyRoutine[] }`** from request-body snapshot (request-start staleness unchanged)
- Sort by **`folder_id`**, then **`order`**
- **`edit`:** strip day `notes`, exercise `notes`, exercise `reason`
- **`analyze`:** include those fields
- **Not** injected into system prompt every turn
- **Not** used for post-**`buildWeek`** periodization targeting (use **buildWeek** output + **planProgram**)

### Skills (`.agents/skills/`)

- **modify-program** / **build-program:**
  - Remove JSON Patch, routine-index math, `getCurrentProgram` path rules, deprecated flows
  - Document **`readProgram`** (when to call), **`mutateProgram`** (one batch per turn, `folderIds`, 1-based `dayOrder`, 0-based `exerciseIndex`)
  - Post-**`buildWeek`:** plan from **buildWeek** tool output; multi-week via **`folderIds`**
  - Batch order: inserts before index-based updates
  - Warmups: **`insert_exercise`** at index **0**
- Op-level detail: **only** in **`mutateProgram`** tool description (slice 2) — no duplicated per-op tables in skills

### System prompt (`instructions.ts`)

- Remove patch pointers, **`modifyProgram`**, **`getCurrentProgram`**
- Document **`readProgram`**, **`mutateProgram`**, two flows (edit existing vs post-**`buildWeek`** periodization)

### Other tools

- **`rateProgram`:** use **`readProgram({ purpose: "analyze" })`** when program content needed (or existing request snapshot policy)

### Unchanged

- Registry, undo, generation lock, client apply (slices 1–2)
- **`buildWeek`** `dayNumber` 1–7 → `order` string (1-based)

---

## Acceptance

- [ ] `readProgram({ purpose: "edit" })` returns filtered `hevyProgram` usable for `mutateProgram` targeting
- [ ] `readProgram({ purpose: "analyze" })` includes notes/reason for critique
- [ ] Skills and instructions contain no JSON Patch / flat routine-index guidance
- [ ] Instructions do not require `readProgram` on every turn
- [ ] Tool lists use `readProgram` / `mutateProgram` only

---

## Tests

- `readProgram` edit vs analyze field filtering fixtures
- `instructions.test.ts` / tool list snapshots updated
- Skill checklist references (manual QA) for build + modify flows
