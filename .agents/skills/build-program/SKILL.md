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

## Program generation (buildWeek and mutateProgram)

**Questionnaire first (new program):** When the user wants to **create** a new workout program (including the **first** message in a new chat), you **must** send a short **visible** reply, then call **getMoreInfoQuestions** before **planProgram**, **getExerciseList**, **buildWeek**, or **mutateProgram**. Stop and wait until they finish the questionnaire or send an explicit go-ahead (e.g. "Build my program"). Do not skip the questionnaire to start planning or building.

**Persist Constraint Profile (same turn, non-blocking):** On the first turn after questionnaire submit or “Build my program”, call **`updateConstraintProfile` once** **only when there is something to persist** - non-empty questionnaire fields from the Active Constraint Profile / request context that are not yet written to Agentic memory (health → `addInjuries`; exclude equipment → `addExcludedEquipment`; exclude areas → `addExcludedAreas`; split/variability/progression/deload/peak/warmup → `preferences`). This is a background backup - do **not** delay or block **planProgram**, **getExerciseList**, or **buildWeek** waiting on it. Seeing constraints in the Active Constraint Profile does **not** mean they are persisted - if they are non-empty and not yet written, call the tool. **If every field is empty** (e.g. user skipped the questionnaire with no answers): **do not call** `updateConstraintProfile` - empty updates are noise.

**Persist Training Profile (same turn, non-blocking):** On that same unlock turn, call **`updateTrainingProfile` once** **only when Questionnaire advanced / Active Training Profile fields are non-empty** (age, sex, heightCm, experienceLevel, physiquePhase, trainingFocus, activityLevel, sessionDurationMin). Same spirit as Constraint profile - background backup; do **not** block plan/list/build. **If every Training profile field is empty**, **do not call** `updateTrainingProfile`.

After **getExerciseList**, call **buildWeek exactly once** per user request to generate the new program week template (all training days in that single tool call). Do **not** call buildWeek again after it succeeds. Use **mutateProgram** for every post-build change (reps, RPE, rest, titles, notes, and multi-week periodization); never a second buildWeek to fix or tweak the week.

## Checklist

**STOP - Questionnaire Gate.** If this is a new program request, you **must** call **getMoreInfoQuestions** and then **terminate your response**. Do not perform any internal reasoning about exercise selection, do not call **getExerciseList**, and do not call **planProgram** until the user has actually provided the data. Treat the questionnaire as a **gate** that must be unlocked by a fresh user message.

- [ ] **New program:** Brief visible message, then **getMoreInfoQuestions** immediately. Do **not** call **planProgram**, **getExerciseList**, **buildWeek**, or **mutateProgram** until the questionnaire is done or the user clearly continues (e.g. "Build my program"). Then proceed with the steps below.
- [ ] **Persist Constraint Profile:** On the unlock turn, call **`updateConstraintProfile` once** only if there are non-empty fields to persist (same turn as plan/list/build - non-blocking; skip entirely when empty).
- [ ] **Persist Training Profile:** On the unlock turn, call **`updateTrainingProfile` once** only if Questionnaire advanced / Training profile fields are non-empty (same turn - non-blocking; skip entirely when empty).
- [ ] **planProgram** once: structured plan for the full mesocycle (duration, blocks, optional week-by-week progression table). Use questionnaire answers, program builder context (days/week, weeks), and loaded resources (powerlifting/bodybuilding/hyrox/crossfit/weight-loss) where relevant.
- [ ] getExerciseList with user requirements (respect program builder context for days per week / program length if available).
- [ ] Select exercises from the returned list (id: title). Use only IDs that appear in the list.
- [ ] **buildWeek** once: one week only (week 1 template). `routines.length` = totalDays; `dayNumber` 1..N in order. Align structure with **planProgram** (stable exercise choices within blocks when the plan says so).
- [ ] **Periodization (mutateProgram) after buildWeek:** Do **not** rely on **readProgram** for targeting; the request snapshot may still be empty even though **buildWeek** succeeded. Target the **full** duplicated program (`totalDays × programLength` routines) using **folderIds** + **dayOrder** (see **Multi-week targeting** below), **planProgram**, **buildWeek** output, and program builder context.
- [ ] **mutateProgram**: Before calling, run the **Before mutateProgram** gate from the **mutate-program** skill (honor Active Constraint Profile → compliance check → no empty days). Prefer **one** call with a **single operations array** that applies all periodization (per-week RPE, reps, rest, notes, block-boundary exercise swaps). Use **swap_exercise_template** for post-build equipment retargets (e.g. dumbbell-only) without re-specifying sets. If you draft edits per week mentally, **concatenate** all operations into one batch before calling the tool once.
- [ ] After success: brief summary (max 5 bullets).

