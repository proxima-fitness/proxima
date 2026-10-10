---
name: athlete-context
description: >-
  Which Proxima MCP athlete surface to open. Load when the user asks about
  workout history, volume or streaks, training calendar, body-measurement
  trends, stalling lifts or blind spots, or program overview versus the week
  builder. Do not use for creating or editing a program — use build-program
  or mutate-program.
allowedTools:
  - list_programs
  - read_program
  - show_program_week
  - list_workouts
  - get_profile_statistics
  - get_profile_calendar
  - list_body_measurements
  - get_blind_spot_analysis
  - get_latest_body_measurement
---

# Athlete Context

Host-agent: Claude + **Proxima MCP** only. Each athlete read opens **one** composable **MCP App** (`ui://`). Non-Apps hosts still get text / `structuredContent`.

Week Export, Sync, and Connect Hevy are Proxima web only (ADR 0036).

## Surface map

| Ask | Tool | MCP App |
| --- | ---- | ------- |
| Past sessions / logged workouts | `list_workouts` | **Workout history browse** |
| Weekly volume, duration, streak | `get_profile_statistics` | **Profile statistics** |
| Which days trained this month | `get_profile_calendar` | **Profile calendar** |
| Body-comp / weight history | `list_body_measurements` | **Body measurements** |
| Latest weight only (cheap) | `get_latest_body_measurement` | text only (no App) |
| Stalling lifts / weak points | `get_blind_spot_analysis` | **Blind spot analysis** |
| Program at a glance (weeks/days) | `read_program` | **Program overview** |
| Edit week / Accept / Save | **mutate-program** (or **build-program** for new) | program-week **builder** |

`list_programs` is discovery only (text). Pick `program_id`, then `read_program` or mutate.

## Rules

1. **One surface per ask.** Calendar alone → only `get_profile_calendar`. Blind spot alone → only `get_blind_spot_analysis`. Do not fan out to statistics, browse, and overview unless the user asked for those.
2. **Overview ≠ builder.** Glance / progress → `read_program`. Change sets or exercises → **mutate-program**. New program → **build-program**. To open the builder without mutating, `show_program_week` with `program_id`.
3. **Look-first.** Summarize in chat; let the App show the chrome. Do not paste the full structured payload.
4. **No Hevy week-loop claims** in Claude (Export / Sync / Connect).
