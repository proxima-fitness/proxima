---
name: mutate-program
description: >-
  Workflow to change an existing workout program. Load this skill when the
  user wants to change, edit, update, swap, rename, or remove exercises, sets,
  reps, days, or program length (for example "make it 2 weeks", "shorten to 4 weeks",
  "change from 8 to 2 weeks") in their existing program. Also load for superset
  changes (create, remove, or ungroup exercises).
allowedTools:
  - getExerciseList
  - readProgram
  - updateConstraintProfile
  - mutateProgram
---

# Mutate Program

## Before mutateProgram (mandatory)

Before **every** **mutateProgram** call:

1. **Persist constraint changes:** If this turn (or recent unrecorded chat) adds, changes, or removes a constraint, also call **`updateConstraintProfile`** in the same turn. Constraints include injury, equipment, area, movement restriction, and preference. Pass the add/remove fields. Pass `rawStatement` when the user spoke in chat. Call **`updateConstraintProfile`** before **mutateProgram** when you can. Do not wait for it before you edit. Do not assume that the Active Constraint Profile in the prompt is already written to Agentic memory.
2. **Honor Active Constraint Profile:** Use the **Active Constraint Profile** block in the system prompt as the constraint inventory. Do **not** re-derive constraints from a scan of the full conversation alone. The profile is authoritative.
3. **Compliance check:** Make sure that each operation in your batch violates **none** of those profile constraints. Do not swap or insert templates that use excluded equipment or that break stated movement restrictions.
4. **No empty days:** If **delete_exercise** (or removal of the last exercise on a day) leaves a training day with **zero** exercise rows, find and add a suitable replacement **first**. Put **insert_exercise** or **edit_exercise** in the **same batch**, ordered before the delete. Use **getExerciseList**. Pick a template that honors the constraint profile and that keeps the training intent of the day.

## Exercise objection

User pushback on one programmed movement (pain, equipment mismatch, cannot perform a position, wrong stimulus) is an **Exercise objection**. Replace in place. Never remove alone.

| Scope | Op |
|-------|-----|
| One slot / new movement + sets | **`edit_exercise`** (or **insert_exercise** + **delete_exercise** in the same Program mutation batch if needed) |
| Same template / equipment-only across the program (sets/rest stay) | **`swap_exercise_template`** (**Template swap**) |
| Explicit "remove X" / "skip X" only | **`delete_exercise`** |

**Lasting limit vs taste** (same turn as the replace when lasting):

| Wording | Profile update |
|---------|----------------|
| Injury / pain (for example "hurts my knee") | **`addInjuries`** + `rawStatement` |
| Missing equipment (for example "don't have cables") | **`addExcludedEquipment`** + `rawStatement` |
| Movement restriction (for example "no overhead", "can't kneel") | **`addChatRefinements`** + `rawStatement` |
| Taste-only (for example "too boring", "swap this") | **No** profile update - replace only |

## Checklist

- [ ] **Persist constraint changes** via **`updateConstraintProfile`** when this turn changes constraints (same turn as mutate - non-blocking backup).
- [ ] **Constraint gate** (above): persist (if needed) → honor Active Constraint Profile → compliance → no empty days.
- [ ] **Exercise objection:** replace/swap per table above. Lasting limits also update the profile. Taste-only does not.
- [ ] **readProgram** when you need the current program (weeks, days, exercises, sets, notes, reason). `hevyProgram.length` = N total routines (all weeks).
- [ ] Build **one operations array** with all registry ops for the requested change.
- [ ] **Equipment / template swaps** (dumbbell-only, barbell → dumbbell, variation replace across program): use **`swap_exercise_template`**. Use one op per `from_exercise_template_id`. Omit **folderIds** / **dayOrder** to hit every week and day.
- [ ] **Positional edits with new sets** (one slot, new prescription): use **`edit_exercise`** with grid payload (same shape as **insert_exercise**).
- [ ] For other edits that affect every week/day occurrence: include **folderIds** (and matching **dayOrder**) for each week, or one op with multiple **folderIds** when the change is identical.
- [ ] Call **mutateProgram** once with the full **operations** array.

## Live grid vs post-build periodization

