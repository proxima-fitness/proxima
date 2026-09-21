---
name: build-program
description: >-
  Workflow for creating a new workout program. Load this skill when the user
  wants to create, build, or generate a new workout program, training program,
  or exercise routine from scratch. Do not use for shortening/lengthening an
  existing program on the grid - use mutate-program instead.
allowedTools:
  - planProgram
  - getExerciseList
  - getMoreInfoQuestions
  - updateConstraintProfile
  - updateTrainingProfile
  - buildWeek
  - mutateProgram
---

# Build Program

Vocabulary: use **make sure** for the check / verify / confirm / validate concept. Do not use those other verbs for that concept.

## Program generation (buildWeek and mutateProgram)

### Questionnaire first (new program)

If the user wants to **create** a new workout program, send a short **visible** reply first.
This includes the **first** message in a new chat.
Then call **getMoreInfoQuestions** before **planProgram**, **getExerciseList**, **buildWeek**, or **mutateProgram**.
Read the tool result:
- **No questions / gate not needed:** continue this turn with persist (if anything to write), then **planProgram**, **getExerciseList**, **buildWeek**.
- **Questions opened:** stop and wait until they finish the questionnaire or send an explicit go-ahead (for example, "Build my program").
Do not invent extra questions. The tool already picked the subset.

### Training profile ask (not a new program)

If they ask to fill or edit **Training profile**, including "update my profile" or "edit my info", and they are **not** asking to build a new program, call **getMoreInfoQuestions**.
Wait for submit.
After they submit, call **updateTrainingProfile** if there are fields.
Do not call **planProgram** or **buildWeek**.

### Persist Constraint Profile (same turn, non-blocking)

If there is something to persist on the first unlock turn after questionnaire submit or "Build my program", call **`updateConstraintProfile` once**.
Persist non-empty questionnaire fields from the Active Constraint Profile or request context that are not yet written to Agentic memory.
Map health to `addInjuries` only when it is an **Injuries & health issues** entry (pain, injury, surgery, movement limit).
Periodization, deload / peak / unload / taper week plans, and mesocycle notes go on the **Periodization wave** or `preferences` (`deloadWeek` / `peakWeek`), never `addInjuries`.
Map exclude equipment to `addExcludedEquipment`.
Map exclude areas to `addExcludedAreas`.
Map split, variability, progression, deload, peak, and warmup to `preferences`.
This call is a background backup.
Do not delay or block **planProgram**, **getExerciseList**, or **buildWeek** while you wait for it.
Constraints in the Active Constraint Profile are not always persisted.
If those fields are non-empty and not yet written, call the tool.
If every field is empty (for example, the user skipped the questionnaire with no answers), do not call `updateConstraintProfile`.
Empty updates are noise.

### Persist Training Profile (same turn, non-blocking)

If Questionnaire advanced or Active Training Profile fields are non-empty on that same unlock turn, call **`updateTrainingProfile` once**.
Those fields are age, sex, heightCm, experienceLevel, physiquePhase, trainingFocus, activityLevel, and sessionDurationMin.
This call is also a background backup.
Do not block plan, list, or build for it.
If every Training profile field is empty, do not call `updateTrainingProfile`.

### buildWeek once

After **getExerciseList**, call **buildWeek** once, for week 1 only, with an **Exercise role** on every exercise row.
Code copies week 1 across the program length and applies the **Periodization wave** from **planProgram**.
The whole program lands in that one step. **Periodization** is the wave, not a follow-up edit.

- **Success:** the program is on the grid. Do not call **buildWeek** again. Changes the user asks for later go through **mutateProgram**.
- **Soft-fail:** the grid is unchanged. Fix what the error names, then call **buildWeek** again. If the wave caused it, call **planProgram** again this turn with a corrected wave first.
- **Program stalemate** (the same miss twice): stop calling tools. Write a short visible reply. The card on screen is the user's move.

## Checklist

**STOP - Questionnaire Gate.**
If this is a new program request, call **getMoreInfoQuestions**.
If the tool returns no questions, continue.
If questions opened, terminate your response and wait.
Do not reason about exercise selection before the user provides the data when questions are open.
Do not call **getExerciseList** or **planProgram** before that data arrives, unless the gate was not needed.
Treat an open questionnaire as a **gate**.
A fresh user message must unlock an open gate.

