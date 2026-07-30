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
Stop and wait until they finish the questionnaire or send an explicit go-ahead (for example, "Build my program").
Do not skip the questionnaire to start planning or building.

### Persist Constraint Profile (same turn, non-blocking)

If there is something to persist on the first unlock turn after questionnaire submit or "Build my program", call **`updateConstraintProfile` once**.
Persist non-empty questionnaire fields from the Active Constraint Profile or request context that are not yet written to Agentic memory.
Map health to `addInjuries`.
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

After **getExerciseList**, call **buildWeek exactly once** per user request.
That single call generates the new program week template for all training days.
Do not call **buildWeek** again after it succeeds.
Use **mutateProgram** for every post-build change.
That includes reps, RPE, rest, titles, notes, and multi-week periodization.
Never use a second **buildWeek** to fix or tweak the week.

## Checklist

**STOP - Questionnaire Gate.**
If this is a new program request, call **getMoreInfoQuestions**.
Then terminate your response.
Do not reason about exercise selection before the user provides the data.
Do not call **getExerciseList** or **planProgram** before that data arrives.
Treat the questionnaire as a **gate**.
A fresh user message must unlock the gate.

- [ ] **New program:** Send a brief visible message. Then call **getMoreInfoQuestions** immediately.
- [ ] Do **not** call **planProgram**, **getExerciseList**, **buildWeek**, or **mutateProgram** yet. If the questionnaire is done, or the user clearly continues (for example, "Build my program"), continue with the steps below.
- [ ] **Persist Constraint Profile:** If there are non-empty fields to persist on the unlock turn, call **`updateConstraintProfile` once**. Keep this on the same turn as plan, list, and build. Do not block those tools. If every field is empty, skip the call.
- [ ] **Persist Training Profile:** If Questionnaire advanced or Training profile fields are non-empty on the unlock turn, call **`updateTrainingProfile` once**. Keep this on the same turn. Do not block plan, list, or build. If every field is empty, skip the call.
- [ ] **planProgram** once: Write a structured plan for the full mesocycle (duration, blocks, optional week-by-week progression table). Use questionnaire answers and program builder context (days per week, weeks). If powerlifting, bodybuilding, hyrox, crossfit, or weight-loss resources are loaded, use them.
- [ ] Call **getExerciseList** with the user requirements. If program builder context has days per week or program length, obey that context.
- [ ] Select exercises from the returned list (`id: title`). Use only IDs that appear in the list.
- [ ] Call **buildWeek** once for week 1 only. Set `routines.length` to totalDays. Set `dayNumber` from 1 to N in order. Align the structure with **planProgram**. If the plan requires stable exercise choices within blocks, keep those choices stable.
- [ ] **Periodization (mutateProgram) after buildWeek:** Do **not** use **readProgram** for targeting. The request snapshot can still be empty after **buildWeek** succeeds.
- [ ] Target the **full** duplicated program (`totalDays × programLength` routines) with **folderIds** and **dayOrder** (see **Multi-week targeting** below), plus **planProgram**, **buildWeek** output, and program builder context.
- [ ] **mutateProgram:** Before you call it, run the **Before mutateProgram** gate from the **mutate-program** skill.
- [ ] Obey the Active Constraint Profile. Make sure that the compliance step passes. Make sure that no day is empty.
- [ ] Prefer **one** call with a **single operations array** for all periodization (per-week RPE, reps, rest, notes, block-boundary exercise swaps).
- [ ] Use **swap_exercise_template** for post-build equipment retargets (for example, dumbbell-only) without re-specifying sets.
- [ ] If you draft edits per week first, concatenate all operations into one batch. Then call the tool once.
- [ ] After success: write a brief summary (max 5 bullets).

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
Obey the Active Constraint Profile and the session-size targets below.
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
Expanding that seed to more weeks or adding progression is a **separate ask**.
Offer it and wait for a yes.
When they accept, plan and periodize with **planProgram** and **mutateProgram** over the loaded week.
Do not rebuild it.

## Warmup exercises

### Warmup exercises vs warmup sets

**Warmup sets** are lighter sets of the same working lift.
The set `type` can be `"warmup"` in the schema.
**Warmup exercises** are separate movements from **getExerciseList**.
They are mobility, activation, or easy patterns that prepare the body before working sets.
Do not rely on routine notes alone for prep.