- **Live-grid edit:** Call **readProgram** when you need the current program. Then call **mutateProgram** with **folderIds** (0-based week) and **dayOrder** (1-based day). Shorten or lengthen week count on an existing program with **delete_week** (highest week index first). Do **not** call **planProgram** or **buildWeek** for that. The batch is a **Mutation proposal** until the user Accepts. Visible reply is the ask (what you want to change), not a confirmation. Do **not** write "I've updated", "Your program is now", or that the grid already changed.
- **Periodization right after buildWeek:** Do **not** rely on **readProgram** (snapshot can still be empty). Use builder context, **planProgram**, **buildWeek** output, and the **build-program** skill. Use **one** **mutateProgram** batch via **folderIds**. Same-turn **buildWeek** + **mutateProgram** lands immediately.

## Targeting (mutateProgram)

Use registry operation ids only. Field details live in the **mutateProgram** tool description. Do not duplicate per-op tables here.

- **folderIds:** 0-based week index (`folder_id` on each routine). Week 1 → `[0]`, week W → `[W - 1]`. Multiple weeks: `[0, 1, 2, …]`. Always an **array**. Never use `folderId`.
- **dayOrder:** 1-based day within the week (`order` on the routine).
- **exerciseIndex:** **required** on every **insert_exercise** (0-based). Empty day → `0`. Append → `exercises.length` from **readProgram**. Multi-insert batch → rising indices (`0`, `1`, `2`…) as ops accumulate. Use **array position** in readProgram. Do not use a separate index field.
- **setIndex:** 0-based index on the sets of that exercise (for **update_set** only).
- **Sets in insert/edit payloads:** ordered `sets[]` array only. Indices come from array position (0-based). Optional `index` on each set is ignored.

**Week + day from builder context:** For week `w` (1-based) and day `d` (1-based): `folderIds: [w - 1]`, `dayOrder: d`. Program length = **daysPerWeek × programLength** routines total.

## Op selection

| Goal | Op |
|------|-----|
| Rename day (for example "Back Day") | **edit_day_title** |
| Rename + day notes | **edit_day_title** + **add_day_notes** |
| Replace one exercise slot (new movement + sets) | **edit_exercise** |
| Add exercise rows to a day | **insert_exercise** - **one `exercise` object per op**, not an `exercises` array |
| Remove a row | **delete_exercise** |
| Tweak reps / RPE / rest on existing set | **update_set** |
| Swap template, keep sets/rest | **swap_exercise_template** |

## Populate a training day

When the user wants a day type (for example "make day 1 a Back Day"): call **readProgram**, then one batch:

1. **edit_day_title** for the new name.
2. **insert_exercise** once per movement - one `exercise` per op. Keep existing warmups. Replace warmups only when the user asks for a replace.
3. Target **6-7 total exercise rows** per day (including 1-2 warmups). If the user asked for a short session, use fewer rows.

Multi-insert in one batch: ops apply in order on an accumulating program. Use rising **exerciseIndex** values (`0` on empty day, then `1`, `2`, …). Do not reuse the same index.

```json
{
  "operations": [
    { "op": "edit_day_title", "folderIds": [0], "dayOrder": 1, "title": "Back Day" },
    {
      "op": "insert_exercise",
      "folderIds": [0],
      "dayOrder": 1,
      "exerciseIndex": 0,
      "exercise": {
        "exercise_template_id": "TEMPLATE_ID",
        "rest_seconds": "90",
        "sets": [
          {
            "type": "normal",
            "reps": 8,
            "weight_kg": null,
            "rpe": 8,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null,
            "rep_range": null
          }
        ]
      }
    }
  ]
}
```

## Batch order

Operations run in **array order** (fail-all if any op is invalid):

1. Put **insert_exercise** (especially warmups at **exerciseIndex: 0**) before **update_set** / **edit_exercise** / **delete_exercise** on the same day.
2. Put **delete_exercise** / inserts at higher **exerciseIndex** before lower-index updates when indices shift.
3. Use **update_set** and **edit_day_title** for periodization-style tweaks. Use **insert_exercise** / **delete_exercise** only when structure changes.
4. Put **swap_exercise_template** before many positional **edit_exercise** calls when only the exercise template (equipment/variation) changes and sets/rest must stay.

## Template swap vs positional edit

| Goal | Op |
|------|-----|
| Replace all barbell bench with dumbbell bench (sets/rest unchanged) | **swap_exercise_template** |
| Change one exercise slot to a different movement **and** new sets/reps | **edit_exercise** |
| Tweak RPE/reps/rest on existing template | **update_set** |

**Dumbbell-only example** - after **readProgram**, one batch (omit **folderIds** / **dayOrder** for program-wide):

