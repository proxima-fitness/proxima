---
name: build-program
description: >-
  Workflow for creating a new workout program via Proxima MCP. Load when the user
  wants to create, build, or generate a new workout program, training program,
  or exercise routine from scratch. Do not use for shortening/lengthening an
  existing program — use mutate-program instead.
allowedTools:
  - list_programs
  - list_exercises
  - get_constraint_profile
  - get_training_profile
  - get_latest_body_measurement
  - update_constraint_profile
  - update_training_profile
  - build_program
  - read_program
---

# Build Program

Host-agent path: Claude + **Proxima MCP** only. Never call Vercel AI Gateway, `/api/chat`, or Andy sandbox tools.
**First build** via `build_program` lands the **Program prescription** immediately (not a **Mutation proposal**). After success, keep `program_id` for `read_program` / later mutate.
Week Export, Sync, Connect Hevy, and Hevy share import are **not** available here — send the user to Proxima web (ADR 0036).

Vocabulary: use **make sure** for the check / verify / confirm / validate concept. Do not use those other verbs for that concept.

## Program generation (build_program and mutate_program)

### Chat intake first (new program)

There is no questionnaire UI tool on MCP. For a **new** program:

1. Send a short **visible** reply.
2. Call **get_constraint_profile** and **get_training_profile** (and optionally **get_latest_body_measurement**).
3. If days/week, program length, injuries, excluded equipment, or goal are still unknown, ask only for the missing facts in chat — then wait.
4. On unlock (answers or explicit "Build my program"), continue with persist → **list_exercises** → **build_program**.

Do not invent a long form. Prefer saved Agentic memory when present.

### Training profile ask (not a new program)

If they ask to fill or edit **Training profile** and are **not** building a new program: ask for the fields in chat, then **update_training_profile**. Do not call **build_program**.

### Persist Constraint Profile (same turn, non-blocking)

If there is something to persist on the first unlock turn after chat intake or "Build my program", call **`update_constraint_profile` once**.
Persist non-empty Constraint profile fields from Agentic memory or this-turn answers that are not yet written.
Map health to `addInjuries` only when it is an **Injuries & health issues** entry (pain, injury, surgery, movement limit).
Before you add an injury, read the saved **Injuries & health issues** in the Active Constraint Profile. Do not add an entry that sounds very similar to one already there (for example "Knee pain" next to "knee pain when squatting", or "Bad lower back" next to "Lower back pain"). Keep the saved one.
Periodization, deload / peak / unload / taper week plans, and mesocycle notes go on the **Periodization wave** or `preferences` (`deloadWeek` / `peakWeek`), never `addInjuries`.
Map exclude equipment to `addExcludedEquipment`.
Map exclude areas to `addExcludedAreas`.
Map split, variability, progression, deload, peak, and warmup to `preferences` (catalog id to set).
On a **User-stated change** that drops a preference (for example "I no longer have a split preference", clear deload preference), pass `preferences: { splitType: null }` (or the matching key). Do not "relax" a preference by swapping to Full Body / `fb` — that is a set, not a clear.
Array clears stay on `removeInjuries` / `removeExcludedEquipment` / `removeExcludedAreas`.
Never clear an injury, excluded equipment, excluded area, or preference to make a template feasible. Adapt the program to a saved injury, excluded equipment, or excluded area. If this turn names a different preferred split, exercise variability, or warmup, build that and leave the saved preference in place unless it is a User-stated change.
Program length and days per week are not cleared through this tool.
This call is a background backup.
Do not delay or block **list_exercises** or **build_program** while you wait for it.
Constraints in the Active Constraint Profile are not always persisted.
If those fields are non-empty and not yet written, call the tool.
If every field is empty (for example, the user gave no constraint answers), do not call `update_constraint_profile`.
Empty updates are noise.

### Persist Training Profile (same turn, non-blocking)