## Tool dependency rule

**getExerciseList** and **planProgram** are **strictly dependent** on the output of the questionnaire. Calling them before the questionnaire is answered is a waste of context and a violation of the workflow. Do not "pre-fetch" the exercise list or begin planning to be proactive - wait for the user's questionnaire answers or explicit go-ahead first. On the unlock turn, call **`updateConstraintProfile`** and **`updateTrainingProfile`** as same-turn backups only when there are non-empty fields to persist for each (does not gate plan/list/build).

## Hevy share links as reference

When the user backs a build request with a **public Hevy share link** (`hevy.com/folder/…`, `hevy.com/routine/…`, or `hevy.com/workout/…` - e.g. "build me something like this"), call **fetchHevyShareFolder** to read it and use it as planning context: split shape, day count, exercise selection, set and rep style. A **workout** link is a completed session log (what was actually lifted that day), not a prescribed split - use it for volume/exercise clues, not as if it were programming. Reading a share is context gathering, so it is allowed on the questionnaire-gate turn alongside **getMoreInfoQuestions** - it is not building.

Everything after that is the normal workflow: **planProgram** → **getExerciseList** → **buildWeek**, honoring the Active Constraint Profile and the session-size targets below. The share is a reference, not the program - never treat **fetchHevyShareFolder** output as days already on the grid, and never claim you loaded it. If the user wants that shared folder itself on the grid rather than a program inspired by it, say so plainly and let them confirm; do not build around it silently.

**Loading the share instead of building from it:** When they want the shared week itself, that is **importHevyShareFolder** (`confirmed: true`), not this workflow - it needs an **empty** grid and their explicit yes, and it is **not** gated behind **getMoreInfoQuestions**. Once a share is loaded, the week is already on the grid: do **not** call **buildWeek** to recreate it, and use **mutateProgram** for edits. Expanding that seed to more weeks or adding progression is a **separate ask** - offer it and wait for a yes; when they take it up, plan and periodize with **planProgram** + **mutateProgram** over the loaded week rather than rebuilding it.

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup sets** are lighter sets of the *same* working lift (set `type` may be `"warmup"` in the schema). **Warmup exercises** are *separate movements* chosen from **getExerciseList**-mobility, activation, or easy patterns that prepare the body before working sets. Do not rely on routine notes alone for prep.

**Questionnaire preference (`warmup-exercises` / Warmup exercises):** Honor the constraint profile / questionnaire prefs.

- **yes** or **unset/empty** (skipped questionnaire): include warmup exercises as below (default).
- **no**: do **not** add separate warmup exercise rows in **buildWeek**. Still meet the working-exercise quota (~5-6 working rows per day). Warmup *sets* on main lifts remain allowed when useful. Never override an explicit **no** because of injury/pain - bias warmups toward the affected area only when the answer is yes or unset.

**Warmups are extra - they do not replace working exercises.** Whenever a resource, plan, or user intent implies "N exercises" per session, that means **N working (main) exercises**. Warmup exercises are **additional** rows on top of that target. For example, a 6-exercise day with 1 warmup = **7 rows** in `exercises[]` total - not 5 working + 1 warmup = 6. Always ensure the full working-exercise quota is met before counting warmups.

When warmups are included (yes or unset):

- Include **1-2 warmup exercises** as the **first** exercises on **every training day** in **buildWeek** (`exercises[0]`, and `exercises[1]` if two). Place them **before** all working exercises for that day.
- Pick warmups that match the session (e.g. shoulder-friendly activation before pressing, hip/ankle prep before squats, light pulling before heavy pulls). Use **set `type` `"normal"`**, **low RPE (about 3-5)**, and **moderate reps (about 10-15)** with a sensible `rep_range`; these are standalone prep movements, not warmup sets on the main lift.
- If the questionnaire or context mentions **injury, pain, or a movement limitation**, use **two** warmup exercises when helpful, biased toward **low-load mobility or activation** for the affected area (still only IDs from **getExerciseList**).
- In each warmup exercise’s **`reason`**, tie the choice to the day’s demands and any stated limitation in the same short prose style as other exercises.
- For post-**buildWeek** warmups on duplicated weeks, use **mutateProgram** **insert_exercise** at **exerciseIndex: 0** with the correct **folderIds** + **dayOrder** per week.

## Session size (exercise rows per day)

**Default target (warmups yes/unset): 6-7 total rows in `exercises[]` per training day**, counting warmup row(s).

