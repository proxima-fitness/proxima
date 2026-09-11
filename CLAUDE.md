# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                 # Next.js dev server
npm run build               # production build (also runs in pre-commit)
npm run lint                # eslint
npm run test                # vitest watch
npm run test:ci             # vitest run (pre-commit gate)
npm run test:coverage
npm run test:db-smoke       # supabase/snippets/verify_*.sql against local Postgres

npx vitest run src/api/__tests__/program-prescription.test.ts     # one file
npx vitest run src/api -t "returns title and program length"      # one test by name
```

Pre-commit (husky) runs `lint-staged` → `npm run test:ci` → `npm run build`. Assume any of those failing blocks a commit.

### Local Supabase

`./start-local-supabase.sh` starts Docker Supabase, applies migrations, seeds Hevy exercises/warmups, creates the test user (`test@localhost.dev` / `Password123!`), points `.env.local` at `http://127.0.0.1:54321`, and regenerates `src/hooks/supabase.ts`. Stop with `npx supabase stop`. See README for reverting `.env.local` to prod.

`src/hooks/supabase.ts` is **generated** (`npx supabase gen types --lang=typescript --local`) — edit migrations, not that file.

## Domain docs and process

- **`CONTEXT.md`** is the domain glossary and the naming authority. Terms like **Proxima program**, **Program prescription**, **New path** / **Edit path**, **Week Export**, **Week complete**, **Current week**, **Agentic memory** have precise definitions plus an `_Avoid_` list of rejected synonyms. Use the glossary's vocabulary in code, tests, comments, and PR text.
- **`docs/adr/`** holds in-flight ADRs, `docs/adr/complete/` shipped ones. Each ADR is `index.md` (decision) + `plan.md` (ship order) + numbered sub-plan slices that name what they own. Work is usually "implement sub-plan NN of ADR MMMM". Sub-plans cap at **~10 files including tests** — split rather than exceed (`docs/adr/new-path-week-loop/index.md`).
- `AGENTS.md` and `docs/agents/` cover issue tracking (Linear, team Proxima Fitness, project Proxima Landing Page) and how to consume the domain docs.
- If a change contradicts a shipped ADR, say so explicitly rather than silently overriding it.

## Architecture

Next.js App Router. `src/app/(app)` is the marketing site + logged-in app, `src/app/(payload)` is the Payload CMS admin/API (blog content, Postgres via `@payloadcms/db-postgres`), `src/app/api/*` are route handlers.

### Data layer

Three Supabase clients, and the distinction matters:

- `@/api/index` — **browser** client (anon key, throws at import if env vars are missing). Client components and `src/api/*` defaults.
- `@/utils/supabase/server` `createClient()` — request-scoped, cookie-bound, RLS as the signed-in user. Route handlers and server components.
- `@/api/supabase-admin` `getServiceRoleClient()` — bypasses RLS, server-only, returns `null` in client bundles. Only for shared non-user-owned writes.

Modules under `src/api/` are plain async functions that **take the client as a parameter** (see `program-hevy-links.ts`, `workout-history-read.ts`, `program-prescription.ts`). Server-safe ones take it as a required first/last arg and do not import `@/api/index` at all — importing the browser client (or a client component module like `program-builder/utils/helpers.ts`, which pulls in `sonner`) into a route handler is the mistake to avoid.

`src/api/hooks.ts` is the React Query layer: one hook per read, stable exported query keys (e.g. `PROGRAM_HEVY_LINKS_QUERY_KEY`) that mutations invalidate. React Query is client-only; `use*SSR` functions at the bottom of that file are the server-side path.

### Program data shapes

`THevyRoutine[]` is the universal in-app program shape (ambient global, see below): `folder_id` = 0-based week index, `order` = 1-based day within the week, `exercises[]` and `sets[]` indexed 0-based by array position. The Supabase **Program prescription** lives in `programs → schedule_workouts → program_workout_exercises` with per-set arrays (`reps[]`, `weights[]`, `rpe[]`, `reps_range[][]`) and is converted to that grid shape (`convertToHevyRoutine` for the client, `program-prescription.ts` for server routes). Logged workouts (`workouts → workout_exercises → workout_sets`) map into the same shape via `mapBackedUpWorkoutToHevyRoutine`, so one card component renders prescriptions and history alike.

