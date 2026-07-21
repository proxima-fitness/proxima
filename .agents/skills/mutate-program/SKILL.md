---
name: mutate-program
description: >-
  Workflow for modifying an existing workout program. Load this skill when the
  user wants to change, edit, update, swap, rename, or remove exercises, sets,
  reps, days, or program length (e.g. "make it 2 weeks", "shorten to 4 weeks",
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

1. **Persist constraint changes:** If this turn (or recent unrecorded chat) adds, changes, or removes a constraint (injury, equipment, area, movement restriction, preference), also call **`updateConstraintProfile`** in the same turn with the add/remove fields and `rawStatement` when the user spoke in chat (prefer before **mutateProgram**, but do not block the edit waiting on it). Do not assume the Active Constraint Profile in the prompt is already written to Agentic memory.
2. **Honor Active Constraint Profile:** Use the **Active Constraint Profile** block in the system prompt as the constraint inventory. Do **not** re-derive constraints by scanning the full conversation alone — the profile is authoritative.
3. **Compliance check:** Verify each operation in your batch violates **none** of those profile constraints. Do not swap or insert templates that use excluded equipment or break stated movement restrictions.
4. **No empty days:** If **delete_exercise** (or removing the last exercise on a day) would leave a training day with **zero** exercise rows, find and add a suitable replacement **first** — **insert_exercise** or **edit_exercise** in the **same batch**, ordered before the delete. Use **getExerciseList**; pick a template that honors the constraint profile and preserves the day's training intent.

## Exercise objection

User pushback on one programmed movement (pain, equipment mismatch, can't perform a position, wrong stimulus) is an **Exercise objection** — replace in place, never lone removal.

| Scope | Op |
|-------|-----|
| One slot / new movement + sets | **`edit_exercise`** (or **insert_exercise** + **delete_exercise** in the same Program mutation batch if needed) |
| Same template / equipment-only across the program (sets/rest stay) | **`swap_exercise_template`** (**Template swap**) |
| Explicit "remove X" / "skip X" only | **`delete_exercise`** |

**Lasting limit vs taste** (same turn as the replace when lasting):

| Wording | Profile update |
|---------|----------------|
| Injury / pain (e.g. "hurts my knee") | **`addInjuries`** + `rawStatement` |
| Missing equipment (e.g. "don't have cables") | **`addExcludedEquipment`** + `rawStatement` |
| Movement restriction (e.g. "no overhead", "can't kneel") | **`addChatRefinements`** + `rawStatement` |
| Taste-only (e.g. "too boring", "swap this") | **No** profile update — replace only |

## Checklist

- [ ] **Persist constraint changes** via **`updateConstraintProfile`** when this turn changes constraints (same turn as mutate — non-blocking backup).
- [ ] **Constraint gate** (above): persist (if needed) → honor Active Constraint Profile → compliance → no empty days.
- [ ] **Exercise objection:** replace/swap per table above; lasting limits also update the profile; taste-only does not.
- [ ] **readProgram** when you need the current program (weeks, days, exercises, sets, notes, reason). `hevyProgram.length` = N total routines (all weeks).
- [ ] Build **one operations array** with all registry ops for the requested change.
- [ ] **Equipment / template swaps** (dumbbell-only, barbell → dumbbell, variation replace across program): use **`swap_exercise_template`** — one op per `from_exercise_template_id`; omit **folderIds** / **dayOrder** to hit every week and day.
- [ ] **Positional edits with new sets** (one slot, new prescription): use **`edit_exercise`** with grid payload (same shape as **insert_exercise**).
- [ ] For other edits affecting every week/day occurrence: include **folderIds** (and matching **dayOrder**) for each week—or one op with multiple **folderIds** when the change is identical.
- [ ] Call **mutateProgram** once with the full **operations** array.

## Live grid vs post-build periodization

- **Editing the live grid:** **readProgram** when you need the current program, then **mutateProgram** with **folderIds** (0-based week) and **dayOrder** (1-based day). Shorten/lengthen week count on an existing program with **delete_week** (highest week index first) — do **not** call **planProgram** or **buildWeek** for that.
- **Periodization right after buildWeek:** Do **not** rely on **readProgram** (snapshot may still be empty). Use builder context, **planProgram**, **buildWeek** output, and the **build-program** skill; **one** **mutateProgram** batch via **folderIds**.

## Targeting (mutateProgram)

Use registry operation ids only — field details live in the **mutateProgram** tool description; do not duplicate per-op tables here.

- **folderIds:** 0-based week index (`folder_id` on each routine). Week 1 → `[0]`, week W → `[W - 1]`. Multiple weeks: `[0, 1, 2, …]`. Always an **array** — never `folderId`.
- **dayOrder:** 1-based day within the week (`order` on the routine).
- **exerciseIndex:** **required** on every **insert_exercise** (0-based). Empty day → `0`. Append → `exercises.length` from **readProgram**. Multi-insert batch → rising indices (`0`, `1`, `2`…) as ops accumulate. Use **array position** in readProgram — not a separate index field.
- **setIndex:** 0-based index on that exercise’s sets (for **update_set** only).
- **Sets in insert/edit payloads:** ordered `sets[]` array only; indices assigned from array position (0-based). Optional `index` on each set is ignored.

**Week + day from builder context:** For week `w` (1-based) and day `d` (1-based): `folderIds: [w - 1]`, `dayOrder: d`. Program length = **daysPerWeek × programLength** routines total.

## Op selection

| Goal | Op |
|------|-----|
| Rename day (e.g. "Back Day") | **edit_day_title** |
| Rename + day notes | **edit_day_title** + **add_day_notes** |
| Replace one exercise slot (new movement + sets) | **edit_exercise** |
| Add exercise rows to a day | **insert_exercise** — **one `exercise` object per op**, not an `exercises` array |
| Remove a row | **delete_exercise** |
| Tweak reps / RPE / rest on existing set | **update_set** |
| Swap template, keep sets/rest | **swap_exercise_template** |

## Populate a training day

When the user wants a day type (e.g. "make day 1 a Back Day"): **readProgram**, then one batch:

1. **edit_day_title** for the new name.
2. **insert_exercise** once per movement — one `exercise` per op. Keep existing warmups unless replacing them.
3. Target **6–7 total exercise rows** per day (including 1–2 warmups) unless the user asked for a short session.

Multi-insert in one batch: ops apply in order on an accumulating program — use rising **exerciseIndex** values (`0` on empty day, then `1`, `2`, …), not the same index repeatedly.

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

## Supersets

Superset ops use the same targeting as every other **mutateProgram** op: **folderIds** + **dayOrder**. Never use `dayId` or per-routine `id` from **readProgram**.

- **create_superset** — group 2+ exercises on matching days. Args: `folderIds`, `dayOrder`, `exerciseIndexes` (0-based, min 2).
- **remove_from_superset** — detach one exercise from its superset. Args: `folderIds`, `dayOrder`, `exerciseIndex` (0-based).

**Detect supersets from readProgram:** exercises sharing the same non-null `supersets_id` on a day are grouped. To remove all supersets on a day, emit one **remove_from_superset** per grouped exercise index.

**Program-wide ungroup** — one op per exercise index, each with every week in **folderIds** (not one op per week/day):

```json
{
  "operations": [
    { "op": "remove_from_superset", "folderIds": [0, 1, 2, 3, 4, 5, 6, 7], "dayOrder": 1, "exerciseIndex": 4 },
    { "op": "remove_from_superset", "folderIds": [0, 1, 2, 3, 4, 5, 6, 7], "dayOrder": 1, "exerciseIndex": 6 }
  ]
}
```

After **readProgram**, build **folderIds** from each routine's `folder_id` for the target **dayOrder**. 8-week program → `[0, 1, 2, 3, 4, 5, 6, 7]`. Do **not** emit 16+ ops with different `dayId` values.

**create_superset** across every week — same pattern:

```json
{
  "operations": [
    { "op": "create_superset", "folderIds": [0, 1, 2, 3, 4, 5, 6, 7], "dayOrder": 2, "exerciseIndexes": [3, 4] }
  ]
}
```

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup exercises** are separate movements (IDs from **getExerciseList**) at the start of the day to prepare for the session. **Warmup sets** are lighter sets of the same working lift. When adding prep work, add **warmup exercises** with **`"normal"`** sets at low RPE—not only extra `"warmup"`-typed sets on the main lift.

**Questionnaire preference:** If the Active Constraint Profile / questionnaire prefs say **Warmup exercises: no**, do **not** insert separate warmup exercise rows unless the user explicitly asks for warmups in this turn. If yes or unset, follow the rules below.

**Warmups increase the row count — they do not replace working exercises.** Prepending a warmup with **insert_exercise** at **exerciseIndex: 0** inserts an extra row; existing working exercises shift index by one but are all still present. Never remove or omit a working exercise to "make room" for a warmup unless the user explicitly asks to replace it.

- If the user reports an **injury, pain, or limitation**, or asks for better prep, check whether each affected **training day** already begins with **1–2 appropriate warmup exercises**. If the day jumps straight into heavy work, add **1–2 warmup exercises** (bias **two** when injury or limitation is present) — unless prefs say warmup exercises **no**.
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
- **One exercise per insert_exercise:** Never pass `exercises: [...]`. Each new row needs its own `{ "op": "insert_exercise", "exercise": { … } }`.
- **Nested objects, not JSON strings:** Any object field (`exercise`, `to`, `set`, etc.) must be a nested object in the tool call — never stringify it.
- **All slot indices are 0-based:** `exerciseIndex`, `setIndex`, and `exercises[]` / `sets[]` array order. **`dayOrder`** is the Hevy day number (1–7), not an array index.
- **Never omit exerciseIndex:** Omitting it fails validation — not the same as UI append. Always pass an explicit number.
- **Supersets:** **create_superset** / **remove_from_superset** / **delete_day** all use **folderIds** + **dayOrder** — never `dayId`.
- **Program shape**: The live program is all routines across all weeks. Length N = **daysPerWeek × programLength** (e.g. 6×8 = 48). Target days with **folderIds** + **dayOrder**, not flat routine-index math.
- **Program-wide changes**: To change every occurrence (e.g. rename all "Push" to "Chest"), include **folderIds** for each week (or one op with all relevant **folderIds**) and the same **dayOrder**. Do not edit only the first week.
- **One batch, one call**: Pass a single **operations** array to **mutateProgram**. Do not split by week or make multiple **mutateProgram** calls for one logical edit.
- **readProgram staleness**: Snapshot is from **request start**; it does **not** refresh after **buildWeek** in the same turn. For post-**buildWeek** periodization, use the **build-program** skill (**buildWeek** output + **planProgram**), not **readProgram**.

## Rep ranges

`rep_range` is a first-class field on every set (`{start, end}`). **`rep_range` supersedes `reps` in the UI** — when `rep_range` is non-null the UI displays the range and ignores `reps`.

- When the program uses rep ranges, use **update_set** with the full **`rep_range`** object rather than only updating **reps**. Example: change 8–12 to 10–15 via `{ "op": "update_set", …, "set": { "rep_range": { "start": 10, "end": 15 } } }`.
- **Fixed-rep rule:** When changing to a fixed rep count (e.g. 5x5, singles, doubles, triples), set **`rep_range`: null** and set **`reps`** to the fixed value in **update_set**. **NEVER** emit a degenerate `rep_range` where `start === end` (e.g. `{start: 5, end: 5}`). That will display as "5-5" in the UI which is incorrect.

## Logged training history

When the user asks about **past logged workouts** (weights they actually lifted, session history, stalls based on training log) while editing their program, use **getWorkoutHistory** — not **readProgram**. **readProgram** is the program grid; **getWorkoutHistory** is completed sessions from their Hevy backup. Pick a small limit based on what the user asks for and optional `since` date based on the question. Max: 30 workouts, if user leaves out number default 15.

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