```json
{
  "operations": [
    { "op": "swap_exercise_template", "from_exercise_template_id": "SQUAT_BB", "to": { "exercise_template_id": "DCFF3E9F", "reason": "Dumbbell-only." } },
    { "op": "swap_exercise_template", "from_exercise_template_id": "BENCH_BB", "to": { "exercise_template_id": "3601968B" } }
  ]
}
```

Do **not** emit nine **edit_exercise** ops that re-specify every set when **swap_exercise_template** is enough.

## Supersets

Superset ops use the same targeting as every other **mutateProgram** op: **folderIds** + **dayOrder**. Never use `dayId` or per-routine `id` from **readProgram**.

- **create_superset** - group 2+ exercises on matching days. Args: `folderIds`, `dayOrder`, `exerciseIndexes` (0-based, min 2).
- **remove_from_superset** - detach one exercise from its superset. Args: `folderIds`, `dayOrder`, `exerciseIndex` (0-based).

**Detect supersets from readProgram:** exercises that share the same non-null `supersets_id` on a day are grouped. To remove all supersets on a day, emit one **remove_from_superset** per grouped exercise index.

**Program-wide ungroup** - one op per exercise index, each with every week in **folderIds** (not one op per week/day):

```json
{
  "operations": [
    { "op": "remove_from_superset", "folderIds": [0, 1, 2, 3, 4, 5, 6, 7], "dayOrder": 1, "exerciseIndex": 4 },
    { "op": "remove_from_superset", "folderIds": [0, 1, 2, 3, 4, 5, 6, 7], "dayOrder": 1, "exerciseIndex": 6 }
  ]
}
```

After **readProgram**, build **folderIds** from the `folder_id` of each routine for the target **dayOrder**. 8-week program → `[0, 1, 2, 3, 4, 5, 6, 7]`. Do **not** emit 16+ ops with different `dayId` values.

**create_superset** across every week - same pattern:

```json
{
  "operations": [
    { "op": "create_superset", "folderIds": [0, 1, 2, 3, 4, 5, 6, 7], "dayOrder": 2, "exerciseIndexes": [3, 4] }
  ]
}
```

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup exercises** are separate movements (IDs from **getExerciseList**) at the start of the day to prepare for the session. **Warmup sets** are lighter sets of the same working lift. When you add prep work, add **warmup exercises** with **`"normal"`** sets at low RPE. Do not add only extra `"warmup"`-typed sets on the main lift.

**Questionnaire preference:** If the Active Constraint Profile / questionnaire prefs say **Warmup exercises: no**, do **not** insert separate warmup exercise rows. If the user asks for warmups in this turn, you can insert them. If yes or unset, follow the rules below.

**Warmups increase the row count. They do not replace working exercises.** Prepend a warmup with **insert_exercise** at **exerciseIndex: 0**. That inserts an extra row. Existing working exercises shift index by one. All of them stay present. Never remove or omit a working exercise to "make room" for a warmup. If the user asks to replace it, then replace it.

- If the user reports an **injury, pain, or limitation**, or asks for better prep, make sure that each affected **training day** already begins with **1-2 appropriate warmup exercises**. If the day jumps straight into heavy work, add **1-2 warmup exercises**. Bias **two** when injury or limitation is present. If prefs say warmup exercises **no**, skip this.
- **Prepend** with **insert_exercise** at **exerciseIndex: 0** (before the current first exercise). To insert two warmups in order: **insert the first at index 0**, then **insert the second at index 1** (after the first insert shifts indices). Use **getExerciseList** for valid template IDs and titles. Match the movements of the day and any stated limitation.
- When the change must apply to **every week**, use **folderIds** that list every week index for that **dayOrder**. Example for day 1 every week in an 8-week program: `folderIds: [0, 1, 2, 3, 4, 5, 6, 7]`, `dayOrder: 1`. Do not edit only week 1.

## Program types

If the program or the requested changes are **powerlifting-focused**, load the powerlifting resource. Powerlifting focus includes squat, bench, deadlift, or programs "like" Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, and more. Use `readFile` to load `.agents/skills/mutate-program/resources/powerlifting.md`. Apply that knowledge when you build the **operations** batch. Preserve SBD emphasis, recovery, and style.

If the program or the requested changes are **bodybuilding- or hypertrophy-focused**, load the bodybuilding resource. That focus includes aesthetic goals, muscle building, PPL, upper/lower, bro split, or training by muscle group. Use `readFile` to load `.agents/skills/mutate-program/resources/bodybuilding.md`. Apply that knowledge when you build the **operations** batch. Preserve volume landmarks, exercise categories per muscle, rep ranges, and session structure as in the resource.

## Change program length (weeks)

