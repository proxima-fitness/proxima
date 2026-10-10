# Proxima Training Coach (Claude plugin — internal)

Consumer-facing plugin name: **Proxima Training Coach**. Skills + remote **Proxima MCP** connector. Closed source. Does not change Andy (`/api/chat`).

Internal ADR term for this path remains **Host-agent coaching**.

## Contents

- `.claude-plugin/plugin.json` — plugin identity (`proxima-training-coach`)
- `.mcp.json` — remote MCP URL (edit if your deploy differs)
- `skills/{build-program,mutate-program,training-principles,athlete-context}/` — skill copies mapped to MCP tools

## Prerequisites

1. Deployed **Proxima MCP** Edge Function with OAuth.
2. Public Streamable HTTP URL (same as `NEXT_PUBLIC_PROXIMA_MCP_URL`). Default in `.mcp.json`: `https://mcp.proximafitness.com/functions/v1/mcp`.

## Install

### Claude Code

From a parent of this folder:

```bash
claude --plugin-dir ./proxima-training-coach
```

Or add the marketplace/path your team uses for private plugins. Confirm `/mcp` shows **Proxima** connected after OAuth.

### claude.ai / Cowork

1. Zip this folder (manifest at `.claude-plugin/plugin.json`).
2. Customize → Plugins → Upload plugin.
3. Open the plugin’s Connectors tab → connect **Proxima** → complete OAuth.

MCP-only (no skills): Claude Code `claude mcp add Proxima <url>` or claude.ai custom connector — skills will not load.

## Verify

1. Ask which Proxima skills are available → expect build-program / mutate-program / training-principles / athlete-context.
2. Call `list_programs` (or ask Claude to list programs).
3. Athlete asks: calendar-only → `get_profile_calendar` App; blind-spot-only → `get_blind_spot_analysis` App; program glance → `read_program` overview (not builder).
4. Skills must never instruct calling Vercel AI Gateway or Week Export / Sync / Connect Hevy in Claude (those are Proxima web / ADR 0036).

## Tool map (Andy → MCP)

| Andy / Gateway | Proxima MCP |
|----------------|-------------|
| getExerciseList | list_exercises |
| buildProgram | build_program |
| mutateProgram | mutate_program |
| readProgram | read_program |
| updateConstraintProfile | update_constraint_profile |
| updateTrainingProfile | update_training_profile |
| (n/a) | list_programs, accept_program_mutation, reject_program_mutation, save_program, show_program_week, get_*_profile, get_latest_body_measurement |
| (n/a — athlete reads) | list_workouts, get_profile_statistics, get_profile_calendar, list_body_measurements, get_blind_spot_analysis |

Athlete read → App map and overview-vs-builder routing: **athlete-context** skill (ADR 0034 / 09).

No MCP equivalents yet: questionnaire UI (`getMoreInfoQuestions`), Hevy share import/export, Week Export / Sync / Connect Hevy.