If Questionnaire advanced or Active Training Profile fields are non-empty on that same unlock turn, call **`update_training_profile` once**.
Those fields are age, sex, heightCm, experienceLevel, physiquePhase, trainingFocus, activityLevel, and sessionDurationMin.
On a **User-stated change** that clears a person fact (prefer-not-to-say sex, clear my age), pass `null` for that field only.
Never clear a Training profile field to unlock a program style. Program length and days per week are not cleared through this tool.
This call is also a background backup.
Do not block plan, list, or build for it.
If every Training profile field is empty, do not call `update_training_profile`.

### build_program once

After **list_exercises**, call **build_program** once with the plan (`durationWeeks`, `daysPerWeek`, `goal`, `blocks`, required `periodizationWave`, optional `notes`) and week 1 only, with an **Exercise role** on every exercise row.
Code copies week 1 across the program length and applies the **Periodization wave** from that same call.
The whole program lands in that one step. **Periodization** is the wave, not a follow-up edit.

- **Success:** prescription persisted; tool returns `program_id`. Do not call **build_program** again. Later edits → **mutate-program** skill + `mutate_program`.
- **Soft-fail:** the grid is unchanged. Fix what the error names, then call **build_program** again with the full input. If the wave caused it, send a corrected wave on that call.
- **Program stalemate** (the same miss twice): stop tools. Visible reply naming the lift and limit; offer replace-lift (keep limit) or remove-limit (**User-stated change**). Wait for their choice, then retry **build_program**.

### After a Program stalemate

- Replace lift: keep the limit; **list_exercises** if needed; rewrite week 1; **build_program** again.
- Remove limit: **update_constraint_profile** `removeInjuries` / `removeExcludedEquipment`, then **build_program** again.
- Clear a preference on **User-stated change**: `preferences: { splitType: null }` (or matching key) — never wipe via Full Body / `fb`.

## Checklist

**STOP - Chat intake gate.**
If facts needed for the build are missing, ask in chat and wait. Do not call **list_exercises** or **build_program** until unlock.

- [ ] **New program:** Brief visible message. **get_constraint_profile** + **get_training_profile**. Ask only for missing facts; wait if needed.
- [ ] Do **not** call **list_exercises** / **build_program** until answers or explicit go-ahead.
- [ ] **Persist Constraint Profile:** If there are non-empty fields to persist on the unlock turn, call **`update_constraint_profile` once**. Keep this on the same turn as plan, list, and build. Do not block those tools. If every field is empty, skip the call.
- [ ] **Persist Training Profile:** If Questionnaire advanced or Training profile fields are non-empty on the unlock turn, call **`update_training_profile` once**. Keep this on the same turn. Do not block plan, list, or build. If every field is empty, skip the call.
- [ ] **Plan:** decide duration, blocks, and the **Periodization wave** (see **Periodization wave** below). They go on the **build_program** call. Use chat intake + Agentic memory (days per week, weeks). If powerlifting, bodybuilding, hyrox, crossfit, or weight-loss resources are loaded, use them.
- [ ] Call **list_exercises** (paginated catalog) and pick ids/titles from the result. Obey stated days/week and program length.
- [ ] Select exercises from the returned list (`id: title`). Use only IDs that appear in the list.
- [ ] Call **build_program** once for week 1 only. Set `routines.length` to totalDays. Set `dayNumber` from 1 to N in order. Put a `role` on every exercise. Send the plan fields and `periodizationWave` on the same call, aligned with the week.
- [ ] Empty training days are rejected.
- [ ] **Soft-fail:** follow **build_program once** above (fix week 1, the wave, or both, then a full **build_program** again).
- [ ] **Exercise variability `lots`:** see **Exercise variability** below for the **Block boundary** swaps.
- [ ] After success: short summary (max 5 bullets). Return/store `program_id`. It already landed — not a **Mutation proposal**; no Accept.

## Tool dependency rule

**list_exercises** and **build_program** wait on chat intake (or explicit go-ahead).
Do not pre-fetch the exercise list.
On unlock, **`update_constraint_profile`** / **`update_training_profile`** are same-turn backups and do not gate plan, list, or build.
After success, store returned `program_id` — there is no vault default.

## Hevy / export (out of scope here)

Do not claim Week Export, Re-Export, Sync, Connect Hevy, or Hevy share import/load work in Claude. Point the user to Proxima web (ADR 0036).

