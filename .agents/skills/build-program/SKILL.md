---
name: build-program
description: >-
  Workflow for creating a new workout program. Load this skill when the user
  wants to create, build, make, or generate a workout program, training program,
  or exercise routine.
allowedTools:
  - planProgram
  - getExerciseList
  - getMoreInfoQuestions
  - buildWeek
  - getCurrentProgram
  - modifyProgram
---

# Build Program

## Program generation (buildWeek and modifyProgram)

**Questionnaire first (new program):** When the user wants to **create** a new workout program (including the **first** message in a new chat), you **must** send a short **visible** reply, then call **getMoreInfoQuestions** before **planProgram**, **getExerciseList**, **buildWeek**, or **modifyProgram**. Stop and wait until they finish the questionnaire or send an explicit go-ahead (e.g. "Build my program"). Do not skip the questionnaire to start planning or building.

After **getExerciseList**, call **buildWeek exactly once** per user request to generate the new program week template (all training days in that single tool call). Do **not** call buildWeek again after it succeeds. Use **modifyProgram** for every post-build change (reps, RPE, rest, titles, notes, and multi-week periodization); never a second buildWeek to fix or tweak the week.

## Checklist

- [ ] **New program:** Brief visible message, then **getMoreInfoQuestions** immediately. Do **not** call **planProgram**, **getExerciseList**, **buildWeek**, or **modifyProgram** until the questionnaire is done or the user clearly continues (e.g. "Build my program"). Then proceed with the steps below.
- [ ] **planProgram** once: structured plan for the full mesocycle (duration, blocks, optional week-by-week progression table). Use questionnaire answers, program builder context (days/week, weeks), and loaded resources (powerlifting/bodybuilding/hyrox/crossfit/weight-loss) where relevant.
- [ ] getExerciseList with user requirements (respect program builder context for days per week / program length if available).
- [ ] Select exercises from the returned list (id: title). Use only IDs that appear in the list.
- [ ] **buildWeek** once: one week only (week 1 template). `routines.length` = totalDays; `dayNumber` 1..N in order. Align structure with **planProgram** (stable exercise choices within blocks when the plan says so).
- [ ] **Periodization (modifyProgram) after buildWeek:** Do **not** rely on **getCurrentProgram** for patch paths; the request snapshot may still be empty even though **buildWeek** succeeded. Compute paths for the **full** duplicated program: `totalDays × programLength` routines (see **Routine index math** below), using **planProgram**, **buildWeek** output, and program builder context.
- [ ] **modifyProgram**: Prefer **one** call with a **single patch array** that applies all periodization (per-week RPE, reps, rest, notes, block-boundary exercise swaps). If you draft edits per week mentally, **concatenate** all operations into one patch list in **ascending path order** (see below) before calling the tool once.
- [ ] After success: brief summary (max 5 bullets).

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup sets** are lighter sets of the *same* working lift (set `type` may be `"warmup"` in the schema). **Warmup exercises** are *separate movements* chosen from **getExerciseList**—mobility, activation, or easy patterns that prepare the body before working sets. Always prioritize **warmup exercises** at the start of each day; do not rely on routine notes alone.

- Include **1–2 warmup exercises** as the **first** exercises on **every training day** in **buildWeek** (`exercises[0]`, and `exercises[1]` if two). Place them **before** all working exercises for that day.
- Pick warmups that match the session (e.g. shoulder-friendly activation before pressing, hip/ankle prep before squats, light pulling before heavy pulls). Use **set `type` `"normal"`**, **low RPE (about 3–5)**, and **moderate reps (about 10–15)** with a sensible `rep_range`; these are standalone prep movements, not warmup sets on the main lift.
- If the questionnaire or context mentions **injury, pain, or a movement limitation**, use **two** warmup exercises when helpful, biased toward **low-load mobility or activation** for the affected area (still only IDs from **getExerciseList**).
- In each warmup exercise’s **`reason`**, tie the choice to the day’s demands and any stated limitation (same four-line **• What:** / **• Day:** / **• Order:** / **• Fit:** format as other exercises).

## Routine index math (JSON Patch paths)

Paths are zero-based into the **full** duplicated program array `/0` … `/N-1`.

For **week** `w` (1-based) and **day** `d` (1-based within the week):

`routineIndex = (w - 1) × daysPerWeek + (d - 1)`

Example: 4 days/week, week 3, day 2 → index `(3-1)×4 + (2-1) = 9` → paths start with `/9/...`.

## Program types

When the user wants a **powerlifting** program (squat, bench, deadlift), a program "like" or "similar to" a known one (e.g. Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, Candito, Smolov, nSuns, Bullmastiff, Calgary Barbell), or mentions periodisation, peaking, or meet prep, use `readFile` to load `.agents/skills/build-program/resources/powerlifting.md` and apply that knowledge when planning, selecting exercises, and building the week.