**Existing program on the grid:** use **readProgram** + **mutateProgram** only. Do **not** call **planProgram** or **buildWeek**. Those tools are for **new** program creation, not for trim or lengthen of a live program.

- **Shorter program:** one **delete_week** per removed week. Use **folderIds: [weekIndex]** (0-based, same as routine `folder_id`). Emit one op per week. Delete **highest index first** so reindexing stays correct. Example for 8→2 weeks: `[7]`, `[6]`, `[5]`, `[4]`, `[3]`, `[2]` - keeps weeks 0 and 1.
- **Longer program:** agent cannot add whole weeks via **mutateProgram** (no **duplicate_week**). Tell the user to increase program length in the builder UI, then rebuild or duplicate weeks manually.

## Gotchas

- **folderIds vs folder_id:** **readProgram** returns `folder_id` on each routine. **mutateProgram** expects **folderIds** as an array. Week 3 → `folderIds: [2]`. Never use `folderId: 2`.
- **One exercise per insert_exercise:** Never pass `exercises: [...]`. Each new row needs its own `{ "op": "insert_exercise", "exercise": { … } }`.
- **Nested objects, not JSON strings:** Any object field (`exercise`, `to`, `set`, and more) must be a nested object in the tool call. Never stringify it.
- **All slot indices are 0-based:** `exerciseIndex`, `setIndex`, and `exercises[]` / `sets[]` array order. **`dayOrder`** is the Hevy day number (1-7), not an array index.
- **Never omit exerciseIndex:** Omitting it fails validation. That is not the same as UI append. Always pass an explicit number.
- **Supersets:** **create_superset** / **remove_from_superset** / **delete_day** all use **folderIds** + **dayOrder**. Never use `dayId`.
- **Program shape**: The live program is all routines across all weeks. Length N = **daysPerWeek × programLength** (for example 6×8 = 48). Target days with **folderIds** + **dayOrder**, not flat routine-index math.
- **Program-wide changes**: To change every occurrence (for example rename all "Push" to "Chest"), include **folderIds** for each week and the same **dayOrder**. You can also use one op with all relevant **folderIds**. Do not edit only the first week.
- **One batch, one call**: Pass a single **operations** array to **mutateProgram**. Do not split by week or make multiple **mutateProgram** calls for one logical edit.
- **readProgram staleness**: Snapshot is from **request start**. It does **not** refresh after **buildWeek** in the same turn. For post-**buildWeek** periodization, use the **build-program** skill (**buildWeek** output + **planProgram**), not **readProgram**.

## Rep ranges

`rep_range` is a first-class field on every set (`{start, end}`). **`rep_range` supersedes `reps` in the UI**. When `rep_range` is non-null the UI displays the range and ignores `reps`.

- When the program uses rep ranges, use **update_set** with the full **`rep_range`** object. Do not update only **reps**. Example: change 8-12 to 10-15 via `{ "op": "update_set", …, "set": { "rep_range": { "start": 10, "end": 15 } } }`.
- **Fixed-rep rule:** When you change to a fixed rep count (for example 5x5, singles, doubles, triples), set **`rep_range`: null**. Set **`reps`** to the fixed value in **update_set**. **NEVER** emit a degenerate `rep_range` where `start === end` (for example `{start: 5, end: 5}`). That displays as "5-5" in the UI. That is incorrect.

## Logged training history

When the user asks about **past logged workouts** while you edit their program, use **getWorkoutHistory**. Do not use **readProgram**. Past logged workouts include weights they actually lifted, session history, and stalls based on the training log. **readProgram** is the program grid. **getWorkoutHistory** is completed sessions from their Hevy backup. Pick a small limit based on what the user asks for. Pick an optional `since` date based on the question. Max: 30 workouts. If the user leaves out a number, default 15.

## Operations batch template

The following is **only** the payload shape for **mutateProgram**. Do **not** copy this block into user-visible assistant messages. The tool expects `{ "operations": [ … ] }` (not a bare array at the top level).

```json
{
  "operations": [
    { "op": "edit_day_title", "folderIds": [0, 1, 2], "dayOrder": 1, "title": "Push Day" },
    { "op": "update_set", "folderIds": [0], "dayOrder": 1, "exerciseIndex": 0, "setIndex": 0, "set": { "rep_range": { "start": 8, "end": 12 } } },
    { "op": "update_set", "folderIds": [0], "dayOrder": 1, "exerciseIndex": 0, "setIndex": 0, "set": { "reps": 12 } }
  ]
}
```