### Program mutation registry

`src/components/program-builder/mutations/` is the single definition of every program edit (`update_set`, `insert_exercise`, `swap_exercise_template`, …): zod schema + handler per op, a catalog, and `applyOperations` for batches (fail-all). It is consumed by the UI (`ProgramMutationContext.runMutation`, undo-aware), by the agent's `mutateProgram` tool, and by AI week suggest. `schemas.ts` depends only on zod, so server code can import op schemas without dragging in client deps. Add an op here rather than mutating grids ad hoc.

### AI agent

`POST /api/chat` runs a Vercel AI SDK `ToolLoopAgent` ("Andy"): system prompt from `instructions/instructions.ts`, tools from `tools/tools.ts`, streaming UI response, Langfuse tracing. Filesystem skills live in `.agents/skills/*/SKILL.md` (frontmatter `name`/`description`/`allowedTools`), are discovered through a sandbox at request time, and `loadSkill` narrows the active tool set. **Agentic memory** — constraint profile, training profile, latest body measurement, recent session episodes — is read per request and injected into the prompt; the agent updates it through dedicated tools. One-shot model calls (episode summary, week suggest) use `generateText` + a zod-validated JSON contract rather than the agent loop.

### Feature limits and usage

Anonymous users are metered in localStorage; authenticated LLM/export usage is enforced **server-side** via the `try_consume_feature_usage` RPC (`@/lib/server-feature-limits`, ADR 0019), which returns HTTP 402 `{ error: "usage_cap", feature, resets_on }`. Allowlisted test users can override tier through a localStorage value mirrored to a cookie, which the server reads but which can never raise a real Free ceiling. Not every LLM path is metered — AI week suggest is deliberately company-borne and cached instead.

### Hevy integration

Hevy is the athlete-facing execution surface. Programs are pushed a week at a time (**Week Export**), which writes a `program_hevy_week_links` row (program + week ↔ Hevy folder/routine ids); that link is the **only** match key for day-completion, never folder-title parsing. The `hevy-program-sync` edge function's source of truth is the sibling `edge-functions` repo — `supabase/functions/` here is a temporary local-serve copy (see its README) that is deleted when the new-path initiative closes. Sync runs on demand when a user opens profile/overview, not on a cron.

## Conventions

- **Ambient globals**: `THevyRoutine`, `THevyExercise`, `THevySets`, `TScheduleWorkouts`, `TBackedUpWorkout`, `TWorkoutHistoryDb`, … are declared in `@types/global.d.ts` (`declare global`, re-exporting row types from `src/types/database`) and used **without imports**. Add shared shapes there rather than re-declaring them per file.
- **eslint enforces** (`eslint.config.mjs`): interfaces `I`-prefixed, type aliases `T`-prefixed, no `any`, no `as unknown as` double assertions, no `@ts-ignore`/`@ts-expect-error`, trailing commas, semicolons, member ordering. 4-space indent (`.editorconfig`).
- **Module docblock**: files open with `/** @module name … Depends on: … Used by: … */` and functions carry JSDoc with `@param`. Match that density; reference the owning ADR in the header when a file implements one.
- **No new `useEffect`** (`.cursor/rules/no-new-useeffect.mdc`): derive during render, handle in the event, or use React Query / router / server components first. If an effect is genuinely required for external sync, justify it in a one-line comment.
- **Migrations**: in the `public` schema, foreign keys to a user reference **`public.users (id)`**, not `auth.users` (see existing FKs in `supabase/migrations/00000000000000_baseline.sql`).
- **Tests**: vitest + jsdom + Testing Library, colocated in `__tests__/`. Pure logic is factored into `*Model.ts` / `input.ts`-style modules and tested directly; Supabase access is tested with hand-rolled chainable mock clients (`asDb(mock)` casts), and route handlers are tested by `vi.mock`-ing their data modules so no model or network is touched.
