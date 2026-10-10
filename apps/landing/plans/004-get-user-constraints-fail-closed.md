# Plan 004: Fail closed when getUserConstraints DB read errors

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` - unless a reviewer dispatched you and told they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e07cdf..HEAD -- src/api/user-constraints.ts src/app/api/chat/route.ts src/app/api/chat/summarize-episode/route.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7e07cdf`, 2026-07-17

## Why this matters

`getUserConstraints` treats any Supabase error the same as “no row”: `if (error || !data) return null`. A transient DB/RLS failure then looks like a first-time user - chat merges an empty persisted profile and the coach runs **without** known injuries/equipment exclusions. Fail closed: real errors must abort the request; only `maybeSingle()` with no row returns `null`.

## Current state

`src/api/user-constraints.ts` (~11-21):

```ts
export async function getUserConstraints(
    supabase: TSupabase,
    userId: string,
): Promise<TConstraintProfile | null> {
    const { data, error } = await supabase
        .from("user_constraints")
        .select("injuries, excluded_equipment, excluded_areas, preferences, chat_refinements")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) return null;
    // map data → TConstraintProfile ...
}
```

Callers:

- `src/app/api/chat/route.ts` (~111-113): `const persistedConstraints = user ? await getUserConstraints(supabase, user.id) : null;` - outer `handleChatPost` catch (~231-239) already returns HTTP 500 JSON `{ error: 'Failed to process chat request' }` on throw.
- `src/app/api/chat/summarize-episode/route.ts` (~42-43): `const persistedConstraints = await getUserConstraints(...);` - outer try/catch (~69-71 area) returns 500 on throw.

No existing unit test file for `user-constraints.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 7e07cdf..HEAD -- src/api/user-constraints.ts` | empty or WIP |
| New/targeted tests | `npx vitest run src/api/__tests__/user-constraints.test.ts` (or path you create) | all pass |
| Lint | `npx eslint src/api/user-constraints.ts` + the new test file | exit 0 |

## Scope

**In scope**:

- `src/api/user-constraints.ts` - `getUserConstraints` error handling only
- New test file e.g. `src/api/__tests__/user-constraints.test.ts` (create)

**Out of scope**:

- Changing `upsertUserConstraints` swallow-on-error behavior (separate concern)
- Editing `route.ts` / `summarize-episode/route.ts` unless a type/compile issue forces a tiny catch tweak - prefer throw + existing catch
- Merge / tools / sandbox plans

## Git workflow

- Commit style: `fix(constraints): fail closed when user_constraints read errors`
- Do NOT push unless instructed

## Steps

### Step 1: Drift check

Confirm `if (error || !data) return null` still present.

**Verify**: excerpt matches.

### Step 2: Fail closed

Change `getUserConstraints`:

```ts
if (error) {
    console.error("[user-constraints] load failed:", error);
    throw new Error("Failed to load user constraints");
}
if (!data) return null;
```

Do not include raw DB error strings in the thrown message if they might leak internals to clients (route already returns a generic 500 body). Logging the error object server-side is fine.

Keep mapping logic for successful `data` unchanged.

**Verify**: read function; error throws; missing row returns null.

### Step 3: Unit tests

Create `src/api/__tests__/user-constraints.test.ts` (use `@vitest-environment node` if other api tests do):

Mock a minimal supabase client:

```ts
{
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }), // or variants
      }),
    }),
  }),
}
```

Cases:

1. `error` set → rejects / throws
2. `data: null, error: null` → resolves `null`
3. valid row → mapped `TConstraintProfile` (spot-check one field, e.g. `excludedEquipment` from `excluded_equipment`)

Match import style of nearby api tests under `src/api/__tests__/`.

**Verify**: `npx vitest run src/api/__tests__/user-constraints.test.ts` → pass.

### Step 4: Lint + index

**Verify**: eslint exit 0; README 004 = DONE.

## Test plan

- Throw on error; null on no row; map on success (above).
- No need for full route integration test if unit tests cover the contract.

## Done criteria

- [ ] DB `error` → throw (not null)
- [ ] No row → null
- [ ] Unit tests cover all three outcomes
- [ ] Callers unchanged and still return 500 via existing catch when throw propagates
- [ ] eslint clean; README 004 = DONE
- [ ] No out-of-scope production edits

## STOP conditions

- Callers catch and swallow the new throw (search for getUserConstraints) - if a caller converts throw back to null, STOP and report
- Upsert changes seem required - out of scope; do not expand
- Drift shows fail-closed already implemented

## Maintenance notes

- Reviewer: confirm chat route and summarize-episode still have top-level try/catch returning 500.
- Follow-up (not this plan): `upsertUserConstraints` also swallows errors - agent may think persist succeeded.
