# Plan 001: Surface constraint_violation message in mutateProgram toModelOutput

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/tools/tools.ts src/app/api/chat/__tests__/tools.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7e07cdf`, 2026-07-17

## Why this matters

When `mutateProgram` rejects a batch for constraint violations, `execute` returns `{ error: 'constraint_violation', message: '...' }` with exercise titles and reasons. The model never sees that text: `toModelOutput` only formats a `failures` array and falls back to `"Unknown validation error"` when `failures` is absent. The agent cannot fix flagged exercises and retries blind. `buildWeek` already surfaces `output.message` — mutate must match for message-only errors while keeping indexed-failure formatting for apply/preflight failures.

## Current state

- `src/app/api/chat/tools/tools.ts` — `mutateProgramTool` execute + `toModelOutput`
- `src/app/api/chat/__tests__/tools.test.ts` — vitest; mocks `getHevyExercises` with `ex-1` / Barbell / Chest

Execute returns message-only error (~801–804):

```ts
return {
    error: 'constraint_violation',
    message: `Mutation rejected — constraint violations:\n${lines}`,
};
```

`toModelOutput` ignores `message` (~830–842):

```ts
toModelOutput: async ({ output }) => {
    if (output && typeof output === 'object' && 'error' in output && output.error) {
        const o = output as {
            error: string;
            failures?: Array<{ index: number; op: string; reason: string }>;
        };
        const failureLines =
            o.failures?.map((f) => `[${f.index}] ${f.op}: ${f.reason}`).join('; ') ??
            'Unknown validation error';
        return {
            type: 'text' as const,
            value: `Mutation batch rejected: ${failureLines}`,
        };
    }
    // ...
},
```

Exemplar — `buildWeek` `toModelOutput` (~707–712) uses `output.message`.

CONTEXT: **Constraint profile** is authoritative; `mutateProgram` must reject violations so the agent can fix and retry.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/tools/tools.ts src/app/api/chat/__tests__/tools.test.ts` | empty or only expected WIP |
| Targeted tests | `npx vitest run src/app/api/chat/__tests__/tools.test.ts` | all pass |
| Lint | `npx eslint src/app/api/chat/tools/tools.ts src/app/api/chat/__tests__/tools.test.ts` | exit 0 |

No `typecheck` script in this repo. Do not invent one.

## Scope

**In scope**:

- `src/app/api/chat/tools/tools.ts` — `mutateProgramTool.toModelOutput` only
- `src/app/api/chat/__tests__/tools.test.ts` — add test(s) under `describe("mutateProgram tool execute")`

**Out of scope**:

- `buildWeek`, `validateAgainstConstraints`, merge, `updateConstraintProfile`
- Changing `execute` return field names
- Other audit plans

## Git workflow

- Stay on current branch unless operator says otherwise
- Commit style: `fix(chat): surface constraint_violation message in mutateProgram toModelOutput`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Drift check

Confirm `toModelOutput` still ignores `message`. If it already prefers `message`, STOP and report.

**Verify**: drift empty or WIP only; excerpt still accurate.

### Step 2: Fix `toModelOutput`

When `output.error` is set:

1. Widen local type with optional `message?: string`.
2. If `typeof o.message === 'string' && o.message.length > 0`, return `{ type: 'text', value: o.message }` (as-is; do not wrap again).
3. Else keep today’s `failures` formatting with `Mutation batch rejected:` prefix and `'Unknown validation error'` fallback.

**Verify**: both branches exist in source.

### Step 3: Regression test

Inside `describe("mutateProgram tool execute")`:

1. `getTools({ hevyProgram: minimalHevyProgram, constraintProfile })` with `excludedEquipment: ['Barbell']` (full profile shape with empty arrays/prefs).
2. `execute` `insert_exercise` with `exercise_template_id: 'ex-1'`.
3. Assert `error === 'constraint_violation'` and `message` mentions excluded equipment / Barbell.
4. `toModelOutput` value contains violation text; must not be only `Unknown validation error`.

Keep existing preflight-failure toModelOutput test passing.

**Verify**: `npx vitest run src/app/api/chat/__tests__/tools.test.ts` → all pass.

### Step 4: Lint + index

**Verify**: eslint exit 0; set plan 001 to DONE in `plans/README.md`.

## Test plan

- New constraint_violation → toModelOutput case (above).
- Keep indexed failures case (`"[0] add_day:"`).
- Pattern: `asTestTool` + `getTools` as existing mutate tests.

## Done criteria

- [ ] `toModelOutput` prefers non-empty `message`
- [ ] Failures formatting unchanged when `message` absent
- [ ] New + existing tests pass
- [ ] eslint clean on in-scope files
- [ ] No files outside scope (+ README status)
- [ ] README row 001 = DONE

## STOP conditions

- Drift shows message already preferred
- Insert fails before constraint validation after two payload fixes
- Fix requires editing `validate.ts` or UI
- Vitest fails twice after reasonable fix

## Maintenance notes

- Prefer `{ error, message }` for agent-actionable rejects; `{ error, failures }` for indexed batch failures.
- Reviewer: success-path toModelOutput unchanged.