- [ ] **New program:** Send a brief visible message. Then call **getMoreInfoQuestions** immediately.
- [ ] If questions opened, do **not** call **planProgram**, **getExerciseList**, **buildWeek**, or **mutateProgram** yet. If the questionnaire is done, the gate was not needed, or the user clearly continues (for example, "Build my program"), continue with the steps below.
- [ ] **Persist Constraint Profile:** If there are non-empty fields to persist on the unlock turn, call **`updateConstraintProfile` once**. Keep this on the same turn as plan, list, and build. Do not block those tools. If every field is empty, skip the call.
- [ ] **Persist Training Profile:** If Questionnaire advanced or Training profile fields are non-empty on the unlock turn, call **`updateTrainingProfile` once**. Keep this on the same turn. Do not block plan, list, or build. If every field is empty, skip the call.
- [ ] **planProgram:** duration, blocks, and the **Periodization wave** (see **Periodization wave** below). Use questionnaire answers and program builder context (days per week, weeks). If powerlifting, bodybuilding, hyrox, crossfit, or weight-loss resources are loaded, use them.
- [ ] Call **getExerciseList** with the user requirements. If program builder context has days per week or program length, obey that context.
- [ ] Select exercises from the returned list (`id: title`). Use only IDs that appear in the list.
- [ ] Call **buildWeek** once for week 1 only. Set `routines.length` to totalDays. Set `dayNumber` from 1 to N in order. Put a `role` on every exercise. Align the structure with **planProgram**.
- [ ] Empty training days are rejected.
- [ ] **Soft-fail:** follow **buildWeek once** above (fix, optionally **planProgram** again, then **buildWeek**).
- [ ] **Exercise variability `lots`:** see **Exercise variability** below for the **Block boundary** swaps.
- [ ] After success: write a short summary (max 5 bullets) of the program that is now on the grid. It already landed, so this is not a **Mutation proposal** and there is nothing to Accept.

## Tool dependency rule

**getExerciseList** and **planProgram** depend on the questionnaire output.
Do not call them before the questionnaire is answered.
That wastes context and violates the workflow.
Do not pre-fetch the exercise list.
Do not begin planning early.
Wait for the user's questionnaire answers or an explicit go-ahead first.
If each profile has non-empty fields to persist on the unlock turn, call **`updateConstraintProfile`** and **`updateTrainingProfile`** as same-turn backups.
Those backups do not gate plan, list, or build.

## Hevy share links as reference

If the user backs a build request with a **public Hevy share link** (for example, "build me something like this"), call **fetchHevyShareFolder** to read it.
Accepted hosts include `hevy.com/folder/…`, `hevy.com/routine/…`, and `hevy.com/workout/…`.
Use the share as planning context: split shape, day count, exercise selection, and set and rep style.
A **workout** link is a completed session log (what was actually lifted that day).
It is not a prescribed split.
Use it for volume and exercise clues only.
Do not treat it as programming.

Reading a share gathers context.
You can call it on the questionnaire-gate turn with **getMoreInfoQuestions**.
It is not building.

Then use the normal workflow: **planProgram** → **getExerciseList** → **buildWeek**.
The share is a reference, not the program.
Never treat **fetchHevyShareFolder** output as days already on the grid.
Never claim that you loaded the share onto the grid.
If the user wants that shared folder itself on the grid rather than a program inspired by it, say so plainly and wait for an explicit yes.
Do not build around it in silence.

### Loading the share instead of building from it

If they want the shared week itself, use **importHevyShareFolder** with `confirmed: true`.
That path is not this workflow.
It needs an **empty** grid and their explicit yes.
It is **not** gated behind **getMoreInfoQuestions**.
After a share is loaded, the week is already on the grid.
Do **not** call **buildWeek** to recreate it.
Use **mutateProgram** for edits.
Expanding that seed to more weeks is a **separate ask**.
Offer it and wait for a yes.

### Expanding that seed

Expanding a loaded share is **First build**, not an edit.
The seeded week is week 1.
Code copies it across the program and applies your **Periodization wave**, same as a new build.

1. Call **readProgram** for each seeded day's `order` and exercise positions.
2. Call **planProgram** with the length, blocks, and a **Periodization wave**.
3. Call **buildWeek** with **expandHevyShareSeed** only: one **Exercise role** per seeded exercise, every day. Leave out `totalDays` and `routines`.

Do not re-author the seeded week in `routines`.
Do not periodize it with **mutateProgram**.
The same sanity check and **Program stalemate** apply as on any **First build**.

Shared sets often have no RPE.
`rpeDelta` cannot move a set that has none, so lean on `setCountDelta` (and `mainRepRange` at a **Block boundary**) for those weeks.

## Warmup exercises vs warmup sets