## Warmup exercises vs warmup sets

A **warmup exercise** is its own row (a movement from list_exercises at the start of the day) with set type `"normal"`.
A **warmup set** is a lighter set on a working lift; use set type `"warmup"` only for those.

## Target RPE and stimulus (hypertrophy programs)

- On bodybuilding or hypertrophy programs, put a **numeric target `rpe`** on **every working set** row in **build_program**. For warmup exercises and intentional easy work, use **~3-5 RPE**. Numeric RPE makes prescriptions auditable and powers program **stimulus** checks in the scorecard.
- Do **not** imply that “more sets always equals more growth” without effort context. When it fits, tie weekly set choices in **`reason`** text to **hard-set quality** and to the user’s phase. Examples: primary compounds ~1-2 RIR / ~7-8.5 RPE. Isolations can be somewhat harder.
- **Deload or easy weeks:** Reduce stimulus on the **Periodization wave** with **fewer working sets**, **lower target RPE**, or both. Name the block for what it is (for example "Deload", intent "reduce fatigue") so the lower stimulus reads as **intentional**. See `resources/stimulus-and-volume.md` for the shared vocabulary.

## Periodization wave

The `periodizationWave` on **build_program** is how later weeks differ from week 1. It is required. Code applies it on that same call. See the **build_program** schema for field details.

- One row per week, `1..durationWeeks`. Week 1 is the baseline: `main` deltas both `0`, no `accessory`, no `mainRepRange`.
- `main`: `rpeDelta` and `setCountDelta` from week 1, applied to every `main` row. Every week after week 1 needs a non-zero main delta (or a `mainRepRange` on a **Block boundary**). The schema rejects a later week with both main deltas `0` and no `mainRepRange`.
- Working-set count floors at **1**. A deload or peak with a large negative `setCountDelta` may leave one working set; do **not** inflate week-1 baselines just to absorb that delta.
- `accessory`: only on weeks whose block is a deload, unload, taper, or peak, and required there.
- `mainRepRange`: only on a **Block boundary** (first week of a block after week 1), when the new block changes the rep target.
- Special weeks are easier or harder work: RPE and sets on the wave. Keep day titles as they are. The block name carries "Deload" or "Peak", not the days.
- Code checks the claim against the week before the block. A deload / unload / taper / recovery week needs lower main `rpeDelta` and/or `setCountDelta` than that week's row, and raises neither. A peak week needs a higher main `rpeDelta` than that week's row, or more sets with no lower RPE. Never copy the deload row onto a peak.

Peak before a deload (6 weeks; rows only). Week 5 is harder than week 4; week 6 is easier than week 5:

```json
[
  { "week": 4, "main": { "rpeDelta": 1, "setCountDelta": 1 } },
  { "week": 5, "main": { "rpeDelta": 2, "setCountDelta": 0 }, "accessory": { "rpeDelta": 0, "setCountDelta": -1 } },
  { "week": 6, "main": { "rpeDelta": -2, "setCountDelta": -1 }, "accessory": { "rpeDelta": -2, "setCountDelta": -1 } }
]
```

When mains have no RPE, `rpeDelta` cannot make a peak harder; raise `setCountDelta` above the prior week instead.

**Constraint profile preferences** shape the blocks and the wave when set: a yes on `deloadWeek` adds a deload block, and a yes on `peakWeek` adds a peak block before the end. If **Questionnaire advanced** was skipped, you still write a full wave yourself (for example, a steady RPE or set climb with a deload when the program is long enough). Code never fills in a wave for you.

## Exercise variability

- **`little` / `some`** (or unset): the same lifts every week. The wave changes the work, not the movements.
- **`lots`**: write a richer week 1 with more distinct movements across the days. Change lifts only at a **Block boundary**, with **swap_exercise_template** through **mutate_program**, `folderIds` covering the weeks from that boundary on. Never swap every week, and never through the wave.

## Program types

