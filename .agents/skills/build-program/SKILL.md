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

After **getExerciseList**, call **buildWeek exactly once** per user request to generate the new program week template (all training days in that single tool call). Do **not** call buildWeek again after it succeeds. Use **modifyProgram** for every post-build change—reps, RPE, rest, titles, notes, and multi-week periodization—never a second buildWeek to fix or tweak the week.

## Checklist

- [ ] If user requested a new program: brief message + getMoreInfoQuestions; wait for the user to complete. (Stop generating until they continue.) When they send something like "Build my program", continue.
- [ ] **planProgram** once: structured plan for the full mesocycle (duration, blocks, optional week-by-week progression table). Use questionnaire answers, program builder context (days/week, weeks), and loaded resources (powerlifting/bodybuilding) where relevant.
- [ ] getExerciseList with user requirements (respect program builder context for days per week / program length if available).
- [ ] Select exercises from the returned list (id: title). Use only IDs that appear in the list.
- [ ] **buildWeek** once: one week only — week 1 template. `routines.length` = totalDays; `dayNumber` 1..N in order. Align structure with **planProgram** (stable exercise choices within blocks when the plan says so).
- [ ] **Periodization (modifyProgram) after buildWeek:** Do **not** rely on **getCurrentProgram** for patch paths—the request snapshot may still be empty even though **buildWeek** succeeded. Compute paths for the **full** duplicated program: `totalDays × programLength` routines (see **Routine index math** below), using **planProgram**, **buildWeek** output, and program builder context.
- [ ] **modifyProgram**: Prefer **one** call with a **single patch array** that applies all periodization (per-week RPE, reps, rest, notes, block-boundary exercise swaps). If you draft edits per week mentally, **concatenate** all operations into one patch list in **ascending path order** (see below) before calling the tool once.
- [ ] After success: brief summary (max 5 bullets).

## Routine index math (JSON Patch paths)

Paths are zero-based into the **full** duplicated program array `/0` … `/N-1`.

For **week** `w` (1-based) and **day** `d` (1-based within the week):

`routineIndex = (w - 1) × daysPerWeek + (d - 1)`

Example: 4 days/week, week 3, day 2 → index `(3-1)×4 + (2-1) = 9` → paths start with `/9/...`.

## Program types

When the user wants a **powerlifting** program (squat, bench, deadlift), a program "like" or "similar to" a known one (e.g. Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, Candito, Smolov, nSuns, Bullmastiff, Calgary Barbell), or mentions periodisation, peaking, or meet prep, use `readFile` to load `.agents/skills/build-program/resources/powerlifting.md` and apply that knowledge when planning, selecting exercises, and building the week.

When the user wants a **bodybuilding** or **hypertrophy** program (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/build-program/resources/bodybuilding.md` and apply that knowledge when planning, selecting exercises, and building the week.

## Gotchas

- **exercise_template_id**: Must be an exact ID from the getExerciseList result. Do not invent IDs or use titles; the client validates against the list and will fail otherwise.
- **Tool input**: buildWeek expects a JSON object, not a string. Pass the structured object to the tool, not a stringified JSON.
- **routines.length**: Must exactly equal totalDays; mismatches return a validation error from the tool.
- **First week only**: The client duplicates the first week across all weeks. Build only one week in a single buildWeek call; do not emit multiple weeks in buildWeek.
- **getCurrentProgram vs periodization**: After **buildWeek**, **getCurrentProgram** may still report no program—it reflects the request-time snapshot, not the new week. For multi-week patches, use the index formula and **modifyProgram** anyway; do not wait on **hasProgram**.
- **Patch safety**: Prefer **`replace`** for periodization (RPE, reps, rest, titles). Avoid **`add` / `remove` / `move`** in bulk-generated patches unless you order operations carefully — they shift indices and break later paths.
- **Merged patch vs modify-program skill**: The modify-program skill tells end users "one patch, one call." For **this** multi-week generation flow, you may think in per-week terms, but you must deliver **one merged patch** to the client in a single modifyProgram call when possible.

## buildWeek shape

Use this structure. Set type must be one of "normal", "warmup", "dropset", "failure". Optional fields (rest_seconds, supersets_id, weight_kg) have defaults in the tool schema.

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
          "exercise_template_id": "<id from getExerciseList>",
          "title": "Bench Press",
          "sets": [
            { "type": "normal", "reps": 8, "rpe": 8 }
          ],
          "reason": "Primary horizontal press for chest development."
        }
      ]
    }
  ]
}
```
