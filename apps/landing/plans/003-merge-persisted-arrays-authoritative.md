# Plan 003: Stop merge from re-adding removed constraints

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` - unless a reviewer dispatched you and told they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/constraints/merge.ts src/app/api/chat/constraints/__tests__/merge.test.ts src/app/api/chat/route.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED - changes how questionnaire fields combine with DB for logged-in users
- **Depends on**: `plans/002-constraint-characterization-tests.md` (DONE)
- **Category**: bug
- **Planned at**: commit `7e07cdf`, 2026-07-17

## Why this matters

`mergeConstraintProfiles` always unions array fields. After the agent (or a future Edit-profile UI) removes an injury from the persisted row, the next chat request still sends stale questionnaire strings (`healthIssues`, etc.). Union puts the removed item back - cross-session memory lies. CONTEXT requires: when the user removes a constraint, those edits **supersede** questionnaire / session inputs that would put it back.

## Current state

`src/app/api/chat/constraints/merge.ts` (~8-27):

```ts
export function mergeConstraintProfiles(
    persisted: TConstraintProfile | null,
    session: TConstraintProfile,
): TConstraintProfile {
    if (!persisted) return session;

    return {
        injuries: unionStringArrays(persisted.injuries, session.injuries),
        excludedEquipment: unionStringArrays(persisted.excludedEquipment, session.excludedEquipment),
        excludedAreas: unionStringArrays(persisted.excludedAreas, session.excludedAreas),
        preferences: {
            splitType: session.preferences.splitType || persisted.preferences.splitType,
            // ... same for other preference keys
        },
        chatRefinements: unionStringArrays(persisted.chatRefinements, session.chatRefinements),
    };
}
```

Caller - `src/app/api/chat/route.ts` (~111-127): loads persisted via `getUserConstraints`, builds session via `initializeConstraintProfile({ healthIssues, excludeEquipment, ... })`, then merges.

CONTEXT.md (**Constraint profile**):

> When the user manually edits the profile (add, change, or remove), those edits supersede questionnaire answers and chat session inputs that would put a removed constraint back.

Plan 002 adds a characterization test that today’s merge **re-adds** session injuries missing from persisted - that test must be **rewritten** here to assert the opposite.

## Chosen semantics (do not invent alternatives)

When `persisted` is non-null:

| Field group | Behavior |
|-------------|----------|
| `injuries`, `excludedEquipment`, `excludedAreas`, `chatRefinements` | **Persisted arrays only** - do not union with session |
| `preferences` | Keep current: session value wins when non-empty string, else persisted |

When `persisted` is null: return `session` unchanged (questionnaire / home-prompt seeds first-time users).

**Product tradeoff (document in merge.ts JSDoc)**: logged-in users with an existing `user_constraints` row no longer pick up *new* questionnaire array values through merge alone - those must land via `updateConstraintProfile` (or future Edit profile). That matches CONTEXT supersede rules and avoids stale re-adds. Do **not** add tombstone columns or migrations in this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/constraints/merge.ts src/app/api/chat/constraints/__tests__/merge.test.ts` | empty or WIP |
| Merge tests | `npx vitest run src/app/api/chat/constraints/__tests__/merge.test.ts` | all pass |
| Lint | `npx eslint src/app/api/chat/constraints/merge.ts src/app/api/chat/constraints/__tests__/merge.test.ts` | exit 0 |

## Scope

**In scope**:

- `src/app/api/chat/constraints/merge.ts` - array merge semantics + JSDoc
- `src/app/api/chat/constraints/__tests__/merge.test.ts` - update/add tests

**Out of scope**:

- `route.ts` (caller stays the same)
- `updateConstraintProfile` / `user-constraints.ts` / migrations / Edit profile UI
- Preference merge changes
- Tombstone / suppressed-items schema

## Git workflow

- Commit style: `fix(constraints): treat persisted arrays as authoritative in merge`
- Do NOT push unless instructed

## Steps

### Step 1: Preconditions

Confirm plan 002 is DONE (characterization re-add test exists). If 002 not done, STOP and report - do not proceed without that baseline (or add the characterization test yourself first as part of 002, then continue).

**Verify**: merge.test.ts contains a re-add characterization test OR you just added one.

### Step 2: Implement merge change

In `mergeConstraintProfiles`, when `persisted` is non-null:

```ts
return {
    injuries: persisted.injuries,
    excludedEquipment: persisted.excludedEquipment,
    excludedAreas: persisted.excludedAreas,
    preferences: { /* unchanged session-wins-when-non-empty logic */ },
    chatRefinements: persisted.chatRefinements,
};
```

Update file-level / function JSDoc: arrays from persisted win when a row exists; session arrays ignored; preferences still merge as before; null persisted → session.

`unionStringArrays` may become unused - **remove** it if unused, or keep if still used. No dead code.

**Verify**: read merge.ts; no `unionStringArrays(persisted.*, session.*)` for the four array fields.

### Step 3: Update tests

1. Rewrite plan 002’s re-add test: persisted `injuries: []`, session `injuries: ['shoulder']` → result `injuries` is `[]` (not re-added). Rename to drop “characterization - will change” wording.
2. Keep / adjust: null persisted returns session (including session injuries).
3. Keep preference tests unchanged in intent.
4. Update any test that expected union of equipment/areas/refinements when both sides non-empty - when persisted non-null, expect **persisted only** for arrays. Add an explicit test: persisted has `Band`, session has `Cable` → result equipment is `['Band']` only.
5. Case-insensitive dedup tests that assumed union across both sides: rewrite to persisted-only expectations.

**Verify**: `npx vitest run src/app/api/chat/constraints/__tests__/merge.test.ts` → all pass.

### Step 4: Lint + index

**Verify**: eslint exit 0; README 003 = DONE.

## Test plan

| Case | Expected |
|------|----------|
| persisted null | session returned |
| persisted empty injuries, session has shoulder | injuries `[]` |
| persisted has Band, session has Cable | equipment `['Band']` |
| preferences session non-empty | session wins (unchanged) |
| preferences session empty | persisted kept (unchanged) |

## Done criteria

- [ ] Persisted non-null → array fields from persisted only
- [ ] Preferences merge unchanged
- [ ] null persisted → session
- [ ] Tests updated; re-add case asserts no re-add
- [ ] JSDoc documents tradeoff
- [ ] eslint clean; README 003 = DONE
- [ ] No out-of-scope file changes

## STOP conditions

- Product owner / existing tests imply questionnaire must still union-add for users with rows - STOP and report; do not invent tombstones without a new plan
- 002 not done and you cannot add characterization first
- Drift shows merge already changed differently
- Fix seems to require `route.ts` or DB migration

## Maintenance notes

- Future “questionnaire adds for returning users”: either client calls `updateConstraintProfile` after questionnaire submit, or a follow-up plan with tombstones + selective union.
- Reviewer: grep for `unionStringArrays` callers; confirm CONTEXT supersede language still accurate.
- Edit-profile UI (direction) will write persisted rows directly - this merge rule is what makes those deletes stick.
