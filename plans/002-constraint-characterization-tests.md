# Plan 002: Add characterization tests for constraint tool + merge paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` - unless a reviewer dispatched you and told they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/constraints/__tests__/merge.test.ts src/app/api/chat/__tests__/tools.test.ts src/app/api/chat/tools/tools.ts src/app/api/chat/constraints/merge.ts src/api/user-constraints.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S-M
- **Risk**: LOW
- **Depends on**: none (but must land before `plans/003-merge-persisted-arrays-authoritative.md`)
- **Category**: tests
- **Planned at**: commit `7e07cdf`, 2026-07-17

## Why this matters

Constraint persistence and merge are high-churn, product-critical paths with thin coverage: merge/validate have unit tests, but `updateConstraintProfile` and the “removed constraint comes back on next merge” behavior are untested. Plan 003 will change merge semantics - without characterization tests first, the executor (and reviewers) cannot tell intentional behavior change from accidental breakage. This plan **only adds tests**; it does not fix production bugs (those are 001/003/004).

## Current state

- `src/app/api/chat/constraints/__tests__/merge.test.ts` - union + preference merge; **does not** assert that a session still listing a removed injury re-adds it after union with emptied persisted.
- `src/app/api/chat/__tests__/tools.test.ts` - buildWeek/mutateProgram/readProgram coverage; **no** `updateConstraintProfile` tests; may or may not yet have constraint_violation mutate coverage (plan 001).
- `src/app/api/chat/tools/tools.ts` - `updateConstraintProfileTool` mutates closed-over `constraintProfile` via `patchStringArray`, then `upsertUserConstraints(...).catch(...)` (~974-1025).
- `src/app/api/chat/constraints/merge.ts` - arrays always `unionStringArrays(persisted, session)` (~14-25).
- `src/api/user-constraints.ts` - `upsertUserConstraints` used by the tool; mock in tests.

`patchStringArray` (~127-134 in `tools.ts`):

```ts
function patchStringArray(arr: string[], add?: string[], remove?: string[]): string[] {
    const removeSet = new Set((remove ?? []).map(s => s.toLowerCase()));
    const existing = new Set(arr.map(s => s.toLowerCase()));
    return [
        ...arr.filter(s => !removeSet.has(s.toLowerCase())),
        ...(add ?? []).filter(s => !existing.has(s.toLowerCase()) && !removeSet.has(s.toLowerCase())),
    ];
}
```

Mock pattern in `tools.test.ts`: `vi.mock` for hevy + workout-history; `getTools({ ... })`; `asTestTool` harness.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/constraints/__tests__/merge.test.ts src/app/api/chat/__tests__/tools.test.ts` | empty or WIP |
| Merge tests | `npx vitest run src/app/api/chat/constraints/__tests__/merge.test.ts` | all pass |
| Tools tests | `npx vitest run src/app/api/chat/__tests__/tools.test.ts` | all pass |
| Lint | `npx eslint src/app/api/chat/constraints/__tests__/merge.test.ts src/app/api/chat/__tests__/tools.test.ts` | exit 0 |

## Scope

**In scope**:

- `src/app/api/chat/constraints/__tests__/merge.test.ts` - add characterization case(s)
- `src/app/api/chat/__tests__/tools.test.ts` - add `updateConstraintProfile` (+ optional constraint_violation if 001 not done yet)

**Out of scope**:

- Changing `merge.ts`, `tools.ts`, `user-constraints.ts` production logic
- Plan 001 fix (if absent, you may add the constraint_violation **test expectation documenting current broken toModelOutput** OR skip that case and leave it to 001 - prefer skip duplicate of 001’s regression test; only add execute-level `error === 'constraint_violation'` if useful)
- DB / migrations / UI

## Git workflow

- Commit style: `test(chat): characterize constraint merge and updateConstraintProfile`
- Do NOT push unless instructed

## Steps

### Step 1: Drift check

Confirm merge still unions arrays; `updateConstraintProfile` still present on `getTools` return.

**Verify**: excerpts match live code.

### Step 2: Merge characterization - re-add after remove

In `merge.test.ts`, add a test that documents **today’s** (pre-003) behavior:

- `persisted = profile({ injuries: [] })` (user/agent removed shoulder from DB)
- `session = profile({ injuries: ['shoulder'] })` (stale questionnaire still sending it)
- `expect(mergeConstraintProfiles(persisted, session).injuries)`.toEqual(['shoulder'])` (or contain shoulder)

Name it clearly, e.g. `currently re-adds session injuries missing from persisted (characterization - plan 003 will change)`.

**Verify**: `npx vitest run src/app/api/chat/constraints/__tests__/merge.test.ts` → pass.

### Step 3: `updateConstraintProfile` tool tests

In `tools.test.ts`:

1. Mock `@/api/user-constraints` `upsertUserConstraints` as `vi.fn(async () => {})` (add `vi.mock` at top with other mocks, or spy - match file style).
2. Build a mutable profile object; pass to `getTools({ constraintProfile, userId: 'user-1', workoutHistoryDb: {} as any })` - use a minimal mock object if types require; look at how Pro workout history tests mock db.
3. Cases:
   - **add**: `execute({ addInjuries: ['knee'] })` → `updatedProfile.injuries` includes `knee`; upsert called with that profile when `userId` + db present.
   - **remove**: start with `injuries: ['Shoulder']`, `execute({ removeInjuries: ['shoulder'] })` → injuries empty (case-insensitive); upsert called.
   - **no profile**: `getTools({})` without `constraintProfile` → execute returns `{ error: 'No active constraint profile in this session.' }`.
4. Do **not** assert upsert error handling beyond “called” / “not called for anon” (`userId`/`workoutHistoryDb` omitted → upsert not called).

**Verify**: `npx vitest run src/app/api/chat/__tests__/tools.test.ts` → all pass.

### Step 4: Lint + index

**Verify**: eslint exit 0; README row 002 = DONE.

## Test plan

| Case | File | Asserts |
|------|------|---------|
| Session re-adds emptied persisted injury | `merge.test.ts` | today’s union behavior |
| addInjuries + upsert | `tools.test.ts` | profile + upsert args |
| removeInjuries case-insensitive | `tools.test.ts` | empty injuries |
| missing constraintProfile | `tools.test.ts` | error string |

## Done criteria

- [ ] Characterization merge test exists and passes (documents re-add)
- [ ] `updateConstraintProfile` add/remove/missing-profile tests exist and pass
- [ ] No production logic changes
- [ ] eslint clean on touched test files
- [ ] README 002 = DONE

## STOP conditions

- Production code must change for tests to compile - report; do not “fix” merge/tools here
- Cannot mock `upsertUserConstraints` cleanly after two attempts - report import graph issue
- Plan 003 already merged and changed union semantics - update characterization expectations to match new intended behavior and note in README, or STOP for advisor

## Maintenance notes

- Plan 003 will **invert** the re-add characterization test into “does not re-add”; executor of 003 must rewrite that test, not delete coverage.
- Reviewer: ensure tests describe current behavior, not aspirational product copy.