If the user wants a **powerlifting** program (squat, bench, deadlift), load `resources/powerlifting.md` by reading the file.
If they want a program "like" or "similar to" a known one, load the same file (for example, Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, Candito, Smolov, nSuns, Bullmastiff, Calgary Barbell).
If they mention periodization, peaking, or meet prep, load the same file.
Use that knowledge for the plan, the exercise selection, and the week build.

If the user wants a **bodybuilding** or **hypertrophy** program (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), load `resources/bodybuilding.md` **and** `resources/stimulus-and-volume.md` by reading the file.
Use that knowledge for the plan, the exercise selection, and the week build.

If the user wants a **fat-loss-first** or **weight-loss** program (cutting, leaning out, calorie deficit, body recomposition emphasis), load these weight-loss resources by reading the file:
`resources/weight-loss/diet.md`,
`resources/weight-loss/cardio-exercise.md`,
and `resources/weight-loss/lifting-program.md`.
Also load `resources/bodybuilding.md` and `resources/stimulus-and-volume.md` for muscle volumes, effort expectations, and exercise selection.
Use that knowledge for the plan, the exercise selection, and the week build.
**Exception:** If they explicitly want **powerlifting-style** fat loss (meet prep cut, S/B/D focus), read `resources/powerlifting.md` as appropriate.
Still use the weight-loss resources for nutrition, cardio, and how lifting fits a deficit.

If the user wants a **Hyrox** program, load `resources/hyrox.md` by reading the file.
That includes Hyrox prep, Hyrox race, indoor fitness racing in the Hyrox format, or named Hyrox stations such as SkiErg, sled push/pull, farmers carry, sandbag lunges, and wall balls.
Use that knowledge for the plan, the exercise selection, and the week build.
If they also want **fat loss** or **general muscle** work, you can combine with `resources/weight-loss/` or `bodybuilding.md` **only as secondary** to Hyrox-specific run-and-station priorities.

If the user wants **CrossFit**, **CrossFit-style**, **GPP**, a **WOD** or **metcon** program, or formats like **AMRAP** / **EMOM** / **for time**, load `resources/crossfit.md` by reading the file.
If they reference **benchmark-style** couplets or chipper-style workouts, load the same file (without full reproduction of trademarked workouts).
Use that knowledge for the plan, the exercise selection, and the week build.
If they also want **bodybuilding**, **powerlifting**, or **weight-loss** emphasis, and that work is secondary to their stated CrossFit-style goals, you can combine with `bodybuilding.md`, `powerlifting.md`, or `resources/weight-loss/`.

## Gotchas

- **Program length on existing grid:** If the user already has routines and asks to change duration (for example, "make it 2 weeks", "8 weeks → 2 weeks"), load **mutate-program** and use **delete_week**. Never use **build_program** for that. **build_program** `durationWeeks` and builder **programLength** describe the plan or template. They do not remove weeks from the live grid.
- **exercise_template_id**: Must be an exact ID from the list_exercises result (must exist in `hevy_exercise_templates`). Invented or unknown IDs cause **build_program** to return an error.
- **Exercise title (per exercise)**: Must be the **same title** as in list_exercises for that ID. If you pass `exercise_template_id`, the server **auto-corrects** the title from the database. Mismatches do not break the build. Still copy **id** and **title** exactly from the list for clarity and to avoid invalid IDs.
- **Tool input**: build_program expects a JSON object, not a string. Pass the structured object to the tool, not a stringified JSON.
- **routines.length**: Must exactly equal totalDays. Mismatches return a validation error from the tool.
- **First week only**: Code copies week 1 across all weeks and applies the wave. Build only one week in a single build_program call. Do not emit multiple weeks in build_program.
- **read_program after build_program**: The **read_program** snapshot is from request start, so it does not show a program built this turn. Target a same-turn **mutate_program** from **build_program** output with **folderIds** (0-based week) and **dayOrder** (1-based day).

## Rep ranges

`rep_range` is an object with `start` and `end` (for example, `{start: 8, end: 12}` for an 8-12 rep range).
**`rep_range` supersedes `reps` in the UI**. If `rep_range` is non-null, the UI shows the range and ignores `reps`.

