---
name: modify-program
description: >-
  Workflow for modifying an existing workout program. Load this skill when the
  user wants to change, edit, update, swap, rename, or remove exercises, sets,
  reps, or days in their existing program.
allowedTools:
  - getExerciseList
  - getCurrentProgram
  - mutateProgram
---

# Modify Program

## Checklist

- [ ] getCurrentProgram to get current state and length (N = total routines).
- [ ] Build one patch array with all operations for the requested change.
- [ ] For edits affecting every routine: include one op per index /0 through /N-1 as needed.
- [ ] Call mutateProgram once with the full patch array.

## Warmup exercises

**Warmup exercises vs warmup sets:** **Warmup exercises** are separate movements (IDs from **getExerciseList**) at the start of the day to prepare for the session. **Warmup sets** are lighter sets of the same working lift. When adding prep work, add **warmup exercises** with **`"normal"`** sets at low RPE—not only extra `"warmup"`-typed sets on the main lift.

**Warmups increase the row count — they do not replace working exercises.** Prepending a warmup with `add` at `/routineIndex/exercises/0` inserts an extra row; the existing working exercises shift index by one but are all still present. Never remove or omit a working exercise to "make room" for a warmup unless the user explicitly asks to replace it.

- If the user reports an **injury, pain, or limitation**, or asks for better prep, check whether each affected **training day** already begins with **1–2 appropriate warmup exercises**. If the day jumps straight into heavy work, add **1–2 warmup exercises** (bias **two** when injury or limitation is present).
- **Prepend** with **`add`** at `/routineIndex/exercises/0` (inserts before the current first exercise). To insert two warmups in order, **`add` the first warmup at `/routineIndex/exercises/0`**, then **`add` the second at `/routineIndex/exercises/1`**. Use **getExerciseList** for valid template IDs and titles; match the day’s movements and any stated limitation.
- When the change should apply to **every week**, include **`add` (or other) operations for each routine index** that corresponds to that day across the full program (see **Gotchas**: length = daysPerWeek × programLength). Example: for **day 1** every week, patch `/0/exercises/0`, `/daysPerWeek/exercises/0`, `/2×daysPerWeek/exercises/0`, … as needed—compute indices with the same formula as build-program’s routine index math.

## Program types

When the user's program or requested changes are **powerlifting-focused** (squat, bench, deadlift, or "like" a known powerlifting program such as Starting Strength, 5/3/1, Texas Method, GZCL, Sheiko, etc.), use `readFile` to load `.agents/skills/modify-program/resources/powerlifting.md` and apply that knowledge when building the patch (e.g. preserve SBD emphasis, recovery, and style).

When the user's program or requested changes are **bodybuilding- or hypertrophy-focused** (aesthetic focus, muscle building, PPL, upper/lower, bro split, or training by muscle group), use `readFile` to load `.agents/skills/modify-program/resources/bodybuilding.md` and apply that knowledge when building the patch (e.g. preserve volume landmarks, exercise categories per muscle, rep ranges, and session structure as in the resource).

## Gotchas

- **Document root**: The program is a single array of all routines (all weeks). Length = daysPerWeek × programLength (e.g. 6×8 = 48). Paths are into this array: /0 … /N-1.
- **Program-wide changes**: To change every occurrence (e.g. rename all "Push" to "Chest"), include one operation per relevant routine index (/0/..., /1/..., …, /N-1/...). Do not patch only the first week.
- **One patch, one call**: Pass a single patch array with all operations to mutateProgram. Do not split by week or make multiple mutateProgram calls for one logical edit.
- **Zero-based indices**: /0 is the first routine, /0/exercises/1 is the second exercise of the first routine.
- **Path = property name only**: Never put the new value inside the path string. The path must end with the property name (e.g. `/0/exercises/0/sets/0/rpe`), and the new value goes in the `value` field. Paths like `/0/exercises/0/sets/0/rpe:7` are **invalid** and will fail.

## Operations

- **op must be exactly one of**: `add`, `remove`, `replace`, `move`, `copy`, `test`. Do not use variants like `replace_seconds` — use `replace` for any value update (e.g. rest_seconds, reps, rpe).

### Critical: `op` and `path` are separate fields

Each patch operation uses **three separate top-level keys** for a value update: `op`, `path`, and `value` (plus `from` for move/copy).

- **`op`** is **only** the short verb (`replace`, `add`, …). It must **not** contain `/`, routine indices, or property names.
- **`path`** is **always** its own string: a JSON Pointer starting with `/` (e.g. `/24/exercises/1/sets/0/rep_range`). If your pointer contains `/`, it belongs in **`path`**, not glued onto **`op`**.

**Wrong** (path merged into `op`; will fail validation):

```json
{ "op": "replaceRegistry/24/exercises/1/sets/0/rep_range", "value": null }
```

**Right:**

```json
{ "op": "replace", "path": "/24/exercises/1/sets/0/rep_range", "value": null }
```

- **replace**: Update an existing value. `{ "op": "replace", "path": "<path>", "value": <new value> }`. Path must already exist.
- **add**: Insert a value. `{ "op": "add", "path": "<path>", "value": <value> }`. Use `/-` to append to an array (e.g. /0/exercises/-).
- **remove**: Delete a value. `{ "op": "remove", "path": "<path>" }`. No `value` needed.
- **move**: Relocate a value. `{ "op": "move", "from": "<source path>", "path": "<target path>" }`. Use to reorder exercises or routines.
- **copy**: Duplicate a value. `{ "op": "copy", "from": "<source path>", "path": "<target path>" }`. Use to duplicate an exercise to another routine.

## Rep ranges

`rep_range` is a first-class field on every set (`{start, end}`). **`rep_range` supersedes `reps` in the UI** — when `rep_range` is non-null the UI displays the range and ignores `reps`.

- When the program uses rep ranges, **patch `rep_range`** (the full object) rather than only patching `reps`. Example: to change a set from 8-12 to 10-15, use `{ "op": "replace", "path": "/0/exercises/0/sets/0/rep_range", "value": { "start": 10, "end": 15 } }`.
- **Fixed-rep rule:** When changing to a fixed rep count (e.g. 5x5, singles, doubles, triples), patch `rep_range` to **null** and patch `reps` to the fixed value. **NEVER** emit a degenerate `rep_range` where `start === end` (e.g. `{start: 5, end: 5}`). That will display as "5-5" in the UI which is incorrect.

## Path examples

- /0 = first routine, /1 = second routine, /47 = 48th routine
- /0/title = first routine's title
- /0/exercises/0/title = first exercise's title
- /0/exercises/0/sets/0/reps = reps of first set of first exercise
- /0/exercises/0/sets/0/rep_range = rep range of first set (object: {start, end})
- /0/exercises/- = append position (for "add")

## Patch template

The following is **only** the payload shape for the **`mutateProgram` tool**—do **not** copy this block into user-visible assistant messages. The tool expects an object with a **`patch`** array (not a bare array at the top level).

```json
{
  "patch": [
    { "op": "replace", "path": "/0/title", "value": "Push Day" },
    { "op": "replace", "path": "/0/exercises/0/sets/0/rep_range", "value": { "start": 8, "end": 12 } },
    { "op": "replace", "path": "/0/exercises/0/sets/0/reps", "value": 12 }
  ]
}
```