A **warmup exercise** is its own row (a movement from getExerciseList at the start of the day) with set type `"normal"`.
A **warmup set** is a lighter set on a working lift; use set type `"warmup"` only for those.

## Target RPE and stimulus (hypertrophy programs)

- On bodybuilding or hypertrophy programs, put a **numeric target `rpe`** on **every working set** row in **buildWeek**. For warmup exercises and intentional easy work, use **~3-5 RPE**. Numeric RPE makes prescriptions auditable and powers program **stimulus** checks in the scorecard.
- Do **not** imply that “more sets always equals more growth” without effort context. When it fits, tie weekly set choices in **`reason`** text to **hard-set quality** and to the user’s phase. Examples: primary compounds ~1-2 RIR / ~7-8.5 RPE. Isolations can be somewhat harder.
- **Deload or easy weeks:** Reduce stimulus on the **Periodization wave** with **fewer working sets**, **lower target RPE**, or both. Name the block for what it is (for example "Deload", intent "reduce fatigue") so the lower stimulus reads as **intentional**. See `.agents/skills/build-program/resources/stimulus-and-volume.md` for the shared vocabulary.

## Periodization wave

The wave on **planProgram** is how later weeks differ from week 1. Code applies it at **buildWeek**. See the **planProgram** schema for field details.

- One row per week, `1..durationWeeks`. Week 1 is the baseline: `main` deltas both `0`, no `accessory`, no `mainRepRange`.
- `main`: `rpeDelta` and `setCountDelta` from week 1, applied to every `main` row. Every week after week 1 needs a non-zero main delta, or its mains are a copy of week 1 and the build Soft-fails.
- Working-set count floors at **1**. A deload or peak with a large negative `setCountDelta` may leave one working set; do **not** inflate week-1 baselines just to absorb that delta.
- `accessory`: only on weeks whose block is a deload, unload, taper, or peak, and required there.
- `mainRepRange`: only on a **Block boundary** (first week of a block after week 1), when the new block changes the rep target.
- Special weeks are easier or harder work: RPE and sets on the wave. Keep day titles as they are. The block name carries "Deload" or "Peak", not the days.

**Constraint profile preferences** shape the blocks and the wave when set: a yes on `deloadWeek` adds a deload block, and a yes on `peakWeek` adds a peak block before the end. A skipped **Questionnaire advanced** still gets a default wave (for example, a steady RPE or set climb with a deload when the program is long enough).

## Exercise variability

- **`little` / `some`** (or unset): the same lifts every week. The wave changes the work, not the movements.
- **`lots`**: write a richer week 1 with more distinct movements across the days. Change lifts only at a **Block boundary**, with **swap_exercise_template** through **mutateProgram**, `folderIds` covering the weeks from that boundary on. Never swap every week, and never through the wave.

## Program types

If the user wants a **powerlifting** program (squat, bench, deadlift), load `.agents/skills/build-program/resources/powerlifting.md` with `readFile`.
If they want a program "like" or "similar to" a known one, load the same file (for example, Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, Candito, Smolov, nSuns, Bullmastiff, Calgary Barbell).
If they mention periodization, peaking, or meet prep, load the same file.
Use that knowledge for the plan, the exercise selection, and the week build.

If the user wants a **bodybuilding** or **hypertrophy** program (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), load `.agents/skills/build-program/resources/bodybuilding.md` **and** `.agents/skills/build-program/resources/stimulus-and-volume.md` with `readFile`.
Use that knowledge for the plan, the exercise selection, and the week build.

If the user wants a **fat-loss-first** or **weight-loss** program (cutting, leaning out, calorie deficit, body recomposition emphasis), load these weight-loss resources with `readFile`:
`.agents/skills/build-program/resources/weight-loss/diet.md`,
`.agents/skills/build-program/resources/weight-loss/cardio-exercise.md`,
and `.agents/skills/build-program/resources/weight-loss/lifting-program.md`.
Also load `.agents/skills/build-program/resources/bodybuilding.md` and `.agents/skills/build-program/resources/stimulus-and-volume.md` for muscle volumes, effort expectations, and exercise selection.
Use that knowledge for the plan, the exercise selection, and the week build.
**Exception:** If they explicitly want **powerlifting-style** fat loss (meet prep cut, S/B/D focus), load `powerlifting.md` as appropriate.
Still use the weight-loss resources for nutrition, cardio, and how lifting fits a deficit.