### Questionnaire preference (`warmup-exercises` / Warmup exercises)

Obey the constraint profile and questionnaire preferences.

- **yes** or **unset/empty** (skipped questionnaire): include warmup exercises as below (default).
- **no**: do **not** add separate warmup exercise rows in **buildWeek**. Still meet the working-exercise quota (~5-6 working rows per day). If warmups help on main lifts, you can still use warmup *sets*. Never override an explicit **no** because of injury or pain. If the answer is yes or unset, you can bias warmups toward the affected area.

### Warmups are extra

Warmup exercises do not replace working exercises.
If a resource, plan, or user intent implies "N exercises" per session, that means **N working (main) exercises**.
Warmup exercises are **additional** rows on top of that target.
Example: a 6-exercise day with 1 warmup has **7 rows** in `exercises[]` total.
It is not 5 working + 1 warmup = 6.
Make sure that the full working-exercise quota is met before you count warmups.

### When warmups are included (yes or unset)

- Include **1-2 warmup exercises** as the **first** exercises on **every training day** in **buildWeek** (`exercises[0]`, and `exercises[1]` if two). Place them **before** all working exercises for that day.
- Pick warmups that match the session. Examples: shoulder-friendly activation before pressing, hip or ankle prep before squats, light pulling before heavy pulls.
- Use **set `type` `"normal"`**, **low RPE (about 3-5)**, and **moderate reps (about 10-15)** with a sensible `rep_range`.
- These are standalone prep movements, not warmup sets on the main lift.
- If the questionnaire or context mentions **injury, pain, or a movement limitation**, use **two** warmup exercises when that helps. Bias them toward **low-load mobility or activation** for the affected area. Use only IDs from **getExerciseList**.
- In each warmup exercise’s **`reason`**, tie the choice to the day’s demands and any stated limitation. Use the same short prose style as other exercises.
- For post-**buildWeek** warmups on duplicated weeks, use **mutateProgram** **insert_exercise** at **exerciseIndex: 0** with the correct **folderIds** and **dayOrder** per week.

## Session size (exercise rows per day)

**Default target (warmups yes/unset): 6-7 total rows in `exercises[]` per training day**, counting warmup row(s).

- Typical layout: **1 warmup** (`exercises[0]`) + **5-6 working exercises** = 6-7 rows total.
- If the context calls for **2 warmups** (injury, limitation, or longer session): **2 warmups** + **4-5 working exercises** = still 6-7 rows total.
- **Warmups no:** omit warmup rows. Target **~5-6 working exercises** per day.
- Do not routinely build days with only 4-5 total rows (~3 working after warmups). That volume is too low. If the user or context explicitly requests a short session, use that size (short time cap, brief session, deload day, or a powerlifting peaking day with deliberately low volume).
- This default applies to all split types (PPL, Upper/Lower, Full-Body, and more). Powerlifting programs can use slightly fewer working exercises per day. They must still meet a warmup (when included) plus at least 3-4 working exercises.

## Target RPE and stimulus (hypertrophy programs)

- On bodybuilding or hypertrophy programs, put a **numeric target `rpe`** on **every working set** row in **buildWeek** / **mutateProgram**. For warmup exercises and intentional easy work, use **~3-5 RPE** as already described. Numeric RPE makes prescriptions auditable and powers program **stimulus** checks in the scorecard.
- Do **not** imply that “more sets always equals more growth” without effort context. When it fits, tie weekly set choices in **`reason`** text to **hard-set quality** and to the user’s phase. Examples: primary compounds ~1-2 RIR / ~7-8.5 RPE. Isolations can be somewhat harder.
- **Deload or easy weeks:** Reduce stimulus with **fewer working sets**, **lower target RPE**, or both. Say so in **`reason`**, **`notes`**, or routine **`notes`** so the lower stimulus is **intentional**. Do not leave it open to misread as missing intensity. See `.agents/skills/build-program/resources/stimulus-and-volume.md` for the shared vocabulary.

## Multi-week targeting (mutateProgram)