- Typical layout: **1 warmup** (`exercises[0]`) + **5-6 working exercises** = 6-7 rows total.
- When the context calls for **2 warmups** (injury, limitation, or longer session): **2 warmups** + **4-5 working exercises** = still 6-7 rows total.
- **Warmups no:** omit warmup rows; target **~5-6 working exercises** per day.
- **Do not routinely build days with only 4-5 total rows** (~3 working after warmups). That is consistently under-volume and should be avoided unless the user or context explicitly requests it (short time cap, user-requested brief session, deload day, or a powerlifting peaking day where volume is deliberately low).
- This default applies to all split types (PPL, Upper/Lower, Full-Body, etc.). Powerlifting programs may legitimately have slightly fewer working exercises per day but should still meet a warmup (when included) + at minimum 3-4 working exercises.

## Target RPE and stimulus (hypertrophy programs)

- **Every working set** on bodybuilding/hypertrophy programs must include a **numeric target `rpe`** on each set row in **buildWeek** / **mutateProgram** (warmup exercises and intentional easy work: **~3-5 RPE** as already described). This makes prescriptions auditable and powers program **stimulus** checks in the scorecard.
- **Do not** imply that “more sets always equals more growth” without effort context. In **`reason`** text, when natural, tie weekly set choices to **hard-set quality** (e.g. primary compounds ~1-2 RIR / ~7-8.5 RPE; isolations can be somewhat harder) and to the user’s phase.
- **Deload or easy weeks:** Reduce stimulus by **fewer working sets**, **lower target RPE**, or both-say so in **`reason`**, **`notes`**, or routine **`notes`** so reduced stimulus is **intentional** (not misread as missing intensity). See `.agents/skills/build-program/resources/stimulus-and-volume.md` for the shared vocabulary.

## Multi-week targeting (mutateProgram)

The client duplicates week 1 across all program weeks. Periodization ops target specific weeks/days - **not** flat routine-index paths.

- **folderIds:** 0-based week index. Week 1 → `[0]`, week W → `[W - 1]`. One op can list multiple weeks: `folderIds: [0, 1, 2, 3]`.
- **dayOrder:** 1-based day within the week (matches **buildWeek** `dayNumber`).
- For **week** `w` (1-based) and **day** `d` (1-based): `folderIds: [w - 1]`, `dayOrder: d`.

Example: 4 days/week, week 3, day 2 → `folderIds: [2]`, `dayOrder: 2`.

**Batch order:** **insert_exercise** before **update_set** / index-based ops on the same day. Prefer **update_set** for RPE/reps/rest periodization. See **mutateProgram** tool description for op fields.

## Program types

When the user wants a **powerlifting** program (squat, bench, deadlift), a program "like" or "similar to" a known one (e.g. Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, Candito, Smolov, nSuns, Bullmastiff, Calgary Barbell), or mentions periodisation, peaking, or meet prep, use `readFile` to load `.agents/skills/build-program/resources/powerlifting.md` and apply that knowledge when planning, selecting exercises, and building the week.