If the user wants a **Hyrox** program, load `.agents/skills/build-program/resources/hyrox.md` with `readFile`.
That includes Hyrox prep, Hyrox race, indoor fitness racing in the Hyrox format, or named Hyrox stations such as SkiErg, sled push/pull, farmers carry, sandbag lunges, and wall balls.
Use that knowledge for the plan, the exercise selection, and the week build.
If they also want **fat loss** or **general muscle** work, you can combine with `.agents/skills/build-program/resources/weight-loss/` or `bodybuilding.md` **only as secondary** to Hyrox-specific run-and-station priorities.

If the user wants **CrossFit**, **CrossFit-style**, **GPP**, a **WOD** or **metcon** program, or formats like **AMRAP** / **EMOM** / **for time**, load `.agents/skills/build-program/resources/crossfit.md` with `readFile`.
If they reference **benchmark-style** couplets or chipper-style workouts, load the same file (without full reproduction of trademarked workouts).
Use that knowledge for the plan, the exercise selection, and the week build.
If they also want **bodybuilding**, **powerlifting**, or **weight-loss** emphasis, and that work is secondary to their stated CrossFit-style goals, you can combine with `bodybuilding.md`, `powerlifting.md`, or `.agents/skills/build-program/resources/weight-loss/`.

## Gotchas

- **Program length on existing grid:** If the user already has routines and asks to change duration (for example, "make it 2 weeks", "8 weeks → 2 weeks"), load **mutate-program** and use **delete_week**. Never use **planProgram** or **buildWeek** for that. **planProgram.durationWeeks** and builder **programLength** describe the plan or template. They do not remove weeks from the live grid.
- **exercise_template_id**: Must be an exact ID from the getExerciseList result (must exist in `hevy_exercise_templates`). Invented or unknown IDs cause **buildWeek** to return an error.
- **Exercise title (per exercise)**: Must be the **same title** as in getExerciseList for that ID. If you pass `exercise_template_id`, the server **auto-corrects** the title from the database. Mismatches do not break the build. Still copy **id** and **title** exactly from the list for clarity and to avoid invalid IDs.
- **Tool input**: buildWeek expects a JSON object, not a string. Pass the structured object to the tool, not a stringified JSON.
- **routines.length**: Must exactly equal totalDays. Mismatches return a validation error from the tool.
- **First week only**: Code copies week 1 across all weeks and applies the wave. Build only one week in a single buildWeek call. Do not emit multiple weeks in buildWeek.
- **readProgram after buildWeek**: The **readProgram** snapshot is from request start, so it does not show a program built this turn. Target a same-turn **mutateProgram** from **buildWeek** output with **folderIds** (0-based week) and **dayOrder** (1-based day).

## Rep ranges

`rep_range` is an object with `start` and `end` (for example, `{start: 8, end: 12}` for an 8-12 rep range).
**`rep_range` supersedes `reps` in the UI**. If `rep_range` is non-null, the UI shows the range and ignores `reps`.

- Use `rep_range` for all hypertrophy or bodybuilding sets and most strength accessories where a true range is intended (for example, 8-12, 10-15). When you provide `rep_range`, also set `reps` as a fallback (typically the upper bound of the range, for example `12`).
- **Fixed-rep rule:** When the prescription is a single fixed rep count (for example, 5x5, triples, doubles, singles, AMRAP-style sets), set `rep_range` to **null** and only use `reps`. **NEVER** emit a degenerate `rep_range` where `start === end` (for example, `{start: 5, end: 5}`). That displays as "5-5" in the UI, which is incorrect. Use `rep_range: null, reps: 5` instead.
- When editing rep ranges via **mutateProgram**, use **update_set** with the full `{start, end}` **rep_range** object. Do not send only `start` or only `end`. To change from a range to fixed reps, set **rep_range** to **null** and **reps** to the fixed value in the same or follow-up **update_set** op.

## buildWeek shape

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
Do not use the example values to influence the real **buildWeek** tool response.

```json
{
  "totalDays": 3,
  "routines": [
    {
      "dayNumber": 1,
      "title": "Push Day",
      "notes": "",
      "exercises": [
        {
          "exercise_template_id": "<warmup exercise id from getExerciseList>",
          "title": "<exact title from getExerciseList for that id>",
          "sets": [
            { "type": "normal", "reps": 15, "rep_range": { "start": 10, "end": 15 }, "rpe": 4 }
          ],
          "role": "warmup",
          "reason": "Shoulder and upper-back activation before any pressing. This is the first movement on Push day, so it primes the rotator cuff while the nervous system is still fresh. Low RPE prep work - you wanted a brief warm-up on every session before loading the shoulders."
        },
        {
          "exercise_template_id": "<id from getExerciseList>",
          "title": "<exact title from getExerciseList for that id; server overwrites with canonical DB title if different>",
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
