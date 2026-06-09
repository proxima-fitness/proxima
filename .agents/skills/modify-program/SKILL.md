---
name: modify-program
description: >-
  Workflow for modifying an existing workout program. Load this skill when the
  user wants to change, edit, update, swap, rename, or remove exercises, sets,
  reps, or days in their existing program.
allowedTools:
  - getExerciseList
  - readProgram
  - mutateProgram
---

# Modify Program

## Checklist

- [ ] **readProgram** when you need the current program (weeks, days, exercises, sets, notes, reason). `hevyProgram.length` = N total routines (all weeks).
- [ ] Build **one operations array** with all registry ops for the requested change.
- [ ] For edits affecting every week/day occurrence: include **folderIds** (and matching **dayOrder**) for each week that needs the change—or one op with multiple **folderIds** when the change is identical.
- [ ] Call **mutateProgram** once with the full **operations** array.

## Targeting (mutateProgram)

Use registry operation ids only — field details live in the **mutateProgram** tool description; do not duplicate per-op tables here.

- **folderIds:** 0-based week index (`folder_id` on each routine). Week 1 → `[0]`, week W → `[W - 1]`. Multiple weeks: `[0, 1, 2, …]`.
- **dayOrder:** 1-based day within the week (`order` on the routine).
- **exerciseIndex:** 0-based index in that day’s `exercises[]`.
- **setIndex:** 0-based index on that exercise’s sets (for **update_set**).

**Week + day from builder context:** For week `w` (1-based) and day `d` (1-based): `folderIds: [w - 1]`, `dayOrder: d`. Program length = **daysPerWeek × programLength** routines total.

## Batch order

Operations run in **array order** (fail-all if any op is invalid):

1. **insert_exercise** (especially warmups at **exerciseIndex: 0**) before **update_set** / **edit_exercise** / **delete_exercise** on the same day.
2. **delete_exercise** / inserts at higher **exerciseIndex** before lower-index updates when indices would shift.
3. Prefer **update_set** and **edit_day_title** for periodization-style tweaks; use **insert_exercise** / **delete_exercise** only when structure changes.

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup exercises** are separate movements (IDs from **getExerciseList**) at the start of the day to prepare for the session. **Warmup sets** are lighter sets of the same working lift. When adding prep work, add **warmup exercises** with **`"normal"`** sets at low RPE—not only extra `"warmup"`-typed sets on the main lift.

**Warmups increase the row count — they do not replace working exercises.** Prepending a warmup with **insert_exercise** at **exerciseIndex: 0** inserts an extra row; existing working exercises shift index by one but are all still present. Never remove or omit a working exercise to "make room" for a warmup unless the user explicitly asks to replace it.

- If the user reports an **injury, pain, or limitation**, or asks for better prep, check whether each affected **training day** already begins with **1–2 appropriate warmup exercises**. If the day jumps straight into heavy work, add **1–2 warmup exercises** (bias **two** when injury or limitation is present).
- **Prepend** with **insert_exercise** at **exerciseIndex: 0** (before the current first exercise). To insert two warmups in order: **insert the first at index 0**, then **insert the second at index 1** (after the first insert shifts indices). Use **getExerciseList** for valid template IDs and titles; match the day’s movements and any stated limitation.
- When the change should apply to **every week**, use **folderIds** listing every week index for that **dayOrder** (e.g. day 1 every week in an 8-week program: `folderIds: [0, 1, 2, 3, 4, 5, 6, 7]`, `dayOrder: 1`). Do not edit only week 1.

## Program types

When the user's program or requested changes are **powerlifting-focused** (squat, bench, deadlift, or "like" a known powerlifting program such as Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, etc.), use `readFile` to load `.agents/skills/modify-program/resources/powerlifting.md` and apply that knowledge when building the **operations** batch (e.g. preserve SBD emphasis, recovery, and style).

When the user's program or requested changes are **bodybuilding- or hypertrophy-focused** (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/modify-program/resources/bodybuilding.md` and apply that knowledge when building the **operations** batch (e.g. preserve volume landmarks, exercise categories per muscle, rep ranges, and session structure as in the resource).

## Gotchas

- **Program shape**: The live program is all routines across all weeks. Length N = **daysPerWeek × programLength** (e.g. 6×8 = 48). Target days with **folderIds** + **dayOrder**, not flat routine-index math.
- **Program-wide changes**: To change every occurrence (e.g. rename all "Push" to "Chest"), include **folderIds** for each week (or one op with all relevant **folderIds**) and the same **dayOrder**. Do not edit only the first week.
- **One batch, one call**: Pass a single **operations** array to **mutateProgram**. Do not split by week or make multiple **mutateProgram** calls for one logical edit.
- **readProgram staleness**: Snapshot is from **request start**; it does **not** refresh after **buildWeek** in the same turn. For post-**buildWeek** periodization, use the **build-program** skill (**buildWeek** output + **planProgram**), not **readProgram**.

## Rep ranges

`rep_range` is a first-class field on every set (`{start, end}`). **`rep_range` supersedes `reps` in the UI** — when `rep_range` is non-null the UI displays the range and ignores `reps`.

- When the program uses rep ranges, use **update_set** with the full **`rep_range`** object rather than only updating **reps**. Example: change 8–12 to 10–15 via `{ "op": "update_set", …, "set": { "rep_range": { "start": 10, "end": 15 } } }`.
- **Fixed-rep rule:** When changing to a fixed rep count (e.g. 5x5, singles, doubles, triples), set **`rep_range`: null** and set **`reps`** to the fixed value in **update_set**. **NEVER** emit a degenerate `rep_range` where `start === end` (e.g. `{start: 5, end: 5}`). That will display as "5-5" in the UI which is incorrect.

## Operations batch template

The following is **only** the payload shape for **mutateProgram**—do **not** copy this block into user-visible assistant messages. The tool expects `{ "operations": [ … ] }` (not a bare array at the top level).

```json
{
  "operations": [
    { "op": "edit_day_title", "folderIds": [0, 1, 2], "dayOrder": 1, "title": "Push Day" },
    { "op": "update_set", "folderIds": [0], "dayOrder": 1, "exerciseIndex": 0, "setIndex": 0, "set": { "rep_range": { "start": 8, "end": 12 } } },
    { "op": "update_set", "folderIds": [0], "dayOrder": 1, "exerciseIndex": 0, "setIndex": 0, "set": { "reps": 12 } }
  ]
}
```