The client duplicates week 1 across all program weeks.
Periodization ops target specific weeks and days.
They do **not** use flat routine-index paths.

- **folderIds:** 0-based week index. Week 1 → `[0]`, week W → `[W - 1]`. One op can list multiple weeks: `folderIds: [0, 1, 2, 3]`.
- **dayOrder:** 1-based day within the week (matches **buildWeek** `dayNumber`).
- For **week** `w` (1-based) and **day** `d` (1-based): `folderIds: [w - 1]`, `dayOrder: d`.

Example: 4 days/week, week 3, day 2 → `folderIds: [2]`, `dayOrder: 2`.

**Batch order:** Put **insert_exercise** before **update_set** and other index-based ops on the same day.
Prefer **update_set** for RPE, reps, and rest periodization.
See the **mutateProgram** tool description for op fields.

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
- **First week only**: The client duplicates the first week across all weeks. Build only one week in a single buildWeek call. Do not emit multiple weeks in buildWeek.
- **readProgram vs periodization**: After **buildWeek**, **readProgram** can still return an empty snapshot (request-start staleness). For multi-week **mutateProgram**, use **buildWeek** output + **planProgram** + **folderIds** / **dayOrder**. Do not wait on **readProgram**.
- **Operation batch safety:** Prefer **update_set** / **edit_day_title** for periodization (RPE, reps, rest, titles). If you use bulk **insert_exercise** / **delete_exercise**, order the operations carefully. Those ops shift **exerciseIndex** for later ops on the same day.
- **Merged batch vs mutate-program skill:** The mutate-program skill says "one batch, one call." For **this** multi-week generation flow, you can draft per week first. You **must** still deliver **one merged operations array** in a single **mutateProgram** call when possible.

## Rep ranges

`rep_range` is an object with `start` and `end` (for example, `{start: 8, end: 12}` for an 8-12 rep range).
**`rep_range` supersedes `reps` in the UI**. If `rep_range` is non-null, the UI shows the range and ignores `reps`.

- Use `rep_range` for all hypertrophy or bodybuilding sets and most strength accessories where a true range is intended (for example, 8-12, 10-15). When you provide `rep_range`, also set `reps` as a fallback (typically the upper bound of the range, for example `12`).
- **Fixed-rep rule:** When the prescription is a single fixed rep count (for example, 5x5, triples, doubles, singles, AMRAP-style sets), set `rep_range` to **null** and only use `reps`. **NEVER** emit a degenerate `rep_range` where `start === end` (for example, `{start: 5, end: 5}`). That displays as "5-5" in the UI, which is incorrect. Use `rep_range: null, reps: 5` instead.
- When periodizing via **mutateProgram**, use **update_set** with the full `{start, end}` **rep_range** object. Do not send only `start` or only `end`. To change from a range to fixed reps, set **rep_range** to **null** and **reps** to the fixed value in the same or follow-up **update_set** op.

## buildWeek shape

Use this structure.
Set type must be one of "normal", "warmup", "dropset", "failure".
Optional fields (`rest_seconds`, `supersets_id`, `weight_kg`) have defaults in the tool schema.
**Warmup exercises** at the start of the day still use **`"normal"`** set types at low RPE (see **Warmup exercises** above).
If the schema calls for lighter sets *within* a working exercise, reserve set `type` `"warmup"` for those sets.

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
          "reason": "Shoulder and upper-back activation before any pressing. This is the first movement on Push day, so it primes the rotator cuff while the nervous system is still fresh. Low RPE prep work - you wanted a brief warm-up on every session before loading the shoulders."
        },
        {
          "exercise_template_id": "<id from getExerciseList>",
          "title": "<exact title from getExerciseList for that id; server overwrites with canonical DB title if different>",
          "sets": [
            { "type": "normal", "reps": 12, "rep_range": { "start": 8, "end": 12 }, "rpe": 8 }
          ],
          "reason": "A heavy horizontal push; you said bench irritates front shoulders, so elbows stay tucked and ROM controlled, not wide-flare max width. Primary pressing here so pull day can prioritize rows/hinges without doubling anterior fatigue same day. Heaviest compound while groove is freshest; flyes/cables after on purpose. Drives this session's chest volume before accessories."
        }
      ]
    }
  ]
}
```
