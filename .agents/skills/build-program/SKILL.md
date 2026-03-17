---
name: build-program
description: >-
  Workflow for creating a new workout program. Load this skill when the user
  wants to create, build, make, or generate a workout program, training program,
  or exercise routine.
allowedTools:
  - getExerciseList
  - getMoreInfoQuestions
  - buildWeek
---

# Build Program

## Checklist

- [ ] If user requested a new program: brief message + getMoreInfoQuestions; wait for user to complete. (This means you have to stop generating and exit). When you receive the next input and it says something similar to "Build my program", start building it.
- [ ] getExerciseList with user requirements (use program builder context for days per week / program length if available).
- [ ] Select exercises from the returned list (id: title). Use only IDs that appear in the list.
- [ ] buildWeek once: one week only, routines.length = totalDays, dayNumber 1..N in order.
- [ ] After success: brief summary (max 5 bullets).

## Program types

When the user wants a **powerlifting** program (squat, bench, deadlift), a program "like" or "similar to" a known one (e.g. Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, Candito, Smolov, nSuns, Bullmastiff, Calgary Barbell), or mentions periodisation, peaking, or meet prep, use `readFile` to load `.agents/skills/build-program/resources/powerlifting.md` and apply that knowledge when selecting exercises and building the week.

When the user wants a **bodybuilding** or **hypertrophy** program (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/build-program/resources/bodybuilding.md` and apply that knowledge when selecting exercises and building the week.

## Gotchas

- **exercise_template_id**: Must be an exact ID from the getExerciseList result. Do not invent IDs or use titles; the client validates against the list and will fail otherwise.
- **Tool input**: buildWeek expects a JSON object, not a string. Pass the structured object to the tool, not a stringified JSON.
- **routines.length**: Must exactly equal totalDays; mismatches return a validation error from the tool.
- **First week only**: The client duplicates the first week across all weeks. Build only one week in a single buildWeek call; do not emit multiple weeks.

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