When the user wants a **bodybuilding** or **hypertrophy** program (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/build-program/resources/bodybuilding.md` **and** `.agents/skills/build-program/resources/stimulus-and-volume.md` and apply that knowledge when planning, selecting exercises, and building the week.

When the user wants a **fat-loss-first** or **weight-loss** program (cutting, leaning out, calorie deficit, body recomposition emphasis), use `readFile` to load the weight-loss resources-`.agents/skills/build-program/resources/weight-loss/diet.md`, `.agents/skills/build-program/resources/weight-loss/cardio-exercise.md`, and `.agents/skills/build-program/resources/weight-loss/lifting-program.md`-**and** `.agents/skills/build-program/resources/bodybuilding.md` and `.agents/skills/build-program/resources/stimulus-and-volume.md` for muscle volumes, effort expectations, and exercise selection. Apply that knowledge when planning, selecting exercises, and building the week. **Exception:** if they explicitly want **powerlifting-style** fat loss (meet prep cut, S/B/D focus), load `powerlifting.md` as appropriate and still use the weight-loss resources for nutrition, cardio, and how lifting fits a deficit.

When the user wants a **Hyrox** program (Hyrox prep, Hyrox race, indoor fitness racing in the Hyrox format, or they name Hyrox stations such as SkiErg, sled push/pull, farmers carry, sandbag lunges, wall balls), use `readFile` to load `.agents/skills/build-program/resources/hyrox.md` and apply that knowledge when planning, selecting exercises, and building the week. If they also want **fat loss** or **general muscle** work, you may combine with `.agents/skills/build-program/resources/weight-loss/` or `bodybuilding.md` **only as secondary** to Hyrox-specific run-and-station priorities.

When the user wants **CrossFit**, **CrossFit-style**, **GPP**, a **WOD** or **metcon** program, or formats like **AMRAP** / **EMOM** / **for time**, or they reference **benchmark-style** couplets or chipper-style workouts (without needing full reproduction of trademarked workouts), use `readFile` to load `.agents/skills/build-program/resources/crossfit.md` and apply that knowledge when planning, selecting exercises, and building the week. If they also want **bodybuilding**, **powerlifting**, or **weight-loss** emphasis, you may combine with `bodybuilding.md`, `powerlifting.md`, or `.agents/skills/build-program/resources/weight-loss/` **only when** secondary to their stated CrossFit-style goals.

## Gotchas

- **Program length on existing grid:** If the user already has routines and asks to change duration (e.g. "make it 2 weeks", "8 weeks → 2 weeks"), load **mutate-program** and **delete_week** - never **planProgram** / **buildWeek**. **planProgram.durationWeeks** and builder **programLength** describe the plan/template; they do not remove weeks from the live grid.
- **exercise_template_id**: Must be an exact ID from the getExerciseList result (must exist in `hevy_exercise_templates`). Invented or unknown IDs cause **buildWeek** to return an error.
- **Exercise title (per exercise)**: Must be the **same title** as in getExerciseList for that ID. The server **auto-corrects** the title from the database when you pass `exercise_template_id`, so mismatches do not break the build, but you should still copy **id** and **title** exactly from the list for clarity and to avoid invalid IDs.
- **Tool input**: buildWeek expects a JSON object, not a string. Pass the structured object to the tool, not a stringified JSON.
- **routines.length**: Must exactly equal totalDays; mismatches return a validation error from the tool.
- **First week only**: The client duplicates the first week across all weeks. Build only one week in a single buildWeek call; do not emit multiple weeks in buildWeek.
- **readProgram vs periodization**: After **buildWeek**, **readProgram** may still return an empty snapshot (request-start staleness). For multi-week **mutateProgram**, use **buildWeek** output + **planProgram** + **folderIds** / **dayOrder**; do not wait on **readProgram**.
- **Operation batch safety**: Prefer **update_set** / **edit_day_title** for periodization (RPE, reps, rest, titles). Avoid bulk **insert_exercise** / **delete_exercise** unless you order operations carefully; they shift **exerciseIndex** for later ops on the same day.
- **Merged batch vs mutate-program skill**: The mutate-program skill says "one batch, one call." For **this** multi-week generation flow, you may think in per-week terms, but you must deliver **one merged operations array** in a single **mutateProgram** call when possible.

## Rep ranges

`rep_range` is an object with `start` and `end` (e.g. `{start: 8, end: 12}` for an 8-12 rep range). **`rep_range` supersedes `reps` in the UI**: when `rep_range` is non-null the UI displays the range and ignores `reps`.

- Use `rep_range` for all hypertrophy/bodybuilding sets and most strength accessories where a true range is intended (e.g. 8-12, 10-15). When you provide `rep_range`, also set `reps` as a fallback (typically the upper bound of the range, e.g. `12`).
- **Fixed-rep rule:** When the prescription is a single fixed rep count (e.g. 5x5, triples, doubles, singles, AMRAP-style sets), set `rep_range` to **null** and only use `reps`. **NEVER** emit a degenerate `rep_range` where `start === end` (e.g. `{start: 5, end: 5}`). That will display as "5-5" in the UI which is incorrect. Instead use `rep_range: null, reps: 5`.
- When periodizing via **mutateProgram**, use **update_set** with the full `{start, end}` **rep_range** object, not just `start` or `end` individually. To change from a range to fixed reps, set **rep_range** to **null** and **reps** to the fixed value in the same or follow-up **update_set** op.

## buildWeek shape

Use this structure. Set type must be one of "normal", "warmup", "dropset", "failure". Optional fields (rest_seconds, supersets_id, weight_kg) have defaults in the tool schema. **Warmup exercises** at the start of the day still use **`"normal"`** set types at low RPE (see **Warmup exercises** above); reserve set `type` `"warmup"` for lighter sets *within* a working exercise when the schema calls for it.

For each exercise **`reason`**, write 2-4 sentences of natural prose covering: what the movement does, where it sits in the split, its position in the session, and how it fits this person’s plan or questionnaire answers. Be concrete - name real facts (stated limitation, equipment, sessions/week, goal, experience). No bullet labels required.

This is an example JSON, don't use the example values in this to influence the values you add to the real tool response of buildWeek.

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