- Use `rep_range` for all hypertrophy or bodybuilding sets and most strength accessories where a true range is intended (for example, 8-12, 10-15). When you provide `rep_range`, also set `reps` as a fallback (typically the upper bound of the range, for example `12`).
- **Fixed-rep rule:** When the prescription is a single fixed rep count (for example, 5x5, triples, doubles, singles, AMRAP-style sets), set `rep_range` to **null** and only use `reps`. **NEVER** emit a degenerate `rep_range` where `start === end` (for example, `{start: 5, end: 5}`). That displays as "5-5" in the UI, which is incorrect. Use `rep_range: null, reps: 5` instead.
- When editing rep ranges via **mutate_program**, use **update_set** with the full `{start, end}` **rep_range** object. Do not send only `start` or only `end`. To change from a range to fixed reps, set **rep_range** to **null** and **reps** to the fixed value in the same or follow-up **update_set** op.

## build_program shape

Use this structure.
Set type must be one of "normal", "warmup", "dropset", "failure".
Optional fields (`rest_seconds`, `supersets_id`, `weight_kg`) have defaults in the tool schema.
**Warmup exercises** at the start of the day still use **`"normal"`** set types at low RPE (see **Warmup exercises vs warmup sets** above).
If the schema calls for lighter sets *within* a working exercise, reserve set `type` `"warmup"` for those sets.
Every exercise needs a `role`: `main` for the lifts the wave progresses, `accessory` for the rest, `warmup` for warmup rows.

For each exercise **`reason`**, write 2-4 sentences of natural prose.
Cover what the movement does, where it sits in the split, its position in the session, and how it fits this person’s plan or questionnaire answers.
Be concrete.
Name real facts (stated limitation, equipment, sessions per week, goal, experience).
No bullet labels are required.

This is example JSON.
Do not use the example values to influence the real **build_program** tool response.

```json
{
  "durationWeeks": 4,
  "daysPerWeek": 3,
  "goal": "<primary goal in plain language>",
  "blocks": [
    { "name": "Accumulation", "weeks": [1, 2, 3], "intent": "Build volume" },
    { "name": "Deload", "weeks": [4], "intent": "Reduce fatigue" }
  ],
  "periodizationWave": {
    "weeks": [
      { "week": 1, "main": { "rpeDelta": 0, "setCountDelta": 0 } },
      { "week": 2, "main": { "rpeDelta": 1, "setCountDelta": 0 } },
      { "week": 3, "main": { "rpeDelta": 1, "setCountDelta": 1 } },
      { "week": 4, "main": { "rpeDelta": -2, "setCountDelta": -1 }, "accessory": { "rpeDelta": -2, "setCountDelta": -1 } }
    ]
  },
  "totalDays": 3,
  "routines": [
    {
      "dayNumber": 1,
      "title": "Push Day",
      "notes": "",
      "exercises": [
        {
          "exercise_template_id": "<warmup exercise id from list_exercises>",
          "title": "<exact title from list_exercises for that id>",
          "sets": [
            { "type": "normal", "reps": 15, "rep_range": { "start": 10, "end": 15 }, "rpe": 4 }
          ],
          "role": "warmup",
          "reason": "Shoulder and upper-back activation before any pressing. This is the first movement on Push day, so it primes the rotator cuff while the nervous system is still fresh. Low RPE prep work - you wanted a brief warm-up on every session before loading the shoulders."
        },
        {
          "exercise_template_id": "<id from list_exercises>",
          "title": "<exact title from list_exercises for that id; server overwrites with canonical DB title if different>",
          "sets": [
            { "type": "normal", "reps": 12, "rep_range": { "start": 8, "end": 12 }, "rpe": 8 }
          ],
          "role": "main",
          "reason": "A heavy horizontal push; you said bench irritates front shoulders, so elbows stay tucked and ROM controlled, not wide-flare max width. Primary pressing here so pull day can prioritize rows/hinges without doubling anterior fatigue same day. Heaviest compound while groove is freshest; flyes/cables after on purpose. Drives this session's chest volume before accessories."
        }
      ]
    }
  ]
}
```