When the user wants a **bodybuilding** or **hypertrophy** program (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/build-program/resources/bodybuilding.md` and apply that knowledge when planning, selecting exercises, and building the week.

When the user wants a **fat-loss-first** or **weight-loss** program (cutting, leaning out, calorie deficit, body recomposition emphasis), use `readFile` to load the weight-loss resources—`.agents/skills/build-program/resources/weight-loss/diet.md`, `.agents/skills/build-program/resources/weight-loss/cardio-exercise.md`, and `.agents/skills/build-program/resources/weight-loss/lifting-program.md`—**and** `.agents/skills/build-program/resources/bodybuilding.md` for muscle volumes and exercise selection. Apply that knowledge when planning, selecting exercises, and building the week. **Exception:** if they explicitly want **powerlifting-style** fat loss (meet prep cut, S/B/D focus), load `powerlifting.md` as appropriate and still use the weight-loss resources for nutrition, cardio, and how lifting fits a deficit.

When the user wants a **Hyrox** program (Hyrox prep, Hyrox race, indoor fitness racing in the Hyrox format, or they name Hyrox stations such as SkiErg, sled push/pull, farmers carry, sandbag lunges, wall balls), use `readFile` to load `.agents/skills/build-program/resources/hyrox.md` and apply that knowledge when planning, selecting exercises, and building the week. If they also want **fat loss** or **general muscle** work, you may combine with `.agents/skills/build-program/resources/weight-loss/` or `bodybuilding.md` **only as secondary** to Hyrox-specific run-and-station priorities.

When the user wants **CrossFit**, **CrossFit-style**, **GPP**, a **WOD** or **metcon** program, or formats like **AMRAP** / **EMOM** / **for time**, or they reference **benchmark-style** couplets or chipper-style workouts (without needing full reproduction of trademarked workouts), use `readFile` to load `.agents/skills/build-program/resources/crossfit.md` and apply that knowledge when planning, selecting exercises, and building the week. If they also want **bodybuilding**, **powerlifting**, or **weight-loss** emphasis, you may combine with `bodybuilding.md`, `powerlifting.md`, or `.agents/skills/build-program/resources/weight-loss/` **only when** secondary to their stated CrossFit-style goals.

## Gotchas

- **exercise_template_id**: Must be an exact ID from the getExerciseList result (must exist in `hevy_exercise_templates`). Invented or unknown IDs cause **buildWeek** to return an error.
- **Exercise title (per exercise)**: Must be the **same title** as in getExerciseList for that ID. The server **auto-corrects** the title from the database when you pass `exercise_template_id`, so mismatches do not break the build, but you should still copy **id** and **title** exactly from the list for clarity and to avoid invalid IDs.
- **Tool input**: buildWeek expects a JSON object, not a string. Pass the structured object to the tool, not a stringified JSON.
- **routines.length**: Must exactly equal totalDays; mismatches return a validation error from the tool.
- **First week only**: The client duplicates the first week across all weeks. Build only one week in a single buildWeek call; do not emit multiple weeks in buildWeek.
- **getCurrentProgram vs periodization**: After **buildWeek**, **getCurrentProgram** may still report no program; it reflects the request-time snapshot, not the new week. For multi-week patches, use the index formula and **modifyProgram** anyway; do not wait on **hasProgram**.
- **Patch safety**: Prefer **`replace`** for periodization (RPE, reps, rest, titles). Avoid **`add` / `remove` / `move`** in bulk-generated patches unless you order operations carefully; they shift indices and break later paths.
- **Merged patch vs modify-program skill**: The modify-program skill tells end users "one patch, one call." For **this** multi-week generation flow, you may think in per-week terms, but you must deliver **one merged patch** to the client in a single modifyProgram call when possible.

## Rep ranges

`rep_range` is an object with `start` and `end` (e.g. `{start: 8, end: 12}` for an 8-12 rep range). **`rep_range` supersedes `reps` in the UI**: when `rep_range` is non-null the UI displays the range and ignores `reps`.

- Use `rep_range` for all hypertrophy/bodybuilding sets and most strength accessories where a true range is intended (e.g. 8-12, 10-15). When you provide `rep_range`, also set `reps` as a fallback (typically the upper bound of the range, e.g. `12`).
- **Fixed-rep rule:** When the prescription is a single fixed rep count (e.g. 5x5, triples, doubles, singles, AMRAP-style sets), set `rep_range` to **null** and only use `reps`. **NEVER** emit a degenerate `rep_range` where `start === end` (e.g. `{start: 5, end: 5}`). That will display as "5-5" in the UI which is incorrect. Instead use `rep_range: null, reps: 5`.
- When periodizing via **modifyProgram**, patch `rep_range` (e.g. `/0/exercises/0/sets/0/rep_range`) with the full `{start, end}` object, not just `start` or `end` individually. To change from a range to fixed reps, patch `rep_range` to `null` and patch `reps` to the fixed value.

## buildWeek shape

Use this structure. Set type must be one of "normal", "warmup", "dropset", "failure". Optional fields (rest_seconds, supersets_id, weight_kg) have defaults in the tool schema. **Warmup exercises** at the start of the day still use **`"normal"`** set types at low RPE (see **Warmup exercises** above); reserve set `type` `"warmup"` for lighter sets *within* a working exercise when the schema calls for it.

For each exercise **`reason`**, use four bullet lines joined with newline characters (`\n`), labeled **• What:** / **• Day:** / **• Order:** / **• Fit:**, matching the `buildWeek` tool schema (movement purpose, day/split, position in the workout, program + questionnaire fit). **Each line must add real information:** name concrete facts from the questionnaire or plan (e.g. a stated limitation, equipment, sessions/week, split, goal). Avoid hollow phrases that could apply to anyone.

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
          "reason": "Easy activation for shoulders and upper back before pressing.First on Push; matches horizontal push emphasis later. • Order: Warmup exercise before any heavy work.You wanted prep work every session; low RPE and no grind."
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
