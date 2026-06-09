---
name: mutate-program
description: >-
  Workflow for modifying an existing workout program. Load this skill when the
  user wants to change, edit, update, swap, rename, or remove exercises, sets,
  reps, days, or program length (e.g. "make it 2 weeks", "shorten to 4 weeks",
  "change from 8 to 2 weeks") in their existing program.
allowedTools:
  - getExerciseList
  - readProgram
  - mutateProgram
---

# Mutate Program

## Checklist

- [ ] **readProgram** when you need the current program (weeks, days, exercises, sets, notes, reason). `hevyProgram.length` = N total routines (all weeks).
- [ ] Build **one operations array** with all registry ops for the requested change.
- [ ] **Equipment / template swaps** (dumbbell-only, barbell → dumbbell, variation replace across program): use **`swap_exercise_template`** — one op per `from_exercise_template_id`; omit **folderIds** / **dayOrder** to hit every week and day.
- [ ] **Positional edits with new sets** (one slot, new prescription): use **`edit_exercise`** with grid payload (same shape as **insert_exercise**).
- [ ] For other edits affecting every week/day occurrence: include **folderIds** (and matching **dayOrder**) for each week—or one op with multiple **folderIds** when the change is identical.
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
4. **swap_exercise_template** before many positional **edit_exercise** calls when only the exercise template (equipment/variation) changes and sets/rest should stay.

## Template swap vs positional edit

| Goal | Op |
|------|-----|
| Replace all barbell bench with dumbbell bench (sets/rest unchanged) | **swap_exercise_template** |
| Change one exercise slot to a different movement **and** new sets/reps | **edit_exercise** |
| Tweak RPE/reps/rest on existing template | **update_set** |

**Dumbbell-only example** — after **readProgram**, one batch (omit **folderIds** / **dayOrder** for program-wide):

```json
{
  "operations": [
    { "op": "swap_exercise_template", "from_exercise_template_id": "SQUAT_BB", "to": { "exercise_template_id": "DCFF3E9F", "reason": "Dumbbell-only." } },
    { "op": "swap_exercise_template", "from_exercise_template_id": "BENCH_BB", "to": { "exercise_template_id": "3601968B" } }
  ]
}
```

Do **not** emit nine **edit_exercise** ops re-specifying every set when **swap_exercise_template** suffices.

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup exercises** are separate movements (IDs from **getExerciseList**) at the start of the day to prepare for the session. **Warmup sets** are lighter sets of the same working lift. When adding prep work, add **warmup exercises** with **`"normal"`** sets at low RPE—not only extra `"warmup"`-typed sets on the main lift.

**Warmups increase the row count — they do not replace working exercises.** Prepending a warmup with **insert_exercise** at **exerciseIndex: 0** inserts an extra row; existing working exercises shift index by one but are all still present. Never remove or omit a working exercise to "make room" for a warmup unless the user explicitly asks to replace it.

- If the user reports an **injury, pain, or limitation**, or asks for better prep, check whether each affected **training day** already begins with **1–2 appropriate warmup exercises**. If the day jumps straight into heavy work, add **1–2 warmup exercises** (bias **two** when injury or limitation is present).
- **Prepend** with **insert_exercise** at **exerciseIndex: 0** (before the current first exercise). To insert two warmups in order: **insert the first at index 0**, then **insert the second at index 1** (after the first insert shifts indices). Use **getExerciseList** for valid template IDs and titles; match the day’s movements and any stated limitation.
- When the change should apply to **every week**, use **folderIds** listing every week index for that **dayOrder** (e.g. day 1 every week in an 8-week program: `folderIds: [0, 1, 2, 3, 4, 5, 6, 7]`, `dayOrder: 1`). Do not edit only week 1.

## Program types

When the user's program or requested changes are **powerlifting-focused** (squat, bench, deadlift, or "like" a known powerlifting program such as Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, etc.), use `readFile` to load `.agents/skills/mutate-program/resources/powerlifting.md` and apply that knowledge when building the **operations** batch (e.g. preserve SBD emphasis, recovery, and style).

When the user's program or requested changes are **bodybuilding- or hypertrophy-focused** (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/mutate-program/resources/bodybuilding.md` and apply that knowledge when building the **operations** batch (e.g. preserve volume landmarks, exercise categories per muscle, rep ranges, and session structure as in the resource).

## Change program length (weeks)

**Existing program on the grid:** use **readProgram** + **mutateProgram** only. Do **not** call **planProgram** or **buildWeek** — those are for **new** program creation, not trimming/lengthening a live program.

- **Shorter program:** one **delete_week** per removed week. Use **folderIds: [weekIndex]** (0-based, same as routine `folder_id`). Emit one op per week; delete **highest index first** so reindexing stays correct (8→2 weeks: `[7]`, `[6]`, `[5]`, `[4]`, `[3]`, `[2]` — keeps weeks 0 and 1).
- **Longer program:** agent cannot add whole weeks via **mutateProgram** (no **duplicate_week**). Tell the user to increase program length in the builder UI, then rebuild or duplicate weeks manually.

## Gotchas

- **folderIds vs folder_id:** **readProgram** returns `folder_id` on each routine. **mutateProgram** expects **folderIds** as an array — week 3 → `folderIds: [2]`, never `folderId: 2`.
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
